import os
import mysql.connector

db_host = os.environ.get('TREEMANAGER_DB_HOST')
db_port = os.environ.get('TREEMANAGER_DB_PORT')
db_user = os.environ.get('TREEMANAGER_DB_USER')
db_password = os.environ.get('TREEMANAGER_DB_PASSWORD')
db_name = os.environ.get('TREEMANAGER_DB_NAME')


class Database:

    def __init__(self, log):
        self.db = None
        self.log = log

    def connect(self) -> bool:
        if self.db is None:
            try:
                self.db = mysql.connector.connect(
                    host=db_host,
                    port=db_port,
                    user=db_user,
                    password=db_password,
                    database=db_name,
                )
            except mysql.connector.Error as e:
                self.log.error(repr(e))
                return False
        return True

    def get_root(self, scope) -> int:
        node_id = None
        if self.connect():
            try:
                with self.db.cursor() as cursor:
                    cursor.execute("SELECT ROOT_ID FROM scopes WHERE ID=%s", (scope,))
                    result = cursor.fetchone()
                    if result is not None:
                        node_id = result[0]

            except mysql.connector.Error as e:
                self.log.error(repr(e))

        return node_id

    def get_scope_nodes(self, scope, root=None) -> list:
        result = None
        if self.connect():
            try:
                if root is None:
                    root = self.get_root(scope)
                if root is not None:
                    with self.db.cursor() as cursor:
                        cursor.execute("SELECT ID, PARENT FROM nodes WHERE ROOT=%s ORDER BY ID ASC", (root,))
                        result = []
                        for row in cursor.fetchall():
                            result.append(row)

            except mysql.connector.Error as e:
                self.log.error(repr(e))

        return result

    def get_children(self, scope, parent_id, root=None) -> list:
        result = None
        if self.connect():
            try:
                if root is None:
                    root = self.get_root(scope)
                if root is not None:
                    with self.db.cursor() as cursor:
                        cursor.execute("SELECT ID FROM nodes WHERE PARENT=%s AND ROOT=%s", (parent_id, root))
                        result = []
                        for row in cursor.fetchall():
                            result.append(row[0])

            except mysql.connector.Error as e:
                self.log.error(repr(e))

        return result

    def add_node(self, scope, parent) -> int:
        node_id = None
        if self.connect():
            try:
                root = self.get_root(scope)
                if root is not None:
                    query = "INSERT INTO nodes (PARENT, ROOT) VALUES ( %s, %s )"
                    with self.db.cursor() as cursor:
                        cursor.execute(query, (parent, root))
                        node_id = cursor.lastrowid
                        self.db.commit()

            except mysql.connector.Error as e:
                self.log.error(repr(e))

        return node_id

    def do_remove_all_nodes(self, root) -> bool:
        with self.db.cursor() as cursor:
            cursor.execute("DELETE FROM nodes WHERE ROOT=%s", (root,))
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
                with self.db.cursor() as cursor:
                    cursor.execute('DELETE FROM nodes WHERE ID=%s AND ROOT=%s LIMIT 1', (node_id, root))
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
