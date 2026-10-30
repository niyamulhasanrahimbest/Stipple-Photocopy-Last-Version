import React, { useRef, useState } from 'react';
import {
  BookmarkPlus,
  Crosshair,
  FolderOpen,
  Maximize2,
  Move,
  RefreshCw,
  RotateCcw,
  Sliders,
  Sparkles,
  Trash2,
} from 'lucide-react';
import {
  AlphaMode,
  AutoFitMode,
  BackgroundMode,
  BUILT_IN_PRESETS,
  ColorMode,
  CropMode,
  DotShape,
  PatternType,
  PreviewQuality,
  StipplePreset,
  StippleSettings,
  StudioMode,
  VintagePopSettings,
} from '../types/stipple';
import { CollapsibleSection, SliderControl } from './StippleControls';
import { VintagePopControls } from './VintagePopControls';

interface LeftSidebarProps {
  settings: StippleSettings;
  uiMode: 'basic' | 'advanced';
  onSetUiMode: (mode: 'basic' | 'advanced') => void;
  onUpdateSetting: <K extends keyof StippleSettings>(
    key: K,
    value: StippleSettings[K]
  ) => void;
  onUpdateMultipleSettings: (partial: Partial<StippleSettings>) => void;
  onResetSection: (keys: (keyof StippleSettings)[]) => void;
  onSelectPreset: (preset: StipplePreset) => void;
  activePresetId: string | null;
  customPresets: StipplePreset[];
  onSaveCustomPreset: (name: string) => void;
  onDeleteCustomPreset: (id: string) => void;
  hasImage?: boolean;
  imageName?: string;
  onUploadFile?: (file: File) => void;
  onUploadBulkFiles?: (files: FileList | File[]) => void;
  onRemoveImage?: () => void;
  onDragStart: () => void;
  onDragEnd: () => void;
  filmstripCount?: number;
  onApplyToAll?: () => void;
  studioMode?: StudioMode;
  vintagePopSettings?: VintagePopSettings;
  onUpdateVintagePopSetting?: <K extends keyof VintagePopSettings>(
    key: K,
    value: VintagePopSettings[K]
  ) => void;
  onUpdateMultipleVintagePopSettings?: (partial: Partial<VintagePopSettings>) => void;
  onSelectVintagePopPreset?: (presetId: string) => void;
  activeVintagePopPresetId?: string;
  onResetVintagePop?: () => void;
  isMoveToolActive?: boolean;
  onToggleMoveTool?: () => void;
  onAutoTone?: () => void;
}

const DOT_SHAPES: { value: DotShape; label: string }[] = [
  { value: 'circle', label: 'Circle' },
  { value: 'ellipse', label: 'Ellipse' },
  { value: 'square', label: 'Square' },
  { value: 'rounded-square', label: 'Rounded Sq' },
  { value: 'diamond', label: 'Diamond' },
  { value: 'organic', label: 'Organic Ink' },
];

const PATTERN_TYPES: { value: PatternType; label: string; desc: string }[] = [
  {
    value: 'adaptive',
    label: 'Adaptive Stipple',
    desc: 'Multi-density contour-aware illustration packing',
  },
  {
    value: 'poisson',
    label: 'Poisson-like',
    desc: 'Blue-noise minimum-distance organic stipple',
  },
  {
    value: 'organic',
    label: 'Organic Spiral',
    desc: 'Golden-angle phyllotaxis with curl-flow relaxation',
  },
  {
    value: 'jittered',
    label: 'Jittered Grid',
    desc: 'Angled screen grid with stochastic displacement',
  },
  {
    value: 'regular',
    label: 'Regular Grid',
    desc: 'Classic mathematical halftone screen lattice',
  },
  {
    value: 'random',
    label: 'Random Scatter',
    desc: 'Monte-Carlo probability stipple distribution',
  },
];

export const LeftSidebar: React.FC<LeftSidebarProps> = ({
  settings,
  uiMode,
  onSetUiMode,
  onUpdateSetting,
  onUpdateMultipleSettings,
  onResetSection,
  onSelectPreset,
  activePresetId,
  customPresets,
  onSaveCustomPreset,
  onDeleteCustomPreset,
  hasImage,
  imageName,
  onUploadFile,
  onUploadBulkFiles,
  onRemoveImage,
  onDragStart,
  onDragEnd,
  filmstripCount = 0,
  onApplyToAll,
  studioMode = 'stipple',
  vintagePopSettings,
  onUpdateVintagePopSetting,
  onUpdateMultipleVintagePopSettings,
  onSelectVintagePopPreset,
  activeVintagePopPresetId,
  onResetVintagePop,
  isMoveToolActive = false,
  onToggleMoveTool,
  onAutoTone,
}) => {
  const [newPresetName, setNewPresetName] = useState('');
  const [presetToDeleteId, setPresetToDeleteId] = useState<string | null>(null);
  const [presetCategoryFilter, setPresetCategoryFilter] = useState<string>('All');

  const isAdv = uiMode === 'advanced';

  const allPresets = [...BUILT_IN_PRESETS, ...customPresets];
  const filteredPresets =
    presetCategoryFilter === 'All'
      ? allPresets
      : allPresets.filter((p) => p.category === presetCategoryFilter);

  return (
    <aside className="w-80 lg:w-[350px] bg-white border-r border-slate-200 flex flex-col h-full shrink-0 select-none text-slate-900">
      {/* Mode Switcher Bar */}
      <div className="px-3.5 py-2.5 border-b border-slate-200 flex items-center justify-between bg-slate-50">
        <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900">
          <Sliders className="w-3.5 h-3.5 text-[#D97706]" />
          <span>{studioMode === 'vintage-pop' ? 'Vintage Pop Controls' : 'Parameter Workspace'}</span>
        </div>
        {studioMode !== 'vintage-pop' && (
          <div className="flex items-center bg-slate-100 p-0.5 rounded-md border border-slate-300">
            <button
              type="button"
              onClick={() => onSetUiMode('basic')}
              className={`px-2.5 py-1 text-[11px] font-semibold rounded transition-colors whitespace-nowrap ${
                uiMode === 'basic'
                  ? 'bg-[#D97706] text-white shadow-sm'
                  : 'text-slate-900 hover:bg-slate-200'
              }`}
            >
              Basic Mode
            </button>
            <button
              type="button"
              onClick={() => onSetUiMode('advanced')}
              className={`px-2.5 py-1 text-[11px] font-semibold rounded transition-colors whitespace-nowrap ${
                uiMode === 'advanced'
                  ? 'bg-[#D97706] text-white shadow-sm'
                  : 'text-slate-900 hover:bg-slate-200'
              }`}
            >
              Advanced (All)
            </button>
          </div>
        )}
      </div>

      {/* Scrollable Sections Container */}
      <div className="flex-1 overflow-y-auto divide-y divide-slate-200">
        {/* VINTAGE POP CONTROLS (Rendered when in Vintage Pop Mode) */}
        {studioMode === 'vintage-pop' &&
          vintagePopSettings &&
          onUpdateVintagePopSetting &&
          onSelectVintagePopPreset && (
            <VintagePopControls
              settings={vintagePopSettings}
              onUpdateSetting={onUpdateVintagePopSetting}
              onUpdateMultipleSettings={onUpdateMultipleVintagePopSettings}
              onSelectPreset={onSelectVintagePopPreset}
              activePresetId={activeVintagePopPresetId || 'cmyk-golden-age'}
              onReset={onResetVintagePop || (() => {})}
              onDragStart={onDragStart}
              onDragEnd={onDragEnd}
              isMoveToolActive={isMoveToolActive}
              onToggleMoveTool={onToggleMoveTool}
              onAutoTone={onAutoTone}
            />
          )}

        {/* STIPPLE CONTROLS SECTIONS (Rendered when in Stipple Mode) */}
        {studioMode !== 'vintage-pop' && (
          <>
            {/* 1. PRESETS SECTION */}
            <CollapsibleSection
              title="01. Artistic Presets"
              defaultOpen={false}
              keysInSection={[]}
              currentSettings={settings}
              onResetSection={onResetSection}
            >
          {/* Category Filter Tabs */}
          <div className="flex items-center gap-1 overflow-x-auto pb-1">
            {['All', 'Classic', 'Halftone', 'Grunge & Print', 'Artistic', 'Custom'].map(
              (cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setPresetCategoryFilter(cat)}
                  className={`px-2 py-1 text-[11px] font-semibold rounded whitespace-nowrap transition-colors ${
                    presetCategoryFilter === cat
                      ? 'bg-[#D97706] text-white shadow-sm'
                      : 'bg-slate-100 text-slate-900 border border-slate-300 hover:bg-slate-200'
                  }`}
                >
                  {cat}
                </button>
              )
            )}
          </div>

          <div className="grid grid-cols-2 gap-1.5 max-h-52 overflow-y-auto pr-0.5">
            {filteredPresets.map((preset) => {
              const isActive = activePresetId === preset.id;
              return (
                <div
                  key={preset.id}
                  className={`group relative rounded border p-2 transition-colors flex flex-col justify-between ${
                    isActive
                      ? 'bg-amber-50 border-[#D97706]'
                      : 'bg-slate-50 border-slate-300 hover:border-slate-400'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => onSelectPreset(preset)}
                    className="text-left w-full focus:outline-none"
                  >
                    <div className="text-xs font-bold text-slate-900 truncate">
                      {preset.name}
                    </div>
                    <div className="text-[10px] font-medium text-slate-800 line-clamp-2 mt-0.5 leading-snug">
                      {preset.description}
                    </div>
                  </button>

                  {preset.isCustom && (
                    presetToDeleteId === preset.id ? (
                      <div className="absolute top-1.5 right-1.5 flex items-center gap-1 z-10 bg-white p-0.5 rounded shadow border border-slate-300">
                        <span className="text-[10px] font-bold text-red-600">মুছবেন?</span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onDeleteCustomPreset(preset.id);
                            setPresetToDeleteId(null);
                          }}
                          className="px-1.5 py-0.5 rounded bg-red-600 text-white text-[10px] font-bold"
                        >
                          হ্যাঁ
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setPresetToDeleteId(null);
                          }}
                          className="px-1.5 py-0.5 rounded bg-slate-200 text-slate-800 text-[10px] font-bold"
                        >
                          না
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setPresetToDeleteId(preset.id);
                        }}
                        title="Delete custom preset"
                        className="absolute top-1.5 right-1.5 p-1 text-slate-800 hover:text-red-700 rounded"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    )
                  )}
                </div>
              );
            })}
          </div>

          {/* Save Custom Preset to localStorage */}
          <div className="pt-2 border-t border-slate-200 flex items-center gap-1.5">
            <input
              type="text"
              value={newPresetName}
              onChange={(e) => setNewPresetName(e.target.value)}
              placeholder="Save current as preset..."
              className="flex-1 bg-white border border-slate-300 rounded px-2.5 py-1.5 text-xs font-medium text-slate-900 placeholder-slate-500 focus:outline-none focus:border-[#D97706]"
            />
            <button
              type="button"
              disabled={!newPresetName.trim()}
              onClick={() => {
                if (newPresetName.trim()) {
                  onSaveCustomPreset(newPresetName.trim());
                  setNewPresetName('');
                }
              }}
              className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-xs font-semibold text-slate-900 border border-slate-300 rounded flex items-center gap-1 whitespace-nowrap cursor-pointer disabled:opacity-50"
            >
              <BookmarkPlus className="w-3.5 h-3.5 text-[#D97706]" />
              <span>Save</span>
            </button>
          </div>
        </CollapsibleSection>

        {/* 2. BASIC DOT & SHAPE CONTROLS */}
        <CollapsibleSection
          title="02. Dots & Geometry"
          defaultOpen={false}
          keysInSection={[
            'dotSize',
            'dotDensity',
            'dotSpacing',
            'minDotSize',
            'maxDotSize',
            'dotVariation',
            'tonalResponse',
            'densityResponse',
            'dotShape',
            'dotRoundness',
            'dotAspect',
            'dotRotation',
            'rotationRandomness',
            'dotStretch',
            'dotSquash',
          ]}
          currentSettings={settings}
          onResetSection={onResetSection}
        >
          {/* Dot Shape Picker */}
          <div className="pb-1">
            <span className="block text-xs font-semibold text-slate-900 mb-1.5">
              Vector Dot Primitive Shape
            </span>
            <div className="grid grid-cols-3 gap-1.5">
              {DOT_SHAPES.map((s) => (
                <button
                  key={s.value}
                  type="button"
                  onClick={() => onUpdateSetting('dotShape', s.value)}
                  className={`py-1.5 px-2 text-xs font-semibold rounded border transition-colors whitespace-nowrap ${
                    settings.dotShape === s.value
                      ? 'bg-[#D97706] border-[#B45309] text-white shadow-sm'
                      : 'bg-slate-100 border-slate-300 text-slate-900 hover:bg-slate-200'
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          <SliderControl
            settingKey="dotSize"
            value={settings.dotSize}
            onChange={onUpdateSetting}
            onDragStart={onDragStart}
            onDragEnd={onDragEnd}
          />
          <SliderControl
            settingKey="dotDensity"
            value={settings.dotDensity}
            onChange={onUpdateSetting}
            onDragStart={onDragStart}
            onDragEnd={onDragEnd}
          />
          <SliderControl
            settingKey="dotSpacing"
            value={settings.dotSpacing}
            onChange={onUpdateSetting}
            onDragStart={onDragStart}
            onDragEnd={onDragEnd}
          />
          <SliderControl
            settingKey="dotVariation"
            value={settings.dotVariation}
            onChange={onUpdateSetting}
            onDragStart={onDragStart}
            onDragEnd={onDragEnd}
          />

          {isAdv && (
            <>
              <SliderControl
                settingKey="minDotSize"
                value={settings.minDotSize}
                onChange={onUpdateSetting}
                onDragStart={onDragStart}
                onDragEnd={onDragEnd}
              />
              <SliderControl
                settingKey="maxDotSize"
                value={settings.maxDotSize}
                onChange={onUpdateSetting}
                onDragStart={onDragStart}
                onDragEnd={onDragEnd}
              />
              <SliderControl
                settingKey="tonalResponse"
                value={settings.tonalResponse}
                onChange={onUpdateSetting}
                onDragStart={onDragStart}
                onDragEnd={onDragEnd}
              />
              <SliderControl
                settingKey="densityResponse"
                value={settings.densityResponse}
                onChange={onUpdateSetting}
                onDragStart={onDragStart}
                onDragEnd={onDragEnd}
              />
              <SliderControl
                settingKey="dotRoundness"
                value={settings.dotRoundness}
                onChange={onUpdateSetting}
                onDragStart={onDragStart}
                onDragEnd={onDragEnd}
                disabled={
                  settings.dotShape !== 'rounded-square' &&
                  settings.dotShape !== 'organic'
                }
                disabledReason="Active when Dot Shape is Rounded Sq or Organic Ink."
              />
              <SliderControl
                settingKey="dotAspect"
                value={settings.dotAspect}
                onChange={onUpdateSetting}
                onDragStart={onDragStart}
                onDragEnd={onDragEnd}
              />
              <SliderControl
                settingKey="dotRotation"
                value={settings.dotRotation}
                onChange={onUpdateSetting}
                onDragStart={onDragStart}
                onDragEnd={onDragEnd}
              />
              <SliderControl
                settingKey="rotationRandomness"
                value={settings.rotationRandomness}
                onChange={onUpdateSetting}
                onDragStart={onDragStart}
                onDragEnd={onDragEnd}
              />
              <SliderControl
                settingKey="dotStretch"
                value={settings.dotStretch}
                onChange={onUpdateSetting}
                onDragStart={onDragStart}
                onDragEnd={onDragEnd}
              />
              <SliderControl
                settingKey="dotSquash"
                value={settings.dotSquash}
                onChange={onUpdateSetting}
                onDragStart={onDragStart}
                onDragEnd={onDragEnd}
              />
            </>
          )}
        </CollapsibleSection>

        {/* 3. TONAL CONTROLS */}
        <CollapsibleSection
          title="03. Tonal Mapping & Response"
          defaultOpen={false}
          keysInSection={[
            'brightness',
            'contrast',
            'gamma',
            'blackLevel',
            'whiteLevel',
            'shadowStrength',
            'midtoneStrength',
            'highlightStrength',
            'threshold',
            'thresholdPoint',
            'invert',
          ]}
          currentSettings={settings}
          onResetSection={onResetSection}
        >
          {/* Smart Auto Tone Button (ছবির আলো অনুযায়ী অটো ব্যালেন্স) */}
          {onAutoTone && (
            <div className="mb-2.5 p-2 rounded-md bg-amber-50/90 border border-amber-300 flex items-center justify-between gap-2 shadow-2xs">
              <div className="min-w-0">
                <span className="text-[11px] font-bold text-amber-950 flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5 text-[#D97706]" />
                  <span>Smart Auto Tone</span>
                </span>
                <span className="text-[10px] text-amber-800 block truncate">
                  অটো ব্যালেন্স ব্রাইটনেস ও কনট্রাস্ট
                </span>
              </div>
              <button
                type="button"
                onClick={onAutoTone}
                title="ছবির আলো-ছায়া ও কনট্রাস্ট বিশ্লেষণ করে অটো ব্যালেন্স করুন"
                className="px-2.5 py-1 rounded bg-[#D97706] hover:bg-[#B45309] active:scale-95 text-white text-[11px] font-bold flex items-center gap-1 transition-all cursor-pointer shadow-xs shrink-0 border border-amber-600"
              >
                <span>Auto Balance</span>
              </button>
            </div>
          )}

          <SliderControl
            settingKey="brightness"
            value={settings.brightness}
            onChange={onUpdateSetting}
            onDragStart={onDragStart}
            onDragEnd={onDragEnd}
          />
          <SliderControl
            settingKey="contrast"
            value={settings.contrast}
            onChange={onUpdateSetting}
            onDragStart={onDragStart}
            onDragEnd={onDragEnd}
          />

          {isAdv && (
            <>
              <SliderControl
                settingKey="gamma"
                value={settings.gamma}
                onChange={onUpdateSetting}
                onDragStart={onDragStart}
                onDragEnd={onDragEnd}
              />
              <SliderControl
                settingKey="blackLevel"
                value={settings.blackLevel}
                onChange={onUpdateSetting}
                onDragStart={onDragStart}
                onDragEnd={onDragEnd}
              />
              <SliderControl
                settingKey="whiteLevel"
                value={settings.whiteLevel}
                onChange={onUpdateSetting}
                onDragStart={onDragStart}
                onDragEnd={onDragEnd}
              />
              <SliderControl
                settingKey="shadowStrength"
                value={settings.shadowStrength}
                onChange={onUpdateSetting}
                onDragStart={onDragStart}
                onDragEnd={onDragEnd}
              />
              <SliderControl
                settingKey="midtoneStrength"
                value={settings.midtoneStrength}
                onChange={onUpdateSetting}
                onDragStart={onDragStart}
                onDragEnd={onDragEnd}
              />
              <SliderControl
                settingKey="highlightStrength"
                value={settings.highlightStrength}
                onChange={onUpdateSetting}
                onDragStart={onDragStart}
                onDragEnd={onDragEnd}
              />
              <SliderControl
                settingKey="threshold"
                value={settings.threshold}
                onChange={onUpdateSetting}
                onDragStart={onDragStart}
                onDragEnd={onDragEnd}
              />
              <SliderControl
                settingKey="thresholdPoint"
                value={settings.thresholdPoint}
                onChange={onUpdateSetting}
                onDragStart={onDragStart}
                onDragEnd={onDragEnd}
                disabled={settings.threshold === 0}
                disabledReason="Increase Threshold Mix above 0% to activate cutoff."
              />
            </>
          )}

          <div className="pt-1 flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-900">
              Invert Tonal Luminance
            </span>
            <button
              type="button"
              onClick={() => onUpdateSetting('invert', !settings.invert)}
              className={`px-3 py-1 rounded text-xs font-semibold border transition-colors ${
                settings.invert
                  ? 'bg-[#D97706] border-[#B45309] text-white shadow-sm'
                  : 'bg-slate-100 border-slate-300 text-slate-900 hover:bg-slate-200'
              }`}
            >
              {settings.invert ? 'Inverted (Negative)' : 'Normal (Positive)'}
            </button>
          </div>
        </CollapsibleSection>

        {/* 4. HALFTONE PATTERN & ADAPTIVE STIPPLE */}
        <CollapsibleSection
          title="04. Distribution & Adaptive Mode"
          defaultOpen={false}
          keysInSection={[
            'patternType',
            'patternAngle',
            'patternScale',
            'cellSize',
            'cellSizeX',
            'cellSizeY',
            'independentCellScale',
            'adaptiveStrength',
            'edgeBias',
            'shadowDensity',
            'midtoneDensity',
            'highlightSparsity',
          ]}
          currentSettings={settings}
          onResetSection={onResetSection}
        >
          <div className="space-y-1.5 pb-2">
            <span className="block text-xs font-semibold text-slate-900">
              Distribution Algorithm
            </span>
            <div className="grid grid-cols-2 gap-1.5">
              {PATTERN_TYPES.map((pt) => (
                <button
                  key={pt.value}
                  type="button"
                  onClick={() => onUpdateSetting('patternType', pt.value)}
                  title={pt.desc}
                  className={`p-2 rounded border text-left transition-colors ${
                    settings.patternType === pt.value
                      ? 'bg-amber-50 border-[#D97706] text-slate-900'
                      : 'bg-slate-50 border-slate-300 text-slate-900 hover:border-slate-400'
                  }`}
                >
                  <div className="text-xs font-bold text-slate-900 truncate">{pt.label}</div>
                  <div className="text-[10px] font-medium text-slate-800 truncate mt-0.5">
                    {pt.desc}
                  </div>
                </button>
              ))}
            </div>
          </div>

          <SliderControl
            settingKey="patternAngle"
            value={settings.patternAngle}
            onChange={onUpdateSetting}
            onDragStart={onDragStart}
            onDragEnd={onDragEnd}
          />

          {isAdv && (
            <>
              <SliderControl
                settingKey="patternScale"
                value={settings.patternScale}
                onChange={onUpdateSetting}
                onDragStart={onDragStart}
                onDragEnd={onDragEnd}
              />

              <div className="flex items-center justify-between py-1">
                <span className="text-xs font-semibold text-slate-900">
                  Independent X/Y Cell Scaling
                </span>
                <input
                  type="checkbox"
                  checked={settings.independentCellScale}
                  onChange={(e) =>
                    onUpdateSetting('independentCellScale', e.target.checked)
                  }
                  className="accent-[#D97706] w-4 h-4 rounded cursor-pointer"
                />
              </div>

              {!settings.independentCellScale ? (
                <SliderControl
                  settingKey="cellSize"
                  value={settings.cellSize}
                  onChange={onUpdateSetting}
                  onDragStart={onDragStart}
                  onDragEnd={onDragEnd}
                />
              ) : (
                <>
                  <SliderControl
                    settingKey="cellSizeX"
                    value={settings.cellSizeX}
                    onChange={onUpdateSetting}
                    onDragStart={onDragStart}
                    onDragEnd={onDragEnd}
                  />
                  <SliderControl
                    settingKey="cellSizeY"
                    value={settings.cellSizeY}
                    onChange={onUpdateSetting}
                    onDragStart={onDragStart}
                    onDragEnd={onDragEnd}
                  />
                </>
              )}

              <div className="pt-2 border-t border-slate-200">
                <span className="block text-[11px] font-bold text-slate-900 mb-1">
                  Adaptive Stipple Response
                </span>
                <SliderControl
                  settingKey="adaptiveStrength"
                  value={settings.adaptiveStrength}
                  onChange={onUpdateSetting}
                  onDragStart={onDragStart}
                  onDragEnd={onDragEnd}
                />
                <SliderControl
                  settingKey="edgeBias"
                  value={settings.edgeBias}
                  onChange={onUpdateSetting}
                  onDragStart={onDragStart}
                  onDragEnd={onDragEnd}
                />
                <SliderControl
                  settingKey="shadowDensity"
                  value={settings.shadowDensity}
                  onChange={onUpdateSetting}
                  onDragStart={onDragStart}
                  onDragEnd={onDragEnd}
                />
                <SliderControl
                  settingKey="midtoneDensity"
                  value={settings.midtoneDensity}
                  onChange={onUpdateSetting}
                  onDragStart={onDragStart}
                  onDragEnd={onDragEnd}
                />
                <SliderControl
                  settingKey="highlightSparsity"
                  value={settings.highlightSparsity}
                  onChange={onUpdateSetting}
                  onDragStart={onDragStart}
                  onDragEnd={onDragEnd}
                />
              </div>
            </>
          )}
        </CollapsibleSection>

        {/* 5. DETAIL & EDGE PRESERVATION */}
        <CollapsibleSection
          title="05. Detail & Edge Preservation"
          defaultOpen={false}
          keysInSection={[
            'detail',
            'edgeStrength',
            'edgePreservation',
            'localContrast',
            'sharpen',
            'smoothing',
            'edgeDensity',
            'edgeDetail',
            'edgeContrast',
          ]}
          currentSettings={settings}
          onResetSection={onResetSection}
        >
          <SliderControl
            settingKey="detail"
            value={settings.detail}
            onChange={onUpdateSetting}
            onDragStart={onDragStart}
            onDragEnd={onDragEnd}
          />
          <SliderControl
            settingKey="edgeStrength"
            value={settings.edgeStrength}
            onChange={onUpdateSetting}
            onDragStart={onDragStart}
            onDragEnd={onDragEnd}
          />

          {isAdv && (
            <>
              <SliderControl
                settingKey="edgePreservation"
                value={settings.edgePreservation}
                onChange={onUpdateSetting}
                onDragStart={onDragStart}
                onDragEnd={onDragEnd}
              />
              <SliderControl
                settingKey="localContrast"
                value={settings.localContrast}
                onChange={onUpdateSetting}
                onDragStart={onDragStart}
                onDragEnd={onDragEnd}
              />
              <SliderControl
                settingKey="sharpen"
                value={settings.sharpen}
                onChange={onUpdateSetting}
                onDragStart={onDragStart}
                onDragEnd={onDragEnd}
              />
              <SliderControl
                settingKey="smoothing"
                value={settings.smoothing}
                onChange={onUpdateSetting}
                onDragStart={onDragStart}
                onDragEnd={onDragEnd}
              />
              <SliderControl
                settingKey="edgeDensity"
                value={settings.edgeDensity}
                onChange={onUpdateSetting}
                onDragStart={onDragStart}
                onDragEnd={onDragEnd}
              />
              <SliderControl
                settingKey="edgeDetail"
                value={settings.edgeDetail}
                onChange={onUpdateSetting}
                onDragStart={onDragStart}
                onDragEnd={onDragEnd}
              />
              <SliderControl
                settingKey="edgeContrast"
                value={settings.edgeContrast}
                onChange={onUpdateSetting}
                onDragStart={onDragStart}
                onDragEnd={onDragEnd}
              />
            </>
          )}
        </CollapsibleSection>

        {/* 6. ORGANIC & JITTER CONTROLS */}
        <CollapsibleSection
          title="06. Organic & Procedural Noise"
          defaultOpen={false}
          keysInSection={[
            'randomness',
            'jitter',
            'jitterX',
            'jitterY',
            'sizeRandomness',
            'positionRandomness',
            'organicity',
            'noise',
            'noiseScale',
            'noiseStrength',
          ]}
          currentSettings={settings}
          onResetSection={onResetSection}
        >
          <SliderControl
            settingKey="randomness"
            value={settings.randomness}
            onChange={onUpdateSetting}
            onDragStart={onDragStart}
            onDragEnd={onDragEnd}
          />
          <SliderControl
            settingKey="jitter"
            value={settings.jitter}
            onChange={onUpdateSetting}
            onDragStart={onDragStart}
            onDragEnd={onDragEnd}
          />

          {isAdv && (
            <>
              <SliderControl
                settingKey="jitterX"
                value={settings.jitterX}
                onChange={onUpdateSetting}
                onDragStart={onDragStart}
                onDragEnd={onDragEnd}
              />
              <SliderControl
                settingKey="jitterY"
                value={settings.jitterY}
                onChange={onUpdateSetting}
                onDragStart={onDragStart}
                onDragEnd={onDragEnd}
              />
              <SliderControl
                settingKey="sizeRandomness"
                value={settings.sizeRandomness}
                onChange={onUpdateSetting}
                onDragStart={onDragStart}
                onDragEnd={onDragEnd}
              />
              <SliderControl
                settingKey="positionRandomness"
                value={settings.positionRandomness}
                onChange={onUpdateSetting}
                onDragStart={onDragStart}
                onDragEnd={onDragEnd}
              />
              <SliderControl
                settingKey="organicity"
                value={settings.organicity}
                onChange={onUpdateSetting}
                onDragStart={onDragStart}
                onDragEnd={onDragEnd}
              />
              <SliderControl
                settingKey="noise"
                value={settings.noise}
                onChange={onUpdateSetting}
                onDragStart={onDragStart}
                onDragEnd={onDragEnd}
              />
              <SliderControl
                settingKey="noiseScale"
                value={settings.noiseScale}
                onChange={onUpdateSetting}
                onDragStart={onDragStart}
                onDragEnd={onDragEnd}
                disabled={settings.noise === 0}
                disabledReason="Increase Procedural Noise above 0% to adjust scale."
              />
              <SliderControl
                settingKey="noiseStrength"
                value={settings.noiseStrength}
                onChange={onUpdateSetting}
                onDragStart={onDragStart}
                onDragEnd={onDragEnd}
                disabled={settings.noise === 0}
                disabledReason="Increase Procedural Noise above 0% to adjust strength."
              />
            </>
          )}
        </CollapsibleSection>

        {/* 7. GRUNGE & DISTORTION */}
        <CollapsibleSection
          title="07. Grunge & Field Distortion"
          defaultOpen={false}
          keysInSection={[
            'grunge',
            'grungeScale',
            'grungeStrength',
            'distortion',
            'distortionScale',
            'distortionStrength',
          ]}
          currentSettings={settings}
          onResetSection={onResetSection}
        >
          <SliderControl
            settingKey="grunge"
            value={settings.grunge}
            onChange={onUpdateSetting}
            onDragStart={onDragStart}
            onDragEnd={onDragEnd}
          />

          {isAdv && (
            <>
              <SliderControl
                settingKey="grungeScale"
                value={settings.grungeScale}
                onChange={onUpdateSetting}
                onDragStart={onDragStart}
                onDragEnd={onDragEnd}
                disabled={settings.grunge === 0}
                disabledReason="Increase Grunge above 0% to adjust scale."
              />
              <SliderControl
                settingKey="grungeStrength"
                value={settings.grungeStrength}
                onChange={onUpdateSetting}
                onDragStart={onDragStart}
                onDragEnd={onDragEnd}
                disabled={settings.grunge === 0}
                disabledReason="Increase Grunge above 0% to adjust strength."
              />
              <SliderControl
                settingKey="distortion"
                value={settings.distortion}
                onChange={onUpdateSetting}
                onDragStart={onDragStart}
                onDragEnd={onDragEnd}
              />
              <SliderControl
                settingKey="distortionScale"
                value={settings.distortionScale}
                onChange={onUpdateSetting}
                onDragStart={onDragStart}
                onDragEnd={onDragEnd}
                disabled={settings.distortion === 0}
                disabledReason="Increase Distortion above 0% to adjust frequency."
              />
              <SliderControl
                settingKey="distortionStrength"
                value={settings.distortionStrength}
                onChange={onUpdateSetting}
                onDragStart={onDragStart}
                onDragEnd={onDragEnd}
                disabled={settings.distortion === 0}
                disabledReason="Increase Distortion above 0% to adjust amplitude."
              />
            </>
          )}
        </CollapsibleSection>

        {/* 8. COLOR MODES */}
        <CollapsibleSection
          title="08. Vector Color & Ink Layers"
          defaultOpen={false}
          keysInSection={[
            'colorMode',
            'inkColor',
            'secondaryInkColor',
            'colorCount',
            'colorSaturation',
            'colorBalance',
            'colorThreshold',
            'colorMix',
            'colorSeparation',
          ]}
          currentSettings={settings}
          onResetSection={onResetSection}
        >
          <div className="grid grid-cols-2 gap-1.5 pb-2">
            {(
              [
                { value: 'monochrome', label: 'Monochrome' },
                { value: 'duotone', label: 'Duotone Ink' },
                { value: 'multicolor', label: 'Multicolor Layers' },
                { value: 'original', label: 'Original Color' },
              ] as { value: ColorMode; label: string }[]
            ).map((cm) => (
              <button
                key={cm.value}
                type="button"
                onClick={() => onUpdateSetting('colorMode', cm.value)}
                className={`py-1.5 px-2 text-xs font-semibold rounded border transition-colors whitespace-nowrap ${
                  settings.colorMode === cm.value
                    ? 'bg-[#D97706] border-[#B45309] text-white shadow-sm'
                    : 'bg-slate-100 border-slate-300 text-slate-900 hover:bg-slate-200'
                }`}
              >
                {cm.label}
              </button>
            ))}
          </div>

          {(settings.colorMode === 'monochrome' ||
            settings.colorMode === 'duotone') && (
            <div className="flex items-center justify-between py-1">
              <label className="text-xs font-semibold text-slate-900">Primary Ink Color</label>
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-semibold text-slate-900 uppercase">
                  {settings.inkColor}
                </span>
                <input
                  type="color"
                  value={settings.inkColor}
                  onChange={(e) => onUpdateSetting('inkColor', e.target.value)}
                  className="w-7 h-6 rounded cursor-pointer bg-transparent border border-slate-300"
                />
              </div>
            </div>
          )}

          {settings.colorMode === 'duotone' && (
            <div className="flex items-center justify-between py-1">
              <label className="text-xs font-semibold text-slate-900">Secondary Ink Color</label>
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-semibold text-slate-900 uppercase">
                  {settings.secondaryInkColor}
                </span>
                <input
                  type="color"
                  value={settings.secondaryInkColor}
                  onChange={(e) =>
                    onUpdateSetting('secondaryInkColor', e.target.value)
                  }
                  className="w-7 h-6 rounded cursor-pointer bg-transparent border border-slate-300"
                />
              </div>
            </div>
          )}

          {settings.colorMode === 'multicolor' && (
            <SliderControl
              settingKey="colorCount"
              value={settings.colorCount}
              onChange={onUpdateSetting}
              onDragStart={onDragStart}
              onDragEnd={onDragEnd}
            />
          )}

          {(settings.colorMode === 'multicolor' ||
            settings.colorMode === 'original') && (
            <SliderControl
              settingKey="colorSaturation"
              value={settings.colorSaturation}
              onChange={onUpdateSetting}
              onDragStart={onDragStart}
              onDragEnd={onDragEnd}
            />
          )}

          {settings.colorMode !== 'monochrome' && (
            <>
              <SliderControl
                settingKey="colorBalance"
                value={settings.colorBalance}
                onChange={onUpdateSetting}
                onDragStart={onDragStart}
                onDragEnd={onDragEnd}
              />
              {settings.colorMode === 'duotone' && (
                <SliderControl
                  settingKey="colorThreshold"
                  value={settings.colorThreshold}
                  onChange={onUpdateSetting}
                  onDragStart={onDragStart}
                  onDragEnd={onDragEnd}
                />
              )}
              <SliderControl
                settingKey="colorMix"
                value={settings.colorMix}
                onChange={onUpdateSetting}
                onDragStart={onDragStart}
                onDragEnd={onDragEnd}
              />
              <SliderControl
                settingKey="colorSeparation"
                value={settings.colorSeparation}
                onChange={onUpdateSetting}
                onDragStart={onDragStart}
                onDragEnd={onDragEnd}
              />
            </>
          )}
        </CollapsibleSection>

        {/* 9. BACKGROUND & TRANSPARENCY */}
        <CollapsibleSection
          title="09. Paper Background & Alpha"
          defaultOpen={false}
          keysInSection={[
            'backgroundMode',
            'backgroundColor',
            'backgroundOpacity',
            'invertBackground',
            'alphaMode',
            'includeBgInStipple',
          ]}
          currentSettings={settings}
          onResetSection={onResetSection}
        >
          {/* Quick Transparent Mode ON/OFF Bar */}
          <div className="flex items-center justify-between p-2 mb-2 bg-emerald-50/80 rounded-md border border-emerald-200">
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
              onClick={() => {
                const nextVal = settings.backgroundMode !== 'transparent';
                onUpdateSetting('backgroundMode', nextVal ? 'transparent' : 'white');
                onUpdateSetting('isBackgroundTransparent', nextVal);
              }}
              className={`px-2.5 py-1 text-[11px] font-bold rounded cursor-pointer transition-all ${
                settings.backgroundMode === 'transparent' || settings.isBackgroundTransparent
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-50'
              }`}
            >
              {settings.backgroundMode === 'transparent' || settings.isBackgroundTransparent
                ? 'ON (স্বচ্ছ)'
                : 'OFF'}
            </button>
          </div>

          <div className="grid grid-cols-4 gap-1 pb-2">
            {(
              [
                { value: 'white', label: 'Paper' },
                { value: 'black', label: 'Black' },
                { value: 'custom', label: 'Custom' },
                { value: 'transparent', label: 'Alpha' },
              ] as { value: BackgroundMode; label: string }[]
            ).map((bm) => (
              <button
                key={bm.value}
                type="button"
                onClick={() => onUpdateSetting('backgroundMode', bm.value)}
                className={`py-1.5 px-1.5 text-xs font-semibold rounded border transition-colors whitespace-nowrap ${
                  settings.backgroundMode === bm.value
                    ? 'bg-[#D97706] border-[#B45309] text-white shadow-sm'
                    : 'bg-slate-100 border-slate-300 text-slate-900 hover:bg-slate-200'
                }`}
              >
                {bm.label}
              </button>
            ))}
          </div>

          {settings.backgroundMode === 'custom' && (
            <div className="flex items-center justify-between py-1">
              <label className="text-xs font-semibold text-slate-900">Custom Canvas Color</label>
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-semibold text-slate-900 uppercase">
                  {settings.backgroundColor}
                </span>
                <input
                  type="color"
                  value={settings.backgroundColor}
                  onChange={(e) =>
                    onUpdateSetting('backgroundColor', e.target.value)
                  }
                  className="w-7 h-6 rounded cursor-pointer bg-transparent border border-slate-300"
                />
              </div>
            </div>
          )}

          <SliderControl
            settingKey="backgroundOpacity"
            value={settings.backgroundOpacity}
            onChange={onUpdateSetting}
            onDragStart={onDragStart}
            onDragEnd={onDragEnd}
            disabled={settings.backgroundMode === 'transparent'}
            disabledReason="Background is currently set to Transparent."
          />

          <div className="flex items-center justify-between py-1">
            <span className="text-xs font-semibold text-slate-900">Invert Background Color</span>
            <input
              type="checkbox"
              checked={settings.invertBackground}
              onChange={(e) =>
                onUpdateSetting('invertBackground', e.target.checked)
              }
              className="accent-[#D97706] w-4 h-4 rounded cursor-pointer"
            />
          </div>

          {isAdv && (
            <>
              <div className="pt-1.5">
                <span className="block text-[11px] font-semibold text-slate-900 mb-1">
                  Source Alpha Channel Handling
                </span>
                <div className="grid grid-cols-3 gap-1">
                  {(
                    [
                      { value: 'preserve', label: 'Preserve' },
                      { value: 'ignore', label: 'Ignore' },
                      { value: 'fill', label: 'Fill BG' },
                    ] as { value: AlphaMode; label: string }[]
                  ).map((am) => (
                    <button
                      key={am.value}
                      type="button"
                      onClick={() => onUpdateSetting('alphaMode', am.value)}
                      className={`py-1 px-1.5 text-[11px] font-semibold rounded border transition-colors ${
                        settings.alphaMode === am.value
                          ? 'bg-[#D97706] border-[#B45309] text-white shadow-sm'
                          : 'bg-slate-100 border-slate-300 text-slate-900 hover:bg-slate-200'
                      }`}
                    >
                      {am.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between py-1.5">
                <span className="text-xs font-semibold text-slate-900">
                  Stipple Over Transparent Area
                </span>
                <input
                  type="checkbox"
                  checked={settings.includeBgInStipple}
                  onChange={(e) =>
                    onUpdateSetting('includeBgInStipple', e.target.checked)
                  }
                  className="accent-[#D97706] w-4 h-4 rounded cursor-pointer"
                />
              </div>
            </>
          )}
        </CollapsibleSection>

        {/* 10. COMPOSITION CONTROLS */}
        {isAdv && (
          <CollapsibleSection
            title="10. Artboard & Composition"
            defaultOpen={false}
            keysInSection={[
              'scale',
              'outputWidth',
              'outputHeight',
              'maintainAspectRatio',
              'padding',
              'margin',
              'offsetX',
              'offsetY',
              'cropMode',
            ]}
            currentSettings={settings}
            onResetSection={onResetSection}
          >
            <div className="grid grid-cols-2 gap-2 pb-1">
              <div>
                <label className="block text-[11px] font-semibold text-slate-900 mb-1">
                  SVG Width (px)
                </label>
                <input
                  type="number"
                  min={200}
                  max={4096}
                  value={settings.outputWidth}
                  onChange={(e) => {
                    const w = Math.max(200, Math.min(4096, Number(e.target.value) || 1000));
                    if (settings.maintainAspectRatio) {
                      const ratio = settings.outputHeight / Math.max(1, settings.outputWidth);
                      onUpdateMultipleSettings({
                        outputWidth: w,
                        outputHeight: Math.round(w * ratio),
                      });
                    } else {
                      onUpdateSetting('outputWidth', w);
                    }
                  }}
                  className="w-full bg-white border border-slate-300 rounded px-2 py-1 text-xs font-mono font-bold text-slate-900"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-900 mb-1">
                  SVG Height (px)
                </label>
                <input
                  type="number"
                  min={200}
                  max={4096}
                  value={settings.outputHeight}
                  onChange={(e) => {
                    const h = Math.max(200, Math.min(4096, Number(e.target.value) || 1000));
                    if (settings.maintainAspectRatio) {
                      const ratio = settings.outputWidth / Math.max(1, settings.outputHeight);
                      onUpdateMultipleSettings({
                        outputHeight: h,
                        outputWidth: Math.round(h * ratio),
                      });
                    } else {
                      onUpdateSetting('outputHeight', h);
                    }
                  }}
                  className="w-full bg-white border border-slate-300 rounded px-2 py-1 text-xs font-mono font-bold text-slate-900"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 pb-1">
              {(
                [
                  { label: 'Min (4000px)', size: 4000 },
                  { label: '4x (4096px)', size: 4096 },
                ] as const
              ).map((preset) => {
                const isActive =
                  Math.max(settings.outputWidth, settings.outputHeight) === preset.size;
                return (
                  <button
                    key={preset.label}
                    type="button"
                    onClick={() => {
                      if (settings.maintainAspectRatio) {
                        const w = Math.max(1, settings.outputWidth);
                        const h = Math.max(1, settings.outputHeight);
                        if (w >= h) {
                          onUpdateMultipleSettings({
                            outputWidth: preset.size,
                            outputHeight: Math.max(4000, Math.round((preset.size * h) / w)),
                          });
                        } else {
                          onUpdateMultipleSettings({
                            outputWidth: Math.max(4000, Math.round((preset.size * w) / h)),
                            outputHeight: preset.size,
                          });
                        }
                      } else {
                        onUpdateMultipleSettings({
                          outputWidth: preset.size,
                          outputHeight: preset.size,
                        });
                      }
                    }}
                    className={`py-1 px-2 text-xs font-mono font-bold rounded border transition-colors cursor-pointer ${
                      isActive
                        ? 'bg-[#D97706] border-[#B45309] text-white shadow-sm'
                        : 'bg-slate-100 border-slate-300 text-slate-900 hover:bg-slate-200'
                    }`}
                  >
                    {preset.label}
                  </button>
                );
              })}
            </div>

            <div className="flex items-center justify-between py-1">
              <span className="text-xs font-semibold text-slate-900">Maintain Aspect Ratio</span>
              <input
                type="checkbox"
                checked={settings.maintainAspectRatio}
                onChange={(e) =>
                  onUpdateSetting('maintainAspectRatio', e.target.checked)
                }
                className="accent-[#D97706] w-4 h-4 rounded cursor-pointer"
              />
            </div>

            {/* Subject Position & Size */}
            <div className="p-2.5 my-2 rounded-lg bg-amber-50/70 border border-amber-200/90 space-y-2.5">
              <div className="flex items-center gap-1.5 font-bold text-xs text-slate-900">
                <Move className="w-3.5 h-3.5 text-amber-600" />
                <span>Subject Position & Size</span>
              </div>

              {/* Action Buttons: Move Tool, Center, Fit */}
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
                  onClick={() => onUpdateMultipleSettings({ offsetX: 0, offsetY: 0 })}
                  title="Center subject on artboard"
                  className="py-1.5 px-2 rounded border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 flex items-center justify-center gap-1 font-semibold text-[11px] transition-colors cursor-pointer"
                >
                  <Crosshair className="w-3 h-3" />
                  <span>Center</span>
                </button>

                <button
                  type="button"
                  onClick={() => onUpdateMultipleSettings({ scale: 100, offsetX: 0, offsetY: 0 })}
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
                  <span className="font-mono text-amber-700 font-bold">{settings.scale}%</span>
                </div>
                <input
                  type="range"
                  min="20"
                  max="300"
                  step="1"
                  value={settings.scale}
                  onMouseDown={onDragStart}
                  onMouseUp={onDragEnd}
                  onChange={(e) => onUpdateSetting('scale', parseInt(e.target.value, 10))}
                  className="w-full accent-amber-600 h-1.5 bg-slate-200 rounded-lg cursor-pointer"
                />
              </div>

              {/* Auto Fit Mode Section */}
              <div className="space-y-1.5 pt-1 border-t border-amber-200/60">
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
                          onUpdateMultipleSettings({
                            autoFitMode: mode.id,
                            scale: 100,
                            offsetX: 0,
                            offsetY: 0,
                          });
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

            <div className="py-1">
              <span className="block text-[11px] font-semibold text-slate-900 mb-1">Crop / Fit Mode</span>
              <div className="grid grid-cols-4 gap-1">
                {(['fit', 'fill', 'crop', 'stretch'] as CropMode[]).map((cm) => (
                  <button
                    key={cm}
                    type="button"
                    onClick={() => onUpdateSetting('cropMode', cm)}
                    className={`py-1 px-1.5 text-xs capitalize font-semibold rounded border ${
                      settings.cropMode === cm
                        ? 'bg-[#D97706] border-[#B45309] text-white shadow-sm'
                        : 'bg-slate-100 border-slate-300 text-slate-900 hover:bg-slate-200'
                    }`}
                  >
                    {cm}
                  </button>
                ))}
              </div>
              {settings.cropMode === 'stretch' && (
                <p className="text-[11px] font-semibold text-[#B45309] mt-1">
                  Warning: Stretch mode distorts original image proportions.
                </p>
              )}
            </div>

            <SliderControl
              settingKey="scale"
              value={settings.scale}
              onChange={onUpdateSetting}
              onDragStart={onDragStart}
              onDragEnd={onDragEnd}
            />
            <SliderControl
              settingKey="padding"
              value={settings.padding}
              onChange={onUpdateSetting}
              onDragStart={onDragStart}
              onDragEnd={onDragEnd}
            />
            <SliderControl
              settingKey="margin"
              value={settings.margin}
              onChange={onUpdateSetting}
              onDragStart={onDragStart}
              onDragEnd={onDragEnd}
            />
            <SliderControl
              settingKey="offsetX"
              value={settings.offsetX}
              onChange={onUpdateSetting}
              onDragStart={onDragStart}
              onDragEnd={onDragEnd}
            />
            <SliderControl
              settingKey="offsetY"
              value={settings.offsetY}
              onChange={onUpdateSetting}
              onDragStart={onDragStart}
              onDragEnd={onDragEnd}
            />

            <button
              type="button"
              onClick={() =>
                onUpdateMultipleSettings({ offsetX: 0, offsetY: 0, scale: 100 })
              }
              className="w-full mt-1 py-1.5 px-3 text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-900 border border-slate-300 rounded transition-colors"
            >
              Center Artwork on Artboard
            </button>
          </CollapsibleSection>
        )}

        {/* 11. VECTOR QUALITY & OPTIMIZATION */}
        <CollapsibleSection
          title="11. Vector Quality & SVG Precision"
          defaultOpen={false}
          keysInSection={[
            'previewQuality',
            'vectorResolution',
            'svgPrecision',
            'pathOptimization',
            'simplifyVector',
          ]}
          currentSettings={settings}
          onResetSection={onResetSection}
        >
          <div className="pb-1.5">
            <span className="block text-xs font-semibold text-slate-900 mb-1">
              Sampling / Generation Quality
            </span>
            <div className="grid grid-cols-4 gap-1">
              {(
                [
                  { value: 'fast', label: 'Fast' },
                  { value: 'balanced', label: 'Balanced' },
                  { value: 'high', label: 'High' },
                  { value: 'maximum', label: 'Maximum' },
                ] as { value: PreviewQuality; label: string }[]
              ).map((pq) => (
                <button
                  key={pq.value}
                  type="button"
                  onClick={() => onUpdateSetting('previewQuality', pq.value)}
                  className={`py-1.5 px-1 text-xs font-semibold rounded border transition-colors ${
                    settings.previewQuality === pq.value
                      ? 'bg-[#D97706] border-[#B45309] text-white shadow-sm'
                      : 'bg-slate-100 border-slate-300 text-slate-900 hover:bg-slate-200'
                  }`}
                >
                  {pq.label}
                </button>
              ))}
            </div>
          </div>

          <SliderControl
            settingKey="vectorResolution"
            value={settings.vectorResolution}
            onChange={onUpdateSetting}
            onDragStart={onDragStart}
            onDragEnd={onDragEnd}
          />
          <SliderControl
            settingKey="svgPrecision"
            value={settings.svgPrecision}
            onChange={onUpdateSetting}
            onDragStart={onDragStart}
            onDragEnd={onDragEnd}
          />
          <SliderControl
            settingKey="simplifyVector"
            value={settings.simplifyVector}
            onChange={onUpdateSetting}
            onDragStart={onDragStart}
            onDragEnd={onDragEnd}
          />

          <div className="flex items-center justify-between py-1">
            <span className="text-xs font-semibold text-slate-900">
              SVG Coordinate Optimization
            </span>
            <input
              type="checkbox"
              checked={settings.pathOptimization}
              onChange={(e) =>
                onUpdateSetting('pathOptimization', e.target.checked)
              }
              className="accent-[#D97706] w-4 h-4 rounded cursor-pointer"
            />
          </div>
        </CollapsibleSection>

        {/* 12. VECTOR OPTIMIZATION */}
        <CollapsibleSection
          title="12. Vector Optimization"
          defaultOpen={false}
          keysInSection={['mergeShapes']}
          currentSettings={settings}
          onResetSection={onResetSection}
        >
          <div className="flex items-center justify-between py-1">
            <div>
              <span className="block text-xs font-semibold text-slate-900">
                Merge Identical Color Layer Paths
              </span>
              <span className="block text-[10px] font-medium text-slate-800">
                Unchecked: individual &lt;circle&gt;/&lt;path&gt; nodes
              </span>
            </div>
            <input
              type="checkbox"
              checked={settings.mergeShapes}
              onChange={(e) => onUpdateSetting('mergeShapes', e.target.checked)}
              className="accent-[#D97706] w-4 h-4 rounded cursor-pointer"
            />
          </div>
        </CollapsibleSection>
        </>
      )}
      </div>
    </aside>
  );
};
