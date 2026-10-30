import React, { useEffect, useRef, useState } from 'react';
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  ChevronsUpDown,
  Copy,
  Film,
  Plus,
  Trash2,
  Upload,
  X,
  CheckCircle2,
  Link as LinkIcon,
  Unlink,
  Sparkles,
  Check,
  CheckSquare,
  Square,
} from 'lucide-react';
import { FilmstripItem, FilmstripViewState } from '../types/stipple';

const FILMSTRIP_HEIGHT_STORAGE_KEY = 'vector_stipple_filmstrip_custom_height';
const DEFAULT_FILMSTRIP_HEIGHT = 135;
const MIN_FILMSTRIP_HEIGHT = 85;
const MAX_FILMSTRIP_HEIGHT = 460;

interface FilmstripBarProps {
  items: FilmstripItem[];
  activeId: string | null;
  onSelectItem: (item: FilmstripItem) => void;
  onRemoveItem: (id: string) => void;
  onRemoveMultipleItems?: (ids: string[]) => void;
  onAddFiles: (files: File[]) => void;
  onClearAll: () => void;
  viewState: FilmstripViewState;
  onSetViewState: (state: FilmstripViewState) => void;
  onApplyToAll?: (targetIds?: string[]) => void;
  isSyncAllEnabled?: boolean;
  onToggleSyncAll?: () => void;
  onAutoBalanceAll?: (targetIds?: string[]) => void;
}

export const FilmstripBar: React.FC<FilmstripBarProps> = ({
  items,
  activeId,
  onSelectItem,
  onRemoveItem,
  onRemoveMultipleItems,
  onAddFiles,
  onClearAll,
  viewState,
  onSetViewState,
  onApplyToAll,
  isSyncAllEnabled = false,
  onToggleSyncAll,
  onAutoBalanceAll,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Custom Resizable Height State (persisted in localStorage)
  const [customHeight, setCustomHeight] = useState<number>(() => {
    try {
      const saved = localStorage.getItem(FILMSTRIP_HEIGHT_STORAGE_KEY);
      if (saved) {
        const val = parseInt(saved, 10);
        if (!isNaN(val) && val >= MIN_FILMSTRIP_HEIGHT && val <= MAX_FILMSTRIP_HEIGHT) {
          return val;
        }
      }
    } catch {
      // ignore localStorage errors
    }
    return DEFAULT_FILMSTRIP_HEIGHT;
  });

  const isResizingRef = useRef<boolean>(false);
  const startYRef = useRef<number>(0);
  const startHeightRef = useRef<number>(customHeight);
  const [isResizing, setIsResizing] = useState<boolean>(false);

  // Mouse Drag-to-Scroll State & Refs (horizontal scrolling on image strip)
  const isMouseDownRef = useRef<boolean>(false);
  const startXRef = useRef<number>(0);
  const scrollLeftRef = useRef<number>(0);
  const hasDraggedRef = useRef<boolean>(false);
  const [isDragging, setIsDragging] = useState<boolean>(false);

  // Multi-Selection State (Checkbox per image + Select/Uncheck All)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Clean up selectedIds if any items were removed
  useEffect(() => {
    setSelectedIds((prev) => {
      const validItemIds = new Set(items.map((i) => i.id));
      const next = new Set<string>();
      for (const id of prev) {
        if (validItemIds.has(id)) {
          next.add(id);
        }
      }
      return next.size === prev.size ? prev : next;
    });
  }, [items]);

  const toggleItemSelection = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const isAllSelected = items.length > 0 && selectedIds.size === items.length;

  const handleToggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(items.map((it) => it.id)));
    }
  };

  const handleApplyAction = () => {
    if (!onApplyToAll) return;
    if (selectedIds.size > 0) {
      onApplyToAll(Array.from(selectedIds));
    } else {
      onApplyToAll();
    }
  };

  const handleAutoBalanceAction = () => {
    if (!onAutoBalanceAll) return;
    if (selectedIds.size > 0) {
      onAutoBalanceAll(Array.from(selectedIds));
    } else {
      onAutoBalanceAll();
    }
  };

  const handleDeleteSelectedAction = () => {
    if (selectedIds.size === 0) return;
    if (onRemoveMultipleItems) {
      onRemoveMultipleItems(Array.from(selectedIds));
      setSelectedIds(new Set());
    }
  };

  // Vertical Resize Handler (Dragging Up = Bigger, Dragging Down = Smaller)
  const handleResizeStart = (clientY: number) => {
    isResizingRef.current = true;
    startYRef.current = clientY;
    startHeightRef.current = customHeight;
    setIsResizing(true);
    document.body.style.cursor = 'ns-resize';
    document.body.style.userSelect = 'none';
  };

  const handleResizeMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();
    handleResizeStart(e.clientY);
  };

  const handleResizeTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length > 0) {
      handleResizeStart(e.touches[0].clientY);
    }
  };

  useEffect(() => {
    const handleWindowMouseMove = (e: MouseEvent) => {
      // 1. Vertical Resize Dragging
      if (isResizingRef.current) {
        // Dragging UP (smaller clientY) makes height bigger (positive delta)
        const deltaY = startYRef.current - e.clientY;
        const newHeight = Math.min(
          MAX_FILMSTRIP_HEIGHT,
          Math.max(MIN_FILMSTRIP_HEIGHT, startHeightRef.current + deltaY)
        );
        setCustomHeight(newHeight);
        try {
          localStorage.setItem(FILMSTRIP_HEIGHT_STORAGE_KEY, String(newHeight));
        } catch {
          // ignore
        }
        return;
      }

      // 2. Horizontal Image Strip Drag-to-Scroll
      if (isMouseDownRef.current && scrollContainerRef.current) {
        const dx = e.pageX - startXRef.current;
        if (Math.abs(dx) > 3) {
          hasDraggedRef.current = true;
          setIsDragging(true);
        }
        scrollContainerRef.current.scrollLeft = scrollLeftRef.current - dx;
      }
    };

    const handleWindowTouchMove = (e: TouchEvent) => {
      if (isResizingRef.current && e.touches.length > 0) {
        const deltaY = startYRef.current - e.touches[0].clientY;
        const newHeight = Math.min(
          MAX_FILMSTRIP_HEIGHT,
          Math.max(MIN_FILMSTRIP_HEIGHT, startHeightRef.current + deltaY)
        );
        setCustomHeight(newHeight);
        try {
          localStorage.setItem(FILMSTRIP_HEIGHT_STORAGE_KEY, String(newHeight));
        } catch {
          // ignore
        }
      }
    };

    const handleWindowMouseUp = () => {
      if (isResizingRef.current) {
        isResizingRef.current = false;
        setIsResizing(false);
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
      }
      if (isMouseDownRef.current) {
        isMouseDownRef.current = false;
        setIsDragging(false);
        setTimeout(() => {
          hasDraggedRef.current = false;
        }, 60);
      }
    };

    window.addEventListener('mousemove', handleWindowMouseMove);
    window.addEventListener('mouseup', handleWindowMouseUp);
    window.addEventListener('touchmove', handleWindowTouchMove, { passive: true });
    window.addEventListener('touchend', handleWindowMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleWindowMouseMove);
      window.removeEventListener('mouseup', handleWindowMouseUp);
      window.removeEventListener('touchmove', handleWindowTouchMove);
      window.removeEventListener('touchend', handleWindowMouseUp);
    };
  }, []);

  const handleContainerMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0 || !scrollContainerRef.current) return;
    isMouseDownRef.current = true;
    hasDraggedRef.current = false;
    startXRef.current = e.pageX;
    scrollLeftRef.current = scrollContainerRef.current.scrollLeft;
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files ? Array.from(e.target.files) : [];
    e.target.value = '';
    if (selected.length > 0) {
      onAddFiles(selected);
    }
  };

  const handleOpenPicker = () => {
    fileInputRef.current?.click();
  };

  const handleWheel = (e: React.WheelEvent) => {
    if (scrollContainerRef.current) {
      if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
        scrollContainerRef.current.scrollLeft += e.deltaY;
      }
    }
  };

  const handleScrollLeft = () => {
    scrollContainerRef.current?.scrollBy({ left: -260, behavior: 'smooth' });
  };

  const handleScrollRight = () => {
    scrollContainerRef.current?.scrollBy({ left: 260, behavior: 'smooth' });
  };

  const activeIndex = items.findIndex((it) => it.id === activeId);
  const activeItem = activeIndex !== -1 ? items[activeIndex] : null;

  // Render Classic Film Sprockets (Perforations)
  const renderSprockets = () => (
    <div className="flex justify-between items-center px-2 py-0.5 opacity-35 overflow-hidden pointer-events-none select-none shrink-0 bg-slate-200">
      {Array.from({ length: 45 }).map((_, i) => (
        <div
          key={i}
          className="w-2.5 h-1 bg-slate-600 rounded-[1px] shrink-0 mx-1"
        />
      ))}
    </div>
  );

  // HIDDEN / MINIMIZED STATE: Ultra-compact bar with "Show" button
  if (viewState === 'minimized') {
    return (
      <div className="h-8 bg-slate-100 border-t border-slate-300 px-3 flex items-center justify-between text-slate-800 text-xs shrink-0 select-none z-10 shadow-xs">
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/jpeg,image/jpg,image/png,image/webp,image/*"
          onChange={handleFileInputChange}
          className="hidden"
        />
        <div
          onClick={() => onSetViewState('normal')}
          className="flex items-center gap-2 cursor-pointer hover:text-slate-900 transition-colors flex-1 min-w-0"
          title="Click Show to view images (দেখুন)"
        >
          <Film className="w-3.5 h-3.5 text-[#D97706] shrink-0" />
          <span className="px-1.5 py-0.2 bg-amber-100 text-[#B45309] font-mono font-bold text-[10px] rounded border border-amber-300 shrink-0">
            {items.length} {items.length === 1 ? 'image' : 'images'}
          </span>
          {activeItem && (
            <span className="text-[11px] text-slate-600 truncate font-mono hidden sm:inline">
              Active: {activeItem.name}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={handleOpenPicker}
            title="Add more images"
            className="px-2 py-0.5 rounded bg-white hover:bg-slate-200 border border-slate-300 text-[11px] font-semibold text-slate-800 flex items-center gap-1 transition-colors cursor-pointer"
          >
            <Plus className="w-3 h-3 text-[#D97706]" />
            <span>Add Images</span>
          </button>

          <button
            type="button"
            onClick={() => onSetViewState('normal')}
            title="Show images (দেখুন)"
            className="px-2.5 py-0.5 rounded bg-[#D97706] hover:bg-[#B45309] text-white text-[11px] font-bold flex items-center gap-1 transition-colors cursor-pointer shadow-sm"
          >
            <ChevronUp className="w-3.5 h-3.5" />
            <span>Show</span>
          </button>
        </div>
      </div>
    );
  }

  // DYNAMIC PROPORTIONAL RATIO SIZING ("রেশিও অনুযায়ী ছোট/বড়")
  // Available height for cards inside the bar:
  // barHeight - resizeHandle(10px) - header(28px) - sprockets(2x8px=16px) - containerPadding(6px) = barHeight - 60px
  const availableCardHeight = Math.max(48, Math.round(customHeight - 60));
  const cardHeight = availableCardHeight;
  // Aspect ratio for the frame cards: roughly 1 : 1.18 width-to-height
  const cardWidth = Math.round(cardHeight * 1.18);

  // Proportional name footer height and typography
  const nameBarHeight = cardHeight < 68 ? 16 : cardHeight < 125 ? 20 : 24;
  const nameFontSize = cardHeight < 68 ? 'text-[9px]' : cardHeight < 125 ? 'text-[10px]' : 'text-[11px]';
  const thumbHeight = Math.max(30, cardHeight - nameBarHeight);

  return (
    <div
      style={{ height: `${customHeight}px` }}
      className="bg-slate-100 border-t border-slate-300 flex flex-col shrink-0 select-none z-10 shadow-inner relative"
    >
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="image/jpeg,image/jpg,image/png,image/webp,image/*"
        onChange={handleFileInputChange}
        className="hidden"
      />

      {/* UP / DOWN ARROW RESIZE HANDLE BAR AT TOP BORDER */}
      {/* টান দিয়ে রেশিও অনুযায়ী উপরে নিলে বড় হবে, নিচে নিলে ছোট হবে */}
      <div
        onMouseDown={handleResizeMouseDown}
        onTouchStart={handleResizeTouchStart}
        onDoubleClick={() => setCustomHeight(DEFAULT_FILMSTRIP_HEIGHT)}
        title="টান দিয়ে প্রিভিউ সাইজ ছোট-বড় করুন (Drag up to enlarge, drag down to shrink. Double-click to reset)"
        className={`group relative w-full h-2.5 bg-slate-200/90 hover:bg-amber-300/80 cursor-ns-resize flex items-center justify-center transition-colors border-b border-slate-300 select-none shrink-0 z-20 ${
          isResizing ? 'bg-amber-400' : ''
        }`}
      >
        {/* Center Pill with prominent Up-Down Arrow */}
        <div
          className={`flex items-center justify-center px-2 py-0.5 rounded-full text-xs font-bold transition-all shadow-xs border -translate-y-0.5 ${
            isResizing
              ? 'bg-[#D97706] text-white border-amber-600 scale-105'
              : 'bg-white group-hover:bg-[#D97706] text-slate-700 group-hover:text-white border-slate-300 group-hover:border-amber-600'
          }`}
        >
          <ChevronsUpDown className="w-3.5 h-3.5 shrink-0" />
        </div>
      </div>

      {/* Filmstrip Header: Badge, Controls, Add Images, Clear All & Hide Button */}
      <div className="h-7 px-3 bg-slate-200/90 border-b border-slate-300 flex items-center justify-between text-xs shrink-0 text-slate-900">
        <div className="flex items-center gap-2 min-w-0">
          <Film className="w-3.5 h-3.5 text-[#D97706] shrink-0" />
          <span className="px-1.5 py-0.2 bg-amber-100 text-[#B45309] font-mono font-bold text-[10px] rounded border border-amber-300 shrink-0">
            {items.length} {items.length === 1 ? 'image' : 'images'}
          </span>
          {selectedIds.size > 0 && (
            <span className="px-1.5 py-0.2 bg-emerald-100 text-emerald-800 font-mono font-bold text-[10px] rounded border border-emerald-300 shrink-0 flex items-center gap-1">
              <Check className="w-2.5 h-2.5 stroke-[3] text-emerald-700" />
              <span>{selectedIds.size} selected</span>
            </span>
          )}
          {activeItem && (
            <span className="text-[11px] text-slate-600 truncate font-mono hidden md:inline">
              (Frame #{activeIndex + 1}: {activeItem.name})
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {/* Scroll Navigation Arrows */}
          {items.length > 3 && (
            <div className="flex items-center gap-0.5 mr-1">
              <button
                type="button"
                onClick={handleScrollLeft}
                title="Scroll Left"
                className="p-1 rounded hover:bg-slate-300 text-slate-700 transition-colors cursor-pointer"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={handleScrollRight}
                title="Scroll Right"
                className="p-1 rounded hover:bg-slate-300 text-slate-700 transition-colors cursor-pointer"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Add Multiple Images Button */}
          <button
            type="button"
            onClick={handleOpenPicker}
            title="Upload multiple images"
            className="px-2 py-0.5 rounded bg-white hover:bg-slate-50 border border-slate-300 text-[11px] font-bold text-slate-900 flex items-center gap-1 transition-colors cursor-pointer shadow-xs"
          >
            <Plus className="w-3.5 h-3.5 text-[#D97706]" />
            <span>Add Images</span>
          </button>

          {/* Select All / Deselect All Button (চেক অল / আনচেক অল) */}
          {items.length > 1 && (
            <button
              type="button"
              onClick={handleToggleSelectAll}
              title={
                isAllSelected
                  ? 'সব আনচেক করুন (Uncheck all images)'
                  : selectedIds.size > 0
                  ? 'সব ছবি সিলেক্ট করুন (Select all images)'
                  : 'সব ছবি সিলেক্ট করুন (Check all)'
              }
              className={`px-2 py-0.5 rounded text-[11px] font-bold flex items-center gap-1 transition-all cursor-pointer shadow-xs border ${
                isAllSelected || selectedIds.size > 0
                  ? 'bg-amber-100 hover:bg-amber-200 text-amber-950 border-amber-400 ring-1 ring-amber-300'
                  : 'bg-white hover:bg-slate-50 text-slate-800 border-slate-300'
              }`}
            >
              {isAllSelected ? (
                <>
                  <CheckSquare className="w-3.5 h-3.5 text-[#D97706]" />
                  <span>Uncheck All</span>
                </>
              ) : selectedIds.size > 0 ? (
                <>
                  <CheckSquare className="w-3.5 h-3.5 text-[#D97706]" />
                  <span>Select All ({selectedIds.size}/{items.length})</span>
                </>
              ) : (
                <>
                  <Square className="w-3.5 h-3.5 text-slate-500" />
                  <span>Select All</span>
                </>
              )}
            </button>
          )}

          {/* Live Sync Toggle Button (একটিতে এডিট করলে সব ছবিতে হবে নাকি আলাদা) */}
          {items.length > 1 && onToggleSyncAll && (
            <button
              type="button"
              onClick={onToggleSyncAll}
              title={
                isSyncAllEnabled
                  ? 'সিঙ্ক চালু আছে: স্লাইডার নাড়ালে সব ছবি একসাথে বদলাবে (Click to edit images independently)'
                  : 'আলাদা এডিট মোড: প্রতিটি ছবির জন্য আলাদা সেটিংস রাখা হবে (Click to link/sync all images together)'
              }
              className={`px-2 py-0.5 rounded text-[11px] font-bold flex items-center gap-1 transition-all cursor-pointer shadow-xs border ${
                isSyncAllEnabled
                  ? 'bg-amber-500 hover:bg-amber-600 text-white border-amber-600 ring-1 ring-amber-400'
                  : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-300'
              }`}
            >
              {isSyncAllEnabled ? (
                <>
                  <LinkIcon className="w-3 h-3 text-white" />
                  <span>Sync: ON (সব সিঙ্ক)</span>
                </>
              ) : (
                <>
                  <Unlink className="w-3 h-3 text-slate-500" />
                  <span>Sync: OFF (আলাদা)</span>
                </>
              )}
            </button>
          )}

          {/* Smart Auto Balance (সিলেক্টেডে অথবা সব ছবিতে নিজস্ব আলো অনুযায়ী অটো ব্যালেন্স) */}
          {items.length > 1 && onAutoBalanceAll && (
            <button
              type="button"
              onClick={handleAutoBalanceAction}
              title={
                selectedIds.size > 0
                  ? `নির্বাচিত ${selectedIds.size}টি ছবির নিজস্ব এক্সপোজার অনুযায়ী স্মার্ট ব্যালেন্স প্রয়োগ করুন`
                  : 'প্রতিটি ছবির নিজস্ব এক্সপোজার অনুযায়ী স্মার্ট ব্যালেন্স প্রয়োগ করুন যাতে কোনো ছবি অতিরিক্ত কালো বা হালকা না হয়'
              }
              className="px-2 py-0.5 rounded bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white text-[11px] font-bold flex items-center gap-1 transition-all cursor-pointer shadow-xs border border-emerald-700"
            >
              <Sparkles className="w-3 h-3 text-amber-200" />
              <span>
                {selectedIds.size > 0
                  ? `Auto Tone Selected (${selectedIds.size})`
                  : 'Auto Tone All'}
              </span>
            </button>
          )}

          {/* Apply to All / Selected Images Button */}
          {items.length > 1 && onApplyToAll && (
            <button
              type="button"
              onClick={handleApplyAction}
              title={
                selectedIds.size > 0
                  ? `বর্তমান ছবির ডট ও সেটিংস শুধুমাত্র নির্বাচিত ${selectedIds.size}টি ছবিতে কপি করুন`
                  : 'বর্তমান ছবির ইফেক্ট সেটিংস বাকি সব ছবিতে কপি করুন (Apply current settings to all images)'
              }
              className="px-2 py-0.5 rounded bg-[#D97706] hover:bg-[#B45309] active:scale-95 text-white text-[11px] font-bold flex items-center gap-1 transition-all cursor-pointer shadow-xs border border-amber-600"
            >
              <Copy className="w-3 h-3 text-white" />
              <span>
                {selectedIds.size > 0
                  ? `Apply to Selected (${selectedIds.size})`
                  : 'Apply to All (সব ছবিতে)'}
              </span>
            </button>
          )}

          {/* Remove Selected Button */}
          {selectedIds.size > 0 && onRemoveMultipleItems && (
            <button
              type="button"
              onClick={handleDeleteSelectedAction}
              title={`নির্বাচিত ${selectedIds.size}টি ছবি মুছে ফেলুন (Remove selected images)`}
              className="px-2 py-0.5 rounded bg-red-50 hover:bg-red-100 text-red-700 hover:text-red-800 border border-red-300 text-[11px] font-bold flex items-center gap-1 transition-all cursor-pointer shadow-xs"
            >
              <Trash2 className="w-3 h-3 text-red-600" />
              <span>Delete ({selectedIds.size})</span>
            </button>
          )}

          {/* Clear All Button */}
          {items.length > 1 && (
            <button
              type="button"
              onClick={onClearAll}
              title="Clear all images"
              className="p-1 rounded hover:bg-red-100 text-slate-600 hover:text-red-700 transition-colors cursor-pointer"
            >
              <Trash2 className="w-3 h-3" />
            </button>
          )}

          <div className="w-[1px] h-3.5 bg-slate-300 mx-0.5" />

          {/* Hide Button */}
          <button
            type="button"
            onClick={() => onSetViewState('minimized')}
            title="Hide (লুকিয়ে রাখুন)"
            className="px-2 py-0.5 rounded bg-white hover:bg-slate-100 border border-slate-300 text-[11px] font-bold text-slate-900 flex items-center gap-1 transition-colors cursor-pointer shadow-xs"
          >
            <ChevronDown className="w-3.5 h-3.5 text-slate-700" />
            <span>Hide</span>
          </button>
        </div>
      </div>

      {/* Top Film Sprockets */}
      {renderSprockets()}

      {/* Frames Scroll Container with Drag-to-Scroll */}
      <div
        ref={scrollContainerRef}
        onWheel={handleWheel}
        onMouseDown={handleContainerMouseDown}
        className={`flex-1 overflow-x-auto overflow-y-hidden px-3 py-1 flex items-center gap-2.5 scrollbar-thin scrollbar-thumb-slate-300 scrollbar-track-transparent select-none ${
          isDragging ? 'cursor-grabbing' : 'cursor-grab'
        }`}
      >
        {items.length === 0 ? (
          <div
            onClick={handleOpenPicker}
            className="w-full h-full rounded border-2 border-dashed border-slate-300 hover:border-[#D97706] bg-white/60 hover:bg-amber-50/40 flex items-center justify-center gap-2 cursor-pointer transition-colors text-xs text-slate-600 hover:text-slate-900"
          >
            <Upload className="w-4 h-4 text-[#D97706]" />
            <span className="font-semibold">
              Drop multiple images here or click to add
            </span>
          </div>
        ) : (
          <>
            {items.map((item, index) => {
              const isActive = item.id === activeId;
              const isSelected = selectedIds.has(item.id);
              return (
                <div
                  key={item.id}
                  style={{
                    width: `${cardWidth}px`,
                    height: `${cardHeight}px`,
                  }}
                  onClick={() => {
                    if (hasDraggedRef.current) return;
                    onSelectItem(item);
                  }}
                  title={`Click to load "${item.name}" onto Artboard (or drag to scroll)`}
                  className={`group relative shrink-0 flex flex-col items-center rounded-md transition-all select-none overflow-hidden ${
                    isDragging ? 'cursor-grabbing' : 'cursor-grab'
                  } ${
                    isActive
                      ? 'bg-amber-500/10 ring-2 ring-[#D97706] shadow-md scale-[1.01]'
                      : isSelected
                      ? 'bg-amber-100/60 ring-2 ring-amber-400 border border-amber-500 shadow-sm'
                      : 'bg-white hover:bg-amber-50/50 border border-slate-300 hover:border-amber-400 shadow-xs'
                  }`}
                >
                  {/* Multi-Select Individual Checkbox on the Left Side (বাঁ পাশে নিরাপদ চেকবক্স) */}
                  <button
                    type="button"
                    onMouseDown={(e) => e.stopPropagation()}
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleItemSelection(item.id);
                    }}
                    title={isSelected ? 'আনচেক করুন (Uncheck)' : 'সিলেক্ট করতে টিক দিন (Select this image)'}
                    className={`absolute top-1 left-1 z-20 w-4 h-4 rounded flex items-center justify-center transition-all cursor-pointer shadow-xs border ${
                      isSelected
                        ? 'bg-[#D97706] text-white border-amber-600 scale-105 ring-1 ring-amber-300 opacity-100'
                        : 'bg-white/95 hover:bg-white text-transparent hover:text-slate-400 border-slate-400 opacity-85 group-hover:opacity-100'
                    }`}
                  >
                    <Check className={`w-3 h-3 stroke-[3] ${isSelected ? 'text-white' : 'opacity-0 hover:opacity-80 text-slate-500'}`} />
                  </button>

                  {/* Frame Number Badge next to Checkbox */}
                  <div
                    className={`absolute top-1 left-6 z-10 px-1 py-0.2 rounded text-[9px] font-mono font-bold leading-tight flex items-center gap-1 ${
                      isActive
                        ? 'bg-[#D97706] text-white shadow-xs'
                        : 'bg-slate-900/80 text-white group-hover:bg-slate-900'
                    }`}
                  >
                    <span>#{index + 1}</span>
                    {item.isCustomized && (
                      <span
                        title="এই ছবির জন্য আলাদা সেটিংস কাস্টমাইজ করা আছে"
                        className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0 shadow-xs"
                      />
                    )}
                  </div>

                  {/* Remove Single Frame Button on the Right Side (ডান পাশে শুধুমাত্র ক্রস বাটন) */}
                  <button
                    type="button"
                    onMouseDown={(e) => e.stopPropagation()}
                    onClick={(e) => {
                      e.stopPropagation();
                      onRemoveItem(item.id);
                    }}
                    title="Remove this image"
                    className="absolute top-1 right-1 z-10 w-4 h-4 rounded-full bg-slate-900/70 hover:bg-red-600 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer shadow"
                  >
                    <X className="w-2.5 h-2.5" />
                  </button>

                  {/* Image Thumbnail Box scaled to ratio */}
                  <div
                    style={{ height: `${thumbHeight}px` }}
                    className="w-full p-1 flex items-center justify-center overflow-hidden rounded-t-md bg-slate-900/5"
                  >
                    <img
                      src={item.previewUrl}
                      alt={item.name}
                      draggable={false}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-contain pointer-events-none rounded-[3px] select-none"
                    />
                  </div>

                  {/* Image Name / Active Badge Footer scaled to ratio */}
                  <div
                    style={{ height: `${nameBarHeight}px` }}
                    className="w-full px-1.5 flex items-center justify-center gap-1 border-t border-slate-200/60 bg-white/80 rounded-b-md"
                  >
                    {isActive ? (
                      <span className={`${nameFontSize} font-bold text-[#B45309] truncate flex items-center gap-0.5`}>
                        <CheckCircle2 className="w-2.5 h-2.5 shrink-0" />
                        <span className="truncate">{item.name}</span>
                      </span>
                    ) : (
                      <span className={`${nameFontSize} font-medium text-slate-700 truncate`}>
                        {item.name}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}

            {/* Quick Add More Card at end of strip (proportionally matches ratio) */}
            <div
              style={{
                width: `${cardWidth}px`,
                height: `${cardHeight}px`,
              }}
              onClick={() => {
                if (hasDraggedRef.current) return;
                handleOpenPicker();
              }}
              title="Add more images"
              className="shrink-0 flex flex-col items-center justify-center rounded-md border-2 border-dashed border-slate-300 hover:border-[#D97706] bg-white/70 hover:bg-amber-50 text-slate-600 hover:text-[#B45309] cursor-pointer transition-all p-1"
            >
              <Plus className="w-5 h-5 mb-0.5" />
              <span className={`${nameFontSize} font-bold text-center leading-tight`}>
                Add More
              </span>
            </div>
          </>
        )}
      </div>

      {/* Bottom Film Sprockets */}
      {renderSprockets()}
    </div>
  );
};
