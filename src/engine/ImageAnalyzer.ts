import { StippleSettings } from '../types/stipple';

export interface ContentBounds {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  width: number;
  height: number;
}

export interface AnalyzedImageBuffer {
  width: number;
  height: number;
  sourceWidth: number;
  sourceHeight: number;
  largeImageOptimized: boolean;
  contentBounds?: ContentBounds;
  /** Darkness map in [0, 1] where 1.0 = deepest shadow/ink, 0.0 = paper white */
  darknessMap: Float32Array;
  /** Raw perceptual luminance in [0, 255] before tonal curve */
  rawLuminance: Float32Array;
  /** Normalized Sobel edge magnitude in [0, 1] */
  edgeMap: Float32Array;
  /** Edge tangent angle in radians [-PI, PI] */
  edgeAngleMap: Float32Array;
  /** Alpha channel in [0, 1] */
  alphaMap: Float32Array;
  /** Color channels R, G, B in [0, 255] adjusted for saturation & color balance */
  rMap: Uint8ClampedArray;
  gMap: Uint8ClampedArray;
  bMap: Uint8ClampedArray;
  /** Quantized palette hex colors when in multicolor mode */
  quantizedPalette: string[];
  /** Per-pixel nearest palette layer index for multicolor mode */
  paletteIndexMap: Uint8Array;
}

function rgbToHex(r: number, g: number, b: number): string {
  const cr = Math.max(0, Math.min(255, Math.round(r)));
  const cg = Math.max(0, Math.min(255, Math.round(g)));
  const cb = Math.max(0, Math.min(255, Math.round(b)));
  return (
    '#' +
    cr.toString(16).padStart(2, '0') +
    cg.toString(16).padStart(2, '0') +
    cb.toString(16).padStart(2, '0')
  );
}

/**
 * Builds an integral image (summed-area table) for O(1) arbitrary window mean lookups.
 */
function buildIntegralImage(data: Float32Array, width: number, height: number): Float64Array {
  const integral = new Float64Array((width + 1) * (height + 1));
  const stride = width + 1;

  for (let y = 1; y <= height; y++) {
    let rowSum = 0;
    const srcRow = (y - 1) * width;
    const dstRow = y * stride;
    const prevDstRow = (y - 1) * stride;
    for (let x = 1; x <= width; x++) {
      rowSum += data[srcRow + (x - 1)];
      integral[dstRow + x] = integral[prevDstRow + x] + rowSum;
    }
  }
  return integral;
}

function sampleBoxMean(
  integral: Float64Array,
  width: number,
  height: number,
  cx: number,
  cy: number,
  radius: number
): number {
  const x0 = Math.max(0, cx - radius);
  const y0 = Math.max(0, cy - radius);
  const x1 = Math.min(width - 1, cx + radius);
  const y1 = Math.min(height - 1, cy + radius);

  const stride = width + 1;
  const sum =
    integral[(y1 + 1) * stride + (x1 + 1)] -
    integral[y0 * stride + (x1 + 1)] -
    integral[(y1 + 1) * stride + x0] +
    integral[y0 * stride + x0];

  const count = (x1 - x0 + 1) * (y1 - y0 + 1);
  return count > 0 ? sum / count : 0;
}

/**
 * Performs real perceptual luminance extraction, detail/smoothing/local-contrast filtering,
 * tonal curve mapping, Sobel edge detection, and color layer quantization.
 */
export function analyzeImage(
  source: HTMLImageElement | HTMLCanvasElement,
  settings: StippleSettings,
  isInteractiveDrag = false
): AnalyzedImageBuffer {
  const sourceWidth =
    source instanceof HTMLImageElement ? source.naturalWidth || source.width : source.width;
  const sourceHeight =
    source instanceof HTMLImageElement ? source.naturalHeight || source.height : source.height;

  const largeImageOptimized = sourceWidth > 1800 || sourceHeight > 1800;

  // Determine base target dimension from Preview Quality & Vector Resolution
  let baseMaxDim = 540;
  if (settings.previewQuality === 'fast') baseMaxDim = 340;
  else if (settings.previewQuality === 'balanced') baseMaxDim = 540;
  else if (settings.previewQuality === 'high') baseMaxDim = 760;
  else if (settings.previewQuality === 'maximum') baseMaxDim = 1040;

  if (isInteractiveDrag) {
    baseMaxDim = Math.min(baseMaxDim, 420);
  }

  const targetMaxDim = Math.max(
    160,
    Math.min(1280, Math.round(baseMaxDim * (settings.vectorResolution / 100)))
  );

  const aspect = sourceWidth / Math.max(1, sourceHeight);
  let width: number;
  let height: number;

  if (aspect >= 1) {
    width = targetMaxDim;
    height = Math.max(64, Math.round(targetMaxDim / aspect));
  } else {
    height = targetMaxDim;
    width = Math.max(64, Math.round(targetMaxDim * aspect));
  }

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) {
    throw new Error('Failed to initialize 2D analysis context.');
  }

  // Fill white or transparent prior to drawing based on alphaMode
  if (settings.alphaMode === 'fill' || settings.includeBgInStipple) {
    ctx.fillStyle = settings.backgroundColor || '#FFFFFF';
    ctx.fillRect(0, 0, width, height);
  } else {
    ctx.clearRect(0, 0, width, height);
  }

  ctx.drawImage(source, 0, 0, width, height);
  const imgData = ctx.getImageData(0, 0, width, height).data;

  const pixelCount = width * height;
  const rawLuminance = new Float32Array(pixelCount);
  const alphaMap = new Float32Array(pixelCount);
  const rMap = new Uint8ClampedArray(pixelCount);
  const gMap = new Uint8ClampedArray(pixelCount);
  const bMap = new Uint8ClampedArray(pixelCount);

  const satFactor = settings.colorSaturation / 100;
  const balanceShift = settings.colorBalance * 0.85; // Warm/Cool shift

  // Step 1: Extract Perceptual Luminance (Y = 0.2126R + 0.7152G + 0.0722B) & Adjusted RGB
  for (let i = 0; i < pixelCount; i++) {
    const idx = i * 4;
    const r = imgData[idx];
    const g = imgData[idx + 1];
    const b = imgData[idx + 2];
    const a = imgData[idx + 3] / 255;

    alphaMap[i] = settings.alphaMode === 'ignore' ? 1.0 : a;

    // True Rec. 709 perceptual luminance
    let lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;

    // If transparent pixel and not ignoring alpha, blend toward white unless includeBgInStipple
    if (a < 0.999 && settings.alphaMode === 'preserve' && !settings.includeBgInStipple) {
      lum = lum * a + 255 * (1 - a);
    }

    rawLuminance[i] = lum;

    // Adjust color channels for saturation and color balance
    let nr = r + balanceShift;
    let ng = g + balanceShift * 0.15;
    let nb = b - balanceShift;

    const cLum = 0.2126 * nr + 0.7152 * ng + 0.0722 * nb;
    nr = cLum + (nr - cLum) * satFactor;
    ng = cLum + (ng - cLum) * satFactor;
    nb = cLum + (nb - cLum) * satFactor;

    rMap[i] = nr;
    gMap[i] = ng;
    bMap[i] = nb;
  }

  // Step 2: Build Integral Image for Smoothing, Detail/Sharpen, and Local Contrast
  const integral = buildIntegralImage(rawLuminance, width, height);
  const processedLum = new Float32Array(pixelCount);

  const smoothRadius = Math.max(1, Math.round((settings.smoothing / 100) * 6));
  const smoothMix = settings.smoothing / 100;
  const edgePreserveWeight = settings.edgePreservation / 100;
  const detailBoost = (settings.detail - 50) / 50; // [-1, 1]
  const sharpenBoost = (settings.sharpen / 100) * 1.4;
  const localContrastBoost = (settings.localContrast / 100) * 1.25;
  const localWindowRadius = Math.max(4, Math.round(Math.min(width, height) * 0.04));

  for (let y = 0; y < height; y++) {
    const rowOffset = y * width;
    for (let x = 0; x < width; x++) {
      const i = rowOffset + x;
      const centerLum = rawLuminance[i];

      // Fine neighborhood mean (radius 2) for unsharp mask & smoothing
      const fineMean = sampleBoxMean(integral, width, height, x, y, smoothRadius);
      const diffFine = centerLum - fineMean;

      // Edge-preserving bilateral-like attenuation: large jumps are preserved when edgePreservation > 0
      const edgeJump = Math.min(1, Math.abs(diffFine) / 45);
      const effectiveSmooth = smoothMix * (1 - edgeJump * edgePreserveWeight * 0.85);

      // Apply smoothing
      let val = centerLum * (1 - effectiveSmooth) + fineMean * effectiveSmooth;

      // Apply Detail & Sharpen (high-frequency unsharp mask)
      const highFreq = centerLum - sampleBoxMean(integral, width, height, x, y, 2);
      val += highFreq * (sharpenBoost + detailBoost * 0.75);

      // Apply Local Contrast (CLAHE-inspired local window deviation)
      if (localContrastBoost > 0) {
        const localMean = sampleBoxMean(integral, width, height, x, y, localWindowRadius);
        val += (val - localMean) * localContrastBoost;
      }

      processedLum[i] = Math.max(0, Math.min(255, val));
    }
  }

  // Step 3: Compute Sobel Edge Magnitude & Edge Orientation on processedLum
  const edgeMap = new Float32Array(pixelCount);
  const edgeAngleMap = new Float32Array(pixelCount);
  let maxEdgeVal = 1e-5;

  for (let y = 1; y < height - 1; y++) {
    const r0 = (y - 1) * width;
    const r1 = y * width;
    const r2 = (y + 1) * width;
    for (let x = 1; x < width - 1; x++) {
      const gx =
        -processedLum[r0 + x - 1] +
        processedLum[r0 + x + 1] -
        2 * processedLum[r1 + x - 1] +
        2 * processedLum[r1 + x + 1] -
        processedLum[r2 + x - 1] +
        processedLum[r2 + x + 1];

      const gy =
        -processedLum[r0 + x - 1] -
        2 * processedLum[r0 + x] -
        processedLum[r0 + x + 1] +
        processedLum[r2 + x - 1] +
        2 * processedLum[r2 + x] +
        processedLum[r2 + x + 1];

      const mag = Math.hypot(gx, gy);
      const idx = r1 + x;
      edgeMap[idx] = mag;
      if (mag > maxEdgeVal) maxEdgeVal = mag;
      // Tangent angle along the contour is perpendicular to gradient vector
      edgeAngleMap[idx] = Math.atan2(gy, gx) + Math.PI * 0.5;
    }
  }

  // Normalize edgeMap and apply edgeStrength
  const edgeMult = settings.edgeStrength / 100;
  for (let i = 0; i < pixelCount; i++) {
    const norm = Math.min(1, (edgeMap[i] / Math.max(80, maxEdgeVal * 0.65)) * edgeMult);
    edgeMap[i] = norm;
  }

  // Step 4: Tonal Mapping -> Compute darknessMap in [0, 1]
  // Measure 2nd and 98th percentile luminance of opaque pixels so low-contrast photos still achieve full pitch-black & crisp white range
  const hist = new Int32Array(256);
  let opaqueCount = 0;
  for (let i = 0; i < pixelCount; i++) {
    if (alphaMap[i] > 0.15) {
      const bin = Math.max(0, Math.min(255, Math.round(processedLum[i])));
      hist[bin]++;
      opaqueCount++;
    }
  }

  let autoMinLum = 0;
  let autoMaxLum = 255;
  if (opaqueCount > 32) {
    const lowTarget = opaqueCount * 0.01;
    const highTarget = opaqueCount * 0.99;
    let acc = 0;
    for (let b = 0; b < 256; b++) {
      acc += hist[b];
      if (acc >= lowTarget) {
        autoMinLum = b;
        break;
      }
    }
    acc = 0;
    for (let b = 255; b >= 0; b--) {
      acc += hist[b];
      if (acc >= opaqueCount - highTarget) {
        autoMaxLum = b;
        break;
      }
    }
  }
  const autoSpan = Math.max(45, autoMaxLum - autoMinLum);

  const darknessMap = new Float32Array(pixelCount);
  const blackLvl = Math.min(settings.blackLevel, settings.whiteLevel - 5);
  const whiteLvl = Math.max(settings.whiteLevel, blackLvl + 5);
  const levelSpan = whiteLvl - blackLvl;

  const brightnessOffset = (settings.brightness / 100) * 120;
  // Contrast factor using balanced photographic tangent curve
  const contrastNorm = (settings.contrast / 100) * 0.82;
  const contrastFactor = (1 + contrastNorm) / Math.max(0.08, 1 - contrastNorm);
  const invGamma = 1 / Math.max(0.2, settings.gamma);

  const shadowGain = settings.shadowStrength / 100;
  const midtoneGain = settings.midtoneStrength / 100;
  const highlightGain = settings.highlightStrength / 100;

  const threshMix = settings.threshold / 100;
  const threshNorm = 1.0 - settings.thresholdPoint / 255; // Darkness cutoff
  const edgeContrastGain = (settings.edgeContrast / 100) * 0.55;

  for (let i = 0; i < pixelCount; i++) {
    // Gentle 28% auto-range normalization blended with 72% true luminance so midtones stay natural
    const rawL = processedLum[i];
    const autoNormL = ((rawL - autoMinLum) / autoSpan) * 255;
    let l = rawL * 0.72 + Math.max(0, Math.min(255, autoNormL)) * 0.28;

    // 1. Apply Brightness
    l += brightnessOffset;

    // 2. Apply Black Level & White Level normalization -> [0, 1] brightness
    l = (l - blackLvl) / levelSpan;
    l = Math.max(0, Math.min(1, l));

    // 3. Apply Contrast around midpoint 0.5
    l = (l - 0.5) * contrastFactor + 0.5;
    l = Math.max(0, Math.min(1, l));

    // 4. Apply Gamma
    l = Math.pow(l, invGamma);

    // 5. Invert if requested
    if (settings.invert) {
      l = 1.0 - l;
    }

    // Convert normalized brightness l in [0,1] to darkness d = 1 - l
    let d = 1.0 - l;

    // 6. Apply 3-band Shadow / Midtone / Highlight tonal shaping (preserving [0,1] endpoints cleanly)
    const shadowDelta = (shadowGain - 1.0) * 0.45;
    const midtoneDelta = (midtoneGain - 1.0) * 0.35;
    const highlightDelta = (highlightGain - 1.0) * 0.45;

    const wShadow = d * d;
    const wMidtone = 4 * d * (1 - d) * d;
    const wHighlight = (1 - d) * (1 - d) * d;

    d = d + wShadow * shadowDelta + wMidtone * midtoneDelta + wHighlight * highlightDelta;

    // Clean highlight floor when highlightStrength < 100 so light backgrounds have zero stray pepper dots
    if (highlightGain < 0.98) {
      const floorCutoff = (1.0 - highlightGain) * 0.12;
      if (d <= floorCutoff) {
        d = 0;
      } else {
        d = (d - floorCutoff) / (1.0 - floorCutoff);
      }
    }

    d = Math.max(0, Math.min(1, d));

    // 7. Apply Edge Contrast boost (reinforces dark contour lines and crevices)
    if (d > 0.04 || edgeMap[i] > 0.22) {
      d = Math.min(1, d + edgeMap[i] * edgeContrastGain);
    }

    // 8. Apply Posterized Threshold Mix (steep S-curve transition + deep pitch-black shadow core)
    if (threshMix > 0) {
      const steepness = 5 + threshMix * 22;
      const posterizedD = 1 / (1 + Math.exp(-steepness * (d - threshNorm)));
      d = d * (1 - threshMix * 0.82) + posterizedD * (threshMix * 0.82);
    }

    darknessMap[i] = Math.max(0, Math.min(1, d));
  }

  // Step 5: Quantize Color Layers for Multicolor Screen-Print Mode
  const colorCount = Math.max(2, Math.min(8, Math.round(settings.colorCount)));
  const quantizedPalette: string[] = [];
  const paletteIndexMap = new Uint8Array(pixelCount);

  if (settings.colorMode === 'multicolor') {
    // Tonal-chromatic bucket clustering into `colorCount` screen-print ink layers
    const sumsR = new Float64Array(colorCount);
    const sumsG = new Float64Array(colorCount);
    const sumsB = new Float64Array(colorCount);
    const counts = new Int32Array(colorCount);

    for (let i = 0; i < pixelCount; i++) {
      if (alphaMap[i] < 0.1) continue;
      const d = darknessMap[i];
      // Bucket by darkness & hue angle
      const bucket = Math.min(colorCount - 1, Math.floor(d * colorCount));
      paletteIndexMap[i] = bucket;
      sumsR[bucket] += rMap[i];
      sumsG[bucket] += gMap[i];
      sumsB[bucket] += bMap[i];
      counts[bucket]++;
    }

    const fallbackColors = [
      '#18181B',
      '#1D4ED8',
      '#D97706',
      '#E11D48',
      '#059669',
      '#7C3AED',
      '#0891B2',
      '#B45309',
    ];

    for (let k = 0; k < colorCount; k++) {
      if (counts[k] > 0) {
        quantizedPalette.push(
          rgbToHex(sumsR[k] / counts[k], sumsG[k] / counts[k], sumsB[k] / counts[k])
        );
      } else {
        quantizedPalette.push(fallbackColors[k % fallbackColors.length]);
      }
    }
  } else if (settings.colorMode === 'duotone') {
    quantizedPalette.push(settings.inkColor, settings.secondaryInkColor);
  } else {
    quantizedPalette.push(settings.inkColor);
  }

  // Calculate actual artwork bounding box of the subject:
  // If image has transparency (cutout/PNG), use non-transparent silhouette bounds (alpha > 0.05).
  // If image is opaque (JPG/photo), artwork spans full image boundaries.
  let transparentPixelCount = 0;
  let minAlphaX = width;
  let maxAlphaX = 0;
  let minAlphaY = height;
  let maxAlphaY = 0;
  let alphaOpaqueCount = 0;

  for (let y = 0; y < height; y++) {
    const rowOffset = y * width;
    for (let x = 0; x < width; x++) {
      const idx = rowOffset + x;
      const a = alphaMap[idx];
      if (a < 0.95) {
        transparentPixelCount++;
      }
      if (a > 0.05) {
        if (x < minAlphaX) minAlphaX = x;
        if (x > maxAlphaX) maxAlphaX = x;
        if (y < minAlphaY) minAlphaY = y;
        if (y > maxAlphaY) maxAlphaY = y;
        alphaOpaqueCount++;
      }
    }
  }

  const hasSignificantTransparency = transparentPixelCount > pixelCount * 0.02;

  const contentBounds: ContentBounds =
    hasSignificantTransparency &&
    alphaOpaqueCount > 20 &&
    minAlphaX < maxAlphaX &&
    minAlphaY < maxAlphaY
      ? {
          minX: minAlphaX,
          minY: minAlphaY,
          maxX: maxAlphaX,
          maxY: maxAlphaY,
          width: maxAlphaX - minAlphaX + 1,
          height: maxAlphaY - minAlphaY + 1,
        }
      : {
          minX: 0,
          minY: 0,
          maxX: width - 1,
          maxY: height - 1,
          width,
          height,
        };

  return {
    width,
    height,
    sourceWidth,
    sourceHeight,
    largeImageOptimized,
    contentBounds,
    darknessMap,
    rawLuminance,
    edgeMap,
    edgeAngleMap,
    alphaMap,
    rMap,
    gMap,
    bMap,
    quantizedPalette,
    paletteIndexMap,
  };
}

export interface AdaptiveToneProfile {
  meanLuminance: number;
  stdDevLuminance: number;
  stipple: {
    brightness: number;
    contrast: number;
    threshold: number;
  };
  vintagePop: {
    brightness: number;
    contrast: number;
    threshold: number;
  };
}

/**
 * Intelligently analyzes image luminosity and dynamic range to calculate
 * optimal adaptive brightness, contrast, and threshold settings for both
 * Stipple Photocopy and Vintage Pop art modes.
 */
export function computeAdaptiveToneProfile(
  source: HTMLImageElement | HTMLCanvasElement
): AdaptiveToneProfile {
  const canvas = document.createElement('canvas');
  const maxDim = 256;
  const sw = ('naturalWidth' in source && source.naturalWidth) || source.width || 256;
  const sh = ('naturalHeight' in source && source.naturalHeight) || source.height || 256;
  const scale = Math.min(1, maxDim / Math.max(sw, sh));
  const w = Math.max(16, Math.round(sw * scale));
  const h = Math.max(16, Math.round(sh * scale));

  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) {
    return {
      meanLuminance: 128,
      stdDevLuminance: 50,
      stipple: { brightness: 0, contrast: 25, threshold: 128 },
      vintagePop: { brightness: 0, contrast: 25, threshold: 128 },
    };
  }

  ctx.drawImage(source, 0, 0, w, h);
  const imgData = ctx.getImageData(0, 0, w, h);
  const data = imgData.data;

  let sumL = 0;
  let count = 0;
  const totalPixels = w * h;
  const lums = new Float32Array(totalPixels);

  for (let i = 0; i < data.length; i += 4) {
    const a = data[i + 3];
    // Ignore transparent cutout background pixels to measure main subject accurately
    if (a < 25) continue;
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const lum = 0.299 * r + 0.587 * g + 0.114 * b;
    lums[count] = lum;
    sumL += lum;
    count++;
  }

  if (count === 0) {
    return {
      meanLuminance: 128,
      stdDevLuminance: 50,
      stipple: { brightness: 0, contrast: 25, threshold: 128 },
      vintagePop: { brightness: 0, contrast: 25, threshold: 128 },
    };
  }

  const meanL = sumL / count;
  let sumSqDiff = 0;
  for (let i = 0; i < count; i++) {
    const diff = lums[i] - meanL;
    sumSqDiff += diff * diff;
  }
  const stdDev = Math.sqrt(sumSqDiff / count);

  // 1. Calculate Stipple Photocopy profile
  let stippleBrightness = 0;
  let stippleContrast = 25;
  let stippleThreshold = 128;

  if (meanL < 90) {
    // Dark/low-key image: boost brightness, moderate contrast, and adjust threshold
    const darkDeficit = 90 - meanL;
    stippleBrightness = Math.round(Math.min(38, darkDeficit * 0.42));
    stippleContrast = Math.round(Math.max(12, Math.min(28, 20 + stdDev * 0.1)));
    stippleThreshold = Math.round(Math.max(100, 128 - darkDeficit * 0.25));
  } else if (meanL > 165) {
    // High-key/washed-out image: lower brightness, boost contrast for crisp photocopy definition
    const brightSurplus = meanL - 165;
    stippleBrightness = Math.round(Math.max(-28, -brightSurplus * 0.35));
    stippleContrast = Math.round(Math.min(55, 32 + (50 - Math.min(50, stdDev)) * 0.45));
    stippleThreshold = Math.round(Math.min(155, 128 + brightSurplus * 0.28));
  } else {
    // Balanced exposure
    stippleBrightness = Math.round((128 - meanL) * 0.2);
    stippleContrast = Math.round(Math.max(20, Math.min(40, 32 - (stdDev - 40) * 0.2)));
    stippleThreshold = 128;
  }

  // 2. Calculate Vintage Pop profile
  let popBrightness = 0;
  let popContrast = 25;
  let popThreshold = 128;

  if (meanL < 90) {
    const darkDeficit = 90 - meanL;
    popBrightness = Math.round(Math.min(32, darkDeficit * 0.38));
    popContrast = Math.round(Math.max(14, Math.min(32, 22 - darkDeficit * 0.1)));
    popThreshold = Math.round(Math.max(105, 128 - darkDeficit * 0.3));
  } else if (meanL > 165) {
    const brightSurplus = meanL - 165;
    popBrightness = Math.round(Math.max(-28, -brightSurplus * 0.35));
    popContrast = Math.round(Math.min(65, 30 + brightSurplus * 0.4));
    popThreshold = Math.round(Math.min(152, 128 + brightSurplus * 0.25));
  } else {
    popBrightness = Math.round((128 - meanL) * 0.18);
    popContrast = 28;
    popThreshold = 128;
  }

  return {
    meanLuminance: Math.round(meanL),
    stdDevLuminance: Math.round(stdDev),
    stipple: {
      brightness: stippleBrightness,
      contrast: stippleContrast,
      threshold: stippleThreshold,
    },
    vintagePop: {
      brightness: popBrightness,
      contrast: popContrast,
      threshold: popThreshold,
    },
  };
}
