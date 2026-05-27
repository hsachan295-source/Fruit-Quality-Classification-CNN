# 🍎 SavorShield - Fruit Freshness Classification System

SavorShield is an interactive deep learning web application that uses a Keras Convolutional Neural Network (CNN) to instantly classify fruits as **Fresh** or **Rotten**. It features a modern Flask-based Python backend and a premium glassmorphic dark-mode web user interface styled with Vanilla CSS and high-fidelity Javascript micro-interactions.

---

## 🌟 Key Features

* **Instant CNN Inference**: Pre-loads the 134MB Keras model (`fruits_fresh_rotten_model.keras` or `fruits_fresh_rotten_model.h5`) at server startup to deliver quick prediction times.
* **Drag-and-Drop Dropzone**: Implemented with responsive drag events, instant client-side preview, and verification checks.
* **Dynamic Visual Themes**: The interface adapts to predictions:
  * **Vibrant Emerald theme** for **Fresh** fruits.
  * **Amber/Crimson theme** for **Rotten** fruits.
* **Conic-Gradient Progress Gauge**: Smoothly animates the confidence level returned by the sigmoid layer.
* **Latency & Architecture Stats**: Displays neural network characteristics (Inference delay, model sequence layers, total latency, and exact sigmoid probabilities).
* **Single-Click Portability**: Windows batch script wrapper (`run.bat`) to automate installation and host launching.

---

## 📂 Project Architecture

```
d:\Data science course\11-Deep learning\6-food_classification\
├── fruits_fresh_rotten_model.keras    # Pre-trained Keras Model file
├── fruits_fresh_rotten_model.h5       # Fallback Keras Model file
├── app.py                             # Flask Web Server & Inference Pipeline
├── requirements.txt                   # Environment Dependencies
├── run.bat                            # Windows Environment Setup & Launcher
├── README.md                          # Project Documentation
├── templates/
│   └── index.html                     # Semantic Web Structure
└── static/
    ├── css/
    │   └── style.css                  # Custom CSS Stylesheet & Glassmorphic variables
    └── js/
        └── main.js                    # Javascript Controller & API Fetches
```

---

## ⚙️ How It Works (The Inference Pipeline)

1. **Upload**: The user uploads an image (PNG, JPG, JPEG, or WEBP) up to 16MB.
2. **Preprocessing**: The Flask application opens the image stream via Pillow, converts it to **RGB** color channels, and resizes it to **$224 \times 224$ pixels** matching the model input shape requirement.
3. **Normalization**: The pixel matrix values are scaled to **`[0.0, 1.0]`** by dividing by `255.0` to match model scaling during training.
4. **Execution**: The input tensor is fed into the Keras model. The final layer uses a single-node `dense` sigmoid activation that outputs a probability value ($P$) between `0` and `1`.
5. **Class Mapping**:
   * If **$P < 0.5$**: The fruit is classified as **Fresh** (Confidence = $(1 - P) \times 100\%$).
   * If **$P \ge 0.5$**: The fruit is classified as **Rotten** (Confidence = $P \times 100\%$).
6. **Result Transformation**: The JSON output triggers theme state overrides (`.is-fresh` / `.is-rotten`) in JavaScript, transitioning the UI context theme.

---

## 🚀 Installation & Local Launch

### Option A: Double-Click Launcher (Recommended for Windows)
1. Double-click the **[run.bat](file:///d:/Data%20science%20course/11-Deep%20learning/6-food_classification/run.bat)** file.
2. It will automatically check for Python, verify dependencies (installing Flask, Pillow, and Numpy if missing), and start the server.

### Option B: Terminal Command Line Setup
Navigate to this directory using your terminal and run:

```bash
# 1. Install necessary dependencies
pip install -r requirements.txt

# 2. Run the server
python app.py
```

### Accessing the UI
Open your favorite web browser and go to:
👉 **[http://localhost:5000](http://localhost:5000)**
