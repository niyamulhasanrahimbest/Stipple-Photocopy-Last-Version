import { StippleSettings, VectorDot } from '../types/stipple';

export interface SVGValidationReport {
  valid: boolean;
  errors: string[];
  vectorElementCount: number;
  byteSize: number;
}

function fmt(val: number, precision: number, optimize = true): string {
  if (!Number.isFinite(val)) return '0';
  if (precision === 0) return Math.round(val).toString();
  if (!optimize) {
    return val.toFixed(precision);
  }
  const factor = Math.pow(10, precision);
  return (Math.round(val * factor) / factor).toString().replace(/^0\./, '.').replace(/^-0\./, '-.');
}

/**
 * Ramer-Douglas-Peucker algorithm to simplify path points
 */
function simplifyPath(points: [number, number][], tolerance: number): [number, number][] {
  if (points.length <= 2) return points;
  let dmax = 0;
  let index = 0;
  const end = points.length - 1;
  const [p1x, p1y] = points[0];
  const [p2x, p2y] = points[end];

  for (let i = 1; i < end; i++) {
    const [px, py] = points[i];
    // Distance from point to line segment
    const d = Math.abs((p2y - p1y) * px - (p2x - p1x) * py + p2x * p1y - p2y * p1x) /
      Math.sqrt(Math.pow(p2y - p1y, 2) + Math.pow(p2x - p1x, 2));
    if (d > dmax) {
      index = i;
      dmax = d;
    }
  }

  if (dmax > tolerance) {
    return [
      ...simplifyPath(points.slice(0, index + 1), tolerance).slice(0, -1),
      ...simplifyPath(points.slice(index), tolerance),
    ];
  } else {
    return [points[0], points[end]];
  }
}

/**
 * Generates an authentic, asymmetric ink-splat / pen-nib closed bezier path around (cx, cy)
 */
function buildOrganicDotPath(
  dot: VectorDot,
  precision: number,
  optimize = true,
  simplify = 0
): string {
  const pts = 8;
  const { x, y, rx, ry, rotation, roundness, seedOffset } = dot;
  const rotRad = (rotation * Math.PI) / 180;
  const cosR = Math.cos(rotRad);
  const sinR = Math.sin(rotRad);

  // Irregularity increases as roundness decreases from 100 -> 0 (default 45 gives expressive organic ink lobes)
  const irreg = (1 - roundness / 100) * 0.52 + 0.24;
  const phase1 = seedOffset * 41.3;
  const phase2 = seedOffset * 83.7 + 1.3;
  const phase3 = seedOffset * 127.1 + 2.6;
  const splatStretch = 1.0 + Math.sin(seedOffset * 23.9) * (0.28 * irreg);

  let vertices: [number, number][] = [];

  for (let i = 0; i < pts; i++) {
    const baseAngle = (i / pts) * Math.PI * 2;
    // Continuous multi-harmonic ink-bleed lobes so adjacent vertices form real organic protrusions & indentations
    const lobe2 = Math.cos(baseAngle * 2 + phase1) * 0.38;
    const lobe3 = Math.sin(baseAngle * 3 + phase2) * 0.34;
    const lobe4 = Math.cos(baseAngle * 4 + phase3) * 0.22;
    const wave = (lobe2 + lobe3 + lobe4) * irreg;

    const localRMult = Math.max(0.42, (1.0 + wave) * 1.14);
    const lx = Math.cos(baseAngle) * rx * splatStretch * localRMult;
    const ly = Math.sin(baseAngle) * (ry / splatStretch) * localRMult;

    const wx = x + lx * cosR - ly * sinR;
    const wy = y + lx * sinR + ly * cosR;
    vertices.push([wx, wy]);
  }

  // Apply simplification if requested
  if (simplify > 0) {
    vertices = simplifyPath(vertices, simplify);
  }

  // Construct smooth closed quadratic spline that closely hugs the organic ink lobes
  const mid0X = (vertices[vertices.length - 1][0] + vertices[0][0]) * 0.5;
  const mid0Y = (vertices[vertices.length - 1][1] + vertices[0][1]) * 0.5;
  let d = `M${fmt(mid0X, precision, optimize)},${fmt(mid0Y, precision, optimize)}`;

  for (let i = 0; i < vertices.length; i++) {
    const prev = vertices[(i + vertices.length - 1) % vertices.length];
    const curr = vertices[i];
    const next = vertices[(i + 1) % vertices.length];
    const prevMidX = (prev[0] + curr[0]) * 0.5;
    const prevMidY = (prev[1] + curr[1]) * 0.5;
    const nextMidX = (curr[0] + next[0]) * 0.5;
    const nextMidY = (curr[1] + next[1]) * 0.5;

    const avgMidX = (prevMidX + nextMidX) * 0.5;
    const avgMidY = (prevMidY + nextMidY) * 0.5;
    // Push control point outward so the quadratic curve peak reaches the organic lobe vertex
    const ctrlX = avgMidX + (curr[0] - avgMidX) * 1.65;
    const ctrlY = avgMidY + (curr[1] - avgMidY) * 1.65;

    d += `Q${fmt(ctrlX, precision, optimize)},${fmt(ctrlY, precision, optimize)},${fmt(nextMidX, precision, optimize)},${fmt(nextMidY, precision, optimize)}`;
  }
  d += 'Z';
  return d;
}

/**
 * Renders a single VectorDot as an individual SVG element string (<circle>, <ellipse>, <rect>, <polygon>, or <path>)
 */
function renderSingleDotElement(
  dot: VectorDot,
  precision: number,
  includeFill: boolean,
  optimize = true,
  simplify = 0
): string {
  const { x, y, r, rx, ry, rotation, color, shape, roundness } = dot;
  const fillAttr = includeFill ? ` fill="${color}"` : '';
  const cxStr = fmt(x, precision, optimize);
  const cyStr = fmt(y, precision, optimize);
  const isRotated = Math.abs(rotation) > 0.5;
  const rotAttr = isRotated
    ? ` transform="rotate(${fmt(rotation, 1, optimize)} ${cxStr} ${cyStr})"`
    : '';

  const isUniformAspect = Math.abs(rx - ry) < 0.04;

  if (shape === 'circle' && isUniformAspect) {
    return `<circle cx="${cxStr}" cy="${cyStr}" r="${fmt(r, precision, optimize)}"${fillAttr}/>`;
  }

  if (shape === 'circle' || shape === 'ellipse') {
    return `<ellipse cx="${cxStr}" cy="${cyStr}" rx="${fmt(rx, precision, optimize)}" ry="${fmt(ry, precision, optimize)}"${rotAttr}${fillAttr}/>`;
  }

  if (shape === 'square') {
    const w = fmt(rx * 1.84, precision, optimize);
    const h = fmt(ry * 1.84, precision, optimize);
    const x0 = fmt(x - rx * 0.92, precision, optimize);
    const y0 = fmt(y - ry * 0.92, precision, optimize);
    return `<rect x="${x0}" y="${y0}" width="${w}" height="${h}"${rotAttr}${fillAttr}/>`;
  }

  if (shape === 'rounded-square') {
    const hw = rx * 1.08;
    const hh = ry * 1.08;
    const w = fmt(hw * 2, precision, optimize);
    const h = fmt(hh * 2, precision, optimize);
    const x0 = fmt(x - hw, precision, optimize);
    const y0 = fmt(y - hh, precision, optimize);
    // Keep straight edges clearly visible while rounding corners smoothly (39% of half-side at default 45, max 58% at 100)
    const cornerRatio = 0.24 + (Math.max(5, roundness) / 100) * 0.34;
    const cornerR = fmt(Math.min(hw, hh) * cornerRatio, precision, optimize);
    return `<rect x="${x0}" y="${y0}" width="${w}" height="${h}" rx="${cornerR}" ry="${cornerR}"${rotAttr}${fillAttr}/>`;
  }

  if (shape === 'diamond') {
    const dx = rx * 1.38;
    const dy = ry * 1.38;
    const p1 = `${cxStr},${fmt(y - dy, precision, optimize)}`;
    const p2 = `${fmt(x + dx, precision, optimize)},${cyStr}`;
    const p3 = `${cxStr},${fmt(y + dy, precision, optimize)}`;
    const p4 = `${fmt(x - dx, precision, optimize)},${cyStr}`;
    return `<polygon points="${p1} ${p2} ${p3} ${p4}"${rotAttr}${fillAttr}/>`;
  }

  // 'organic'
  const dPath = buildOrganicDotPath(dot, precision, optimize, simplify);
  return `<path d="${dPath}"${fillAttr}/>`;
}

/**
 * Renders a single VectorDot as a compact SVG path sub-command for compound path merging
 */
function renderDotPathSubcommand(
  dot: VectorDot,
  precision: number,
  optimize = true,
  simplify = 0
): string {
  const { x, y, r, rx, ry, rotation, roundness, shape } = dot;
  if (shape === 'organic') {
    return buildOrganicDotPath(dot, precision, optimize, simplify);
  }

  const rotRad = (rotation * Math.PI) / 180;
  const cosR = Math.cos(rotRad);
  const sinR = Math.sin(rotRad);
  const rotPt = (lx: number, ly: number): string => {
    const wx = x + lx * cosR - ly * sinR;
    const wy = y + lx * sinR + ly * cosR;
    return `${fmt(wx, precision, optimize)},${fmt(wy, precision, optimize)}`;
  };

  if (shape === 'diamond') {
    const dx = rx * 1.38;
    const dy = ry * 1.38;
    return `M${rotPt(0, -dy)}L${rotPt(dx, 0)}L${rotPt(0, dy)}L${rotPt(-dx, 0)}Z`;
  }

  if (shape === 'square') {
    const hw = rx * 0.92;
    const hh = ry * 0.92;
    if (Math.abs(rotation) <= 0.5) {
      return `M${fmt(x - hw, precision, optimize)},${fmt(y - hh, precision, optimize)}h${fmt(hw * 2, precision, optimize)}v${fmt(hh * 2, precision, optimize)}h${fmt(-hw * 2, precision, optimize)}Z`;
    }
    return `M${rotPt(-hw, -hh)}L${rotPt(hw, -hh)}L${rotPt(hw, hh)}L${rotPt(-hw, hh)}Z`;
  }

  if (shape === 'rounded-square') {
    const hw = rx * 1.08;
    const hh = ry * 1.08;
    const cornerRatio = 0.24 + (Math.max(5, roundness) / 100) * 0.34;
    const cr = Math.min(hw, hh) * cornerRatio;
    return (
      `M${rotPt(-hw + cr, -hh)}` +
      `L${rotPt(hw - cr, -hh)}Q${rotPt(hw, -hh)} ${rotPt(hw, -hh + cr)}` +
      `L${rotPt(hw, hh - cr)}Q${rotPt(hw, hh)} ${rotPt(hw - cr, hh)}` +
      `L${rotPt(-hw + cr, hh)}Q${rotPt(-hw, hh)} ${rotPt(-hw, hh - cr)}` +
      `L${rotPt(-hw, -hh + cr)}Q${rotPt(-hw, -hh)} ${rotPt(-hw + cr, -hh)}Z`
    );
  }

  // Circle / Ellipse arc sub-path (with rotation angle support)
  const radX = rx || r;
  const radY = ry || r;
  const rxStr = fmt(radX, precision, optimize);
  const ryStr = fmt(radY, precision, optimize);
  const rotDegStr = fmt(rotation || 0, 1, optimize);
  const pStart = rotPt(-radX, 0);
  const pEnd = rotPt(radX, 0);
  return `M${pStart}A${rxStr},${ryStr} ${rotDegStr} 1,0 ${pEnd}A${rxStr},${ryStr} ${rotDegStr} 1,0 ${pStart}Z`;
}

/**
 * Resolves the effective background fill hex and opacity from settings
 */
export function resolveBackgroundStyle(settings: StippleSettings): {
  showBackground: boolean;
  fill: string;
  opacity: number;
} {
  if (
    settings.isBackgroundTransparent ||
    settings.backgroundMode === 'transparent' ||
    settings.backgroundOpacity <= 0
  ) {
    return { showBackground: false, fill: 'none', opacity: 0 };
  }

  let baseColor = '#FFFFFF';
  if (settings.backgroundMode === 'white') baseColor = '#FFFFFF';
  else if (settings.backgroundMode === 'black') baseColor = '#000000';
  else if (settings.backgroundMode === 'custom') baseColor = settings.backgroundColor || '#FFFFFF';

  if (settings.invertBackground) {
    const clean = baseColor.replace('#', '');
    const r = 255 - (parseInt(clean.slice(0, 2), 16) || 0);
    const g = 255 - (parseInt(clean.slice(2, 4), 16) || 0);
    const b = 255 - (parseInt(clean.slice(4, 6), 16) || 0);
    baseColor =
      '#' +
      r.toString(16).padStart(2, '0') +
      g.toString(16).padStart(2, '0') +
      b.toString(16).padStart(2, '0');
  }

  return {
    showBackground: true,
    fill: baseColor,
    opacity: Math.max(0, Math.min(1, settings.backgroundOpacity / 100)),
  };
}

/**
 * High-speed HTML5 Canvas 2D renderer for 60fps interactive preview of 100,000+ vector dots.
 * Renders visually identical geometry to buildSVGDocument without DOM node overhead.
 */
export function renderDotsToCanvas(
  canvas: HTMLCanvasElement,
  dots: VectorDot[],
  settings: StippleSettings,
  palette: string[]
): void {
  const outW = Math.max(4000, Math.round(settings.outputWidth));
  const outH = Math.max(4000, Math.round(settings.outputHeight));

  if (canvas.width !== outW) canvas.width = outW;
  if (canvas.height !== outH) canvas.height = outH;

  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  ctx.clearRect(0, 0, outW, outH);

  const bg = resolveBackgroundStyle(settings);
  if (bg.showBackground) {
    ctx.save();
    ctx.globalAlpha = bg.opacity;
    ctx.fillStyle = bg.fill;
    ctx.fillRect(0, 0, outW, outH);
    ctx.restore();
  }

  if (dots.length === 0) return;

  // Group dots by resolved fill color to batch Canvas path fills for maximum GPU speed
  const colorGroups = new Map<string, VectorDot[]>();
  const layerCount =
    settings.colorMode === 'duotone' ? 2 : Math.max(2, palette.length);

  for (let i = 0; i < dots.length; i++) {
    const d = dots[i];
    if (!Number.isFinite(d.x) || !Number.isFinite(d.y) || !Number.isFinite(d.r) || d.r <= 0) {
      continue;
    }

    let fillColor = d.color;
    if (settings.colorMode === 'monochrome') {
      fillColor = settings.inkColor;
    } else if (settings.colorMode === 'duotone' || settings.colorMode === 'multicolor') {
      const idx = Math.max(0, Math.min(layerCount - 1, d.layerIndex));
      fillColor =
        palette[idx] || (idx === 0 ? settings.inkColor : settings.secondaryInkColor);
    }

    let group = colorGroups.get(fillColor);
    if (!group) {
      group = [];
      colorGroups.set(fillColor, group);
    }
    group.push(d);
  }

  const traceOrganicDotToContext = (c: CanvasRenderingContext2D, dot: VectorDot) => {
    const pts = 8;
    const { x, y, rx, ry, rotation, roundness, seedOffset } = dot;
    const rotRad = (rotation * Math.PI) / 180;
    const cosR = Math.cos(rotRad);
    const sinR = Math.sin(rotRad);

    const irreg = (1 - roundness / 100) * 0.52 + 0.24;
    const phase1 = seedOffset * 41.3;
    const phase2 = seedOffset * 83.7 + 1.3;
    const phase3 = seedOffset * 127.1 + 2.6;
    const splatStretch = 1.0 + Math.sin(seedOffset * 23.9) * (0.28 * irreg);

    const vx = new Float32Array(pts);
    const vy = new Float32Array(pts);

    for (let i = 0; i < pts; i++) {
      const baseAngle = (i / pts) * Math.PI * 2;
      const lobe2 = Math.cos(baseAngle * 2 + phase1) * 0.38;
      const lobe3 = Math.sin(baseAngle * 3 + phase2) * 0.34;
      const lobe4 = Math.cos(baseAngle * 4 + phase3) * 0.22;
      const wave = (lobe2 + lobe3 + lobe4) * irreg;

      const localRMult = Math.max(0.42, (1.0 + wave) * 1.14);
      const lx = Math.cos(baseAngle) * rx * splatStretch * localRMult;
      const ly = Math.sin(baseAngle) * (ry / splatStretch) * localRMult;

      vx[i] = x + lx * cosR - ly * sinR;
      vy[i] = y + lx * sinR + ly * cosR;
    }

    const mid0X = (vx[pts - 1] + vx[0]) * 0.5;
    const mid0Y = (vy[pts - 1] + vy[0]) * 0.5;
    c.moveTo(mid0X, mid0Y);

    for (let i = 0; i < pts; i++) {
      const prevIdx = (i + pts - 1) % pts;
      const nextIdx = (i + 1) % pts;
      const prevMidX = (vx[prevIdx] + vx[i]) * 0.5;
      const prevMidY = (vy[prevIdx] + vy[i]) * 0.5;
      const nextMidX = (vx[i] + vx[nextIdx]) * 0.5;
      const nextMidY = (vy[i] + vy[nextIdx]) * 0.5;

      const avgMidX = (prevMidX + nextMidX) * 0.5;
      const avgMidY = (prevMidY + nextMidY) * 0.5;
      const ctrlX = avgMidX + (vx[i] - avgMidX) * 1.65;
      const ctrlY = avgMidY + (vy[i] - avgMidY) * 1.65;

      c.quadraticCurveTo(ctrlX, ctrlY, nextMidX, nextMidY);
    }
    c.closePath();
  };

  const TWO_PI = Math.PI * 2;
  const BATCH_CHUNK = 8000;

  for (const [fillColor, groupDots] of colorGroups.entries()) {
    ctx.fillStyle = fillColor;
    const total = groupDots.length;

    for (let start = 0; start < total; start += BATCH_CHUNK) {
      const end = Math.min(total, start + BATCH_CHUNK);
      ctx.beginPath();

      for (let i = start; i < end; i++) {
        const dot = groupDots[i];
        const { x, y, r, rx, ry, rotation, shape, roundness } = dot;
        const isUniformAspect = Math.abs(rx - ry) < 0.04;
        const rotRad = Math.abs(rotation) > 0.5 ? (rotation * Math.PI) / 180 : 0;

        if (shape === 'circle' && isUniformAspect) {
          ctx.moveTo(x + r, y);
          ctx.arc(x, y, r, 0, TWO_PI);
        } else if (shape === 'circle' || shape === 'ellipse') {
          const cosR = Math.cos(rotRad);
          const sinR = Math.sin(rotRad);
          ctx.moveTo(x + rx * cosR, y + rx * sinR);
          ctx.ellipse(x, y, rx, ry, rotRad, 0, TWO_PI);
        } else if (shape === 'square') {
          const hw = rx * 0.92;
          const hh = ry * 0.92;
          if (rotRad === 0) {
            ctx.rect(x - hw, y - hh, hw * 2, hh * 2);
          } else {
            const cosR = Math.cos(rotRad);
            const sinR = Math.sin(rotRad);
            ctx.moveTo(x - hw * cosR + hh * sinR, y - hw * sinR - hh * cosR);
            ctx.lineTo(x + hw * cosR + hh * sinR, y + hw * sinR - hh * cosR);
            ctx.lineTo(x + hw * cosR - hh * sinR, y + hw * sinR + hh * cosR);
            ctx.lineTo(x - hw * cosR - hh * sinR, y - hw * sinR + hh * cosR);
            ctx.closePath();
          }
        } else if (shape === 'rounded-square') {
          const hw = rx * 1.08;
          const hh = ry * 1.08;
          const cornerRatio = 0.24 + (Math.max(5, roundness) / 100) * 0.34;
          const cr = Math.min(hw, hh) * cornerRatio;
          const cosR = Math.cos(rotRad);
          const sinR = Math.sin(rotRad);
          const rotX = (lx: number, ly: number) => x + lx * cosR - ly * sinR;
          const rotY = (lx: number, ly: number) => y + lx * sinR + ly * cosR;

          ctx.moveTo(rotX(-hw + cr, -hh), rotY(-hw + cr, -hh));
          ctx.lineTo(rotX(hw - cr, -hh), rotY(hw - cr, -hh));
          ctx.quadraticCurveTo(rotX(hw, -hh), rotY(hw, -hh), rotX(hw, -hh + cr), rotY(hw, -hh + cr));
          ctx.lineTo(rotX(hw, hh - cr), rotY(hw, hh - cr));
          ctx.quadraticCurveTo(rotX(hw, hh), rotY(hw, hh), rotX(hw - cr, hh), rotY(hw - cr, hh));
          ctx.lineTo(rotX(-hw + cr, hh), rotY(-hw + cr, hh));
          ctx.quadraticCurveTo(rotX(-hw, hh), rotY(-hw, hh), rotX(-hw, hh - cr), rotY(-hw, hh - cr));
          ctx.lineTo(rotX(-hw, -hh + cr), rotY(-hw, -hh + cr));
          ctx.quadraticCurveTo(rotX(-hw, -hh), rotY(-hw, -hh), rotX(-hw + cr, -hh), rotY(-hw + cr, -hh));
          ctx.closePath();
        } else if (shape === 'diamond') {
          const dx = rx * 1.38;
          const dy = ry * 1.38;
          if (rotRad === 0) {
            ctx.moveTo(x, y - dy);
            ctx.lineTo(x + dx, y);
            ctx.lineTo(x, y + dy);
            ctx.lineTo(x - dx, y);
            ctx.closePath();
          } else {
            const cosR = Math.cos(rotRad);
            const sinR = Math.sin(rotRad);
            ctx.moveTo(x + dy * sinR, y - dy * cosR);
            ctx.lineTo(x + dx * cosR, y + dx * sinR);
            ctx.lineTo(x - dy * sinR, y + dy * cosR);
            ctx.lineTo(x - dx * cosR, y - dx * sinR);
            ctx.closePath();
          }
        } else {
          traceOrganicDotToContext(ctx, dot);
        }
      }

      ctx.fill();
    }
  }
}

/**
 * Generates the complete, structured, editable SVG document string.
 * Strictly contains ONLY genuine vector geometry (<circle>, <ellipse>, <rect>, <polygon>, <path>).
 */
export function buildSVGDocument(
  dots: VectorDot[],
  settings: StippleSettings,
  palette: string[]
): string {
  const outW = Math.max(4000, Math.round(settings.outputWidth));
  const outH = Math.max(4000, Math.round(settings.outputHeight));
  const opt = settings.pathOptimization;
  const prec = settings.svgPrecision;
  const simp = settings.simplifyVector / 10; // Convert 0-100 to a reasonable tolerance
  // If shapes are merged, force precision to 1 for significant file size reduction
  const mergedPrec = settings.mergeShapes ? Math.min(prec, 1) : prec;

  const bg = resolveBackgroundStyle(settings);
  const lines: string[] = [];

  // Identify unique circular radii for <defs> optimization
  const circularRadii = new Set<number>();
  if (!settings.mergeShapes) {
    for (const dot of dots) {
      if (dot.shape === 'circle' && Math.abs(dot.rx - dot.ry) < 0.04) {
        circularRadii.add(dot.r);
      }
    }
  }

  lines.push(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${outW} ${outH}" width="${outW}" height="${outH}" shape-rendering="geometricPrecision">`
  );
  lines.push(`  <desc>Generated by Stipple Photocopy Maker — Pure Procedural SVG Vector Artwork (${dots.length} vector objects)</desc>`);

  // Inject <defs> for circular dot optimization
  if (circularRadii.size > 0) {
    lines.push(`  <defs>`);
    for (const r of circularRadii) {
      lines.push(`    <circle id="dot-${fmt(r, prec, opt).replace('.', '-')}" r="${fmt(r, prec, opt)}"/>`);
    }
    lines.push(`  </defs>`);
  }

  if (bg.showBackground) {
    const opAttr = bg.opacity < 0.999 ? ` fill-opacity="${fmt(bg.opacity, 2, opt)}"` : '';
    lines.push(`  <g id="background">`);
    lines.push(
      `    <rect x="0" y="0" width="${outW}" height="${outH}" fill="${bg.fill}"${opAttr}/>`
    );
    lines.push(`  </g>`);
  }

  lines.push(`  <g id="stipple">`);

  const renderDot = (dot: VectorDot, fill: string, useFillAttr: boolean): string => {
    if (!settings.mergeShapes && dot.shape === 'circle' && Math.abs(dot.rx - dot.ry) < 0.04) {
      const rId = fmt(dot.r, prec, opt).replace('.', '-');
      const fillAttr = useFillAttr ? ` fill="${fill}"` : '';
      return `<use xlink:href="#dot-${rId}" x="${fmt(dot.x, prec, opt)}" y="${fmt(dot.y, prec, opt)}"${fillAttr}/>`;
    }
    return renderSingleDotElement(dot, prec, useFillAttr, opt, simp);
  };

  if (settings.colorMode === 'monochrome') {
    const bandGroups: Record<'shadows' | 'midtones' | 'highlights', VectorDot[]> = {
      shadows: [],
      midtones: [],
      highlights: [],
    };

    for (let i = 0; i < dots.length; i++) {
      const d = dots[i];
      if (!Number.isFinite(d.x) || !Number.isFinite(d.y) || !Number.isFinite(d.r) || d.r <= 0) {
        continue;
      }
      bandGroups[d.toneBand].push(d);
    }

    for (const band of ['shadows', 'midtones', 'highlights'] as const) {
      const groupDots = bandGroups[band];
      if (groupDots.length === 0) continue;

      if (settings.mergeShapes) {
        const subpaths = groupDots.map((d) => renderDotPathSubcommand(d, mergedPrec, opt, simp)).join('');
        lines.push(`    <path d="${subpaths}" fill="${settings.inkColor}"/>`);
      } else {
        for (let i = 0; i < groupDots.length; i++) {
          lines.push(`    ${renderDot(groupDots[i], settings.inkColor, true)}`);
        }
      }
    }
  } else if (settings.colorMode === 'duotone' || settings.colorMode === 'multicolor') {
    const layerCount =
      settings.colorMode === 'duotone' ? 2 : Math.max(2, palette.length);
    const layers: VectorDot[][] = Array.from({ length: layerCount }, () => []);

    for (let i = 0; i < dots.length; i++) {
      const d = dots[i];
      if (!Number.isFinite(d.x) || !Number.isFinite(d.y) || !Number.isFinite(d.r) || d.r <= 0) {
        continue;
      }
      const idx = Math.max(0, Math.min(layerCount - 1, d.layerIndex));
      layers[idx].push(d);
    }

    for (let k = 0; k < layers.length; k++) {
      const layerDots = layers[k];
      if (layerDots.length === 0) continue;
      const layerColor =
        palette[k] || (k === 0 ? settings.inkColor : settings.secondaryInkColor);

      if (settings.mergeShapes) {
        const subpaths = layerDots.map((d) => renderDotPathSubcommand(d, mergedPrec, opt, simp)).join('');
        lines.push(`    <path d="${subpaths}" fill="${layerColor}"/>`);
      } else {
        for (let i = 0; i < layerDots.length; i++) {
          lines.push(`    ${renderDot(layerDots[i], layerColor, true)}`);
        }
      }
    }
  } else {
    // 'original' color mode
    const bandGroups: Record<'shadows' | 'midtones' | 'highlights', VectorDot[]> = {
      shadows: [],
      midtones: [],
      highlights: [],
    };

    for (let i = 0; i < dots.length; i++) {
      const d = dots[i];
      if (!Number.isFinite(d.x) || !Number.isFinite(d.y) || !Number.isFinite(d.r) || d.r <= 0) {
        continue;
      }
      bandGroups[d.toneBand].push(d);
    }

    for (const band of ['shadows', 'midtones', 'highlights'] as const) {
      const groupDots = bandGroups[band];
      if (groupDots.length === 0) continue;

      if (settings.mergeShapes) {
        for (let i = 0; i < groupDots.length; i++) {
          lines.push(`    <path d="${renderDotPathSubcommand(groupDots[i], mergedPrec, opt, simp)}" fill="${groupDots[i].color}"/>`);
        }
      } else {
        for (let i = 0; i < groupDots.length; i++) {
          lines.push(`    ${renderDot(groupDots[i], groupDots[i].color, true)}`);
        }
      }
    }
  }

  lines.push(`  </g>`);
  lines.push(`</svg>`);

  return lines.join('\n');
}

/**
 * Validates the generated SVG string prior to export (Requirement 45)
 */
export function validateSVGDocument(svgString: string): SVGValidationReport {
  const errors: string[] = [];

  if (!svgString.startsWith('<svg') || !svgString.endsWith('</svg>')) {
    errors.push('SVG root tags are missing or malformed.');
  }

  if (/<image\b/i.test(svgString)) {
    errors.push('Forbidden embedded raster <image> element detected.');
  }

  if (/<(filter|feGaussianBlur|feOffset|feImage|foreignObject)\b/i.test(svgString)) {
    errors.push('Forbidden raster filter or effect detected. Pure vector output required.');
  }

  if (/\bNaN\b|\bInfinity\b/i.test(svgString)) {
    errors.push('Invalid NaN or Infinity coordinates detected in SVG geometry.');
  }

  const vectorMatches = svgString.match(/<(circle|ellipse|rect|polygon|path)\b/g);
  const vectorElementCount = vectorMatches ? vectorMatches.length : 0;

  if (vectorElementCount === 0) {
    errors.push('No vector geometry elements were generated.');
  }

  const byteSize = new Blob([svgString], { type: 'image/svg+xml' }).size;

  return {
    valid: errors.length === 0,
    errors,
    vectorElementCount,
    byteSize,
  };
}

/**
 * Renders the generated SVG string into a downloadable PNG or JPG raster preview when requested
 */
export async function exportRasterFromSVG(
  svgString: string,
  width: number,
  height: number,
  format: 'png' | 'jpeg',
  transparent = false
): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(svgBlob);

    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        URL.revokeObjectURL(url);
        reject(new Error('Could not create export canvas context.'));
        return;
      }

      if (!transparent && format === 'jpeg') {
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, width, height);
      }

      ctx.drawImage(img, 0, 0, width, height);
      URL.revokeObjectURL(url);
      const dataUrl = canvas.toDataURL(`image/${format}`, 0.95);
      resolve(dataUrl);
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to rasterize SVG for preview export.'));
    };

    img.src = url;
  });
}

/**
 * Renders the generated SVG string into a binary Blob (PNG or JPG) for memory-efficient bulk processing
 */
export async function exportRasterBlobFromSVG(
  svgString: string,
  width: number,
  height: number,
  format: 'png' | 'jpeg',
  transparent = false
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(svgBlob);

    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        URL.revokeObjectURL(url);
        reject(new Error('Could not create export canvas context.'));
        return;
      }

      if (!transparent && format === 'jpeg') {
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, width, height);
      }

      ctx.drawImage(img, 0, 0, width, height);
      URL.revokeObjectURL(url);
      canvas.toBlob(
        (blob) => {
          canvas.width = 1;
          canvas.height = 1;
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error('Failed to encode raster blob.'));
          }
        },
        `image/${format}`,
        0.95
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to rasterize SVG for bulk export.'));
    };

    img.src = url;
  });
}
