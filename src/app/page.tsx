'use client';
import { useState, useRef, useEffect } from 'react';

// This makes the create...Module function available on the window object
declare global {
  interface Window {
    createImageProcessorModule: () => Promise<any>;
  }
}

export default function HomePage() {
  const [originalImage, setOriginalImage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [brightness, setBrightness] = useState(0);
  const [jsExecutionTime, setJsExecutionTime] = useState<number | null>(null);
  const [wasmExecutionTime, setWasmExecutionTime] = useState<number | null>(
    null,
  );

  const originalCanvasRef = useRef<HTMLCanvasElement>(null);
  const processedCanvasRef = useRef<HTMLCanvasElement>(null);
  const wasmModule = useRef<any>(null);

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      const file = event.target.files[0];
      const reader = new FileReader();

      reader.onload = (e) => {
        const imageUrl = e.target?.result as string;
        setOriginalImage(imageUrl);

        const img = new Image();
        img.src = imageUrl;
        img.onload = () => {
          const canvas = originalCanvasRef.current;
          if (canvas) {
            const ctx = canvas.getContext('2d');
            if (ctx) {
              const MAX_WIDTH = 1024;
              let width = img.width;
              let height = img.height;
              if (width > MAX_WIDTH) {
                height = (height * MAX_WIDTH) / width;
                width = MAX_WIDTH;
              }
              canvas.width = width;
              canvas.height = height;
              ctx.drawImage(img, 0, 0, width, height);
              const processedCanvas = processedCanvasRef.current;
              if (processedCanvas) {
                processedCanvas.width = width;
                processedCanvas.height = height;
                processedCanvas
                  .getContext('2d')
                  ?.clearRect(0, 0, width, height);
              }
            }
          }
        };
      };
      reader.readAsDataURL(file);
    }
  };

  const clearTimings = () => {
    setJsExecutionTime(null);
    setWasmExecutionTime(null);
  };

  // --- GRAYSCALE LOGIC ---
  const applyGrayscaleFilter = async () => {
    if (!originalCanvasRef.current) return;
    setIsProcessing(true);
    clearTimings();
    // Grayscale is WASM-only in our implementation
    const originalCtx = originalCanvasRef.current.getContext('2d');
    if (!originalCtx) return;
    const imageData = originalCtx.getImageData(
      0,
      0,
      originalCanvasRef.current.width,
      originalCanvasRef.current.height,
    );
    if (!wasmModule.current)
      wasmModule.current = await window.createImageProcessorModule();
    const instance = wasmModule.current;
    const buffer = instance._malloc(imageData.data.length);
    instance.HEAPU8.set(imageData.data, buffer);
    const grayscaleFunc = instance.cwrap('applyGrayscale', null, [
      'number',
      'number',
      'number',
    ]);
    grayscaleFunc(buffer, imageData.width, imageData.height);
    const processedData = new Uint8ClampedArray(
      instance.HEAPU8.subarray(buffer, buffer + imageData.data.length),
    );
    instance._free(buffer);
    const processedCtx = processedCanvasRef.current?.getContext('2d');
    if (processedCtx) {
      const newImageData = new ImageData(
        processedData,
        imageData.width,
        imageData.height,
      );
      processedCtx.putImageData(newImageData, 0, 0);
    }
    setIsProcessing(false);
  };

  // --- BRIGHTNESS LOGIC ---
  const applyBrightnessFilter = async (method: 'js' | 'wasm') => {
    if (!originalCanvasRef.current) return;
    setIsProcessing(true);
    clearTimings();
    const originalCtx = originalCanvasRef.current.getContext('2d');
    if (!originalCtx) return;
    const imageData = originalCtx.getImageData(
      0,
      0,
      originalCanvasRef.current.width,
      originalCanvasRef.current.height,
    );
    let processedData: Uint8ClampedArray | null = null;
    const startTime = performance.now();
    if (method === 'js') {
      const data = new Uint8ClampedArray(imageData.data);
      for (let i = 0; i < data.length; i += 4) {
        data[i] += brightness;
        data[i + 1] += brightness;
        data[i + 2] += brightness;
      }
      processedData = data;
      setJsExecutionTime(performance.now() - startTime);
    } else {
      if (!wasmModule.current)
        wasmModule.current = await window.createImageProcessorModule();
      const instance = wasmModule.current;
      const buffer = instance._malloc(imageData.data.length);
      instance.HEAPU8.set(imageData.data, buffer);
      const brightnessFunc = instance.cwrap('applyBrightness', null, [
        'number',
        'number',
        'number',
        'number',
      ]);
      brightnessFunc(buffer, imageData.width, imageData.height, brightness);
      processedData = new Uint8ClampedArray(
        instance.HEAPU8.subarray(buffer, buffer + imageData.data.length),
      );
      instance._free(buffer);
      setWasmExecutionTime(performance.now() - startTime);
    }
    const processedCtx = processedCanvasRef.current?.getContext('2d');
    if (processedData && processedCtx) {
      const newImageData = new ImageData(
        new Uint8ClampedArray(processedData),
        imageData.width,
        imageData.height,
      );
      processedCtx.putImageData(newImageData, 0, 0);
    }
    setIsProcessing(false);
  };

  // --- BLUR LOGIC ---
  const applyBlurFilter = async (method: 'js' | 'wasm') => {
    if (!originalCanvasRef.current) return;
    setIsProcessing(true);
    clearTimings();
    const originalCtx = originalCanvasRef.current.getContext('2d');
    if (!originalCtx) return;
    const imageData = originalCtx.getImageData(
      0,
      0,
      originalCanvasRef.current.width,
      originalCanvasRef.current.height,
    );
    let processedData: Uint8ClampedArray | null = null;
    const startTime = performance.now();
    if (method === 'js') {
      processedData = applyBoxBlurJS(imageData);
      setJsExecutionTime(performance.now() - startTime);
    } else {
      if (!wasmModule.current)
        wasmModule.current = await window.createImageProcessorModule();
      const instance = wasmModule.current;
      const buffer = instance._malloc(imageData.data.length);
      instance.HEAPU8.set(imageData.data, buffer);
      const blurFunc = instance.cwrap('applyBoxBlur', null, [
        'number',
        'number',
        'number',
      ]);
      blurFunc(buffer, imageData.width, imageData.height);
      processedData = new Uint8ClampedArray(
        instance.HEAPU8.subarray(buffer, buffer + imageData.data.length),
      );
      instance._free(buffer);
      setWasmExecutionTime(performance.now() - startTime);
    }
    const processedCtx = processedCanvasRef.current?.getContext('2d');
    if (processedData && processedCtx) {
      const newImageData = new ImageData(
        new Uint8ClampedArray(processedData),
        imageData.width,
        imageData.height,
      );
      processedCtx.putImageData(newImageData, 0, 0);
    }
    setIsProcessing(false);
  };

  const applyBoxBlurJS = (imageData: ImageData): Uint8ClampedArray => {
    const { data, width, height } = imageData;
    const originalData = new Uint8ClampedArray(data);
    const processedData = new Uint8ClampedArray(data.length);
    const getPixelIndex = (x: number, y: number) => {
      if (x < 0) x = 0;
      if (x >= width) x = width - 1;
      if (y < 0) y = 0;
      if (y >= height) y = height - 1;
      return (y * width + x) * 4;
    };
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        let r = 0,
          g = 0,
          b = 0;
        for (let ky = -1; ky <= 1; ky++) {
          for (let kx = -1; kx <= 1; kx++) {
            const ni = getPixelIndex(x + kx, y + ky);
            r += originalData[ni];
            g += originalData[ni + 1];
            b += originalData[ni + 2];
          }
        }
        const ci = (y * width + x) * 4;
        processedData[ci] = r / 9;
        processedData[ci + 1] = g / 9;
        processedData[ci + 2] = b / 9;
        processedData[ci + 3] = originalData[ci + 3];
      }
    }
    return processedData;
  };

  useEffect(() => {
    const script = document.createElement('script');
    script.src = '/wasm/image_processor.js';
    script.async = true;
    document.body.appendChild(script);
  }, []);

  return (
    <main
      style={{
        fontFamily: 'Arial, sans-serif',
        padding: '2rem',
        textAlign: 'center',
      }}
    >

      <h1>Vortex - C++/WASM Image Editor</h1>
      <p>Perform complex image processing entirely in your browser.</p>
      <input
        type="file"
        accept="image/*"
        onChange={handleImageUpload}
        style={{ margin: '20px 0' }}
      />
      {originalImage && (
        <div
          style={{
            maxWidth: '800px',
            margin: '20px auto',
            border: '1px solid #ccc',
            padding: '20px',
            paddingTop: '0',
            borderRadius: '8px',
          }}
        >

          <h3>Controls</h3>
          <p>
            <b>Tip:</b> Use a larger image (e.g., {'>'}1000px wide) to see the
            performance difference.
          </p>

          <hr /> 
          <h4>Grayscale (Simple Filter)</h4>
          <button onClick={applyGrayscaleFilter} disabled={isProcessing}>
            Apply Grayscale (WASM)
          </button>
          <hr style={{ margin: '20px 0' }} />
          <h4>Brightness (Simple Filter)</h4>
          <label htmlFor="brightness">Value: {brightness}</label>
          <input
            id="brightness"
            type="range"
            min="-100"
            max="100"
            value={brightness}
            onChange={(e) => setBrightness(parseInt(e.target.value, 10))}
            style={{ width: '80%', display: 'block', margin: '10px auto' }}
          />
          <div
            style={{ display: 'flex', justifyContent: 'center', gap: '10px' }}
          >

            <button
              onClick={() => applyBrightnessFilter('js')}
              disabled={isProcessing}
            >
              Apply (JS)
            </button>
            <button
              onClick={() => applyBrightnessFilter('wasm')}
              disabled={isProcessing}
            >
              Apply (WASM)
            </button>
          </div>
          <hr style={{ margin: '20px 0' }} /> <h4>Box Blur (Complex Filter)</h4>
          <div
            style={{ display: 'flex', justifyContent: 'center', gap: '10px' }}
          >

            <button
              onClick={() => applyBlurFilter('js')}
              disabled={isProcessing}
            >
              Apply Box Blur (JS)
            </button>
            <button
              onClick={() => applyBlurFilter('wasm')}
              disabled={isProcessing}
            >
              Apply Box Blur (WASM)
            </button>
          </div>
        </div>
      )}
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          gap: '20px',
          marginTop: '20px',
          flexWrap: 'wrap'
        }}
      >

        <div>
          <h2>Original</h2>
          <canvas
            className='canvas'
            ref={originalCanvasRef}
          ></canvas>
        </div>
        <div>
          <h2>Processed</h2>
          <canvas
            className='canvas'
            ref={processedCanvasRef}
          ></canvas>
        </div>
      </div>

       {jsExecutionTime !== null && (
              <p style={{ color: 'orange' , fontSize: '16px'}}>
                JavaScript Execution Time: {jsExecutionTime.toFixed(2)} ms
              </p>
            )}
            {wasmExecutionTime !== null && (
              <p style={{ color: 'green' , fontSize:'16px'}}>
                WASM (C++) Execution Time: {wasmExecutionTime.toFixed(2)} ms
              </p>
            )}
    </main>
  );
}
