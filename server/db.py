"""
Database layer of the application server.
"""

import os
import mysql.connector
from _mysql_connector import MySQLInterfaceError
from mysql.connector.cursor_cext import CMySQLCursor


"""
Environment variables with connection parameters. 
"""

db_host_s = 'TREEMANAGER_DB_HOST'
db_port_s = 'TREEMANAGER_DB_PORT'
db_user_s = 'TREEMANAGER_DB_USER'
db_password_s = 'TREEMANAGER_DB_PASSWORD'
db_name_s = 'TREEMANAGER_DB_NAME'

db_host = os.environ.get(db_host_s)
db_port = os.environ.get(db_port_s)
db_user = os.environ.get(db_user_s)
db_password = os.environ.get(db_password_s)
db_name = os.environ.get(db_name_s)


"""
Current database schema version. 
"""

SCHEMA_VERSION = 1


class Database:
    """
    Database connector.
    """
    def __init__(self, app, log):
        self.db = None
        self.app = app
        self.log = log

    def _query(self, query, params, multi=False) -> CMySQLCursor:
        """
        Run SQL query.
        """
        result = None
        if self.connect():
            try:
                cursor = self.db.cursor()
                db_result = cursor.execute(query, params, multi)
                result = db_result if multi else cursor
            except (mysql.connector.Error, MySQLInterfaceError) as e:
                self.log.error(repr(e))

        return result

    def _upgrade_schema_version(self) -> bool:
        """
        Upgrade DB schema.
        Current version only upgrades empty database to schema version 1.
        Commits changes.
        """
        result = False

        with open(os.path.join(self.app.root_path, "../schema", "000001.sql")) as sql_file:
            cursor = self._query(sql_file.read(), params=None, multi=True)
            try:
                res: CMySQLCursor
                for res in cursor:
                    self.log.info(str(res.rowcount) + " rows affected by query: " + res.statement)
                self.db.commit()
                result = True
            except (mysql.connector.Error, MySQLInterfaceError) as e:
                self.log.error(repr(e))

        return result

    def _get_schema_version(self) -> int:
        """
        Get DB schema version.
        Returns 0 if database is empty.
        """
        result = 0
        cursor = self._query("SELECT VALUE FROM options WHERE NAME=%s LIMIT 1", ("schema_version",))
        if cursor is not None:
            row = cursor.fetchone()
            if row is not None:
                result = int(row[0])

        return result

    def connect(self) -> bool:
        """
        Creates DB connection if it is not yet created.
        Upgrades DB schema if needed.
        """
        result = True
        if self.db is None:
            result = False
            try:
                if db_host is None or len(db_host) == 0:
                    self.log.error("Environment variable " + db_host_s + " must be defined")
                    return False
                if db_user is None or len(db_user) == 0:
                    self.log.error("Environment variable " + db_user_s + " must be defined")
                    return False
                if db_name is None or len(db_name) == 0:
                    self.log.error("Environment variable " + db_name_s + " must be defined")
                    return False
                self.db = mysql.connector.connect(
                    host=db_host,
                    port=db_port,
                    user=db_user,
                    password=db_password,
                    database=db_name,
                )
                if self._get_schema_version() >= SCHEMA_VERSION:
                    result = True
                else:
                    result = self._upgrade_schema_version()
            except mysql.connector.Error as e:
                self.log.error(repr(e))

        return result

    def _get_root(self, scope) -> int:
        """
        Returns ID of the root node in the current user scope.
        """
        node_id = None
        cursor = self._query("SELECT ROOT_ID FROM scopes WHERE ID=%s", (scope,))
        if cursor is not None:
            row = cursor.fetchone()
            if row is not None:
                node_id = row[0]

        return node_id

    def _can_access_node(self, scope, node_id) -> bool:
        """
        Checks if the node ID specified is in the user's scope (can be accessed).
        """
        result = False

        root_id = self._get_root(scope)
        if root_id is not None:
            if int(root_id) == int(node_id):
                result = True
            else:
                # Trying to select this ID as if it is owned by the current scope.
                # If it is really in the current scope then 1 row will be fetched.
                query = "SELECT * FROM nodes WHERE ID=%s AND ROOT=%s"
                cursor = self._query(query, (node_id, root_id))
                result = cursor is not None and cursor.fetchone() is not None

        return result

    def get_scope_nodes(self, scope, root_id=None) -> list:
        """
        Returns a list of all current scope nodes.
        Format is [[node_id,parent_id],[node_id,parent_id],...].
        Nodes are returned in the autoincrement ascending order,
        so the parent always goes before its children (since it was inserted earlier).
        """
        result = None

        if root_id is None:
            root_id = self._get_root(scope)
        if root_id is not None:
            cursor = self._query("SELECT ID, PARENT FROM nodes WHERE ROOT=%s ORDER BY ID ASC", (root_id,))
            if cursor is not None:
                result = []
                for row in cursor.fetchall():
                    result.append(row)

        return result

    def _get_children(self, scope, parent_id, root_id=None) -> list:
        """
        Returns all children IDs of the specified node.
        The root_id parameter is a cached value of the scope root ID to control accessibility of nodes.
        """
        result = None

        if root_id is None:
            root_id = self._get_root(scope)
        if root_id is not None and self._can_access_node(scope, parent_id):
            cursor = self._query("SELECT ID FROM nodes WHERE PARENT=%s AND ROOT=%s", (parent_id, root_id))
            if cursor is not None:
                result = []
                for row in cursor.fetchall():
                    result.append(row[0])

        return result

    def add_node(self, scope, parent_id) -> int:
        """
        Adds a new node with the parent ID specified to the scope specified.
        Commits changes.
        """
        node_id = None

        root_id = self._get_root(scope)
        if root_id is not None and self._can_access_node(scope, parent_id):
            query = "INSERT INTO nodes (PARENT, ROOT) VALUES ( %s, %s )"
            cursor = self._query(query, (parent_id, root_id))
            if cursor is not None:
                node_id = cursor.lastrowid
                self.db.commit()

        return node_id

    def _do_remove_all_nodes(self, root_id) -> bool:
        """
        Clears the scope with a root ID specified.
        Doesn't commit changes.
        """
        self._query("DELETE FROM nodes WHERE ROOT=%s", (root_id,))
        return True

    def _do_remove_node(self, scope, node_id, root_id) -> bool:
        """
        Deletes the node specified and its subtree.
        The root_id parameter is a cached value of the scope root ID to control accessibility of nodes.
        Doesn't commit changes.
        """
        result = False
        children = self._get_children(scope, node_id, root_id)
        if children is not None:
            # delete all children recursively
            result = True
            for child in children:
                if not self._do_remove_node(scope, child, root_id):
                    result = False
                    break
            # delete this node
            if result:
                result = False
                if self._can_access_node(scope, node_id):
                    cursor = self._query('DELETE FROM nodes WHERE ID=%s AND ROOT=%s LIMIT 1', (node_id, root_id))
                    if cursor is not None:
                        result = (cursor.rowcount > 0)

        return result

    def remove_node(self, scope, node_id) -> bool:
        """
        Recursively deletes the node specified and its subtree.
        If node_id=0 then the scope is fully cleared without recursive calls.
        Commits changes.
        """
        result = False
        if self.connect():
            try:
                root_id = self._get_root(scope)
                if root_id is not None:
                    if int(node_id) == 0:
                        # clear scope
                        result = self._do_remove_all_nodes(root_id)
                    else:
                        # selectively delete a subtree
                        result = self._do_remove_node(scope, node_id, root_id)
                    if result:
                        self.db.commit()

            except mysql.connector.Error as e:
                self.log.error(repr(e))

        return result
