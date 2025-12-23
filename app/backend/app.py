from flask import Flask, request, jsonify
from flask_cors import CORS

app = Flask(__name__)

cors = CORS(app, resources={r"/parse-content": {"origins": "*"}})

@app.route('/parse-content', methods=['POST'])
def parse_content():
    print("Parsing content")
    data = request.json
    print(data)
    return jsonify({'message': 'Content parsed successfully'}), 200

if __name__ == '__main__':
    app.run(debug=True)