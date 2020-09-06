from flask import send_from_directory

from app import app


app.config['SEND_FILE_MAX_AGE_DEFAULT'] = 0


@app.route('/js/<path:path>')
def send_js(path):
    return send_from_directory('js', path)


@app.route('/css/<path:path>')
def send_css(path):
    return send_from_directory('css', path)


if __name__ == '__main__':
    app.run(debug=True)
