import React, { useState } from 'react';
import { ChevronDown, ChevronRight, HelpCircle, RotateCcw } from 'lucide-react';
import {
  DEFAULT_STIPPLE_SETTINGS,
  SLIDER_DEFINITIONS,
  StippleSettings,
} from '../types/stipple';

interface SliderControlProps {
  settingKey: keyof StippleSettings;
  value: number;
  onChange: (key: keyof StippleSettings, value: number) => void;
  onDragStart?: () => void;
  onDragEnd?: () => void;
  disabled?: boolean;
  disabledReason?: string;
}

export const SliderControl: React.FC<SliderControlProps> = ({
  settingKey,
  value,
  onChange,
  onDragStart,
  onDragEnd,
  disabled = false,
  disabledReason,
}) => {
  const [showTooltip, setShowTooltip] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [draftValue, setDraftValue] = useState('');
  const meta = SLIDER_DEFINITIONS[settingKey as string];
  if (!meta) return null;

  const defaultValue = DEFAULT_STIPPLE_SETTINGS[settingKey] as number;
  const isModified = Math.abs(value - defaultValue) > 1e-4;

  const formattedVal =
    meta.step < 1
      ? Number(value.toFixed(meta.step < 0.01 ? 3 : meta.step < 0.1 ? 2 : 1)).toString()
      : Math.round(value).toString();

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    setDraftValue(raw);
    const parsed = parseFloat(raw);
    if (!Number.isNaN(parsed)) {
      onChange(settingKey, parsed);
    }
  };

  const handleInputBlur = () => {
    setIsEditing(false);
    const parsed = parseFloat(draftValue);
    if (!Number.isNaN(parsed)) {
      onChange(settingKey, parsed);
    }
  };

  return (
    <div className="group relative py-1.5">
      <div className="flex items-center justify-between gap-2 mb-1">
        <div className="flex items-center gap-1.5 min-w-0">
          <label
            htmlFor={`slider-${String(settingKey)}`}
            className="text-xs font-semibold text-slate-900 truncate select-none cursor-pointer"
          >
            {meta.label}
          </label>
          <button
            type="button"
            onClick={() => setShowTooltip((prev) => !prev)}
            onMouseEnter={() => setShowTooltip(true)}
            onMouseLeave={() => setShowTooltip(false)}
            aria-label={`Help for ${meta.label}`}
            className="text-slate-600 hover:text-[#D97706] transition-colors shrink-0 focus:outline-none"
          >
            <HelpCircle className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <div className="flex items-center bg-white border border-slate-300 focus-within:border-[#D97706] rounded px-1.5 py-0.5">
            <input
              type="number"
              step={meta.step}
              disabled={disabled}
              value={isEditing ? draftValue : formattedVal}
              onFocus={(e) => {
                setIsEditing(true);
                setDraftValue(String(value));
                e.target.select();
              }}
              onChange={handleInputChange}
              onBlur={handleInputBlur}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  (e.target as HTMLInputElement).blur();
                }
              }}
              className={`w-14 bg-transparent font-mono text-xs font-bold tabular-nums text-right focus:outline-none ${
                isModified ? 'text-[#B45309]' : 'text-slate-900'
              }`}
            />
            {meta.unit ? (
              <span className="text-[10px] font-mono font-semibold text-slate-600 ml-0.5 select-none">
                {meta.unit}
              </span>
            ) : null}
          </div>

          <button
            type="button"
            disabled={disabled || !isModified}
            onClick={() => onChange(settingKey, defaultValue)}
            title={`Reset ${meta.label} to ${defaultValue}${meta.unit || ''}`}
            className={`p-0.5 rounded transition-colors ${
              isModified && !disabled
                ? 'text-slate-800 hover:text-[#B45309] hover:bg-slate-200'
                : 'text-slate-400 cursor-default'
            }`}
          >
            <RotateCcw className="w-3 h-3" />
          </button>
        </div>
      </div>

      <input
        id={`slider-${String(settingKey)}`}
        type="range"
        min={meta.min}
        max={meta.max}
        step={meta.step}
        value={value}
        disabled={disabled}
        onMouseDown={onDragStart}
        onMouseUp={onDragEnd}
        onTouchStart={onDragStart}
        onTouchEnd={onDragEnd}
        onChange={(e) => onChange(settingKey, parseFloat(e.target.value))}
        className="w-full stipple-slider block"
      />

      {disabled && disabledReason && (
        <p className="text-[11px] text-slate-700 font-medium mt-1 leading-tight">
          {disabledReason}
        </p>
      )}

      {showTooltip && (
        <div className="mt-1.5 p-2.5 rounded bg-slate-50 border border-slate-300 text-[11px] text-slate-900 font-medium leading-relaxed shadow-md z-20">
          <p>{meta.tooltip}</p>
          <p className="text-[11px] text-[#B45309] font-mono font-semibold mt-1">
            Range: {meta.min} – {meta.max} {meta.unit || ''} · Default: {defaultValue}
          </p>
        </div>
      )}
    </div>
  );
};

interface CollapsibleSectionProps {
  title: string;
  defaultOpen?: boolean;
  keysInSection: (keyof StippleSettings)[];
  currentSettings: StippleSettings;
  onResetSection: (keys: (keyof StippleSettings)[]) => void;
  children: React.ReactNode;
}

export const CollapsibleSection: React.FC<CollapsibleSectionProps> = ({
  title,
  defaultOpen = false,
  keysInSection,
  currentSettings,
  onResetSection,
  children,
}) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  const modifiedCount = keysInSection.filter((k) => {
    const curr = currentSettings[k];
    const def = DEFAULT_STIPPLE_SETTINGS[k];
    if (typeof curr === 'number' && typeof def === 'number') {
      return Math.abs(curr - def) > 1e-4;
    }
    return curr !== def;
  }).length;

  return (
    <div className="border-b border-slate-200">
      <div className="flex items-center justify-between px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200/70 transition-colors">
        <button
          type="button"
          onClick={() => setIsOpen((prev) => !prev)}
          className="flex items-center gap-2 text-left flex-1 min-w-0 focus:outline-none"
        >
          {isOpen ? (
            <ChevronDown className="w-3.5 h-3.5 text-slate-900 shrink-0" />
          ) : (
            <ChevronRight className="w-3.5 h-3.5 text-slate-900 shrink-0" />
          )}
          <span className="text-xs font-bold tracking-wide text-slate-900 truncate">
            {title}
          </span>
          {modifiedCount > 0 && (
            <span className="text-[11px] font-mono font-bold text-[#B45309] shrink-0">
              · {modifiedCount} edited
            </span>
          )}
        </button>

        {modifiedCount > 0 && (
          <button
            type="button"
            onClick={() => onResetSection(keysInSection)}
            title={`Reset all controls in ${title}`}
            className="text-[11px] font-semibold text-slate-900 hover:text-[#B45309] flex items-center gap-1 px-1.5 py-0.5 rounded bg-white border border-slate-300 hover:bg-slate-50 transition-colors shrink-0"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Reset</span>
          </button>
        )}
      </div>

      {isOpen && (
        <div className="px-3.5 py-2.5 bg-white space-y-1.5">{children}</div>
      )}
    </div>
  );
};
