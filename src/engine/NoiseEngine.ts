/**
 * Deterministic Seeded PRNG (Mulberry32) and 2D Procedural Noise / Grunge / Distortion Engine.
 * All functions are pure and driven by settings.randomSeed so every seed produces a reproducible artistic variation.
 */

export function createSeededRandom(seed: number): () => number {
  let a = (seed ^ 0x6d2b79f5) >>> 0;
  return function () {
    a = Math.imul(a ^ (a >>> 15), a | 1);
    a ^= a + Math.imul(a ^ (a >>> 7), a | 61);
    return ((a ^ (a >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Deterministic 2D coordinate hash in [0, 1]
 */
export function hash2D(ix: number, iy: number, seed: number): number {
  let h = Math.imul(ix, 374761393) + Math.imul(iy, 668265263) + Math.imul(seed, 1442695041);
  h = (h ^ (h >>> 13)) >>> 0;
  h = Math.imul(h, 1274126177) >>> 0;
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

function fade(t: number): number {
  return t * t * t * (t * (t * 6 - 15) + 10);
}

function lerp(a: number, b: number, t: number): number {
  return a + t * (b - a);
}

/**
 * Smooth 2D Value Noise in [-1, 1]
 */
export function valueNoise2D(x: number, y: number, seed: number): number {
  const ix = Math.floor(x);
  const iy = Math.floor(y);
  const fx = x - ix;
  const fy = y - iy;

  const u = fade(fx);
  const v = fade(fy);

  const n00 = hash2D(ix, iy, seed) * 2 - 1;
  const n10 = hash2D(ix + 1, iy, seed) * 2 - 1;
  const n01 = hash2D(ix, iy + 1, seed) * 2 - 1;
  const n11 = hash2D(ix + 1, iy + 1, seed) * 2 - 1;

  const nx0 = lerp(n00, n10, u);
  const nx1 = lerp(n01, n11, u);

  return lerp(nx0, nx1, v);
}

/**
 * Multi-octave Fractal Brownian Motion (fBm) in [-1, 1]
 */
export function fbmNoise2D(
  x: number,
  y: number,
  scale: number,
  seed: number,
  octaves = 3
): number {
  const invScale = 1 / Math.max(2, scale);
  let total = 0;
  let amplitude = 0.5;
  let frequency = invScale;
  let maxAmplitude = 0;

  for (let i = 0; i < octaves; i++) {
    total += valueNoise2D(x * frequency, y * frequency, seed + i * 1013) * amplitude;
    maxAmplitude += amplitude;
    amplitude *= 0.5;
    frequency *= 2.05;
  }

  return maxAmplitude > 0 ? total / maxAmplitude : 0;
}

/**
 * Computes distressed screen-print grunge dropout and size erosion factors.
 * Uses ridged multifractal + high-frequency grain to simulate authentic worn ink.
 */
export function evaluateGrungeField(
  x: number,
  y: number,
  grunge: number,
  grungeScale: number,
  grungeStrength: number,
  seed: number
): { dropDot: boolean; sizeMultiplier: number; roughness: number } {
  if (grunge <= 0 || grungeStrength <= 0) {
    return { dropDot: false, sizeMultiplier: 1, roughness: 0 };
  }

  const effectiveIntensity = (grunge / 100) * (grungeStrength / 100);
  const scale = Math.max(4, grungeScale * 0.85);

  // Primary distressed blotch field
  const n1 = fbmNoise2D(x + 113.7, y - 89.3, scale, seed + 7919, 3);
  // Secondary high-frequency scratch/ridge field
  const ridgeRaw = valueNoise2D(
    (x * 2.4) / Math.max(6, scale * 0.4),
    (y * 0.7) / Math.max(6, scale * 0.4),
    seed + 15485
  );
  const ridge = 1 - Math.abs(ridgeRaw); // Sharp crease lines
  const fineGrain = hash2D(Math.floor(x * 1.5), Math.floor(y * 1.5), seed + 31337);

  // Combined distress signal in [0, 1]
  const distressSignal = (n1 * 0.5 + 0.5) * 0.55 + ridge * 0.3 + fineGrain * 0.15;

  // Threshold for complete ink dropout in distressed zones
  const dropoutThreshold = 1.0 - effectiveIntensity * 0.68;
  const dropDot = distressSignal > dropoutThreshold && fineGrain > 0.25 - effectiveIntensity * 0.2;

  // Erosion of dot radius near distressed boundaries
  const erosion = Math.max(0, (distressSignal - 0.35) * effectiveIntensity * 1.15);
  const sizeMultiplier = Math.max(0.2, 1.0 - erosion);

  return {
    dropDot,
    sizeMultiplier,
    roughness: Math.min(1, distressSignal * effectiveIntensity * 1.4),
  };
}

/**
 * Computes 2D domain-warping displacement [dx, dy] for Distortion controls.
 */
export function evaluateDistortionField(
  x: number,
  y: number,
  distortion: number,
  distortionScale: number,
  distortionStrength: number,
  seed: number
): [number, number] {
  if (distortion <= 0 || distortionStrength <= 0) {
    return [0, 0];
  }

  const scale = Math.max(6, distortionScale);
  const maxDisp = (distortion / 100) * (distortionStrength / 100) * 38;

  const dx = fbmNoise2D(x, y, scale, seed + 4099, 2) * maxDisp;
  const dy = fbmNoise2D(x + 521.3, y + 317.9, scale, seed + 8191, 2) * maxDisp;

  return [dx, dy];
}
