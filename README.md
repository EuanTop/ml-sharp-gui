# [SHARP](https://github.com/apple/ml-sharp) 3D Generator GUI

[中文版](./README.zh-CN.md) | [English](./README.md)

![Monalisa Example](example_monalisa.gif)

A modern web-based GUI for Apple's [SHARP](https://github.com/apple/ml-sharp) (Single-image 3D Human-object interAction Reconstruction and Prediction) model, featuring real-time 3D Gaussian Splatting visualization with interactive effects.

## Prerequisites

**⚠️ IMPORTANT: Install Apple's SHARP First**

This project requires Apple's [SHARP](https://github.com/apple/ml-sharp) model to be installed. You must install it before proceeding:

```bash
# Clone SHARP repository
git clone https://github.com/apple/ml-sharp.git
cd ml-sharp

# Checkout the tested commit version
git checkout 1eaa046

# Install SHARP following their instructions
pip install -e .
```

For more details, visit: https://github.com/apple/ml-sharp

## Installation

### 1. Backend Setup

```bash
cd ml-sharp-gui/backend

# Install dependencies
pip install -r requirements.txt

# Start the backend server
python app.py
```

The backend will run on `http://localhost:5000`

### 2. Frontend Setup

```bash
cd ml-sharp-gui/frontend

# Install dependencies
npm install

# Start the development server
npm run dev
```

The frontend will run on `http://localhost:5173`

## Usage

1. **Open your browser** and navigate to `http://localhost:5173`

2. **Select an image** using the "Select" button or **Import a PLY file** directly

3. **Configure parameters** (optional):
   - Point Size: Adjust Gaussian splat size
   - Model Scale: Scale the 3D model
   - Max Points: Maximum number of points to generate
   - Effects: Choose from Magic, Spread, Unroll, Twister, or Rain effects

4. **Click "Generate"** to create the 3D model

5. **Interact with the 3D view**:
   - Left-click + drag: Rotate camera
   - Scroll: Zoom in/out
   - Toggle Axes/Grid for reference

6. **Download** the generated PLY model from `backend/outputs/`

## Features

- 🎨 Real-time 3D Gaussian Splatting visualization
- 🎬 Multiple animation effects (Magic Reveal, Spread, Unroll, Twister, Rain)
- 🌐 Multi-language support (EN, ZH, FR, DE, IT, ES, JA, KO)
- 📦 PLY file import/export
- ⚙️ Customizable rendering parameters
- 🎮 Interactive camera controls

### System Requirements

- Python 3.8+
- Node.js 16+
- CUDA-compatible GPU (recommended) or Apple Silicon (MPS)


## License
[MIT License](LICENSE.txt)


