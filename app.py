import os
import logging
from flask import Flask, render_template, request, jsonify, send_file
from werkzeug.utils import secure_filename
from PIL import Image
import numpy as np
import io
import base64

# Configure logging
logging.basicConfig(level=logging.DEBUG)

# Create Flask app
app = Flask(__name__)
app.secret_key = os.environ.get("SESSION_SECRET", "cybersecurity-steganography-tool")

# Configure upload folder
UPLOAD_FOLDER = 'temp_uploads'
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif', 'bmp'}
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024  # 16MB max

# Ensure upload directory exists
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/process_image', methods=['POST'])
def process_image():
    try:
        # Check if the post request has the file part
        if 'image' not in request.files:
            return jsonify({'error': 'No file part'}), 400
        
        file = request.files['image']
        
        # If user does not select file, browser also
        # submit an empty part without filename
        if file.filename == '':
            return jsonify({'error': 'No selected file'}), 400
        
        if file and allowed_file(file.filename):
            # Process the image
            img = Image.open(file)
            
            # Convert to base64 for sending back to client
            buffered = io.BytesIO()
            img_format = img.format or 'PNG'
            img.save(buffered, format=img_format)
            img_str = base64.b64encode(buffered.getvalue()).decode('utf-8')
            
            return jsonify({
                'success': True, 
                'image': img_str,
                'format': img_format.lower(),
                'size': f"{img.width}x{img.height}"
            })
        else:
            return jsonify({'error': 'File type not allowed'}), 400
            
    except Exception as e:
        logging.error(f"Error processing image: {str(e)}")
        return jsonify({'error': f'Error processing image: {str(e)}'}), 500

@app.route('/download_image', methods=['POST'])
def download_image():
    try:
        data = request.get_json()
        if not data or 'image' not in data:
            return jsonify({'error': 'No image data received'}), 400
        
        # Decode base64 image
        image_str = data['image']
        # Check if the string contains a data URI scheme prefix
        if ',' in image_str:
            # Extract the base64 part after the comma
            image_data = base64.b64decode(image_str.split(',')[1])
        else:
            # If no comma, decode directly
            image_data = base64.b64decode(image_str)
            
        image_format = data.get('format', 'png')
        
        # Create a BytesIO object to hold the image data
        img_io = io.BytesIO(image_data)
        
        # Send the file
        return send_file(
            img_io,
            mimetype=f'image/{image_format}',
            as_attachment=True,
            download_name=f'steganography_result.{image_format}'
        )
    except Exception as e:
        logging.error(f"Error downloading image: {str(e)}")
        return jsonify({'error': f'Error downloading image: {str(e)}'}), 500

# Error handlers
@app.errorhandler(404)
def page_not_found(e):
    return render_template('index.html'), 404

@app.errorhandler(500)
def server_error(e):
    return jsonify({'error': 'Internal server error'}), 500

if __name__ == "__main__":
    app.run(host='0.0.0.0', port=5000, debug=True)
