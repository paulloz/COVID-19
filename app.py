from flask import Flask, jsonify, render_template, send_from_directory

from db import Db


app = Flask(__name__, static_url_path='')


@app.route('/api/hosp_by_age')
def by_age():
    with Db() as db:
        return jsonify(db.get_by_age_group())


@app.route('/api/posit')
def posit():
    with Db() as db:
        return jsonify(db.get_posit())


@app.route('/api/test')
def test():
    with Db() as db:
        return jsonify(db.get_test())


@app.route('/js/<path:path>')
def send_js(path):
    return send_from_directory('js', path)


@app.route('/css/<path:path>')
def send_css(path):
    return send_from_directory('css', path)


@app.route('/')
def index():
    return render_template('index.html')


if __name__ == '__main__':
    app.run()
