"""
Application server main file.
"""

import os
from flask import Flask, send_from_directory, request
from flask_compress import Compress
from flask_restful import Resource, Api

from server.db import Database
from server.log import Log


app = Flask(__name__, static_folder='../static')  # web server initialization

Compress(app)  # to compress data in the development environment


def rewrite(url):
    """
    Urlrewrite helper.
    """
    view_func, view_args = app.create_url_adapter(request).match(url)
    return app.view_functions[view_func](**view_args)


@app.route("/")
def return_index_file():
    """
    SPA root HTML page.
    """
    return send_from_directory(os.path.join(app.root_path, "../static"), "index.htm")


@app.route('/favicon.ico')
def the_rewritten_one():
    """
    Favicon.
    """
    return rewrite('/static/favicon.ico')


api = Api(app)  # REST server instance.
log = Log(app)  # Simple logger sink.


class Nodes(Resource):
    """
    Tree nodes access and manipulation API.
    """
    scope = 1  # Current user scope ID (for possible multi-user usage cases).

    def __init__(self):
        self.db = None

    def connect(self) -> bool:
        """
        Create connection to the database, if it is not yet created.
        """
        result = False if self.db is None else True
        if not result:
            self.db = Database(app, log)
            result = self.db.connect()
        return result

    def get(self, node_id):
        """
        Node getter.
        Current implementation returns only all user's nodes for initial client load (node_id=0).
        JSON result format (defined at the DB connector level) [[node_id,parent_id],[node_id,parent_id],...] .
        """
        if self.connect():
            if int(node_id) == 0:
                nodes = self.db.get_scope_nodes(self.scope)
                return ({}, 500) if nodes is None else nodes
            else:
                return {}, 501  # not implemented
        else:
            return {}, 500

    def delete(self, node_id):
        """
        Deletes the node with ID specified.
        """
        if self.connect():
            return {}, (200 if self.db.remove_node(self.scope, node_id) else 500)
        else:
            return {}, 500

    def put(self, node_id):
        """
        Creates a node with a parent ID specified.
        Returns JSON {"id": <new node ID>} on success.
        """
        if self.connect():
            db_id = self.db.add_node(self.scope, node_id)
            return ({}, 500) if db_id is None else ({"id": db_id}, 200)
        else:
            return {}, 500


api.add_resource(Nodes, '/api/nodes/<string:node_id>')  # REST API handler registration


if __name__ == '__main__':
    app.run()
