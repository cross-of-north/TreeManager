import os

from flask import Flask, send_from_directory

app = Flask(__name__)


@app.route('/api')
def api():  # put application's code here
    return 'Hello World!'


@app.route("/")
def return_index_file():
    return send_from_directory(os.path.join(app.root_path, "static"), "index.htm")


if __name__ == '__main__':
    app.run()
