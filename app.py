import os

from flask import Flask, send_from_directory, session
from flask_restful import Resource, Api

from db import Database
from log import Log

app = Flask(__name__)


@app.route("/")
def return_index_file():
    return send_from_directory(os.path.join(app.root_path, "static"), "index.htm")


api = Api(app)
log = Log(app)


class Nodes(Resource):

    scope = 1

    def __init__(self):
        self.db = None

    def connect(self):
        if self.db is None:
            self.db = Database(log)
            self.db.connect()

    def get(self, node_id):
        return {"id": node_id}

    def delete(self, node_id):
        self.connect()
        return {}, (200 if self.db.remove_node(self.scope, node_id) else 500)

    def put(self, node_id):
        self.connect()
        db_id = self.db.add_node(self.scope, node_id)
        return ({}, 500) if db_id is None else ({"id": db_id}, 200)


api.add_resource(Nodes, '/api/nodes/<string:node_id>')


if __name__ == '__main__':
    app.run()
