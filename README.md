# Vortex - Next.js + C++ WebAssembly Image Processor

Run C++ functions directly in the browser for CPU-intensive tasks like image processing using WebAssembly (.wasm), fully integrated into a Next.js frontend.

Check out the live app [here](https://nextjs-wasm-image-editor.vercel.app/)!


## 🚀 Features

- **Low-Level Full-Stack:** C++ compiled to WebAssembly runs in the browser
- **High-Performance Image Processing:** Pixel-level operations using `Uint8ClampedArray`
- **Seamless Integration:** Next.js + React UI interacts with C++ functions via JS loader
- **Async Loading:** `.wasm` file loads dynamically to avoid blocking the UI

## 🛠 Tech Stack

- Frontend: Next.js + React  
- C++: Image processing logic  
- WebAssembly: `.wasm` compiled via Emscripten  
- Loader: `.js` file initializes WebAssembly in the browser  
- Canvas API: Display and manipulate images  

## 📂 Project Structure
├─ src/app # page.tsx
├─ public/wasm/ # .image_processor.wasm and image_processor.js
├─ package.json
├─ README.md


## 🎯 How It Works

1. C++ code is compiled to `.wasm` using Emscripten
2. JS loader (`image_processor.js`) dynamically loads the `.wasm` module
3. Exported C++ functions can be called from React components
4. Browser JIT compiles WebAssembly into machine code for execution
5. UI displays processed results in real-time using Canvas

## 💻 Getting Started

```bash
# Clone the repo
git clone https://github.com/username/nextjs-wasm-image-editor.git

# Install dependencies
npm install

# Run locally
npm run dev
