/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Printer,
  Sparkles,
} from 'lucide-react';
import {
  BUILT_IN_PRESETS,
  DEFAULT_STIPPLE_SETTINGS,
  DEFAULT_VINTAGE_POP_SETTINGS,
  GenerationStats,
  StipplePreset,
  StippleSettings,
  StudioMode,
  VINTAGE_POP_PRESETS,
  VintagePopSettings,
  ViewComparisonMode,
  FilmstripItem,
  FilmstripViewState,
} from './types/stipple';
import { AnalyzedImageBuffer, analyzeImage, computeAdaptiveToneProfile } from './engine/ImageAnalyzer';
import { generateStippleVectors } from './engine/StippleEngine';
import {
  buildSVGDocument,
  exportRasterFromSVG,
  validateSVGDocument,
} from './engine/SVGRenderer';
import { renderVintagePop, VintagePopResult } from './engine/VintagePopEngine';
import { LeftSidebar } from './components/LeftSidebar';
import { PreviewWorkspace } from './components/PreviewWorkspace';
import { RightPanel } from './components/RightPanel';

const CUSTOM_PRESETS_STORAGE_KEY = 'vector_stipple_lab_custom_presets_v1';
const LAST_SETTINGS_STORAGE_KEY = 'vector_stipple_lab_last_settings_v4';
const FILMSTRIP_VIEW_STORAGE_KEY = 'vector_stipple_filmstrip_view_mode_v1';

export default function App() {
  // Studio Mode State: 'stipple' (Classic Stipple Maker) vs 'vintage-pop' (Retro Pop Collage)
  const [studioMode, setStudioMode] = useState<StudioMode>('stipple');
  const [vintagePopSettings, setVintagePopSettings] = useState<VintagePopSettings>(DEFAULT_VINTAGE_POP_SETTINGS);
  const [activeVintagePopPresetId, setActiveVintagePopPresetId] = useState<string>('cmyk-golden-age');
  const [vintagePopOutput, setVintagePopOutput] = useState<VintagePopResult | null>(null);
  const [isMoveToolActive, setIsMoveToolActive] = useState<boolean>(false);

  // Core Parameter State
  const [settings, setSettings] = useState<StippleSettings>(DEFAULT_STIPPLE_SETTINGS);
  const [uiMode, setUiMode] = useState<'basic' | 'advanced'>('advanced');
  const [viewMode, setViewMode] = useState<ViewComparisonMode>('vector');
  const [activePresetId, setActivePresetId] = useState<string | null>('classic-stipple');

  // Undo / Redo History Stack
  const [history, setHistory] = useState<StippleSettings[]>([DEFAULT_STIPPLE_SETTINGS]);
  const [historyIndex, setHistoryIndex] = useState<number>(0);
  const isDraggingSliderRef = useRef<boolean>(false);
  const [isDraggingSlider, setIsDraggingSlider] = useState<boolean>(false);

  // Source Image State
  const [sourceImageElement, setSourceImageElement] =
    useState<HTMLImageElement | null>(null);
  const [sourceDataUrl, setSourceDataUrl] = useState<string | null>(null);
  const [imageName, setImageName] = useState<string>('');
  const [externalBulkFiles, setExternalBulkFiles] = useState<File[] | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [statusToast, setStatusToast] = useState<string | null>(null);

  // Filmstrip Multiple Images State
  const [filmstripImages, setFilmstripImages] = useState<FilmstripItem[]>([]);
  const [activeFilmstripId, setActiveFilmstripId] = useState<string | null>(null);
  const activeFilmstripIdRef = useRef<string | null>(null);
  activeFilmstripIdRef.current = activeFilmstripId;

  // Signal for broadcasting current settings across all batch images
  const [applyToAllSignal, setApplyToAllSignal] = useState<{
    settings: StippleSettings;
    vintagePopSettings?: VintagePopSettings;
    studioMode?: StudioMode;
    timestamp: number;
  } | null>(null);

  // Independent Edit Mode vs Synchronized Broadcast Mode
  // When false (default): each image has its own isolated settings, so editing one does not affect others
  // When true: changes apply simultaneously to all images in the filmstrip and queue
  const [isSyncAllEnabled, setIsSyncAllEnabled] = useState<boolean>(false);
  const isSyncAllEnabledRef = useRef<boolean>(false);
  isSyncAllEnabledRef.current = isSyncAllEnabled;

  const handleToggleSyncAll = useCallback(() => {
    setIsSyncAllEnabled((prev) => {
      const next = !prev;
      setStatusToast(
        next
          ? '🔗 Sync All চালু হয়েছে! এখন কোনো স্লাইডার পরিবর্তন করলে সব ছবিতে একসাথে হবে। (Live Sync ON)'
          : '🔓 আলাদা এডিট মোড সক্রিয়! প্রতিটি ছবির সেটিংস সম্পূর্ণ আলাদাভাবে সংরক্ষিত থাকবে। (Independent Edit Mode)'
      );
      setTimeout(() => setStatusToast(null), 3500);
      return next;
    });
  }, []);

  const [filmstripViewState, setFilmstripViewState] = useState<FilmstripViewState>(() => {
    try {
      const saved = localStorage.getItem(FILMSTRIP_VIEW_STORAGE_KEY);
      if (saved === 'minimized' || saved === 'normal' || saved === 'maximized') {
        return saved;
      }
    } catch {
      // Ignore
    }
    return 'normal';
  });

  // Cross-Component Synchronization Signals (Bulk Queue & Filmstrip)
  const [clearQueueSignal, setClearQueueSignal] = useState<number>(0);
  const [removeBulkItemSignal, setRemoveBulkItemSignal] = useState<{
    name: string;
    timestamp: number;
  } | null>(null);

  const handleSetFilmstripViewState = useCallback((state: FilmstripViewState) => {
    setFilmstripViewState(state);
    try {
      localStorage.setItem(FILMSTRIP_VIEW_STORAGE_KEY, state);
    } catch {
      // Ignore
    }
  }, []);

  // Custom Presets from localStorage
  const [customPresets, setCustomPresets] = useState<StipplePreset[]>(() => {
    try {
      const saved = localStorage.getItem(CUSTOM_PRESETS_STORAGE_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Save current settings to localStorage (debounced so slider dragging stays 60fps smooth)
  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        localStorage.setItem(LAST_SETTINGS_STORAGE_KEY, JSON.stringify(settings));
      } catch {
        // Ignore storage quota errors
      }
    }, 350);
    return () => window.clearTimeout(timer);
  }, [settings]);

  // Push a new snapshot onto the Undo/Redo history stack
  const pushHistorySnapshot = useCallback((nextSettings: StippleSettings) => {
    setHistory((prev) => {
      const sliced = prev.slice(0, historyIndex + 1);
      const updated = [...sliced, nextSettings].slice(-40);
      setHistoryIndex(updated.length - 1);
      return updated;
    });
  }, [historyIndex]);

  // Helper to synchronize active filmstrip item's custom settings without affecting other images
  const syncActiveItemSettings = useCallback(
    (newSettings: StippleSettings, isCustomized = true) => {
      const activeId = activeFilmstripIdRef.current;
      if (!activeId) return;
      setFilmstripImages((prev) =>
        prev.map((item) =>
          item.id === activeId
            ? { ...item, settings: { ...newSettings }, isCustomized }
            : item
        )
      );
    },
    []
  );

  const syncActiveItemVintagePopSettings = useCallback(
    (newSettings: VintagePopSettings, presetId?: string, isCustomized = true) => {
      const activeId = activeFilmstripIdRef.current;
      if (!activeId) return;
      setFilmstripImages((prev) =>
        prev.map((item) =>
          item.id === activeId
            ? {
                ...item,
                vintagePopSettings: { ...newSettings },
                ...(presetId ? { vintagePopPresetId: presetId } : {}),
                manualVintagePopOverrides: { ...manualVintagePopOverridesRef.current },
                isCustomized,
              }
            : item
        )
      );
    },
    []
  );

  const handleUpdateSetting = useCallback(
    <K extends keyof StippleSettings>(key: K, value: StippleSettings[K]) => {
      setSettings((prev) => {
        const next = { ...prev, [key]: value };
        if (!isDraggingSliderRef.current) {
          pushHistorySnapshot(next);
        }
        if (isSyncAllEnabledRef.current) {
          setFilmstripImages((fPrev) =>
            fPrev.map((item) => ({
              ...item,
              settings: { ...(item.settings || next), [key]: value },
              isCustomized: true,
            }))
          );
        } else {
          syncActiveItemSettings(next, true);
        }
        return next;
      });

      // Synchronize shared Artboard dimensions across both Stipple Photocopy & Vintage Pop
      if (key === 'outputWidth' || key === 'outputHeight') {
        setVintagePopSettings((prev) => {
          const next = { ...prev, [key]: value as number };
          if (isSyncAllEnabledRef.current) {
            setFilmstripImages((fPrev) =>
              fPrev.map((item) => ({
                ...item,
                vintagePopSettings: { ...(item.vintagePopSettings || next), [key]: value as number },
                isCustomized: true,
              }))
            );
          } else {
            syncActiveItemVintagePopSettings(next, undefined, true);
          }
          return next;
        });
      }
    },
    [pushHistorySnapshot, syncActiveItemSettings, syncActiveItemVintagePopSettings]
  );

  const handleUpdateMultipleSettings = useCallback(
    (partial: Partial<StippleSettings>) => {
      setSettings((prev) => {
        const next = { ...prev, ...partial };
        pushHistorySnapshot(next);
        if (isSyncAllEnabledRef.current) {
          setFilmstripImages((fPrev) =>
            fPrev.map((item) => ({
              ...item,
              settings: { ...(item.settings || next), ...partial },
              isCustomized: true,
            }))
          );
        } else {
          syncActiveItemSettings(next, true);
        }
        return next;
      });

      // Synchronize shared Artboard dimensions across both Stipple Photocopy & Vintage Pop
      if (partial.outputWidth !== undefined || partial.outputHeight !== undefined) {
        setVintagePopSettings((prev) => {
          const next = {
            ...prev,
            ...(partial.outputWidth !== undefined ? { outputWidth: partial.outputWidth } : {}),
            ...(partial.outputHeight !== undefined ? { outputHeight: partial.outputHeight } : {}),
          };
          if (isSyncAllEnabledRef.current) {
            setFilmstripImages((fPrev) =>
              fPrev.map((item) => ({
                ...item,
                vintagePopSettings: { ...(item.vintagePopSettings || next), ...partial },
                isCustomized: true,
              }))
            );
          } else {
            syncActiveItemVintagePopSettings(next, undefined, true);
          }
          return next;
        });
      }
    },
    [pushHistorySnapshot, syncActiveItemSettings, syncActiveItemVintagePopSettings]
  );

  const handleDragStart = useCallback(() => {
    isDraggingSliderRef.current = true;
    setIsDraggingSlider(true);
  }, []);

  const handleDragEnd = useCallback(() => {
    if (isDraggingSliderRef.current) {
      isDraggingSliderRef.current = false;
      setIsDraggingSlider(false);
      setSettings((curr) => {
        pushHistorySnapshot(curr);
        syncActiveItemSettings(curr, true);
        return { ...curr };
      });
    }
  }, [pushHistorySnapshot, syncActiveItemSettings]);

  // Undo / Redo Handlers
  const canUndo = historyIndex > 0;
  const canRedo = historyIndex < history.length - 1;

  const handleUndo = useCallback(() => {
    if (historyIndex > 0) {
      const nextIdx = historyIndex - 1;
      setHistoryIndex(nextIdx);
      const nextSettings = history[nextIdx];
      setSettings(nextSettings);
      syncActiveItemSettings(nextSettings, true);
    }
  }, [history, historyIndex, syncActiveItemSettings]);

  const handleRedo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      const nextIdx = historyIndex + 1;
      setHistoryIndex(nextIdx);
      const nextSettings = history[nextIdx];
      setSettings(nextSettings);
      syncActiveItemSettings(nextSettings, true);
    }
  }, [history, historyIndex, syncActiveItemSettings]);

  // Keyboard shortcuts for Undo (Ctrl/Cmd+Z) and Redo (Ctrl/Cmd+Y or Ctrl/Cmd+Shift+Z)
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'z') {
        if (e.shiftKey) {
          e.preventDefault();
          handleRedo();
        } else {
          e.preventDefault();
          handleUndo();
        }
      } else if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        handleRedo();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [handleUndo, handleRedo]);

  const handleResetSection = useCallback(
    (keys: (keyof StippleSettings)[]) => {
      const partial: Partial<StippleSettings> = {};
      for (const k of keys) {
        (partial as Record<string, unknown>)[k as string] =
          DEFAULT_STIPPLE_SETTINGS[k];
      }
      handleUpdateMultipleSettings(partial);
    },
    [handleUpdateMultipleSettings]
  );

  const handleResetAll = useCallback(() => {
    if (studioMode === 'vintage-pop') {
      manualVintagePopOverridesRef.current = {};
      setVintagePopSettings(DEFAULT_VINTAGE_POP_SETTINGS);
      setActiveVintagePopPresetId('cmyk-golden-age');
      syncActiveItemVintagePopSettings(DEFAULT_VINTAGE_POP_SETTINGS, 'cmyk-golden-age', false);
      setStatusToast('Vintage Pop parameters reset to factory default.');
      setTimeout(() => setStatusToast(null), 2500);
    } else {
      const preservedDimensions = {
        outputWidth: settings.outputWidth,
        outputHeight: settings.outputHeight,
      };
      const next = { ...DEFAULT_STIPPLE_SETTINGS, ...preservedDimensions };
      setSettings(next);
      setActivePresetId('classic-stipple');
      pushHistorySnapshot(next);
      syncActiveItemSettings(next, false);
      setStatusToast('All parameters reset to factory default.');
      setTimeout(() => setStatusToast(null), 2500);
    }
  }, [
    studioMode,
    settings.outputWidth,
    settings.outputHeight,
    pushHistorySnapshot,
    syncActiveItemSettings,
    syncActiveItemVintagePopSettings,
  ]);

  const handleRestoreLastSettings = useCallback(() => {
    try {
      const raw = localStorage.getItem(LAST_SETTINGS_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<StippleSettings>;
        if (parsed.scale === 88) parsed.scale = 100;
        handleUpdateMultipleSettings(parsed);
        setStatusToast('Restored last saved session settings.');
        setTimeout(() => setStatusToast(null), 2500);
      }
    } catch {
      setErrorMessage('Could not restore settings from browser storage.');
    }
  }, [handleUpdateMultipleSettings]);

  // Real-time Vintage Pop Art Rendering Effect
  useEffect(() => {
    if (!sourceImageElement || studioMode !== 'vintage-pop') return;
    try {
      const res = renderVintagePop(sourceImageElement, vintagePopSettings);
      setVintagePopOutput(res);
    } catch (err) {
      console.error('Vintage Pop rendering error:', err);
    }
  }, [sourceImageElement, vintagePopSettings, studioMode]);

  // Ref to track any settings the user has explicitly manually set or toggled in Vintage Pop mode
  // This ensures changing curated pop art style presets never reverts user manual choices (such as unchecking Middle Cutout Accent)
  const manualVintagePopOverridesRef = useRef<Partial<Record<keyof VintagePopSettings, any>>>({});

  const handleSelectVintagePopPreset = useCallback((presetId: string) => {
    const preset = VINTAGE_POP_PRESETS.find((p) => p.id === presetId);
    if (preset) {
      setActiveVintagePopPresetId(presetId);
      setVintagePopSettings((prev) => {
        const next: VintagePopSettings = {
          ...prev,
          ...preset.settings,
        };
        // Re-apply explicit manual overrides chosen by the user (e.g. unchecking middle cutout accent or toggling stickers)
        for (const [key, value] of Object.entries(manualVintagePopOverridesRef.current)) {
          if (value !== undefined) {
            (next as any)[key] = value;
          }
        }
        syncActiveItemVintagePopSettings(next, presetId, true);
        return next;
      });
      setStatusToast(`Applied preset: ${preset.name}`);
      setTimeout(() => setStatusToast(null), 2500);
    }
  }, [syncActiveItemVintagePopSettings]);

  const handleUpdateVintagePopSetting = useCallback(
    <K extends keyof VintagePopSettings>(key: K, value: VintagePopSettings[K]) => {
      // Record this key as explicitly manually modified by the user
      manualVintagePopOverridesRef.current[key] = value;
      setVintagePopSettings((prev) => {
        const next = {
          ...prev,
          [key]: value,
        };
        if (isSyncAllEnabledRef.current) {
          setFilmstripImages((fPrev) =>
            fPrev.map((item) => ({
              ...item,
              vintagePopSettings: { ...(item.vintagePopSettings || next), [key]: value },
              isCustomized: true,
            }))
          );
        } else {
          syncActiveItemVintagePopSettings(next, undefined, true);
        }
        return next;
      });

      // Synchronize shared Artboard dimensions across both Stipple Photocopy & Vintage Pop
      if (key === 'outputWidth' || key === 'outputHeight') {
        setSettings((prev) => {
          const next = { ...prev, [key]: value as number };
          if (isSyncAllEnabledRef.current) {
            setFilmstripImages((fPrev) =>
              fPrev.map((item) => ({
                ...item,
                settings: { ...(item.settings || next), [key]: value as number },
                isCustomized: true,
              }))
            );
          } else {
            syncActiveItemSettings(next, true);
          }
          return next;
        });
      }
    },
    [syncActiveItemVintagePopSettings, syncActiveItemSettings]
  );

  const handleUpdateMultipleVintagePopSettings = useCallback(
    (partial: Partial<VintagePopSettings>) => {
      for (const [k, v] of Object.entries(partial)) {
        manualVintagePopOverridesRef.current[k as keyof VintagePopSettings] = v;
      }
      setVintagePopSettings((prev) => {
        const next = { ...prev, ...partial };
        if (isSyncAllEnabledRef.current) {
          setFilmstripImages((fPrev) =>
            fPrev.map((item) => ({
              ...item,
              vintagePopSettings: { ...(item.vintagePopSettings || next), ...partial },
              isCustomized: true,
            }))
          );
        } else {
          syncActiveItemVintagePopSettings(next, undefined, true);
        }
        return next;
      });

      // Synchronize shared Artboard dimensions across both Stipple Photocopy & Vintage Pop
      if (partial.outputWidth !== undefined || partial.outputHeight !== undefined) {
        setSettings((prev) => {
          const next = {
            ...prev,
            ...(partial.outputWidth !== undefined ? { outputWidth: partial.outputWidth } : {}),
            ...(partial.outputHeight !== undefined ? { outputHeight: partial.outputHeight } : {}),
          };
          if (isSyncAllEnabledRef.current) {
            setFilmstripImages((fPrev) =>
              fPrev.map((item) => ({
                ...item,
                settings: { ...(item.settings || next), ...partial },
                isCustomized: true,
              }))
            );
          } else {
            syncActiveItemSettings(next, true);
          }
          return next;
        });
      }
    },
    [syncActiveItemVintagePopSettings, syncActiveItemSettings]
  );

  const handleResetVintagePop = useCallback(() => {
    manualVintagePopOverridesRef.current = {};
    setVintagePopSettings(DEFAULT_VINTAGE_POP_SETTINGS);
    setActiveVintagePopPresetId('cmyk-golden-age');
    syncActiveItemVintagePopSettings(DEFAULT_VINTAGE_POP_SETTINGS, 'cmyk-golden-age', false);
    setStatusToast('Reset Vintage Pop settings to default');
    setTimeout(() => setStatusToast(null), 2500);
  }, [syncActiveItemVintagePopSettings]);

  const handleToggleTransparentMode = useCallback(() => {
    if (studioMode === 'vintage-pop') {
      setVintagePopSettings((prev) => {
        const nextTransparent = !prev.isBackgroundTransparent;
        const next = {
          ...prev,
          isBackgroundTransparent: nextTransparent,
        };

        // When Alpha is turned ON, automatically apply to all items in filmstrip and batch queue
        if (nextTransparent) {
          setFilmstripImages((fPrev) =>
            fPrev.map((item) => ({
              ...item,
              vintagePopSettings: {
                ...(item.vintagePopSettings || next),
                isBackgroundTransparent: true,
              },
              isCustomized: true,
            }))
          );
          setApplyToAllSignal({
            settings: { ...settings },
            vintagePopSettings: next,
            studioMode: 'vintage-pop',
            timestamp: Date.now(),
          });
        } else {
          syncActiveItemVintagePopSettings(next, undefined, true);
        }

        return next;
      });
    } else {
      setSettings((prev) => {
        const nextTransparent = prev.backgroundMode !== 'transparent' && !prev.isBackgroundTransparent;
        const next: StippleSettings = {
          ...prev,
          backgroundMode: nextTransparent ? 'transparent' : 'white',
          isBackgroundTransparent: nextTransparent,
        };

        // When Alpha is turned ON, automatically apply to all items in filmstrip and batch queue
        if (nextTransparent) {
          setFilmstripImages((fPrev) =>
            fPrev.map((item) => ({
              ...item,
              settings: {
                ...(item.settings || next),
                backgroundMode: 'transparent',
                isBackgroundTransparent: true,
              },
              isCustomized: true,
            }))
          );
          setApplyToAllSignal({
            settings: next,
            vintagePopSettings: { ...vintagePopSettings },
            studioMode: 'stipple',
            timestamp: Date.now(),
          });
        } else {
          syncActiveItemSettings(next, true);
        }

        return next;
      });
    }
  }, [studioMode, settings, vintagePopSettings, syncActiveItemSettings, syncActiveItemVintagePopSettings]);

  const handleSelectPreset = useCallback(
    (preset: StipplePreset) => {
      setActivePresetId(preset.id);
      const next: StippleSettings = preset.isCustom
        ? {
            ...DEFAULT_STIPPLE_SETTINGS,
            ...preset.settings,
          }
        : {
            ...settings,
            ...preset.settings,
            outputWidth: settings.outputWidth,
            outputHeight: settings.outputHeight,
          };
      setSettings(next);
      pushHistorySnapshot(next);
      syncActiveItemSettings(next, true);
      setStatusToast(`Applied preset: ${preset.name}`);
      setTimeout(() => setStatusToast(null), 2200);
    },
    [settings, pushHistorySnapshot, syncActiveItemSettings]
  );

  const handleSaveCustomPreset = useCallback(
    (name: string) => {
      const newPreset: StipplePreset = {
        id: `custom-${Date.now()}`,
        name,
        category: 'Custom',
        description: `Custom user preset (${settings.patternType}, ${settings.dotShape})`,
        settings: { ...settings },
        isCustom: true,
      };
      const updated = [...customPresets, newPreset];
      setCustomPresets(updated);
      setActivePresetId(newPreset.id);
      try {
        localStorage.setItem(CUSTOM_PRESETS_STORAGE_KEY, JSON.stringify(updated));
      } catch {
        // Ignore quota error
      }
      setStatusToast(`Saved custom preset "${name}"`);
      setTimeout(() => setStatusToast(null), 2200);
    },
    [customPresets, settings]
  );

  const handleDeleteCustomPreset = useCallback(
    (id: string) => {
      const updated = customPresets.filter((p) => p.id !== id);
      setCustomPresets(updated);
      if (activePresetId === id) setActivePresetId(null);
      try {
        localStorage.setItem(CUSTOM_PRESETS_STORAGE_KEY, JSON.stringify(updated));
      } catch {
        // Ignore
      }
    },
    [customPresets, activePresetId]
  );

  // Handle User File Upload (JPG, JPEG, PNG, WEBP) locally
  const handleUploadFile = useCallback((file: File) => {
    setErrorMessage(null);
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (
      !validTypes.includes(file.type.toLowerCase()) &&
      !/\.(jpe?g|png|webp)$/i.test(file.name)
    ) {
      setErrorMessage(
        'Unsupported file format. Please upload a JPG, JPEG, PNG, or WEBP image.'
      );
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      const img = new Image();
      img.onload = () => {
        const natW = img.naturalWidth || img.width;
        const natH = img.naturalHeight || img.height;
        if (natW < 8 || natH < 8) {
          setErrorMessage('Uploaded image is too small or corrupted.');
          return;
        }

        // Automatically resize artboard to minimum 4000x4000 upon upload
        const outW = 4000;
        const outH = 4000;

        setSourceImageElement(img);
        setSourceDataUrl(dataUrl);
        setImageName(file.name);
        setSettings((prev) => ({
          ...prev,
          outputWidth: outW,
          outputHeight: outH,
          offsetX: 0,
          offsetY: 0,
          scale: 100,
          autoFitMode: 'long-edge',
        }));
        setVintagePopSettings((prev) => ({
          ...prev,
          outputWidth: outW,
          outputHeight: outH,
          offsetX: 0,
          offsetY: 0,
          scale: 100,
          autoFitMode: 'long-edge',
        }));

        // Sync with Filmstrip: add if not present, and mark as active
        setFilmstripImages((prev) => {
          const existing = prev.find(
            (p) => p.name === file.name && p.file.size === file.size
          );
          if (existing) {
            setActiveFilmstripId(existing.id);
            return prev;
          }
          const newItem: FilmstripItem = {
            id: `film_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
            file,
            name: file.name,
            previewUrl: dataUrl,
            settings: { ...settings, outputWidth: outW, outputHeight: outH, offsetX: 0, offsetY: 0, scale: 100, autoFitMode: 'long-edge' },
            vintagePopSettings: { ...vintagePopSettings, outputWidth: outW, outputHeight: outH, offsetX: 0, offsetY: 0, scale: 100, autoFitMode: 'long-edge' },
            vintagePopPresetId: activeVintagePopPresetId,
            manualVintagePopOverrides: { ...manualVintagePopOverridesRef.current },
            studioMode: studioMode,
            isCustomized: false,
          };
          setActiveFilmstripId(newItem.id);
          return [...prev, newItem];
        });
      };
      img.onerror = () => {
        setErrorMessage('Corrupted image file. Could not decode raster pixels.');
      };
      img.src = dataUrl;
    };
    reader.onerror = () => {
      setErrorMessage('Failed to read local file.');
    };
    reader.readAsDataURL(file);
  }, [settings]);

  // Unified Clear All: Clears workspace artboard, entire filmstrip, and bulk batch queue in unison
  const handleClearAll = useCallback(() => {
    setSourceImageElement(null);
    setSourceDataUrl(null);
    setImageName('');
    setFilmstripImages([]);
    setActiveFilmstripId(null);
    setExternalBulkFiles(null);
    setClearQueueSignal((prev) => prev + 1);
  }, []);

  const handleRemoveImage = handleClearAll;

  // Apply Current Image Effect & Parameters to All or Selected Filmstrip & Bulk Queue Images
  const handleApplyToAllImages = useCallback((targetIds?: string[]) => {
    if (filmstripImages.length === 0) return;
    const current = { ...settings };
    const currentVintagePop = { ...vintagePopSettings };
    const currentVintagePopPreset = activeVintagePopPresetId;
    const currentVintagePopOverrides = { ...manualVintagePopOverridesRef.current };
    const currentStudioMode = studioMode;

    const hasSpecificTargets = Boolean(targetIds && targetIds.length > 0);
    const targetSet = hasSpecificTargets ? new Set(targetIds) : null;

    setFilmstripImages((prev) =>
      prev.map((item) => {
        if (targetSet && !targetSet.has(item.id)) {
          return item;
        }
        return {
          ...item,
          settings: { ...current },
          vintagePopSettings: { ...currentVintagePop },
          vintagePopPresetId: currentVintagePopPreset,
          manualVintagePopOverrides: { ...currentVintagePopOverrides },
          studioMode: currentStudioMode,
          isCustomized: true,
        };
      })
    );

    setApplyToAllSignal({
      settings: current,
      vintagePopSettings: currentVintagePop,
      studioMode: currentStudioMode,
      timestamp: Date.now(),
    });

    const count = targetSet ? targetSet.size : filmstripImages.length;
    setStatusToast(
      targetSet
        ? `নির্বাচিত ${count}টি ছবিতে বর্তমান ইফেক্ট প্রয়োগ করা হয়েছে! (Applied to ${count} selected images)`
        : `সকল ${filmstripImages.length}টি ছবিতে বর্তমান ইফেক্ট প্রয়োগ করা হয়েছে! (Applied to all ${filmstripImages.length} images)`
    );
    setTimeout(() => setStatusToast(null), 3500);
  }, [filmstripImages.length, settings, vintagePopSettings, activeVintagePopPresetId, studioMode]);

  // 1-Click Smart Auto Tone for Active Image (ব্রাইটনেস ও কনট্রাস্ট অটো ব্যালেন্স)
  const handleAutoToneActiveImage = useCallback(() => {
    if (!sourceImageElement) {
      setStatusToast('অনুগ্রহ করে প্রথমে একটি ছবি সিলেক্ট করুন (Please select an image first)');
      setTimeout(() => setStatusToast(null), 2500);
      return;
    }

    try {
      const profile = computeAdaptiveToneProfile(sourceImageElement);
      if (studioMode === 'vintage-pop') {
        const partial: Partial<VintagePopSettings> = {
          contrast: profile.vintagePop.contrast,
          brightness: profile.vintagePop.brightness,
          threshold: profile.vintagePop.threshold,
        };
        handleUpdateMultipleVintagePopSettings(partial);
        setStatusToast(
          `✨ Vintage Pop অটো ব্যালেন্স সম্পন্ন! (Contrast: +${profile.vintagePop.contrast}, Brightness: ${
            profile.vintagePop.brightness > 0 ? '+' : ''
          }${profile.vintagePop.brightness})`
        );
      } else {
        const partial: Partial<StippleSettings> = {
          contrast: profile.stipple.contrast,
          brightness: profile.stipple.brightness,
          threshold: profile.stipple.threshold,
        };
        handleUpdateMultipleSettings(partial);
        setStatusToast(
          `✨ Stipple Photocopy অটো ব্যালেন্স সম্পন্ন! (Contrast: +${profile.stipple.contrast}, Brightness: ${
            profile.stipple.brightness > 0 ? '+' : ''
          }${profile.stipple.brightness})`
        );
      }
      setTimeout(() => setStatusToast(null), 3500);
    } catch (err) {
      console.error('Auto Tone error:', err);
      setStatusToast('অটো ব্যালেন্স করতে সমস্যা হয়েছে');
      setTimeout(() => setStatusToast(null), 2500);
    }
  }, [
    sourceImageElement,
    studioMode,
    handleUpdateMultipleSettings,
    handleUpdateMultipleVintagePopSettings,
  ]);

  // 1-Click Smart Auto Balance across ALL or SELECTED images in the filmstrip
  // প্রতিটি ছবির নিজস্ব আলো ও ডাইনামিক রেঞ্জ হিসেব করে সেটির জন্য পারফেক্ট টোন সেট করে
  const handleAutoBalanceAllImages = useCallback(async (targetIds?: string[]) => {
    if (filmstripImages.length === 0) return;
    const hasSpecificTargets = Boolean(targetIds && targetIds.length > 0);
    const targetSet = hasSpecificTargets ? new Set(targetIds) : null;

    setStatusToast(
      targetSet
        ? `⏳ নির্বাচিত ${targetSet.size}টি ছবিতে স্মার্ট ব্যালেন্স হিসেব করা হচ্ছে...`
        : '⏳ সকল ছবিতে স্মার্ট ব্যালেন্স হিসেব করা হচ্ছে...'
    );

    const updatedImages = await Promise.all(
      filmstripImages.map(async (item) => {
        if (targetSet && !targetSet.has(item.id)) {
          return item;
        }
        try {
          const img = new Image();
          await new Promise<void>((resolve, reject) => {
            img.onload = () => resolve();
            img.onerror = reject;
            img.src = item.previewUrl;
          });
          const profile = computeAdaptiveToneProfile(img);
          const nextStipple: StippleSettings = {
            ...(item.settings || settings),
            contrast: profile.stipple.contrast,
            brightness: profile.stipple.brightness,
            threshold: profile.stipple.threshold,
          };
          const nextPop: VintagePopSettings = {
            ...(item.vintagePopSettings || vintagePopSettings),
            contrast: profile.vintagePop.contrast,
            brightness: profile.vintagePop.brightness,
            threshold: profile.vintagePop.threshold,
          };
          return {
            ...item,
            settings: nextStipple,
            vintagePopSettings: nextPop,
            isCustomized: true,
          };
        } catch {
          return item;
        }
      })
    );

    setFilmstripImages(updatedImages);

    // If active image was balanced, update current state too
    const activeId = activeFilmstripIdRef.current;
    if (activeId && (!targetSet || targetSet.has(activeId))) {
      const activeMatch = updatedImages.find((it) => it.id === activeId);
      if (activeMatch) {
        if (activeMatch.settings) setSettings({ ...activeMatch.settings });
        if (activeMatch.vintagePopSettings)
          setVintagePopSettings({ ...activeMatch.vintagePopSettings });
      }
    }

    const count = targetSet ? targetSet.size : updatedImages.length;
    setStatusToast(
      targetSet
        ? `✨ সফল! নির্বাচিত ${count}টি ছবিতে নিজস্ব আলো ও কনট্রাস্ট অনুযায়ী ব্যালেন্স প্রয়োগ করা হয়েছে!`
        : `✨ সফল! সকল ${updatedImages.length}টি ছবিতে নিজস্ব আলো ও কনট্রাস্ট অনুযায়ী ব্যালেন্স প্রয়োগ করা হয়েছে!`
    );
    setTimeout(() => setStatusToast(null), 4000);
  }, [filmstripImages, settings, vintagePopSettings]);

  // Filmstrip Handlers
  const handleAddFilmstripFiles = useCallback(
    (files: FileList | File[]) => {
      const list = Array.from(files).filter(
        (f) =>
          f.type.startsWith('image/') ||
          /\.(jpe?g|png|webp|bmp|gif)$/i.test(f.name)
      );
      if (list.length === 0) return;

      setFilmstripImages((prev) => {
        const newItems: FilmstripItem[] = [];
        for (const file of list) {
          const exists = prev.find(
            (p) => p.name === file.name && p.file.size === file.size
          );
          if (!exists) {
            newItems.push({
              id: `film_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
              file,
              name: file.name,
              previewUrl: URL.createObjectURL(file),
              settings: { ...settings },
              vintagePopSettings: { ...vintagePopSettings },
              vintagePopPresetId: activeVintagePopPresetId,
              manualVintagePopOverrides: { ...manualVintagePopOverridesRef.current },
              studioMode: studioMode,
              isCustomized: false,
            });
          }
        }

        const updated = [...prev, ...newItems];

        // If no active image, select and load the first new item
        if (newItems.length > 0 && !sourceImageElement) {
          const first = newItems[0];
          setActiveFilmstripId(first.id);
          handleUploadFile(first.file);
        }
        return updated;
      });

      // Also supply to bulk batch processor
      setExternalBulkFiles(list);
    },
    [sourceImageElement, handleUploadFile, settings, vintagePopSettings, activeVintagePopPresetId, studioMode]
  );

  const handleSelectFilmstripItem = useCallback(
    (item: FilmstripItem) => {
      if (item.id === activeFilmstripIdRef.current) return;

      // 1. Determine target settings for the newly selected item:
      // If the clicked item already has its own tuned settings, load them!
      const targetSettings: StippleSettings = item.settings
        ? { ...item.settings }
        : { ...settings };

      const targetVintagePopSettings: VintagePopSettings = item.vintagePopSettings
        ? { ...item.vintagePopSettings }
        : { ...vintagePopSettings };

      const targetVintagePopPresetId = item.vintagePopPresetId || activeVintagePopPresetId;

      if (item.manualVintagePopOverrides) {
        manualVintagePopOverridesRef.current = { ...item.manualVintagePopOverrides };
      }
      // Keep current studioMode active (do not switch mode on filmstrip click; only switch when user toggles at the top)

      // 2. Set active ID & name
      setActiveFilmstripId(item.id);
      setImageName(item.name);

      // 3. Switch current settings state and reset undo/redo history stack for this specific image
      setSettings(targetSettings);
      setVintagePopSettings(targetVintagePopSettings);
      if (targetVintagePopPresetId) {
        setActiveVintagePopPresetId(targetVintagePopPresetId);
      }
      setHistory([targetSettings]);
      setHistoryIndex(0);

      // 4. Load the image element for the artboard directly
      const img = new Image();
      img.onload = () => {
        setSourceImageElement(img);
        setSourceDataUrl(item.previewUrl);
      };
      img.src = item.previewUrl;
    },
    [settings, vintagePopSettings, activeVintagePopPresetId, studioMode]
  );

  // When an item is removed from Filmstrip (via X button):
  // Also remove it from Bulk Queue in RightPanel
  const handleRemoveFilmstripItem = useCallback(
    (id: string) => {
      setFilmstripImages((prev) => {
        const itemToRemove = prev.find((p) => p.id === id);
        if (itemToRemove) {
          setRemoveBulkItemSignal({
            name: itemToRemove.name,
            timestamp: Date.now(),
          });
        }

        const updated = prev.filter((p) => p.id !== id);
        if (activeFilmstripId === id) {
          if (updated.length > 0) {
            const next = updated[0];
            setActiveFilmstripId(next.id);
            handleUploadFile(next.file);
          } else {
            setActiveFilmstripId(null);
            setSourceImageElement(null);
            setSourceDataUrl(null);
            setImageName('');
            setClearQueueSignal((prevSignal) => prevSignal + 1);
          }
        } else if (updated.length === 0) {
          setActiveFilmstripId(null);
          setSourceImageElement(null);
          setSourceDataUrl(null);
          setImageName('');
          setClearQueueSignal((prevSignal) => prevSignal + 1);
        }
        return updated;
      });
    },
    [activeFilmstripId, handleUploadFile]
  );

  // Remove Multiple Selected Filmstrip Items
  const handleRemoveMultipleFilmstripItems = useCallback((ids: string[]) => {
    if (ids.length === 0) return;
    const toRemoveSet = new Set(ids);
    setFilmstripImages((prev) => {
      const remaining = prev.filter((item) => !toRemoveSet.has(item.id));
      prev
        .filter((item) => toRemoveSet.has(item.id))
        .forEach((item) => {
          setRemoveBulkItemSignal({
            name: item.name,
            timestamp: Date.now(),
          });
        });

      if (remaining.length === 0) {
        setSourceImageElement(null);
        setSourceDataUrl(null);
        setActiveFilmstripId(null);
        setImageName('Artwork');
      } else if (activeFilmstripIdRef.current && toRemoveSet.has(activeFilmstripIdRef.current)) {
        handleSelectFilmstripItem(remaining[0]);
      }
      return remaining;
    });
    setStatusToast(`নির্বাচিত ${ids.length}টি ছবি মুছে ফেলা হয়েছে (Removed ${ids.length} images)`);
    setTimeout(() => setStatusToast(null), 2500);
  }, [handleSelectFilmstripItem]);

  // When an item is removed from RightPanel Batch Queue (via X button):
  // Also remove it from Filmstrip and update Artboard if it was active
  const handleItemRemovedFromRightPanel = useCallback(
    (name: string) => {
      setFilmstripImages((prev) => {
        const itemToRemove = prev.find((p) => p.name === name);
        const updated = prev.filter((p) => p.name !== name);
        if (itemToRemove && activeFilmstripId === itemToRemove.id) {
          if (updated.length > 0) {
            const next = updated[0];
            setActiveFilmstripId(next.id);
            handleUploadFile(next.file);
          } else {
            setActiveFilmstripId(null);
            setSourceImageElement(null);
            setSourceDataUrl(null);
            setImageName('');
          }
        } else if (updated.length === 0) {
          setActiveFilmstripId(null);
          setSourceImageElement(null);
          setSourceDataUrl(null);
          setImageName('');
        }
        return updated;
      });
    },
    [activeFilmstripId, handleUploadFile]
  );

  const handleClearFilmstrip = handleClearAll;

  const handleUploadBulkFiles = useCallback(
    (files: FileList | File[]) => {
      handleAddFilmstripFiles(files);
    },
    [handleAddFilmstripFiles]
  );

  const handleConsumeExternalBulkFiles = useCallback(() => {
    setExternalBulkFiles(null);
  }, []);

  const handleSetArtboardSize = useCallback((width: number, height: number) => {
    setSettings((prev) => ({
      ...prev,
      outputWidth: width,
      outputHeight: height,
    }));
    setVintagePopSettings((prev) => ({
      ...prev,
      outputWidth: width,
      outputHeight: height,
    }));
  }, []);

  // STAGE 1: Image Analysis Pipeline (Recalculates only when image or tonal/detail/color analysis settings change)
  const analyzedBuffer = useMemo<AnalyzedImageBuffer | null>(() => {
    if (!sourceImageElement) return null;
    try {
      return analyzeImage(sourceImageElement, settings, false);
    } catch (err) {
      console.error(err);
      return null;
    }
  }, [
    sourceImageElement,
    settings.previewQuality,
    settings.vectorResolution,
    settings.alphaMode,
    settings.includeBgInStipple,
    settings.backgroundColor,
    settings.colorSaturation,
    settings.colorBalance,
    settings.colorMode,
    settings.colorCount,
    settings.inkColor,
    settings.secondaryInkColor,
    settings.smoothing,
    settings.edgePreservation,
    settings.detail,
    settings.sharpen,
    settings.localContrast,
    settings.edgeStrength,
    settings.blackLevel,
    settings.whiteLevel,
    settings.brightness,
    settings.contrast,
    settings.gamma,
    settings.invert,
    settings.shadowStrength,
    settings.midtoneStrength,
    settings.highlightStrength,
    settings.edgeContrast,
    settings.threshold,
    settings.thresholdPoint,
  ]);

  // STAGE 2: Procedural Stipple Vector Generation (Fast GPU Canvas preview; full SVG string built on export)
  const generationOutput = useMemo(() => {
    if (!analyzedBuffer) {
      const emptyStats: GenerationStats = {
        totalDots: 0,
        shadowDots: 0,
        midtoneDots: 0,
        highlightDots: 0,
        layerCounts: {},
        analysisWidth: 0,
        analysisHeight: 0,
        outputWidth: settings.outputWidth,
        outputHeight: settings.outputHeight,
        processingTimeMs: 0,
        svgByteSizeEstimate: 0,
        largeImageOptimized: false,
      };
      return {
        dots: [],
        svgString: '',
        stats: emptyStats,
        palette: [settings.inkColor],
        validation: {
          valid: false,
          errors: ['No image loaded'],
          vectorElementCount: 0,
          byteSize: 0,
        },
      };
    }

    const { dots, stats, palette } = generateStippleVectors(
      analyzedBuffer,
      settings
    );
    const bytesPerDot = settings.mergeShapes ? 28 : 52;
    const estimatedByteSize = dots.length > 0 ? 340 + dots.length * bytesPerDot : 0;

    return {
      dots,
      svgString: '',
      stats: {
        ...stats,
        svgByteSizeEstimate: estimatedByteSize,
      },
      palette,
      validation: {
        valid: dots.length > 0,
        errors: dots.length > 0 ? [] : ['No vector geometry elements were generated.'],
        vectorElementCount: settings.mergeShapes ? palette.length : dots.length,
        byteSize: estimatedByteSize,
      },
    };
  }, [analyzedBuffer, settings]);

  // Export Final SVG Vector File (100% synchronized with live preview vector geometry)
  const handleExportSVG = useCallback(() => {
    if (!sourceImageElement) return;

    if (studioMode === 'vintage-pop') {
      if (!vintagePopOutput?.svgString) return;
      const blob = new Blob([vintagePopOutput.svgString], {
        type: 'image/svg+xml;charset=utf-8',
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      const baseName = (imageName || 'vintage-pop-artwork').replace(/\.[^.]+$/, '');
      link.href = url;
      link.download = `${baseName}-vintage-pop.svg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      setStatusToast('Exported Vintage Pop SVG vector file');
      setTimeout(() => setStatusToast(null), 3000);
      return;
    }

    if (generationOutput.dots.length === 0) return;
    try {
      const finalSvg = buildSVGDocument(
        generationOutput.dots,
        settings,
        generationOutput.palette
      );
      const report = validateSVGDocument(finalSvg);

      if (!report.valid) {
        setErrorMessage(`SVG Export Validation failed: ${report.errors.join(' ')}`);
        return;
      }

      const blob = new Blob([finalSvg], {
        type: 'image/svg+xml;charset=utf-8',
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      const baseName = (imageName || 'stipple-artwork').replace(/\.[^.]+$/, '');
      link.href = url;
      link.download = `${baseName}-vector-stipple.svg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      setStatusToast(
        `Exported valid SVG (${generationOutput.stats.totalDots.toLocaleString()} pure vector objects)`
      );
      setTimeout(() => setStatusToast(null), 3000);
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : 'Failed to export SVG document.'
      );
    }
  }, [sourceImageElement, settings, imageName, generationOutput, studioMode, vintagePopOutput]);

  // Export PNG / JPG Raster Preview
  const handleExportRaster = useCallback(
    async (format: 'png' | 'jpeg', transparent = false) => {
      if (!sourceImageElement) return;

      if (studioMode === 'vintage-pop') {
        if (!vintagePopOutput?.canvas) return;
        const mime = format === 'png' ? 'image/png' : 'image/jpeg';
        const ext = format === 'png' ? (transparent ? 'sticker.png' : 'png') : 'jpg';
        const baseName = (imageName || 'vintage-pop-artwork').replace(/\.[^.]+$/, '');
        let targetCanvas = vintagePopOutput.canvas;
        if (format === 'png' && transparent && !vintagePopSettings.isBackgroundTransparent) {
          const trans = renderVintagePop(sourceImageElement, {
            ...vintagePopSettings,
            isBackgroundTransparent: true,
          });
          targetCanvas = trans.canvas;
        }
        const dataUrl = targetCanvas.toDataURL(mime, 0.95);
        const link = document.createElement('a');
        link.href = dataUrl;
        link.download = `${baseName}-vintage-pop.${ext}`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        setStatusToast(`Exported Vintage Pop ${ext.toUpperCase()}`);
        setTimeout(() => setStatusToast(null), 3000);
        return;
      }

      if (generationOutput.dots.length === 0) return;
      try {
        const effectiveSettings: StippleSettings = transparent
          ? { ...settings, backgroundMode: 'transparent' }
          : settings;
        const svgToRender = buildSVGDocument(
          generationOutput.dots,
          effectiveSettings,
          generationOutput.palette
        );

        const dataUrl = await exportRasterFromSVG(
          svgToRender,
          settings.outputWidth,
          settings.outputHeight,
          format,
          transparent
        );
        const link = document.createElement('a');
        const baseName = (imageName || 'stipple-artwork').replace(/\.[^.]+$/, '');
        link.href = dataUrl;
        link.download = `${baseName}-preview.${format === 'jpeg' ? 'jpg' : 'png'}`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } catch (err) {
        setErrorMessage(
          err instanceof Error ? err.message : 'Failed to export preview image.'
        );
      }
    },
    [generationOutput, settings, imageName, studioMode, vintagePopOutput, sourceImageElement]
  );

  const activePresetName = useMemo(() => {
    const all = [...BUILT_IN_PRESETS, ...customPresets];
    return all.find((p) => p.id === activePresetId)?.name || 'Custom Parameters';
  }, [activePresetId, customPresets]);

  return (
    <div className="h-screen w-screen flex flex-col bg-white text-slate-900 overflow-hidden">
      {/* TOP BAR (Strict 3-Zone Contract) */}
      <header className="h-12 px-4 bg-white border-b border-slate-200 flex items-center justify-between gap-4 shrink-0 z-20">
        {/* Zone 1: Brand Logo, Wordmark & Studio Mode Switcher */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <img
              src="./icon.png"
              alt="Stipple Photocopy Maker"
              className="w-7 h-7 object-contain rounded shadow-xs shrink-0 select-none"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.style.display = 'none';
              }}
            />
            <span className="text-sm font-bold tracking-wider text-slate-900 whitespace-nowrap hidden xl:inline">
              {studioMode === 'stipple' ? 'STIPPLE PHOTOCOPY MAKER' : 'VINTAGE POP STUDIO'}
            </span>
          </div>

          {/* 2-in-1 Studio Mode Switcher */}
          <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-300">
            <button
              type="button"
              onClick={() => {
                setStudioMode('stipple');
                setSettings((prev) => ({
                  ...prev,
                  outputWidth: vintagePopSettings.outputWidth || prev.outputWidth,
                  outputHeight: vintagePopSettings.outputHeight || prev.outputHeight,
                }));
              }}
              title="Classic Stipple & Halftone Vector Studio"
              className={`px-2.5 py-1 rounded text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                studioMode === 'stipple'
                  ? 'bg-white text-slate-900 shadow-xs border border-slate-200'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Printer className="w-3.5 h-3.5 text-amber-600" />
              <span>Stipple Photocopy</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setStudioMode('vintage-pop');
                setVintagePopSettings((prev) => ({
                  ...prev,
                  outputWidth: settings.outputWidth || prev.outputWidth,
                  outputHeight: settings.outputHeight || prev.outputHeight,
                }));
              }}
              title="Retro Pop Art Halftone Collage Studio"
              className={`px-2.5 py-1 rounded text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                studioMode === 'vintage-pop'
                  ? 'bg-[#E52521] text-white shadow-xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              <span>Vintage Pop Mode</span>
            </button>
          </div>
        </div>
      </header>

      {/* MAIN 3-COLUMN WORKSTATION BODY */}
      <div className="flex-1 flex min-h-0 overflow-hidden">
        <LeftSidebar
          settings={settings}
          uiMode={uiMode}
          onSetUiMode={setUiMode}
          onUpdateSetting={handleUpdateSetting}
          onUpdateMultipleSettings={handleUpdateMultipleSettings}
          onResetSection={handleResetSection}
          onSelectPreset={handleSelectPreset}
          activePresetId={activePresetId}
          customPresets={customPresets}
          onSaveCustomPreset={handleSaveCustomPreset}
          onDeleteCustomPreset={handleDeleteCustomPreset}
          hasImage={Boolean(sourceImageElement)}
          imageName={imageName}
          onUploadFile={handleUploadFile}
          onUploadBulkFiles={handleUploadBulkFiles}
          onRemoveImage={handleRemoveImage}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
          filmstripCount={filmstripImages.length}
          onApplyToAll={handleApplyToAllImages}
          studioMode={studioMode}
          vintagePopSettings={vintagePopSettings}
          onUpdateVintagePopSetting={handleUpdateVintagePopSetting}
          onUpdateMultipleVintagePopSettings={handleUpdateMultipleVintagePopSettings}
          onSelectVintagePopPreset={handleSelectVintagePopPreset}
          activeVintagePopPresetId={activeVintagePopPresetId}
          onResetVintagePop={handleResetVintagePop}
          isMoveToolActive={isMoveToolActive}
          onToggleMoveTool={() => setIsMoveToolActive((prev) => !prev)}
          onAutoTone={handleAutoToneActiveImage}
        />

        <PreviewWorkspace
          hasImage={Boolean(sourceImageElement)}
          sourceDataUrl={sourceDataUrl}
          dots={generationOutput.dots}
          palette={generationOutput.palette}
          settings={settings}
          viewMode={viewMode}
          onSetViewMode={setViewMode}
          onUploadFile={handleUploadFile}
          onUploadBulkFiles={handleUploadBulkFiles}
          isGenerating={isDraggingSlider}
          totalDots={generationOutput.stats.totalDots}
          filmstripItems={filmstripImages}
          activeFilmstripId={activeFilmstripId}
          onSelectFilmstripItem={handleSelectFilmstripItem}
          onRemoveFilmstripItem={handleRemoveFilmstripItem}
          onRemoveMultipleItems={handleRemoveMultipleFilmstripItems}
          onAddFilmstripFiles={handleAddFilmstripFiles}
          onClearFilmstrip={handleClearFilmstrip}
          filmstripViewState={filmstripViewState}
          onSetFilmstripViewState={handleSetFilmstripViewState}
          onApplyToAll={handleApplyToAllImages}
          isSyncAllEnabled={isSyncAllEnabled}
          onToggleSyncAll={handleToggleSyncAll}
          onAutoBalanceAll={handleAutoBalanceAllImages}
          studioMode={studioMode}
          vintagePopOutput={vintagePopOutput}
          vintagePopSettings={vintagePopSettings}
          onUpdateSetting={handleUpdateSetting}
          onUpdateVintagePopSetting={handleUpdateVintagePopSetting}
          onToggleTransparentMode={handleToggleTransparentMode}
          isTransparentMode={studioMode === 'vintage-pop' ? vintagePopSettings.isBackgroundTransparent : (settings.backgroundMode === 'transparent' || Boolean(settings.isBackgroundTransparent))}
          isMoveToolActive={isMoveToolActive}
          onToggleMoveTool={() => setIsMoveToolActive((prev) => !prev)}
        />

        <RightPanel
          hasImage={Boolean(sourceImageElement)}
          settings={settings}
          stats={generationOutput.stats}
          palette={generationOutput.palette}
          svgString={generationOutput.svgString}
          validation={generationOutput.validation}
          analyzedBuffer={analyzedBuffer}
          isDraggingSlider={isDraggingSlider}
          onExportSVG={handleExportSVG}
          onExportRaster={handleExportRaster}
          onLoadSetupFile={handleUploadFile}
          externalBulkFiles={externalBulkFiles}
          onConsumeExternalBulkFiles={handleConsumeExternalBulkFiles}
          customPresets={customPresets}
          activePresetId={activePresetId}
          onSelectPreset={handleSelectPreset}
          onSaveCustomPreset={handleSaveCustomPreset}
          onDeleteCustomPreset={handleDeleteCustomPreset}
          clearQueueSignal={clearQueueSignal}
          removeItemSignal={removeBulkItemSignal}
          onClearAllImages={handleClearAll}
          onItemRemoved={handleItemRemovedFromRightPanel}
          onSetArtboardSize={handleSetArtboardSize}
          activeImageName={imageName}
          filmstripImages={filmstripImages}
          onApplyToAll={handleApplyToAllImages}
          applyToAllSignal={applyToAllSignal}
          studioMode={studioMode}
          vintagePopOutput={vintagePopOutput}
          vintagePopSettings={vintagePopSettings}
        />
      </div>
    </div>
  );
}
