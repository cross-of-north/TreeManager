import os

from flask import Flask, send_from_directory, request
from flask_compress import Compress
from flask_restful import Resource, Api

from db import Database
from log import Log

app = Flask(__name__)
Compress(app)


def rewrite(url):
    view_func, view_args = app.create_url_adapter(request).match(url)
    return app.view_functions[view_func](**view_args)


@app.route("/")
def return_index_file():
    return send_from_directory(os.path.join(app.root_path, "static"), "index.htm")


@app.route('/favicon.ico')
def the_rewritten_one():
    return rewrite('/static/favicon.ico')


api = Api(app)
log = Log(app)


class Nodes(Resource):

    scope = 1

    def __init__(self):
        self.db = None

    def connect(self) -> bool:
        result = False if self.db is None else True
        if not result:
            self.db = Database(app, log)
            result = self.db.connect()
        return result

    def get(self, node_id):
        if self.connect():
            if int(node_id) == 0:
                nodes = self.db.get_scope_nodes(self.scope)
                return ({}, 500) if nodes is None else nodes
            else:
                return {}, 501  # not implemented
        else:
            return {}, 500

    def delete(self, node_id):
        if self.connect():
            return {}, (200 if self.db.remove_node(self.scope, node_id) else 500)
        else:
            return {}, 500

    def put(self, node_id):
        if self.connect():
            db_id = self.db.add_node(self.scope, node_id)
            return ({}, 500) if db_id is None else ({"id": db_id}, 200)
        else:
            return {}, 500


api.add_resource(Nodes, '/api/nodes/<string:node_id>')


if __name__ == '__main__':
    app.run()
