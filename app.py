import os
import time
import numpy as np
from PIL import Image
from flask import Flask, request, jsonify, render_template

# ==========================================================================
# BULLETPROOF KERAS COMPATIBILITY PATCH FOR DENSE LAYERS DESERIALIZATION
# (Solves 'Unrecognized keyword arguments passed to Dense: quantization_config' mismatch)
# ==========================================================================
try:
    import keras
    if hasattr(keras.layers, 'Dense'):
        original_init = keras.layers.Dense.__init__
        def patched_init(self, *args, **kwargs):
            kwargs.pop('quantization_config', None)
            original_init(self, *args, **kwargs)
        keras.layers.Dense.__init__ = patched_init
        print("Successfully patched standalone keras.layers.Dense for serialization compatibility!")
except Exception as e:
    print(f"Standalone Keras patch bypassed: {e}")

try:
    import tensorflow as tf
    if hasattr(tf.keras.layers, 'Dense'):
        original_tf_init = tf.keras.layers.Dense.__init__
        def patched_tf_init(self, *args, **kwargs):
            kwargs.pop('quantization_config', None)
            original_tf_init(self, *args, **kwargs)
        tf.keras.layers.Dense.__init__ = patched_tf_init
        print("Successfully patched tf.keras.layers.Dense for serialization compatibility!")
except Exception as e:
    print(f"TensorFlow Keras patch bypassed: {e}")
# ==========================================================================


# Initialize Flask Application
app = Flask(__name__)

# Configure upload rules
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'webp'}
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024  # Limit uploads to 16MB

# Global variable to hold the loaded Keras model
model = None

def get_model():
    """
    Lazy loader for TensorFlow / Keras model to prevent blockages during application startup,
    and to optimize memory utilization.
    """
    global model
    if model is None:
        import tensorflow as tf
        
        # Primary paths for .keras and fallback to .h5
        keras_path = os.path.join(os.path.dirname(__file__), 'fruits_fresh_rotten_model.keras')
        h5_path = os.path.join(os.path.dirname(__file__), 'fruits_fresh_rotten_model.h5')
        
        if os.path.exists(keras_path):
            print(f"Loading primary Keras model: {keras_path}")
            model = tf.keras.models.load_model(keras_path)
        elif os.path.exists(h5_path):
            print(f"Loading fallback H5 model: {h5_path}")
            model = tf.keras.models.load_model(h5_path)
        else:
            raise FileNotFoundError("Model file not found in current directory! Make sure .keras or .h5 is available.")
        
        print("Model loaded successfully into RAM.")
    return model

def allowed_file(filename):
    """Checks if the file extension is allowed."""
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

@app.route('/')
def home():
    """Renders the main dashboard user interface."""
    return render_template('index.html')

@app.route('/predict', methods=['POST'])
def predict():
    """
    Accepts an uploaded image, runs preprocess operations, runs Keras model
    inference, and returns structured predictions, labels, and performance metrics as JSON.
    """
    start_time = time.time()
    
    # 1. Validation checks
    if 'file' not in request.files:
        return jsonify({'error': 'No file uploaded'}), 400
    
    file = request.files['file']
    if file.filename == '':
        return jsonify({'error': 'Empty filename selected'}), 400
    
    if not allowed_file(file.filename):
        return jsonify({'error': 'Unsupported file format. Please upload PNG, JPG, JPEG, or WEBP.'}), 400
    
    try:
        # Load Keras model
        keras_model = get_model()
        
        # 2. Image Preprocessing
        image = Image.open(file.stream)
        # Ensure image is in RGB format (handles PNG transparencies or greyscale images)
        if image.mode != 'RGB':
            image = image.convert('RGB')
            
        # Resize to input dimensions required by CNN model (224x224)
        image_resized = image.resize((224, 224))
        
        # Convert to float32 numpy array and normalize pixels to [0, 1] range
        img_array = np.array(image_resized, dtype=np.float32) / 255.0
        
        # Expand dimensions to create batch shape: (1, 224, 224, 3)
        img_batch = np.expand_dims(img_array, axis=0)
        
        # 3. Model Inference
        inference_start = time.time()
        prediction = keras_model.predict(img_batch)
        inference_time = (time.time() - inference_start) * 1000 # in ms
        
        # 4. Process predictions
        # Model has output shape (None, 1) with Sigmoid activation
        raw_val = float(prediction[0][0])
        
        # Class binary mappings: 
        # Alphabetical sorting of folders: 'fresh' is 0, 'rotten' is 1
        if raw_val >= 0.5:
            label = "Rotten"
            confidence = raw_val * 100
        else:
            label = "Fresh"
            confidence = (1.0 - raw_val) * 100
            
        total_time = (time.time() - start_time) * 1000 # in ms
        
        return jsonify({
            'success': True,
            'label': label,
            'confidence': round(confidence, 2),
            'raw_probability': round(raw_val, 6),
            'metrics': {
                'inference_ms': round(inference_time, 2),
                'total_ms': round(total_time, 2)
            }
        })
        
    except Exception as e:
        print(f"Error during inference pipeline: {str(e)}")
        return jsonify({
            'success': False,
            'error': f"Failed to process image: {str(e)}"
        }), 500

if __name__ == '__main__':
    # Initialize the model on startup so that subsequent page hits are super fast
    try:
        get_model()
    except Exception as e:
        print(f"Warning: Could not pre-load model on startup: {e}")
        
    app.run(host='0.0.0.0', port=7860, debug=False)
