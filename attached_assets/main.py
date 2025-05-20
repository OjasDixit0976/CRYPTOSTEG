from app import app
import jsonify
from requests import request
from flask import send_file
import base64
import io
import os


if __name__ == "__main__":
    app.run(host='0.0.0.0', port=5001, debug=True)
