import React, { useRef, useState, useEffect } from 'react';
import { Trash2, Check, Video, VideoOff } from 'lucide-react';
import { isSignatureValid, canvasToSignatureBase64 } from '../../utils/pdf.utils';

interface SignaturePadProps {
  onSignatureConfirm: (base64String: string) => void;
  showCamera?: boolean;
}

export default function SignaturePad({ onSignatureConfirm, showCamera = true }: SignaturePadProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSignature, setHasSignature] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);

  // Initialize canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Set canvas resolution
    canvas.width = 600;
    canvas.height = 250;

    // Fill with white background
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.fillStyle = 'white';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 4;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
    }
  }, []);

  // Start camera (Picture-in-Picture)
  const startCamera = async () => {
    try {
      setCameraError(null);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 320 }, height: { ideal: 240 } },
        audio: false,
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setCameraActive(true);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Cannot access camera';
      setCameraError(message);
      console.error('Camera error:', error);
    }
  };

  // Stop camera
  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
      tracks.forEach(track => track.stop());
      videoRef.current.srcObject = null;
      setCameraActive(false);
    }
  };

  // Mouse down - start drawing
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.beginPath();
      ctx.moveTo(x, y);
      setIsDrawing(true);
    }
  };

  // Mouse move - draw
  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.lineTo(x, y);
      ctx.stroke();
    }
  };

  // Mouse up - stop drawing
  const handleMouseUp = () => {
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.closePath();
      }

      // Check if signature is valid (not just a blank canvas)
      if (isSignatureValid(canvas)) {
        setHasSignature(true);
      }
    }
    setIsDrawing(false);
  };

  // Touch support
  const handleTouchStart = (e: React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const touch = e.touches[0];
    const rect = canvas.getBoundingClientRect();
    const x = touch.clientX - rect.left;
    const y = touch.clientY - rect.top;

    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.beginPath();
      ctx.moveTo(x, y);
      setIsDrawing(true);
    }
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    e.preventDefault();

    const canvas = canvasRef.current;
    if (!canvas) return;

    const touch = e.touches[0];
    const rect = canvas.getBoundingClientRect();
    const x = touch.clientX - rect.left;
    const y = touch.clientY - rect.top;

    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.lineTo(x, y);
      ctx.stroke();
    }
  };

  const handleTouchEnd = () => {
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) ctx.closePath();

      if (isSignatureValid(canvas)) {
        setHasSignature(true);
      }
    }
    setIsDrawing(false);
  };

  // Clear signature
  const clearSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.fillStyle = 'white';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 4;
    }

    setHasSignature(false);
  };

  // Confirm signature
  const confirmSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas || !isSignatureValid(canvas)) {
      alert('Por favor, firma en el área blanca');
      return;
    }

    const base64 = canvasToSignatureBase64(canvas);
    onSignatureConfirm(base64);
  };

  return (
    <div className="w-full space-y-4">
      {/* Camera Toggle */}
      {showCamera && (
        <div className="flex gap-2 items-center">
          <button
            onClick={cameraActive ? stopCamera : startCamera}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
              cameraActive
                ? 'bg-red-500/20 text-red-300 hover:bg-red-500/30'
                : 'bg-blue-500/20 text-blue-300 hover:bg-blue-500/30'
            }`}
          >
            {cameraActive ? (
              <>
                <VideoOff className="w-4 h-4" />
                Detener Cámara
              </>
            ) : (
              <>
                <Video className="w-4 h-4" />
                Iniciar Cámara
              </>
            )}
          </button>
          {cameraError && (
            <span className="text-xs text-red-400">{cameraError}</span>
          )}
        </div>
      )}

      {/* Main Signature Canvas Area */}
      <div className="relative rounded-xl border-2 border-dashed border-slate-400 bg-white overflow-hidden">
        {/* Canvas */}
        <canvas
          ref={canvasRef}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          className="w-full block cursor-crosshair"
          style={{ touchAction: 'none' }}
        />

        {/* Camera Video (Picture-in-Picture) */}
        {cameraActive && (
          <video
            ref={videoRef}
            autoPlay
            playsInline
            className="absolute bottom-3 right-3 w-32 h-24 rounded-lg border-2 border-white shadow-lg object-cover bg-black"
          />
        )}

        {/* Instructions Overlay (shown when empty) */}
        {!hasSignature && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="text-center text-slate-400">
              <p className="text-lg font-semibold">Firma aquí</p>
              <p className="text-sm opacity-70">Usa el mouse o pantalla táctil</p>
            </div>
          </div>
        )}
      </div>

      {/* Control Buttons */}
      <div className="flex gap-3 justify-center">
        <button
          onClick={clearSignature}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 font-medium transition-all border border-red-500/30 hover:border-red-500/50"
        >
          <Trash2 className="w-4 h-4" />
          Limpiar Firma
        </button>

        <button
          onClick={confirmSignature}
          disabled={!hasSignature}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all border ${
            hasSignature
              ? 'bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border-emerald-500/30 hover:border-emerald-500/50 cursor-pointer'
              : 'bg-slate-500/10 text-slate-500 border-slate-500/20 cursor-not-allowed opacity-50'
          }`}
        >
          <Check className="w-4 h-4" />
          Confirmar Firma
        </button>
      </div>

      {/* Help Text */}
      <p className="text-xs text-slate-400 text-center">
        Dibuja tu firma natural. La firma será incluida en el contrato PDF.
      </p>
    </div>
  );
}
