import React, { useRef, useState, useLayoutEffect, useCallback } from 'react';
// Fix: Renamed ImageData to LocalImageData
import type { LocalImageData } from '../types';
import { BrushIcon } from './icons/BrushIcon';
import { ResetIcon } from './icons/ResetIcon';

interface MaskingEditorProps {
  // Fix: Renamed ImageData to LocalImageData
  image: LocalImageData;
  onMaskChange: (mask: LocalImageData | null) => void;
}

export const MaskingEditor: React.FC<MaskingEditorProps> = ({ image, onMaskChange }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [brushSize, setBrushSize] = useState(30);
  const [lastPosition, setLastPosition] = useState<{ x: number; y: number } | null>(null);

  const setupCanvas = useCallback(() => {
    const imageEl = imageRef.current;
    const canvasEl = canvasRef.current;
    if (imageEl && canvasEl) {
      const { width, height } = imageEl.getBoundingClientRect();
      canvasEl.width = width;
      canvasEl.height = height;
      const context = canvasEl.getContext('2d');
      if (context) {
        context.clearRect(0, 0, width, height);
      }
    }
  }, []);

  useLayoutEffect(() => {
    onMaskChange(null);
    const imageEl = imageRef.current;
    if (imageEl) {
      // If image is already loaded, setup canvas. Otherwise, add event listener.
      if (imageEl.complete) {
        setupCanvas();
      } else {
        imageEl.onload = setupCanvas;
      }
    }
    // Also handle window resize to keep canvas aligned
    window.addEventListener('resize', setupCanvas);
    return () => {
      window.removeEventListener('resize', setupCanvas);
      if (imageEl) {
        imageEl.onload = null;
      }
    };
  }, [image, setupCanvas, onMaskChange]);
  
  const getCoordinates = (e: React.MouseEvent | React.TouchEvent) => {
      const canvas = canvasRef.current;
      if (!canvas) return null;
      const rect = canvas.getBoundingClientRect();
      
      let clientX, clientY;
      if ('touches' in e) {
          clientX = e.touches[0].clientX;
          clientY = e.touches[0].clientY;
      } else {
          clientX = e.clientX;
          clientY = e.clientY;
      }
      return { x: clientX - rect.left, y: clientY - rect.top };
  }

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    const pos = getCoordinates(e);
    if (pos) {
      setIsDrawing(true);
      setLastPosition(pos);
    }
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing) return;
    e.preventDefault();
    const pos = getCoordinates(e);
    if (pos && lastPosition) {
      const context = canvasRef.current?.getContext('2d');
      if (context) {
        context.beginPath();
        context.strokeStyle = 'white';
        context.lineWidth = brushSize;
        context.lineCap = 'round';
        context.lineJoin = 'round';
        context.moveTo(lastPosition.x, lastPosition.y);
        context.lineTo(pos.x, pos.y);
        context.stroke();
        setLastPosition(pos);
      }
    }
  };
  
  const createFullResolutionMask = (): LocalImageData | null => {
      const sourceImage = imageRef.current;
      const visibleCanvas = canvasRef.current;
      if (!sourceImage || !visibleCanvas || sourceImage.naturalWidth === 0) return null;

      const hiddenCanvas = document.createElement('canvas');
      hiddenCanvas.width = sourceImage.naturalWidth;
      hiddenCanvas.height = sourceImage.naturalHeight;
      const ctx = hiddenCanvas.getContext('2d');

      if (ctx) {
        // 1. Fill the background with black
        ctx.fillStyle = 'black';
        ctx.fillRect(0, 0, hiddenCanvas.width, hiddenCanvas.height);
        
        // 2. Draw the user's mask (from the visible canvas) in white
        ctx.drawImage(visibleCanvas, 0, 0, hiddenCanvas.width, hiddenCanvas.height);
      }
      
      const base64 = hiddenCanvas.toDataURL('image/png').split(',')[1];
      return { base64, mimeType: 'image/png' };
  }


  const stopDrawing = () => {
    if (!isDrawing) return;
    setIsDrawing(false);
    setLastPosition(null);
    const maskData = createFullResolutionMask();
    if(maskData) {
        onMaskChange(maskData);
    }
  };

  const clearMask = () => {
    const canvas = canvasRef.current;
    if (canvas) {
        const context = canvas.getContext('2d');
        context?.clearRect(0, 0, canvas.width, canvas.height);
    }
    onMaskChange(null);
  };


  return (
    <div className="space-y-3">
        <p className="text-sm text-gray-300">Tô lên vật thể bạn muốn xóa:</p>
        <div ref={containerRef} className="relative w-full cursor-crosshair touch-none">
            <img
                ref={imageRef}
                src={`data:${image.mimeType};base64,${image.base64}`}
                alt="Chỉnh sửa"
                className="w-full h-auto rounded-lg select-none"
            />
            <canvas
                ref={canvasRef}
                className="absolute top-0 left-0 w-full h-full rounded-lg opacity-75"
                onMouseDown={startDrawing}
                onMouseMove={draw}
                onMouseUp={stopDrawing}
                onMouseLeave={stopDrawing}
                onTouchStart={startDrawing}
                onTouchMove={draw}
                onTouchEnd={stopDrawing}
            />
        </div>
        <div className="flex items-center justify-between gap-4 p-2 bg-gray-900/50 rounded-md">
            <div className="flex items-center gap-2 text-sm text-gray-300">
                <BrushIcon />
                <span>Cỡ cọ:</span>
            </div>
            <input
                type="range"
                min="5"
                max="100"
                value={brushSize}
                onChange={(e) => setBrushSize(Number(e.target.value))}
                className="flex-grow h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
            />
             <button type="button" onClick={clearMask} className="p-2 text-gray-400 hover:text-white transition-colors" title="Làm lại">
                <ResetIcon />
            </button>
        </div>
    </div>
  );
};
