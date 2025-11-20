# ✨ Squishy Jellycat Splat 🧸

Welcome to the **Squishy Jellycat Splat** experiment! This interactive 3D web app lets you play with adorable Gaussian Splat models in a satisfyingly squishy way.

![Jellycat Theme](https://placehold.co/600x400/f4f9fc/6dcff6?text=Squish+Me!)

## 🎀 Features

- **Interactive Squishiness:** Click and drag anywhere on the model to pull and deform it. Release to watch it bounce back with elastic physics!
- **Cute UI:** A "Jellycat" brand-inspired interface with soft pastels, rounded controls, and friendly typography.
- **Model Selector:** Switch between different Jellycat friends (Penguin, Peridot, etc.) using the collection dropdown.
- **Customizable Physics:** Use the settings menu (top right) to tweak:
  - Deformation Strength
  - Drag Radius
  - Bounce Strength & Speed

## 🎮 Controls

| Action | Control |
|--------|---------|
| **Squish/Drag** | Left Click + Drag on model |
| **Rotate** | `A` / `D` keys |
| **Zoom** | `W` / `S` keys |

## 🛠️ Tech Stack

This project is built with:
- **[Three.js](https://threejs.org/)**: For the 3D scene and camera management.
- **[Spark](https://sparkjs.dev/)** (`@sparkjsdev/spark`): For high-performance Gaussian Splat rendering and the `dyno` shader system used for the deformation effects.
- **[lil-gui](https://lil-gui.georgealways.com/)**: For the floating settings panel.

## 🚀 How to Run

Since this project uses ES modules and fetches external assets, you need to run it with a local web server.

1. **Install dependencies** (if you haven't already):
   ```bash
   npm install
   ```

2. **Start a local server**:
   You can use any static file server. For example, using `npx serve` or Python:
   
   ```bash
   # Node.js
   npx serve .

   # Python
   python -m http.server
   ```

3. **Open your browser**:
   Navigate to the URL shown (usually `http://localhost:3000` or `http://localhost:8000`).

---

*Made with 💖 for Jellycat fans!*
