import React, { useEffect, useRef, useState } from 'react';
import {
  PenLine,
  Eraser,
  Undo2,
  RotateCcw,
  X,
  ArrowRight,
  Info,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { Button, IconButton, Badge } from '../ui';

export interface DrawingPadModalProps {
  onDone: (blob: Blob) => void;
  onCancel: () => void;
}

type ToolMode = 'pen' | 'eraser';
type StrokeWidth = 2 | 4 | 8;

export const DrawingPadModal: React.FC<DrawingPadModalProps> = ({
  onDone,
  onCancel,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isDrawing = useRef(false);
  const lastPoint = useRef<{ x: number; y: number } | null>(null);

  const [tool, setTool] = useState<ToolMode>('pen');
  const [lineWidth, setLineWidth] = useState<StrokeWidth>(4);
  const [color, setColor] = useState('#172554');
  const [hasDrawn, setHasDrawn] = useState(false);
  const [history, setHistory] = useState<ImageData[]>([]);
  const [validationError, setValidationError] = useState('');

  const CANVAS_WIDTH = 1000;
  const CANVAS_HEIGHT = 540;

  // Initialize canvas with white background
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    canvas.width = CANVAS_WIDTH;
    canvas.height = CANVAS_HEIGHT;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // Save initial blank state to history
    const initialData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    setHistory([initialData]);

    // Handle Escape key to cancel
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onCancel();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onCancel]);

  // Save current canvas state to history stack
  const saveSnapshot = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const data = ctx.getImageData(0, 0, canvas.width, canvas.height);
    setHistory((prev) => [...prev.slice(-15), data]); // Keep up to 15 undo steps
    setHasDrawn(true);
    setValidationError('');
  };

  // Coordinate normalizer for responsive canvas
  const getCoordinates = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    return {
      x: ((e.clientX - rect.left) * CANVAS_WIDTH) / rect.width,
      y: ((e.clientY - rect.top) * CANVAS_HEIGHT) / rect.height,
    };
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    // Left click or primary touch/pen
    if (e.button !== 0 && e.pointerType === 'mouse') return;

    isDrawing.current = true;
    e.currentTarget.setPointerCapture(e.pointerId);

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const p = getCoordinates(e);
    lastPoint.current = p;

    ctx.beginPath();
    ctx.strokeStyle = tool === 'eraser' ? '#ffffff' : color;
    ctx.lineWidth = tool === 'eraser' ? lineWidth * 4 : lineWidth;
    ctx.arc(p.x, p.y, (ctx.lineWidth as number) / 2, 0, Math.PI * 2);
    ctx.fillStyle = ctx.strokeStyle;
    ctx.fill();
    ctx.beginPath();
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawing.current || !lastPoint.current) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const currentPoint = getCoordinates(e);

    ctx.beginPath();
    ctx.strokeStyle = tool === 'eraser' ? '#ffffff' : color;
    ctx.lineWidth = tool === 'eraser' ? lineWidth * 4 : lineWidth;
    ctx.moveTo(lastPoint.current.x, lastPoint.current.y);
    ctx.lineTo(currentPoint.x, currentPoint.y);
    ctx.stroke();

    lastPoint.current = currentPoint;
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawing.current) return;
    isDrawing.current = false;
    lastPoint.current = null;
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      // Ignore if pointer capture was already lost
    }
    saveSnapshot();
  };

  const handleUndo = () => {
    if (history.length <= 1) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const newHistory = [...history];
    newHistory.pop(); // Remove current state
    const previousState = newHistory[newHistory.length - 1];

    if (previousState) {
      ctx.putImageData(previousState, 0, 0);
      setHistory(newHistory);
      if (newHistory.length <= 1) {
        setHasDrawn(false);
      }
    }
  };

  const handleClear = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    const blankData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    setHistory([blankData]);
    setHasDrawn(false);
    setValidationError('');
  };

  const handleComplete = () => {
    if (!hasDrawn) {
      setValidationError('Please draw or handwrite an answer before proceeding.');
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;

    canvas.toBlob((blob) => {
      if (blob) {
        onDone(blob);
      } else {
        setValidationError('Failed to render canvas image. Please try again.');
      }
    }, 'image/png');
  };

  return (
    <div
      className="draw-modal"
      role="dialog"
      aria-modal="true"
      aria-labelledby="drawing-dialog-title"
    >
      <div className="draw-dialog" role="document">
        {/* 1. Modal Header */}
        <div className="draw-dialog__header">
          <div className="draw-dialog__title-wrap">
            <span className="draw-dialog__icon" aria-hidden="true">
              <PenLine size={18} />
            </span>
            <div>
              <h2 id="drawing-dialog-title" className="draw-dialog__title">
                Handwriting &amp; Diagram Canvas
              </h2>
              <span className="draw-dialog__subtitle">
                Draw formulas, chemical structures, or handwritten solutions for OCR extraction.
              </span>
            </div>
          </div>
          <IconButton
            label="Close drawing pad"
            icon={<X size={18} />}
            onClick={onCancel}
          />
        </div>

        {/* 2. Educational Guidance Notice */}
        <div className="draw-dialog__notice" role="note">
          <Info size={15} aria-hidden="true" />
          <span>
            Text will be transcribed automatically using authenticated OCR. Complex diagram relationships may be submitted as diagram evidence.
          </span>
        </div>

        {/* 3. Drawing Toolbar */}
        <div className="draw-toolbar" role="toolbar" aria-label="Drawing tools">
          <div className="draw-toolbar__group">
            <button
              type="button"
              className={`draw-tool-btn ${tool === 'pen' ? 'draw-tool-btn--active' : ''}`}
              onClick={() => setTool('pen')}
              title="Pen tool"
              aria-label="Pen tool"
              aria-pressed={tool === 'pen'}
            >
              <PenLine size={16} />
              <span>Pen</span>
            </button>

            <button
              type="button"
              className={`draw-tool-btn ${tool === 'eraser' ? 'draw-tool-btn--active' : ''}`}
              onClick={() => setTool('eraser')}
              title="Eraser tool"
              aria-label="Eraser tool"
              aria-pressed={tool === 'eraser'}
            >
              <Eraser size={16} />
              <span>Eraser</span>
            </button>
          </div>

          <div className="draw-toolbar__sep" aria-hidden="true" />

          {/* Stroke Width Buttons */}
          <div className="draw-toolbar__group" role="radiogroup" aria-label="Stroke width">
            <button
              type="button"
              role="radio"
              aria-checked={lineWidth === 2}
              className={`draw-width-btn ${lineWidth === 2 ? 'draw-width-btn--active' : ''}`}
              onClick={() => setLineWidth(2)}
              title="Fine line (2px)"
              aria-label="Fine line (2px)"
            >
              <span className="draw-width-dot draw-width-dot--fine" />
              <span>Fine</span>
            </button>

            <button
              type="button"
              role="radio"
              aria-checked={lineWidth === 4}
              className={`draw-width-btn ${lineWidth === 4 ? 'draw-width-btn--active' : ''}`}
              onClick={() => setLineWidth(4)}
              title="Medium line (4px)"
              aria-label="Medium line (4px)"
            >
              <span className="draw-width-dot draw-width-dot--medium" />
              <span>Medium</span>
            </button>

            <button
              type="button"
              role="radio"
              aria-checked={lineWidth === 8}
              className={`draw-width-btn ${lineWidth === 8 ? 'draw-width-btn--active' : ''}`}
              onClick={() => setLineWidth(8)}
              title="Broad line (8px)"
              aria-label="Broad line (8px)"
            >
              <span className="draw-width-dot draw-width-dot--broad" />
              <span>Broad</span>
            </button>
          </div>

          <div className="draw-toolbar__sep" aria-hidden="true" />

          {/* Color Choices */}
          {tool === 'pen' && (
            <div className="draw-toolbar__group" role="radiogroup" aria-label="Ink color">
              <button
                type="button"
                role="radio"
                aria-checked={color === '#172554'}
                className={`draw-color-btn ${color === '#172554' ? 'draw-color-btn--active' : ''}`}
                style={{ backgroundColor: '#172554' }}
                onClick={() => setColor('#172554')}
                title="Navy Ink"
                aria-label="Navy Ink"
              />
              <button
                type="button"
                role="radio"
                aria-checked={color === '#4f46e5'}
                className={`draw-color-btn ${color === '#4f46e5' ? 'draw-color-btn--active' : ''}`}
                style={{ backgroundColor: '#4f46e5' }}
                onClick={() => setColor('#4f46e5')}
                title="Indigo Ink"
                aria-label="Indigo Ink"
              />
              <button
                type="button"
                role="radio"
                aria-checked={color === '#0f172a'}
                className={`draw-color-btn ${color === '#0f172a' ? 'draw-color-btn--active' : ''}`}
                style={{ backgroundColor: '#0f172a' }}
                onClick={() => setColor('#0f172a')}
                title="Graphite Ink"
                aria-label="Graphite Ink"
              />
            </div>
          )}

          <div className="draw-toolbar__actions">
            <button
              type="button"
              className="draw-tool-btn draw-tool-btn--secondary"
              onClick={handleUndo}
              disabled={history.length <= 1}
              title="Undo last stroke"
              aria-label="Undo last stroke"
            >
              <Undo2 size={15} />
              <span>Undo</span>
            </button>

            <button
              type="button"
              className="draw-tool-btn draw-tool-btn--secondary"
              onClick={handleClear}
              title="Clear canvas"
              aria-label="Clear canvas"
            >
              <RotateCcw size={15} />
              <span>Clear</span>
            </button>
          </div>
        </div>

        {/* 4. Canvas Drawing Area */}
        <div className="draw-canvas-container">
          <canvas
            ref={canvasRef}
            className="drawing-canvas"
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
            aria-label="Handwriting canvas. Use pointer, pen, or touch to sketch your solution."
          />
        </div>

        {/* Validation Error if Attempted Empty Submit */}
        {validationError && (
          <div className="draw-dialog__error" role="alert">
            <AlertCircle size={15} aria-hidden="true" />
            <span>{validationError}</span>
          </div>
        )}

        {/* 5. Footer Actions */}
        <div className="draw-dialog__footer">
          <div className="draw-dialog__status">
            {hasDrawn ? (
              <span className="draw-dialog__drawn-badge">
                <CheckCircle2 size={14} className="text-success" />
                <span>Drawing ready for transcription</span>
              </span>
            ) : (
              <span className="draw-dialog__empty-badge">Canvas is blank</span>
            )}
          </div>

          <div className="draw-dialog__actions">
            <Button variant="ghost" onClick={onCancel}>
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleComplete}
              rightIcon={<ArrowRight size={15} />}
            >
              Use drawing &amp; extract text
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
