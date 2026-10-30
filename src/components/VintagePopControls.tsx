/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  Blend,
  ChevronDown,
  ChevronRight,
  CircleDot,
  Crosshair,
  Grid,
  Maximize2,
  Move,
  Palette,
  RotateCcw,
  Scissors,
  ScrollText,
  Sparkles,
  Sun,
} from 'lucide-react';
import {
  AutoFitMode,
  PaperTextureStyle,
  PopColoringMode,
  PopHalftoneStyle,
  PopStickerStyle,
  VINTAGE_POP_PRESETS,
  VintagePopSettings,
} from '../types/stipple';

interface VintagePopControlsProps {
  settings: VintagePopSettings;
  onUpdateSetting: <K extends keyof VintagePopSettings>(
    key: K,
    value: VintagePopSettings[K]
  ) => void;
  onUpdateMultipleSettings?: (partial: Partial<VintagePopSettings>) => void;
  onSelectPreset: (presetId: string) => void;
  activePresetId: string;
  onReset: () => void;
  onDragStart: () => void;
  onDragEnd: () => void;
  isMoveToolActive?: boolean;
  onToggleMoveTool?: () => void;
  onAutoTone?: () => void;
}

interface PopCollapsibleSectionProps {
  title: string;
  defaultOpen?: boolean;
  icon?: React.ReactNode;
  headerAction?: React.ReactNode;
  children: React.ReactNode;
}

const PopCollapsibleSection: React.FC<PopCollapsibleSectionProps> = ({
  title,
  defaultOpen = false,
  icon,
  headerAction,
  children,
}) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="border-b border-slate-200">
      <div className="flex items-center justify-between px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200/70 transition-colors">
        <button
          type="button"
          onClick={() => setIsOpen((prev) => !prev)}
          className="flex items-center gap-2 text-left flex-1 min-w-0 focus:outline-none cursor-pointer"
        >
          {isOpen ? (
            <ChevronDown className="w-3.5 h-3.5 text-slate-800 shrink-0" />
          ) : (
            <ChevronRight className="w-3.5 h-3.5 text-slate-800 shrink-0" />
          )}
          {icon && <span className="shrink-0">{icon}</span>}
          <span className="text-xs font-bold tracking-wide text-slate-900 truncate">
            {title}
          </span>
        </button>
        {headerAction && <div className="shrink-0 ml-2">{headerAction}</div>}
      </div>

      {isOpen && (
        <div className="px-3.5 py-3 bg-white space-y-2.5">{children}</div>
      )}
    </div>
  );
};

export const VintagePopControls: React.FC<VintagePopControlsProps> = ({
  settings,
  onUpdateSetting,
  onUpdateMultipleSettings,
  onSelectPreset,
  activePresetId,
  onReset,
  onDragStart,
  onDragEnd,
  isMoveToolActive = false,
  onToggleMoveTool,
  onAutoTone,
}) => {
  return (
    <div className="text-xs">
      {/* 01. Curated Pop Art Styles (Presets) */}
      <PopCollapsibleSection
        title="01. Curated Pop Art Styles"
        defaultOpen={false}
        icon={<Sparkles className="w-3.5 h-3.5 text-amber-600" />}
        headerAction={
          <button
            type="button"
            onClick={onReset}
            title="Reset to default settings"
            className="text-[10px] text-slate-700 hover:text-slate-900 flex items-center gap-1 cursor-pointer font-medium bg-white px-1.5 py-0.5 rounded border border-slate-300 hover:bg-slate-50 transition-colors"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Reset</span>
          </button>
        }
      >
        <div className="grid grid-cols-2 gap-1.5">
          {VINTAGE_POP_PRESETS.map((preset) => {
            const isSelected = activePresetId === preset.id;
            return (
              <button
                key={preset.id}
                type="button"
                onClick={() => onSelectPreset(preset.id)}
                className={`p-1.5 rounded text-left border transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-amber-100/70 border-amber-500 font-bold text-amber-950 shadow-xs ring-1 ring-amber-400'
                    : 'bg-white border-slate-200 hover:border-slate-300 text-slate-700 hover:bg-slate-50'
                }`}
              >
                <div className="truncate text-[11px] font-semibold">{preset.name}</div>
                <div className="text-[9px] text-slate-600 truncate">{preset.category}</div>
              </button>
            );
          })}
        </div>
      </PopCollapsibleSection>

      {/* 02. Color & Screen Print Engine */}
      <PopCollapsibleSection
        title="02. Color & Screen Print Engine"
        defaultOpen={false}
        icon={<Palette className="w-3.5 h-3.5 text-emerald-600" />}
      >
        <div className="space-y-2.5">
          {/* Transparent Mode ON/OFF Quick Bar */}
          <div className="flex items-center justify-between p-2 bg-emerald-50/80 rounded-md border border-emerald-200">
            <div>
              <span className="text-[11px] font-bold text-slate-800 block leading-tight">
                Transparent Mode
              </span>
              <span className="text-[9px] text-slate-500">
                স্বচ্ছ ব্যাকগ্রাউন্ড (Export transparent vector)
              </span>
            </div>
            <button
              type="button"
              onClick={() => onUpdateSetting('isBackgroundTransparent', !settings.isBackgroundTransparent)}
              className={`px-2.5 py-1 text-[11px] font-bold rounded cursor-pointer transition-all ${
                settings.isBackgroundTransparent
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-50'
              }`}
            >
              {settings.isBackgroundTransparent ? 'ON (স্বচ্ছ)' : 'OFF'}
            </button>
          </div>

          {/* Quick Black & White Toggle Bar */}
          <div className="flex items-center justify-between p-2 bg-slate-100/90 rounded-md border border-slate-200">
            <div className="flex items-center gap-2">
              <span className="w-4 h-4 rounded-full bg-gradient-to-tr from-black via-slate-500 to-white border border-slate-300 shadow-xs shrink-0" />
              <div>
                <span className="text-[11px] font-bold text-slate-800 block leading-tight">
                  Pure Black & White (সাদা-কালো)
                </span>
                <span className="text-[9.5px] text-slate-500 block leading-tight">
                  Classic vintage monochrome noir halftone
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                if (settings.coloringMode === 'monochrome-noir') {
                  onUpdateSetting('coloringMode', 'cmyk-risograph');
                } else {
                  onUpdateSetting('coloringMode', 'monochrome-noir');
                  onUpdateSetting('inkColor', '#000000');
                  onUpdateSetting('accentColor1', '#262626');
                  onUpdateSetting('accentColor2', '#737373');
                  onUpdateSetting('accentColor3', '#F5F5F5');
                }
              }}
              className={`px-2.5 py-1 rounded text-[10.5px] font-bold cursor-pointer transition-all ${
                settings.coloringMode === 'monochrome-noir'
                  ? 'bg-slate-900 text-white ring-2 ring-slate-900/30 shadow-xs'
                  : 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-50 hover:border-slate-400'
              }`}
            >
              {settings.coloringMode === 'monochrome-noir' ? '✓ B&W Active' : 'Enable B&W'}
            </button>
          </div>

          {/* Coloring Mode Grid */}
          <div>
            <span className="block text-[11px] font-semibold text-slate-700 mb-1">
              Printing Style Mode
            </span>
            <div className="grid grid-cols-4 gap-1">
              {(
                [
                  ['cmyk-risograph', '🖨️ CMYK'],
                  ['smooth-gradient', '🌈 Smooth'],
                  ['photo-pop', '📸 Photo'],
                  ['monochrome-noir', '⚫ B&W Noir'],
                  ['tri-color', 'Tri-Tone'],
                  ['duotone-pop', 'Duotone'],
                  ['selective-accent', 'Selective'],
                ] as [PopColoringMode, string][]
              ).map(([mode, label]) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => onUpdateSetting('coloringMode', mode)}
                  className={`py-1.5 px-1 rounded border text-center font-medium text-[10px] cursor-pointer whitespace-nowrap ${
                    settings.coloringMode === mode
                      ? 'bg-emerald-100/70 border-emerald-600 text-emerald-950 font-bold shadow-xs'
                      : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Color Softness */}
          {settings.coloringMode === 'smooth-gradient' && (
            <div>
              <div className="flex justify-between text-[11px] font-medium text-slate-700 mb-1">
                <span>Color Blend Softness</span>
                <span className="font-mono text-emerald-700 font-bold">{settings.colorSoftness || 75}%</span>
              </div>
              <input
                type="range"
                min="10"
                max="100"
                step="5"
                value={settings.colorSoftness || 75}
                onMouseDown={onDragStart}
                onMouseUp={onDragEnd}
                onChange={(e) => onUpdateSetting('colorSoftness', parseInt(e.target.value, 10))}
                className="w-full accent-emerald-600 h-1.5 bg-slate-200 rounded-lg cursor-pointer"
              />
            </div>
          )}

          {/* Quick Curated Colorway Buttons */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-[11px] font-semibold text-slate-700">
                Curated Vintage Palettes
              </span>
              <span className="text-[10px] text-slate-400 font-medium">Quick 1-Click Colorways</span>
            </div>
            <div className="grid grid-cols-4 gap-1">
              {[
                { name: 'Noir B&W', ink: '#000000', a1: '#262626', a2: '#737373', a3: '#FFFFFF' },
                { name: 'Golden Comic', ink: '#121212', a1: '#E63946', a2: '#0077B6', a3: '#FFB703' },
                { name: 'Y2K Acid', ink: '#0A0A0A', a1: '#F43F5E', a2: '#06B6D4', a3: '#A3E635' },
                { name: 'Tokyo 80s', ink: '#1E1B4B', a1: '#FB7185', a2: '#38BDF8', a3: '#FBBF24' },
                { name: 'Bauhaus', ink: '#18181B', a1: '#DC2626', a2: '#1D4ED8', a3: '#D97706' },
                { name: 'Warhol 68', ink: '#141416', a1: '#FF007F', a2: '#00F0FF', a3: '#FFE600' },
                { name: 'Miami 80s', ink: '#161426', a1: '#FF2A85', a2: '#00E5FF', a3: '#FFD600' },
                { name: 'Retro Pulp', ink: '#1E1B18', a1: '#D97706', a2: '#0D9488', a3: '#F59E0B' },
              ].map((pal) => {
                const isActive =
                  settings.inkColor.toLowerCase() === pal.ink.toLowerCase() &&
                  settings.accentColor1.toLowerCase() === pal.a1.toLowerCase() &&
                  settings.accentColor2.toLowerCase() === pal.a2.toLowerCase() &&
                  settings.accentColor3.toLowerCase() === pal.a3.toLowerCase();
                return (
                  <button
                    key={pal.name}
                    type="button"
                    onClick={() => {
                      onUpdateSetting('inkColor', pal.ink);
                      onUpdateSetting('accentColor1', pal.a1);
                      onUpdateSetting('accentColor2', pal.a2);
                      onUpdateSetting('accentColor3', pal.a3);
                      if (pal.name === 'Noir B&W') {
                        onUpdateSetting('coloringMode', 'monochrome-noir');
                      }
                    }}
                    className={`py-1.5 px-1.5 rounded border transition-all flex items-center justify-between gap-1 text-[10px] cursor-pointer ${
                      isActive
                        ? 'border-emerald-500 bg-emerald-50/70 font-semibold ring-1 ring-emerald-500/40 text-emerald-950 shadow-xs'
                        : 'border-slate-200 hover:border-slate-300 bg-white hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <span className="truncate">{pal.name}</span>
                    <div className="flex -space-x-1 shrink-0">
                      <span className="w-2.5 h-2.5 rounded-full border border-white shadow-xs" style={{ backgroundColor: pal.a1 }} />
                      <span className="w-2.5 h-2.5 rounded-full border border-white shadow-xs" style={{ backgroundColor: pal.a2 }} />
                      <span className="w-2.5 h-2.5 rounded-full border border-white shadow-xs" style={{ backgroundColor: pal.a3 }} />
                    </div>
                  </button>
                );
              })}
            </div>
            {settings.coloringMode === 'photo-pop' && (
              <div className="mt-1.5 px-2 py-1 bg-amber-50/80 border border-amber-200/80 rounded text-[10px] text-amber-800 leading-tight">
                💡 <span className="font-semibold">Photo Pop</span> মোডে ছবির আসল রং (যেমন টমেটোর লাল/সবুজ) বজায় থাকে। সম্পূর্ণ পপ-আর্ট রঙের ট্রান্সফর্ম দেখতে উপরে <span className="font-semibold text-amber-900">Smooth Pop</span>, <span className="font-semibold text-amber-900">CMYK Riso</span> বা <span className="font-semibold text-amber-900">Tri-Tone</span> সিলেক্ট করুন।
              </div>
            )}
          </div>

          {/* Color Swatches Grid */}
          <div className="space-y-1.5 pt-1">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-medium text-slate-700">Primary Ink (Dark Shadows)</span>
              <div className="flex items-center gap-1.5">
                <input
                  type="color"
                  value={settings.inkColor}
                  onChange={(e) => onUpdateSetting('inkColor', e.target.value)}
                  className="w-6 h-6 rounded border border-slate-300 cursor-pointer p-0"
                />
                <span className="font-mono text-[10px] text-slate-500 uppercase">{settings.inkColor}</span>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-[11px] font-medium text-slate-700">Accent 1 (Bold Pop Red)</span>
              <div className="flex items-center gap-1.5">
                <input
                  type="color"
                  value={settings.accentColor1}
                  onChange={(e) => onUpdateSetting('accentColor1', e.target.value)}
                  className="w-6 h-6 rounded border border-slate-300 cursor-pointer p-0"
                />
                <span className="font-mono text-[10px] text-slate-500 uppercase">{settings.accentColor1}</span>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-[11px] font-medium text-slate-700">Accent 2 (Vibrant Cyan)</span>
              <div className="flex items-center gap-1.5">
                <input
                  type="color"
                  value={settings.accentColor2}
                  onChange={(e) => onUpdateSetting('accentColor2', e.target.value)}
                  className="w-6 h-6 rounded border border-slate-300 cursor-pointer p-0"
                />
                <span className="font-mono text-[10px] text-slate-500 uppercase">{settings.accentColor2}</span>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-[11px] font-medium text-slate-700">Accent 3 (Canary Yellow)</span>
              <div className="flex items-center gap-1.5">
                <input
                  type="color"
                  value={settings.accentColor3}
                  onChange={(e) => onUpdateSetting('accentColor3', e.target.value)}
                  className="w-6 h-6 rounded border border-slate-300 cursor-pointer p-0"
                />
                <span className="font-mono text-[10px] text-slate-500 uppercase">{settings.accentColor3}</span>
              </div>
            </div>

            {/* Background Color & Transparent Checkbox */}
            <div className="pt-2 border-t border-slate-100 space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.isBackgroundTransparent}
                    onChange={(e) => onUpdateSetting('isBackgroundTransparent', e.target.checked)}
                    className="rounded text-emerald-600 w-3.5 h-3.5"
                  />
                  <span className="text-[11px] font-bold text-slate-800">Transparent Background</span>
                </label>
                <span className="text-[9px] text-slate-500 font-mono">(PNG Sticker)</span>
              </div>

              {!settings.isBackgroundTransparent && (
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-medium text-slate-700">Canvas Background</span>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="color"
                      value={settings.backgroundColor}
                      onChange={(e) => onUpdateSetting('backgroundColor', e.target.value)}
                      className="w-6 h-6 rounded border border-slate-300 cursor-pointer p-0"
                    />
                    <button
                      type="button"
                      onClick={() => onUpdateSetting('backgroundColor', '#1C1D24')}
                      className="px-1 py-0.5 text-[9px] bg-slate-800 text-white rounded font-mono"
                    >
                      Dark
                    </button>
                    <button
                      type="button"
                      onClick={() => onUpdateSetting('backgroundColor', '#F7F4EA')}
                      className="px-1 py-0.5 text-[9px] bg-amber-50 rounded border border-amber-200 font-mono"
                    >
                      Paper
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </PopCollapsibleSection>

      {/* 03. Paper Cutout & Sticker Border */}
      <PopCollapsibleSection
        title="03. Paper Cutout & Sticker Border"
        defaultOpen={false}
        icon={<Scissors className="w-3.5 h-3.5 text-rose-600" />}
        headerAction={
          <label className="flex items-center gap-1.5 cursor-pointer">
            <input
              type="checkbox"
              checked={settings.stickerBorderEnabled}
              onChange={(e) => onUpdateSetting('stickerBorderEnabled', e.target.checked)}
              className="rounded text-amber-600 focus:ring-amber-500 w-3.5 h-3.5"
            />
            <span className="text-[10px] font-semibold text-slate-600">Border On</span>
          </label>
        }
      >
        {settings.stickerBorderEnabled ? (
          <div className="space-y-2.5">
            {/* Width Slider */}
            <div>
              <div className="flex justify-between text-[11px] font-medium text-slate-700 mb-1">
                <span>Border Width</span>
                <span className="font-mono text-amber-700 font-bold">{settings.stickerBorderWidth}px</span>
              </div>
              <input
                type="range"
                min="2"
                max="36"
                step="1"
                value={settings.stickerBorderWidth}
                onMouseDown={onDragStart}
                onMouseUp={onDragEnd}
                onChange={(e) => onUpdateSetting('stickerBorderWidth', parseInt(e.target.value, 10))}
                className="w-full accent-amber-600 h-1.5 bg-slate-200 rounded-lg cursor-pointer"
              />
            </div>

            {/* Border Style */}
            <div className="grid grid-cols-2 gap-1.5">
              {(['smooth', 'torn-paper'] as PopStickerStyle[]).map((style) => (
                <button
                  key={style}
                  type="button"
                  onClick={() => onUpdateSetting('stickerBorderStyle', style)}
                  className={`py-1 px-2 rounded border text-center font-medium capitalize text-[10px] cursor-pointer ${
                    settings.stickerBorderStyle === style
                      ? 'bg-amber-100/60 border-amber-500 text-amber-900 font-bold'
                      : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {style === 'smooth' ? '✂️ Smooth Die-Cut' : '📜 Torn Paper'}
                </button>
              ))}
            </div>

            {/* Paper Cutout & Sticker Background Color */}
            <div className="flex items-center justify-between pt-1">
              <span className="text-[11px] font-medium text-slate-700">Cutout Color (কাটআউট কালার)</span>
              <div className="flex items-center gap-1.5">
                <input
                  type="color"
                  value={settings.stickerBorderColor}
                  onChange={(e) => onUpdateSetting('stickerBorderColor', e.target.value)}
                  className="w-6 h-6 rounded border border-slate-300 cursor-pointer p-0"
                  title="Custom Color"
                />
                {[
                  { label: 'White', color: '#FFFFFF' },
                  { label: 'Cream', color: '#F7F2E7' },
                  { label: 'Yellow', color: '#FFE600' },
                  { label: 'Red', color: '#E52521' },
                  { label: 'Black', color: '#141414' },
                ].map((swatch) => (
                  <button
                    key={swatch.color}
                    type="button"
                    onClick={() => onUpdateSetting('stickerBorderColor', swatch.color)}
                    style={{ backgroundColor: swatch.color }}
                    title={swatch.label}
                    className={`w-4 h-4 rounded-full border cursor-pointer ${
                      settings.stickerBorderColor.toUpperCase() === swatch.color.toUpperCase()
                        ? 'ring-2 ring-amber-500 scale-110'
                        : 'border-slate-300'
                    }`}
                  />
                ))}
              </div>
            </div>

            {/* Position Shift (X & Y Move) for Paper Cutout */}
            <div className="pt-1.5 border-t border-slate-200/80 space-y-1.5">
              <div className="flex items-center justify-between text-[10px] font-semibold text-slate-700">
                <span>Position Shift (X, Y বরাবর মুভ)</span>
                {((settings.stickerBorderShiftX || 0) !== 0 || (settings.stickerBorderShiftY || 0) !== 0) && (
                  <button
                    type="button"
                    onClick={() => {
                      onUpdateSetting('stickerBorderShiftX', 0);
                      onUpdateSetting('stickerBorderShiftY', 0);
                    }}
                    className="text-[9px] text-amber-600 hover:text-amber-800 underline cursor-pointer"
                  >
                    Reset Center
                  </button>
                )}
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <div className="flex justify-between text-[9px] font-medium text-slate-600 mb-0.5">
                    <span>X (ডানে/বামে)</span>
                    <span className="font-mono text-slate-800 font-bold">{settings.stickerBorderShiftX || 0}px</span>
                  </div>
                  <input
                    type="range"
                    min="-28"
                    max="28"
                    step="1"
                    value={settings.stickerBorderShiftX || 0}
                    onMouseDown={onDragStart}
                    onMouseUp={onDragEnd}
                    onChange={(e) => onUpdateSetting('stickerBorderShiftX', parseInt(e.target.value, 10))}
                    className="w-full accent-amber-600 h-1.5 bg-slate-200 rounded-lg cursor-pointer"
                  />
                </div>
                <div>
                  <div className="flex justify-between text-[9px] font-medium text-slate-600 mb-0.5">
                    <span>Y (উপরে/নিচে)</span>
                    <span className="font-mono text-slate-800 font-bold">{settings.stickerBorderShiftY || 0}px</span>
                  </div>
                  <input
                    type="range"
                    min="-28"
                    max="28"
                    step="1"
                    value={settings.stickerBorderShiftY || 0}
                    onMouseDown={onDragStart}
                    onMouseUp={onDragEnd}
                    onChange={(e) => onUpdateSetting('stickerBorderShiftY', parseInt(e.target.value, 10))}
                    className="w-full accent-amber-600 h-1.5 bg-slate-200 rounded-lg cursor-pointer"
                  />
                </div>
              </div>
            </div>

            {/* Drop Shadow Toggle & Blur Slider (Placed under X, Y) */}
            <div className="pt-1.5 border-t border-slate-200/80 space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.stickerShadow}
                    onChange={(e) => onUpdateSetting('stickerShadow', e.target.checked)}
                    className="rounded text-amber-600 w-3.5 h-3.5"
                  />
                  <span className="text-[11px] font-medium text-slate-700">Drop Shadow Depth</span>
                </label>
                {settings.stickerShadow && (
                  <span className="text-[10px] font-mono text-slate-500">{settings.stickerShadowBlur}px</span>
                )}
              </div>
              {settings.stickerShadow && (
                <input
                  type="range"
                  min="2"
                  max="32"
                  step="1"
                  value={settings.stickerShadowBlur}
                  onMouseDown={onDragStart}
                  onMouseUp={onDragEnd}
                  onChange={(e) => onUpdateSetting('stickerShadowBlur', parseInt(e.target.value, 10))}
                  className="w-full accent-amber-600 h-1.5 bg-slate-200 rounded-lg cursor-pointer"
                />
              )}
            </div>
          </div>
        ) : (
          <div className="text-[11px] text-slate-400 italic py-1">
            বর্ডার বন্ধ আছে। চালু করতে উপরের 'Border On' চেক করুন।
          </div>
        )}
      </PopCollapsibleSection>

      {/* 04. Middle Cutout Accent Shape */}
      <PopCollapsibleSection
        title="04. Middle Cutout Accent Shape"
        defaultOpen={false}
        icon={<Scissors className="w-3.5 h-3.5 text-rose-500" />}
        headerAction={
          <label className="flex items-center gap-1.5 cursor-pointer">
            <input
              type="checkbox"
              checked={settings.accentCutoutEnabled}
              onChange={(e) => onUpdateSetting('accentCutoutEnabled', e.target.checked)}
              className="rounded text-rose-600 focus:ring-rose-500 w-3.5 h-3.5"
            />
            <span className="text-[10px] font-semibold text-slate-600">Cutout On</span>
          </label>
        }
      >
        {settings.accentCutoutEnabled ? (
          <div className="space-y-2">
            <div>
              <div className="flex justify-between text-[10px] font-medium text-slate-600 mb-0.5">
                <span>Offset Path (ছোট-বড় করার সাইজ)</span>
                <span className="font-mono text-slate-800 font-bold">{settings.accentCutoutWidth}px</span>
              </div>
              <input
                type="range"
                min="1"
                max="24"
                step="1"
                value={settings.accentCutoutWidth}
                onMouseDown={onDragStart}
                onMouseUp={onDragEnd}
                onChange={(e) => onUpdateSetting('accentCutoutWidth', parseInt(e.target.value, 10))}
                className="w-full accent-rose-600 h-1.5 bg-slate-200 rounded-lg cursor-pointer"
              />
            </div>

            <div className="flex items-center justify-between">
              <span className="text-[10px] font-medium text-slate-600">Cutout Color</span>
              <div className="flex items-center gap-1.5">
                <input
                  type="color"
                  value={settings.accentCutoutColor}
                  onChange={(e) => onUpdateSetting('accentCutoutColor', e.target.value)}
                  className="w-5 h-5 rounded border border-slate-300 cursor-pointer p-0"
                />
                {[
                  { label: 'Red', color: '#E52521' },
                  { label: 'Orange', color: '#FF5500' },
                  { label: 'Cyan', color: '#00AEEF' },
                  { label: 'Yellow', color: '#FFD100' },
                  { label: 'Black', color: '#141414' },
                ].map((swatch) => (
                  <button
                    key={swatch.color}
                    type="button"
                    onClick={() => onUpdateSetting('accentCutoutColor', swatch.color)}
                    style={{ backgroundColor: swatch.color }}
                    title={swatch.label}
                    className={`w-4 h-4 rounded-full border cursor-pointer ${
                      settings.accentCutoutColor === swatch.color ? 'ring-2 ring-rose-500 scale-110' : 'border-slate-300'
                    }`}
                  />
                ))}
              </div>
            </div>

            {/* Position Shift (X & Y Move) */}
            <div className="pt-1.5 border-t border-rose-200/60 space-y-1.5">
              <div className="flex items-center justify-between text-[10px] font-semibold text-slate-700">
                <span>Position Shift (X, Y বরাবর মুভ)</span>
                {((settings.accentCutoutShiftX || 0) !== 0 || (settings.accentCutoutShiftY || 0) !== 0) && (
                  <button
                    type="button"
                    onClick={() => {
                      onUpdateSetting('accentCutoutShiftX', 0);
                      onUpdateSetting('accentCutoutShiftY', 0);
                    }}
                    className="text-[9px] text-rose-600 hover:text-rose-800 underline cursor-pointer"
                  >
                    Reset Center
                  </button>
                )}
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <div className="flex justify-between text-[9px] font-medium text-slate-600 mb-0.5">
                    <span>X (ডানে/বামে)</span>
                    <span className="font-mono text-slate-800 font-bold">{settings.accentCutoutShiftX || 0}px</span>
                  </div>
                  <input
                    type="range"
                    min="-28"
                    max="28"
                    step="1"
                    value={settings.accentCutoutShiftX || 0}
                    onMouseDown={onDragStart}
                    onMouseUp={onDragEnd}
                    onChange={(e) => onUpdateSetting('accentCutoutShiftX', parseInt(e.target.value, 10))}
                    className="w-full accent-rose-600 h-1.5 bg-slate-200 rounded-lg cursor-pointer"
                  />
                </div>
                <div>
                  <div className="flex justify-between text-[9px] font-medium text-slate-600 mb-0.5">
                    <span>Y (উপরে/নিচে)</span>
                    <span className="font-mono text-slate-800 font-bold">{settings.accentCutoutShiftY || 0}px</span>
                  </div>
                  <input
                    type="range"
                    min="-28"
                    max="28"
                    step="1"
                    value={settings.accentCutoutShiftY || 0}
                    onMouseDown={onDragStart}
                    onMouseUp={onDragEnd}
                    onChange={(e) => onUpdateSetting('accentCutoutShiftY', parseInt(e.target.value, 10))}
                    className="w-full accent-rose-600 h-1.5 bg-slate-200 rounded-lg cursor-pointer"
                  />
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-[11px] text-slate-400 italic py-1">
            মিডিল কাট-আউট বন্ধ আছে। চালু করতে উপরের 'Cutout On' চেক করুন।
          </div>
        )}
      </PopCollapsibleSection>

      {/* 05. Halftone & Shading Engine */}
      <PopCollapsibleSection
        title="05. Halftone & Shading Engine"
        defaultOpen={false}
        icon={<CircleDot className="w-3.5 h-3.5 text-blue-600" />}
        headerAction={
          <label className="flex items-center gap-1.5 cursor-pointer">
            <input
              type="checkbox"
              checked={settings.invertInk}
              onChange={(e) => onUpdateSetting('invertInk', e.target.checked)}
              className="rounded text-blue-600 w-3.5 h-3.5"
            />
            <span className="text-[10px] font-semibold text-slate-600">Invert Ink</span>
          </label>
        }
      >
        <div className="space-y-2.5">
          {/* Style Selector */}
          <div className="grid grid-cols-6 gap-1">
            {(['dots', 'lines', 'grain', 'xerox-solid', 'crosshatch', 'diamond'] as PopHalftoneStyle[]).map((style) => (
              <button
                key={style}
                type="button"
                onClick={() => onUpdateSetting('halftoneStyle', style)}
                title={
                  style === 'dots'
                    ? 'Ben-Day Dots: ক্লাসিক কমিক ডট রোজেট'
                    : style === 'lines'
                    ? 'Line Screen: নিউজপ্রিন্ট লাইন রাস্টার'
                    : style === 'grain'
                    ? 'Xerox Grain: ভিন্টেজ ফটোকপিয়ার নয়েজ গ্রেইন (০.৫px - ২৫px)'
                    : style === 'xerox-solid'
                    ? "Xerox Grit: র' ফটোকপিয়ার টোনার গ্রিট (০.৫px - ২৫px)"
                    : style === 'crosshatch'
                    ? 'Crosshatch: ভিন্টেজ খোদাই ও ক্রস-হ্যাচিং'
                    : 'Diamond: রেট্রো ডায়মন্ড স্ক্রিন প্রিন্ট'
                }
                className={`py-1.5 px-0.5 rounded border text-center font-bold capitalize text-[8.5px] leading-tight transition-all cursor-pointer flex items-center justify-center min-h-[36px] overflow-hidden ${
                  settings.halftoneStyle === style
                    ? 'bg-blue-600 text-white border-blue-700 shadow-xs ring-1 ring-blue-400'
                    : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100 hover:border-slate-300'
                }`}
              >
                {style === 'dots'
                  ? 'Ben-Day'
                  : style === 'lines'
                  ? 'Lines'
                  : style === 'grain'
                  ? 'Xerox Grain'
                  : style === 'xerox-solid'
                  ? 'Xerox Grit'
                  : style === 'crosshatch'
                  ? 'Cross-Hatch'
                  : 'Diamond'}
              </button>
            ))}
          </div>

          {/* Dot Scale / Grain Size */}
          <div>
            <div className="flex justify-between items-center text-[11px] font-medium text-slate-700 mb-1">
              <span>
                {settings.halftoneStyle === 'grain'
                  ? 'Xerox Grain Size (গ্রেইন সাইজ: ০.৫px - ২৫px)'
                  : settings.halftoneStyle === 'xerox-solid'
                  ? 'Xerox Grit Size (টোনার সাইজ: ০.৫px - ২৫px)'
                  : 'Screen Frequency (Scale)'}
              </span>
              <div className="flex items-center bg-white border border-slate-300 focus-within:border-blue-600 focus-within:ring-1 focus-within:ring-blue-400 rounded px-1.5 py-0.5 shadow-2xs">
                <input
                  type="number"
                  min="0.5"
                  max="25"
                  step="0.5"
                  value={Number(settings.dotScale || 4)}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value);
                    if (!Number.isNaN(val) && val >= 0.1 && val <= 100) {
                      onUpdateSetting('dotScale', val);
                    }
                  }}
                  className="w-12 bg-transparent font-mono text-[11px] font-bold tabular-nums text-right text-blue-700 focus:outline-none"
                />
                <span className="text-[10px] font-mono font-bold text-blue-700 ml-0.5 select-none">px</span>
              </div>
            </div>
            <input
              type="range"
              min="0.5"
              max="25"
              step="0.5"
              value={settings.dotScale || 4}
              onMouseDown={onDragStart}
              onMouseUp={onDragEnd}
              onChange={(e) => onUpdateSetting('dotScale', parseFloat(e.target.value))}
              className="w-full accent-blue-600 h-1.5 bg-slate-200 rounded-lg cursor-pointer"
            />
            <div className="flex justify-between text-[9px] text-slate-400 font-mono mt-0.5">
              <span>0.5px (Micro Grain)</span>
              <span>4px (Standard)</span>
              <span>25px (Heavy Gritty)</span>
            </div>

            {/* Quick Grain Size Presets */}
            {(settings.halftoneStyle === 'grain' || settings.halftoneStyle === 'xerox-solid') && (
              <div className="flex items-center gap-1.5 mt-2 pt-1.5 border-t border-slate-100">
                <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider shrink-0">Grain Preset:</span>
                <div className="flex flex-wrap gap-1 w-full">
                  {[
                    { label: '0.5px', desc: 'Micro', value: 0.5 },
                    { label: '2px', desc: 'Fine', value: 2 },
                    { label: '5px', desc: 'Copier', value: 5 },
                    { label: '12px', desc: 'Coarse', value: 12 },
                    { label: '25px', desc: 'Max 25px', value: 25 },
                  ].map((p) => {
                    const isSelected = Math.abs(Number(settings.dotScale || 4) - p.value) < 0.2;
                    return (
                      <button
                        key={p.label}
                        type="button"
                        onClick={() => onUpdateSetting('dotScale', p.value)}
                        title={`Set grain size to ${p.label} (${p.desc})`}
                        className={`px-1.5 py-0.5 rounded text-[9.5px] font-mono font-bold transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-blue-600 text-white shadow-xs'
                            : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200/80'
                        }`}
                      >
                        {p.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Ink Density (Shadow depth) */}
          <div>
            <div className="flex justify-between text-[11px] font-medium text-slate-700 mb-1">
              <span>Ink Shadow Density</span>
              <span className="font-mono text-blue-700 font-bold">{settings.inkDensity || 85}%</span>
            </div>
            <input
              type="range"
              min="30"
              max="100"
              step="5"
              value={settings.inkDensity || 85}
              onMouseDown={onDragStart}
              onMouseUp={onDragEnd}
              onChange={(e) => onUpdateSetting('inkDensity', parseInt(e.target.value, 10))}
              className="w-full accent-blue-600 h-1.5 bg-slate-200 rounded-lg cursor-pointer"
            />
          </div>

          {/* Dot Angle */}
          <div>
            <div className="flex justify-between text-[11px] font-medium text-slate-700 mb-1">
              <span>Screen Rotation Angle</span>
              <span className="font-mono text-blue-700 font-bold">{settings.dotAngle}°</span>
            </div>
            <input
              type="range"
              min="0"
              max="90"
              step="5"
              value={settings.dotAngle}
              onMouseDown={onDragStart}
              onMouseUp={onDragEnd}
              onChange={(e) => onUpdateSetting('dotAngle', parseInt(e.target.value, 10))}
              className="w-full accent-blue-600 h-1.5 bg-slate-200 rounded-lg cursor-pointer"
            />
          </div>

          {/* Smart Auto Tone Button (ছবির আলো অনুযায়ী অটো ব্যালেন্স) */}
          {onAutoTone && (
            <div className="p-2 rounded-md bg-blue-50 border border-blue-200 flex items-center justify-between gap-2 shadow-2xs">
              <div className="min-w-0">
                <span className="text-[11px] font-bold text-blue-950 flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                  <span>Smart Auto Tone</span>
                </span>
                <span className="text-[10px] text-blue-800 block truncate">
                  অটো ব্যালেন্স ব্রাইটনেস ও কনট্রাস্ট
                </span>
              </div>
              <button
                type="button"
                onClick={onAutoTone}
                title="ছবির আলো-ছায়া ও কনট্রাস্ট বিশ্লেষণ করে পপ আর্ট অটো ব্যালেন্স করুন"
                className="px-2.5 py-1 rounded bg-blue-600 hover:bg-blue-700 active:scale-95 text-white text-[11px] font-bold flex items-center gap-1 transition-all cursor-pointer shadow-xs shrink-0 border border-blue-700"
              >
                <span>Auto Balance</span>
              </button>
            </div>
          )}

          {/* Contrast */}
          <div>
            <div className="flex justify-between items-center text-[11px] font-medium text-slate-700 mb-1">
              <span>Photocopy Contrast</span>
              <div className="flex items-center bg-white border border-slate-300 focus-within:border-blue-600 focus-within:ring-1 focus-within:ring-blue-400 rounded px-1.5 py-0.5 shadow-2xs">
                <span className="text-[10px] font-mono font-bold text-blue-700 mr-0.5 select-none">+</span>
                <input
                  type="number"
                  min="0"
                  max="90"
                  step="1"
                  value={Number(settings.contrast ?? 0)}
                  onChange={(e) => {
                    const val = parseInt(e.target.value, 10);
                    if (!Number.isNaN(val)) {
                      onUpdateSetting('contrast', Math.max(0, Math.min(90, val)));
                    }
                  }}
                  className="w-10 bg-transparent font-mono text-[11px] font-bold tabular-nums text-right text-blue-700 focus:outline-none"
                />
              </div>
            </div>
            <input
              type="range"
              min="0"
              max="90"
              step="1"
              value={Number(settings.contrast ?? 0)}
              onMouseDown={onDragStart}
              onMouseUp={onDragEnd}
              onChange={(e) => onUpdateSetting('contrast', parseInt(e.target.value, 10) || 0)}
              className="w-full accent-blue-600 h-1.5 bg-slate-200 rounded-lg cursor-pointer"
            />
          </div>

          {/* Brightness */}
          <div>
            <div className="flex justify-between items-center text-[11px] font-medium text-slate-700 mb-1">
              <span>Tonal Brightness</span>
              <div className="flex items-center bg-white border border-slate-300 focus-within:border-blue-600 focus-within:ring-1 focus-within:ring-blue-400 rounded px-1.5 py-0.5 shadow-2xs">
                {Number(settings.brightness ?? 0) > 0 && (
                  <span className="text-[10px] font-mono font-bold text-blue-700 mr-0.5 select-none">+</span>
                )}
                <input
                  type="number"
                  min="-50"
                  max="50"
                  step="1"
                  value={Number(settings.brightness ?? 0)}
                  onChange={(e) => {
                    const val = parseInt(e.target.value, 10);
                    if (!Number.isNaN(val)) {
                      onUpdateSetting('brightness', Math.max(-50, Math.min(50, val)));
                    }
                  }}
                  className="w-11 bg-transparent font-mono text-[11px] font-bold tabular-nums text-right text-blue-700 focus:outline-none"
                />
              </div>
            </div>
            <input
              type="range"
              min="-50"
              max="50"
              step="1"
              value={Number(settings.brightness ?? 0)}
              onMouseDown={onDragStart}
              onMouseUp={onDragEnd}
              onChange={(e) => onUpdateSetting('brightness', parseInt(e.target.value, 10) || 0)}
              className="w-full accent-blue-600 h-1.5 bg-slate-200 rounded-lg cursor-pointer"
            />
          </div>
        </div>
      </PopCollapsibleSection>

      {/* 06. Aged Newsprint & Paper Pulp */}
      <PopCollapsibleSection
        title="06. Aged Newsprint & Paper Pulp"
        defaultOpen={false}
        icon={<ScrollText className="w-3.5 h-3.5 text-amber-700" />}
      >
        <div className="space-y-2.5">
          <div className="grid grid-cols-4 gap-1">
            {(
              [
                ['newsprint', '📰 Newsprint'],
                ['aged-comic', '📚 Comic'],
                ['kraft', '📦 Kraft'],
                ['none', 'Clean'],
              ] as [PaperTextureStyle, string][]
            ).map(([style, label]) => (
              <button
                key={style}
                type="button"
                onClick={() => onUpdateSetting('paperTextureStyle', style)}
                className={`py-1 px-1 rounded border text-center font-medium text-[10px] cursor-pointer ${
                  settings.paperTextureStyle === style
                    ? 'bg-amber-100/70 border-amber-600 text-amber-950 font-bold'
                    : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {settings.paperTextureStyle !== 'none' && (
            <div>
              <div className="flex justify-between text-[11px] font-medium text-slate-700 mb-1">
                <span>Paper Fiber Intensity</span>
                <span className="font-mono text-amber-800 font-bold">{settings.paperTextureIntensity || 35}%</span>
              </div>
              <input
                type="range"
                min="10"
                max="80"
                step="5"
                value={settings.paperTextureIntensity || 35}
                onMouseDown={onDragStart}
                onMouseUp={onDragEnd}
                onChange={(e) => onUpdateSetting('paperTextureIntensity', parseInt(e.target.value, 10))}
                className="w-full accent-amber-700 h-1.5 bg-slate-200 rounded-lg cursor-pointer"
              />
            </div>
          )}
        </div>
      </PopCollapsibleSection>

      {/* 07. Misregistration Color Shift */}
      <PopCollapsibleSection
        title="07. Misregistration Color Shift"
        defaultOpen={false}
        icon={<Blend className="w-3.5 h-3.5 text-purple-600" />}
        headerAction={
          <label className="flex items-center gap-1.5 cursor-pointer">
            <input
              type="checkbox"
              checked={settings.colorShiftEnabled}
              onChange={(e) => onUpdateSetting('colorShiftEnabled', e.target.checked)}
              className="rounded text-purple-600 w-3.5 h-3.5"
            />
            <span className="text-[10px] font-semibold text-slate-600">Shift On</span>
          </label>
        }
      >
        {settings.colorShiftEnabled ? (
          <div className="space-y-2">
            <div>
              <div className="flex justify-between text-[11px] font-medium text-slate-700 mb-1">
                <span>Offset Horizontal (X)</span>
                <span className="font-mono text-purple-700 font-bold">{settings.colorShiftX}px</span>
              </div>
              <input
                type="range"
                min="-16"
                max="16"
                step="1"
                value={settings.colorShiftX}
                onMouseDown={onDragStart}
                onMouseUp={onDragEnd}
                onChange={(e) => onUpdateSetting('colorShiftX', parseInt(e.target.value, 10))}
                className="w-full accent-purple-600 h-1.5 bg-slate-200 rounded-lg cursor-pointer"
              />
            </div>

            <div>
              <div className="flex justify-between text-[11px] font-medium text-slate-700 mb-1">
                <span>Offset Vertical (Y)</span>
                <span className="font-mono text-purple-700 font-bold">{settings.colorShiftY}px</span>
              </div>
              <input
                type="range"
                min="-16"
                max="16"
                step="1"
                value={settings.colorShiftY}
                onMouseDown={onDragStart}
                onMouseUp={onDragEnd}
                onChange={(e) => onUpdateSetting('colorShiftY', parseInt(e.target.value, 10))}
                className="w-full accent-purple-600 h-1.5 bg-slate-200 rounded-lg cursor-pointer"
              />
            </div>
          </div>
        ) : (
          <div className="text-[11px] text-slate-400 italic py-1">
            কালার শিফট বন্ধ আছে। চালু করতে উপরের 'Shift On' চেক করুন।
          </div>
        )}
      </PopCollapsibleSection>

      {/* 08. Comic Sunburst Rays */}
      <PopCollapsibleSection
        title="08. Comic Sunburst Rays"
        defaultOpen={false}
        icon={<Sun className="w-3.5 h-3.5 text-amber-500" />}
        headerAction={
          <label className="flex items-center gap-1.5 cursor-pointer">
            <input
              type="checkbox"
              checked={settings.sunburstEnabled}
              onChange={(e) => onUpdateSetting('sunburstEnabled', e.target.checked)}
              className="rounded text-amber-500 w-3.5 h-3.5"
            />
            <span className="text-[10px] font-semibold text-slate-600">Rays On</span>
          </label>
        }
      >
        {settings.sunburstEnabled ? (
          <div className="space-y-2">
            <div>
              <div className="flex justify-between text-[11px] font-medium text-slate-700 mb-1">
                <span>Number of Rays</span>
                <span className="font-mono text-amber-700 font-bold">{settings.sunburstRays}</span>
              </div>
              <input
                type="range"
                min="12"
                max="40"
                step="2"
                value={settings.sunburstRays}
                onMouseDown={onDragStart}
                onMouseUp={onDragEnd}
                onChange={(e) => onUpdateSetting('sunburstRays', parseInt(e.target.value, 10))}
                className="w-full accent-amber-500 h-1.5 bg-slate-200 rounded-lg cursor-pointer"
              />
            </div>

            <div className="grid grid-cols-2 gap-1.5">
              <button
                type="button"
                onClick={() => onUpdateSetting('sunburstPosition', 'inside-object')}
                className={`py-1 px-1.5 rounded border text-center font-medium text-[10px] cursor-pointer ${
                  settings.sunburstPosition === 'inside-object'
                    ? 'bg-amber-100/60 border-amber-500 text-amber-900 font-bold'
                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                Inside Object
              </button>
              <button
                type="button"
                onClick={() => onUpdateSetting('sunburstPosition', 'behind-cutout')}
                className={`py-1 px-1.5 rounded border text-center font-medium text-[10px] cursor-pointer ${
                  settings.sunburstPosition === 'behind-cutout'
                    ? 'bg-amber-100/60 border-amber-500 text-amber-900 font-bold'
                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                Behind Cutout
              </button>
            </div>

            <div className="flex items-center justify-between pt-1">
              <span className="text-[11px] font-medium text-slate-700">Ray Colors</span>
              <div className="flex items-center gap-1.5">
                <input
                  type="color"
                  value={settings.sunburstColor1}
                  onChange={(e) => onUpdateSetting('sunburstColor1', e.target.value)}
                  className="w-6 h-6 rounded border border-slate-300 cursor-pointer p-0"
                />
                <input
                  type="color"
                  value={settings.sunburstColor2}
                  onChange={(e) => onUpdateSetting('sunburstColor2', e.target.value)}
                  className="w-6 h-6 rounded border border-slate-300 cursor-pointer p-0"
                />
              </div>
            </div>
          </div>
        ) : (
          <div className="text-[11px] text-slate-400 italic py-1">
            সানবার্স্ট রশ্মি বন্ধ আছে। চালু করতে উপরের 'Rays On' চেক করুন।
          </div>
        )}
      </PopCollapsibleSection>

      {/* 09. Comic Halftone Background */}
      <PopCollapsibleSection
        title="09. Comic Halftone Background"
        defaultOpen={false}
        icon={<Grid className="w-3.5 h-3.5 text-cyan-600" />}
        headerAction={
          <label className="flex items-center gap-1.5 cursor-pointer">
            <input
              type="checkbox"
              checked={settings.comicBgScreenEnabled}
              onChange={(e) => onUpdateSetting('comicBgScreenEnabled', e.target.checked)}
              className="rounded text-cyan-600 w-3.5 h-3.5"
            />
            <span className="text-[10px] font-semibold text-slate-600">Dots On</span>
          </label>
        }
      >
        {settings.comicBgScreenEnabled ? (
          <div className="space-y-2">
            <div>
              <div className="flex justify-between text-[11px] font-medium text-slate-700 mb-1">
                <span>Background Dot Size</span>
                <span className="font-mono text-cyan-700 font-bold">{settings.comicBgDotSize}px</span>
              </div>
              <input
                type="range"
                min="2"
                max="12"
                step="1"
                value={settings.comicBgDotSize}
                onMouseDown={onDragStart}
                onMouseUp={onDragEnd}
                onChange={(e) => onUpdateSetting('comicBgDotSize', parseInt(e.target.value, 10))}
                className="w-full accent-cyan-600 h-1.5 bg-slate-200 rounded-lg cursor-pointer"
              />
            </div>

            <div className="flex items-center justify-between">
              <span className="text-[11px] font-medium text-slate-700">Dot Color</span>
              <div className="flex items-center gap-1.5">
                <input
                  type="color"
                  value={settings.comicBgColor}
                  onChange={(e) => onUpdateSetting('comicBgColor', e.target.value)}
                  className="w-6 h-6 rounded border border-slate-300 cursor-pointer p-0"
                />
                <span className="font-mono text-[10px] text-slate-500 uppercase">{settings.comicBgColor}</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-[11px] text-slate-400 italic py-1">
            ব্যাকগ্রাউন্ড ডট স্ক্রিন বন্ধ আছে। চালু করতে উপরের 'Dots On' চেক করুন।
          </div>
        )}
      </PopCollapsibleSection>

      {/* 10. Artboard & Composition */}
      <PopCollapsibleSection
        title="10. Artboard & Composition"
        defaultOpen={false}
        icon={<Move className="w-3.5 h-3.5 text-amber-600" />}
      >
        <div className="space-y-3">
          {/* Shared Artboard Size Inputs */}
          <div className="space-y-1.5 pb-2 border-b border-slate-100">
            <span className="text-[10px] font-bold text-slate-600 uppercase tracking-wider block">
              Artboard Size (SVG Canvas)
            </span>
            <div className="flex items-center justify-between p-2 bg-amber-50/70 border border-amber-200/80 rounded-md">
              <div className="flex items-center gap-1.5 text-xs text-amber-900 font-medium">
                <span>🔒 Artboard Dimensions</span>
              </div>
              <span className="font-mono text-xs font-bold bg-amber-600 text-white px-2.5 py-0.5 rounded shadow-2xs">
                4000 × 4000 px (Locked)
              </span>
            </div>
            <p className="text-[10px] text-slate-500 leading-tight">
              Artboard is permanently locked at 4000×4000 px for print-ready production & Illustrator compatibility.
            </p>
          </div>

          {/* Artboard Background Color */}
          <div className="space-y-1.5 pb-2 border-b border-slate-100">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-slate-600 uppercase tracking-wider block">
                Artboard Background Color
              </span>
              <label className="flex items-center gap-1 cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.isBackgroundTransparent ?? false}
                  onChange={(e) => onUpdateSetting('isBackgroundTransparent', e.target.checked)}
                  className="rounded text-amber-600 w-3 h-3 cursor-pointer"
                />
                <span className="text-[10px] font-medium text-slate-600">Transparent</span>
              </label>
            </div>

            {!settings.isBackgroundTransparent ? (
              <div className="flex items-center justify-between gap-1.5 pt-0.5">
                <div className="flex items-center gap-1.5">
                  <input
                    type="color"
                    value={settings.backgroundColor || '#1C1D24'}
                    onChange={(e) => onUpdateSetting('backgroundColor', e.target.value)}
                    className="w-6 h-6 rounded border border-slate-300 cursor-pointer p-0"
                    title="Choose artboard background color"
                  />
                  <span className="font-mono text-[11px] font-bold text-slate-700 uppercase">
                    {settings.backgroundColor || '#1C1D24'}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => onUpdateSetting('backgroundColor', '#1C1D24')}
                    className="px-1.5 py-0.5 text-[9px] bg-slate-900 text-white rounded font-mono font-medium hover:bg-black cursor-pointer"
                  >
                    Dark
                  </button>
                  <button
                    type="button"
                    onClick={() => onUpdateSetting('backgroundColor', '#FFFFFF')}
                    className="px-1.5 py-0.5 text-[9px] bg-white text-slate-800 rounded border border-slate-300 font-mono font-medium hover:bg-slate-50 cursor-pointer"
                  >
                    White
                  </button>
                  <button
                    type="button"
                    onClick={() => onUpdateSetting('backgroundColor', '#F7F4EA')}
                    className="px-1.5 py-0.5 text-[9px] bg-amber-50 text-amber-900 rounded border border-amber-200 font-mono font-medium hover:bg-amber-100 cursor-pointer"
                  >
                    Paper
                  </button>
                  <button
                    type="button"
                    onClick={() => onUpdateSetting('backgroundColor', '#000000')}
                    className="px-1.5 py-0.5 text-[9px] bg-black text-white rounded font-mono font-medium hover:bg-slate-900 cursor-pointer"
                  >
                    Black
                  </button>
                </div>
              </div>
            ) : (
              <div className="text-[10px] text-slate-400 italic py-0.5">
                Artboard is transparent (Alpha channel enabled)
              </div>
            )}
          </div>

          {/* Quick Action Tools Row: Move Tool, Center, Fit */}
          <div className="grid grid-cols-3 gap-1.5">
            <button
              type="button"
              onClick={onToggleMoveTool}
              title="Move Tool: Click & drag subject on artboard to position"
              className={`py-1.5 px-2 rounded border flex items-center justify-center gap-1 font-semibold text-[11px] transition-all cursor-pointer ${
                isMoveToolActive
                  ? 'bg-amber-500 border-amber-600 text-white shadow-xs ring-1 ring-amber-400 font-bold'
                  : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50'
              }`}
            >
              <Move className="w-3 h-3" />
              <span>Move Tool</span>
            </button>

            <button
              type="button"
              onClick={() => {
                onUpdateSetting('offsetX', 0);
                onUpdateSetting('offsetY', 0);
                onUpdateSetting('colorShiftX', 0);
                onUpdateSetting('colorShiftY', 0);
              }}
              title="Center subject on artboard"
              className="py-1.5 px-2 rounded border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 flex items-center justify-center gap-1 font-semibold text-[11px] transition-colors cursor-pointer"
            >
              <Crosshair className="w-3 h-3" />
              <span>Center</span>
            </button>

            <button
              type="button"
              onClick={() => {
                onUpdateSetting('scale', 100);
                onUpdateSetting('offsetX', 0);
                onUpdateSetting('offsetY', 0);
              }}
              title="Fit subject to artboard"
              className="py-1.5 px-2 rounded border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 flex items-center justify-center gap-1 font-semibold text-[11px] transition-colors cursor-pointer"
            >
              <Maximize2 className="w-3 h-3" />
              <span>Fit</span>
            </button>
          </div>

          {/* Scale Slider */}
          <div className="space-y-1">
            <div className="flex items-center justify-between text-[11px] font-semibold text-slate-700">
              <span>Scale</span>
              <span className="font-mono text-amber-700 font-bold">{settings.scale ?? 100}%</span>
            </div>
            <input
              type="range"
              min="20"
              max="300"
              step="1"
              value={settings.scale ?? 100}
              onMouseDown={onDragStart}
              onMouseUp={onDragEnd}
              onChange={(e) => onUpdateSetting('scale', parseInt(e.target.value, 10))}
              className="w-full accent-amber-600 h-1.5 bg-slate-200 rounded-lg cursor-pointer"
            />
          </div>

          {/* Auto Fit Mode Section */}
          <div className="space-y-1.5 pt-1 border-t border-slate-100">
            <span className="text-[10px] font-bold text-slate-600 uppercase tracking-wider block">
              Auto Fit Mode
            </span>
            <div className="grid grid-cols-2 gap-1">
              {(
                [
                  { id: 'long-edge', label: 'Proportional Fit (Default)' },
                  { id: 'short-edge', label: 'Fit to Short Edge' },
                  { id: 'cover', label: 'Cover Artboard' },
                  { id: 'contain', label: 'Contain Artboard' },
                ] as { id: AutoFitMode; label: string }[]
              ).map((mode) => {
                const isSelected = (settings.autoFitMode ?? 'long-edge') === mode.id;
                return (
                  <button
                    key={mode.id}
                    type="button"
                    onClick={() => {
                      if (onUpdateMultipleSettings) {
                        onUpdateMultipleSettings({
                          autoFitMode: mode.id,
                          scale: 100,
                          offsetX: 0,
                          offsetY: 0,
                        });
                      } else {
                        onUpdateSetting('autoFitMode', mode.id);
                        onUpdateSetting('scale', 100);
                        onUpdateSetting('offsetX', 0);
                        onUpdateSetting('offsetY', 0);
                      }
                    }}
                    className={`py-1 px-1.5 rounded border text-[10px] font-semibold transition-all text-center truncate cursor-pointer ${
                      isSelected
                        ? 'bg-amber-100/90 border-amber-500 text-amber-950 font-bold ring-1 ring-amber-400'
                        : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    {mode.label}
                  </button>
                );
              })}
            </div>
          </div>


        </div>
      </PopCollapsibleSection>

      <PopCollapsibleSection
        title="11. Vector Optimization"
        defaultOpen={false}
        icon={<Maximize2 className="w-3.5 h-3.5 text-blue-600" />}
      >
        <div className="flex items-center justify-between py-1">
          <div>
            <span className="block text-xs font-semibold text-slate-900">
              Merge Vector Paths
            </span>
            <span className="block text-[10px] font-medium text-slate-800">
              Lightweight Mode
            </span>
          </div>
          <input
            type="checkbox"
            checked={settings.mergeShapes}
            onChange={(e) => onUpdateSetting('mergeShapes', e.target.checked)}
            className="accent-[#D97706] w-4 h-4 rounded cursor-pointer"
          />
        </div>
      </PopCollapsibleSection>
    </div>
  );
};
