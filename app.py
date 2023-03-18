import os

from flask import Flask, send_from_directory, session
from flask_restful import Resource, Api
from flask_session import Session

app = Flask(__name__)
SESSION_TYPE = 'filesystem'
app.config.from_object(__name__)
Session(app)


@app.route("/")
def return_index_file():
    return send_from_directory(os.path.join(app.root_path, "static"), "index.htm")


api = Api(app)


class Nodes(Resource):

    def get(self, node_id):
        return {"id": node_id}

    def delete(self, node_id):
        return {}

    def put(self, node_id):
        if not "counter" in session:
            session["counter"] = 0
        session["counter"] = session["counter"] + 1
        return {"id": session["counter"]}


api.add_resource(Nodes, '/api/nodes/<string:node_id>')


if __name__ == '__main__':
    app.run()
