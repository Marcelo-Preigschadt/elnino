import { bedPorosity, depositedSand, grainDensity, layerCount, suspendedSand, totalSand } from "./model.js?v=3";
import { clamp, liquidLevel, projection, rotatePoint, smoothstep, spanAt, vessel } from "./vessel.js";

const lip = { x: 88, y: -162 };
const radians = Math.PI / 180;
const defaultSpacing = 143;
const framingHeight = 425;
const edgeClearance = 9;
const initialOutline = projection(0);

const glass = new Path2D();
glass.moveTo(-79, -162);
glass.quadraticCurveTo(-84, -152, -81, -133);
glass.lineTo(-76, -25);
glass.quadraticCurveTo(-75, -10, -67, -7);
glass.bezierCurveTo(-40, 4, 39, 4, 65, -7);
glass.quadraticCurveTo(74, -10, 75, -25);
glass.lineTo(81, -142);
glass.quadraticCurveTo(82, -156, 88, -162);
glass.quadraticCurveTo(79, -171, 56, -175);
glass.bezierCurveTo(10, -183, -60, -179, -79, -162);
glass.closePath();

const graduations = [50, 100, 150, 200, 250].map((volume) => ({
  volume,
  y: liquidLevel(volume, 0, initialOutline),
}));

function noise(seed) {
  const wave = Math.sin(seed * 127.1 + 311.7) * 43758.5453;
  return wave - Math.floor(wave);
}

const suspendedDots = Array.from({ length: 16 }, (_, index) => ({
  x: noise(index + 32),
  y: noise(index + 63),
  glint: noise(index + 94),
}));

const bedRoughness = Array.from({ length: 21 }, (_, index) => noise(index + 170) - .5);

const doseDots = Array.from({ length: 38 }, (_, index) => ({
  x: noise(index + 606),
  y: noise(index + 708),
  glint: noise(index + 825),
}));

function linear(ctx, x1, y1, x2, y2, stops) {
  const gradient = ctx.createLinearGradient(x1, y1, x2, y2);
  for (const [position, color] of stops) gradient.addColorStop(position, color);
  return gradient;
}

function oval(ctx, x, y, rx, ry) {
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
}

function loadAsset(name, onload) {
  const asset = new Image();
  asset.addEventListener("load", onload);
  asset.src = new URL("./assets/" + name, import.meta.url).href;
  return asset;
}

function drawShadow(ctx, x, y, lift) {
  ctx.save();
  ctx.translate(x + lift * 12, y + 6);
  ctx.scale(1 + lift * .27, .145 + lift * .05);
  const shadow = ctx.createRadialGradient(0, 0, 13, 0, 0, 98);
  shadow.addColorStop(0, "rgba(0,13,13," + (.68 - .33 * lift) + ")");
  shadow.addColorStop(.59, "rgba(0,15,16,.35)");
  shadow.addColorStop(1, "rgba(0,15,16,0)");
  ctx.fillStyle = shadow;
  ctx.fillRect(-100, -100, 200, 200);
  ctx.restore();
}

function drawGlassBack(ctx) {
  ctx.fillStyle = linear(ctx, -83, 0, 84, 0, [
    [0, "#b5e1e15a"], [.04, "#ecffff23"], [.12, "#14333826"],
    [.33, "#c1dddb0b"], [.68, "#b7f6ef12"], [.91, "#e9fcf62c"], [1, "#dfffffa1"],
  ]);
  ctx.fill(glass);

  oval(ctx, 0, -159, 78, 12);
  ctx.fillStyle = "#081f2228";
  ctx.fill();
  ctx.strokeStyle = "#cbe4e482";
  ctx.lineWidth = 1.3;
  ctx.stroke();
}

function pathOutline(ctx, points) {
  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);
  for (const point of points.slice(1)) ctx.lineTo(point.x, point.y);
  ctx.closePath();
}

function drawRefraction(ctx, frame, position, outline, level, bottom) {
  const { backdrop, layout } = frame;
  if (!backdrop.width) return;
  const { scale, width } = layout;
  const left = Math.min(...outline.map((point) => point.x));
  const right = Math.max(...outline.map((point) => point.x));
  const originX = width / 2 + position.x * scale;
  const originY = position.y * scale;
  const depth = bottom - level;
  if (depth < 1) return;

  const sampleTop = clamp(originY + (level + 3.5) * scale, 0, backdrop.height);
  const sampleBottom = clamp(originY + (bottom + 8) * scale, 0, backdrop.height);
  if (sampleBottom - sampleTop < 1) return;

  // Resample the scene through a cylindrical lens in horizontal, gravity-aligned strips.
  const bands = 18;
  const bandWidth = (right - left) / bands;
  const overlap = 1.4 / (scale * layout.dpr);
  const center = (left + right) / 2;
  const halfWidth = (right - left) / 2;
  const lens = (edge) => {
    const u = 2 * edge / bands - 1;
    const mapped = u * (.73 + .29 * u ** 2);
    return clamp(originX + (center + mapped * halfWidth) * scale, 0, backdrop.width);
  };

  for (let band = 0; band < bands; band++) {
    const extension = band + 1 < bands ? overlap : 0;
    const sampleLeft = lens(band);
    const sampleWidth = lens(band + 1 + extension / bandWidth) - sampleLeft;
    if (sampleWidth < .2) continue;
    ctx.drawImage(backdrop, sampleLeft, sampleTop, sampleWidth, sampleBottom - sampleTop,
      left + band * bandWidth, level, bandWidth + extension, depth);
  }
}

function drawSuspension(ctx, sample, outline, level, bottom, time) {
  const depth = bottom - level;
  if (depth < 1) return;
  const count = layerCount;
  const murk = ctx.createLinearGradient(0, level, 0, bottom);
  for (let step = 0; step < count; step++) {
    const layer = count - step - 1;
    const mass = sample.grains.reduce((total, grain) => total + grain.layers[layer], 0);
    const opacity = .78 * (1 - Math.exp(-36 * mass * count / Math.max(8, sample.water)));
    murk.addColorStop((step + .5) / count, "rgba(160,123,85," + opacity + ")");
  }
  ctx.fillStyle = murk;
  ctx.fillRect(-165, level, 380, depth + 1);

  // The silt contributes diffuse turbidity. The larger grains give a few visible flecks.
  sample.grains.slice(0, 2).forEach((grain, size) => {
    const radius = size === 0 ? .65 : .43;
    grain.layers.forEach((mass, layer) => {
      if (mass < .005) return;
      const dots = Math.min(7, Math.ceil(5 * Math.sqrt(mass)));
      for (let index = 0; index < dots; index++) {
        const dot = suspendedDots[(index + layer * 3 + size * 5) % suspendedDots.length];
        const drift = (dot.y + 1 - time * (.66 - .25 * size) % 1) % 1;
        const y = bottom - (layer + drift) * depth / count;
        const span = spanAt(outline, y);
        if (!span) continue;
        const [left, right] = span;
        const width = right - left;
        const x = left + 2 + (width - 4) * (.08 + .84 * dot.x)
          + Math.sin(time * 1.15 + index + layer) * .75;
        ctx.fillStyle = dot.glint > .62 ? "#e6cca693" : "#64462d6d";
        ctx.fillRect(x, y, radius * 1.7, radius);
      }
    });
  });
}

function drawBed(ctx, sample, angle, sedimentTexture) {
  const mass = depositedSand(sample);
  if (mass < .013) return;
  const packedVolume = mass / grainDensity / (1 - bedPorosity);
  const depth = Math.max(.3, vessel.bottom - liquidLevel(packedVolume, 0, initialOutline));
  const lean = smoothstep(27, 81, angle);
  const left = -67 + 69 * lean;
  const right = 67;
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(left, vessel.bottom + 2);
  bedRoughness.forEach((roughness, point) => {
    const fraction = point / (bedRoughness.length - 1);
    const surface = vessel.bottom - depth * (1 - lean * .66 + fraction * lean * 2.25);
    ctx.lineTo(left + (right - left) * fraction, surface + roughness * Math.min(depth * .41, 2.6));
  });
  ctx.lineTo(right, vessel.bottom + 2);
  ctx.closePath();
  ctx.fillStyle = "#93714e";
  ctx.fill();
  ctx.clip();
  const textureHeight = 33;
  const textureTop = vessel.bottom - textureHeight + 3;
  if (sedimentTexture.naturalWidth) {
    ctx.drawImage(sedimentTexture, left, textureTop, right - left, textureHeight);
  }
  ctx.fillStyle = linear(ctx, 0, vessel.bottom - depth * 1.8, 0, vessel.bottom + 2, [
    [0, "#e9d1a337"], [.45, "#b18d6508"], [1, "#392a208c"],
  ]);
  ctx.fillRect(left, textureTop, right - left, textureHeight);
  ctx.restore();
}

function drawLiquidAndSediment(ctx, sample, position, time, frame) {
  const { angle } = position;
  const outline = angle === 0 ? initialOutline : projection(angle);
  const bottom = Math.max(...outline.map((point) => point.y));
  ctx.save();
  ctx.rotate(-angle * radians);
  pathOutline(ctx, outline);
  ctx.clip();

  if (sample.water > .06) {
    const level = liquidLevel(sample.water + totalSand(sample) / grainDensity, angle, outline);
    drawRefraction(ctx, frame, position, outline, level, bottom);
    ctx.fillStyle = linear(ctx, 0, level, 0, bottom, [
      [0, "#e7f4e61c"], [.26, "#cadcd013"], [.82, "#657a6d39"], [1, "#384d4549"],
    ]);
    ctx.fillRect(-168, level, 388, bottom - level + 2);
    drawSuspension(ctx, sample, outline, level, bottom, time);

    const span = spanAt(outline, level);
    if (span && span[1] - span[0] > 1) {
      const [min, max] = span;
      const halfWidth = (max - min) / 2;
      const center = min + halfWidth;
      const curvature = Math.min(8.5, halfWidth * .125);
      const cloudy = clamp(suspendedSand(sample) * 12 / Math.max(5, sample.water), 0, 1);
      oval(ctx, center, level + .45, halfWidth, curvature);
      ctx.fillStyle = linear(ctx, 0, level - curvature, 0, level + curvature, [
        [0, "#161f233f"], [.5, cloudy > .3 ? "#d7b99654" : "#e3ece018"], [1, "#dbe9df39"],
      ]);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(center, level + .45, halfWidth, curvature, 0, 0, Math.PI);
      ctx.strokeStyle = linear(ctx, min, 0, max, 0, [[0, "#edf9ebab"], [.45, "#d8e8dd61"], [1, "#c3d0c444"]]);
      ctx.lineWidth = .72;
      ctx.stroke();
    }
  }

  ctx.rotate(angle * radians);
  drawBed(ctx, sample, angle, frame.sedimentTexture);
  ctx.restore();
}

function drawGraduations(ctx) {
  ctx.font = "500 9.5px Arial, sans-serif";
  ctx.textAlign = "right";
  ctx.textBaseline = "middle";
  ctx.fillStyle = "#f2f3e7cf";
  ctx.strokeStyle = "#f2f3e7ad";
  ctx.lineWidth = .81;
  ctx.beginPath();
  for (const { volume, y } of graduations) {
    ctx.moveTo(39, y);
    ctx.lineTo(53, y + .4);
    ctx.fillText(volume, 35, y);
    const intermediate = y + 11.1;
    ctx.moveTo(46, intermediate);
    ctx.lineTo(53, intermediate + .4);
  }
  ctx.stroke();

  ctx.fillStyle = "#f2f3e7ad";
  ctx.font = "500 8px Arial, sans-serif";
  ctx.fillText("mL", 53, graduations[4].y - 11);
}

function drawGlassFront(ctx) {
  ctx.strokeStyle = linear(ctx, -81, 0, 86, 0, [
    [0, "#e9ffffbd"], [.09, "#9cd2d389"], [.33, "#dae8e06e"],
    [.72, "#afd0ce70"], [1, "#f3fffce0"],
  ]);
  ctx.lineWidth = 1.6;
  ctx.stroke(glass);

  ctx.save();
  ctx.clip(glass);
  ctx.fillStyle = linear(ctx, -80, 0, -62, 0, [
    [0, "#f7ffff0d"], [.36, "#e8ffff71"], [.68, "#e8ffff24"], [1, "#ffffff00"],
  ]);
  ctx.fillRect(-81, -153, 19, 143);
  ctx.fillStyle = linear(ctx, 65, 0, 81, 0, [
    [0, "#ffffff00"], [.72, "#c7f3ea40"], [1, "#f5ffff73"],
  ]);
  ctx.fillRect(64, -147, 17, 138);
  ctx.restore();

  oval(ctx, 0, -9, 71, 11);
  ctx.lineWidth = 1.5;
  ctx.strokeStyle = "#d8f6eba0";
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(-71, -10);
  ctx.bezierCurveTo(-48, -22, 38, -21, 69, -10);
  ctx.lineWidth = .7;
  ctx.strokeStyle = "#e1f6ed52";
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(-79, -160.5);
  ctx.bezierCurveTo(-70, -145, 57, -145, 79, -156);
  ctx.quadraticCurveTo(83, -159, 88, -162);
  ctx.lineWidth = 2.2;
  ctx.strokeStyle = "#efffffe0";
  ctx.stroke();
}

function drawBeaker(ctx, position, sample, time, frame) {
  ctx.save();
  ctx.translate(position.x, position.y);
  ctx.rotate(position.angle * radians);
  const shell = frame.glassShell;
  if (!shell.naturalWidth) drawGlassBack(ctx);
  drawLiquidAndSediment(ctx, sample, position, time, frame);
  if (shell.naturalWidth) ctx.drawImage(shell, -108, -199, 216, 216);
  else drawGlassFront(ctx);
  drawGraduations(ctx);
  ctx.restore();
}

function drawRod(ctx, position, progress, time) {
  const depth = smoothstep(0, .16, progress) * (1 - smoothstep(.83, 1, progress));
  const sweep = Math.sin(time * 5.8) * 21 * depth;
  const top = { x: position.x + 27 + sweep * .42, y: position.y - 184 - 39 * depth };
  const tip = { x: position.x - 13 + sweep, y: position.y - 170 + 147 * depth };
  ctx.lineCap = "round";
  for (const [offset, width, color] of [[0, 4.8, "#223c398c"], [0, 3.5, "#a6bdb68f"], [-.85, .72, "#ebf5e99c"]]) {
    ctx.beginPath();
    ctx.moveTo(top.x + offset, top.y);
    ctx.lineTo(tip.x + offset, tip.y);
    ctx.lineWidth = width;
    ctx.strokeStyle = color;
    ctx.stroke();
  }
}

function drawWaterStream(ctx, start, end, amount, murk, time) {
  const gap = Math.max(2, end.y - start.y);
  const radius = .28 + Math.sqrt(amount) * .49;
  const dirty = clamp(murk * 14, 0, 1);
  const segments = 16;
  const contour = Array.from({ length: segments + 1 }, (_, segment) => {
    const fraction = segment / segments;
    const wobble = Math.sin(12 * fraction - 7 * time) * .32 * fraction;
    const x = start.x + (end.x - start.x) * fraction + wobble;
    const y = start.y + gap * fraction * (.09 + .91 * fraction);
    return { x, y, radius: radius / (1 + 2.2 * fraction) ** .44 };
  });
  ctx.beginPath();
  ctx.moveTo(contour[0].x - radius, start.y);
  for (const point of contour) ctx.lineTo(point.x - point.radius, point.y);
  for (let i = contour.length - 1; i >= 0; i--) {
    const point = contour[i];
    ctx.lineTo(point.x + point.radius, point.y);
  }
  ctx.closePath();
  ctx.fillStyle = linear(ctx, 0, start.y, 0, start.y + gap, [
    [0, dirty > .15 ? "#b79b77c4" : "#b6c8bfbd"],
    [.35, dirty > .15 ? "#b79a76b7" : "#a6bbbb84"],
    [1, dirty > .15 ? "#bc9e73a4" : "#cedcd392"],
  ]);
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(start.x - radius * .53, start.y);
  for (const point of contour) ctx.lineTo(point.x - point.radius * .53, point.y);
  ctx.lineWidth = clamp(radius * .3, .38, .85);
  ctx.strokeStyle = "#f5faf0a8";
  ctx.stroke();

  if (amount < 1) return;
  for (const offset of [0, .47]) {
    const ripple = (time * 3.7 + offset) % 1;
    const length = 3 + ripple * (5 + Math.sqrt(amount) * 1.75);
    ctx.beginPath();
    ctx.ellipse(end.x, end.y + .45, length, length * .16, 0, .2, Math.PI - .07);
    ctx.lineWidth = .6;
    ctx.strokeStyle = "rgba(230,239,223," + (.52 * (1 - ripple)) + ")";
    ctx.stroke();
  }
}

function drawPreparation(ctx, position, model, time) {
  const action = model.preparation;
  if (!action) return;
  const fraction = action.time / action.duration;
  if (action.kind === "mix") {
    drawRod(ctx, position, fraction, time);
    return;
  }

  const level = liquidLevel(model.source.water + totalSand(model.source) / grainDensity, 0, initialOutline);
  const surface = position.y + level;
  const strength = 4 * fraction * (1 - fraction);
  const streamOrigin = { x: position.x - 31, y: -.8 };
  if (action.kind === "water") {
    if (strength > .025) {
      drawWaterStream(ctx, streamOrigin, { x: position.x - 13, y: surface }, 52 * strength, 0, time);
    }
    return;
  }

  ctx.save();
  ctx.globalAlpha = strength;
  for (const dot of doseDots) {
    const fall = (dot.y + time * 2.3) % 1;
    const y = streamOrigin.y + fall ** 1.65 * (surface - streamOrigin.y);
    const center = streamOrigin.x + 18 * fall;
    const x = center + (dot.x - .5) * (17 - fall * 5);
    ctx.fillStyle = dot.glint > .48 ? "#e5c59f" : "#977049";
    ctx.fillRect(x, y, .55 + dot.glint * .85, .8 + dot.glint * 1.35);
  }
  ctx.restore();
}

function beakerPositions({ benchY, spacing }, angle) {
  const receiver = { x: spacing, y: benchY, angle: 0 };
  const fraction = smoothstep(0, 47, angle);
  const rotated = rotatePoint(lip.x, lip.y, angle);
  const targetX = receiver.x - 32 - rotated.x;
  const targetY = receiver.y + vessel.top - 21 - rotated.y;
  const source = { x: -spacing + (targetX + spacing) * fraction, y: benchY + (targetY - benchY) * fraction, angle };
  const spout = { x: source.x + rotated.x, y: source.y + rotated.y };
  return { source, receiver, spout };
}

export class Bench {
  constructor(canvas, onAssetsReady) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.layout = null;
    this.backdrop = document.createElement("canvas");
    this.backdrop.width = 0;
    this.photo = loadAsset("bancada.webp", () => {
      this.refreshBackdrop();
      onAssetsReady();
    });
    this.glassShell = loadAsset("bequer-borossilicato.webp", onAssetsReady);
    this.sedimentTexture = loadAsset("sedimento-quartzoso.webp", onAssetsReady);
  }

  resize() {
    const width = this.canvas.clientWidth;
    const height = this.canvas.clientHeight;
    if (width === 0 || height === 0 || !this.ctx) return;
    const scene = this.canvas.parentElement;
    const style = getComputedStyle(scene);
    const spacing = Number.parseFloat(style.getPropertyValue("--beaker-spacing")) || defaultSpacing;
    const photoX = Number.parseFloat(style.backgroundPositionX || "50%") / 100;
    const photoY = Number.parseFloat(style.backgroundPositionY || "62%") / 100;
    const framingWidth = 2 * (spacing + lip.x + edgeClearance);
    const scale = Math.min(width / framingWidth, height / framingHeight);
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.canvas.width = Math.round(width * dpr);
    this.canvas.height = Math.round(height * dpr);
    this.layout = { width, height, scale, dpr, spacing, photoX, photoY, benchY: height * .84 / scale };
    scene.style.setProperty("--label-width", 4 * spacing * scale + "px");
    this.refreshBackdrop();
  }

  refreshBackdrop() {
    if (!this.layout || !this.photo?.naturalWidth) return;
    const { width, height, photoX, photoY } = this.layout;
    const scale = Math.max(width / this.photo.naturalWidth, height / this.photo.naturalHeight);
    const photoWidth = this.photo.naturalWidth * scale;
    const photoHeight = this.photo.naturalHeight * scale;
    this.backdrop.width = width;
    this.backdrop.height = height;
    const ctx = this.backdrop.getContext("2d");
    ctx.drawImage(this.photo, (width - photoWidth) * photoX, (height - photoHeight) * photoY, photoWidth, photoHeight);
    ctx.fillStyle = linear(ctx, 0, 0, 0, height, [
      [.05, "#102a2e24"], [.43, "#041b1b17"], [1, "#071e20ab"],
    ]);
    ctx.fillRect(0, 0, width, height);
  }

  draw(model, time) {
    if (!this.layout) return;
    const { ctx, layout } = this;
    const { width, scale, dpr, spacing, benchY } = layout;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    if (this.backdrop.width) ctx.drawImage(this.backdrop, 0, 0, this.canvas.width, this.canvas.height);
    ctx.setTransform(scale * dpr, 0, 0, scale * dpr, width * dpr / 2, 0);
    ctx.lineCap = "round";

    const { source, receiver, spout } = beakerPositions(layout, model.angle);
    drawShadow(ctx, -spacing, benchY, smoothstep(0, 48, model.angle));
    drawShadow(ctx, receiver.x, benchY, 0);
    drawBeaker(ctx, receiver, model.receiver, time, this);
    if (model.flowing) {
      const inlet = liquidLevel(model.receiver.water + totalSand(model.receiver) / grainDensity, 0, initialOutline);
      const end = { x: clamp(spout.x + 15, receiver.x - 45, receiver.x + 45), y: receiver.y + inlet };
      drawWaterStream(ctx, spout, end, model.flow, model.flowSand, time);
    }
    drawBeaker(ctx, source, model.source, time, this);
    drawPreparation(ctx, source, model, time);
  }

  touchesSource(pointer, model) {
    if (!this.layout) return false;
    const { width, scale } = this.layout;
    const box = this.canvas.getBoundingClientRect();
    const { source } = beakerPositions(this.layout, model.angle);
    const x = (pointer.clientX - box.left - width / 2) / scale - source.x;
    const y = (pointer.clientY - box.top) / scale - source.y;
    const local = rotatePoint(x, y, -source.angle);
    return Math.abs(local.x) < 90 && local.y < 13 && local.y > -181;
  }
}
