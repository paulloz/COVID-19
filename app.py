from flask import Flask, jsonify, render_template

from db import Db


app = Flask(__name__)


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


@app.route('/api/reas')
def reas():
    with Db() as db:
        return jsonify(db.get_reas())


@app.route('/api/morts')
def morts():
    with Db() as db:
        return jsonify(db.get_morts())


@app.route('/')
def index():
    return render_template('index.html')
