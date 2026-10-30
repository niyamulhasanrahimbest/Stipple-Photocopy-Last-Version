import React, { useCallback, useEffect, useRef, useState } from 'react';
import JSZip from 'jszip';
import {
  BookmarkPlus,
  Check,
  CheckCircle2,
  ChevronDown,
  Download,
  Eye,
  FileArchive,
  FileCode,
  FileImage,
  Images,
  Loader2,
  Pause,
  Play,
  RefreshCw,
  Trash2,
  X,
} from 'lucide-react';
import {
  FilmstripItem,
  GenerationStats,
  StipplePreset,
  StippleSettings,
  StudioMode,
  VintagePopSettings,
} from '../types/stipple';
import { AnalyzedImageBuffer, analyzeImage } from '../engine/ImageAnalyzer';
import { generateStippleVectors } from '../engine/StippleEngine';
import {
  buildSVGDocument,
  exportRasterBlobFromSVG,
  SVGValidationReport,
} from '../engine/SVGRenderer';
import { renderVintagePop, VintagePopResult } from '../engine/VintagePopEngine';

export type BulkExportFormat = 'svg' | 'png' | 'alpha-png' | 'jpeg';
export type BulkDimensionMode = 'auto-aspect' | 'exact-setup' | 'lock-2x' | 'lock-4x';

export interface BulkQueueItem {
  id: string;
  file: File;
  name: string;
  status: 'queued' | 'processing' | 'done' | 'error';
  dotCount: number;
  byteSize: number;
  outputFilename: string;
  error?: string;
  settings?: StippleSettings;
  vintagePopSettings?: VintagePopSettings;
  studioMode?: StudioMode;
}

interface RightPanelProps {
  hasImage: boolean;
  settings: StippleSettings;
  stats: GenerationStats;
  palette: string[];
  svgString: string;
  validation: SVGValidationReport;
  analyzedBuffer: AnalyzedImageBuffer | null;
  isDraggingSlider?: boolean;
  onExportSVG: () => void;
  onExportRaster: (format: 'png' | 'jpeg', transparent?: boolean) => void;
  onLoadSetupFile: (file: File) => void;
  externalBulkFiles?: File[] | null;
  onConsumeExternalBulkFiles?: () => void;
  customPresets: StipplePreset[];
  activePresetId: string | null;
  onSelectPreset: (preset: StipplePreset) => void;
  onSaveCustomPreset: (name: string) => void;
  onDeleteCustomPreset: (id: string) => void;
  clearQueueSignal?: number;
  removeItemSignal?: { name: string; timestamp: number } | null;
  onClearAllImages?: () => void;
  onItemRemoved?: (name: string) => void;
  onSetArtboardSize?: (width: number, height: number) => void;
  activeImageName?: string;
  filmstripImages?: FilmstripItem[];
  onApplyToAll?: () => void;
  applyToAllSignal?: {
    settings: StippleSettings;
    vintagePopSettings?: VintagePopSettings;
    studioMode?: StudioMode;
    timestamp: number;
  } | null;
  studioMode?: StudioMode;
  vintagePopOutput?: VintagePopResult | null;
  vintagePopSettings?: VintagePopSettings;
}

const VALID_IMAGE_REGEX = /\.(jpe?g|png|webp)$/i;
const VALID_MIME_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

function isValidImageFile(file: File): boolean {
  return (
    VALID_MIME_TYPES.includes(file.type.toLowerCase()) ||
    VALID_IMAGE_REGEX.test(file.name)
  );
}

function decodeImageFromFile(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('Could not decode image file'));
    };
    img.src = objectUrl;
  });
}

export const RightPanel: React.FC<RightPanelProps> = ({
  hasImage,
  settings,
  stats,
  svgString,
  validation,
  isDraggingSlider = false,
  onExportSVG,
  onExportRaster,
  onLoadSetupFile,
  externalBulkFiles,
  onConsumeExternalBulkFiles,
  customPresets,
  activePresetId,
  onSelectPreset,
  onSaveCustomPreset,
  onDeleteCustomPreset,
  clearQueueSignal,
  removeItemSignal,
  onClearAllImages,
  onItemRemoved,
  onSetArtboardSize,
  activeImageName,
  filmstripImages,
  onApplyToAll,
  applyToAllSignal,
  studioMode = 'stipple',
  vintagePopOutput,
  vintagePopSettings,
}) => {
  // Bulk Processing State
  const [queue, setQueue] = useState<BulkQueueItem[]>([]);
  const [bulkFormat, setBulkFormat] = useState<BulkExportFormat>('svg');
  const [dimensionMode, setDimensionMode] =
    useState<BulkDimensionMode>('lock-2x');
  const [isLockMenuOpen, setIsLockMenuOpen] = useState<boolean>(false);
  const [lastLockMode, setLastLockMode] =
    useState<BulkDimensionMode>('lock-2x');
  const lockMenuRef = useRef<HTMLDivElement>(null);
  const [isPresetMenuOpen, setIsPresetMenuOpen] = useState<boolean>(false);
  const presetMenuRef = useRef<HTMLDivElement>(null);
  const filmstripImagesRef = useRef<FilmstripItem[] | undefined>(filmstripImages);
  filmstripImagesRef.current = filmstripImages;

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (
        lockMenuRef.current &&
        !lockMenuRef.current.contains(e.target as Node)
      ) {
        setIsLockMenuOpen(false);
      }
      if (
        presetMenuRef.current &&
        !presetMenuRef.current.contains(e.target as Node)
      ) {
        setIsPresetMenuOpen(false);
        setPresetToDeleteId(null);
      }
    };
    if (isLockMenuOpen || isPresetMenuOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
    }
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, [isLockMenuOpen, isPresetMenuOpen]);
  const [setupName, setSetupName] = useState<string>('');
  const [presetToDeleteId, setPresetToDeleteId] = useState<string | null>(null);
  const autoProcessOnAdd = true;
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [isZipping, setIsZipping] = useState<boolean>(false);

  // Store generated output Blobs in a ref Map to keep React state lightweight for 500+ images
  const blobStoreRef = useRef<Map<string, { blob: Blob; filename: string }>>(
    new Map()
  );
  const queueRef = useRef<BulkQueueItem[]>([]);
  queueRef.current = queue;

  const settingsRef = useRef<StippleSettings>(settings);
  settingsRef.current = settings;

  const studioModeRef = useRef<StudioMode>(studioMode);
  studioModeRef.current = studioMode;

  const vintagePopSettingsRef = useRef<VintagePopSettings | undefined>(vintagePopSettings);
  vintagePopSettingsRef.current = vintagePopSettings;

  const bulkFormatRef = useRef<BulkExportFormat>(bulkFormat);
  bulkFormatRef.current = bulkFormat;

  const dimensionModeRef = useRef<BulkDimensionMode>(dimensionMode);
  dimensionModeRef.current = dimensionMode;

  const isRunningRef = useRef<boolean>(false);
  const stopRequestedRef = useRef<boolean>(false);

  const formatBytes = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  const getExtensionForFormat = (fmt: BulkExportFormat): string => {
    if (fmt === 'svg') return 'svg';
    if (fmt === 'jpeg') return 'jpg';
    return 'png';
  };

  // Sequential non-blocking processor loop that processes all 'queued' items using current settings
  const runBatchLoop = useCallback(async () => {
    if (isRunningRef.current) return;
    isRunningRef.current = true;
    stopRequestedRef.current = false;
    setIsProcessing(true);

    try {
      while (!stopRequestedRef.current) {
        const nextItem = queueRef.current.find(
          (item) => item.status === 'queued'
        );
        if (!nextItem) break;

        // Mark item as processing
        setQueue((prev) =>
          prev.map((it) =>
            it.id === nextItem.id ? { ...it, status: 'processing', error: undefined } : it
          )
        );

        // Yield briefly so UI renders progress smoothly and stays responsive
        await new Promise((r) => setTimeout(r, 15));
        if (stopRequestedRef.current) {
          setQueue((prev) =>
            prev.map((it) =>
              it.id === nextItem.id && it.status === 'processing'
                ? { ...it, status: 'queued' }
                : it
            )
          );
          break;
        }

        try {
          const img = await decodeImageFromFile(nextItem.file);
          const natW = img.naturalWidth || img.width;
          const natH = img.naturalHeight || img.height;

          if (natW < 8 || natH < 8) {
            throw new Error('Image too small');
          }

          const currentFormat = bulkFormatRef.current;
          const currentDimMode = dimensionModeRef.current;

          // Per-image custom settings lookup: check if filmstrip item has dedicated settings
          const matchedFilm = filmstripImagesRef.current?.find(
            (f) => f.name === nextItem.name
          );

          // VINTAGE POP BATCH MODE
          if (studioModeRef.current === 'vintage-pop' && vintagePopSettingsRef.current) {
            const vSettings =
              matchedFilm?.vintagePopSettings ||
              nextItem.vintagePopSettings ||
              vintagePopSettingsRef.current;
            const isAlpha = currentFormat === 'alpha-png';
            const effVSettings: VintagePopSettings = isAlpha
              ? { ...vSettings, isBackgroundTransparent: true }
              : vSettings;
            const res = renderVintagePop(img, effVSettings);
            img.src = '';

            const baseName = nextItem.name.replace(/\.[^.]+$/, '');
            const ext = getExtensionForFormat(currentFormat);
            const outFilename = `${baseName}-vintage-pop.${ext}`;

            let outputBlob: Blob;
            if (currentFormat === 'svg') {
              outputBlob = new Blob([res.svgString], {
                type: 'image/svg+xml;charset=utf-8',
              });
            } else if (currentFormat === 'jpeg') {
              outputBlob = await new Promise<Blob>((resolve, reject) => {
                res.canvas.toBlob(
                  (b) => (b ? resolve(b) : reject(new Error('Canvas export failed'))),
                  'image/jpeg',
                  0.95
                );
              });
            } else {
              outputBlob = await new Promise<Blob>((resolve, reject) => {
                res.canvas.toBlob(
                  (b) => (b ? resolve(b) : reject(new Error('Canvas export failed'))),
                  'image/png'
                );
              });
            }

            blobStoreRef.current.set(nextItem.id, {
              blob: outputBlob,
              filename: outFilename,
            });

            setQueue((prev) =>
              prev.map((it) =>
                it.id === nextItem.id
                  ? {
                      ...it,
                      status: 'done',
                      dotCount: effVSettings.stickerBorderEnabled ? 1 : 0,
                      byteSize: outputBlob.size,
                      outputFilename: outFilename,
                    }
                  : it
              )
            );
            continue;
          }

          // Stipple Mode: use image-specific settings if customized, else current settings
          const currentSettings =
            matchedFilm?.settings || nextItem.settings || settingsRef.current;

          let outW = currentSettings.outputWidth;
          let outH = currentSettings.outputHeight;

          if (currentDimMode === 'auto-aspect') {
            const maxRefSide = Math.max(
              4000,
              Math.max(currentSettings.outputWidth, currentSettings.outputHeight)
            );
            const aspect = natW / natH;
            if (aspect >= 1) {
              outW = maxRefSide;
              outH = Math.max(4000, Math.round(maxRefSide / aspect));
            } else {
              outH = maxRefSide;
              outW = Math.max(4000, Math.round(maxRefSide * aspect));
            }
          } else if (currentDimMode === 'lock-2x') {
            outW = 4000;
            outH = 4000;
          } else if (currentDimMode === 'lock-4x') {
            outW = 4096;
            outH = 4096;
          } else {
            outW = Math.max(4000, currentSettings.outputWidth);
            outH = Math.max(4000, currentSettings.outputHeight);
          }

          let outputBlob: Blob;
          let outFilename: string;
          let dotCountReport = 0;

          if (studioModeRef.current === 'vintage-pop' && vintagePopSettingsRef.current) {
            const baseVSettings =
              matchedFilm?.vintagePopSettings ||
              nextItem.vintagePopSettings ||
              vintagePopSettingsRef.current;
            const vSettings: VintagePopSettings = {
              ...baseVSettings,
              outputWidth: outW,
              outputHeight: outH,
              isBackgroundTransparent: currentFormat === 'alpha-png' ? true : baseVSettings.isBackgroundTransparent,
            };
            const vResult = renderVintagePop(img, vSettings);
            img.src = '';

            const baseName = nextItem.name.replace(/\.[^.]+$/, '');
            const ext = getExtensionForFormat(currentFormat);
            outFilename = `${baseName}-vintage-pop.${ext}`;
            dotCountReport = Math.round(vResult.svgString.length / 40);

            if (currentFormat === 'svg') {
              outputBlob = new Blob([vResult.svgString], {
                type: 'image/svg+xml;charset=utf-8',
              });
            } else if (currentFormat === 'alpha-png' || currentFormat === 'png') {
              outputBlob = await new Promise<Blob>((resolve) =>
                vResult.canvas.toBlob((b) => resolve(b || new Blob()), 'image/png')
              );
            } else {
              outputBlob = await new Promise<Blob>((resolve) =>
                vResult.canvas.toBlob((b) => resolve(b || new Blob()), 'image/jpeg', 0.94)
              );
            }
          } else {
            const baseStippleSettings =
              matchedFilm?.settings ||
              nextItem.settings ||
              currentSettings;
            const effectiveSettings: StippleSettings = {
              ...baseStippleSettings,
              outputWidth: outW,
              outputHeight: outH,
              backgroundMode:
                currentFormat === 'alpha-png'
                  ? 'transparent'
                  : baseStippleSettings.backgroundMode,
            };

            const analyzed = analyzeImage(img, effectiveSettings, false);
            const { dots, palette } = generateStippleVectors(
              analyzed,
              effectiveSettings
            );
            const generatedSvg = buildSVGDocument(
              dots,
              effectiveSettings,
              palette
            );

            // Release image element reference immediately for GC
            img.src = '';

            const baseName = nextItem.name.replace(/\.[^.]+$/, '');
            const ext = getExtensionForFormat(currentFormat);
            outFilename = `${baseName}-stipple.${ext}`;
            dotCountReport = dots.length;

            if (currentFormat === 'svg') {
              outputBlob = new Blob([generatedSvg], {
                type: 'image/svg+xml;charset=utf-8',
              });
            } else if (currentFormat === 'png') {
              outputBlob = await exportRasterBlobFromSVG(
                generatedSvg,
                outW,
                outH,
                'png',
                false
              );
            } else if (currentFormat === 'alpha-png') {
              outputBlob = await exportRasterBlobFromSVG(
                generatedSvg,
                outW,
                outH,
                'png',
                true
              );
            } else {
              outputBlob = await exportRasterBlobFromSVG(
                generatedSvg,
                outW,
                outH,
                'jpeg',
                false
              );
            }
          }

          blobStoreRef.current.set(nextItem.id, {
            blob: outputBlob,
            filename: outFilename,
          });

          setQueue((prev) =>
            prev.map((it) =>
              it.id === nextItem.id
                ? {
                    ...it,
                    status: 'done',
                    dotCount: dotCountReport,
                    byteSize: outputBlob.size,
                    outputFilename: outFilename,
                  }
                : it
            )
          );
        } catch (err) {
          setQueue((prev) =>
            prev.map((it) =>
              it.id === nextItem.id
                ? {
                    ...it,
                    status: 'error',
                    error:
                      err instanceof Error ? err.message : 'Processing failed',
                  }
                : it
            )
          );
        }
      }
    } finally {
      isRunningRef.current = false;
      setIsProcessing(false);
    }
  }, []);

  // Add multiple files to the Bulk Queue
  const handleAddBulkFiles = useCallback(
    (fileList: FileList | File[]) => {
      const incoming = Array.from(fileList).filter(isValidImageFile);
      if (incoming.length === 0) return;

      // If no setup image is loaded in the main workspace yet, load the first image as setup
      // while keeping ALL selected images in the batch queue so none are skipped
      if (!hasImage && incoming.length > 0) {
        onLoadSetupFile(incoming[0]);
      }

      const timestamp = Date.now();
      const newItems: BulkQueueItem[] = incoming.map((file, idx) => {
        const baseName = file.name.replace(/\.[^.]+$/, '');
        const ext = getExtensionForFormat(bulkFormatRef.current);
        return {
          id: `bulk-${timestamp}-${idx}-${Math.random().toString(36).slice(2, 7)}`,
          file,
          name: file.name,
          status: 'queued',
          dotCount: 0,
          byteSize: 0,
          outputFilename: `${baseName}-stipple.${ext}`,
        };
      });

      setQueue((prev) => [...prev, ...newItems]);

      if (autoProcessOnAdd) {
        setTimeout(() => {
          runBatchLoop();
        }, 30);
      }
    },
    [hasImage, onLoadSetupFile, autoProcessOnAdd, runBatchLoop]
  );

  // Consume external bulk files dropped onto main canvas or sidebar
  useEffect(() => {
    if (externalBulkFiles && externalBulkFiles.length > 0) {
      handleAddBulkFiles(externalBulkFiles);
      onConsumeExternalBulkFiles?.();
    }
  }, [externalBulkFiles, handleAddBulkFiles, onConsumeExternalBulkFiles]);

  // Synchronize with external clear signal (e.g. from LeftSidebar Remove Image or Filmstrip Clear All)
  useEffect(() => {
    if (clearQueueSignal && clearQueueSignal > 0) {
      stopRequestedRef.current = true;
      blobStoreRef.current.clear();
      setQueue([]);
    }
  }, [clearQueueSignal]);

  // Synchronize with external item removal signal (e.g. from Filmstrip frame X button)
  useEffect(() => {
    if (removeItemSignal && removeItemSignal.name) {
      const targetName = removeItemSignal.name;
      setQueue((prev) => {
        const itemToRemove = prev.find((it) => it.name === targetName);
        if (itemToRemove) {
          blobStoreRef.current.delete(itemToRemove.id);
        }
        return prev.filter((it) => it.name !== targetName);
      });
    }
  }, [removeItemSignal]);

  // When export format or dimension mode changes, re-queue batch items to update format/dimensions
  const exportFormatSignature = JSON.stringify({
    bulkFormat,
    dimensionMode,
  });
  const lastAppliedExportFormatRef = useRef<string>(exportFormatSignature);

  useEffect(() => {
    if (lastAppliedExportFormatRef.current === exportFormatSignature) return;
    lastAppliedExportFormatRef.current = exportFormatSignature;

    if (queueRef.current.length === 0) return;

    const timer = setTimeout(() => {
      stopRequestedRef.current = true;
      blobStoreRef.current.clear();
      const ext = getExtensionForFormat(bulkFormatRef.current);
      setQueue((prev) =>
        prev.map((it) => {
          const baseName = it.name.replace(/\.[^.]+$/, '');
          return {
            ...it,
            status: 'queued',
            dotCount: 0,
            byteSize: 0,
            outputFilename: `${baseName}-stipple.${ext}`,
            error: undefined,
          };
        })
      );
      setTimeout(() => {
        runBatchLoop();
      }, 40);
    }, 250);

    return () => clearTimeout(timer);
  }, [exportFormatSignature, runBatchLoop]);

  // When tuning the active image on artboard, ONLY update and re-queue that specific image's queue item!
  // This ensures other images are NEVER affected or overwritten when working on one image.
  useEffect(() => {
    if (isDraggingSlider) return;
    if (!activeImageName || queueRef.current.length === 0) return;

    const timer = setTimeout(() => {
      setQueue((prev) => {
        let changed = false;
        const updated = prev.map((it) => {
          if (it.name === activeImageName) {
            changed = true;
            blobStoreRef.current.delete(it.id);
            return {
              ...it,
              status: 'queued' as const,
              settings: { ...settings },
              vintagePopSettings: vintagePopSettings ? { ...vintagePopSettings } : undefined,
              error: undefined,
            };
          }
          return it;
        });
        return changed ? updated : prev;
      });
      setTimeout(() => {
        runBatchLoop();
      }, 50);
    }, 350);

    return () => clearTimeout(timer);
  }, [settings, vintagePopSettings, studioMode, isDraggingSlider, activeImageName, runBatchLoop]);

  // When user clicks "Apply to All Images" (applyToAllSignal received), apply settings across the ENTIRE batch!
  useEffect(() => {
    if (!applyToAllSignal) return;
    stopRequestedRef.current = true;
    blobStoreRef.current.clear();
    const ext = getExtensionForFormat(bulkFormatRef.current);
    setQueue((prev) =>
      prev.map((it) => {
        const baseName = it.name.replace(/\.[^.]+$/, '');
        return {
          ...it,
          settings: { ...applyToAllSignal.settings },
          vintagePopSettings: applyToAllSignal.vintagePopSettings
            ? { ...applyToAllSignal.vintagePopSettings }
            : undefined,
          status: 'queued' as const,
          dotCount: 0,
          byteSize: 0,
          outputFilename: `${baseName}-stipple.${ext}`,
          error: undefined,
        };
      })
    );
    setTimeout(() => {
      runBatchLoop();
    }, 60);
  }, [applyToAllSignal, runBatchLoop]);

  const handlePauseProcessing = () => {
    stopRequestedRef.current = true;
  };

  const handleStartOrResume = () => {
    const hasQueued = queueRef.current.some((it) => it.status === 'queued');
    if (!hasQueued) {
      // Re-queue error items if any
      setQueue((prev) =>
        prev.map((it) =>
          it.status === 'error' ? { ...it, status: 'queued', error: undefined } : it
        )
      );
    }
    setTimeout(() => {
      runBatchLoop();
    }, 20);
  };

  const handleRemoveQueueItem = (id: string) => {
    const itemToRemove = queue.find((it) => it.id === id);
    blobStoreRef.current.delete(id);
    setQueue((prev) => prev.filter((it) => it.id !== id));
    if (itemToRemove) {
      onItemRemoved?.(itemToRemove.name);
    }
  };

  const handleClearQueue = () => {
    stopRequestedRef.current = true;
    blobStoreRef.current.clear();
    setQueue([]);
    onClearAllImages?.();
  };

  const handleDownloadSingleItem = async (item: BulkQueueItem) => {
    if (studioMode === 'vintage-pop' && item.name === activeImageName && vintagePopOutput) {
      const ext = getExtensionForFormat(bulkFormat);
      const baseName = item.name.replace(/\.[^.]+$/, '');
      const filename = `${baseName}-vintage-pop.${ext}`;
      let downloadBlob: Blob;

      if (bulkFormat === 'svg') {
        downloadBlob = new Blob([vintagePopOutput.svgString], {
          type: 'image/svg+xml;charset=utf-8',
        });
      } else if (bulkFormat === 'jpeg') {
        downloadBlob = await new Promise<Blob>((resolve, reject) => {
          vintagePopOutput.canvas.toBlob(
            (b) => (b ? resolve(b) : reject(new Error('Canvas export failed'))),
            'image/jpeg',
            0.95
          );
        });
      } else {
        downloadBlob = await new Promise<Blob>((resolve, reject) => {
          vintagePopOutput.canvas.toBlob(
            (b) => (b ? resolve(b) : reject(new Error('Canvas export failed'))),
            'image/png'
          );
        });
      }

      const url = URL.createObjectURL(downloadBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      return;
    }

    const entry = blobStoreRef.current.get(item.id);
    if (!entry) return;
    const url = URL.createObjectURL(entry.blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = entry.filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleDownloadAllZip = async () => {
    const doneItems = queue.filter(
      (it) => it.status === 'done' && blobStoreRef.current.has(it.id)
    );
    if (doneItems.length === 0 || isZipping) return;

    setIsZipping(true);
    try {
      const zip = new JSZip();
      const usedNames = new Map<string, number>();

      for (const item of doneItems) {
        const entry = blobStoreRef.current.get(item.id);
        let itemBlob = entry?.blob;
        if (studioMode === 'vintage-pop' && item.name === activeImageName && vintagePopOutput) {
          if (bulkFormat === 'svg') {
            itemBlob = new Blob([vintagePopOutput.svgString], {
              type: 'image/svg+xml;charset=utf-8',
            });
          }
        }
        if (!itemBlob || !entry) continue;

        let finalName = entry.filename;
        const count = usedNames.get(finalName.toLowerCase()) || 0;
        usedNames.set(finalName.toLowerCase(), count + 1);
        if (count > 0) {
          const dotIdx = finalName.lastIndexOf('.');
          if (dotIdx !== -1) {
            finalName = `${finalName.slice(0, dotIdx)}-${count + 1}${finalName.slice(dotIdx)}`;
          } else {
            finalName = `${finalName}-${count + 1}`;
          }
        }

        zip.file(finalName, itemBlob);
      }

      const zipBlob = await zip.generateAsync({
        type: 'blob',
        compression: 'DEFLATE',
        compressionOptions: { level: 1 },
      });

      const url = URL.createObjectURL(zipBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `vector-stipple-bulk-${doneItems.length}-files.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } finally {
      setIsZipping(false);
    }
  };

  const totalCount = queue.length;
  const doneCount = queue.filter((it) => it.status === 'done').length;
  const queuedCount = queue.filter((it) => it.status === 'queued').length;
  const errorCount = queue.filter((it) => it.status === 'error').length;
  const progressPercent =
    totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : 0;
  const activeCustomPreset = customPresets.find((p) => p.id === activePresetId);

  return (
    <aside className="w-72 xl:w-80 bg-white border-l border-slate-200 flex flex-col h-full shrink-0 select-none overflow-hidden divide-y divide-slate-200 text-slate-900">
      {/* 1. PRIMARY EXPORT SECTION */}
      <div className="p-4 bg-slate-50 space-y-3 shrink-0">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold tracking-wide text-slate-900 flex items-center gap-1.5">
            <FileCode className="w-3.5 h-3.5 text-[#D97706]" />
            <span>{studioMode === 'vintage-pop' ? 'Vintage Pop Export Studio' : 'Vector Export Studio'}</span>
          </span>
          <span className="font-mono text-[11px] font-bold text-slate-900 tabular-nums">
            {studioMode === 'vintage-pop' && vintagePopOutput
              ? formatBytes(vintagePopOutput.svgString.length)
              : formatBytes(validation.byteSize)}
          </span>
        </div>

        <button
          type="button"
          disabled={!hasImage || (studioMode === 'vintage-pop' ? !vintagePopOutput : !validation.valid)}
          onClick={onExportSVG}
          className="w-full py-2.5 px-4 rounded-lg bg-[#D97706] hover:bg-[#B45309] text-white font-bold text-xs flex items-center justify-center gap-2 shadow-sm transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Download className="w-4 h-4" />
          <span>{studioMode === 'vintage-pop' ? 'Export Vintage Pop SVG Vector' : 'Export Editable SVG Vector'}</span>
        </button>

        <div className="grid grid-cols-2 gap-1.5">
          <button
            type="button"
            disabled={!hasImage || (studioMode === 'vintage-pop' && !vintagePopOutput)}
            onClick={() => onExportRaster('png', true)}
            className="py-1.5 px-2 rounded bg-white hover:bg-slate-100 text-[11px] font-semibold text-slate-900 border border-slate-300 flex items-center justify-center gap-1 transition-colors whitespace-nowrap cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <FileImage className="w-3 h-3 text-[#D97706] shrink-0" />
            <span>{studioMode === 'vintage-pop' ? 'Sticker PNG (Alpha)' : 'Alpha PNG'}</span>
          </button>

          <button
            type="button"
            disabled={!hasImage || (studioMode === 'vintage-pop' && !vintagePopOutput)}
            onClick={() => onExportRaster('jpeg', false)}
            className="py-1.5 px-2 rounded bg-white hover:bg-slate-100 text-[11px] font-semibold text-slate-900 border border-slate-300 flex items-center justify-center gap-1 transition-colors whitespace-nowrap cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <FileImage className="w-3 h-3 text-[#D97706] shrink-0" />
            <span>JPG Preview</span>
          </button>
        </div>

        {/* Pre-Export SVG Validation Checklist */}
        <div className="p-2.5 rounded bg-white border border-slate-300 space-y-1">
          {studioMode === 'vintage-pop' ? (
            <>
              <div className="flex items-center justify-between text-[11px]">
                <span className="font-semibold text-slate-900">Pop Art Collage Audit</span>
                <span className="text-emerald-700 font-bold flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" />
                  <span>{vintagePopOutput ? 'Ready 60fps' : 'Ready for Image'}</span>
                </span>
              </div>
              <div className="text-[11px] text-slate-900 font-mono font-semibold tabular-nums flex items-center justify-between">
                <span>Sticker Border:</span>
                <span className="text-slate-900 font-bold">
                  {vintagePopSettings?.stickerBorderEnabled
                    ? `${vintagePopSettings.stickerBorderStyle === 'torn-paper' ? 'Torn' : 'Smooth'} (${vintagePopSettings.stickerBorderWidth}px)`
                    : 'None'}
                </span>
              </div>
              <div className="text-[11px] text-slate-900 font-mono font-semibold tabular-nums flex items-center justify-between">
                <span>Halftone Screen:</span>
                <span className="text-[#B45309] font-bold uppercase">
                  {vintagePopSettings?.halftoneStyle || 'dots'}
                </span>
              </div>
              <div className="text-[11px] text-slate-900 font-mono font-semibold tabular-nums flex items-center justify-between">
                <span>Coloring Mode:</span>
                <span className="text-emerald-700 font-bold capitalize">
                  {vintagePopSettings?.coloringMode || 'tri-color'}
                </span>
              </div>
            </>
          ) : (
            <>
              <div className="flex items-center justify-between text-[11px]">
                <span className="font-semibold text-slate-900">SVG Geometry Audit</span>
                <span className="text-emerald-700 font-bold flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" />
                  <span>
                    {validation.valid ? 'Verified Pure Vector' : 'Ready for Image'}
                  </span>
                </span>
              </div>
              <div className="text-[11px] text-slate-900 font-mono font-semibold tabular-nums flex items-center justify-between">
                <span>Vector Dots:</span>
                <span className="text-slate-900 font-bold">
                  {stats.totalDots.toLocaleString()}
                </span>
              </div>
              <div className="text-[11px] text-slate-900 font-mono font-semibold tabular-nums flex items-center justify-between">
                <span>Primitive Type:</span>
                <span className="text-[#B45309] font-bold uppercase">
                  &lt;
                  {settings.mergeShapes
                    ? 'path'
                    : settings.dotShape === 'circle'
                    ? 'circle'
                    : settings.dotShape === 'ellipse'
                    ? 'ellipse'
                    : settings.dotShape === 'diamond'
                    ? 'polygon'
                    : settings.dotShape === 'organic'
                    ? 'path'
                    : 'rect'}
                  &gt;
                </span>
              </div>
              <div className="text-[11px] text-slate-900 font-mono font-semibold tabular-nums flex items-center justify-between">
                <span>Embedded Raster:</span>
                <span className="text-emerald-700 font-bold">0 (None)</span>
              </div>
            </>
          )}
        </div>
      </div>

      {/* 2. BULK / BATCH IMAGE PROCESSOR (100+ IMAGES WITH ACTIVE SETUP) */}
      <div className="p-4 flex-1 flex flex-col min-h-0 space-y-3 overflow-hidden bg-white">
        <div className="flex items-center justify-between shrink-0">
          <span className="text-xs font-bold tracking-wide text-slate-900 flex items-center gap-1.5">
            <Images className="w-3.5 h-3.5 text-[#D97706]" />
            <span>Bulk Batch Processor</span>
          </span>
          <span className="text-[11px] font-mono font-bold text-[#B45309]">
            100+ Images
          </span>
        </div>

        {/* Output Format & Artboard Ratio Settings */}
        <div className="space-y-2 shrink-0">
          <div className="grid grid-cols-4 gap-1">
            {(
              [
                { id: 'svg', label: 'SVG' },
                { id: 'png', label: 'PNG' },
                { id: 'alpha-png', label: 'Alpha' },
                { id: 'jpeg', label: 'JPG' },
              ] as { id: BulkExportFormat; label: string }[]
            ).map((fmt) => (
              <button
                key={fmt.id}
                type="button"
                onClick={() => setBulkFormat(fmt.id)}
                className={`py-1 px-1.5 text-[11px] font-semibold rounded border transition-colors ${
                  bulkFormat === fmt.id
                    ? 'bg-[#D97706] border-[#B45309] text-white shadow-sm'
                    : 'bg-slate-100 border-slate-300 text-slate-900 hover:bg-slate-200'
                }`}
              >
                {fmt.label}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-1">
            <button
              type="button"
              onClick={() => {
                setDimensionMode('auto-aspect');
                setIsLockMenuOpen(false);
              }}
              title="Automatically preserve each image's own aspect ratio"
              className={`py-1 px-2 text-[11px] font-semibold rounded border transition-colors truncate cursor-pointer ${
                dimensionMode === 'auto-aspect'
                  ? 'bg-[#D97706] border-[#B45309] text-white shadow-sm'
                  : 'bg-slate-100 border-slate-300 text-slate-900 hover:bg-slate-200'
              }`}
            >
              Auto-Fit Ratio
            </button>

            {/* Lock Resolution Dropdown Menu */}
            <div className="relative" ref={lockMenuRef}>
              <button
                type="button"
                onClick={() => {
                  if (dimensionMode === 'auto-aspect') {
                    setDimensionMode(lastLockMode);
                    if (lastLockMode === 'lock-4x') {
                      onSetArtboardSize?.(4096, 4096);
                    } else {
                      onSetArtboardSize?.(4000, 4000);
                    }
                  }
                  setIsLockMenuOpen((prev) => !prev);
                }}
                title="Select Lock Resolution (Min 4000, 4K)"
                className={`w-full py-1 px-2 text-[11px] font-semibold rounded border transition-colors flex items-center justify-between gap-1 cursor-pointer truncate ${
                  dimensionMode !== 'auto-aspect'
                    ? 'bg-[#D97706] border-[#B45309] text-white shadow-sm'
                    : 'bg-slate-100 border-slate-300 text-slate-900 hover:bg-slate-200'
                }`}
              >
                <span className="truncate">
                  {dimensionMode === 'lock-4x' ||
                  (dimensionMode === 'auto-aspect' && lastLockMode === 'lock-4x')
                    ? 'Lock 4x (4096)'
                    : 'Lock Min (4000)'}
                </span>
                <ChevronDown
                  className={`w-3 h-3 shrink-0 transition-transform ${
                    isLockMenuOpen ? 'rotate-180' : ''
                  }`}
                />
              </button>

              {/* Dropdown Menu Popup */}
              {isLockMenuOpen && (
                <div className="absolute right-0 top-full mt-1 w-44 bg-white border border-slate-300 rounded-md shadow-lg z-50 py-1 text-xs">
                  <button
                    type="button"
                    onClick={() => {
                      setDimensionMode('lock-2x');
                      setLastLockMode('lock-2x');
                      onSetArtboardSize?.(4000, 4000);
                      setIsLockMenuOpen(false);
                    }}
                    className={`w-full px-2.5 py-1.5 text-left flex items-center justify-between hover:bg-amber-50 cursor-pointer ${
                      dimensionMode === 'lock-2x'
                        ? 'text-[#B45309] font-bold bg-amber-50/70'
                        : 'text-slate-800'
                    }`}
                  >
                    <span>Lock Min (4000)</span>
                    {dimensionMode === 'lock-2x' && (
                      <Check className="w-3.5 h-3.5 text-[#D97706]" />
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setDimensionMode('lock-4x');
                      setLastLockMode('lock-4x');
                      onSetArtboardSize?.(4096, 4096);
                      setIsLockMenuOpen(false);
                    }}
                    className={`w-full px-2.5 py-1.5 text-left flex items-center justify-between hover:bg-amber-50 cursor-pointer ${
                      dimensionMode === 'lock-4x'
                        ? 'text-[#B45309] font-bold bg-amber-50/70'
                        : 'text-slate-800'
                    }`}
                  >
                    <span>Lock 4x (4096)</span>
                    {dimensionMode === 'lock-4x' && (
                      <Check className="w-3.5 h-3.5 text-[#D97706]" />
                    )}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Saved Setups Box (Save Current Setup & Select Saved Setup) */}
        <div className="pt-2 border-t border-slate-200 space-y-2 shrink-0">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-900 flex items-center gap-1">
              <BookmarkPlus className="w-3.5 h-3.5 text-[#D97706]" />
              <span>Save & Select Setup</span>
            </span>
            <span className="text-[10px] font-mono font-bold text-slate-700">
              {customPresets.length} Saved
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <input
              type="text"
              value={setupName}
              onChange={(e) => setSetupName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && setupName.trim()) {
                  onSaveCustomPreset(setupName.trim());
                  setSetupName('');
                }
              }}
              placeholder="Write setup name..."
              className="flex-1 min-w-0 bg-white border border-slate-300 rounded px-2 py-1.5 text-xs font-medium text-slate-900 placeholder-slate-500 focus:outline-none focus:border-[#D97706]"
            />
            <button
              type="button"
              disabled={!setupName.trim()}
              onClick={() => {
                if (setupName.trim()) {
                  onSaveCustomPreset(setupName.trim());
                  setSetupName('');
                }
              }}
              className="px-2.5 py-1.5 bg-[#D97706] hover:bg-[#B45309] text-white text-xs font-bold rounded flex items-center gap-1 whitespace-nowrap cursor-pointer transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
            >
              <BookmarkPlus className="w-3.5 h-3.5" />
              <span>Save Setup</span>
            </button>
          </div>

          {/* Presets Dropdown Menu ("এই খালি ঘরে ক্লিক করলেই সেভ করা প্রিসেট গুলো দেখা যাবে") */}
          <div className="relative" ref={presetMenuRef}>
            <button
              type="button"
              onClick={() => setIsPresetMenuOpen((prev) => !prev)}
              className={`w-full py-1.5 px-2.5 bg-white border rounded text-xs flex items-center justify-between gap-1.5 cursor-pointer transition-all shadow-xs text-left ${
                isPresetMenuOpen
                  ? 'border-[#D97706] ring-1 ring-[#D97706]/30'
                  : 'border-slate-300 hover:border-slate-400'
              }`}
            >
              <div className="flex items-center gap-2 min-w-0 flex-1">
                {activeCustomPreset ? (
                  <span className="w-2 h-2 rounded-full bg-[#D97706] shrink-0" />
                ) : (
                  <BookmarkPlus className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                )}
                <span
                  className={`truncate ${
                    activeCustomPreset
                      ? 'font-bold text-slate-900'
                      : 'font-normal text-slate-500'
                  }`}
                >
                  {activeCustomPreset
                    ? activeCustomPreset.name
                    : customPresets.length > 0
                    ? 'Select Saved Preset...'
                    : 'Select Saved Preset... (খালি ঘর)'}
                </span>
              </div>
              <ChevronDown
                className={`w-3.5 h-3.5 text-slate-500 shrink-0 transition-transform duration-150 ${
                  isPresetMenuOpen ? 'rotate-180 text-[#D97706]' : ''
                }`}
              />
            </button>

            {/* Dropdown Popup List */}
            {isPresetMenuOpen && (
              <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-slate-300 rounded-md shadow-xl z-50 py-1 max-h-48 overflow-y-auto divide-y divide-slate-100">
                {customPresets.length === 0 ? (
                  <div className="px-3 py-3 text-center text-xs text-slate-500 font-medium space-y-0.5">
                    <div>কোনো সেভ করা প্রিসেট নেই</div>
                    <div className="text-[10px] text-slate-400">
                      উপরে নাম লিখে Save Setup করুন
                    </div>
                  </div>
                ) : (
                  customPresets.map((preset) => {
                    const isActive = activePresetId === preset.id;
                    return (
                      <div
                        key={preset.id}
                        className={`flex items-center justify-between gap-1.5 px-2.5 py-1.5 transition-colors cursor-pointer ${
                          isActive
                            ? 'bg-amber-50 text-[#B45309] font-bold'
                            : 'hover:bg-slate-50 text-slate-800'
                        }`}
                      >
                        <button
                          type="button"
                          onClick={() => {
                            onSelectPreset(preset);
                            setIsPresetMenuOpen(false);
                          }}
                          className="flex-1 text-left min-w-0 flex items-center gap-1.5 cursor-pointer focus:outline-none"
                        >
                          {isActive ? (
                            <Check className="w-3.5 h-3.5 text-[#D97706] shrink-0" />
                          ) : (
                            <span className="w-3.5 h-3.5 shrink-0" />
                          )}
                          <span className="text-xs truncate">{preset.name}</span>
                        </button>

                        {presetToDeleteId === preset.id ? (
                          <div className="flex items-center gap-1 shrink-0 ml-1">
                            <span className="text-[10px] font-bold text-red-600">
                              মুছবেন?
                            </span>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                onDeleteCustomPreset(preset.id);
                                setPresetToDeleteId(null);
                              }}
                              className="px-1.5 py-0.5 rounded bg-red-600 hover:bg-red-700 text-white text-[10px] font-bold cursor-pointer"
                            >
                              হ্যাঁ
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setPresetToDeleteId(null);
                              }}
                              className="px-1.5 py-0.5 rounded bg-slate-200 hover:bg-slate-300 text-slate-800 text-[10px] font-bold cursor-pointer"
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
                            title="Delete saved setup"
                            className="p-1 text-slate-400 hover:text-red-600 rounded transition-colors shrink-0 ml-1 cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            )}
          </div>
        </div>

        {/* Batch Controls & Progress Section */}
        {totalCount > 0 && (
          <div className="space-y-2 shrink-0 bg-slate-50 p-2.5 rounded-lg border border-slate-300">
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-slate-900 font-semibold flex items-center gap-1.5">
                {isProcessing && (
                  <Loader2 className="w-3 h-3 text-[#D97706] animate-spin" />
                )}
                <span>
                  {isProcessing
                    ? `Processing ${doneCount + 1} of ${totalCount}...`
                    : doneCount === totalCount
                    ? `Completed (${doneCount}/${totalCount})`
                    : `Progress: ${doneCount}/${totalCount}`}
                </span>
              </span>
              <span className="font-mono font-bold text-[#B45309] tabular-nums">
                {progressPercent}%
              </span>
            </div>

            {/* Progress Bar */}
            <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden border border-slate-300">
              <div
                style={{ width: `${progressPercent}%` }}
                className="h-full bg-[#D97706] transition-all duration-150"
              />
            </div>

            {/* Action Buttons: Start/Pause, Download ZIP */}
            {(isProcessing || queuedCount > 0 || errorCount > 0) && (
              <div className="flex items-center gap-1.5 pt-0.5">
                {isProcessing ? (
                  <button
                    type="button"
                    onClick={handlePauseProcessing}
                    className="flex-1 py-1.5 px-2.5 rounded bg-amber-100 hover:bg-amber-200 text-slate-900 border border-amber-500 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Pause className="w-3.5 h-3.5 text-[#B45309]" />
                    <span>Pause Batch</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleStartOrResume}
                    className="flex-1 py-1.5 px-2.5 rounded bg-[#D97706] hover:bg-[#B45309] text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Play className="w-3.5 h-3.5" />
                    <span>
                      Process {queuedCount > 0 ? queuedCount : errorCount} Queued
                    </span>
                  </button>
                )}
              </div>
            )}

            {/* Download All as ZIP Button */}
            <button
              type="button"
              disabled={doneCount === 0 || isZipping}
              onClick={handleDownloadAllZip}
              className="w-full py-2 px-3 rounded-md bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isZipping ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Building ZIP Archive...</span>
                </>
              ) : (
                <>
                  <FileArchive className="w-3.5 h-3.5" />
                  <span>
                    Download All as ZIP ({doneCount}{' '}
                    {bulkFormat.toUpperCase()})
                  </span>
                </>
              )}
            </button>
          </div>
        )}

        {/* Scrollable Queue List */}
        {totalCount > 0 && (
          <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
            <div className="flex items-center justify-between text-[11px] font-semibold text-slate-900 pb-1.5 shrink-0">
              <span className="font-mono font-bold">
                Batch Queue ({totalCount} files)
              </span>
              <button
                type="button"
                onClick={handleClearQueue}
                className="text-[11px] font-semibold text-slate-800 hover:text-red-700 flex items-center gap-1 transition-colors"
              >
                <Trash2 className="w-3 h-3" />
                <span>Clear All</span>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-1 pr-0.5">
              {queue.map((item, index) => (
                <div
                  key={item.id}
                  className="px-2 py-1.5 rounded bg-slate-50 border border-slate-300 flex items-center justify-between gap-2 text-xs"
                >
                  <div className="flex items-center gap-1.5 min-w-0 flex-1">
                    <span className="font-mono text-[10px] font-bold text-slate-700 w-5 shrink-0 tabular-nums">
                      #{index + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="text-[11px] font-semibold text-slate-900 truncate">
                        {item.name}
                      </div>
                      <div className="text-[10px] font-mono font-semibold text-slate-800 flex items-center gap-1.5">
                        {item.status === 'done' && (
                          <span className="text-emerald-700 font-bold">
                            ✓ {item.dotCount.toLocaleString()} dots ·{' '}
                            {formatBytes(item.byteSize)}
                          </span>
                        )}
                        {item.status === 'processing' && (
                          <span className="text-[#B45309] font-bold">
                            Processing setup...
                          </span>
                        )}
                        {item.status === 'queued' && (
                          <span className="text-slate-700">Queued</span>
                        )}
                        {item.status === 'error' && (
                          <span className="text-red-700 font-bold">
                            {item.error || 'Error'}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => onLoadSetupFile(item.file)}
                      title="Load this image into main preview canvas"
                      className="p-1 rounded hover:bg-slate-200 text-slate-900 transition-colors"
                    >
                      <Eye className="w-3.5 h-3.5" />
                    </button>
                    {item.status === 'done' && (
                      <button
                        type="button"
                        onClick={() => handleDownloadSingleItem(item)}
                        title="Download this processed file"
                        className="p-1 rounded hover:bg-slate-200 text-[#B45309] transition-colors"
                      >
                        <Download className="w-3.5 h-3.5" />
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => handleRemoveQueueItem(item.id)}
                      title="Remove from batch"
                      className="p-1 rounded hover:bg-red-100 text-slate-800 hover:text-red-700 transition-colors"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </aside>
  );
};
