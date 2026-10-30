export type DotShape =
  | 'circle'
  | 'ellipse'
  | 'square'
  | 'rounded-square'
  | 'diamond'
  | 'organic';

export type PatternType =
  | 'regular'
  | 'jittered'
  | 'random'
  | 'poisson'
  | 'organic'
  | 'adaptive';

export type ColorMode =
  | 'monochrome'
  | 'duotone'
  | 'multicolor'
  | 'original';

export type BackgroundMode =
  | 'white'
  | 'black'
  | 'custom'
  | 'transparent';

export type AlphaMode =
  | 'preserve'
  | 'ignore'
  | 'fill';

export type CropMode =
  | 'fit'
  | 'fill'
  | 'crop'
  | 'stretch';

export type AutoFitMode =
  | 'short-edge'
  | 'long-edge'
  | 'cover'
  | 'contain';

export type PreviewQuality =
  | 'fast'
  | 'balanced'
  | 'high'
  | 'maximum';

export type FilmstripViewState = 'minimized' | 'normal' | 'maximized';

export interface FilmstripItem {
  id: string;
  file: File;
  name: string;
  previewUrl: string;
  settings?: StippleSettings;
  vintagePopSettings?: VintagePopSettings;
  vintagePopPresetId?: string;
  manualVintagePopOverrides?: Record<string, any>;
  studioMode?: StudioMode;
  isCustomized?: boolean;
}

export type ViewComparisonMode =
  | 'vector'
  | 'original'
  | 'split'
  | 'side-by-side';

export interface StippleSettings {
  // 1. Basic Dot Controls
  dotSize: number;
  dotDensity: number;
  dotSpacing: number;
  minDotSize: number;
  maxDotSize: number;
  dotVariation: number;
  tonalResponse: number;
  densityResponse: number;

  // 2. Tonal Controls
  brightness: number;
  contrast: number;
  gamma: number;
  blackLevel: number;
  whiteLevel: number;
  shadowStrength: number;
  midtoneStrength: number;
  highlightStrength: number;
  threshold: number;
  thresholdPoint: number;
  invert: boolean;

  // 3. Detail & Edge Controls
  detail: number;
  edgeStrength: number;
  edgePreservation: number;
  localContrast: number;
  sharpen: number;
  smoothing: number;
  edgeDensity: number;
  edgeDetail: number;
  edgeContrast: number;

  // 4. Organic & Grunge Controls
  randomness: number;
  jitter: number;
  jitterX: number;
  jitterY: number;
  sizeRandomness: number;
  positionRandomness: number;
  organicity: number;
  noise: number;
  noiseScale: number;
  noiseStrength: number;
  grunge: number;
  grungeScale: number;
  grungeStrength: number;
  distortion: number;
  distortionScale: number;
  distortionStrength: number;

  // 5. Dot Shape Controls
  dotShape: DotShape;
  dotRoundness: number;
  dotAspect: number;
  dotRotation: number;
  rotationRandomness: number;
  dotStretch: number;
  dotSquash: number;

  // 6. Halftone Pattern Controls
  patternType: PatternType;
  patternAngle: number;
  patternScale: number;
  cellSize: number;
  cellSizeX: number;
  cellSizeY: number;
  independentCellScale: boolean;

  // 7. Adaptive Stipple Controls
  adaptiveStrength: number;
  edgeBias: number;
  shadowDensity: number;
  midtoneDensity: number;
  highlightSparsity: number;

  // 8. Color Controls
  colorMode: ColorMode;
  inkColor: string;
  secondaryInkColor: string;
  colorCount: number;
  colorSaturation: number;
  colorBalance: number;
  colorThreshold: number;
  colorMix: number;
  colorSeparation: number;

  // 9. Background & Alpha Controls
  backgroundMode: BackgroundMode;
  backgroundColor: string;
  backgroundOpacity: number;
  invertBackground: boolean;
  alphaMode: AlphaMode;
  includeBgInStipple: boolean;

  // 10. Composition Controls
  scale: number;
  outputWidth: number;
  outputHeight: number;
  maintainAspectRatio: boolean;
  padding: number;
  margin: number;
  offsetX: number;
  offsetY: number;
  cropMode: CropMode;
  autoFitMode?: AutoFitMode;
  isBackgroundTransparent?: boolean;

  // 11. Vector Quality & Seed
  previewQuality: PreviewQuality;
  vectorResolution: number;
  svgPrecision: number;
  pathOptimization: boolean;
  mergeShapes: boolean;
  simplifyVector: number;
  randomSeed: number;
}

export interface VectorDot {
  x: number;
  y: number;
  r: number;
  rx: number;
  ry: number;
  rotation: number;
  color: string;
  opacity: number;
  toneBand: 'shadows' | 'midtones' | 'highlights';
  layerIndex: number;
  shape: DotShape;
  roundness: number;
  seedOffset: number;
}

export interface GenerationStats {
  totalDots: number;
  shadowDots: number;
  midtoneDots: number;
  highlightDots: number;
  layerCounts: Record<string, number>;
  analysisWidth: number;
  analysisHeight: number;
  outputWidth: number;
  outputHeight: number;
  processingTimeMs: number;
  svgByteSizeEstimate: number;
  largeImageOptimized: boolean;
}

export interface StipplePreset {
  id: string;
  name: string;
  category: 'Classic' | 'Halftone' | 'Grunge & Print' | 'Artistic' | 'Custom';
  description: string;
  settings: Partial<StippleSettings>;
  isCustom?: boolean;
}

export const DEFAULT_STIPPLE_SETTINGS: StippleSettings = {
  // Basic Dots
  dotSize: 4.0,
  dotDensity: 74,
  dotSpacing: 4.8,
  minDotSize: 0.4,
  maxDotSize: 6.4,
  dotVariation: 30,
  tonalResponse: 120,
  densityResponse: 115,

  // Tonal
  brightness: 2,
  contrast: 32,
  gamma: 1.06,
  blackLevel: 14,
  whiteLevel: 238,
  shadowStrength: 125,
  midtoneStrength: 92,
  highlightStrength: 45,
  threshold: 0,
  thresholdPoint: 128,
  invert: false,

  // Detail & Edges
  detail: 72,
  edgeStrength: 70,
  edgePreservation: 72,
  localContrast: 38,
  sharpen: 22,
  smoothing: 6,
  edgeDensity: 58,
  edgeDetail: 60,
  edgeContrast: 46,

  // Organic & Grunge
  randomness: 34,
  jitter: 42,
  jitterX: 50,
  jitterY: 50,
  sizeRandomness: 22,
  positionRandomness: 28,
  organicity: 44,
  noise: 20,
  noiseScale: 42,
  noiseStrength: 32,
  grunge: 12,
  grungeScale: 58,
  grungeStrength: 36,
  distortion: 6,
  distortionScale: 58,
  distortionStrength: 20,

  // Shape
  dotShape: 'circle',
  dotRoundness: 45,
  dotAspect: 1.0,
  dotRotation: 0,
  rotationRandomness: 0,
  dotStretch: 0,
  dotSquash: 0,

  // Pattern
  patternType: 'adaptive',
  patternAngle: 15,
  patternScale: 100,
  cellSize: 4.8,
  cellSizeX: 4.8,
  cellSizeY: 4.8,
  independentCellScale: false,

  // Adaptive
  adaptiveStrength: 85,
  edgeBias: 62,
  shadowDensity: 135,
  midtoneDensity: 95,
  highlightSparsity: 82,

  // Color
  colorMode: 'monochrome',
  inkColor: '#000000',
  secondaryInkColor: '#D9381E',
  colorCount: 4,
  colorSaturation: 115,
  colorBalance: 0,
  colorThreshold: 52,
  colorMix: 45,
  colorSeparation: 20,

  // Background
  backgroundMode: 'white',
  backgroundColor: '#FFFFFF',
  backgroundOpacity: 100,
  invertBackground: false,
  alphaMode: 'preserve',
  includeBgInStipple: false,

  // Composition
  scale: 100,
  outputWidth: 4000,
  outputHeight: 4000,
  maintainAspectRatio: true,
  padding: 24,
  margin: 0,
  offsetX: 0,
  offsetY: 0,
  cropMode: 'fit',
  autoFitMode: 'long-edge',
  isBackgroundTransparent: false,

  // Vector Quality
  previewQuality: 'balanced',
  vectorResolution: 100,
  svgPrecision: 2,
  pathOptimization: true,
  mergeShapes: false,
  simplifyVector: 6,
  randomSeed: 4821,
};

export interface SliderMeta {
  key: keyof StippleSettings;
  label: string;
  min: number;
  max: number;
  step: number;
  unit?: string;
  tooltip: string;
  basicMode?: boolean;
}

export const SLIDER_DEFINITIONS: Record<string, SliderMeta> = {
  // Basic Dots
  dotSize: {
    key: 'dotSize',
    label: 'Dot Size',
    min: 0.5,
    max: 18,
    step: 0.1,
    unit: 'px',
    basicMode: true,
    tooltip: 'Controls overall size of generated vector dots. Increase for bolder halftone weight; decrease for fine pen-and-ink stippling.',
  },
  dotDensity: {
    key: 'dotDensity',
    label: 'Dot Density',
    min: 5,
    max: 200,
    step: 1,
    unit: '%',
    basicMode: true,
    tooltip: 'Controls how many dots are generated across the artwork. Increase for denser ink coverage; decrease for sparse, airy stippling.',
  },
  dotSpacing: {
    key: 'dotSpacing',
    label: 'Dot Spacing',
    min: 2.0,
    max: 22.0,
    step: 0.2,
    unit: 'px',
    basicMode: true,
    tooltip: 'Controls candidate distance between dot positions. Decrease for tight, detailed packing; increase for wide screen-print spacing.',
  },
  minDotSize: {
    key: 'minDotSize',
    label: 'Minimum Dot Size',
    min: 0.1,
    max: 8.0,
    step: 0.1,
    unit: 'px',
    tooltip: 'Smallest allowed vector dot radius. Increase to prevent microscopic dust dots in highlights; decrease for delicate fade-outs.',
  },
  maxDotSize: {
    key: 'maxDotSize',
    label: 'Maximum Dot Size',
    min: 1.0,
    max: 28.0,
    step: 0.2,
    unit: 'px',
    tooltip: 'Largest allowed vector dot radius in deep shadows. Increase for heavy overlapping shadow blocks; decrease for uniform stipple pen widths.',
  },
  dotVariation: {
    key: 'dotVariation',
    label: 'Dot Size Variation',
    min: 0,
    max: 100,
    step: 1,
    unit: '%',
    basicMode: true,
    tooltip: 'Controls how much individual dot sizes vary across tones. At 0%, dots are nearly uniform; higher values create dramatic size contrast.',
  },
  tonalResponse: {
    key: 'tonalResponse',
    label: 'Tonal Size Response',
    min: 0,
    max: 200,
    step: 5,
    unit: '%',
    tooltip: 'Controls how strongly image darkness scales dot diameter. Decrease for constant-size stippling; increase for strong halftone size modulation.',
  },
  densityResponse: {
    key: 'densityResponse',
    label: 'Tonal Density Response',
    min: 0,
    max: 200,
    step: 5,
    unit: '%',
    tooltip: 'Controls how strongly image brightness drives dot placement probability. Higher values concentrate dots strictly in dark areas.',
  },

  // Tonal Controls
  brightness: {
    key: 'brightness',
    label: 'Brightness',
    min: -100,
    max: 100,
    step: 1,
    basicMode: true,
    tooltip: 'Shifts overall source luminance before stipple analysis. Increase to lighten the artwork and reduce dots; decrease to darken and add ink.',
  },
  contrast: {
    key: 'contrast',
    label: 'Contrast',
    min: -100,
    max: 100,
    step: 1,
    basicMode: true,
    tooltip: 'Adjusts tonal separation between shadows and highlights. Increase for punchy graphic illustrations; decrease for softer tonal transitions.',
  },
  gamma: {
    key: 'gamma',
    label: 'Gamma',
    min: 0.2,
    max: 3.0,
    step: 0.05,
    tooltip: 'Non-linear midtone response curve. Increase to lift midtones and open up dark regions; decrease to deepen midtone ink weight.',
  },
  blackLevel: {
    key: 'blackLevel',
    label: 'Black Level',
    min: 0,
    max: 240,
    step: 1,
    tooltip: 'Sets the input luminance floor where solid shadows begin. Increase to crush dark grays into deep shadow density.',
  },
  whiteLevel: {
    key: 'whiteLevel',
    label: 'White Level',
    min: 15,
    max: 255,
    step: 1,
    tooltip: 'Sets the input luminance ceiling where highlights clip to paper white. Decrease to blow out light grays into clean empty space.',
  },
  shadowStrength: {
    key: 'shadowStrength',
    label: 'Shadow Strength',
    min: 0,
    max: 200,
    step: 5,
    unit: '%',
    tooltip: 'Controls visual ink weight in dark tonal regions. Increase for richer, heavier blacks; decrease to open up dark shadows.',
  },
  midtoneStrength: {
    key: 'midtoneStrength',
    label: 'Midtone Strength',
    min: 0,
    max: 200,
    step: 5,
    unit: '%',
    tooltip: 'Controls how strongly mid-gray values appear in the stipple field. Increase for fuller body; decrease for high-key graphic separation.',
  },
  highlightStrength: {
    key: 'highlightStrength',
    label: 'Highlight Strength',
    min: 0,
    max: 200,
    step: 5,
    unit: '%',
    tooltip: 'Controls dot visibility in bright regions. Increase to keep subtle texture in highlights; decrease for pure paper-white highlights.',
  },
  threshold: {
    key: 'threshold',
    label: 'Threshold Mix',
    min: 0,
    max: 100,
    step: 1,
    unit: '%',
    tooltip: 'Pushes the tonal map toward hard binary black/white separation. At 0%, full continuous tones are used; at 100%, hard woodcut/stencil thresholding applies.',
  },
  thresholdPoint: {
    key: 'thresholdPoint',
    label: 'Threshold Cutoff',
    min: 10,
    max: 245,
    step: 1,
    tooltip: 'Luminance cutoff value when Threshold Mix is active. Increase to include more midtones as dark ink; decrease to restrict ink to darkest areas.',
  },

  // Detail & Edges
  detail: {
    key: 'detail',
    label: 'Detail Preservation',
    min: 0,
    max: 100,
    step: 1,
    unit: '%',
    basicMode: true,
    tooltip: 'Controls how much fine high-frequency texture from the source image is preserved. Increase for crisp facial/surface texture; decrease for broader tonal masses.',
  },
  edgeStrength: {
    key: 'edgeStrength',
    label: 'Edge Strength',
    min: 0,
    max: 200,
    step: 5,
    unit: '%',
    basicMode: true,
    tooltip: 'Controls the importance of detected Sobel edges in the stipple engine. Increase to emphasize subject outlines and structural contours.',
  },
  edgePreservation: {
    key: 'edgePreservation',
    label: 'Edge Preservation',
    min: 0,
    max: 100,
    step: 1,
    unit: '%',
    tooltip: 'Protects sharp boundaries from being softened during smoothing or large-cell sampling. Higher values lock contours in place.',
  },
  localContrast: {
    key: 'localContrast',
    label: 'Local Contrast',
    min: 0,
    max: 100,
    step: 1,
    unit: '%',
    tooltip: 'Enhances micro-tonal differences relative to neighboring pixels. Increase to bring out subtle relief and folds in portraits or products.',
  },
  sharpen: {
    key: 'sharpen',
    label: 'Sharpen',
    min: 0,
    max: 100,
    step: 1,
    unit: '%',
    tooltip: 'Applies controlled convolution sharpening prior to luminance analysis. Increase to crisp up soft photographs.',
  },
  smoothing: {
    key: 'smoothing',
    label: 'Smoothing',
    min: 0,
    max: 100,
    step: 1,
    unit: '%',
    tooltip: 'Reduces sensor noise and grain in the source image before vector generation. Increase for cleaner, less speckled stipple fields.',
  },
  edgeDensity: {
    key: 'edgeDensity',
    label: 'Edge Dot Density',
    min: 0,
    max: 100,
    step: 1,
    unit: '%',
    tooltip: 'Concentrates extra candidate stipple dots along strong edges to delineate features clearly.',
  },
  edgeDetail: {
    key: 'edgeDetail',
    label: 'Edge Dot Detail',
    min: 0,
    max: 100,
    step: 1,
    unit: '%',
    tooltip: 'Refines dot sizes along sharp contours so edges render with crisp precision rather than bulky blobs.',
  },
  edgeContrast: {
    key: 'edgeContrast',
    label: 'Edge Tonal Contrast',
    min: 0,
    max: 100,
    step: 1,
    unit: '%',
    tooltip: 'Deepens tonal darkness along detected structural boundaries for stronger graphic definition.',
  },

  // Organic & Grunge
  randomness: {
    key: 'randomness',
    label: 'Randomness',
    min: 0,
    max: 100,
    step: 1,
    unit: '%',
    basicMode: true,
    tooltip: 'Master control for procedural irregularity across dot placement and probability. Increase for hand-crafted organic texture; set to 0 for mathematical precision.',
  },
  jitter: {
    key: 'jitter',
    label: 'Jitter',
    min: 0,
    max: 100,
    step: 1,
    unit: '%',
    basicMode: true,
    tooltip: 'Displaces generated dots away from rigid grid intersections. Increase to break up mechanical halftone rows.',
  },
  jitterX: {
    key: 'jitterX',
    label: 'Jitter X',
    min: 0,
    max: 100,
    step: 1,
    unit: '%',
    tooltip: 'Controls horizontal positional displacement multiplier. Increase for wider lateral scatter.',
  },
  jitterY: {
    key: 'jitterY',
    label: 'Jitter Y',
    min: 0,
    max: 100,
    step: 1,
    unit: '%',
    tooltip: 'Controls vertical positional displacement multiplier. Increase for taller vertical scatter.',
  },
  sizeRandomness: {
    key: 'sizeRandomness',
    label: 'Size Randomness',
    min: 0,
    max: 100,
    step: 1,
    unit: '%',
    tooltip: 'Randomizes individual dot radii independently of tone. Increase for stochastic ink-splatter character.',
  },
  positionRandomness: {
    key: 'positionRandomness',
    label: 'Position Randomness',
    min: 0,
    max: 100,
    step: 1,
    unit: '%',
    tooltip: 'Adds fine-grain stochastic offset to candidate coordinates.',
  },
  organicity: {
    key: 'organicity',
    label: 'Organicity',
    min: 0,
    max: 100,
    step: 1,
    unit: '%',
    tooltip: 'Blends natural flow-field relaxation and irregular shape modulation into the dot distribution.',
  },
  noise: {
    key: 'noise',
    label: 'Procedural Noise',
    min: 0,
    max: 100,
    step: 1,
    unit: '%',
    tooltip: 'Modulates dot density and size with coherent 2D Simplex-style procedural noise. Increase for mottled, cloudy organic grain.',
  },
  noiseScale: {
    key: 'noiseScale',
    label: 'Noise Scale',
    min: 5,
    max: 200,
    step: 1,
    tooltip: 'Controls the spatial wavelength of the procedural noise field. Lower values create fine grain; higher values create broad clouds.',
  },
  noiseStrength: {
    key: 'noiseStrength',
    label: 'Noise Strength',
    min: 0,
    max: 100,
    step: 1,
    unit: '%',
    tooltip: 'Controls how strongly the noise field alters dot sizes and survival probability.',
  },
  grunge: {
    key: 'grunge',
    label: 'Grunge / Distress',
    min: 0,
    max: 100,
    step: 1,
    unit: '%',
    basicMode: true,
    tooltip: 'Introduces distressed screen-print characteristics: eroded dots, worn ink dropouts, and rough edge wear.',
  },
  grungeScale: {
    key: 'grungeScale',
    label: 'Grunge Scale',
    min: 5,
    max: 200,
    step: 1,
    tooltip: 'Controls the physical size of distressed wear patches and ink dropouts.',
  },
  grungeStrength: {
    key: 'grungeStrength',
    label: 'Grunge Strength',
    min: 0,
    max: 100,
    step: 1,
    unit: '%',
    tooltip: 'Controls the severity of grunge erosion and missing-dot patches.',
  },
  distortion: {
    key: 'distortion',
    label: 'Wave / Field Distortion',
    min: 0,
    max: 100,
    step: 1,
    unit: '%',
    tooltip: 'Warps the vector dot field using a continuous 2D curl-noise displacement field. Increase for psychedelic or fluid print warps.',
  },
  distortionScale: {
    key: 'distortionScale',
    label: 'Distortion Scale',
    min: 5,
    max: 200,
    step: 1,
    tooltip: 'Controls the frequency of the spatial warp waves. Lower values create tight ripples; higher values create sweeping bends.',
  },
  distortionStrength: {
    key: 'distortionStrength',
    label: 'Distortion Strength',
    min: 0,
    max: 100,
    step: 1,
    unit: '%',
    tooltip: 'Controls maximum pixel displacement distance applied by the distortion field.',
  },

  // Shape Controls
  dotRoundness: {
    key: 'dotRoundness',
    label: 'Dot Roundness',
    min: 0,
    max: 100,
    step: 1,
    unit: '%',
    tooltip: 'Controls corner radius for Rounded Square or lobe smoothness for Organic ink shapes.',
  },
  dotAspect: {
    key: 'dotAspect',
    label: 'Dot Aspect Ratio',
    min: 0.2,
    max: 3.0,
    step: 0.05,
    tooltip: 'Width-to-height ratio of each vector shape. Values away from 1.0 create elongated dashes or ovals.',
  },
  dotRotation: {
    key: 'dotRotation',
    label: 'Dot Rotation',
    min: -180,
    max: 180,
    step: 1,
    unit: '°',
    tooltip: 'Base rotation angle in degrees applied to non-circular dots.',
  },
  rotationRandomness: {
    key: 'rotationRandomness',
    label: 'Rotation Randomness',
    min: 0,
    max: 100,
    step: 1,
    unit: '%',
    tooltip: 'Randomly rotates individual vector shapes for an organic, non-uniform texture.',
  },
  dotStretch: {
    key: 'dotStretch',
    label: 'Directional Stretch',
    min: 0,
    max: 100,
    step: 1,
    unit: '%',
    tooltip: 'Elongates dots along the local image edge tangent or pattern angle for an engraved/hatched feel.',
  },
  dotSquash: {
    key: 'dotSquash',
    label: 'Perpendicular Squash',
    min: 0,
    max: 100,
    step: 1,
    unit: '%',
    tooltip: 'Compresses dot geometry along the secondary axis to create crisp slit or woodcut marks.',
  },

  // Pattern Controls
  patternAngle: {
    key: 'patternAngle',
    label: 'Pattern Angle',
    min: -90,
    max: 90,
    step: 1,
    unit: '°',
    basicMode: true,
    tooltip: 'Rotates the underlying halftone sampling lattice (e.g., classic 15° or 45° screen print angles).',
  },
  patternScale: {
    key: 'patternScale',
    label: 'Pattern Scale',
    min: 25,
    max: 250,
    step: 5,
    unit: '%',
    tooltip: 'Scales the overall sampling grid geometry up or down.',
  },
  cellSize: {
    key: 'cellSize',
    label: 'Cell Size',
    min: 2.0,
    max: 24.0,
    step: 0.5,
    unit: 'px',
    tooltip: 'Base halftone cell dimension when uniform X/Y scaling is active.',
  },
  cellSizeX: {
    key: 'cellSizeX',
    label: 'Cell Size X',
    min: 2.0,
    max: 24.0,
    step: 0.5,
    unit: 'px',
    tooltip: 'Horizontal sampling cell width when independent X/Y scaling is enabled.',
  },
  cellSizeY: {
    key: 'cellSizeY',
    label: 'Cell Size Y',
    min: 2.0,
    max: 24.0,
    step: 0.5,
    unit: 'px',
    tooltip: 'Vertical sampling cell height when independent X/Y scaling is enabled.',
  },

  // Adaptive Controls
  adaptiveStrength: {
    key: 'adaptiveStrength',
    label: 'Adaptive Strength',
    min: 0,
    max: 100,
    step: 1,
    unit: '%',
    tooltip: 'Controls how strongly dot density and size adapt dynamically to local tonal complexity.',
  },
  edgeBias: {
    key: 'edgeBias',
    label: 'Edge Bias',
    min: 0,
    max: 100,
    step: 1,
    unit: '%',
    tooltip: 'Pulls and concentrates adaptive stipple points toward high-contrast subject contours.',
  },
  shadowDensity: {
    key: 'shadowDensity',
    label: 'Shadow Density',
    min: 0,
    max: 200,
    step: 5,
    unit: '%',
    tooltip: 'Multiplies point packing density specifically inside shadow regions.',
  },
  midtoneDensity: {
    key: 'midtoneDensity',
    label: 'Midtone Density',
    min: 0,
    max: 200,
    step: 5,
    unit: '%',
    tooltip: 'Multiplies point packing density inside midtone transition zones.',
  },
  highlightSparsity: {
    key: 'highlightSparsity',
    label: 'Highlight Sparsity',
    min: 0,
    max: 100,
    step: 1,
    unit: '%',
    tooltip: 'Thins out and removes dots in bright highlight areas to preserve clean paper space.',
  },

  // Color Controls
  colorCount: {
    key: 'colorCount',
    label: 'Color Layer Count',
    min: 2,
    max: 8,
    step: 1,
    tooltip: 'Number of quantized vector ink layers generated in Multicolor screen-print mode.',
  },
  colorSaturation: {
    key: 'colorSaturation',
    label: 'Color Saturation',
    min: 0,
    max: 200,
    step: 5,
    unit: '%',
    tooltip: 'Boosts or desaturates sampled source colors in Multicolor and Original Color modes.',
  },
  colorBalance: {
    key: 'colorBalance',
    label: 'Color Balance',
    min: -100,
    max: 100,
    step: 1,
    tooltip: 'Shifts color temperature (cool to warm) or adjusts primary/secondary ink ratio in Duotone mode.',
  },
  colorThreshold: {
    key: 'colorThreshold',
    label: 'Color Split Threshold',
    min: 5,
    max: 95,
    step: 1,
    unit: '%',
    tooltip: 'Controls tonal crossover point between Primary Ink and Secondary Ink in Duotone mode.',
  },
  colorMix: {
    key: 'colorMix',
    label: 'Color Layer Mix',
    min: 0,
    max: 100,
    step: 1,
    unit: '%',
    tooltip: 'Controls overlap and tonal blending between adjacent color ink layers.',
  },
  colorSeparation: {
    key: 'colorSeparation',
    label: 'Screen Registration Offset',
    min: 0,
    max: 100,
    step: 1,
    unit: '%',
    tooltip: 'Introduces authentic screen-print / risograph registration offset and screen angle separation between color layers.',
  },

  // Background
  backgroundOpacity: {
    key: 'backgroundOpacity',
    label: 'Background Opacity',
    min: 0,
    max: 100,
    step: 1,
    unit: '%',
    tooltip: 'Controls opacity of the SVG background rectangle.',
  },

  // Composition
  scale: {
    key: 'scale',
    label: 'Artwork Scale',
    min: 25,
    max: 200,
    step: 1,
    unit: '%',
    tooltip: 'Scales the generated vector artwork inside the SVG artboard.',
  },
  padding: {
    key: 'padding',
    label: 'Inner Padding',
    min: 0,
    max: 200,
    step: 2,
    unit: 'px',
    tooltip: 'Adds clean breathing room around the stipple artwork inside the artboard bounds.',
  },
  margin: {
    key: 'margin',
    label: 'Outer Margin',
    min: 0,
    max: 150,
    step: 2,
    unit: 'px',
    tooltip: 'Adds outer frame margin clipping around the composition.',
  },
  offsetX: {
    key: 'offsetX',
    label: 'Horizontal Offset',
    min: -400,
    max: 400,
    step: 2,
    unit: 'px',
    tooltip: 'Shifts the vector artwork left or right on the SVG artboard.',
  },
  offsetY: {
    key: 'offsetY',
    label: 'Vertical Offset',
    min: -400,
    max: 400,
    step: 2,
    unit: 'px',
    tooltip: 'Shifts the vector artwork up or down on the SVG artboard.',
  },

  // Vector Quality
  vectorResolution: {
    key: 'vectorResolution',
    label: 'Vector Sampling Resolution',
    min: 30,
    max: 180,
    step: 5,
    unit: '%',
    tooltip: 'Multiplier for internal analysis and candidate point resolution. Higher values generate finer detail and more vector nodes.',
  },
  svgPrecision: {
    key: 'svgPrecision',
    label: 'SVG Coordinate Precision',
    min: 0,
    max: 4,
    step: 1,
    unit: 'dec',
    tooltip: 'Number of decimal places written to SVG coordinates. Lower values reduce SVG file size; higher values preserve sub-pixel precision.',
  },
  simplifyVector: {
    key: 'simplifyVector',
    label: 'Simplify / Cull Redundant',
    min: 0,
    max: 100,
    step: 1,
    unit: '%',
    tooltip: 'Removes microscopic and heavily overlapping redundant dots to keep SVG node count fast in Adobe Illustrator and Inkscape.',
  },
};

export const BUILT_IN_PRESETS: StipplePreset[] = [
  {
    id: 'classic-stipple',
    name: 'Classic Stipple',
    category: 'Classic',
    description: 'Balanced pitch-black stipple with rich shadow depth and clear midtone detail.',
    settings: {
      ...DEFAULT_STIPPLE_SETTINGS,
      patternType: 'adaptive',
      dotShape: 'circle',
      dotSize: 4.0,
      dotDensity: 74,
      dotSpacing: 4.8,
      minDotSize: 0.4,
      maxDotSize: 6.4,
      dotVariation: 30,
      contrast: 32,
      blackLevel: 14,
      whiteLevel: 238,
      threshold: 0,
      shadowStrength: 125,
      shadowDensity: 135,
      highlightSparsity: 82,
      edgeStrength: 70,
      randomness: 34,
      jitter: 42,
      grunge: 12,
      colorMode: 'monochrome',
      inkColor: '#000000',
      backgroundColor: '#FFFFFF',
    },
  },
  {
    id: 'fine-stipple',
    name: 'Fine Stipple',
    category: 'Classic',
    description: 'Delicate micron-pen scientific illustration with tight spacing and crisp edges.',
    settings: {
      ...DEFAULT_STIPPLE_SETTINGS,
      patternType: 'poisson',
      dotShape: 'circle',
      dotSize: 2.7,
      dotDensity: 80,
      dotSpacing: 3.8,
      minDotSize: 0.3,
      maxDotSize: 4.2,
      dotVariation: 24,
      contrast: 26,
      blackLevel: 12,
      whiteLevel: 240,
      detail: 85,
      edgeStrength: 82,
      edgeDetail: 80,
      randomness: 40,
      jitter: 46,
      grunge: 0,
      distortion: 0,
      colorMode: 'monochrome',
      inkColor: '#000000',
      backgroundColor: '#FFFFFF',
    },
  },
  {
    id: 'bold-stipple',
    name: 'Bold Stipple',
    category: 'Classic',
    description: 'Heavy ink weight with solid pitch-black shadow blocks and expressive dot variation.',
    settings: {
      ...DEFAULT_STIPPLE_SETTINGS,
      patternType: 'adaptive',
      dotShape: 'circle',
      dotSize: 5.4,
      dotDensity: 76,
      dotSpacing: 5.4,
      minDotSize: 0.65,
      maxDotSize: 9.2,
      dotVariation: 42,
      contrast: 46,
      blackLevel: 22,
      whiteLevel: 232,
      threshold: 14,
      shadowStrength: 145,
      shadowDensity: 150,
      highlightSparsity: 85,
      randomness: 30,
      jitter: 36,
      grunge: 14,
      colorMode: 'monochrome',
      inkColor: '#000000',
      backgroundColor: '#FFFFFF',
    },
  },
  {
    id: 'dense-halftone',
    name: 'Dense Halftone',
    category: 'Halftone',
    description: 'Tightly angled 15° commercial screen-print halftone grid with rich shadow coverage.',
    settings: {
      ...DEFAULT_STIPPLE_SETTINGS,
      patternType: 'regular',
      dotShape: 'circle',
      patternAngle: 15,
      cellSize: 5.0,
      dotSize: 4.8,
      dotDensity: 82,
      dotSpacing: 5.0,
      minDotSize: 0.4,
      maxDotSize: 6.8,
      dotVariation: 8,
      randomness: 0,
      jitter: 0,
      organicity: 0,
      grunge: 0,
      distortion: 0,
      contrast: 34,
      blackLevel: 16,
      whiteLevel: 236,
      colorMode: 'monochrome',
      inkColor: '#000000',
      backgroundColor: '#FFFFFF',
    },
  },
  {
    id: 'soft-halftone',
    name: 'Soft Halftone',
    category: 'Halftone',
    description: 'Gentle newsprint-style 45° halftone with smooth midtones and balanced contrast.',
    settings: {
      ...DEFAULT_STIPPLE_SETTINGS,
      patternType: 'jittered',
      dotShape: 'circle',
      patternAngle: 45,
      cellSize: 5.4,
      dotSize: 3.9,
      dotDensity: 72,
      dotSpacing: 5.2,
      minDotSize: 0.45,
      maxDotSize: 5.4,
      dotVariation: 14,
      contrast: 16,
      gamma: 1.12,
      midtoneStrength: 105,
      smoothing: 16,
      randomness: 14,
      jitter: 18,
      grunge: 5,
      colorMode: 'monochrome',
      inkColor: '#000000',
      backgroundColor: '#FFFFFF',
    },
  },
  {
    id: 'grunge-stipple',
    name: 'Grunge Stipple',
    category: 'Grunge & Print',
    description: 'Brutalist Y2K punk collage stipple with pitch-black shadows and distressed grit.',
    settings: {
      ...DEFAULT_STIPPLE_SETTINGS,
      patternType: 'adaptive',
      dotShape: 'organic',
      dotRoundness: 34,
      dotSize: 4.6,
      dotDensity: 78,
      dotSpacing: 4.6,
      minDotSize: 0.45,
      maxDotSize: 7.8,
      dotVariation: 46,
      contrast: 48,
      blackLevel: 22,
      whiteLevel: 232,
      threshold: 16,
      shadowStrength: 148,
      shadowDensity: 155,
      highlightSparsity: 86,
      randomness: 52,
      jitter: 58,
      organicity: 68,
      noise: 36,
      noiseScale: 36,
      noiseStrength: 45,
      grunge: 38,
      grungeScale: 50,
      grungeStrength: 52,
      distortion: 12,
      colorMode: 'monochrome',
      inkColor: '#000000',
      backgroundColor: '#FFFFFF',
    },
  },
  {
    id: 'punk-poster',
    name: 'Punk Poster',
    category: 'Grunge & Print',
    description: 'High-contrast xerox zine aesthetic with duotone crimson/black ink and raw threshold grit.',
    settings: {
      ...DEFAULT_STIPPLE_SETTINGS,
      patternType: 'jittered',
      dotShape: 'organic',
      patternAngle: 22,
      dotSize: 4.8,
      dotDensity: 78,
      dotSpacing: 5.0,
      minDotSize: 0.6,
      maxDotSize: 8.2,
      dotVariation: 40,
      contrast: 56,
      threshold: 22,
      thresholdPoint: 130,
      shadowStrength: 150,
      shadowDensity: 155,
      grunge: 42,
      grungeScale: 46,
      grungeStrength: 52,
      jitter: 44,
      colorMode: 'duotone',
      inkColor: '#000000',
      secondaryInkColor: '#E11D48',
      colorThreshold: 58,
      colorSeparation: 35,
      backgroundColor: '#FFFFFF',
    },
  },
  {
    id: 'y2k',
    name: 'Y2K Cyber',
    category: 'Artistic',
    description: 'Stretched geometric diamond matrix with directional warp and duotone electric ink.',
    settings: {
      ...DEFAULT_STIPPLE_SETTINGS,
      patternType: 'regular',
      dotShape: 'diamond',
      patternAngle: -30,
      dotSize: 4.6,
      dotDensity: 76,
      dotSpacing: 5.2,
      dotAspect: 1.45,
      dotStretch: 35,
      contrast: 38,
      distortion: 40,
      distortionScale: 75,
      distortionStrength: 42,
      randomness: 8,
      jitter: 6,
      grunge: 0,
      colorMode: 'duotone',
      inkColor: '#000000',
      secondaryInkColor: '#2563EB',
      colorThreshold: 50,
      colorSeparation: 25,
      backgroundColor: '#FFFFFF',
    },
  },
  {
    id: 'vintage-print',
    name: 'Vintage Print',
    category: 'Grunge & Print',
    description: 'Aged lithography press with deep black ink, subtle paper grain dropouts, and warm stock.',
    settings: {
      ...DEFAULT_STIPPLE_SETTINGS,
      patternType: 'jittered',
      dotShape: 'ellipse',
      patternAngle: 30,
      dotAspect: 1.15,
      dotSize: 4.2,
      dotDensity: 74,
      dotSpacing: 5.0,
      contrast: 32,
      gamma: 1.0,
      randomness: 26,
      jitter: 30,
      noise: 30,
      noiseScale: 32,
      noiseStrength: 36,
      grunge: 34,
      grungeScale: 68,
      grungeStrength: 42,
      colorMode: 'monochrome',
      inkColor: '#000000',
      backgroundColor: '#F5F0E6',
    },
  },
  {
    id: 'comic-pop-art',
    name: 'Comic Pop Art',
    category: 'Halftone',
    description: 'Bold multi-layer CMYK-inspired screen print with registration offset and crisp circular Ben-Day dots.',
    settings: {
      ...DEFAULT_STIPPLE_SETTINGS,
      patternType: 'regular',
      dotShape: 'circle',
      patternAngle: 15,
      dotSize: 4.8,
      dotDensity: 80,
      dotSpacing: 5.2,
      minDotSize: 0.7,
      maxDotSize: 7.2,
      dotVariation: 12,
      contrast: 38,
      edgeStrength: 82,
      edgeContrast: 55,
      randomness: 5,
      jitter: 4,
      grunge: 0,
      colorMode: 'multicolor',
      colorCount: 4,
      colorSaturation: 145,
      colorSeparation: 40,
      backgroundColor: '#FFFFFF',
    },
  },
  {
    id: 'high-contrast',
    name: 'High Contrast',
    category: 'Classic',
    description: 'Stark brutalist noir with crushed pitch-black shadows, blown-out highlights, and razor edge definition.',
    settings: {
      ...DEFAULT_STIPPLE_SETTINGS,
      patternType: 'adaptive',
      dotShape: 'circle',
      dotSize: 4.6,
      dotDensity: 82,
      dotSpacing: 4.5,
      maxDotSize: 8.2,
      contrast: 62,
      blackLevel: 26,
      whiteLevel: 226,
      threshold: 22,
      shadowStrength: 158,
      shadowDensity: 162,
      highlightSparsity: 90,
      edgeStrength: 90,
      edgeContrast: 64,
      colorMode: 'monochrome',
      inkColor: '#000000',
      backgroundColor: '#FFFFFF',
    },
  },
  {
    id: 'extreme-organic',
    name: 'Extreme Organic',
    category: 'Artistic',
    description: 'Swirling phyllotaxis and flow-field warped ink splatters with zero mechanical grid alignment.',
    settings: {
      ...DEFAULT_STIPPLE_SETTINGS,
      patternType: 'organic',
      dotShape: 'organic',
      dotRoundness: 28,
      dotSize: 4.4,
      dotDensity: 78,
      dotSpacing: 4.8,
      dotVariation: 54,
      sizeRandomness: 42,
      positionRandomness: 60,
      rotationRandomness: 100,
      organicity: 92,
      randomness: 75,
      jitter: 80,
      distortion: 48,
      distortionScale: 52,
      distortionStrength: 48,
      noise: 42,
      grunge: 30,
      colorMode: 'monochrome',
      inkColor: '#000000',
      backgroundColor: '#FFFFFF',
    },
  },
  {
    id: 'minimal-dots',
    name: 'Minimal Dots',
    category: 'Artistic',
    description: 'Clean architectural dot matrix with generous spacing and geometric precision.',
    settings: {
      ...DEFAULT_STIPPLE_SETTINGS,
      patternType: 'regular',
      dotShape: 'circle',
      patternAngle: 0,
      dotSize: 5.8,
      dotDensity: 56,
      dotSpacing: 9.5,
      cellSize: 9.5,
      minDotSize: 0.9,
      maxDotSize: 8.5,
      dotVariation: 14,
      randomness: 0,
      jitter: 0,
      grunge: 0,
      distortion: 0,
      contrast: 34,
      colorMode: 'monochrome',
      inkColor: '#000000',
      backgroundColor: '#FFFFFF',
    },
  },
  {
    id: 'portrait-stipple',
    name: 'Portrait Stipple',
    category: 'Classic',
    description: 'Tuned for facial features, eyes, and lips with deep shadows and smooth midtone stipple gradation.',
    settings: {
      ...DEFAULT_STIPPLE_SETTINGS,
      patternType: 'adaptive',
      dotShape: 'circle',
      dotSize: 3.7,
      dotDensity: 76,
      dotSpacing: 4.5,
      minDotSize: 0.35,
      maxDotSize: 6.0,
      dotVariation: 28,
      contrast: 28,
      gamma: 1.08,
      blackLevel: 14,
      whiteLevel: 238,
      localContrast: 42,
      detail: 80,
      edgeStrength: 82,
      edgePreservation: 80,
      edgeBias: 70,
      edgeDetail: 72,
      adaptiveStrength: 88,
      shadowStrength: 132,
      shadowDensity: 140,
      midtoneDensity: 96,
      highlightSparsity: 82,
      randomness: 32,
      jitter: 38,
      grunge: 8,
      colorMode: 'monochrome',
      inkColor: '#000000',
      backgroundColor: '#FFFFFF',
    },
  },
];

export type StudioMode = 'stipple' | 'vintage-pop';
export type PopHalftoneStyle = 'dots' | 'lines' | 'grain' | 'crosshatch' | 'diamond' | 'xerox-solid';
export type PopStickerStyle = 'smooth' | 'torn-paper' | 'clean' | 'none';
export type PopColoringMode =
  | 'cmyk-risograph'
  | 'smooth-gradient'
  | 'photo-pop'
  | 'monochrome-noir'
  | 'tri-color'
  | 'duotone-pop'
  | 'selective-accent';
export type PaperTextureStyle = 'newsprint' | 'kraft' | 'aged-comic' | 'clean' | 'none';

export interface VintagePopSettings {
  stickerBorderEnabled: boolean;
  stickerBorderWidth: number;
  stickerBorderStyle: PopStickerStyle;
  stickerBorderColor: string;
  stickerBorderShiftX: number;
  stickerBorderShiftY: number;
  stickerShadow: boolean;
  stickerShadowBlur: number;
  stickerShadowColor: string;
  accentCutoutEnabled: boolean;
  accentCutoutWidth: number;
  accentCutoutColor: string;
  accentCutoutShiftX: number;
  accentCutoutShiftY: number;
  autoExtractCutout: boolean;
  cutoutTolerance: number;

  halftoneStyle: PopHalftoneStyle;
  dotScale: number;
  dotAngle: number;
  contrast: number;
  brightness: number;
  threshold: number;
  invertInk: boolean;
  grainIntensity: number;
  inkDensity: number;

  coloringMode: PopColoringMode;
  colorSoftness: number;
  paletteId: string;
  inkColor: string;
  accentColor1: string;
  accentColor2: string;
  accentColor3: string;
  backgroundColor: string;
  isBackgroundTransparent: boolean;

  paperTextureStyle: PaperTextureStyle;
  paperTextureIntensity: number;

  colorShiftEnabled: boolean;
  colorShiftX: number;
  colorShiftY: number;
  colorShiftBlend: GlobalCompositeOperation;

  sunburstEnabled: boolean;
  sunburstRays: number;
  sunburstColor1: string;
  sunburstColor2: string;
  sunburstPosition: 'inside-object' | 'behind-cutout';
  sunburstCenterX: number;
  sunburstCenterY: number;

  comicBgScreenEnabled: boolean;
  comicBgDotSize: number;
  comicBgColor: string;

  outputWidth: number;
  outputHeight: number;
  scale?: number;
  offsetX?: number;
  offsetY?: number;
  autoFitMode?: AutoFitMode;
  mergeShapes: boolean;
}

export interface VintagePopPreset {
  id: string;
  name: string;
  category: string;
  description: string;
  settings: Partial<VintagePopSettings>;
}

export const DEFAULT_VINTAGE_POP_SETTINGS: VintagePopSettings = {
  stickerBorderEnabled: false,
  stickerBorderWidth: 16,
  stickerBorderStyle: 'smooth',
  stickerBorderColor: '#FFFFFF',
  stickerBorderShiftX: 0,
  stickerBorderShiftY: 0,
  stickerShadow: false,
  stickerShadowBlur: 14,
  stickerShadowColor: 'rgba(0, 0, 0, 0.38)',
  accentCutoutEnabled: false,
  accentCutoutWidth: 6,
  accentCutoutColor: '#E52521',
  accentCutoutShiftX: 0,
  accentCutoutShiftY: 0,
  autoExtractCutout: false,
  cutoutTolerance: 20,

  halftoneStyle: 'dots',
  dotScale: 9,
  dotAngle: 45,
  contrast: 38,
  brightness: 8,
  threshold: 50,
  invertInk: false,
  grainIntensity: 20,
  inkDensity: 85,

  coloringMode: 'cmyk-risograph',
  colorSoftness: 75,
  paletteId: 'cmyk-golden-age',
  inkColor: '#141416',
  accentColor1: '#E52521', // Bold Scarlet Red
  accentColor2: '#00AEEF', // Vibrant Cyan
  accentColor3: '#FFD100', // Canary Yellow
  backgroundColor: '#1C1D24',
  isBackgroundTransparent: false,

  paperTextureStyle: 'newsprint',
  paperTextureIntensity: 35,

  colorShiftEnabled: true,
  colorShiftX: 4,
  colorShiftY: -3,
  colorShiftBlend: 'multiply',

  sunburstEnabled: false,
  sunburstRays: 24,
  sunburstColor1: '#E52521',
  sunburstColor2: '#FFFFFF',
  sunburstPosition: 'inside-object',
  sunburstCenterX: 50,
  sunburstCenterY: 50,

  comicBgScreenEnabled: false,
  comicBgDotSize: 5,
  comicBgColor: '#2B2D3A',

  outputWidth: 4000,
  outputHeight: 4000,
  scale: 100,
  offsetX: 0,
  offsetY: 0,
  autoFitMode: 'long-edge',
  mergeShapes: false,
};

export const VINTAGE_POP_PRESETS: VintagePopPreset[] = [
  {
    id: 'cmyk-golden-age',
    name: 'CMYK Golden Age Comic',
    category: 'True Risograph',
    description: 'Authentic 4-color rosette screen print (Cyan, Magenta, Yellow, Key) with newsprint paper pulp texture.',
    settings: {
      ...DEFAULT_VINTAGE_POP_SETTINGS,
      coloringMode: 'cmyk-risograph',
      paletteId: 'cmyk-golden-age',
      halftoneStyle: 'dots',
      dotScale: 8,
      paperTextureStyle: 'newsprint',
      paperTextureIntensity: 45,
      stickerBorderWidth: 16,
      stickerBorderStyle: 'smooth',
      colorShiftEnabled: true,
      colorShiftX: 3,
      colorShiftY: -2,
    },
  },
  {
    id: 'monochrome-noir-bw',
    name: 'Pure Monochrome Noir B&W',
    category: 'Classic B&W',
    description: 'Crisp black & white comic newspaper lithograph with punchy contrast, ink halftone, and white sticker border.',
    settings: {
      ...DEFAULT_VINTAGE_POP_SETTINGS,
      coloringMode: 'monochrome-noir',
      paletteId: 'monochrome-noir-bw',
      inkColor: '#000000',
      accentColor1: '#262626',
      accentColor2: '#737373',
      accentColor3: '#F5F5F5',
      halftoneStyle: 'dots',
      dotScale: 8,
      contrast: 46,
      brightness: 6,
      colorSoftness: 70,
      paperTextureStyle: 'newsprint',
      paperTextureIntensity: 30,
      colorShiftEnabled: false,
    },
  },
  {
    id: 'warhol-factory-1968',
    name: 'Andy Warhol Factory 1968',
    category: 'Iconic Pop Art',
    description: 'Electric hot pink, vibrant cyan & yellow smooth silkscreen gradient with intense pop contrast.',
    settings: {
      ...DEFAULT_VINTAGE_POP_SETTINGS,
      coloringMode: 'smooth-gradient',
      colorSoftness: 80,
      paletteId: 'warhol-factory-1968',
      halftoneStyle: 'dots',
      dotScale: 9,
      accentColor1: '#FF007F',
      accentColor2: '#00F0FF',
      accentColor3: '#FFE600',
      paperTextureStyle: 'newsprint',
      paperTextureIntensity: 25,
      stickerBorderWidth: 16,
      colorShiftEnabled: true,
      colorShiftX: 5,
      colorShiftY: -3,
    },
  },
  {
    id: 'y2k-acid-streetwear',
    name: 'Y2K Acid Streetwear',
    category: 'Trending Stock Seller',
    description: 'Acid neon lime, hot magenta & cyber cyan streetwear sticker look with intense contrast and comic dots.',
    settings: {
      ...DEFAULT_VINTAGE_POP_SETTINGS,
      coloringMode: 'smooth-gradient',
      colorSoftness: 82,
      paletteId: 'y2k-acid-streetwear',
      stickerBorderWidth: 18,
      stickerBorderStyle: 'smooth',
      halftoneStyle: 'dots',
      dotScale: 8,
      inkColor: '#0A0A0A',
      accentColor1: '#F43F5E', // Hot Magenta
      accentColor2: '#06B6D4', // Cyber Cyan
      accentColor3: '#A3E635', // Acid Lime
      contrast: 48,
      brightness: 8,
      colorShiftEnabled: true,
      colorShiftX: 4,
      colorShiftY: -3,
      paperTextureStyle: 'clean',
    },
  },
  {
    id: 'japanese-city-pop',
    name: 'Tokyo 80s City-Pop',
    category: 'Retro Anime & Music',
    description: 'Sunset coral, sky cyan & pastel gold vintage Japanese anime poster look with fine Ben-Day screens.',
    settings: {
      ...DEFAULT_VINTAGE_POP_SETTINGS,
      coloringMode: 'smooth-gradient',
      colorSoftness: 85,
      paletteId: 'japanese-city-pop',
      stickerBorderWidth: 16,
      stickerBorderStyle: 'smooth',
      halftoneStyle: 'dots',
      dotScale: 7,
      inkColor: '#1E1B4B', // Deep Indigo Ink
      accentColor1: '#FB7185', // Sunset Coral
      accentColor2: '#38BDF8', // Sky Cyan
      accentColor3: '#FBBF24', // Pastel Gold
      contrast: 34,
      brightness: 12,
      colorShiftEnabled: true,
      colorShiftX: 3,
      colorShiftY: -2,
      paperTextureStyle: 'newsprint',
      paperTextureIntensity: 20,
    },
  },
  {
    id: 'bauhaus-modern',
    name: 'Bauhaus Mid-Century',
    category: 'High-Value Wall Art',
    description: 'Clean modernist 3-tone poster aesthetic with vermilion red, deep cobalt blue, and mustard ochre.',
    settings: {
      ...DEFAULT_VINTAGE_POP_SETTINGS,
      coloringMode: 'tri-color',
      colorSoftness: 70,
      paletteId: 'bauhaus-modern',
      stickerBorderWidth: 16,
      stickerBorderStyle: 'smooth',
      halftoneStyle: 'dots',
      dotScale: 9,
      inkColor: '#18181B',
      accentColor1: '#DC2626', // Vermilion Red
      accentColor2: '#1D4ED8', // Cobalt Blue
      accentColor3: '#D97706', // Mustard Gold
      contrast: 40,
      brightness: 10,
      colorShiftEnabled: false,
      paperTextureStyle: 'newsprint',
      paperTextureIntensity: 35,
    },
  },
  {
    id: 'vintage-engraved-litho',
    name: 'Vintage Engraved Litho',
    category: 'Apparel & T-Shirt',
    description: 'Intaglio engraved line screen with espresso dark ink, warm antique paper stock, and heritage linework.',
    settings: {
      ...DEFAULT_VINTAGE_POP_SETTINGS,
      coloringMode: 'duotone-pop',
      colorSoftness: 50,
      paletteId: 'vintage-engraved-litho',
      stickerBorderWidth: 18,
      stickerBorderStyle: 'smooth',
      halftoneStyle: 'lines',
      dotScale: 7,
      dotAngle: 60,
      inkColor: '#1C1917', // Espresso Dark Ink
      accentColor1: '#78350F', // Antique Sepia
      accentColor2: '#A16207',
      accentColor3: '#FEF3C7',
      contrast: 46,
      brightness: 8,
      colorShiftEnabled: false,
      paperTextureStyle: 'aged-comic',
      paperTextureIntensity: 45,
    },
  },
  {
    id: 'photo-pop-technicolor',
    name: 'Technicolor Photo Pop',
    category: 'Preserve Photo Colors',
    description: 'Preserves your original subject photo colors (skin tones, clothes) boosted into rich vibrant pop art with comic shading.',
    settings: {
      ...DEFAULT_VINTAGE_POP_SETTINGS,
      coloringMode: 'photo-pop',
      paletteId: 'photo-pop-technicolor',
      halftoneStyle: 'dots',
      dotScale: 7,
      contrast: 32,
      brightness: 12,
      paperTextureStyle: 'newsprint',
      paperTextureIntensity: 25,
      stickerBorderWidth: 16,
      colorShiftEnabled: false,
    },
  },
  {
    id: 'french-editorial-riso',
    name: 'French Editorial Risograph',
    category: 'Indie & Packaging Bestseller',
    description: 'Chic 3-color Mediterranean risograph print with tangerine orange, marine teal, warm newsprint pulp, and subtle registration shift.',
    settings: {
      ...DEFAULT_VINTAGE_POP_SETTINGS,
      coloringMode: 'smooth-gradient',
      colorSoftness: 78,
      paletteId: 'french-editorial-riso',
      stickerBorderWidth: 16,
      stickerBorderStyle: 'smooth',
      halftoneStyle: 'dots',
      dotScale: 8,
      inkColor: '#0F172A', // Slate Deep Navy Ink
      accentColor1: '#EA580C', // Tangerine Orange
      accentColor2: '#0D9488', // Marine Teal
      accentColor3: '#FDE047', // Warm Sun Yellow
      contrast: 38,
      brightness: 10,
      colorShiftEnabled: true,
      colorShiftX: 3,
      colorShiftY: -2,
      paperTextureStyle: 'newsprint',
      paperTextureIntensity: 35,
    },
  },
  {
    id: 'miami-neon-80s',
    name: 'Miami Synthwave 80s',
    category: 'Neon Pop',
    description: 'Hot bubblegum pink and cyber cyan with deep black halftone shading and misregistration offset.',
    settings: {
      ...DEFAULT_VINTAGE_POP_SETTINGS,
      coloringMode: 'smooth-gradient',
      colorSoftness: 80,
      paletteId: 'miami-neon-pop',
      stickerBorderWidth: 14,
      stickerBorderStyle: 'smooth',
      halftoneStyle: 'dots',
      dotScale: 8,
      accentColor1: '#FF007F',
      accentColor2: '#00F0FF',
      accentColor3: '#FFE600',
      colorShiftEnabled: true,
      colorShiftX: 5,
      colorShiftY: -2,
    },
  },
  {
    id: 'transparent-sticker-cutout',
    name: 'Transparent Sticker Cutout',
    category: 'Microstock Asset',
    description: 'Isolated transparent PNG asset with crisp white sticker die-cut border ready for stock submission.',
    settings: {
      ...DEFAULT_VINTAGE_POP_SETTINGS,
      coloringMode: 'smooth-gradient',
      colorSoftness: 80,
      paletteId: 'transparent-sticker-cutout',
      isBackgroundTransparent: true,
      stickerBorderWidth: 18,
      stickerBorderStyle: 'smooth',
      stickerShadow: false,
      halftoneStyle: 'dots',
      dotScale: 8,
      accentColor1: '#E52521',
      accentColor2: '#00AEEF',
    },
  },
];

