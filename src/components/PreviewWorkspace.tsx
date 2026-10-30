import React, { useEffect, useRef, useState } from 'react';
import {
  Check,
  ChevronDown,
  ChevronUp,
  Columns,
  Copy,
  Crosshair,
  Eye,
  Grid,
  Image as ImageIcon,
  Maximize2,
  Move,
  RotateCcw,
  SlidersHorizontal,
  Sparkles,
  Upload,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import {
  AutoFitMode,
  StippleSettings,
  StudioMode,
  VectorDot,
  ViewComparisonMode,
  FilmstripItem,
  FilmstripViewState,
  VintagePopSettings,
} from '../types/stipple';
import { renderDotsToCanvas } from '../engine/SVGRenderer';
import { VintagePopResult } from '../engine/VintagePopEngine';
import { FilmstripBar } from './FilmstripBar';

interface PreviewWorkspaceProps {
  hasImage: boolean;
  sourceDataUrl: string | null;
  dots: VectorDot[];
  palette: string[];
  settings: StippleSettings;
  viewMode: ViewComparisonMode;
  onSetViewMode: (mode: ViewComparisonMode) => void;
  onUploadFile: (file: File) => void;
  onUploadBulkFiles?: (files: FileList | File[]) => void;
  isGenerating: boolean;
  totalDots: number;
  filmstripItems: FilmstripItem[];
  activeFilmstripId: string | null;
  onSelectFilmstripItem: (item: FilmstripItem) => void;
  onRemoveFilmstripItem: (id: string) => void;
  onRemoveMultipleItems?: (ids: string[]) => void;
  onAddFilmstripFiles: (files: File[]) => void;
  onClearFilmstrip: () => void;
  filmstripViewState: FilmstripViewState;
  onSetFilmstripViewState: (state: FilmstripViewState) => void;
  onApplyToAll?: (targetIds?: string[]) => void;
  isSyncAllEnabled?: boolean;
  onToggleSyncAll?: () => void;
  onAutoBalanceAll?: (targetIds?: string[]) => void;
  studioMode?: StudioMode;
  vintagePopOutput?: VintagePopResult | null;
  vintagePopSettings?: VintagePopSettings;
  onUpdateSetting?: <K extends keyof StippleSettings>(
    key: K,
    value: StippleSettings[K]
  ) => void;
  onUpdateVintagePopSetting?: <K extends keyof VintagePopSettings>(
    key: K,
    value: VintagePopSettings[K]
  ) => void;
  onToggleTransparentMode?: () => void;
  isTransparentMode?: boolean;
  isMoveToolActive?: boolean;
  onToggleMoveTool?: () => void;
}

export const PreviewWorkspace: React.FC<PreviewWorkspaceProps> = ({
  hasImage,
  sourceDataUrl,
  dots,
  palette,
  settings,
  viewMode,
  onSetViewMode,
  onUploadFile,
  onUploadBulkFiles,
  isGenerating,
  totalDots,
  filmstripItems,
  activeFilmstripId,
  onSelectFilmstripItem,
  onRemoveFilmstripItem,
  onRemoveMultipleItems,
  onAddFilmstripFiles,
  onClearFilmstrip,
  filmstripViewState,
  onSetFilmstripViewState,
  onApplyToAll,
  isSyncAllEnabled,
  onToggleSyncAll,
  onAutoBalanceAll,
  studioMode = 'stipple',
  vintagePopOutput,
  vintagePopSettings,
  onUpdateSetting,
  onUpdateVintagePopSetting,
  onToggleTransparentMode,
  isTransparentMode = false,
  isMoveToolActive = false,
  onToggleMoveTool,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const artboardRef = useRef<HTMLDivElement>(null);
  const singleCanvasRef = useRef<HTMLCanvasElement>(null);
  const sideCanvasRef = useRef<HTMLCanvasElement>(null);
  const canvasFileInputRef = useRef<HTMLInputElement>(null);
  const [zoom, setZoom] = useState<number>(0.72);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState<boolean>(false);
  const [panStart, setPanStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [splitPercent, setSplitPercent] = useState<number>(50);
  const [isDraggingSplit, setIsDraggingSplit] = useState<boolean>(false);
  const [isDropHover, setIsDropHover] = useState<boolean>(false);

  // Subject Position & Size drag state
  const [isDraggingSubject, setIsDraggingSubject] = useState<boolean>(false);
  const [subjectDragStart, setSubjectDragStart] = useState<{
    clientX: number;
    clientY: number;
    initX: number;
    initY: number;
  }>({ clientX: 0, clientY: 0, initX: 0, initY: 0 });

  useEffect(() => {
    if (!hasImage) return;

    if (studioMode === 'vintage-pop' && vintagePopOutput?.canvas) {
      const renderVPToCanvas = (targetCanvas: HTMLCanvasElement) => {
        const ctx = targetCanvas.getContext('2d');
        if (!ctx) return;
        ctx.clearRect(0, 0, targetCanvas.width, targetCanvas.height);

        // If vintagePopOutput.canvas is already the full locked artboard canvas (e.g. 4000x4000), draw 1:1 directly
        if (
          vintagePopOutput.canvas.width === targetCanvas.width &&
          vintagePopOutput.canvas.height === targetCanvas.height
        ) {
          ctx.drawImage(vintagePopOutput.canvas, 0, 0);
          return;
        }

        // Fallback if dimensions differ - draw directly to fit targetCanvas without double offsetting
        ctx.drawImage(
          vintagePopOutput.canvas,
          0,
          0,
          vintagePopOutput.canvas.width,
          vintagePopOutput.canvas.height,
          0,
          0,
          targetCanvas.width,
          targetCanvas.height
        );
      };

      if (viewMode === 'side-by-side' && sideCanvasRef.current) {
        renderVPToCanvas(sideCanvasRef.current);
      } else if (viewMode !== 'original' && singleCanvasRef.current) {
        renderVPToCanvas(singleCanvasRef.current);
      }
    } else {
      if (viewMode === 'side-by-side' && sideCanvasRef.current) {
        renderDotsToCanvas(sideCanvasRef.current, dots, settings, palette);
      } else if (viewMode !== 'original' && singleCanvasRef.current) {
        renderDotsToCanvas(singleCanvasRef.current, dots, settings, palette);
      }
    }
  }, [hasImage, viewMode, dots, settings, palette, studioMode, vintagePopOutput, vintagePopSettings]);

  const updateSplitFromClientX = (clientX: number) => {
    const targetEl = artboardRef.current || containerRef.current;
    if (!targetEl) return;
    const rect = targetEl.getBoundingClientRect();
    const relX = ((clientX - rect.left) / Math.max(1, rect.width)) * 100;
    setSplitPercent(Math.max(0, Math.min(100, relX)));
  };

  useEffect(() => {
    if (!isDraggingSplit) return;

    const onWindowMouseMove = (e: MouseEvent) => {
      updateSplitFromClientX(e.clientX);
    };
    const onWindowTouchMove = (e: TouchEvent) => {
      if (e.touches.length > 0) {
        updateSplitFromClientX(e.touches[0].clientX);
      }
    };
    const onWindowEnd = () => {
      setIsDraggingSplit(false);
    };

    window.addEventListener('mousemove', onWindowMouseMove);
    window.addEventListener('mouseup', onWindowEnd);
    window.addEventListener('touchmove', onWindowTouchMove);
    window.addEventListener('touchend', onWindowEnd);

    return () => {
      window.removeEventListener('mousemove', onWindowMouseMove);
      window.removeEventListener('mouseup', onWindowEnd);
      window.removeEventListener('touchmove', onWindowTouchMove);
      window.removeEventListener('touchend', onWindowEnd);
    };
  }, [isDraggingSplit]);

  const artboardW =
    studioMode === 'vintage-pop'
      ? 4000
      : Math.max(200, Math.round(settings.outputWidth || 4000));
  const artboardH =
    studioMode === 'vintage-pop'
      ? 4000
      : Math.max(200, Math.round(settings.outputHeight || 4000));

  const currentScale =
    studioMode === 'vintage-pop'
      ? (vintagePopSettings?.scale ?? 100)
      : settings.scale;

  const currentOffsetX =
    studioMode === 'vintage-pop'
      ? (vintagePopSettings?.offsetX ?? 0)
      : settings.offsetX;

  const currentOffsetY =
    studioMode === 'vintage-pop'
      ? (vintagePopSettings?.offsetY ?? 0)
      : settings.offsetY;

  const currentAutoFitMode: AutoFitMode =
    studioMode === 'vintage-pop'
      ? (vintagePopSettings?.autoFitMode ?? 'long-edge')
      : (settings.autoFitMode ?? 'long-edge');

  const handleUpdateScale = (val: number) => {
    onUpdateSetting?.('scale', val);
    if (studioMode === 'vintage-pop') {
      onUpdateVintagePopSetting?.('scale', val);
    }
  };

  const handleCenterSubject = () => {
    onUpdateSetting?.('offsetX', 0);
    onUpdateSetting?.('offsetY', 0);
    if (studioMode === 'vintage-pop') {
      onUpdateVintagePopSetting?.('offsetX', 0);
      onUpdateVintagePopSetting?.('offsetY', 0);
    }
  };

  const handleFitSubject = () => {
    handleSelectAutoFitMode('long-edge');
    handleUpdateScale(100);
    handleCenterSubject();
  };

  const handleSelectAutoFitMode = (mode: AutoFitMode) => {
    onUpdateSetting?.('autoFitMode', mode);
    if (studioMode === 'vintage-pop') {
      onUpdateVintagePopSetting?.('autoFitMode', mode);
    }
    handleUpdateScale(100);
    handleCenterSubject();
  };

  const fitToView = () => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const pad = 72;
    const availW = Math.max(120, rect.width - pad);
    const availH = Math.max(120, rect.height - pad);
    const scaleX = availW / Math.max(100, artboardW);
    const scaleY = availH / Math.max(100, artboardH);
    const nextZoom = Math.max(0.02, Math.min(10.0, Math.min(scaleX, scaleY)));
    setZoom(Number(nextZoom.toFixed(2)));
    setPan({ x: 0, y: 0 });
  };

  useEffect(() => {
    fitToView();
  }, [artboardW, artboardH, hasImage, filmstripViewState, studioMode]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(() => {
      fitToView();
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [artboardW, artboardH, hasImage, studioMode]);

  const handleWheel = (e: React.WheelEvent) => {
    if (!hasImage) return;
    e.preventDefault();
    const factor = e.deltaY < 0 ? 1.15 : 0.85;
    setZoom((prev) =>
      Number(Math.max(0.02, Math.min(10.0, prev * factor)).toFixed(3))
    );
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!hasImage || isDraggingSplit) return;
    if (e.button !== 0) return;

    if (isMoveToolActive) {
      setIsDraggingSubject(true);
      setSubjectDragStart({
        clientX: e.clientX,
        clientY: e.clientY,
        initX: currentOffsetX,
        initY: currentOffsetY,
      });
      return;
    }

    setIsPanning(true);
    setPanStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDraggingSplit) {
      updateSplitFromClientX(e.clientX);
      return;
    }

    if (isDraggingSubject) {
      const dx = (e.clientX - subjectDragStart.clientX) / Math.max(0.01, zoom);
      const dy = (e.clientY - subjectDragStart.clientY) / Math.max(0.01, zoom);
      const nextX = Math.round(subjectDragStart.initX + dx);
      const nextY = Math.round(subjectDragStart.initY + dy);
      onUpdateSetting?.('offsetX', nextX);
      onUpdateSetting?.('offsetY', nextY);
      if (studioMode === 'vintage-pop') {
        onUpdateVintagePopSetting?.('offsetX', nextX);
        onUpdateVintagePopSetting?.('offsetY', nextY);
      }
      return;
    }

    if (!isPanning) return;
    setPan({
      x: e.clientX - panStart.x,
      y: e.clientY - panStart.y,
    });
  };

  const handleMouseUp = () => {
    setIsPanning(false);
    setIsDraggingSubject(false);
    setIsDraggingSplit(false);
  };

  const handleCanvasFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = e.target.files ? Array.from(e.target.files) : [];
    e.target.value = '';
    if (selectedFiles.length === 0) return;

    if (selectedFiles.length > 1) {
      if (!hasImage) {
        onUploadFile(selectedFiles[0]);
      }
      onAddFilmstripFiles(selectedFiles);
      if (onUploadBulkFiles) {
        onUploadBulkFiles(selectedFiles);
      }
    } else if (selectedFiles[0]) {
      onUploadFile(selectedFiles[0]);
      onAddFilmstripFiles([selectedFiles[0]]);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDropHover(false);
    const droppedFiles = e.dataTransfer.files ? Array.from(e.dataTransfer.files) : [];
    if (droppedFiles.length === 0) return;
    if (droppedFiles.length > 1) {
      if (!hasImage) {
        onUploadFile(droppedFiles[0]);
      }
      onAddFilmstripFiles(droppedFiles);
      if (onUploadBulkFiles) {
        onUploadBulkFiles(droppedFiles);
      }
    } else if (droppedFiles[0]) {
      onUploadFile(droppedFiles[0]);
      onAddFilmstripFiles([droppedFiles[0]]);
    }
  };

  return (
    <main className="flex-1 flex flex-col bg-white h-full min-w-0 relative overflow-hidden select-none text-slate-900">
      <input
        ref={canvasFileInputRef}
        type="file"
        multiple
        accept="image/jpeg,image/jpg,image/png,image/webp,image/*"
        onChange={handleCanvasFileSelect}
        className="hidden"
      />
      {/* Top Canvas Toolbar: View Comparison & Zoom Controls */}
      <div className="h-11 px-3 border-b border-slate-200 bg-slate-50 flex items-center justify-between gap-2 z-10 shrink-0 min-w-0">
        {/* Left: Comparison Mode Switcher */}
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-md border border-slate-300 min-w-0 overflow-x-auto scrollbar-none shrink">
          <button
            type="button"
            onClick={() => onSetViewMode('vector')}
            className={`px-2 py-1 text-xs font-semibold rounded flex items-center gap-1 transition-colors whitespace-nowrap shrink-0 ${
              viewMode === 'vector'
                ? 'bg-[#D97706] text-white shadow-sm'
                : 'text-slate-900 hover:bg-slate-200'
            }`}
          >
            <Eye className="w-3.5 h-3.5" />
            <span>{studioMode === 'vintage-pop' ? 'Vintage Pop' : 'Vector'}</span>
          </button>

          <button
            type="button"
            onClick={() => onSetViewMode('original')}
            className={`px-2 py-1 text-xs font-semibold rounded flex items-center gap-1 transition-colors whitespace-nowrap shrink-0 ${
              viewMode === 'original'
                ? 'bg-[#D97706] text-white shadow-sm'
                : 'text-slate-900 hover:bg-slate-200'
            }`}
          >
            <ImageIcon className="w-3.5 h-3.5" />
            <span>Original</span>
          </button>

          <button
            type="button"
            onClick={() => onSetViewMode('split')}
            className={`px-2 py-1 text-xs font-semibold rounded flex items-center gap-1 transition-colors whitespace-nowrap shrink-0 ${
              viewMode === 'split'
                ? 'bg-[#D97706] text-white shadow-sm'
                : 'text-slate-900 hover:bg-slate-200'
            }`}
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>Split</span>
          </button>

          <button
            type="button"
            onClick={() => onSetViewMode('side-by-side')}
            className={`px-2 py-1 text-xs font-semibold rounded flex items-center gap-1 transition-colors whitespace-nowrap shrink-0 ${
              viewMode === 'side-by-side'
                ? 'bg-[#D97706] text-white shadow-sm'
                : 'text-slate-900 hover:bg-slate-200'
            }`}
          >
            <Columns className="w-3.5 h-3.5" />
            <span>Side-by-Side</span>
          </button>
        </div>

        {/* Right: Apply to All Quick Action, Transparent Toggle & Zoom Controls */}
        <div className="flex items-center gap-1.5 shrink-0">
          {filmstripItems.length > 1 && onApplyToAll && (
            <button
              type="button"
              onClick={() => onApplyToAll?.()}
              title="বর্তমান ছবির ইফেক্ট সেটিংস সব ছবিতে প্রযোজ্য করুন (Apply current settings to all images)"
              className="hidden 2xl:flex items-center gap-1 px-2 py-1 text-xs font-bold rounded bg-[#D97706] hover:bg-[#B45309] text-white shadow-xs transition-all active:scale-95 cursor-pointer shrink-0"
            >
              <Copy className="w-3.5 h-3.5" />
              <span>Apply All ({filmstripItems.length})</span>
            </button>
          )}

          {/* Center: Transparent Mode */}
          {onToggleTransparentMode && (
            <button
              type="button"
              onClick={onToggleTransparentMode}
              title="Toggle Transparent Background (স্বচ্ছ ব্যাকগ্রাউন্ড চালু/বন্ধ)"
              className={`px-2 py-1 text-xs font-bold rounded flex items-center gap-1 transition-colors cursor-pointer border shrink-0 ${
                isTransparentMode
                  ? 'bg-emerald-600 border-emerald-700 text-white shadow-xs'
                  : 'bg-white border-slate-300 text-slate-800 hover:bg-slate-100'
              }`}
            >
              <Grid className="w-3.5 h-3.5" />
              <span>Alpha: {isTransparentMode ? 'ON' : 'OFF'}</span>
            </button>
          )}

          {/* Zoom Controls (Guaranteed 100% visible with shrink-0) */}
          <div className="flex items-center gap-1 bg-white p-0.5 rounded-md border border-slate-300 shadow-2xs shrink-0">
            <button
              type="button"
              onClick={() =>
                setZoom((z) => {
                  const step = z <= 0.05 ? 0.01 : z <= 0.2 ? 0.02 : z <= 1.0 ? 0.1 : 0.5;
                  return Number(Math.max(0.02, z - step).toFixed(2));
                })
              }
              title="Zoom Out (min 2%)"
              className="p-1 rounded hover:bg-slate-100 text-slate-800 transition-colors cursor-pointer flex items-center justify-center shrink-0"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>

            <span className="font-mono text-xs font-bold tabular-nums text-slate-900 w-11 text-center select-none shrink-0">
              {Math.round(zoom * 100)}%
            </span>

            <button
              type="button"
              onClick={() =>
                setZoom((z) => {
                  const step = z < 0.1 ? 0.02 : z < 0.5 ? 0.05 : z < 2.0 ? 0.2 : 0.5;
                  return Number(Math.min(10.0, z + step).toFixed(2));
                })
              }
              title="Zoom In (max 1000%)"
              className="p-1 rounded hover:bg-slate-100 text-slate-800 transition-colors cursor-pointer flex items-center justify-center shrink-0"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>

            <button
              type="button"
              onClick={() => {
                setZoom(1.0);
                setPan({ x: 0, y: 0 });
              }}
              title="Reset Zoom to 100%"
              className="px-1.5 py-0.5 text-xs font-mono font-semibold bg-slate-50 hover:bg-slate-100 text-slate-800 border border-slate-200 rounded transition-colors whitespace-nowrap shrink-0"
            >
              100%
            </button>

            <button
              type="button"
              onClick={fitToView}
              title="Fit to Screen"
              className="px-2 py-0.5 text-xs font-semibold bg-slate-50 hover:bg-slate-100 text-slate-800 border border-slate-200 rounded flex items-center gap-1 transition-colors whitespace-nowrap shrink-0"
            >
              <Maximize2 className="w-3 h-3" />
              <span>Fit</span>
            </button>
          </div>
        </div>
      </div>

      {/* Interactive Canvas Stage */}
      <div
        ref={containerRef}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onDragOver={(e) => {
          e.preventDefault();
          setIsDropHover(true);
        }}
        onDragLeave={() => setIsDropHover(false)}
        onDrop={handleDrop}
        className={`flex-1 relative overflow-hidden flex items-center justify-center bg-checkerboard ${
          hasImage
            ? isMoveToolActive
              ? isDraggingSubject
                ? 'cursor-grabbing'
                : 'cursor-move'
              : isPanning
              ? 'cursor-grabbing'
              : 'cursor-grab'
            : ''
        }`}
      >
        {!hasImage ? (
          /* Empty State Upload & Reference Loader */
          <div className="max-w-lg w-full mx-6 p-8 rounded-xl bg-white border border-slate-300 text-center shadow-xl">
            <div className="w-12 h-12 rounded-lg bg-amber-50 border border-amber-300 flex items-center justify-center mx-auto mb-4">
              <Upload className="w-6 h-6 text-[#D97706]" />
            </div>
            <h2 className="text-lg font-bold text-slate-900 tracking-tight">
              Upload Source Image for Vector Stipple Analysis
            </h2>
            <p className="text-xs font-medium text-slate-800 mt-1.5 leading-relaxed">
              Drag and drop any JPG, JPEG, PNG, or WEBP image onto the canvas, or browse your computer. All luminance, edge, and SVG vector calculations run 100% locally in your browser.
            </p>

            <div className="mt-5 flex flex-wrap items-center justify-center gap-2.5">
              <button
                type="button"
                onClick={() => canvasFileInputRef.current?.click()}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[#D97706] hover:bg-[#B45309] text-white font-bold text-xs cursor-pointer transition-colors shadow"
              >
                <Upload className="w-4 h-4" />
                <span>Select 1 or Multiple Images (JPG / PNG / WEBP)</span>
              </button>
            </div>
          </div>
        ) : viewMode === 'side-by-side' ? (
          /* Side-by-Side Comparison View */
          <div
            style={{
              transform: `translate3d(${pan.x}px, ${pan.y}px, 0) scale(${zoom})`,
              transformOrigin: 'center center',
            }}
            className="flex items-center gap-8 transition-transform duration-75 shrink-0"
          >
            {/* Left Card: Original */}
            <div className="flex flex-col items-center shrink-0">
              <div className="mb-2 text-xs font-mono font-bold text-slate-900">
                ORIGINAL RASTER SOURCE
              </div>
              <div
                style={{
                  width: artboardW,
                  height: artboardH,
                }}
                className="bg-white shadow-xl border border-slate-300 overflow-hidden flex items-center justify-center shrink-0"
              >
                {sourceDataUrl && (
                  <img
                    src={sourceDataUrl}
                    alt="Original uploaded source"
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-contain pointer-events-none"
                  />
                )}
              </div>
            </div>

            {/* Right Card: True SVG Vector / Pop Art Result */}
            <div className="flex flex-col items-center shrink-0">
              <div className="mb-2 text-xs font-mono font-bold text-[#B45309]">
                {studioMode === 'vintage-pop'
                  ? 'VINTAGE POP ART STICKER'
                  : `GENERATED SVG VECTOR (${totalDots.toLocaleString()} DOTS)`}
              </div>
              <div
                style={{
                  width: artboardW,
                  height: artboardH,
                }}
                className="shadow-xl border border-slate-300 overflow-hidden shrink-0"
              >
                <canvas
                  ref={sideCanvasRef}
                  width={artboardW}
                  height={artboardH}
                  className="w-full h-full block pointer-events-none"
                />
              </div>
            </div>
          </div>
        ) : (
          /* Single Artboard: Vector, Original, or Interactive Split Wipe */
          <div
            ref={artboardRef}
            style={{
              width: artboardW,
              height: artboardH,
              transform: `translate3d(${pan.x}px, ${pan.y}px, 0) scale(${zoom})`,
              transformOrigin: 'center center',
            }}
            className="relative shadow-xl border border-slate-300 transition-transform duration-75 shrink-0"
          >
            {/* Vector Layer */}
            {viewMode !== 'original' && (
              <canvas
                ref={singleCanvasRef}
                width={artboardW}
                height={artboardH}
                className="w-full h-full block pointer-events-none"
              />
            )}

            {/* Original Layer (Full or Clipped for Split Mode) */}
            {(viewMode === 'original' || viewMode === 'split') && sourceDataUrl && (
              <div
                style={
                  viewMode === 'split'
                    ? { clipPath: `inset(0 ${100 - splitPercent}% 0 0)` }
                    : undefined
                }
                className="absolute inset-0 bg-white flex items-center justify-center"
              >
                <img
                  src={sourceDataUrl}
                  alt="Original Source"
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-contain pointer-events-none"
                />
              </div>
            )}

            {/* Interactive Split Curtain Handle */}
            {viewMode === 'split' && (
              <div
                style={{ left: `${splitPercent}%` }}
                onMouseDown={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                  setIsDraggingSplit(true);
                }}
                onTouchStart={(e) => {
                  e.stopPropagation();
                  setIsDraggingSplit(true);
                }}
                className="absolute top-0 bottom-0 w-8 -translate-x-1/2 cursor-ew-resize z-20 flex items-center justify-center group"
              >
                <div className="w-1 h-full bg-[#D97706] pointer-events-none" />
                <div className="absolute w-7 h-7 rounded-full bg-[#D97706] text-white shadow-lg flex items-center justify-center font-bold text-xs pointer-events-none">
                  ↔
                </div>
              </div>
            )}
          </div>
        )}

        {/* Drag-over File Overlay */}
        {isDropHover && (
          <div className="absolute inset-4 rounded-xl border-2 border-dashed border-[#D97706] bg-white/95 flex flex-col items-center justify-center z-30 pointer-events-none">
            <Upload className="w-10 h-10 text-[#D97706] mb-2" />
            <span className="text-sm font-bold text-slate-900">
              Drop Image to Generate Vector Stipple Artwork
            </span>
          </div>
        )}

        {/* Subtle Generation Indicator */}
        {isGenerating && (
          <div className="absolute top-3 right-3 px-3 py-1.5 rounded bg-white border border-slate-300 text-xs font-mono font-semibold text-slate-900 flex items-center gap-2 shadow-lg">
            <span className="w-2 h-2 rounded-full bg-[#D97706] animate-ping" />
            <span>Computing Vector Geometry...</span>
          </div>
        )}

        {/* Floating Canvas Zoom Controls Badge in bottom-right corner of stage */}
        <div className="absolute bottom-3 right-3 z-20 flex items-center gap-1 bg-white/95 backdrop-blur-xs border border-slate-300 rounded-lg shadow-md px-1.5 py-1 select-none">
          <button
            type="button"
            onClick={() =>
              setZoom((z) => {
                const step = z <= 0.05 ? 0.01 : z <= 0.2 ? 0.02 : z <= 1.0 ? 0.1 : 0.5;
                return Number(Math.max(0.02, z - step).toFixed(2));
              })
            }
            title="Zoom Out"
            className="p-1 rounded hover:bg-slate-100 text-slate-800 transition-colors cursor-pointer flex items-center justify-center"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <span className="font-mono text-xs font-bold tabular-nums text-slate-800 w-11 text-center">
            {Math.round(zoom * 100)}%
          </span>
          <button
            type="button"
            onClick={() =>
              setZoom((z) => {
                const step = z < 0.1 ? 0.02 : z < 0.5 ? 0.05 : z < 2.0 ? 0.2 : 0.5;
                return Number(Math.min(10.0, z + step).toFixed(2));
              })
            }
            title="Zoom In"
            className="p-1 rounded hover:bg-slate-100 text-slate-800 transition-colors cursor-pointer flex items-center justify-center"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={fitToView}
            title="Fit to Screen"
            className="ml-0.5 px-1.5 py-0.5 text-[11px] font-semibold bg-slate-100 hover:bg-slate-200 text-slate-800 rounded transition-colors"
          >
            Fit
          </button>
        </div>
      </div>

      {/* Filmstrip / Movie View Frames Bar at Bottom */}
      <FilmstripBar
        items={filmstripItems}
        activeId={activeFilmstripId}
        onSelectItem={onSelectFilmstripItem}
        onRemoveItem={onRemoveFilmstripItem}
        onRemoveMultipleItems={onRemoveMultipleItems}
        onAddFiles={onAddFilmstripFiles}
        onClearAll={onClearFilmstrip}
        viewState={filmstripViewState}
        onSetViewState={onSetFilmstripViewState}
        onApplyToAll={onApplyToAll}
        isSyncAllEnabled={isSyncAllEnabled}
        onToggleSyncAll={onToggleSyncAll}
        onAutoBalanceAll={onAutoBalanceAll}
      />
    </main>
  );
};
