/* ==========================================================================
   SAVORSHIELD CLIENT-SIDE JS CONTROLLER
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
    // 1. DOM Element Cache
    const body = document.body;
    const dropzone = document.getElementById('dropzone');
    const fileInput = document.getElementById('fileInput');
    const dropzoneDefaultContent = document.getElementById('dropzoneDefaultContent');
    const previewContainer = document.getElementById('previewContainer');
    const imagePreview = document.getElementById('imagePreview');
    const removeFileBtn = document.getElementById('removeFileBtn');
    const analyzeBtn = document.getElementById('analyzeBtn');
    
    // View sections
    const uploadSection = document.getElementById('uploadSection');
    const loadingSection = document.getElementById('loadingSection');
    const resultsSection = document.getElementById('resultsSection');
    
    // Loader steps
    const stepLoad = document.getElementById('stepLoad');
    const stepPreprocess = document.getElementById('stepPreprocess');
    const stepPredict = document.getElementById('stepPredict');
    
    // Results DOM
    const resultImage = document.getElementById('resultImage');
    const statusBadge = document.getElementById('statusBadge');
    const confidenceValue = document.getElementById('confidenceValue');
    const circularProgress = document.getElementById('circularProgress');
    const valInferenceTime = document.getElementById('valInferenceTime');
    const valTotalLatency = document.getElementById('valTotalLatency');
    const valRawSigmoid = document.getElementById('valRawSigmoid');
    const resetBtn = document.getElementById('resetBtn');

    // Global state holding selected file
    let selectedFile = null;

    // ==========================================================================
    // 2. Drag & Drop & Browse File Interaction
    // ==========================================================================
    
    // Trigger hidden file picker
    dropzone.addEventListener('click', (e) => {
        // Prevent trigger loop when clicking the remove button or inside image preview
        if (e.target.closest('#removeFileBtn') || e.target.closest('#previewContainer')) return;
        fileInput.click();
    });

    fileInput.addEventListener('change', () => {
        if (fileInput.files.length > 0) {
            handleFileSelect(fileInput.files[0]);
        }
    });

    // Drag-over highlights
    ['dragenter', 'dragover'].forEach(eventName => {
        dropzone.addEventListener(eventName, (e) => {
            e.preventDefault();
            e.stopPropagation();
            dropzone.classList.add('drag-active');
        }, false);
    });

    ['dragleave', 'drop'].forEach(eventName => {
        dropzone.addEventListener(eventName, (e) => {
            e.preventDefault();
            e.stopPropagation();
            dropzone.classList.remove('drag-active');
        }, false);
    });

    // File drop event handler
    dropzone.addEventListener('drop', (e) => {
        const dt = e.dataTransfer;
        const files = dt.files;
        if (files.length > 0) {
            handleFileSelect(files[0]);
        }
    });

    // ==========================================================================
    // 3. File Preview & Verification Logic
    // ==========================================================================
    
    function handleFileSelect(file) {
        // Check file extension
        const allowedExtensions = ['png', 'jpg', 'jpeg', 'webp'];
        const extension = file.name.split('.').pop().toLowerCase();
        
        if (!allowedExtensions.includes(extension)) {
            showNotification('Unsupported format! Please drop an image file (PNG, JPG, JPEG, WEBP).', 'error');
            return;
        }

        // Limit size to 16MB
        if (file.size > 16 * 1024 * 1024) {
            showNotification('File exceeds 16MB upload limit!', 'error');
            return;
        }

        selectedFile = file;

        // Render preview image locally
        const reader = new FileReader();
        reader.onload = (e) => {
            imagePreview.src = e.target.result;
            dropzoneDefaultContent.classList.add('hidden');
            previewContainer.classList.remove('hidden');
            analyzeBtn.disabled = false;
        };
        reader.readAsDataURL(file);
    }

    // Remove Selected Specimen
    removeFileBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        resetFileInput();
    });

    function resetFileInput() {
        selectedFile = null;
        fileInput.value = '';
        imagePreview.src = '';
        previewContainer.classList.add('hidden');
        dropzoneDefaultContent.classList.remove('hidden');
        analyzeBtn.disabled = true;
    }

    // ==========================================================================
    // 4. API Request & Model Prediction Engine
    // ==========================================================================
    
    analyzeBtn.addEventListener('click', () => {
        if (!selectedFile) return;

        // Transition: Upload Screen -> Loading Screen
        uploadSection.classList.add('hidden');
        loadingSection.classList.remove('hidden');
        
        // Progress steps simulator (adds satisfying micro-visuals)
        resetLoadingSteps();
        
        setTimeout(() => {
            stepPreprocess.classList.add('active');
        }, 600);

        setTimeout(() => {
            stepPredict.classList.add('active');
        }, 1200);

        // Build Payload
        const formData = new FormData();
        formData.append('file', selectedFile);

        // Fetch prediction
        fetch('/predict', {
            method: 'POST',
            body: formData
        })
        .then(response => {
            if (!response.ok) {
                return response.json().then(err => { throw new Error(err.error || 'Server error') });
            }
            return response.json();
        })
        .then(data => {
            if (data.success) {
                // Buffer to keep the loading steps looking deliberate and pleasant
                setTimeout(() => {
                    renderPredictionResults(data);
                }, 1800);
            } else {
                throw new Error(data.error || 'Inference engine failed');
            }
        })
        .catch(err => {
            console.error('Classification error:', err);
            showNotification(err.message, 'error');
            // Go back
            setTimeout(() => {
                loadingSection.classList.add('hidden');
                uploadSection.classList.remove('hidden');
            }, 1000);
        });
    });

    function resetLoadingSteps() {
        stepLoad.classList.add('active');
        stepPreprocess.classList.remove('active');
        stepPredict.classList.remove('active');
    }

    // ==========================================================================
    // 5. Render Results & Gauge Animation
    // ==========================================================================
    
    function renderPredictionResults(data) {
        // Set visual elements
        resultImage.src = imagePreview.src;
        statusBadge.textContent = `${data.label} Fruit`;
        
        valInferenceTime.textContent = `${data.metrics.inference_ms} ms`;
        valTotalLatency.textContent = `${data.metrics.total_ms} ms`;
        valRawSigmoid.textContent = data.raw_probability.toFixed(6);

        // Clear existing state overrides
        body.classList.remove('is-fresh', 'is-rotten');
        
        // Color variables depending on prediction
        let themeColor = 'var(--accent-primary)';
        if (data.label === 'Fresh') {
            body.classList.add('is-fresh');
            themeColor = 'var(--color-fresh)';
        } else {
            body.classList.add('is-rotten');
            themeColor = 'var(--color-rotten)';
        }

        // Transition: Loading -> Results
        loadingSection.classList.add('hidden');
        resultsSection.classList.remove('hidden');

        // Circular Gauge Animation
        animateGauge(data.confidence, themeColor);
    }

    function animateGauge(targetConfidence, color) {
        let currentVal = 0;
        const duration = 1200; // Total animation length in ms
        const steps = 60;
        const stepTime = duration / steps;
        const increment = targetConfidence / steps;

        const interval = setInterval(() => {
            currentVal += increment;
            if (currentVal >= targetConfidence) {
                currentVal = targetConfidence;
                clearInterval(interval);
            }

            // Draw gauge filling
            const angle = (currentVal / 100) * 360;
            circularProgress.style.background = `conic-gradient(${color} ${angle}deg, rgba(255, 255, 255, 0.05) ${angle}deg)`;
            confidenceValue.textContent = `${currentVal.toFixed(1)}%`;
        }, stepTime);
    }

    // ==========================================================================
    // 6. Reset & UI Cleanup
    // ==========================================================================
    
    resetBtn.addEventListener('click', () => {
        // Remove styling state classes
        body.classList.remove('is-fresh', 'is-rotten');
        
        // Transition: Results -> Upload
        resultsSection.classList.add('hidden');
        uploadSection.classList.remove('hidden');
        
        // Clear old loaded file
        resetFileInput();
    });

    // Helper notification builder
    function showNotification(message, type = 'info') {
        const toast = document.createElement('div');
        toast.style.position = 'fixed';
        toast.style.bottom = '24px';
        toast.style.right = '24px';
        toast.style.padding = '12px 24px';
        toast.style.borderRadius = '8px';
        toast.style.color = '#fff';
        toast.style.fontWeight = '600';
        toast.style.fontSize = '0.9rem';
        toast.style.boxShadow = '0 8px 32px rgba(0,0,0,0.3)';
        toast.style.border = '1px solid rgba(255,255,255,0.08)';
        toast.style.backdropFilter = 'blur(10px)';
        toast.style.zIndex = '9999';
        toast.style.transition = 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)';
        toast.style.transform = 'translateY(20px)';
        toast.style.opacity = '0';

        if (type === 'error') {
            toast.style.background = 'rgba(239, 68, 68, 0.9)';
            toast.style.borderColor = 'rgba(239, 68, 68, 0.3)';
        } else {
            toast.style.background = 'rgba(168, 85, 247, 0.9)';
            toast.style.borderColor = 'rgba(168, 85, 247, 0.3)';
        }

        toast.textContent = message;
        document.body.appendChild(toast);

        // Animate in
        setTimeout(() => {
            toast.style.transform = 'translateY(0)';
            toast.style.opacity = '1';
        }, 50);

        // Animate out and remove
        setTimeout(() => {
            toast.style.transform = 'translateY(20px)';
            toast.style.opacity = '0';
            setTimeout(() => {
                toast.remove();
            }, 300);
        }, 4000);
    }
});
