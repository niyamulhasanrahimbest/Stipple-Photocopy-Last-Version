/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { VintagePopSettings } from '../types/stipple';

export interface VintagePopResult {
  canvas: HTMLCanvasElement;
  dataUrl: string;
  svgString: string;
  width: number;
  height: number;
  processingTimeMs: number;
}

/**
 * Procedural pseudo-random generator
 */
function pseudoNoise(seed: number): number {
  const x = Math.sin(seed * 12.9898 + 78.233) * 43758.5453;
  return x - Math.floor(x);
}

/**
 * Generate retro radial sunburst rays on canvas context
 */
function drawSunburst(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  centerX: number,
  centerY: number,
  rayCount: number,
  color1: string,
  color2: string
) {
  ctx.save();
  const maxDim = Math.hypot(width, height);
  const angleStep = (Math.PI * 2) / rayCount;

  // Background base
  ctx.fillStyle = color2;
  ctx.fillRect(0, 0, width, height);

  // Alternating Rays
  ctx.fillStyle = color1;
  for (let i = 0; i < rayCount; i += 2) {
    const startAngle = i * angleStep;
    const endAngle = (i + 1) * angleStep;

    ctx.beginPath();
    ctx.moveTo(centerX, centerY);
    ctx.arc(centerX, centerY, maxDim, startAngle, endAngle);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
}

/**
 * Flood-fill background extraction from outer edges only
 * Preserves internal white elements like teeth, eyes, dials, and clothing!
 */
function extractEdgeConnectedBackground(
  pixels: Uint8ClampedArray,
  w: number,
  h: number,
  tolerancePercent: number
): Uint8Array {
  const alphaMask = new Uint8Array(w * h);

  // Check if image already has transparent pixels (like a PNG cutout)
  let transparentCount = 0;
  for (let i = 3; i < pixels.length; i += 16) {
    if (pixels[i] < 30) {
      transparentCount++;
      if (transparentCount > 5) break;
    }
  }

  // If already transparent PNG, just use the image's alpha channel
  if (transparentCount > 5) {
    for (let i = 0; i < w * h; i++) {
      alphaMask[i] = pixels[i * 4 + 3];
    }
    return alphaMask;
  }

  // Boundary-connected flood fill to remove neutral white/light background
  const threshold = 255 - Math.round((tolerancePercent / 100) * 160);
  const isBgPixel = (pIdx: number) => {
    const r = pixels[pIdx];
    const g = pixels[pIdx + 1];
    const b = pixels[pIdx + 2];
    const maxDiff = Math.max(Math.abs(r - g), Math.abs(g - b), Math.abs(b - r));
    return r >= threshold && g >= threshold && b >= threshold && maxDiff < 28;
  };

  const isBg = new Uint8Array(w * h);
  const queue = new Int32Array(w * h);
  let qHead = 0;
  let qTail = 0;

  // Seed boundary pixels
  for (let x = 0; x < w; x++) {
    if (isBgPixel(x * 4)) {
      isBg[x] = 1;
      queue[qTail++] = x;
    }
    const bIdx = (h - 1) * w + x;
    if (isBgPixel(bIdx * 4)) {
      isBg[bIdx] = 1;
      queue[qTail++] = bIdx;
    }
  }
  for (let y = 1; y < h - 1; y++) {
    const lIdx = y * w;
    if (isBgPixel(lIdx * 4)) {
      isBg[lIdx] = 1;
      queue[qTail++] = lIdx;
    }
    const rIdx = y * w + (w - 1);
    if (isBgPixel(rIdx * 4)) {
      isBg[rIdx] = 1;
      queue[qTail++] = rIdx;
    }
  }

  // BFS flood fill
  while (qHead < qTail) {
    const curr = queue[qHead++];
    const cx = curr % w;
    const cy = Math.floor(curr / w);

    if (cy > 0) {
      const up = curr - w;
      if (!isBg[up] && isBgPixel(up * 4)) {
        isBg[up] = 1;
        queue[qTail++] = up;
      }
    }
    if (cy < h - 1) {
      const down = curr + w;
      if (!isBg[down] && isBgPixel(down * 4)) {
        isBg[down] = 1;
        queue[qTail++] = down;
      }
    }
    if (cx > 0) {
      const left = curr - 1;
      if (!isBg[left] && isBgPixel(left * 4)) {
        isBg[left] = 1;
        queue[qTail++] = left;
      }
    }
    if (cx < w - 1) {
      const right = curr + 1;
      if (!isBg[right] && isBgPixel(right * 4)) {
        isBg[right] = 1;
        queue[qTail++] = right;
      }
    }
  }

  // Morphological smoothing pass on isBg to eliminate saw-tooth spikes and noisy jagged edges
  const cleanBg = new Uint8Array(w * h);
  for (let y = 0; y < h; y++) {
    const rowOffset = y * w;
    for (let x = 0; x < w; x++) {
      let bgCount = 0;
      let total = 0;
      for (let dy = -2; dy <= 2; dy++) {
        const ny = y + dy;
        if (ny < 0 || ny >= h) continue;
        const nOffset = ny * w;
        for (let dx = -2; dx <= 2; dx++) {
          const nx = x + dx;
          if (nx < 0 || nx >= w) continue;
          total++;
          if (isBg[nOffset + nx]) bgCount++;
        }
      }
      cleanBg[rowOffset + x] = bgCount >= Math.ceil(total * 0.5) ? 1 : 0;
    }
  }

  // High-fidelity anti-aliasing edge smoothing
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const idx = y * w + x;
      let fgCount = 0;
      let neighbors = 0;
      for (let dy = -1; dy <= 1; dy++) {
        const ny = y + dy;
        if (ny < 0 || ny >= h) continue;
        for (let dx = -1; dx <= 1; dx++) {
          const nx = x + dx;
          if (nx < 0 || nx >= w) continue;
          neighbors++;
          if (!cleanBg[ny * w + nx]) fgCount++;
        }
      }
      if (cleanBg[idx]) {
        alphaMask[idx] = fgCount > 0 ? Math.round((fgCount / neighbors) * 128) : 0;
      } else {
        alphaMask[idx] = Math.round(140 + (fgCount / neighbors) * 115);
      }
    }
  }

  return alphaMask;
}

/**
 * Converts Hex string to RGB numbers accurately without falsy-zero channel corruption
 */
function parseHexColor(hex: string, defR = 0, defG = 0, defB = 0) {
  try {
    if (!hex) return { r: defR, g: defG, b: defB };
    let clean = hex.replace('#', '').trim();
    if (clean.length === 3) {
      clean = clean[0] + clean[0] + clean[1] + clean[1] + clean[2] + clean[2];
    }
    const rVal = parseInt(clean.substring(0, 2), 16);
    const gVal = parseInt(clean.substring(2, 4), 16);
    const bVal = parseInt(clean.substring(4, 6), 16);
    return {
      r: Number.isNaN(rVal) ? defR : rVal,
      g: Number.isNaN(gVal) ? defG : gVal,
      b: Number.isNaN(bVal) ? defB : bVal,
    };
  } catch {
    return { r: defR, g: defG, b: defB };
  }
}

/**
 * Smooth Hermite interpolation between colors
 */
function lerpRGB(
  c1: { r: number; g: number; b: number },
  c2: { r: number; g: number; b: number },
  t: number
) {
  const clampT = Math.max(0, Math.min(1, t));
  const smooth = clampT * clampT * (3 - 2 * clampT);
  return {
    r: Math.round(c1.r + (c2.r - c1.r) * smooth),
    g: Math.round(c1.g + (c2.g - c1.g) * smooth),
    b: Math.round(c1.b + (c2.b - c1.b) * smooth),
  };
}

/**
 * Render CMYK Risograph 4-plate halftone screen
 */
function renderCMYKRisograph(
  ctx: CanvasRenderingContext2D,
  pixels: Uint8ClampedArray,
  alphaMask: Uint8Array,
  w: number,
  h: number,
  margin: number,
  settings: VintagePopSettings,
  shiftX: number,
  shiftY: number
): string | undefined {
  const cmykCanvas = document.createElement('canvas');
  cmykCanvas.width = w;
  cmykCanvas.height = h;
  const cCtx = cmykCanvas.getContext('2d');
  if (!cCtx) return undefined;

  // 4 Screen Separations using active palette and custom accent colors (with dotAngle rotation)
  const baseAngle = settings.dotAngle || 0;
  const screens = [
    { name: 'yellow', angle: (0 + baseAngle) % 360, color: settings.accentColor3 || '#FFF200', shift: 0 },
    { name: 'cyan', angle: (15 + baseAngle) % 360, color: settings.accentColor2 || '#00AEEF', shift: 0.5 },
    { name: 'magenta', angle: (75 + baseAngle) % 360, color: settings.accentColor1 || '#EC008C', shift: 1.0 },
    { name: 'black', angle: (45 + baseAngle) % 360, color: settings.inkColor || '#141414', shift: 0 },
  ];

  const diag = Math.hypot(w, h);
  const spacing = Math.max(4, settings.dotScale);
  const maxR = spacing * 0.72;

  // Tonal contrast, brightness, and density adjustments
  const contrastVal = Number(settings.contrast) || 0;
  const contrastNorm = (contrastVal / 100) * 0.90;
  const contrastFactor = (1 + contrastNorm) / Math.max(0.05, 1 - contrastNorm);
  const brightnessOffset = (Number(settings.brightness) || 0) * 2.2;
  const densityMultiplier = (settings.inkDensity || 85) / 85;

  const showCutoutBorders = Boolean(
    (settings.stickerBorderEnabled && settings.stickerBorderWidth > 0) ||
    (settings.accentCutoutEnabled && (settings.accentCutoutWidth || 0) > 0)
  );

  // Draw over paper cutout base only when cutout borders are enabled
  if (showCutoutBorders) {
    cCtx.fillStyle = settings.stickerBorderColor || '#FFFFFF';
    cCtx.fillRect(0, 0, w, h);
  }

  for (const scr of screens) {
    const angleRad = (scr.angle * Math.PI) / 180;
    const cosA = Math.cos(angleRad);
    const sinA = Math.sin(angleRad);

    const scrCanvas = document.createElement('canvas');
    scrCanvas.width = w;
    scrCanvas.height = h;
    const sCtx = scrCanvas.getContext('2d');
    if (!sCtx) continue;

    sCtx.fillStyle = scr.color;

    if (settings.halftoneStyle === 'lines') {
      const lineSpacing = Math.max(3, settings.dotScale);
      for (let v = -diag; v < diag; v += lineSpacing) {
        for (let u = -diag; u < diag; u += 3) {
          const px = Math.round(w / 2 + u * cosA - v * sinA);
          const py = Math.round(h / 2 + u * sinA + v * cosA);
          if (px < 0 || px >= w || py < 0 || py >= h) continue;
          const idx = py * w + px;
          if (alphaMask[idx] < 25) continue;

          const pIdx = idx * 4;
          let rP = contrastFactor * (pixels[pIdx] - 128) + 128 + brightnessOffset;
          let gP = contrastFactor * (pixels[pIdx + 1] - 128) + 128 + brightnessOffset;
          let bP = contrastFactor * (pixels[pIdx + 2] - 128) + 128 + brightnessOffset;
          if (settings.invertInk) {
            rP = 255 - rP;
            gP = 255 - gP;
            bP = 255 - bP;
          }
          const rNorm = Math.max(0, Math.min(1, rP / 255));
          const gNorm = Math.max(0, Math.min(1, gP / 255));
          const bNorm = Math.max(0, Math.min(1, bP / 255));
          const k = 1 - Math.max(rNorm, gNorm, bNorm);
          let val = 0;
          if (scr.name === 'black') {
            val = Math.pow(k, 1.25) * densityMultiplier;
          } else if (k < 1) {
            if (scr.name === 'cyan') val = ((1 - rNorm - k) / (1 - k)) * densityMultiplier;
            else if (scr.name === 'magenta') val = ((1 - gNorm - k) / (1 - k)) * densityMultiplier;
            else if (scr.name === 'yellow') val = ((1 - bNorm - k) / (1 - k)) * densityMultiplier;
          }
          val = Math.max(0, Math.min(1, val));
          if (val > 0.05) {
            const lineH = Math.max(0.75, val * (lineSpacing * 0.95));
            sCtx.save();
            sCtx.translate(px, py);
            sCtx.rotate(angleRad);
            sCtx.fillRect(-1.5, -lineH / 2, 3, lineH);
            sCtx.restore();
          }
        }
      }
    } else if (settings.halftoneStyle === 'grain') {
      const scale = Math.max(0.5, Math.min(25, Number(settings.dotScale) || 4));
      const isMicro = scale <= 1.2;
      const grainStep = isMicro ? 1 : Math.max(1, Math.round(scale * 0.7));
      for (let py = 0; py < h; py += grainStep) {
        for (let px = 0; px < w; px += grainStep) {
          const idx = py * w + px;
          if (alphaMask[idx] < 25) continue;
          const pIdx = idx * 4;
          let rP = contrastFactor * (pixels[pIdx] - 128) + 128 + brightnessOffset;
          let gP = contrastFactor * (pixels[pIdx + 1] - 128) + 128 + brightnessOffset;
          let bP = contrastFactor * (pixels[pIdx + 2] - 128) + 128 + brightnessOffset;
          if (settings.invertInk) {
            rP = 255 - rP;
            gP = 255 - gP;
            bP = 255 - bP;
          }
          const rNorm = Math.max(0, Math.min(1, rP / 255));
          const gNorm = Math.max(0, Math.min(1, gP / 255));
          const bNorm = Math.max(0, Math.min(1, bP / 255));
          const k = 1 - Math.max(rNorm, gNorm, bNorm);
          let val = 0;
          if (scr.name === 'black') {
            val = Math.pow(k, 1.25) * densityMultiplier;
          } else if (k < 1) {
            if (scr.name === 'cyan') val = ((1 - rNorm - k) / (1 - k)) * densityMultiplier;
            else if (scr.name === 'magenta') val = ((1 - gNorm - k) / (1 - k)) * densityMultiplier;
            else if (scr.name === 'yellow') val = ((1 - bNorm - k) / (1 - k)) * densityMultiplier;
          }
          val = Math.max(0, Math.min(1, val));
          const noise = pseudoNoise(px * 12.9898 + py * 78.233 + scr.angle);
          if (noise > (1 - Math.pow(val, 1.25))) {
            if (isMicro) {
              sCtx.fillRect(px, py, 1, 1);
            } else {
              const gr = Math.max(0.75, (scale / 2) * 0.95);
              sCtx.beginPath();
              sCtx.arc(px, py, gr, 0, Math.PI * 2);
              sCtx.fill();
            }
          }
        }
      }
    } else if (settings.halftoneStyle === 'xerox-solid') {
      const scale = Math.max(0.5, Math.min(25, Number(settings.dotScale) || 4));
      const step = scale <= 1.5 ? 1 : Math.max(1, Math.round(scale * 0.8));
      for (let py = 0; py < h; py += step) {
        for (let px = 0; px < w; px += step) {
          const idx = py * w + px;
          if (alphaMask[idx] < 25) continue;
          const pIdx = idx * 4;
          let rP = contrastFactor * (pixels[pIdx] - 128) + 128 + brightnessOffset;
          let gP = contrastFactor * (pixels[pIdx + 1] - 128) + 128 + brightnessOffset;
          let bP = contrastFactor * (pixels[pIdx + 2] - 128) + 128 + brightnessOffset;
          if (settings.invertInk) {
            rP = 255 - rP;
            gP = 255 - gP;
            bP = 255 - bP;
          }
          const rNorm = Math.max(0, Math.min(1, rP / 255));
          const gNorm = Math.max(0, Math.min(1, gP / 255));
          const bNorm = Math.max(0, Math.min(1, bP / 255));
          const k = 1 - Math.max(rNorm, gNorm, bNorm);
          let val = 0;
          if (scr.name === 'black') {
            val = Math.pow(k, 1.2) * densityMultiplier;
          } else if (k < 1) {
            if (scr.name === 'cyan') val = ((1 - rNorm - k) / (1 - k)) * densityMultiplier;
            else if (scr.name === 'magenta') val = ((1 - gNorm - k) / (1 - k)) * densityMultiplier;
            else if (scr.name === 'yellow') val = ((1 - bNorm - k) / (1 - k)) * densityMultiplier;
          }
          val = Math.max(0, Math.min(1, val));
          const n1 = pseudoNoise(px * 23.17 + py * 89.41 + scr.angle);
          const n2 = pseudoNoise(px * 9.31 + py * 41.73);
          const combinedNoise = n1 * 0.7 + n2 * 0.3;
          if (combinedNoise > (1 - Math.pow(val, 1.15))) {
            const flakeW = Math.max(0.5, scale * (0.8 + n1 * 0.5));
            const flakeH = Math.max(0.5, scale * (0.6 + n2 * 0.6));
            sCtx.fillRect(px - flakeW / 2, py - flakeH / 2, flakeW, flakeH);
          }
        }
      }
    } else if (settings.halftoneStyle === 'crosshatch') {
      const lineSpacing = Math.max(3, settings.dotScale);
      for (let v = -diag; v < diag; v += lineSpacing) {
        for (let u = -diag; u < diag; u += 3) {
          const px = Math.round(w / 2 + u * cosA - v * sinA);
          const py = Math.round(h / 2 + u * sinA + v * cosA);
          if (px < 0 || px >= w || py < 0 || py >= h) continue;
          const idx = py * w + px;
          if (alphaMask[idx] < 25) continue;
          const pIdx = idx * 4;
          let rP = contrastFactor * (pixels[pIdx] - 128) + 128 + brightnessOffset;
          let gP = contrastFactor * (pixels[pIdx + 1] - 128) + 128 + brightnessOffset;
          let bP = contrastFactor * (pixels[pIdx + 2] - 128) + 128 + brightnessOffset;
          if (settings.invertInk) {
            rP = 255 - rP;
            gP = 255 - gP;
            bP = 255 - bP;
          }
          const rNorm = Math.max(0, Math.min(1, rP / 255));
          const gNorm = Math.max(0, Math.min(1, gP / 255));
          const bNorm = Math.max(0, Math.min(1, bP / 255));
          const k = 1 - Math.max(rNorm, gNorm, bNorm);
          let val = 0;
          if (scr.name === 'black') {
            val = Math.pow(k, 1.25) * densityMultiplier;
          } else if (k < 1) {
            if (scr.name === 'cyan') val = ((1 - rNorm - k) / (1 - k)) * densityMultiplier;
            else if (scr.name === 'magenta') val = ((1 - gNorm - k) / (1 - k)) * densityMultiplier;
            else if (scr.name === 'yellow') val = ((1 - bNorm - k) / (1 - k)) * densityMultiplier;
          }
          val = Math.max(0, Math.min(1, val));
          if (val > 0.05) {
            const lineH = Math.max(0.75, val * (lineSpacing * 0.95));
            sCtx.save();
            sCtx.translate(px, py);
            sCtx.rotate(angleRad);
            sCtx.fillRect(-1.5, -lineH / 2, 3, lineH);
            if (val > 0.45) {
              sCtx.rotate(Math.PI / 2);
              sCtx.fillRect(-1.5, -lineH * 0.4, 3, lineH * 0.8);
            }
            sCtx.restore();
          }
        }
      }
    } else if (settings.halftoneStyle === 'diamond') {
      for (let v = -diag; v < diag; v += spacing) {
        for (let u = -diag; u < diag; u += spacing) {
          const px = Math.round(w / 2 + u * cosA - v * sinA);
          const py = Math.round(h / 2 + u * sinA + v * cosA);
          if (px < 0 || px >= w || py < 0 || py >= h) continue;
          const idx = py * w + px;
          if (alphaMask[idx] < 25) continue;
          const pIdx = idx * 4;
          let rP = contrastFactor * (pixels[pIdx] - 128) + 128 + brightnessOffset;
          let gP = contrastFactor * (pixels[pIdx + 1] - 128) + 128 + brightnessOffset;
          let bP = contrastFactor * (pixels[pIdx + 2] - 128) + 128 + brightnessOffset;
          if (settings.invertInk) {
            rP = 255 - rP;
            gP = 255 - gP;
            bP = 255 - bP;
          }
          const rNorm = Math.max(0, Math.min(1, rP / 255));
          const gNorm = Math.max(0, Math.min(1, gP / 255));
          const bNorm = Math.max(0, Math.min(1, bP / 255));
          const k = 1 - Math.max(rNorm, gNorm, bNorm);
          let val = 0;
          if (scr.name === 'black') {
            val = Math.pow(k, 1.25) * densityMultiplier;
          } else if (k < 1) {
            if (scr.name === 'cyan') val = ((1 - rNorm - k) / (1 - k)) * densityMultiplier;
            else if (scr.name === 'magenta') val = ((1 - gNorm - k) / (1 - k)) * densityMultiplier;
            else if (scr.name === 'yellow') val = ((1 - bNorm - k) / (1 - k)) * densityMultiplier;
          }
          val = Math.max(0, Math.min(1, val));
          if (val > 0.05) {
            const r = Math.pow(val, 0.85) * maxR;
            const d = r * 1.4;
            sCtx.save();
            sCtx.translate(px, py);
            sCtx.rotate(angleRad + Math.PI / 4);
            sCtx.fillRect(-d / 2, -d / 2, d, d);
            sCtx.restore();
          }
        }
      }
    } else {
      // Classic Ben-Day Rosette Circles
      for (let v = -diag; v < diag; v += spacing) {
        for (let u = -diag; u < diag; u += spacing) {
          const px = Math.round(w / 2 + u * cosA - v * sinA);
          const py = Math.round(h / 2 + u * sinA + v * cosA);

          if (px < 0 || px >= w || py < 0 || py >= h) continue;

          const idx = py * w + px;
          if (alphaMask[idx] < 25) continue;

          const pIdx = idx * 4;
          let rP = contrastFactor * (pixels[pIdx] - 128) + 128 + brightnessOffset;
          let gP = contrastFactor * (pixels[pIdx + 1] - 128) + 128 + brightnessOffset;
          let bP = contrastFactor * (pixels[pIdx + 2] - 128) + 128 + brightnessOffset;

          if (settings.invertInk) {
            rP = 255 - rP;
            gP = 255 - gP;
            bP = 255 - bP;
          }

          const rNorm = Math.max(0, Math.min(1, rP / 255));
          const gNorm = Math.max(0, Math.min(1, gP / 255));
          const bNorm = Math.max(0, Math.min(1, bP / 255));

          // RGB to CMYK
          const k = 1 - Math.max(rNorm, gNorm, bNorm);
          let val = 0;
          if (scr.name === 'black') {
            val = Math.pow(k, 1.25) * densityMultiplier;
          } else if (k < 1) {
            if (scr.name === 'cyan') val = ((1 - rNorm - k) / (1 - k)) * densityMultiplier;
            else if (scr.name === 'magenta') val = ((1 - gNorm - k) / (1 - k)) * densityMultiplier;
            else if (scr.name === 'yellow') val = ((1 - bNorm - k) / (1 - k)) * densityMultiplier;
          }

          val = Math.max(0, Math.min(1, val));

          if (val > 0.05) {
            const r = Math.pow(val, 0.85) * maxR;
            sCtx.beginPath();
            sCtx.arc(px, py, r, 0, Math.PI * 2);
            sCtx.fill();
          }
        }
      }
    }

    cCtx.globalCompositeOperation = showCutoutBorders ? 'multiply' : 'source-over';
    const ox = scr.shift * shiftX;
    const oy = scr.shift * shiftY;
    cCtx.drawImage(scrCanvas, ox, oy);
  }

  // Clip to subject alpha
  cCtx.globalCompositeOperation = 'destination-in';
  const alphaImg = cCtx.createImageData(w, h);
  for (let i = 0; i < w * h; i++) {
    alphaImg.data[i * 4 + 3] = alphaMask[i];
  }
  const maskCanvas = document.createElement('canvas');
  maskCanvas.width = w;
  maskCanvas.height = h;
  maskCanvas.getContext('2d')?.putImageData(alphaImg, 0, 0);
  cCtx.drawImage(maskCanvas, 0, 0);

  ctx.save();
  ctx.drawImage(cmykCanvas, margin, margin);
  ctx.restore();

  return cmykCanvas.toDataURL('image/png');
}

/**
 * Computes exact 2D Euclidean squared distance from every pixel to the nearest foreground pixel
 * using high-performance 8-direction Signed/Sequential Euclidean Distance Transform (8-SSEDT).
 * Guaranteed subpixel mathematical precision, zero distortion, zero saw-teeth.
 */
function computeExactEDT(
  grid: Uint8Array,
  w: number,
  h: number
): Float32Array {
  const INF = 99999;
  const distSq = new Float32Array(w * h);
  const nearX = new Int32Array(w * h);
  const nearY = new Int32Array(w * h);

  for (let i = 0; i < w * h; i++) {
    if (grid[i] === 1) {
      nearX[i] = 0;
      nearY[i] = 0;
      distSq[i] = 0;
    } else {
      nearX[i] = INF;
      nearY[i] = INF;
      distSq[i] = 1e9;
    }
  }

  // Pass 1: Forward raster scan (top to bottom, left to right)
  for (let y = 0; y < h; y++) {
    const rowOffset = y * w;
    for (let x = 0; x < w; x++) {
      const idx = rowOffset + x;
      let bestD2 = distSq[idx];
      let bestX = nearX[idx];
      let bestY = nearY[idx];

      // (-1, 0) Left
      if (x > 0) {
        const nIdx = idx - 1;
        const nx = nearX[nIdx];
        if (nx !== INF) {
          const ox = nx + 1;
          const oy = nearY[nIdx];
          const d2 = ox * ox + oy * oy;
          if (d2 < bestD2) { bestD2 = d2; bestX = ox; bestY = oy; }
        }
      }
      // (0, -1) Top
      if (y > 0) {
        const nIdx = idx - w;
        const nx = nearX[nIdx];
        if (nx !== INF) {
          const ox = nx;
          const oy = nearY[nIdx] + 1;
          const d2 = ox * ox + oy * oy;
          if (d2 < bestD2) { bestD2 = d2; bestX = ox; bestY = oy; }
        }
      }
      // (-1, -1) Top-Left
      if (x > 0 && y > 0) {
        const nIdx = idx - w - 1;
        const nx = nearX[nIdx];
        if (nx !== INF) {
          const ox = nx + 1;
          const oy = nearY[nIdx] + 1;
          const d2 = ox * ox + oy * oy;
          if (d2 < bestD2) { bestD2 = d2; bestX = ox; bestY = oy; }
        }
      }
      // (1, -1) Top-Right
      if (x < w - 1 && y > 0) {
        const nIdx = idx - w + 1;
        const nx = nearX[nIdx];
        if (nx !== INF) {
          const ox = nx - 1;
          const oy = nearY[nIdx] + 1;
          const d2 = ox * ox + oy * oy;
          if (d2 < bestD2) { bestD2 = d2; bestX = ox; bestY = oy; }
        }
      }

      distSq[idx] = bestD2;
      nearX[idx] = bestX;
      nearY[idx] = bestY;
    }
  }

  // Pass 2: Backward raster scan (bottom to top, right to left)
  for (let y = h - 1; y >= 0; y--) {
    const rowOffset = y * w;
    for (let x = w - 1; x >= 0; x--) {
      const idx = rowOffset + x;
      let bestD2 = distSq[idx];
      let bestX = nearX[idx];
      let bestY = nearY[idx];

      // (1, 0) Right
      if (x < w - 1) {
        const nIdx = idx + 1;
        const nx = nearX[nIdx];
        if (nx !== INF) {
          const ox = nx - 1;
          const oy = nearY[nIdx];
          const d2 = ox * ox + oy * oy;
          if (d2 < bestD2) { bestD2 = d2; bestX = ox; bestY = oy; }
        }
      }
      // (0, 1) Bottom
      if (y < h - 1) {
        const nIdx = idx + w;
        const nx = nearX[nIdx];
        if (nx !== INF) {
          const ox = nx;
          const oy = nearY[nIdx] - 1;
          const d2 = ox * ox + oy * oy;
          if (d2 < bestD2) { bestD2 = d2; bestX = ox; bestY = oy; }
        }
      }
      // (1, 1) Bottom-Right
      if (x < w - 1 && y < h - 1) {
        const nIdx = idx + w + 1;
        const nx = nearX[nIdx];
        if (nx !== INF) {
          const ox = nx - 1;
          const oy = nearY[nIdx] - 1;
          const d2 = ox * ox + oy * oy;
          if (d2 < bestD2) { bestD2 = d2; bestX = ox; bestY = oy; }
        }
      }
      // (-1, 1) Bottom-Left
      if (x > 0 && y < h - 1) {
        const nIdx = idx + w - 1;
        const nx = nearX[nIdx];
        if (nx !== INF) {
          const ox = nx + 1;
          const oy = nearY[nIdx] - 1;
          const d2 = ox * ox + oy * oy;
          if (d2 < bestD2) { bestD2 = d2; bestX = ox; bestY = oy; }
        }
      }

      distSq[idx] = bestD2;
      nearX[idx] = bestX;
      nearY[idx] = bestY;
    }
  }

  return distSq;
}

/**
 * Bridges narrow crevice indentations (e.g. between eyelashes) and eliminates noise specks
 * to minimize waviness ("আঁকাবাঁকা") and produce a gentle, continuous outer contour envelope.
 */
function smoothAndBridgeSilhouette(
  grid: Uint8Array,
  w: number,
  h: number
): Uint8Array {
  // Step 1: Filter out tiny floating background noise specks (< 300 pixels)
  const visited = new Uint8Array(w * h);
  const queue = new Int32Array(w * h);
  let largestComponentSize = 0;
  const components: { size: number; seed: number }[] = [];

  for (let y = 0; y < h; y++) {
    const rowOffset = y * w;
    for (let x = 0; x < w; x++) {
      const idx = rowOffset + x;
      if (grid[idx] === 1 && !visited[idx]) {
        let qHead = 0;
        let qTail = 0;
        queue[qTail++] = idx;
        visited[idx] = 1;

        while (qHead < qTail) {
          const curr = queue[qHead++];
          const cx = curr % w;
          const cy = Math.floor(curr / w);

          if (cy > 0) {
            const up = curr - w;
            if (grid[up] === 1 && !visited[up]) { visited[up] = 1; queue[qTail++] = up; }
          }
          if (cy < h - 1) {
            const down = curr + w;
            if (grid[down] === 1 && !visited[down]) { visited[down] = 1; queue[qTail++] = down; }
          }
          if (cx > 0) {
            const left = curr - 1;
            if (grid[left] === 1 && !visited[left]) { visited[left] = 1; queue[qTail++] = left; }
          }
          if (cx < w - 1) {
            const right = curr + 1;
            if (grid[right] === 1 && !visited[right]) { visited[right] = 1; queue[qTail++] = right; }
          }
        }

        const compSize = qTail;
        if (compSize > largestComponentSize) {
          largestComponentSize = compSize;
        }
        components.push({ size: compSize, seed: idx });
      }
    }
  }

  // Clear any tiny disconnected speckles smaller than 5% of largest component
  const cleanGrid = new Uint8Array(w * h);
  const minKeepSize = Math.max(300, largestComponentSize * 0.05);
  for (const comp of components) {
    if (comp.size >= minKeepSize) {
      let qHead = 0;
      let qTail = 0;
      queue[qTail++] = comp.seed;
      cleanGrid[comp.seed] = 1;
      const compVisited = new Uint8Array(w * h);
      compVisited[comp.seed] = 1;

      while (qHead < qTail) {
        const curr = queue[qHead++];
        const cx = curr % w;
        const cy = Math.floor(curr / w);

        if (cy > 0) {
          const up = curr - w;
          if (grid[up] === 1 && !compVisited[up]) { compVisited[up] = 1; cleanGrid[up] = 1; queue[qTail++] = up; }
        }
        if (cy < h - 1) {
          const down = curr + w;
          if (grid[down] === 1 && !compVisited[down]) { compVisited[down] = 1; cleanGrid[down] = 1; queue[qTail++] = down; }
        }
        if (cx > 0) {
          const left = curr - 1;
          if (grid[left] === 1 && !compVisited[left]) { compVisited[left] = 1; cleanGrid[left] = 1; queue[qTail++] = left; }
        }
        if (cx < w - 1) {
          const right = curr + 1;
          if (grid[right] === 1 && !compVisited[right]) { compVisited[right] = 1; cleanGrid[right] = 1; queue[qTail++] = right; }
        }
      }
    }
  }

  // Step 2: Morphological closing with radius 36 to bridge valleys between eyebrow & eye, eyelashes, and creases
  const bridgeRadius = 36;
  const tempDil = new Uint8Array(w * h);
  const dilated = new Uint8Array(w * h);

  // Horizontal dilation
  for (let y = 0; y < h; y++) {
    const rowOffset = y * w;
    let count = 0;
    for (let x = 0; x < Math.min(w, bridgeRadius); x++) {
      if (cleanGrid[rowOffset + x]) count++;
    }
    for (let x = 0; x < w; x++) {
      if (x + bridgeRadius < w && cleanGrid[rowOffset + x + bridgeRadius]) count++;
      if (x - bridgeRadius - 1 >= 0 && cleanGrid[rowOffset + x - bridgeRadius - 1]) count--;
      if (count > 0) tempDil[rowOffset + x] = 1;
    }
  }
  // Vertical dilation
  for (let x = 0; x < w; x++) {
    let count = 0;
    for (let y = 0; y < Math.min(h, bridgeRadius); y++) {
      if (tempDil[y * w + x]) count++;
    }
    for (let y = 0; y < h; y++) {
      if (y + bridgeRadius < h && tempDil[(y + bridgeRadius) * w + x]) count++;
      if (y - bridgeRadius - 1 >= 0 && tempDil[(y - bridgeRadius - 1) * w + x]) count--;
      if (count > 0) dilated[y * w + x] = 1;
    }
  }

  // Erosion (radius 6)
  const tempEro = new Uint8Array(w * h);
  for (let y = 0; y < h; y++) {
    const rowOffset = y * w;
    let count = 0;
    for (let x = 0; x < Math.min(w, bridgeRadius); x++) {
      if (dilated[rowOffset + x]) count++;
    }
    for (let x = 0; x < w; x++) {
      if (x + bridgeRadius < w && dilated[rowOffset + x + bridgeRadius]) count++;
      if (x - bridgeRadius - 1 >= 0 && dilated[rowOffset + x - bridgeRadius - 1]) count--;
      const curWin = Math.min(w - 1, x + bridgeRadius) - Math.max(0, x - bridgeRadius) + 1;
      if (count >= curWin) tempEro[rowOffset + x] = 1;
    }
  }
  const closed = new Uint8Array(w * h);
  for (let x = 0; x < w; x++) {
    let count = 0;
    for (let y = 0; y < Math.min(h, bridgeRadius); y++) {
      if (tempEro[y * w + x]) count++;
    }
    for (let y = 0; y < h; y++) {
      if (y + bridgeRadius < h && tempEro[(y + bridgeRadius) * w + x]) count++;
      if (y - bridgeRadius - 1 >= 0 && tempEro[(y - bridgeRadius - 1) * w + x]) count--;
      const curWin = Math.min(h - 1, y + bridgeRadius) - Math.max(0, y - bridgeRadius) + 1;
      if (count >= curWin) closed[y * w + x] = 1;
    }
  }

  // Step 3: Multi-pass 5x5 majority voting to remove any residual staircase steps
  return smoothBinaryGrid(closed, w, h);
}

/**
 * Multi-pass morphological majority filter to melt away single-pixel staircase jaggedness & micro-notches,
 * ensuring the resulting distance transform creates silk-smooth curves.
 */
function smoothBinaryGrid(grid: Uint8Array, w: number, h: number): Uint8Array {
  let current = grid;
  // 2 passes of 5x5 window majority vote to melt away staircase notches and micro-indentations
  for (let pass = 0; pass < 2; pass++) {
    const clean = new Uint8Array(w * h);
    for (let y = 0; y < h; y++) {
      const rowOffset = y * w;
      for (let x = 0; x < w; x++) {
        const idx = rowOffset + x;
        if (x < 2 || x >= w - 2 || y < 2 || y >= h - 2) {
          clean[idx] = current[idx];
          continue;
        }
        let sum = 0;
        for (let dy = -2; dy <= 2; dy++) {
          const nOffset = (y + dy) * w;
          for (let dx = -2; dx <= 2; dx++) {
            sum += current[nOffset + (x + dx)];
          }
        }
        clean[idx] = sum >= 13 ? 1 : 0;
      }
    }
    current = clean;
  }
  return current;
}

/**
 * Convolves Euclidean distance field with a 2-pass separable Gaussian filter to eliminate all
 * Voronoi scallop ridges, micro-notches, and discrete stair-steps, producing a mathematically
 * silky-smooth continuous contour level set with minimal waviness and zero saw-teeth.
 */
function computeSmoothDistance(
  distSq: Float32Array,
  w: number,
  h: number
): Float32Array {
  const dist = new Float32Array(w * h);
  for (let i = 0; i < w * h; i++) {
    dist[i] = Math.sqrt(distSq[i]);
  }

  let current = dist;

  // 2 passes of 5-tap Gaussian [1, 4, 6, 4, 1] / 16 (effective 9-tap Gaussian, sigma ~ 2.0)
  // Completely dissolves micro-scallop ridges (khachkata) and dampens wave undulations (akabaka)
  for (let pass = 0; pass < 2; pass++) {
    const temp = new Float32Array(w * h);
    const smoothed = new Float32Array(w * h);

    // Horizontal pass
    for (let y = 0; y < h; y++) {
      const rowOffset = y * w;
      for (let x = 0; x < w; x++) {
        const x0 = Math.max(0, x - 2);
        const x1 = Math.max(0, x - 1);
        const x2 = x;
        const x3 = Math.min(w - 1, x + 1);
        const x4 = Math.min(w - 1, x + 2);

        temp[rowOffset + x] =
          (current[rowOffset + x0] +
            4 * current[rowOffset + x1] +
            6 * current[rowOffset + x2] +
            4 * current[rowOffset + x3] +
            current[rowOffset + x4]) / 16;
      }
    }

    // Vertical pass
    for (let y = 0; y < h; y++) {
      const y0 = Math.max(0, y - 2) * w;
      const y1 = Math.max(0, y - 1) * w;
      const y2 = y * w;
      const y3 = Math.min(h - 1, y + 1) * w;
      const y4 = Math.min(h - 1, y + 2) * w;

      for (let x = 0; x < w; x++) {
        smoothed[y2 + x] =
          (temp[y0 + x] +
            4 * temp[y1 + x] +
            6 * temp[y2 + x] +
            4 * temp[y3 + x] +
            temp[y4 + x]) / 16;
      }
    }

    current = smoothed;
  }

  return current;
}

/**
 * Renders an exact, silky-smooth anti-aliased die-cut dilated layer (paper cutout / middle cutout accent).
 * Eliminates all rough saw-teeth ("খাঁজকাটা"), waviness, and distortion.
 * Crisp die-cut contours with solid 100% opacity, completely eliminating any blurry light red shadow or halo artifacts.
 */
function renderDilatedLayer(
  smoothDist: Float32Array,
  isExterior: Uint8Array,
  silPixels: Uint8ClampedArray,
  w: number,
  h: number,
  radius: number,
  color: string,
  style: string = 'smooth',
  borderOnly: boolean = false
): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas;

  const imgData = ctx.createImageData(w, h);
  const data = imgData.data;
  const rgb = parseHexColor(color, 255, 255, 255);

  const isTorn = style === 'torn-paper';

  for (let y = 0; y < h; y++) {
    const rowOffset = y * w;
    for (let x = 0; x < w; x++) {
      const idx = rowOffset + x;
      const d = smoothDist[idx];

      if (borderOnly) {
        // Crisp die-cut band strictly on the exterior side with 100% solid opacity (zero blurry red shadow/halo)
        if (isExterior[idx] !== 1 || d <= 0 || d > radius) {
          continue;
        }

        const pIdx = idx * 4;
        data[pIdx] = rgb.r;
        data[pIdx + 1] = rgb.g;
        data[pIdx + 2] = rgb.b;
        data[pIdx + 3] = 255;
      } else {
        // Solid Paper Cutout Shape (Outer border / middle offset accent plate):
        // Solid under subject, extending outward by radius with 100% solid opacity
        const onExterior = isExterior[idx] === 1;
        if (!onExterior || d <= radius) {
          const pIdx = idx * 4;
          data[pIdx] = rgb.r;
          data[pIdx + 1] = rgb.g;
          data[pIdx + 2] = rgb.b;
          data[pIdx + 3] = 255;
        } else if (isTorn && d < radius + 1.8) {
          const effD = d + pseudoNoise(Math.floor(x / 4) * 0.2 + Math.floor(y / 4) * 0.35) * 1.0;
          if (effD <= radius + 0.8) {
            const pIdx = idx * 4;
            data[pIdx] = rgb.r;
            data[pIdx + 1] = rgb.g;
            data[pIdx + 2] = rgb.b;
            data[pIdx + 3] = 255;
          }
        }
      }
    }
  }

  ctx.putImageData(imgData, 0, 0);
  return canvas;
}

/**
 * Core Vintage Pop Engine
 * High-performance, 60fps real-time pop art halftone collage generator
 */
export function renderVintagePop(
  sourceImg: HTMLImageElement,
  settings: VintagePopSettings
): VintagePopResult {
  const startTime = performance.now();

  const srcW = sourceImg.naturalWidth || sourceImg.width || 800;
  const srcH = sourceImg.naturalHeight || sourceImg.height || 800;

  // Optimized work resolution for instant 60fps responsiveness (max 1200)
  const maxDim = 1200;
  let imgW = srcW;
  let imgH = srcH;
  if (imgW > maxDim || imgH > maxDim) {
    if (imgW >= imgH) {
      imgH = Math.round((srcH / srcW) * maxDim);
      imgW = maxDim;
    } else {
      imgW = Math.round((srcW / srcH) * maxDim);
      imgH = maxDim;
    }
  }

  // Step 1: Draw source image onto temp canvas to extract pixels & initial alpha mask
  let imgCanvas = document.createElement('canvas');
  imgCanvas.width = imgW;
  imgCanvas.height = imgH;
  let imgCtx = imgCanvas.getContext('2d', { willReadFrequently: true });
  if (!imgCtx) throw new Error('Could not create 2D canvas context');

  imgCtx.drawImage(sourceImg, 0, 0, imgW, imgH);
  let srcImgData = imgCtx.getImageData(0, 0, imgW, imgH);
  let srcPixels = srcImgData.data;

  // Step 2: Extract Alpha Mask - always extracts so transparent subject is preserved
  let alphaMask = extractEdgeConnectedBackground(srcPixels, imgW, imgH, settings.cutoutTolerance);

  // Step 2.5: Detect Subject Content Bounds (Crop tight around the subject just like StippleEngine)
  let subMinX = imgW, subMaxX = 0, subMinY = imgH, subMaxY = 0;
  let subjectPixelCount = 0;
  for (let y = 0; y < imgH; y++) {
    const rowOffset = y * imgW;
    for (let x = 0; x < imgW; x++) {
      if (alphaMask[rowOffset + x] > 20) {
        if (x < subMinX) subMinX = x;
        if (x > subMaxX) subMaxX = x;
        if (y < subMinY) subMinY = y;
        if (y > subMaxY) subMaxY = y;
        subjectPixelCount++;
      }
    }
  }

  const hasIsolatedSubject =
    subjectPixelCount > 40 &&
    subMinX < subMaxX &&
    subMinY < subMaxY &&
    (subMinX > 10 || subMinY > 10 || subMaxX < imgW - 11 || subMaxY < imgH - 11);

  if (hasIsolatedSubject) {
    const subW = subMaxX - subMinX + 1;
    const subH = subMaxY - subMinY + 1;
    // Add tiny 1.5% breathing margin around subject
    const padX = Math.round(subW * 0.015);
    const padY = Math.round(subH * 0.015);
    const cropX = Math.max(0, subMinX - padX);
    const cropY = Math.max(0, subMinY - padY);
    const cropW = Math.min(imgW - cropX, subW + padX * 2);
    const cropH = Math.min(imgH - cropY, subH + padY * 2);

    const cropAspect = cropW / Math.max(1, cropH);
    let newImgW = maxDim;
    let newImgH = maxDim;
    if (cropW >= cropH) {
      newImgW = maxDim;
      newImgH = Math.max(20, Math.round(maxDim / cropAspect));
    } else {
      newImgH = maxDim;
      newImgW = Math.max(20, Math.round(maxDim * cropAspect));
    }

    const croppedCanvas = document.createElement('canvas');
    croppedCanvas.width = newImgW;
    croppedCanvas.height = newImgH;
    const cCtx = croppedCanvas.getContext('2d', { willReadFrequently: true });
    if (cCtx) {
      cCtx.drawImage(
        imgCanvas,
        cropX,
        cropY,
        cropW,
        cropH,
        0,
        0,
        newImgW,
        newImgH
      );
      imgW = newImgW;
      imgH = newImgH;
      imgCanvas = croppedCanvas;
      imgCtx = cCtx;
      srcPixels = cCtx.getImageData(0, 0, imgW, imgH).data;
      alphaMask = extractEdgeConnectedBackground(srcPixels, imgW, imgH, settings.cutoutTolerance);
    }
  }

  const showCutoutBorders = Boolean(
    (settings.stickerBorderEnabled && settings.stickerBorderWidth > 0) ||
    (settings.accentCutoutEnabled && (settings.accentCutoutWidth || 0) > 0)
  );

  // Margin padding so sticker border, accent cutout, and drop shadow are never clipped
  const borderWidth = (showCutoutBorders && settings.stickerBorderEnabled)
    ? Math.round(settings.stickerBorderWidth)
    : 0;
  const borderShiftX = settings.stickerBorderShiftX || 0;
  const borderShiftY = settings.stickerBorderShiftY || 0;
  const accentWidth = (showCutoutBorders && settings.accentCutoutEnabled)
    ? Math.max(1, Math.round(settings.accentCutoutWidth || 6))
    : 0;
  const accentShiftX = settings.accentCutoutShiftX || 0;
  const accentShiftY = settings.accentCutoutShiftY || 0;
  const maxBorderExpansion = Math.max(
    borderWidth + Math.max(Math.abs(borderShiftX), Math.abs(borderShiftY)),
    accentWidth + Math.max(Math.abs(accentShiftX), Math.abs(accentShiftY))
  );
  const margin = Math.max(36, maxBorderExpansion + 24);
  const outW = imgW + margin * 2;
  const outH = imgH + margin * 2;

  // Step 3: Create Silhouette Canvas for solid white foundation
  const silCanvas = document.createElement('canvas');
  silCanvas.width = outW;
  silCanvas.height = outH;
  const silCtx = silCanvas.getContext('2d');
  if (!silCtx) throw new Error('Could not create silhouette canvas');

  const silImgData = silCtx.createImageData(outW, outH);
  const silPixels = silImgData.data;

  // Copy alpha into padded canvas with subpixel fidelity, using selected paper cutout color
  const paperBaseColor = parseHexColor(settings.stickerBorderColor || '#FFFFFF', 255, 255, 255);
  for (let y = 0; y < imgH; y++) {
    const rowOffset = y * imgW;
    const outRowOffset = (y + margin) * outW + margin;
    for (let x = 0; x < imgW; x++) {
      const a = alphaMask[rowOffset + x];
      if (a > 20) {
        const pIdx = (outRowOffset + x) * 4;
        silPixels[pIdx] = paperBaseColor.r;
        silPixels[pIdx + 1] = paperBaseColor.g;
        silPixels[pIdx + 2] = paperBaseColor.b;
        silPixels[pIdx + 3] = a;
      }
    }
  }
  silCtx.putImageData(silImgData, 0, 0);

  // Identify exterior vs interior background pixels
  // Exterior: connected to padding margin boundaries (guaranteed outer die-cut region)
  // Interior: holes inside the subject (e.g. transparent eyes)
  const isExterior = new Uint8Array(outW * outH);
  const bgQueue = new Int32Array(outW * outH);
  let bgQHead = 0;
  let bgQTail = 0;

  for (let x = 0; x < outW; x++) {
    const topIdx = x;
    const botIdx = (outH - 1) * outW + x;
    if (silPixels[topIdx * 4 + 3] <= 20) {
      isExterior[topIdx] = 1;
      bgQueue[bgQTail++] = topIdx;
    }
    if (silPixels[botIdx * 4 + 3] <= 20) {
      isExterior[botIdx] = 1;
      bgQueue[bgQTail++] = botIdx;
    }
  }
  for (let y = 1; y < outH - 1; y++) {
    const leftIdx = y * outW;
    const rightIdx = y * outW + (outW - 1);
    if (silPixels[leftIdx * 4 + 3] <= 20) {
      isExterior[leftIdx] = 1;
      bgQueue[bgQTail++] = leftIdx;
    }
    if (silPixels[rightIdx * 4 + 3] <= 20) {
      isExterior[rightIdx] = 1;
      bgQueue[bgQTail++] = rightIdx;
    }
  }

  while (bgQHead < bgQTail) {
    const curr = bgQueue[bgQHead++];
    const cx = curr % outW;
    const cy = Math.floor(curr / outW);

    if (cy > 0) {
      const up = curr - outW;
      if (!isExterior[up] && silPixels[up * 4 + 3] <= 20) {
        isExterior[up] = 1;
        bgQueue[bgQTail++] = up;
      }
    }
    if (cy < outH - 1) {
      const down = curr + outW;
      if (!isExterior[down] && silPixels[down * 4 + 3] <= 20) {
        isExterior[down] = 1;
        bgQueue[bgQTail++] = down;
      }
    }
    if (cx > 0) {
      const left = curr - 1;
      if (!isExterior[left] && silPixels[left * 4 + 3] <= 20) {
        isExterior[left] = 1;
        bgQueue[bgQTail++] = left;
      }
    }
    if (cx < outW - 1) {
      const right = curr + 1;
      if (!isExterior[right] && silPixels[right * 4 + 3] <= 20) {
        isExterior[right] = 1;
        bgQueue[bgQTail++] = right;
      }
    }
  }

  const cutoutColorHex = settings.stickerBorderColor || '#FFFFFF';
  const cutoutRgb = parseHexColor(cutoutColorHex, 255, 255, 255);

  // 1. Fill all interior cavities of silPixels with the selected Cutout Color
  // so the subject artwork always sits on the user's selected paper cutout sticker color foundation
  for (let i = 0; i < outW * outH; i++) {
    if (!isExterior[i]) {
      const pIdx = i * 4;
      silPixels[pIdx] = cutoutRgb.r;
      silPixels[pIdx + 1] = cutoutRgb.g;
      silPixels[pIdx + 2] = cutoutRgb.b;
      silPixels[pIdx + 3] = 255;
    }
  }
  silCtx.putImageData(silImgData, 0, 0);

  // 2. Build binary grid from solid silhouette (!isExterior) with zero internal holes
  const rawGrid = new Uint8Array(outW * outH);
  let fgCount = 0;
  for (let i = 0; i < outW * outH; i++) {
    if (!isExterior[i]) {
      rawGrid[i] = 1;
      fgCount++;
    }
  }

  // 3. Smooth, bridge narrow crevices between eyelashes/hair spikes to minimize waviness (akabaka)
  const binaryGrid = fgCount > 0 ? smoothAndBridgeSilhouette(rawGrid, outW, outH) : rawGrid;
  const distSq = fgCount > 0 ? computeExactEDT(binaryGrid, outW, outH) : new Float32Array(outW * outH);
  const smoothDist = fgCount > 0 ? computeSmoothDistance(distSq, outW, outH) : new Float32Array(outW * outH);

  // 4. Fill silPixels solid with the user's chosen cutout color across the entire bridged solid subject (binaryGrid == 1)
  // so Layer 1 (Paper Cutout Foundation) matches the sticker sheet color completely
  for (let i = 0; i < outW * outH; i++) {
    if (binaryGrid[i] === 1) {
      const pIdx = i * 4;
      silPixels[pIdx] = cutoutRgb.r;
      silPixels[pIdx + 1] = cutoutRgb.g;
      silPixels[pIdx + 2] = cutoutRgb.b;
      silPixels[pIdx + 3] = 255;
    }
  }
  silCtx.putImageData(silImgData, 0, 0);

  // Step 4: Create Dilated Sticker Border Canvas (Paper Cut)
  const borderCanvas = document.createElement('canvas');
  borderCanvas.width = outW;
  borderCanvas.height = outH;
  const bCtx = borderCanvas.getContext('2d');
  if (!bCtx) throw new Error('Could not create border canvas');

  if (settings.stickerBorderEnabled && borderWidth > 0 && fgCount > 0) {
    const bLayer = renderDilatedLayer(
      smoothDist,
      isExterior,
      silPixels,
      outW,
      outH,
      borderWidth,
      settings.stickerBorderColor || '#FFFFFF',
      settings.stickerBorderStyle || 'smooth',
      false
    );
    bCtx.drawImage(bLayer, 0, 0);
  }

  // Step 4.5: Create Dilated Accent Cutout Canvas for Layer 2 (Middle resizable color offset cutout)
  // Strictly on the exterior side (borderOnly: true), with ZERO presence inside the subject or eyes!
  const accentCutoutCanvas = document.createElement('canvas');
  accentCutoutCanvas.width = outW;
  accentCutoutCanvas.height = outH;
  const acCtx = accentCutoutCanvas.getContext('2d');
  if (acCtx && settings.accentCutoutEnabled && accentWidth > 0 && fgCount > 0) {
    const aLayer = renderDilatedLayer(
      smoothDist,
      isExterior,
      silPixels,
      outW,
      outH,
      accentWidth,
      settings.accentCutoutColor || '#E52521',
      'smooth',
      false // Solid die-cut plate underneath silhouette: crisp 100% solid color, zero blurry shadow
    );
    acCtx.drawImage(aLayer, 0, 0);
  }

  // Step 5: Composite Output Canvas
  const outCanvas = document.createElement('canvas');
  outCanvas.width = outW;
  outCanvas.height = outH;
  const outCtx = outCanvas.getContext('2d', { willReadFrequently: true });
  if (!outCtx) throw new Error('Could not create output canvas');

  // Layer 0: Background Base (applied to raw buffer only when cutout sticker mode is inactive)
  if (!settings.isBackgroundTransparent && !showCutoutBorders) {
    outCtx.fillStyle = settings.backgroundColor || '#1C1D24';
    outCtx.fillRect(0, 0, outW, outH);
  }

  // Layer 0.5: Comic Background Ben-Day Halftone Dots
  if (settings.comicBgScreenEnabled && !settings.isBackgroundTransparent && !showCutoutBorders) {
    outCtx.save();
    outCtx.fillStyle = settings.comicBgColor || '#2B2D3A';
    const bgSpacing = Math.max(8, settings.comicBgDotSize * 2.2);
    const bgRadius = Math.max(1.5, settings.comicBgDotSize * 0.65);
    for (let by = 0; by < outH; by += bgSpacing) {
      for (let bx = 0; bx < outW; bx += bgSpacing) {
        outCtx.beginPath();
        outCtx.arc(
          bx + (by % (bgSpacing * 2) ? bgSpacing * 0.5 : 0),
          by,
          bgRadius,
          0,
          Math.PI * 2
        );
        outCtx.fill();
      }
    }
    outCtx.restore();
  }

  // Layer 1: Sunburst behind cutout (applied to raw buffer only when cutout sticker mode is inactive)
  if (settings.sunburstEnabled && settings.sunburstPosition === 'behind-cutout' && !showCutoutBorders) {
    const cX = (settings.sunburstCenterX / 100) * outW;
    const cY = (settings.sunburstCenterY / 100) * outH;
    drawSunburst(
      outCtx,
      outW,
      outH,
      cX,
      cY,
      settings.sunburstRays,
      settings.sunburstColor1,
      settings.sunburstColor2
    );
  }

  // Layer 3 (Outer): White Sticker Die-Cut Border with Drop Shadow
  if (showCutoutBorders && settings.stickerBorderEnabled && borderWidth > 0) {
    outCtx.save();
    if (settings.stickerShadow) {
      outCtx.shadowColor = settings.stickerShadowColor || 'rgba(0, 0, 0, 0.45)';
      outCtx.shadowBlur = settings.stickerShadowBlur || 14;
      outCtx.shadowOffsetX = 3;
      outCtx.shadowOffsetY = 7;
    }
    outCtx.drawImage(borderCanvas, borderShiftX, borderShiftY);
    outCtx.restore();
  }

  // Layer 2 (Middle): Offset Color Cut-Out Accent (Resizable Cutout, moved by X, Y)
  if (showCutoutBorders && settings.accentCutoutEnabled && accentWidth > 0) {
    outCtx.save();
    if ((!settings.stickerBorderEnabled || borderWidth <= 0) && settings.stickerShadow) {
      outCtx.shadowColor = settings.stickerShadowColor || 'rgba(0, 0, 0, 0.45)';
      outCtx.shadowBlur = settings.stickerShadowBlur || 14;
      outCtx.shadowOffsetX = 3;
      outCtx.shadowOffsetY = 7;
    }
    outCtx.drawImage(accentCutoutCanvas, accentShiftX, accentShiftY);
    outCtx.restore();
  }

  // Layer 1 (Inner): Solid Paper Cutout Foundation underneath subject
  // Unified with the Paper Cutout backing (moves together with borderShiftX, borderShiftY)
  const shiftX = settings.colorShiftEnabled ? settings.colorShiftX : 0;
  const shiftY = settings.colorShiftEnabled ? settings.colorShiftY : 0;

  if (showCutoutBorders) {
    outCtx.save();
    outCtx.drawImage(silCanvas, borderShiftX, borderShiftY);
    outCtx.restore();
  }

  // Layer 4: Sunburst inside object (rendered into a mask canvas to composite over color infill)
  let sunburstInsideCanvas: HTMLCanvasElement | null = null;
  if (settings.sunburstEnabled && settings.sunburstPosition === 'inside-object') {
    sunburstInsideCanvas = document.createElement('canvas');
    sunburstInsideCanvas.width = outW;
    sunburstInsideCanvas.height = outH;
    const sCtx = sunburstInsideCanvas.getContext('2d');
    if (sCtx) {
      const cX = (settings.sunburstCenterX / 100) * outW;
      const cY = (settings.sunburstCenterY / 100) * outH;
      drawSunburst(
        sCtx,
        outW,
        outH,
        cX,
        cY,
        settings.sunburstRays,
        settings.sunburstColor1,
        settings.sunburstColor2
      );
      sCtx.globalCompositeOperation = 'destination-in';
      sCtx.drawImage(silCanvas, 0, 0);
    }
  }

  // Layer 5: Color Infill & Processing
  let colorDataUrl: string | undefined;

  if (settings.coloringMode === 'cmyk-risograph') {
    // Authentic 4-color rosette screen printing
    colorDataUrl = renderCMYKRisograph(
      outCtx,
      srcPixels,
      alphaMask,
      imgW,
      imgH,
      margin,
      settings,
      shiftX,
      shiftY
    );
  } else {
    // Single & Multi-color screen rendering with smooth gradient mapping
    const colorCanvas = document.createElement('canvas');
    colorCanvas.width = imgW;
    colorCanvas.height = imgH;
    const cCtx = colorCanvas.getContext('2d');

    if (cCtx) {
      const cImgData = cCtx.createImageData(imgW, imgH);
      const cPixels = cImgData.data;

      const ink = parseHexColor(settings.inkColor, 20, 20, 22);
      const acc1 = parseHexColor(settings.accentColor1, 229, 37, 33); // Red
      const acc2 = parseHexColor(settings.accentColor2, 0, 174, 239); // Cyan
      const acc3 = parseHexColor(settings.accentColor3, 255, 209, 0); // Yellow
      const white = { r: 255, g: 255, b: 255 };

      const contrastVal = Number(settings.contrast ?? 0);
      const contrastNorm = (contrastVal / 100) * 0.90;
      const contrastFactor = (1 + contrastNorm) / Math.max(0.04, 1 - contrastNorm);
      const brightnessOffset = Number(settings.brightness ?? 0) * 2.2;
      const softness = (settings.colorSoftness || 75) / 100;

      for (let y = 0; y < imgH; y++) {
        for (let x = 0; x < imgW; x++) {
          const idx = y * imgW + x;
          if (alphaMask[idx] < 20) continue;

          const pIdx = idx * 4;
          const r = srcPixels[pIdx];
          const g = srcPixels[pIdx + 1];
          const b = srcPixels[pIdx + 2];

          // Perceived luminance with responsive brightness and photocopy contrast
          let lum = 0.299 * r + 0.587 * g + 0.114 * b;
          lum += brightnessOffset;
          lum = Math.max(0, Math.min(255, lum));
          lum = (lum - 128) * contrastFactor + 128;
          lum = Math.max(0, Math.min(255, lum));
          const t = lum / 255; // 0 (shadow) to 1 (highlight)

          let outRGB = { r: ink.r, g: ink.g, b: ink.b };

          if (settings.coloringMode === 'photo-pop') {
            // Saturated technicolor photo pop with responsive brightness & contrast
            let rP = (r + brightnessOffset - 128) * contrastFactor + 128;
            let gP = (g + brightnessOffset - 128) * contrastFactor + 128;
            let bP = (b + brightnessOffset - 128) * contrastFactor + 128;

            const avg = (rP + gP + bP) / 3;
            rP = avg + (rP - avg) * 1.45;
            gP = avg + (gP - avg) * 1.45;
            bP = avg + (bP - avg) * 1.45;

            outRGB = {
              r: Math.max(0, Math.min(255, Math.round(rP))),
              g: Math.max(0, Math.min(255, Math.round(gP))),
              b: Math.max(0, Math.min(255, Math.round(bP))),
            };
          } else if (settings.coloringMode === 'smooth-gradient') {
            // Silky smooth continuous gradient mapping modulated by colorSoftness
            let tS = t;
            if (softness < 0.65) {
              const stepCount = Math.max(3, Math.round(softness * 12));
              tS = Math.round(t * stepCount) / stepCount;
            }
            if (tS < 0.28) {
              outRGB = lerpRGB(ink, acc1, tS / 0.28);
            } else if (tS < 0.58) {
              outRGB = lerpRGB(acc1, acc2, (tS - 0.28) / 0.3);
            } else if (tS < 0.86) {
              outRGB = lerpRGB(acc2, acc3, (tS - 0.58) / 0.28);
            } else {
              outRGB = lerpRGB(acc3, white, (tS - 0.86) / 0.14);
            }
          } else if (settings.coloringMode === 'monochrome-noir') {
            // Pure Black & White (Monochrome Noir Halftone)
            if (softness < 0.4) {
              outRGB = t < 0.48 ? ink : white;
            } else {
              outRGB = lerpRGB(ink, white, t);
            }
          } else if (settings.coloringMode === 'duotone-pop') {
            // Duotone modulated by colorSoftness
            if (softness < 0.45) {
              outRGB = t < 0.5 ? ink : acc1;
            } else {
              outRGB = t < 0.5 ? lerpRGB(ink, acc1, t / 0.5) : lerpRGB(acc1, acc3, (t - 0.5) / 0.5);
            }
          } else if (settings.coloringMode === 'selective-accent') {
            const maxC = Math.max(r, g, b);
            const minC = Math.min(r, g, b);
            const sat = maxC > 0 ? (maxC - minC) / maxC : 0;
            const thresholdSat = 0.45 - softness * 0.25;

            if (sat > thresholdSat) {
              if (r > g && r > b) outRGB = acc1;
              else if (b > r && b > g) outRGB = acc2;
              else outRGB = acc3;
            } else {
              outRGB = lerpRGB(ink, white, t);
            }
          } else {
            // Tri-color with softness control
            if (softness > 0.4) {
              if (t < 0.35) outRGB = lerpRGB(ink, acc1, t / 0.35);
              else if (t < 0.75) outRGB = lerpRGB(acc1, acc2, (t - 0.35) / 0.4);
              else outRGB = lerpRGB(acc2, white, (t - 0.75) / 0.25);
            } else {
              if (t < 0.25) outRGB = ink;
              else if (t < 0.6) outRGB = acc1;
              else if (t < 0.88) outRGB = acc2;
              else outRGB = white;
            }
          }

          cPixels[pIdx] = outRGB.r;
          cPixels[pIdx + 1] = outRGB.g;
          cPixels[pIdx + 2] = outRGB.b;
          cPixels[pIdx + 3] = alphaMask[idx];
        }
      }

      cCtx.putImageData(cImgData, 0, 0);
      colorDataUrl = colorCanvas.toDataURL('image/png');

      // Draw color infill with misregistration shift onto subject
      // (Composited with halftone screen into subjectArtCanvas below for smooth contour clipping)
    }

    // Layer 6: Halftone Screen (Ben-Day dots, Line Engraving, Xerox Grain)
    const halftoneCanvas = document.createElement('canvas');
    halftoneCanvas.width = imgW;
    halftoneCanvas.height = imgH;
    const hCtx = halftoneCanvas.getContext('2d');

    if (hCtx) {
      const dotSpacing = Math.max(4, settings.dotScale);
      const angleRad = (settings.dotAngle * Math.PI) / 180;
      const cosA = Math.cos(angleRad);
      const sinA = Math.sin(angleRad);
      const diagonal = Math.hypot(imgW, imgH);
      const densityFactor = (settings.inkDensity || 85) / 100;
      const contrastVal = Number(settings.contrast ?? 0);
      const contrastNorm = (contrastVal / 100) * 0.90;
      const contrastFactor = (1 + contrastNorm) / Math.max(0.04, 1 - contrastNorm);
      const brightnessOffset = Number(settings.brightness ?? 0) * 2.2;

      const getAdjustedDarkness = (pIdx: number): number => {
        let lum = 0.299 * srcPixels[pIdx] + 0.587 * srcPixels[pIdx + 1] + 0.114 * srcPixels[pIdx + 2];
        lum += brightnessOffset;
        lum = Math.max(0, Math.min(255, lum));
        lum = (lum - 128) * contrastFactor + 128;
        lum = Math.max(0, Math.min(255, lum));
        if (settings.invertInk) lum = 255 - lum;
        return (1 - lum / 255) * densityFactor;
      };

      hCtx.fillStyle = settings.inkColor || '#121212';

      if (settings.halftoneStyle === 'lines') {
        const lineSpacing = Math.max(3, settings.dotScale);
        for (let v = -diagonal; v < diagonal; v += lineSpacing) {
          for (let u = -diagonal; u < diagonal; u += 3) {
            const px = Math.round(imgW / 2 + u * cosA - v * sinA);
            const py = Math.round(imgH / 2 + u * sinA + v * cosA);
            if (px < 0 || px >= imgW || py < 0 || py >= imgH) continue;
            const idx = py * imgW + px;
            if (alphaMask[idx] < 30) continue;

            const pIdx = idx * 4;
            const darkness = getAdjustedDarkness(pIdx);
            if (darkness > 0.08) {
              const lineH = Math.max(0.75, darkness * (lineSpacing * 0.95));
              hCtx.save();
              hCtx.translate(px, py);
              hCtx.rotate(angleRad);
              hCtx.fillRect(-1.5, -lineH / 2, 3, lineH);
              hCtx.restore();
            }
          }
        }
      } else if (settings.halftoneStyle === 'grain') {
        const scale = Math.max(0.5, Math.min(25, Number(settings.dotScale) || 4));
        const isMicro = scale <= 1.2;
        const grainStep = isMicro ? 1 : Math.max(1, Math.round(scale * 0.7));
        for (let py = 0; py < imgH; py += grainStep) {
          for (let px = 0; px < imgW; px += grainStep) {
            const idx = py * imgW + px;
            if (alphaMask[idx] < 30) continue;

            const pIdx = idx * 4;
            const darkness = getAdjustedDarkness(pIdx);
            const noise = pseudoNoise(px * 12.9898 + py * 78.233);
            const threshold = 1 - Math.pow(Math.max(0, darkness), 1.35);

            if (noise > threshold) {
              if (isMicro) {
                hCtx.fillRect(px, py, 1, 1);
              } else {
                const gr = Math.max(0.75, (scale / 2) * 0.95);
                hCtx.beginPath();
                hCtx.arc(px, py, gr, 0, Math.PI * 2);
                hCtx.fill();
              }
            }
          }
        }
      } else if (settings.halftoneStyle === 'xerox-solid') {
        const scale = Math.max(0.5, Math.min(25, Number(settings.dotScale) || 4));
        const step = scale <= 1.5 ? 1 : Math.max(1, Math.round(scale * 0.8));
        for (let py = 0; py < imgH; py += step) {
          for (let px = 0; px < imgW; px += step) {
            const idx = py * imgW + px;
            if (alphaMask[idx] < 30) continue;

            const pIdx = idx * 4;
            const darkness = getAdjustedDarkness(pIdx);
            const n1 = pseudoNoise(px * 23.17 + py * 89.41);
            const n2 = pseudoNoise(px * 9.31 + py * 41.73);
            const combined = n1 * 0.7 + n2 * 0.3;
            if (combined > (1 - Math.pow(Math.max(0, darkness), 1.2))) {
              const flakeW = Math.max(0.5, scale * (0.8 + n1 * 0.5));
              const flakeH = Math.max(0.5, scale * (0.6 + n2 * 0.6));
              hCtx.fillRect(px - flakeW / 2, py - flakeH / 2, flakeW, flakeH);
            }
          }
        }
      } else if (settings.halftoneStyle === 'crosshatch') {
        for (let v = -diagonal; v < diagonal; v += dotSpacing) {
          for (let u = -diagonal; u < diagonal; u += 3) {
            const px = Math.round(imgW / 2 + u * cosA - v * sinA);
            const py = Math.round(imgH / 2 + u * sinA + v * cosA);
            if (px < 0 || px >= imgW || py < 0 || py >= imgH) continue;
            const idx = py * imgW + px;
            if (alphaMask[idx] < 30) continue;
            const pIdx = idx * 4;
            const darkness = getAdjustedDarkness(pIdx);
            if (darkness > 0.08) {
              const lineH = Math.max(0.75, darkness * (dotSpacing * 0.95));
              hCtx.save();
              hCtx.translate(px, py);
              hCtx.rotate(angleRad);
              hCtx.fillRect(-1.5, -lineH / 2, 3, lineH);
              if (darkness > 0.45) {
                hCtx.rotate(Math.PI / 2);
                hCtx.fillRect(-1.5, -lineH * 0.4, 3, lineH * 0.8);
              }
              hCtx.restore();
            }
          }
        }
      } else if (settings.halftoneStyle === 'diamond') {
        const maxDotR = dotSpacing * 0.72;
        for (let v = -diagonal; v < diagonal; v += dotSpacing) {
          for (let u = -diagonal; u < diagonal; u += dotSpacing) {
            const px = Math.round(imgW / 2 + u * cosA - v * sinA);
            const py = Math.round(imgH / 2 + u * sinA + v * cosA);
            if (px < 0 || px >= imgW || py < 0 || py >= imgH) continue;
            const idx = py * imgW + px;
            if (alphaMask[idx] < 30) continue;
            const pIdx = idx * 4;
            const darkness = getAdjustedDarkness(pIdx);
            if (darkness > 0.08) {
              const r = Math.pow(darkness, 0.85) * maxDotR;
              const d = r * 1.4;
              hCtx.save();
              hCtx.translate(px, py);
              hCtx.rotate(angleRad + Math.PI / 4);
              hCtx.fillRect(-d / 2, -d / 2, d, d);
              hCtx.restore();
            }
          }
        }
      } else {
        // Classic Ben-Day Dots
        const maxDotR = dotSpacing * 0.72;

        for (let v = -diagonal; v < diagonal; v += dotSpacing) {
          for (let u = -diagonal; u < diagonal; u += dotSpacing) {
            const px = Math.round(imgW / 2 + u * cosA - v * sinA);
            const py = Math.round(imgH / 2 + u * sinA + v * cosA);

            if (px < 0 || px >= imgW || py < 0 || py >= imgH) continue;

            const idx = py * imgW + px;
            if (alphaMask[idx] < 30) continue;

            const pIdx = idx * 4;
            const darkness = getAdjustedDarkness(pIdx);
            if (darkness > 0.05) {
              const radius = Math.pow(darkness, 1.15) * maxDotR;
              hCtx.beginPath();
              hCtx.arc(px, py, radius, 0, Math.PI * 2);
              hCtx.fill();
            }
          }
        }
      }
    }

    // Composite Artwork with Smooth Boundary Clipping (Eliminates jagged protruding dot teeth)
    const subjectArtCanvas = document.createElement('canvas');
    subjectArtCanvas.width = imgW;
    subjectArtCanvas.height = imgH;
    const saCtx = subjectArtCanvas.getContext('2d');

    if (saCtx) {
      if (!showCutoutBorders) {
        // Pure crisp ink dots on transparent background (Zero white base, zero shadow wash)
        if (halftoneCanvas) {
          saCtx.drawImage(halftoneCanvas, 0, 0);
        }
      } else {
        // 1. Draw color infill
        saCtx.drawImage(colorCanvas, shiftX, shiftY);

        // 2. Blend inside sunburst if enabled
        if (sunburstInsideCanvas) {
          saCtx.save();
          saCtx.globalCompositeOperation = 'overlay';
          saCtx.drawImage(sunburstInsideCanvas, -margin, -margin);
          saCtx.restore();
        }

        // 3. Multiply halftone screen dots
        if (halftoneCanvas) {
          saCtx.save();
          saCtx.globalCompositeOperation = 'multiply';
          saCtx.drawImage(halftoneCanvas, 0, 0);
          saCtx.restore();
        }
      }

      // 4. Smooth contour clip: Trim any dot arcs that extend past the smooth subject boundary
      saCtx.save();
      saCtx.globalCompositeOperation = 'destination-in';
      const clipImgData = saCtx.createImageData(imgW, imgH);
      for (let i = 0; i < imgW * imgH; i++) {
        clipImgData.data[i * 4 + 3] = alphaMask[i];
      }
      const maskTempCanvas = document.createElement('canvas');
      maskTempCanvas.width = imgW;
      maskTempCanvas.height = imgH;
      maskTempCanvas.getContext('2d')?.putImageData(clipImgData, 0, 0);
      saCtx.drawImage(maskTempCanvas, 0, 0);
      saCtx.restore();

      // 5. Draw cleanly trimmed, silky smooth artwork onto outCtx!
      outCtx.save();
      outCtx.drawImage(subjectArtCanvas, margin, margin);
      outCtx.restore();
    }
  }

  // Layer 7: Authentic Aged Newsprint / Kraft Paper Texture Overlay
  if (showCutoutBorders && settings.paperTextureStyle && settings.paperTextureStyle !== 'none' && settings.paperTextureStyle !== 'clean') {
    outCtx.save();
    const paperCanvas = document.createElement('canvas');
    paperCanvas.width = outW;
    paperCanvas.height = outH;
    const pCtx = paperCanvas.getContext('2d');
    if (pCtx) {
      const pImg = pCtx.createImageData(outW, outH);
      const intensity = (settings.paperTextureIntensity || 35) / 100;

      const isKraft = settings.paperTextureStyle === 'kraft';
      const isComic = settings.paperTextureStyle === 'aged-comic';

      for (let y = 0; y < outH; y++) {
        for (let x = 0; x < outW; x++) {
          const i = (y * outW + x) * 4;
          const grain = (pseudoNoise(x * 17.13 + y * 91.82) - 0.5) * 45 * intensity;

          if (isKraft) {
            // Warm kraft cardboard fibers
            pImg.data[i] = Math.max(0, Math.min(255, 218 + grain * 1.2));
            pImg.data[i + 1] = Math.max(0, Math.min(255, 188 + grain));
            pImg.data[i + 2] = Math.max(0, Math.min(255, 142 + grain * 0.8));
          } else if (isComic) {
            // Aged yellowed comic pulp
            pImg.data[i] = Math.max(0, Math.min(255, 248 + grain));
            pImg.data[i + 1] = Math.max(0, Math.min(255, 242 + grain));
            pImg.data[i + 2] = Math.max(0, Math.min(255, 215 + grain * 0.7));
          } else {
            // Neutral vintage newsprint
            pImg.data[i] = Math.max(0, Math.min(255, 235 + grain));
            pImg.data[i + 1] = Math.max(0, Math.min(255, 232 + grain));
            pImg.data[i + 2] = Math.max(0, Math.min(255, 222 + grain));
          }
          pImg.data[i + 3] = Math.round(55 * intensity);
        }
      }
      pCtx.putImageData(pImg, 0, 0);

      // Strictly clip paper texture inside sticker contour so background stays 100% clean
      pCtx.globalCompositeOperation = 'destination-in';
      if (settings.stickerBorderEnabled && borderWidth > 0 && settings.accentCutoutEnabled && accentWidth > 0) {
        const clipTemp = document.createElement('canvas');
        clipTemp.width = outW;
        clipTemp.height = outH;
        const ctCtx = clipTemp.getContext('2d');
        if (ctCtx) {
          ctCtx.drawImage(borderCanvas, borderShiftX, borderShiftY);
          ctCtx.drawImage(accentCutoutCanvas, accentShiftX, accentShiftY);
          pCtx.drawImage(clipTemp, 0, 0);
        } else {
          pCtx.drawImage(borderCanvas, borderShiftX, borderShiftY);
        }
      } else if (settings.stickerBorderEnabled && borderWidth > 0) {
        pCtx.drawImage(borderCanvas, borderShiftX, borderShiftY);
      } else if (settings.accentCutoutEnabled && accentWidth > 0) {
        pCtx.drawImage(accentCutoutCanvas, accentShiftX, accentShiftY);
      } else {
        pCtx.drawImage(silCanvas, 0, 0);
      }

      outCtx.globalCompositeOperation = 'multiply';
      outCtx.drawImage(paperCanvas, 0, 0);
    }
    outCtx.restore();
  }

  // Layer 9: Subtle Vintage Film Grain texture overlay
  if (showCutoutBorders && settings.grainIntensity > 0) {
    outCtx.save();
    const grainCanvas = document.createElement('canvas');
    grainCanvas.width = outW;
    grainCanvas.height = outH;
    const gCtx = grainCanvas.getContext('2d');
    if (gCtx) {
      const gImg = gCtx.createImageData(outW, outH);
      const intensity = (settings.grainIntensity / 100) * 0.32;
      for (let i = 0; i < gImg.data.length; i += 4) {
        const rand = (Math.random() - 0.5) * 255 * intensity;
        gImg.data[i] = 128 + rand;
        gImg.data[i + 1] = 128 + rand;
        gImg.data[i + 2] = 128 + rand;
        gImg.data[i + 3] = 40;
      }
      gCtx.putImageData(gImg, 0, 0);

      // Strictly clip grain texture inside sticker contour so background stays 100% clean
      gCtx.globalCompositeOperation = 'destination-in';
      if (settings.stickerBorderEnabled && borderWidth > 0 && settings.accentCutoutEnabled && accentWidth > 0) {
        const clipTemp = document.createElement('canvas');
        clipTemp.width = outW;
        clipTemp.height = outH;
        const ctCtx = clipTemp.getContext('2d');
        if (ctCtx) {
          ctCtx.drawImage(borderCanvas, borderShiftX, borderShiftY);
          ctCtx.drawImage(accentCutoutCanvas, accentShiftX, accentShiftY);
          gCtx.drawImage(clipTemp, 0, 0);
        } else {
          gCtx.drawImage(borderCanvas, borderShiftX, borderShiftY);
        }
      } else if (settings.stickerBorderEnabled && borderWidth > 0) {
        gCtx.drawImage(borderCanvas, borderShiftX, borderShiftY);
      } else if (settings.accentCutoutEnabled && accentWidth > 0) {
        gCtx.drawImage(accentCutoutCanvas, accentShiftX, accentShiftY);
      } else {
        gCtx.drawImage(silCanvas, 0, 0);
      }

      outCtx.globalCompositeOperation = 'overlay';
      outCtx.drawImage(grainCanvas, 0, 0);
    }
    outCtx.restore();
  }

  const processingTimeMs = Math.round(performance.now() - startTime);
  let dataUrl = outCanvas.toDataURL('image/png');

  // Extract pixel masks for 100% faithful vector contour reconstruction
  const silData = silCtx.getImageData(0, 0, outW, outH).data;
  const borderData =
    settings.stickerBorderEnabled && borderWidth > 0
      ? bCtx.getImageData(0, 0, outW, outH).data
      : null;
  const accentData =
    settings.accentCutoutEnabled && accentWidth > 0 && acCtx
      ? acCtx.getImageData(0, 0, outW, outH).data
      : null;

  // Lock Artboard Size (Permanently 4000x4000 locked for print-ready production & Illustrator)
  const artboardW = 4000;
  const artboardH = 4000;

  // Calculate subject positioning & proportional fit on the 4000x4000 artboard
  const vpAspect = outW / Math.max(1, outH);
  // Target fit size: 3450px on a 4000px artboard (~86.25% coverage leaving clean margins)
  const targetFit = Math.max(
    200,
    Math.round((Math.min(artboardW, artboardH) / 4000) * 3450)
  );
  const userScale = (settings.scale ?? 100) / 100;
  let drawW = targetFit * userScale;
  let drawH = targetFit * userScale;
  if (outW >= outH) {
    drawH = drawW / vpAspect;
  } else {
    drawW = drawH * vpAspect;
  }

  const offX = settings.offsetX ?? 0;
  const offY = settings.offsetY ?? 0;
  const posX = (artboardW - drawW) * 0.5 + offX;
  const posY = (artboardH - drawH) * 0.5 + offY;
  const scaleFactor = drawW / outW;

  // Composite 4000x4000 Locked Artboard Canvas for live preview & raster download
  const artboardCanvas = document.createElement('canvas');
  artboardCanvas.width = artboardW;
  artboardCanvas.height = artboardH;
  const artCtx = artboardCanvas.getContext('2d');
  if (artCtx) {
    // 1. Artboard background
    if (!settings.isBackgroundTransparent) {
      artCtx.fillStyle = settings.backgroundColor || '#1C1D24';
      artCtx.fillRect(0, 0, artboardW, artboardH);
    }

    // 2. Comic background dots across the full 4000x4000 artboard
    if (settings.comicBgScreenEnabled && !settings.isBackgroundTransparent) {
      const bgSpacing = Math.max(8, settings.comicBgDotSize * 2.2);
      const bgRadius = Math.max(1.5, settings.comicBgDotSize * 0.65);
      artCtx.save();
      artCtx.fillStyle = settings.comicBgColor || '#2B2D3A';
      for (let by = 0; by < artboardH; by += bgSpacing) {
        for (let bx = 0; bx < artboardW; bx += bgSpacing) {
          const cx = bx + (by % (bgSpacing * 2) ? bgSpacing * 0.5 : 0);
          artCtx.beginPath();
          artCtx.arc(cx, by, bgRadius, 0, Math.PI * 2);
          artCtx.fill();
        }
      }
      artCtx.restore();
    }

    // 3. Sunburst behind cutout across full 4000x4000 artboard
    if (settings.sunburstEnabled && settings.sunburstPosition !== 'inside-object') {
      artCtx.save();
      const cX = (settings.sunburstCenterX / 100) * artboardW;
      const cY = (settings.sunburstCenterY / 100) * artboardH;
      const maxDim = Math.hypot(artboardW, artboardH);
      const angleStep = (Math.PI * 2) / settings.sunburstRays;
      artCtx.fillStyle = settings.sunburstColor2;
      artCtx.fillRect(0, 0, artboardW, artboardH);
      artCtx.fillStyle = settings.sunburstColor1;
      for (let i = 0; i < settings.sunburstRays; i += 2) {
        const a1 = i * angleStep;
        const a2 = (i + 1) * angleStep;
        artCtx.beginPath();
        artCtx.moveTo(cX, cY);
        artCtx.arc(cX, cY, maxDim, a1, a2);
        artCtx.closePath();
        artCtx.fill();
      }
      artCtx.restore();
    }

    // 4. Draw cleanly trimmed sticker & subject artwork onto the 4000x4000 artboard
    artCtx.drawImage(outCanvas, posX, posY, drawW, drawH);
  }

  dataUrl = artboardCanvas.toDataURL('image/png');

  const silPath = traceBinaryMaskContour(silData, outW, outH);
  const accentPath = accentData
    ? traceBinaryMaskContour(accentData, outW, outH)
    : '';

  const svgString = buildPureVectorVintagePopSVG(
    srcPixels,
    alphaMask,
    settings,
    imgW,
    imgH,
    outW,
    outH,
    margin,
    silData,
    borderData,
    accentData,
    accentPath,
    artboardW,
    artboardH,
    posX,
    posY,
    scaleFactor
  );

  return {
    canvas: artboardCanvas,
    dataUrl,
    svgString,
    width: artboardW,
    height: artboardH,
    processingTimeMs,
  };
}

interface ContourPoint {
  x: number;
  y: number;
}

/**
 * Ramer-Douglas-Peucker polygon decimation
 */
function rdpSimplify(points: ContourPoint[], epsilon: number): ContourPoint[] {
  if (points.length <= 2) return points;

  let dmax = 0;
  let index = 0;
  const p1 = points[0];
  const p2 = points[points.length - 1];

  for (let i = 1; i < points.length - 1; i++) {
    const p = points[i];
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    let d = 0;
    if (dx === 0 && dy === 0) {
      d = Math.hypot(p.x - p1.x, p.y - p1.y);
    } else {
      d = Math.abs(dy * p.x - dx * p.y + p2.x * p1.y - p2.y * p1.x) / Math.hypot(dx, dy);
    }
    if (d > dmax) {
      index = i;
      dmax = d;
    }
  }

  if (dmax > epsilon) {
    const rec1 = rdpSimplify(points.slice(0, index + 1), epsilon);
    const rec2 = rdpSimplify(points.slice(index), epsilon);
    return rec1.slice(0, -1).concat(rec2);
  }
  return [p1, p2];
}

/**
 * Resamples a closed polygon ring into equidistant arc-length vertices.
 * Eliminates irregular point density, micro-indentations, and uneven local clustering.
 */
function resampleClosedPolygon(points: ContourPoint[], targetSpacing = 10): ContourPoint[] {
  if (points.length < 3) return points;
  let totalLength = 0;
  const n = points.length;
  const segLens = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    const p1 = points[i];
    const p2 = points[(i + 1) % n];
    const len = Math.hypot(p2.x - p1.x, p2.y - p1.y);
    segLens[i] = len;
    totalLength += len;
  }
  if (totalLength < targetSpacing * 2) return points;

  const numPoints = Math.max(8, Math.round(totalLength / targetSpacing));
  const step = totalLength / numPoints;
  const resampled: ContourPoint[] = [];

  let segIdx = 0;
  let segStartDist = 0;

  for (let i = 0; i < numPoints; i++) {
    const targetDist = i * step;
    while (segIdx < n - 1 && segStartDist + segLens[segIdx] <= targetDist) {
      segStartDist += segLens[segIdx];
      segIdx++;
    }
    const p1 = points[segIdx % n];
    const p2 = points[(segIdx + 1) % n];
    const curSegLen = segLens[segIdx % n] || 0.0001;
    const t = Math.max(0, Math.min(1, (targetDist - segStartDist) / curSegLen));
    resampled.push({
      x: p1.x + (p2.x - p1.x) * t,
      y: p1.y + (p2.y - p1.y) * t,
    });
  }
  return resampled;
}

/**
 * Wide 17-tap Gaussian moving-average filter for closed vector contour polygon rings.
 * Averages across ±8 neighboring vertices to completely eliminate micro-waviness, bumps,
 * staircases, and irregular undulations to output sleek, flowing curves.
 */
function smoothClosedPolygon(points: ContourPoint[], iterations = 2): ContourPoint[] {
  if (points.length < 5) return points;
  let current = points;

  // Compact 5-tap Gaussian weights: span [-2 ... +2], sum = 16
  // Removes 1px-2px pixel staircases smoothly while faithfully preserving sharp eyelash tips, crevices, and true contours
  const weights = [1, 4, 6, 4, 1];
  const halfSpan = 2;
  const weightSum = 16;

  for (let it = 0; it < iterations; it++) {
    const n = current.length;
    const next: ContourPoint[] = new Array(n);
    for (let i = 0; i < n; i++) {
      let sumX = 0;
      let sumY = 0;
      for (let k = -halfSpan; k <= halfSpan; k++) {
        const p = current[(i + k + n * 10) % n];
        const w = weights[k + halfSpan];
        sumX += p.x * w;
        sumY += p.y * w;
      }
      next[i] = {
        x: sumX / weightSum,
        y: sumY / weightSum,
      };
    }
    current = next;
  }
  return current;
}

/**
 * Traces a 2D binary raster mask into smooth, closed SVG paths with fill-rule="evenodd".
 * Guarantees zero infinite loops, zero stray lines, zero waviness, and accurate die-cut contours.
 */
function traceBinaryMaskContour(
  pixels: Uint8ClampedArray,
  width: number,
  height: number,
  scale = 1,
  smoothIterations = 2,
  simplifyEpsilon = 0.6,
  resampleSpacing = 4,
  singleOuterOnly = false
): string {
  const gw = Math.floor(width / scale);
  const gh = Math.floor(height / scale);
  const grid = new Uint8Array(gw * gh);
  let solidCount = 0;

  for (let gy = 1; gy < gh - 1; gy++) {
    const rowOffset = gy * gw;
    const py = gy * scale;
    const pRow = py * width;
    for (let gx = 1; gx < gw - 1; gx++) {
      const px = gx * scale;
      if (pixels[(pRow + px) * 4 + 3] > 25) {
        grid[rowOffset + gx] = 1;
        solidCount++;
      }
    }
  }

  if (solidCount < 8) return '';

  // 8-neighbor directions: E, SE, S, SW, W, NW, N, NE
  const DX = [1, 1, 0, -1, -1, -1, 0, 1];
  const DY = [0, 1, 1, 1, 0, -1, -1, -1];

  const visited = new Uint8Array(gw * gh);
  const candidates: { d: string; area: number }[] = [];

  for (let gy = 1; gy < gh - 1; gy++) {
    for (let gx = 1; gx < gw - 1; gx++) {
      const idx = gy * gw + gx;
      // Start tracing on entering edge: current pixel solid, left neighbor empty
      if (grid[idx] === 1 && grid[idx - 1] === 0 && !visited[idx]) {
        const startX = gx;
        const startY = gy;
        let cx = gx;
        let cy = gy;
        let dir = 0;

        const rawPoints: ContourPoint[] = [];
        let steps = 0;
        const maxSteps = gw * gh * 2;

        while (steps++ < maxSteps) {
          rawPoints.push({ x: cx * scale, y: cy * scale });
          visited[cy * gw + cx] = 1;

          let nextX = -1;
          let nextY = -1;
          let nextDir = -1;

          // Clockwise neighborhood search starting from backtrack orientation
          const searchStart = (dir + 6) % 8;
          for (let i = 0; i < 8; i++) {
            const checkDir = (searchStart + i) % 8;
            const nx = cx + DX[checkDir];
            const ny = cy + DY[checkDir];

            if (nx >= 0 && nx < gw && ny >= 0 && ny < gh && grid[ny * gw + nx] === 1) {
              nextX = nx;
              nextY = ny;
              nextDir = checkDir;
              break;
            }
          }

          if (nextX === -1 || nextY === -1) break;

          cx = nextX;
          cy = nextY;
          dir = nextDir;

          if (cx === startX && cy === startY && rawPoints.length >= 3) break;
        }

        if (rawPoints.length >= 4) {
          let area = 0;
          for (let i = 0; i < rawPoints.length; i++) {
            const p1 = rawPoints[i];
            const p2 = rawPoints[(i + 1) % rawPoints.length];
            area += p1.x * p2.y - p2.x * p1.y;
          }

          if (Math.abs(area) * 0.5 > 45) {
            // Step 1: Arc-length uniform resampling (eliminates density clustering, ripples, and staircase steps)
            const preparedPoints = resampleSpacing > 0
              ? resampleClosedPolygon(rawPoints, resampleSpacing)
              : rawPoints;

            // Step 2: Wide 17-tap Gaussian smoothing to melt away all sawteeth, ripples, and wobbles
            const smoothed = smoothClosedPolygon(preparedPoints, smoothIterations);

            // Step 3: Decimate collinear/redundant points cleanly
            const closed = [...smoothed, smoothed[0]];
            const simplified = rdpSimplify(closed, simplifyEpsilon);

            if (simplified.length >= 4) {
              const pts = simplified.slice(0, -1);
              const n = pts.length;
              let d = `M${pts[0].x.toFixed(1)},${pts[0].y.toFixed(1)}`;

              for (let i = 0; i < n; i++) {
                const p0 = pts[(i - 1 + n) % n];
                const p1 = pts[i];
                const p2 = pts[(i + 1) % n];
                const p3 = pts[(i + 2) % n];

                // Tension-controlled smooth C1 chord-angle bisector spline (Zero overshoot, zero s-curves)
                const d01 = Math.hypot(p1.x - p0.x, p1.y - p0.y);
                const d12 = Math.hypot(p2.x - p1.x, p2.y - p1.y);
                const d23 = Math.hypot(p3.x - p2.x, p3.y - p2.y);

                const dir01x = d01 > 0.001 ? (p1.x - p0.x) / d01 : 0;
                const dir01y = d01 > 0.001 ? (p1.y - p0.y) / d01 : 0;
                const dir12x = d12 > 0.001 ? (p2.x - p1.x) / d12 : 0;
                const dir12y = d12 > 0.001 ? (p2.y - p1.y) / d12 : 0;
                const dir23x = d23 > 0.001 ? (p3.x - p2.x) / d23 : 0;
                const dir23y = d23 > 0.001 ? (p3.y - p2.y) / d23 : 0;

                const t1x = dir01x + dir12x;
                const t1y = dir01y + dir12y;
                const t1Len = Math.hypot(t1x, t1y);
                const normT1x = t1Len > 0.001 ? t1x / t1Len : dir12x;
                const normT1y = t1Len > 0.001 ? t1y / t1Len : dir12y;

                const t2x = dir12x + dir23x;
                const t2y = dir12y + dir23y;
                const t2Len = Math.hypot(t2x, t2y);
                const normT2x = t2Len > 0.001 ? t2x / t2Len : dir12x;
                const normT2y = t2Len > 0.001 ? t2y / t2Len : dir12y;

                const handleLen = d12 * 0.28;
                const cp1x = (p1.x + normT1x * handleLen).toFixed(1);
                const cp1y = (p1.y + normT1y * handleLen).toFixed(1);
                const cp2x = (p2.x - normT2x * handleLen).toFixed(1);
                const cp2y = (p2.y - normT2y * handleLen).toFixed(1);
                const endX = p2.x.toFixed(1);
                const endY = p2.y.toFixed(1);

                d += ` C${cp1x},${cp1y} ${cp2x},${cp2y} ${endX},${endY}`;
              }
              d += ' Z';
              candidates.push({ d, area: Math.abs(area) * 0.5 });
            }
          }
        }
      }
    }
  }

  if (candidates.length === 0) return '';
  if (singleOuterOnly) {
    candidates.sort((a, b) => b.area - a.area);
    return candidates[0].d;
  }
  return candidates.map((c) => c.d).join(' ');
}

/**
 * Builds a 100% PURE VECTOR SVG for Adobe Illustrator, CorelDRAW, and Inkscape
 * Features authentic CMYK rosette screen plates with native multiply blending,
 * smooth vector sticker die-cut borders, and solid subject foundation.
 */
function buildPureVectorVintagePopSVG(
  srcPixels: Uint8ClampedArray,
  alphaMask: Uint8Array,
  settings: VintagePopSettings,
  imgW: number,
  imgH: number,
  outW: number,
  outH: number,
  margin: number,
  silPixels: Uint8ClampedArray,
  borderPixels: Uint8ClampedArray | null,
  accentPixels: Uint8ClampedArray | null = null,
  accentPath: string = '',
  artboardW: number = 4000,
  artboardH: number = 4000,
  posX: number = 0,
  posY: number = 0,
  scaleFactor: number = 1
): string {
  const showCutoutBorders = Boolean(
    (settings.stickerBorderEnabled && settings.stickerBorderWidth > 0) ||
    (settings.accentCutoutEnabled && (settings.accentCutoutWidth || 0) > 0)
  );
  const borderWidth = (showCutoutBorders && settings.stickerBorderEnabled)
    ? Math.round(settings.stickerBorderWidth)
    : 0;
  const borderShiftX = settings.stickerBorderShiftX || 0;
  const borderShiftY = settings.stickerBorderShiftY || 0;
  const accentWidth = (showCutoutBorders && settings.accentCutoutEnabled)
    ? Math.max(1, Math.round(settings.accentCutoutWidth || 6))
    : 0;
  const accentShiftX = settings.accentCutoutShiftX || 0;
  const accentShiftY = settings.accentCutoutShiftY || 0;
  const shiftX = settings.colorShiftEnabled ? settings.colorShiftX : 0;
  const shiftY = settings.colorShiftEnabled ? settings.colorShiftY : 0;

  // 1. Canvas Background Layer & Paper Texture Tone (Full 4000x4000 Locked Artboard)
  let bgSVG = '';
  if (!settings.isBackgroundTransparent) {
    const bgColor = settings.backgroundColor || '#1C1D24';
    bgSVG = `<g id="Layer_Background_Canvas"><rect width="${artboardW}" height="${artboardH}" fill="${bgColor}" /></g>`;
  }

  // 2. Comic Ben-Day Background Dots Layer (Full 4000x4000 Locked Artboard)
  let comicBgSVG = '';
  if (settings.comicBgScreenEnabled && !settings.isBackgroundTransparent) {
    const bgSpacing = Math.max(8, settings.comicBgDotSize * 2.2);
    const bgRadius = Math.max(1.5, settings.comicBgDotSize * 0.65).toFixed(1);
    let dots = '';
    for (let by = 0; by < artboardH; by += bgSpacing) {
      for (let bx = 0; bx < artboardW; bx += bgSpacing) {
        const cx = (bx + (by % (bgSpacing * 2) ? bgSpacing * 0.5 : 0)).toFixed(1);
        dots += `<circle cx="${cx}" cy="${by.toFixed(1)}" r="${bgRadius}" />`;
      }
    }
    comicBgSVG = `\n    <g id="Layer_Comic_Bg_Dots" fill="${settings.comicBgColor || '#2B2D3A'}">${dots}</g>`;
  }

  // 3. Trace Silhouette & Single Solid White Subject Base (With accurate sticker border if enabled)
  const silPath =
    traceBinaryMaskContour(silPixels, outW, outH) ||
    traceBinaryMaskContour(silPixels, outW, outH, 2);

  const basePixels =
    settings.stickerBorderEnabled && borderWidth > 0 && borderPixels
      ? borderPixels
      : silPixels;

  const finalBase =
    (basePixels &&
      (traceBinaryMaskContour(basePixels, outW, outH) ||
        traceBinaryMaskContour(basePixels, outW, outH, 2))) ||
    silPath;

  const sunburstClipPath = silPath || finalBase;

  // 4. Retro Comic Sunburst Rays Layer (Behind Cutout covers full artboard; inside object covers subject)
  let sunburstBehindSVG = '';
  let sunburstInsideSVG = '';
  if (settings.sunburstEnabled) {
    const cX = (settings.sunburstCenterX / 100) * artboardW;
    const cY = (settings.sunburstCenterY / 100) * artboardH;
    const maxDim = Math.hypot(artboardW, artboardH);
    const angleStep = (Math.PI * 2) / settings.sunburstRays;
    let rays = '';
    for (let i = 0; i < settings.sunburstRays; i += 2) {
      const a1 = i * angleStep;
      const a2 = (i + 1) * angleStep;
      const x1 = (cX + Math.cos(a1) * maxDim).toFixed(1);
      const y1 = (cY + Math.sin(a1) * maxDim).toFixed(1);
      const x2 = (cX + Math.cos(a2) * maxDim).toFixed(1);
      const y2 = (cY + Math.sin(a2) * maxDim).toFixed(1);
      rays += `<path d="M${cX.toFixed(1)},${cY.toFixed(1)} L${x1},${y1} A${maxDim.toFixed(1)},${maxDim.toFixed(1)} 0 0,1 ${x2},${y2} Z" fill="${settings.sunburstColor1}" />`;
    }

    if (settings.sunburstPosition === 'inside-object' && sunburstClipPath) {
      const sCX = (settings.sunburstCenterX / 100) * outW;
      const sCY = (settings.sunburstCenterY / 100) * outH;
      const sMaxDim = Math.hypot(outW, outH);
      let sRays = '';
      for (let i = 0; i < settings.sunburstRays; i += 2) {
        const a1 = i * angleStep;
        const a2 = (i + 1) * angleStep;
        const x1 = (sCX + Math.cos(a1) * sMaxDim).toFixed(1);
        const y1 = (sCY + Math.sin(a1) * sMaxDim).toFixed(1);
        const x2 = (sCX + Math.cos(a2) * sMaxDim).toFixed(1);
        const y2 = (sCY + Math.sin(a2) * sMaxDim).toFixed(1);
        sRays += `<path d="M${sCX.toFixed(1)},${sCY.toFixed(1)} L${x1},${y1} A${sMaxDim.toFixed(1)},${sMaxDim.toFixed(1)} 0 0,1 ${x2},${y2} Z" fill="${settings.sunburstColor1}" />`;
      }
      sunburstInsideSVG = `\n    <!-- Sunburst Rays Clipped Inside Subject -->\n    <g id="Layer_Sunburst_Inside" clip-path="url(#sunburst-clip)" style="mix-blend-mode: overlay;"><rect width="${outW}" height="${outH}" fill="${settings.sunburstColor2}" />${sRays}</g>`;
    } else {
      sunburstBehindSVG = `\n    <!-- Sunburst Rays Behind Cutout -->\n    <g id="Layer_Sunburst_Behind"><rect width="${artboardW}" height="${artboardH}" fill="${settings.sunburstColor2}" />${rays}</g>`;
    }
  }

  // 5. Three Distinct Cut-Out Vector Layers
  // Layer 3 (Bottom): Outer Paper Cutout Sticker Die-Cut Border with Drop Shadow
  // Layer 2 (Middle): Offset Color Cut-Out Accent (Resizable Offset Path)
  // Layer 1 (Top-most foundation): Solid Paper Cutout Silhouette Foundation (Same cutout color, moves together with sticker)
  const cutoutColorHex = settings.stickerBorderColor || '#FFFFFF';
  const accentColor = settings.accentCutoutColor || '#E52521';

  const borderTransformAttr =
    borderShiftX !== 0 || borderShiftY !== 0
      ? ` transform="translate(${borderShiftX}, ${borderShiftY})"`
      : '';

  let outerWhiteBorderSVG = '';
  if (settings.stickerBorderEnabled && borderWidth > 0) {
    const borderShape = finalBase || silPath;
    if (borderShape) {
      const vectorDropShadowSVG = settings.stickerShadow
        ? `\n      <!-- Pure Vector Die-Cut Shadow (100% Vector Geometry, Zero Raster Effect) -->\n      <g id="Layer_Vector_Drop_Shadow"${borderTransformAttr}>\n        <path d="${borderShape}" fill="#000000" fill-opacity="0.18" transform="translate(3, 7)" fill-rule="evenodd" />\n      </g>`
        : '';
      outerWhiteBorderSVG = `${vectorDropShadowSVG}\n    <!-- 3. Outer Paper Cutout Die-Cut Border -->\n    <g id="Layer_3_Outer_Paper_Cutout_Border"${borderTransformAttr}>\n      <path d="${borderShape}" fill="${cutoutColorHex}" stroke="none" fill-rule="evenodd" />\n    </g>`;
    }
  }

  let middleAccentCutoutSVG = '';
  if (settings.accentCutoutEnabled && accentWidth > 0) {
    const accentShape =
      accentPath ||
      (accentPixels &&
        (traceBinaryMaskContour(accentPixels, outW, outH) ||
          traceBinaryMaskContour(accentPixels, outW, outH, 2))) ||
      silPath;
    if (accentShape) {
      const transformAttr =
        accentShiftX !== 0 || accentShiftY !== 0
          ? ` transform="translate(${accentShiftX}, ${accentShiftY})"`
          : '';
      const vectorAccentDropShadowSVG =
        (!settings.stickerBorderEnabled || borderWidth <= 0) && settings.stickerShadow
          ? `\n      <!-- Pure Vector Die-Cut Shadow for Accent Cutout -->\n      <g id="Layer_Vector_Accent_Drop_Shadow"${transformAttr}>\n        <path d="${accentShape}" fill="#000000" fill-opacity="0.18" transform="translate(3, 7)" fill-rule="evenodd" />\n      </g>`
          : '';
      middleAccentCutoutSVG = `${vectorAccentDropShadowSVG}\n    <!-- 2. Middle Offset Color Cut-Out Accent (Resizable Offset Path with X, Y Shift) -->\n    <g id="Layer_2_Middle_Accent_Cutout"${transformAttr}>\n      <path d="${accentShape}" fill="${accentColor}" stroke="none" fill-rule="evenodd" />\n    </g>`;
    }
  }

  let innerWhiteSilhouetteSVG = '';
  if (showCutoutBorders) {
    if (silPath) {
      innerWhiteSilhouetteSVG = `\n    <!-- 1. Inner Paper Cutout Silhouette Base -->\n    <g id="Layer_1_Inner_Paper_Cutout_Silhouette"${borderTransformAttr}>\n      <path d="${silPath}" fill="${cutoutColorHex}" stroke="none" fill-rule="evenodd" />\n    </g>`;
    } else {
      innerWhiteSilhouetteSVG = `\n    <!-- 1. Inner Paper Cutout Base Fallback -->\n    <g id="Layer_1_Inner_Paper_Cutout_Silhouette"${borderTransformAttr}>\n      <rect x="${margin}" y="${margin}" width="${imgW}" height="${imgH}" fill="${cutoutColorHex}" stroke="none" />\n    </g>`;
    }
  }

  const stickerBorderSVG = `${outerWhiteBorderSVG}${middleAccentCutoutSVG}${innerWhiteSilhouetteSVG}`;

  // 6. Color Formulation & Halftone Shading Helpers
  const ink = parseHexColor(settings.inkColor, 20, 20, 22);
  const acc1 = parseHexColor(settings.accentColor1, 229, 37, 33);
  const acc2 = parseHexColor(settings.accentColor2, 0, 174, 239);
  const acc3 = parseHexColor(settings.accentColor3, 255, 209, 0);
  const white = { r: 255, g: 255, b: 255 };

  const contrastVal = Number(settings.contrast ?? 0);
  const contrastNorm = (contrastVal / 100) * 0.90;
  const contrastFactor = (1 + contrastNorm) / Math.max(0.04, 1 - contrastNorm);
  const brightnessOffset = Number(settings.brightness ?? 0) * 2.2;
  const getSvgAdjustedDarkness = (pIdx: number): number => {
    let lum = 0.299 * srcPixels[pIdx] + 0.587 * srcPixels[pIdx + 1] + 0.114 * srcPixels[pIdx + 2];
    lum += brightnessOffset;
    lum = Math.max(0, Math.min(255, lum));
    lum = (lum - 128) * contrastFactor + 128;
    lum = Math.max(0, Math.min(255, lum));
    if (settings.invertInk) lum = 255 - lum;
    return (1 - lum / 255) * densityFactor;
  };
  const softness = (settings.colorSoftness || 75) / 100;
  const densityFactor = (settings.inkDensity || 85) / 100;
  const densityMultiplier = (settings.inkDensity || 85) / 85;

  const dotSpacing = Math.max(4, settings.dotScale);
  const angleRad = (settings.dotAngle * Math.PI) / 180;
  const cosA = Math.cos(angleRad);
  const sinA = Math.sin(angleRad);
  const diagonal = Math.hypot(imgW, imgH);
  const maxDotR = dotSpacing * 0.72;

  // Helper to compute exact direct optical print color for any pixel (r, g, b, lum)
  const computePixelColor = (r: number, g: number, b: number, lum: number): { r: number; g: number; b: number } => {
    const t = lum / 255;
    if (settings.coloringMode === 'cmyk-risograph') {
      let rP = (r + brightnessOffset - 128) * contrastFactor + 128;
      let gP = (g + brightnessOffset - 128) * contrastFactor + 128;
      let bP = (b + brightnessOffset - 128) * contrastFactor + 128;
      if (settings.invertInk) {
        rP = 255 - rP;
        gP = 255 - gP;
        bP = 255 - bP;
      }
      const rNorm = Math.max(0, Math.min(1, rP / 255));
      const gNorm = Math.max(0, Math.min(1, gP / 255));
      const bNorm = Math.max(0, Math.min(1, bP / 255));
      const k = Math.min(1, (1 - Math.max(rNorm, gNorm, bNorm)) * densityMultiplier);
      const c = k < 1 ? Math.min(1, ((1 - rNorm - k) / (1 - k)) * densityMultiplier) : 0;
      const m = k < 1 ? Math.min(1, ((1 - gNorm - k) / (1 - k)) * densityMultiplier) : 0;
      const y = k < 1 ? Math.min(1, ((1 - bNorm - k) / (1 - k)) * densityMultiplier) : 0;

      return {
        r: Math.max(0, Math.min(255, Math.round(255 * (1 - c) * (1 - k)))),
        g: Math.max(0, Math.min(255, Math.round(255 * (1 - m) * (1 - k)))),
        b: Math.max(0, Math.min(255, Math.round(255 * (1 - y) * (1 - k)))),
      };
    } else if (settings.coloringMode === 'photo-pop') {
      let rP = (r + brightnessOffset - 128) * contrastFactor + 128;
      let gP = (g + brightnessOffset - 128) * contrastFactor + 128;
      let bP = (b + brightnessOffset - 128) * contrastFactor + 128;
      const avg = (rP + gP + bP) / 3;
      rP = avg + (rP - avg) * 1.45;
      gP = avg + (gP - avg) * 1.45;
      bP = avg + (bP - avg) * 1.45;
      return {
        r: Math.max(0, Math.min(255, Math.round(rP))),
        g: Math.max(0, Math.min(255, Math.round(gP))),
        b: Math.max(0, Math.min(255, Math.round(bP))),
      };
    } else if (settings.coloringMode === 'smooth-gradient') {
      let tS = t;
      if (softness < 0.65) {
        const stepCount = Math.max(3, Math.round(softness * 12));
        tS = Math.round(t * stepCount) / stepCount;
      }
      if (tS < 0.28) return lerpRGB(ink, acc1, tS / 0.28);
      if (tS < 0.58) return lerpRGB(acc1, acc2, (tS - 0.28) / 0.3);
      if (tS < 0.86) return lerpRGB(acc2, acc3, (tS - 0.58) / 0.28);
      return lerpRGB(acc3, white, (tS - 0.86) / 0.14);
    } else if (settings.coloringMode === 'monochrome-noir') {
      if (softness < 0.4) {
        return t < 0.48 ? ink : white;
      }
      return lerpRGB(ink, white, t);
    } else if (settings.coloringMode === 'duotone-pop') {
      if (softness < 0.45) {
        return t < 0.5 ? ink : acc1;
      }
      return t < 0.5 ? lerpRGB(ink, acc1, t / 0.5) : lerpRGB(acc1, acc3, (t - 0.5) / 0.5);
    } else if (settings.coloringMode === 'selective-accent') {
      const maxC = Math.max(r, g, b);
      const minC = Math.min(r, g, b);
      const sat = maxC > 0 ? (maxC - minC) / maxC : 0;
      const thresholdSat = 0.45 - softness * 0.25;
      if (sat > thresholdSat) {
        if (r > g && r > b) return acc1;
        if (b > r && b > g) return acc2;
        return acc3;
      }
      return lerpRGB(ink, white, t);
    } else {
      // tri-color (Warhol pop art)
      if (softness > 0.4) {
        if (t < 0.35) return lerpRGB(ink, acc1, t / 0.35);
        if (t < 0.75) return lerpRGB(acc1, acc2, (t - 0.35) / 0.4);
        return lerpRGB(acc2, white, (t - 0.75) / 0.25);
      }
      if (t < 0.25) return ink;
      if (t < 0.6) return acc1;
      if (t < 0.88) return acc2;
      return white;
    }
  };

  // 5.5 100% PURE VECTOR COLOR DOT MATRIX (Zero Raster / Microstock Compliant)
  // Generates seamless vector circles sampling subject pigments and grayscale tones for WYSIWYG Illustrator compatibility
  let vectorColorMatrixSVG = '';
  if (showCutoutBorders && settings.coloringMode !== 'cmyk-risograph' && settings.coloringMode !== 'monochrome-noir') {
    const colorStep = Math.max(3, settings.dotScale);
    const colorRadius = (colorStep * 0.72).toFixed(1);
    let colorCircles = '';

    for (let py = 0; py < imgH; py += colorStep) {
      const isOddRow = Math.floor(py / colorStep) % 2 === 1;
      const xOffset = isOddRow ? colorStep * 0.5 : 0;
      for (let px = xOffset; px < imgW; px += colorStep) {
        const sampleX = Math.round(px);
        const sampleY = Math.round(py);
        if (sampleX < 0 || sampleX >= imgW || sampleY < 0 || sampleY >= imgH) continue;
        const idx = sampleY * imgW + sampleX;
        if (alphaMask[idx] < 25) continue;

        const pIdx = idx * 4;
        const r = srcPixels[pIdx];
        const g = srcPixels[pIdx + 1];
        const b = srcPixels[pIdx + 2];
        let lum = 0.299 * r + 0.587 * g + 0.114 * b;
        lum += brightnessOffset;
        lum = Math.max(0, Math.min(255, lum));
        lum = (lum - 128) * contrastFactor + 128;
        lum = Math.max(0, Math.min(255, lum));

        const outRGB = computePixelColor(r, g, b, lum);
        if (!showCutoutBorders && outRGB.r > 240 && outRGB.g > 240 && outRGB.b > 240) {
          continue;
        }
        const colHex = `#${((1 << 24) + (outRGB.r << 16) + (outRGB.g << 8) + outRGB.b).toString(16).slice(1)}`;
        const cx = (margin + shiftX + sampleX).toFixed(1);
        const cy = (margin + shiftY + sampleY).toFixed(1);

        colorCircles += `<circle cx="${cx}" cy="${cy}" r="${colorRadius}" fill="${colHex}" />`;
      }
    }

    if (colorCircles) {
      vectorColorMatrixSVG = `\n    <!-- 100% Pure Vector Color Dot Matrix (Zero Raster - Full Vector Tones) -->\n    <g id="Layer_Vector_Color_Matrix">${colorCircles}\n    </g>`;
    }
  }

  // 6. Halftone Artwork & Shading Screen (100% Solid Vector Geometry, perfectly synchronized with Canvas preview)
  let artworkSVG = '';
  let halftoneElements = '';
  const inkHex = settings.inkColor || '#141414';

  if (settings.halftoneStyle === 'lines') {
    const lineSpacing = Math.max(3, settings.dotScale);
    for (let v = -diagonal; v < diagonal; v += lineSpacing) {
      for (let u = -diagonal; u < diagonal; u += 3) {
        const px = Math.round(imgW / 2 + u * cosA - v * sinA);
        const py = Math.round(imgH / 2 + u * sinA + v * cosA);
        if (px < 0 || px >= imgW || py < 0 || py >= imgH) continue;
        const idx = py * imgW + px;
        if (alphaMask[idx] < 30) continue;

        const pIdx = idx * 4;
        const darkness = getSvgAdjustedDarkness(pIdx);
        if (darkness > 0.08) {
          const lineH = Math.max(0.75, darkness * (lineSpacing * 0.95)).toFixed(1);
          const cx = (margin + px).toFixed(1);
          const cy = (margin + py).toFixed(1);
          halftoneElements += `<rect x="-1.5" y="${(-parseFloat(lineH) / 2).toFixed(1)}" width="3" height="${lineH}" fill="${inkHex}" transform="translate(${cx}, ${cy}) rotate(${(settings.dotAngle || 0).toFixed(1)})" />`;
        }
      }
    }
  } else if (settings.halftoneStyle === 'grain') {
    // Stochastic vector Xerox grain (matching canvas preview: 0.5px to 25px)
    const scale = Math.max(0.5, Math.min(25, Number(settings.dotScale) || 4));
    const isMicro = scale <= 1.2;
    const grainStep = isMicro ? 1 : Math.max(1, Math.round(scale * 0.7));
    for (let y = 0; y < imgH; y += grainStep) {
      for (let x = 0; x < imgW; x += grainStep) {
        const idx = y * imgW + x;
        if (alphaMask[idx] < 30) continue;

        const pIdx = idx * 4;
        const darkness = getSvgAdjustedDarkness(pIdx);
        const noise = pseudoNoise(x * 12.9898 + y * 78.233);
        const threshold = 1 - Math.pow(Math.max(0, darkness), 1.35);
        if (noise > threshold) {
          const cx = (margin + x).toFixed(1);
          const cy = (margin + y).toFixed(1);
          if (isMicro) {
            halftoneElements += `<rect x="${cx}" y="${cy}" width="1" height="1" fill="${inkHex}" />`;
          } else {
            const gr = Math.max(0.75, (scale / 2) * 0.95).toFixed(2);
            halftoneElements += `<circle cx="${cx}" cy="${cy}" r="${gr}" fill="${inkHex}" />`;
          }
        }
      }
    }
  } else if (settings.halftoneStyle === 'xerox-solid') {
    const scale = Math.max(0.5, Math.min(25, Number(settings.dotScale) || 4));
    const step = scale <= 1.5 ? 1 : Math.max(1, Math.round(scale * 0.8));
    for (let y = 0; y < imgH; y += step) {
      for (let x = 0; x < imgW; x += step) {
        const idx = y * imgW + x;
        if (alphaMask[idx] < 30) continue;
        const pIdx = idx * 4;
        const darkness = getSvgAdjustedDarkness(pIdx);
        const n1 = pseudoNoise(x * 23.17 + y * 89.41);
        const n2 = pseudoNoise(x * 9.31 + y * 41.73);
        const combined = n1 * 0.7 + n2 * 0.3;
        if (combined > (1 - Math.pow(Math.max(0, darkness), 1.2))) {
          const fw = Math.max(0.5, scale * (0.8 + n1 * 0.5)).toFixed(1);
          const fh = Math.max(0.5, scale * (0.6 + n2 * 0.6)).toFixed(1);
          const cx = (margin + x - parseFloat(fw) / 2).toFixed(1);
          const cy = (margin + y - parseFloat(fh) / 2).toFixed(1);
          halftoneElements += `<rect x="${cx}" y="${cy}" width="${fw}" height="${fh}" fill="${inkHex}" />`;
        }
      }
    }
  } else if (settings.halftoneStyle === 'crosshatch') {
    for (let v = -diagonal; v < diagonal; v += dotSpacing) {
      for (let u = -diagonal; u < diagonal; u += 3) {
        const px = Math.round(imgW / 2 + u * cosA - v * sinA);
        const py = Math.round(imgH / 2 + u * sinA + v * cosA);
        if (px < 0 || px >= imgW || py < 0 || py >= imgH) continue;
        const idx = py * imgW + px;
        if (alphaMask[idx] < 30) continue;
        const pIdx = idx * 4;
        const darkness = getSvgAdjustedDarkness(pIdx);
        if (darkness > 0.08) {
          const lineH = Math.max(0.75, darkness * (dotSpacing * 0.95)).toFixed(1);
          const cx = (margin + px).toFixed(1);
          const cy = (margin + py).toFixed(1);
          halftoneElements += `<rect x="-1.5" y="${(-parseFloat(lineH) / 2).toFixed(1)}" width="3" height="${lineH}" fill="${inkHex}" transform="translate(${cx}, ${cy}) rotate(${(settings.dotAngle || 0).toFixed(1)})" />`;
          if (darkness > 0.45) {
            const crossH = (parseFloat(lineH) * 0.8).toFixed(1);
            halftoneElements += `<rect x="-1.5" y="${(-parseFloat(crossH) / 2).toFixed(1)}" width="3" height="${crossH}" fill="${inkHex}" transform="translate(${cx}, ${cy}) rotate(${((settings.dotAngle || 0) + 90).toFixed(1)})" />`;
          }
        }
      }
    }
  } else if (settings.halftoneStyle === 'diamond') {
    const maxDotR = dotSpacing * 0.72;
    for (let v = -diagonal; v < diagonal; v += dotSpacing) {
      for (let u = -diagonal; u < diagonal; u += dotSpacing) {
        const px = Math.round(imgW / 2 + u * cosA - v * sinA);
        const py = Math.round(imgH / 2 + u * sinA + v * cosA);
        if (px < 0 || px >= imgW || py < 0 || py >= imgH) continue;
        const idx = py * imgW + px;
        if (alphaMask[idx] < 30) continue;
        const pIdx = idx * 4;
        const darkness = getSvgAdjustedDarkness(pIdx);
        if (darkness > 0.08) {
          const r = Math.pow(darkness, 0.85) * maxDotR;
          const d = (r * 1.4).toFixed(1);
          const halfD = (-parseFloat(d) / 2).toFixed(1);
          const cx = (margin + px).toFixed(1);
          const cy = (margin + py).toFixed(1);
          halftoneElements += `<rect x="${halfD}" y="${halfD}" width="${d}" height="${d}" fill="${inkHex}" transform="translate(${cx}, ${cy}) rotate(${((settings.dotAngle || 0) + 45).toFixed(1)})" />`;
        }
      }
    }
  } else {
    // Ben-Day Dots (Native Vector Circles, matching canvas preview exactly)
    for (let v = -diagonal; v < diagonal; v += dotSpacing) {
      for (let u = -diagonal; u < diagonal; u += dotSpacing) {
        const px = Math.round(imgW / 2 + u * cosA - v * sinA);
        const py = Math.round(imgH / 2 + u * sinA + v * cosA);
        if (px < 0 || px >= imgW || py < 0 || py >= imgH) continue;
        const idx = py * imgW + px;
        if (alphaMask[idx] < 30) continue;

        const pIdx = idx * 4;
        const darkness = getSvgAdjustedDarkness(pIdx);
        if (darkness > 0.05) {
          const rDot = (Math.pow(darkness, 1.15) * maxDotR).toFixed(1);
          const cx = (margin + px).toFixed(1);
          const cy = (margin + py).toFixed(1);
          halftoneElements += `<circle cx="${cx}" cy="${cy}" r="${rDot}" fill="${inkHex}" />`;
        }
      }
    }
  }

  if (settings.coloringMode !== 'cmyk-risograph') {
    const halftoneBlendStyle = showCutoutBorders ? ' style="mix-blend-mode: multiply;"' : '';
    artworkSVG += `\n    <!-- Master Halftone Artwork (Native Solid Vector Fills - 100% WYSIWYG in Adobe Illustrator) -->\n    <g id="Layer_Pop_Halftone_Artwork"${halftoneBlendStyle}>${halftoneElements}</g>`;
  }

  // 4-Color Separation Film Plates for Silkscreen Printmakers (Preserved in Layers Panel)
  if (settings.coloringMode === 'cmyk-risograph') {
    const baseAngle = settings.dotAngle || 0;
    const screens = [
      { name: 'yellow', angle: (0 + baseAngle) % 360, color: settings.accentColor3 || '#FFF200', shift: 0 },
      { name: 'cyan', angle: (15 + baseAngle) % 360, color: settings.accentColor2 || '#00AEEF', shift: 0.5 },
      { name: 'magenta', angle: (75 + baseAngle) % 360, color: settings.accentColor1 || '#EC008C', shift: 1.0 },
      { name: 'black', angle: (45 + baseAngle) % 360, color: settings.inkColor || '#141414', shift: 0 },
    ];
    let platesSVG = '';
    for (const scr of screens) {
      const angleRad = (scr.angle * Math.PI) / 180;
      const cosAScr = Math.cos(angleRad);
      const sinAScr = Math.sin(angleRad);
      const ox = (scr.shift * shiftX).toFixed(1);
      const oy = (scr.shift * shiftY).toFixed(1);
      let plateElements = '';

      for (let v = -diagonal; v < diagonal; v += dotSpacing) {
        for (let u = -diagonal; u < diagonal; u += dotSpacing) {
          const px = Math.round(imgW / 2 + u * cosAScr - v * sinAScr);
          const py = Math.round(imgH / 2 + u * sinAScr + v * cosAScr);
          if (px < 0 || px >= imgW || py < 0 || py >= imgH) continue;
          const idx = py * imgW + px;
          if (alphaMask[idx] < 25) continue;

          const pIdx = idx * 4;
          let rP = contrastFactor * (srcPixels[pIdx] - 128) + 128 + settings.brightness * 1.28;
          let gP = contrastFactor * (srcPixels[pIdx + 1] - 128) + 128 + settings.brightness * 1.28;
          let bP = contrastFactor * (srcPixels[pIdx + 2] - 128) + 128 + settings.brightness * 1.28;
          if (settings.invertInk) {
            rP = 255 - rP;
            gP = 255 - gP;
            bP = 255 - bP;
          }
          const rNorm = Math.max(0, Math.min(1, rP / 255));
          const gNorm = Math.max(0, Math.min(1, gP / 255));
          const bNorm = Math.max(0, Math.min(1, bP / 255));
          const k = 1 - Math.max(rNorm, gNorm, bNorm);
          let val = 0;
          if (scr.name === 'black') val = Math.pow(k, 1.25) * densityMultiplier;
          else if (k < 1) {
            if (scr.name === 'cyan') val = ((1 - rNorm - k) / (1 - k)) * densityMultiplier;
            else if (scr.name === 'magenta') val = ((1 - gNorm - k) / (1 - k)) * densityMultiplier;
            else if (scr.name === 'yellow') val = ((1 - bNorm - k) / (1 - k)) * densityMultiplier;
          }
          val = Math.max(0, Math.min(1, val));
          if (val > 0.05) {
            const rDot = Math.pow(val, 0.85) * maxDotR;
            const cx = (margin + px).toFixed(1);
            const cy = (margin + py).toFixed(1);
            plateElements += `<circle cx="${cx}" cy="${cy}" r="${rDot.toFixed(1)}" />`;
          }
        }
      }
      platesSVG += `\n      <g id="Film_Plate_CMYK_${scr.name.toUpperCase()}" fill="${scr.color}" transform="translate(${ox}, ${oy})">${plateElements}</g>`;
    }
    artworkSVG += `\n    <!-- CMYK Film Separations for Silkscreen Printmakers (100% Pure Vector Plates) -->\n    <g id="Layer_CMYK_Film_Plates"${settings.coloringMode === 'cmyk-risograph' ? '' : ' display="none"'}>${platesSVG}\n    </g>`;
  }

  // 100% Native SVG 1.1 / 2.0 Document - Fully Compliant with Adobe Illustrator, CorelDRAW, and Inkscape
  const sunburstClipDef =
    settings.sunburstEnabled && settings.sunburstPosition === 'inside-object' && sunburstClipPath
      ? `\n    <clipPath id="sunburst-clip"><path d="${sunburstClipPath}" fill-rule="evenodd" /></clipPath>`
      : '';

  const defsContent = sunburstClipDef.trim();
  const defsSection = defsContent ? `\n  <defs>\n    ${defsContent}\n  </defs>` : '';

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg"
     viewBox="0 0 ${artboardW} ${artboardH}"
     width="${artboardW}"
     height="${artboardH}">${defsSection}
  <metadata>
    <generator>Vintage Pop Art Studio - Pure Vector Halftone</generator>
    <style>${settings.halftoneStyle}</style>
    <palette>${settings.paletteId}</palette>
    <coloringMode>${settings.coloringMode}</coloringMode>
  </metadata>
  ${bgSVG}
  ${sunburstBehindSVG}
  ${comicBgSVG}
  <g id="Layer_Vintage_Pop_Artwork" transform="translate(${posX.toFixed(2)}, ${posY.toFixed(2)}) scale(${scaleFactor.toFixed(5)})">
    ${stickerBorderSVG}
    ${sunburstInsideSVG}
    <g id="Layer_Subject_Halftone_Artwork">
      ${vectorColorMatrixSVG}
      ${artworkSVG}
    </g>
  </g>
</svg>`;
}

