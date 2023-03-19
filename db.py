import os
import mysql.connector
from _mysql_connector import MySQLInterfaceError
from mysql.connector.cursor_cext import CMySQLCursor

db_host = os.environ.get('TREEMANAGER_DB_HOST')
db_port = os.environ.get('TREEMANAGER_DB_PORT')
db_user = os.environ.get('TREEMANAGER_DB_USER')
db_password = os.environ.get('TREEMANAGER_DB_PASSWORD')
db_name = os.environ.get('TREEMANAGER_DB_NAME')

SCHEMA_VERSION = 1


class Database:

    def __init__(self, app, log):
        self.db = None
        self.app = app
        self.log = log

    def query(self, query, params, multi=False) -> CMySQLCursor:
        result = None
        if self.connect():
            try:
                cursor = self.db.cursor()
                db_result = cursor.execute(query, params, multi)
                result = db_result if multi else cursor
            except (mysql.connector.Error, MySQLInterfaceError) as e:
                self.log.error(repr(e))

        return result

    def upgrade_schema_version(self) -> bool:
        result = False

        with open(os.path.join(self.app.root_path, "schema", "000001.sql")) as sql_file:
            cursor = self.query(sql_file.read(), params=None, multi=True)
            try:
                for res in cursor:
                    self.log.info(str(res.rowcount) + " rows affected by query: " + res.statement)
                self.db.commit()
                result = True
            except (mysql.connector.Error, MySQLInterfaceError) as e:
            #except Exception as e:
                self.log.error(repr(e))

        return result

    def get_schema_version(self) -> int:
        result = 0
        cursor = self.query("SELECT VALUE FROM options WHERE NAME=%s LIMIT 1", ("schema_version",))
        if cursor is not None:
            row = cursor.fetchone()
            if row is not None:
                result = int(row[0])

        return result

    def connect(self) -> bool:
        result = True
        if self.db is None:
            result = False
            try:
                self.db = mysql.connector.connect(
                    host=db_host,
                    port=db_port,
                    user=db_user,
                    password=db_password,
                    database=db_name,
                )
                if self.get_schema_version() >= SCHEMA_VERSION:
                    result = True
                else:
                    result = self.upgrade_schema_version()
            except mysql.connector.Error as e:
                self.log.error(repr(e))

        return result

    def get_root(self, scope) -> int:
        node_id = None
        cursor = self.query("SELECT ROOT_ID FROM scopes WHERE ID=%s", (scope,))
        if cursor is not None:
            row = cursor.fetchone()
            if row is not None:
                node_id = row[0]

        return node_id

    def get_scope_nodes(self, scope, root=None) -> list:
        result = None

        if root is None:
            root = self.get_root(scope)
        if root is not None:
            cursor = self.query("SELECT ID, PARENT FROM nodes WHERE ROOT=%s ORDER BY ID ASC", (root,))
            if cursor is not None:
                result = []
                for row in cursor.fetchall():
                    result.append(row)

        return result

    def get_children(self, scope, parent_id, root=None) -> list:
        result = None

        if root is None:
            root = self.get_root(scope)
        if root is not None:
            cursor = self.query("SELECT ID FROM nodes WHERE PARENT=%s AND ROOT=%s", (parent_id, root))
            if cursor is not None:
                result = []
                for row in cursor.fetchall():
                    result.append(row[0])

        return result

    def add_node(self, scope, parent) -> int:
        node_id = None

        root = self.get_root(scope)
        if root is not None:
            query = "INSERT INTO nodes (PARENT, ROOT) VALUES ( %s, %s )"
            cursor = self.query(query, (parent, root))
            if cursor is not None:
                node_id = cursor.lastrowid
                self.db.commit()

        return node_id

    def do_remove_all_nodes(self, root) -> bool:
        self.query("DELETE FROM nodes WHERE ROOT=%s", (root,))
        return True

    def do_remove_node(self, scope, node_id, root) -> bool:
        result = False
        children = self.get_children(scope, node_id, root)
        if children is not None:
            result = True
            for child in children:
                if not self.do_remove_node(scope, child, root):
                    result = False
                    break
            if result:
                result = False
                cursor = self.query('DELETE FROM nodes WHERE ID=%s AND ROOT=%s LIMIT 1', (node_id, root))
                if cursor is not None:
                    result = (cursor.rowcount > 0)

        return result

    def remove_node(self, scope, node_id) -> bool:
        result = False
        if self.connect():
            try:
                root = self.get_root(scope)
                if root is not None:
                    if int(node_id) == 0:
                        result = self.do_remove_all_nodes(root)
                    else:
                        result = self.do_remove_node(scope, node_id, root)
                    if result:
                        self.db.commit()

            except mysql.connector.Error as e:
                self.log.error(repr(e))

        return result
