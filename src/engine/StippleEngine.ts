import {
  GenerationStats,
  StippleSettings,
  VectorDot,
} from '../types/stipple';
import { AnalyzedImageBuffer, ContentBounds } from './ImageAnalyzer';
import {
  evaluateDistortionField,
  evaluateGrungeField,
  fbmNoise2D,
  hash2D,
} from './NoiseEngine';

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

function hexToRgb(hex: string): [number, number, number] {
  const clean = hex.replace('#', '').trim();
  if (clean.length === 3) {
    return [
      parseInt(clean[0] + clean[0], 16) || 0,
      parseInt(clean[1] + clean[1], 16) || 0,
      parseInt(clean[2] + clean[2], 16) || 0,
    ];
  }
  return [
    parseInt(clean.slice(0, 2), 16) || 0,
    parseInt(clean.slice(2, 4), 16) || 0,
    parseInt(clean.slice(4, 6), 16) || 0,
  ];
}

function blendHexColors(hexA: string, hexB: string, t: number): string {
  const [r1, g1, b1] = hexToRgb(hexA);
  const [r2, g2, b2] = hexToRgb(hexB);
  const clampedT = Math.max(0, Math.min(1, t));
  return rgbToHex(
    r1 + (r2 - r1) * clampedT,
    g1 + (g2 - g1) * clampedT,
    b1 + (b2 - b1) * clampedT
  );
}

/**
 * Bilinear interpolation on a Float32Array map
 */
function sampleMapBilinear(
  map: Float32Array,
  width: number,
  height: number,
  x: number,
  y: number
): number {
  const cx = Math.max(0, Math.min(width - 1.001, x));
  const cy = Math.max(0, Math.min(height - 1.001, y));
  const x0 = Math.floor(cx);
  const y0 = Math.floor(cy);
  const x1 = Math.min(width - 1, x0 + 1);
  const y1 = Math.min(height - 1, y0 + 1);
  const fx = cx - x0;
  const fy = cy - y0;

  const v00 = map[y0 * width + x0];
  const v10 = map[y0 * width + x1];
  const v01 = map[y1 * width + x0];
  const v11 = map[y1 * width + x1];

  const top = v00 + (v10 - v00) * fx;
  const bottom = v01 + (v11 - v01) * fx;
  return top + (bottom - top) * fy;
}

export interface ArtworkTransform {
  drawW: number;
  drawH: number;
  originX: number;
  originY: number;
  scaleX: number;
  scaleY: number;
}

/**
 * Computes composition mapping from image analysis space [width, height] to output artboard.
 */
export function computeArtworkTransform(
  width: number,
  height: number,
  settings: StippleSettings,
  contentBounds?: ContentBounds
): ArtworkTransform {
  const outW = Math.max(100, settings.outputWidth);
  const outH = Math.max(100, settings.outputHeight);

  const pad = (settings.padding || 0) * 2;
  const mar = (settings.margin || 0) * 2;
  const availW = Math.max(20, outW - pad - mar);
  const availH = Math.max(20, outH - pad - mar);
  const minAvail = Math.min(availW, availH);
  const imgAspect = width / Math.max(1, height);
  const boxAspect = availW / Math.max(1, availH);

  const cb = contentBounds || {
    minX: 0,
    minY: 0,
    maxX: width - 1,
    maxY: height - 1,
    width,
    height,
  };
  const subjW = Math.max(1, cb.width);
  const subjH = Math.max(1, cb.height);
  const minSubjDim = Math.min(subjW, subjH);
  const maxSubjDim = Math.max(subjW, subjH);

  let drawW = availW;
  let drawH = availH;
  let scaleX = 1;
  let scaleY = 1;
  let originX = 0;
  let originY = 0;

  const fitMode = settings.autoFitMode || 'long-edge';

  if (fitMode === 'long-edge') {
    // Proportional Fit (Default): fits long edge within 85% of available space (leaves clean ~300px margin on 4000px artboard)
    const targetFitSize = Math.max(100, Math.round(minAvail * 0.85));
    const fitScale = targetFitSize / maxSubjDim;
    const userScale = (settings.scale || 100) / 100;
    scaleX = fitScale * userScale;
    scaleY = fitScale * userScale;
    drawW = width * scaleX;
    drawH = height * scaleY;
    const contentCenterX = (cb.minX + cb.maxX) * 0.5;
    const contentCenterY = (cb.minY + cb.maxY) * 0.5;
    originX = outW * 0.5 - contentCenterX * scaleX + (settings.offsetX || 0);
    originY = outH * 0.5 - contentCenterY * scaleY + (settings.offsetY || 0);
  } else if (fitMode === 'short-edge') {
    // Fit to Short Edge with balanced ratio: scales up based on the shorter dimension to fill more space,
    // while strictly clamping the longer dimension to 93% of available space so the design NEVER spills outside the artboard.
    const targetShort = Math.max(100, Math.round(minAvail * 0.90));
    const maxSafeLong = Math.max(100, Math.round(minAvail * 0.93));
    const scaleFromShort = targetShort / minSubjDim;
    const maxAllowedScale = maxSafeLong / maxSubjDim;
    const fitScale = Math.min(scaleFromShort, maxAllowedScale);
    const userScale = (settings.scale || 100) / 100;
    scaleX = fitScale * userScale;
    scaleY = fitScale * userScale;
    drawW = width * scaleX;
    drawH = height * scaleY;
    const contentCenterX = (cb.minX + cb.maxX) * 0.5;
    const contentCenterY = (cb.minY + cb.maxY) * 0.5;
    originX = outW * 0.5 - contentCenterX * scaleX + (settings.offsetX || 0);
    originY = outH * 0.5 - contentCenterY * scaleY + (settings.offsetY || 0);
  } else if (fitMode === 'cover') {
    // Cover Artboard with maximum safe coverage: fills the artboard as prominently as possible (~94% safe presence)
    // while strictly keeping all parts of the subject inside the artboard with clean margins.
    const maxFillW = Math.max(100, Math.round(availW * 0.94));
    const maxFillH = Math.max(100, Math.round(availH * 0.94));
    const fitScale = Math.min(
      maxFillW / subjW,
      maxFillH / subjH
    );
    const userScale = (settings.scale || 100) / 100;
    scaleX = fitScale * userScale;
    scaleY = fitScale * userScale;
    drawW = width * scaleX;
    drawH = height * scaleY;
    const contentCenterX = (cb.minX + cb.maxX) * 0.5;
    const contentCenterY = (cb.minY + cb.maxY) * 0.5;
    originX = outW * 0.5 - contentCenterX * scaleX + (settings.offsetX || 0);
    originY = outH * 0.5 - contentCenterY * scaleY + (settings.offsetY || 0);
  } else if (fitMode === 'contain') {
    // Contain Artboard with elegant framing (88% ratio, leaving ~6% balanced margin on all sides)
    const containTarget = Math.max(100, Math.round(minAvail * 0.88));
    const fitScale = containTarget / maxSubjDim;
    const userScale = (settings.scale || 100) / 100;
    scaleX = fitScale * userScale;
    scaleY = fitScale * userScale;
    drawW = width * scaleX;
    drawH = height * scaleY;
    const contentCenterX = (cb.minX + cb.maxX) * 0.5;
    const contentCenterY = (cb.minY + cb.maxY) * 0.5;
    originX = outW * 0.5 - contentCenterX * scaleX + (settings.offsetX || 0);
    originY = outH * 0.5 - contentCenterY * scaleY + (settings.offsetY || 0);
  } else {
    if (settings.cropMode === 'fit') {
      if (imgAspect > boxAspect) {
        drawW = availW;
        drawH = availW / imgAspect;
      } else {
        drawH = availH;
        drawW = availH * imgAspect;
      }
    } else if (settings.cropMode === 'fill') {
      if (imgAspect > boxAspect) {
        drawH = availH;
        drawW = availH * imgAspect;
      } else {
        drawW = availW;
        drawH = availW / imgAspect;
      }
    } else if (settings.cropMode === 'crop') {
      if (imgAspect > boxAspect) {
        drawH = availH * 1.22;
        drawW = drawH * imgAspect;
      } else {
        drawW = availW * 1.22;
        drawH = drawW / imgAspect;
      }
    } else {
      drawW = availW;
      drawH = availH;
    }

    const userScale = (settings.scale || 100) / 100;
    drawW *= userScale;
    drawH *= userScale;

    originX = (outW - drawW) * 0.5 + (settings.offsetX || 0);
    originY = (outH - drawH) * 0.5 + (settings.offsetY || 0);
    scaleX = drawW / width;
    scaleY = drawH / height;
  }

  return { drawW, drawH, originX, originY, scaleX, scaleY };
}

export interface StippleGenerationResult {
  dots: VectorDot[];
  stats: GenerationStats;
  palette: string[];
  transform?: ArtworkTransform;
}

/**
 * Generates procedural stipple/halftone vector dot geometry from the analyzed image buffer.
 */
export function generateStippleVectors(
  buffer: AnalyzedImageBuffer,
  settings: StippleSettings
): StippleGenerationResult {
  const startTime = performance.now();
  const { width, height, darknessMap, edgeMap, edgeAngleMap, alphaMap } = buffer;

  // Determine Output Artboard dimensions
  const outW = Math.max(100, settings.outputWidth);
  const outH = Math.max(100, settings.outputHeight);

  // Compute Composition Transform from Analysis Space [0..width, 0..height] -> Output Artboard [0..outW, 0..outH]
  const transform = computeArtworkTransform(width, height, settings, buffer.contentBounds);
  const { drawW, drawH, originX, originY, scaleX, scaleY } = transform;
  const avgScale = (scaleX + scaleY) * 0.5;

  // Clipping bounds inside output artboard (respecting outer margin and crop mode)
  const clipInset =
    settings.cropMode === 'crop'
      ? settings.margin + settings.padding
      : settings.margin;
  const clipMinX = clipInset;
  const clipMinY = clipInset;
  const clipMaxX = outW - clipInset;
  const clipMaxY = outH - clipInset;

  // Calculate effective sampling cell step in analysis coordinates
  const densityFactor = Math.pow(settings.dotDensity / 70, 0.75); // Higher dotDensity = tighter step & higher survival
  const patScale = settings.patternScale / 100;
  const spacingMult = settings.dotSpacing / 4.8;
  const baseSpacing = settings.cellSize * spacingMult * patScale;

  const rawStepX = settings.independentCellScale
    ? settings.cellSizeX * spacingMult * patScale
    : baseSpacing;
  const rawStepY = settings.independentCellScale
    ? settings.cellSizeY * spacingMult * patScale
    : baseSpacing;

  const stepX = Math.max(0.95, rawStepX / Math.max(0.35, densityFactor));
  const stepY = Math.max(0.95, rawStepY / Math.max(0.35, densityFactor));

  const angleRad = (settings.patternAngle * Math.PI) / 180;
  const cosA = Math.cos(angleRad);
  const sinA = Math.sin(angleRad);

  const cxCenter = width * 0.5;
  const cyCenter = height * 0.5;
  const diag = Math.hypot(width, height) * 0.62;

  const seed = settings.randomSeed;
  const dots: VectorDot[] = [];

  // Parameters normalized for inner loop performance
  const randMaster = settings.randomness / 100;
  const jitterMaster = settings.jitter / 100;
  const jitterXWeight = (settings.jitterX / 50) * (1 + settings.positionRandomness / 100);
  const jitterYWeight = (settings.jitterY / 50) * (1 + settings.positionRandomness / 100);
  const organicAmt = settings.organicity / 100;
  const adaptiveAmt = settings.adaptiveStrength / 100;
  const edgeBiasAmt = settings.edgeBias / 100;
  const edgeDensityAmt = settings.edgeDensity / 100;
  const edgeDetailAmt = settings.edgeDetail / 100;

  const shadowDensMult = settings.shadowDensity / 100;
  const midtoneDensMult = settings.midtoneDensity / 100;
  const highlightSparse = settings.highlightSparsity / 100;

  const tonalRespAmt = settings.tonalResponse / 100;
  const tonalRespExp = Math.max(0.12, tonalRespAmt * 1.15);
  const densityRespAmt = settings.densityResponse / 100;
  const densityRespExp = Math.max(0.12, densityRespAmt * 1.1);
  const dotVarAmt = settings.dotVariation / 100;
  const sizeRandAmt = settings.sizeRandomness / 100;

  const noiseMix = (settings.noise / 100) * (settings.noiseStrength / 100);
  const noiseScale = settings.noiseScale;

  // Simplification / Overlap Culling Spatial Hash Grid
  const simplifyAmt = settings.simplifyVector / 100;
  const minCullRadius =
    settings.minDotSize * (0.35 + simplifyAmt * 0.65);

  const occupancyCellSize = Math.max(1.5, settings.minDotSize * (1.2 + simplifyAmt * 2.5));
  const occCols = Math.ceil(outW / occupancyCellSize) + 1;
  const occRows = Math.ceil(outH / occupancyCellSize) + 1;
  const occupancyGrid =
    simplifyAmt > 0.05 || settings.patternType === 'poisson'
      ? new Uint8Array(occCols * occRows)
      : null;

  // Helper to evaluate and emit a single candidate point at analysis coords (px, py)
  const evaluateCandidate = (
    px: number,
    py: number,
    cellIx: number,
    cellIy: number,
    subPass: number
  ) => {
    if (px < 0.5 || px >= width - 0.5 || py < 0.5 || py >= height - 0.5) return;

    const h1 = hash2D(cellIx + subPass * 313, cellIy + subPass * 719, seed);
    const h2 = hash2D(cellIx + 101 + subPass * 17, cellIy + 211 + subPass * 53, seed + 77);
    const h3 = hash2D(cellIx - 59, cellIy + 401, seed + 911 + subPass * 29);

    // Apply Jitter & Organic flow offset in analysis space
    let jx = 0;
    let jy = 0;

    if (settings.patternType === 'regular') {
      // Regular pattern still responds if user explicitly pushes Jitter, Randomness, or Organicity > 0
      const regJit =
        jitterMaster * 0.55 +
        (settings.positionRandomness / 100) * 0.45 +
        randMaster * 0.25;
      jx = (h1 - 0.5) * stepX * regJit * jitterXWeight;
      jy = (h2 - 0.5) * stepY * regJit * jitterYWeight;
    } else if (settings.patternType === 'jittered') {
      const jit = Math.max(0.25, jitterMaster + randMaster * 0.4);
      jx = (h1 - 0.5) * stepX * jit * jitterXWeight * 1.35;
      jy = (h2 - 0.5) * stepY * jit * jitterYWeight * 1.35;
    } else if (settings.patternType === 'random') {
      jx = (h1 - 0.5) * stepX * (1.5 + jitterMaster) * jitterXWeight;
      jy = (h2 - 0.5) * stepY * (1.5 + jitterMaster) * jitterYWeight;
    } else if (settings.patternType === 'poisson') {
      const pJit = 0.68 + jitterMaster * 0.5;
      jx = (h1 - 0.5) * stepX * pJit * jitterXWeight;
      jy = (h2 - 0.5) * stepY * pJit * jitterYWeight;
    } else if (settings.patternType === 'organic') {
      const flowAngle =
        fbmNoise2D(px, py, Math.max(12, 65 - organicAmt * 35), seed + 303, 2) * Math.PI * 2;
      const flowMag = stepX * (0.45 + organicAmt * 0.85 + jitterMaster * 0.5);
      jx = Math.cos(flowAngle) * flowMag * jitterXWeight + (h1 - 0.5) * stepX * randMaster;
      jy = Math.sin(flowAngle) * flowMag * jitterYWeight + (h2 - 0.5) * stepY * randMaster;
    } else {
      // 'adaptive'
      const adapJit = 0.35 + jitterMaster * 0.65 + organicAmt * 0.4;
      jx = (h1 - 0.5) * stepX * adapJit * jitterXWeight;
      jy = (h2 - 0.5) * stepY * adapJit * jitterYWeight;
    }

    // Add continuous curl-flow displacement when Organicity > 0 in non-organic modes
    if (organicAmt > 0 && settings.patternType !== 'organic') {
      const flowAngle =
        fbmNoise2D(px, py, Math.max(14, 70 - organicAmt * 35), seed + 303, 2) * Math.PI * 2;
      const flowMag = stepX * organicAmt * 0.55;
      jx += Math.cos(flowAngle) * flowMag;
      jy += Math.sin(flowAngle) * flowMag;
    }

    let sampleX = px + jx;
    let sampleY = py + jy;

    // Edge Bias: attract candidate point slightly toward high-gradient Sobel ridges
    if (edgeBiasAmt > 0.05) {
      const eHere = sampleMapBilinear(edgeMap, width, height, sampleX, sampleY);
      if (eHere > 0.12) {
        const eRight = sampleMapBilinear(edgeMap, width, height, sampleX + 1.5, sampleY);
        const eDown = sampleMapBilinear(edgeMap, width, height, sampleX, sampleY + 1.5);
        sampleX += (eRight - eHere) * edgeBiasAmt * 2.5;
        sampleY += (eDown - eHere) * edgeBiasAmt * 2.5;
      }
    }

    if (sampleX < 0 || sampleX >= width || sampleY < 0 || sampleY >= height) return;

    const pixIdx = Math.floor(sampleY) * width + Math.floor(sampleX);
    const alpha = alphaMap[pixIdx];
    if (alpha < 0.08 && !settings.includeBgInStipple && settings.alphaMode !== 'ignore') {
      return;
    }

    let darkness = sampleMapBilinear(darknessMap, width, height, sampleX, sampleY);
    const edgeVal = sampleMapBilinear(edgeMap, width, height, sampleX, sampleY);
    const edgeAngle = edgeAngleMap[pixIdx];

    // Modulate darkness with Procedural Noise if active
    if (noiseMix > 0) {
      const nVal = fbmNoise2D(sampleX, sampleY, noiseScale, seed + 1999, 3); // [-1, 1]
      darkness = Math.max(0, Math.min(1, darkness + nVal * noiseMix * 0.48));
    }

    // Clean highlight cutoff so bright regions & white backgrounds stay 100% free of stray dots
    const highlightCutoff = 0.03 + highlightSparse * 0.14;
    if (darkness < highlightCutoff && edgeVal < 0.35) {
      return;
    }

    // Evaluate Tonal Band & Apply Shadow/Midtone/Highlight Density & Sparsity
    let bandDensityMult = 1.0;
    let toneBand: 'shadows' | 'midtones' | 'highlights' = 'midtones';

    if (darkness >= 0.66) {
      toneBand = 'shadows';
      bandDensityMult = shadowDensMult * 1.05;
    } else if (darkness >= 0.25) {
      toneBand = 'midtones';
      bandDensityMult = midtoneDensMult;
    } else {
      toneBand = 'highlights';
      // Highlight sparsity actively culls dots in bright regions
      bandDensityMult = Math.max(0, (1.0 - highlightSparse * 0.94) * (settings.highlightStrength / 100));
    }

    // Boost effective survival on strong edges
    const edgeSurvivalBoost = edgeVal * (edgeDensityAmt * 0.78 + adaptiveAmt * 0.38);

    // Compute survival probability in [0, 1] respecting Density Response (0% = uniform, 200% = strong shadow bias)
    const tonalSurvival = Math.pow(darkness, densityRespExp * 0.85);
    const baseSurvival =
      densityRespAmt <= 1
        ? (1 - densityRespAmt) * 0.68 + densityRespAmt * tonalSurvival
        : tonalSurvival;

    const survivalProb =
      (baseSurvival * bandDensityMult + edgeSurvivalBoost) *
      (0.58 + (settings.dotDensity / 100) * 0.78);

    // In deep shadows (darkness > 0.80), allow higher survival so deepest cores coalesce while midtones stay airy
    const requiredThreshold =
      darkness > 0.8
        ? h3 * 0.42 + subPass * 0.18
        : subPass === 0
        ? h3 * (0.72 + randMaster * 0.34)
        : 0.46 + subPass * 0.22 + h3 * 0.35;

    if (survivalProb < requiredThreshold || darkness < 0.02) {
      return;
    }

    // Evaluate Grunge / Distressed Print Field
    const grungeEval = evaluateGrungeField(
      sampleX,
      sampleY,
      settings.grunge,
      settings.grungeScale,
      settings.grungeStrength,
      seed
    );
    if (grungeEval.dropDot && (darkness < 0.88 || settings.grunge > 50)) {
      return;
    }

    // Calculate Dot Size (Radius in output SVG coordinates)
    const tonalSizeCurve = Math.pow(darkness, tonalRespExp * 0.94);
    const varFactor =
      1.0 +
      (h1 - 0.5) * dotVarAmt * 1.3 +
      (h2 - 0.5) * sizeRandAmt * 1.4;

    // Blend between uniform size (when tonalResponse = 0) and tonal-modulated size
    const tonalModulated =
      0.18 + 0.82 * tonalSizeCurve * (0.68 + (settings.dotVariation / 100) * 0.68);
    const sizeBlend =
      tonalRespAmt <= 1
        ? (1 - tonalRespAmt) * 0.65 + tonalRespAmt * tonalModulated
        : tonalModulated * (1 + (tonalRespAmt - 1) * (darkness - 0.35) * 0.55);

    // Shadow Coalescence Boost: only in deep shadow regions, gently expand dot radii so deepest shadows fuse into pitch-black ink while midtones and geometric shapes stay distinct
    const isGeometricPrimitive =
      settings.dotShape === 'ellipse' ||
      settings.dotShape === 'square' ||
      settings.dotShape === 'rounded-square' ||
      settings.dotShape === 'diamond';
    const coalesceThreshold = isGeometricPrimitive ? 0.8 : 0.7;
    const shadowCoalesce =
      darkness > coalesceThreshold
        ? 1.0 +
          Math.pow((darkness - coalesceThreshold) / (1 - coalesceThreshold), 1.25) *
            ((isGeometricPrimitive ? 0.16 : 0.26) +
              Math.max(0, shadowDensMult - 1.0) * (isGeometricPrimitive ? 0.18 : 0.32))
        : 1.0;

    const maxScaleBoost = Math.pow(Math.max(0.2, settings.maxDotSize / 6.2), 0.46);
    let radius =
      settings.dotSize *
      0.58 *
      sizeBlend *
      shadowCoalesce *
      Math.max(0.16, varFactor) *
      maxScaleBoost;

    // Edge Detail tightens dot radii on midtone boundaries so contours stay razor sharp
    if (edgeVal > 0.2 && edgeDetailAmt > 0 && darkness < 0.78) {
      const tighten = 1.0 - edgeVal * edgeDetailAmt * 0.4;
      radius *= Math.max(0.36, tighten);
    }

    // Apply Grunge erosion multiplier
    radius *= grungeEval.sizeMultiplier;

    // Clamp to [minDotSize, maxDotSize] scaled proportionally with master dotSize and artboard scale
    const minR = settings.minDotSize * 0.5;
    const maxR = Math.max(
      minR + 0.1,
      settings.maxDotSize * 0.58 * Math.max(0.75, settings.dotSize / 4.2)
    );
    radius = Math.max(minR, Math.min(maxR, radius)) * Math.max(0.45, avgScale * 0.66);

    if (radius < minCullRadius * 0.44) {
      return;
    }

    // Apply 2D Domain Distortion Warp in analysis coordinates
    const [warpDx, warpDy] = evaluateDistortionField(
      sampleX,
      sampleY,
      settings.distortion,
      settings.distortionScale,
      settings.distortionStrength,
      seed
    );

    const finalAnalysisX = sampleX + warpDx;
    const finalAnalysisY = sampleY + warpDy;

    // Transform to Output Artboard Coordinates
    let outX = originX + finalAnalysisX * scaleX;
    let outY = originY + finalAnalysisY * scaleY;

    // Determine Color & Layer Index (and apply Screen Registration Offset if active)
    let dotColor = settings.inkColor;
    let layerIndex = 0;

    if (settings.colorMode === 'monochrome') {
      dotColor = settings.inkColor;
      layerIndex = toneBand === 'shadows' ? 0 : toneBand === 'midtones' ? 1 : 2;
    } else if (settings.colorMode === 'duotone') {
      const splitPoint = settings.colorThreshold / 100;
      const mixZone = (settings.colorMix / 100) * 0.45;
      const balOffset = (settings.colorBalance / 100) * 0.25;
      const effectiveSplit = Math.max(0.05, Math.min(0.95, splitPoint - balOffset));

      if (darkness >= effectiveSplit + mixZone * 0.5) {
        dotColor = settings.inkColor;
        layerIndex = 0;
      } else if (darkness <= effectiveSplit - mixZone * 0.5) {
        dotColor = settings.secondaryInkColor;
        layerIndex = 1;
      } else {
        // In the transition mix zone, either assign probabilistically or blend ink
        if (h2 > 0.5) {
          dotColor = blendHexColors(
            settings.secondaryInkColor,
            settings.inkColor,
            (darkness - (effectiveSplit - mixZone * 0.5)) / Math.max(0.01, mixZone)
          );
          layerIndex = 1;
        } else {
          dotColor = settings.secondaryInkColor;
          layerIndex = 1;
        }
      }
    } else if (settings.colorMode === 'multicolor') {
      const baseLayer = buffer.paletteIndexMap[pixIdx] || 0;
      const layerCount = buffer.quantizedPalette.length;
      // Allow colorMix to slightly dither adjacent color layers
      let chosenLayer = baseLayer;
      if (settings.colorMix > 10 && h3 < (settings.colorMix / 100) * 0.4) {
        chosenLayer = (baseLayer + 1) % layerCount;
      }
      layerIndex = chosenLayer;
      dotColor = buffer.quantizedPalette[chosenLayer] || settings.inkColor;
    } else {
      // 'original' color halftone
      const r = buffer.rMap[pixIdx];
      const g = buffer.gMap[pixIdx];
      const b = buffer.bMap[pixIdx];
      const rawHex = rgbToHex(r, g, b);
      // Allow colorMix to blend ink color into original colors when adjusted away from default 45
      const mixDelta = (settings.colorMix - 45) / 100;
      if (mixDelta > 0.02) {
        dotColor = blendHexColors(rawHex, settings.inkColor, mixDelta * 0.65);
      } else if (mixDelta < -0.02) {
        dotColor = blendHexColors(rawHex, '#FFFFFF', Math.abs(mixDelta) * 0.45);
      } else {
        dotColor = rawHex;
      }
      layerIndex = toneBand === 'shadows' ? 0 : toneBand === 'midtones' ? 1 : 2;
    }

    // Apply Screen-Print Registration Offset (`colorSeparation`) for secondary layers
    if (settings.colorSeparation > 0 && layerIndex > 0) {
      const sepDist = (settings.colorSeparation / 100) * 10 * avgScale;
      const sepAngle = layerIndex * 1.15 + angleRad;
      outX += Math.cos(sepAngle) * sepDist;
      outY += Math.sin(sepAngle) * sepDist;
    }

    // Check Artboard Clipping Bounds
    if (
      outX - radius < clipMinX ||
      outX + radius > clipMaxX ||
      outY - radius < clipMinY ||
      outY + radius > clipMaxY
    ) {
      return;
    }

    // Spatial Occupancy Check (keep geometric primitives well-separated so their shapes stay crisp)
    if (occupancyGrid && (darkness < (isGeometricPrimitive ? 0.74 : 0.55) || simplifyAmt > 0.45)) {
      const gx = Math.floor(outX / occupancyCellSize);
      const gy = Math.floor(outY / occupancyCellSize);
      if (gx >= 0 && gx < occCols && gy >= 0 && gy < occRows) {
        const gIdx = gy * occCols + gx;
        if (
          occupancyGrid[gIdx] > 0 &&
          (isGeometricPrimitive ||
            simplifyAmt > 0.25 ||
            (settings.patternType === 'poisson' && darkness < 0.52))
        ) {
          return;
        }
        occupancyGrid[gIdx] = 1;
      }
    }

    // Calculate Shape Aspect Ratio, Stretch, Squash, and Rotation
    const stretchMult = 1.0 + (settings.dotStretch / 100) * 1.6;
    const squashMult = Math.max(0.2, 1.0 - (settings.dotSquash / 100) * 0.72);

    // Intrinsic eccentricity for 'ellipse' primitive so selecting Ellipse immediately creates true 2.35:1 oval grains even when dotAspect is 1.0
    const intrinsicShapeAspect =
      settings.dotShape === 'ellipse'
        ? 2.35
        : settings.dotShape === 'circle' &&
          Math.abs(settings.dotAspect - 1.0) < 0.02 &&
          Math.abs(settings.dotRotation) > 1
        ? 1.0 + (Math.abs(settings.dotRotation) / 180) * 0.45
        : 1.0;

    const effectiveAspect =
      settings.dotAspect * intrinsicShapeAspect * (stretchMult / squashMult);

    const rx = radius * Math.sqrt(effectiveAspect);
    const ry = radius / Math.sqrt(effectiveAspect);

    // Orientation per primitive shape:
    // - Square, Rounded Sq, Diamond stay strictly axis-aligned (0° + dotRotation) unless user adds dotRotation, dotStretch, or rotationRandomness
    // - Ellipse aligns with dotRotation + patternAngle (or contour tangent when dotStretch > 0)
    // - Organic Ink gets natural per-dot rotational variety so each ink splat is unique
    let rotDeg = settings.dotRotation;
    if (settings.dotStretch > 0 && edgeVal > 0.1) {
      rotDeg += (edgeAngle * 180) / Math.PI;
    } else if (settings.dotShape === 'ellipse') {
      rotDeg += settings.patternAngle;
    } else if (settings.dotShape === 'organic') {
      rotDeg += (h2 - 0.5) * 180;
    }

    if (settings.rotationRandomness > 0) {
      rotDeg += (h3 - 0.5) * 360 * (settings.rotationRandomness / 100);
    }

    dots.push({
      x: outX,
      y: outY,
      r: radius,
      rx,
      ry,
      rotation: rotDeg,
      color: dotColor,
      opacity: 1,
      toneBand,
      layerIndex,
      shape: settings.dotShape,
      roundness: settings.dotRoundness,
      seedOffset: h1,
    });
  };

  const isGeoShape =
    settings.dotShape === 'ellipse' ||
    settings.dotShape === 'square' ||
    settings.dotShape === 'rounded-square' ||
    settings.dotShape === 'diamond';

  // Generate Candidate Points according to selected Pattern Type
  if (settings.patternType === 'organic') {
    // Golden-Angle Phyllotaxis + Stratified Organic Lattice with Shadow Coalescence Sub-Passes
    const totalCells = Math.floor((width / stepX) * (height / stepY) * 1.25);
    const goldenAngle = Math.PI * (3 - Math.sqrt(5));
    const maxRadius = Math.hypot(width, height) * 0.56;

    for (let i = 0; i < totalCells; i++) {
      const frac = (i + 0.5) / Math.max(1, totalCells);
      const r = Math.sqrt(frac) * maxRadius;
      const theta = i * goldenAngle + angleRad;
      const px = cxCenter + Math.cos(theta) * r;
      const py = cyCenter + Math.sin(theta) * r;
      const cIx = i % 997;
      const cIy = Math.floor(i / 997);
      evaluateCandidate(px, py, cIx, cIy, 0);

      if (px >= 1 && px < width - 1 && py >= 1 && py < height - 1) {
        const localD = darknessMap[Math.floor(py) * width + Math.floor(px)];
        if (localD > (isGeoShape ? 0.78 : 0.68)) {
          evaluateCandidate(px + stepX * 0.42, py - stepY * 0.38, cIx, cIy, 1);
        }
        if (localD > (isGeoShape ? 0.9 : 0.84)) {
          evaluateCandidate(px - stepX * 0.38, py + stepY * 0.42, cIx, cIy, 2);
        }
      }
    }
  } else {
    // Rotated Lattice traversal covering the full bounding circle of the image
    const allowInfill = settings.patternType !== 'regular';
    const infillStrength =
      settings.patternType === 'adaptive'
        ? 0.12 + adaptiveAmt * 0.95
        : Math.max(0.4, shadowDensMult * 0.5);

    let cellIy = 0;
    for (let u = -diag; u <= diag; u += stepY, cellIy++) {
      let cellIx = 0;
      for (let v = -diag; v <= diag; v += stepX, cellIx++) {
        // Rotate (v, u) by patternAngle around image center
        const px = cxCenter + v * cosA - u * sinA;
        const py = cyCenter + v * sinA + u * cosA;

        evaluateCandidate(px, py, cellIx, cellIy, 0);

        // Spawn interstitial stipple sub-passes in deep shadows & strong contours so dark cores pack into pitch-black ink while midtones & geometric shapes stay crisp
        if (allowInfill && px >= 1 && px < width - 1 && py >= 1 && py < height - 1) {
          const pIdx = Math.floor(py) * width + Math.floor(px);
          const localD = darknessMap[pIdx];
          const localE = edgeMap[pIdx];

          const subPass1Thresh = isGeoShape ? 0.74 : 0.54;
          const subPass2Thresh = isGeoShape ? 0.88 : 0.78;

          if (localD * infillStrength > subPass1Thresh || (!isGeoShape && localE * edgeBiasAmt > 0.38)) {
            evaluateCandidate(
              px + stepX * 0.46,
              py + stepY * 0.46,
              cellIx,
              cellIy,
              1
            );
          }
          if (localD * infillStrength > subPass2Thresh || (!isGeoShape && localE * edgeBiasAmt > 0.64)) {
            evaluateCandidate(
              px - stepX * 0.4,
              py + stepY * 0.42,
              cellIx,
              cellIy,
              2
            );
          }
        }
      }
    }
  }

  // Compute Generation Statistics
  let shadowDots = 0;
  let midtoneDots = 0;
  let highlightDots = 0;
  const layerCounts: Record<string, number> = {};

  for (let i = 0; i < dots.length; i++) {
    const d = dots[i];
    if (d.toneBand === 'shadows') shadowDots++;
    else if (d.toneBand === 'midtones') midtoneDots++;
    else highlightDots++;

    const layerKey = `layer-${d.layerIndex + 1}`;
    layerCounts[layerKey] = (layerCounts[layerKey] || 0) + 1;
  }

  const processingTimeMs = Math.max(1, Math.round(performance.now() - startTime));
  const bytesPerDot =
    (settings.mergeShapes ? 28 : 54) +
    settings.svgPrecision * 4 -
    (settings.pathOptimization ? 6 : 0);

  return {
    dots,
    palette: buffer.quantizedPalette,
    stats: {
      totalDots: dots.length,
      shadowDots,
      midtoneDots,
      highlightDots,
      layerCounts,
      analysisWidth: width,
      analysisHeight: height,
      outputWidth: outW,
      outputHeight: outH,
      processingTimeMs,
      svgByteSizeEstimate: Math.max(512, dots.length * bytesPerDot + 512),
      largeImageOptimized: buffer.largeImageOptimized,
    },
  };
}
