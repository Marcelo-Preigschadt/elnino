import { bedPorosity, depositedSand, grainDensity, layerCount, suspendedSand, totalSand } from "./model.js";
import { clamp, liquidLevel, projection, rotatePoint, smoothstep, spanAt, vessel } from "./vessel.js";

const lip = { x: 88, y: -162 };
const radians = Math.PI / 180;
const spacing = 143;
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

const bedDots = Array.from({ length: 130 }, (_, index) => ({
  x: noise(index + 170),
  y: noise(index + 308),
  glint: noise(index + 465),
}));

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

function drawShadow(ctx, x, y, lift) {
  ctx.save();
  ctx.translate(x + lift * 12, y + 2);
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

function drawSuspension(ctx, sample, outline, level, bottom, time) {
  const depth = bottom - level;
  if (depth < 1) return;
  const count = layerCount;
  const murk = ctx.createLinearGradient(0, level, 0, bottom);
  for (let step = 0; step < count; step++) {
    const layer = count - step - 1;
    const mass = sample.grains.reduce((total, grain) => total + grain.layers[layer], 0);
    const opacity = .83 * (1 - Math.exp(-37 * mass * count / Math.max(10, sample.water)));
    murk.addColorStop((step + .5) / count, "rgba(177,130,82," + opacity + ")");
  }
  ctx.fillStyle = murk;
  ctx.fillRect(-165, level, 380, depth + 1);

  sample.grains.forEach((grain, size) => {
    const radius = [1.2, .95, .65][size];
    grain.layers.forEach((mass, layer) => {
      if (mass < .005) return;
      const dots = Math.min(suspendedDots.length, Math.ceil(12 * Math.sqrt(mass)));
      for (let index = 0; index < dots; index++) {
        const dot = suspendedDots[(index + layer * 3 + size * 5) % suspendedDots.length];
        const drift = (dot.y + time * (.34 - .09 * size)) % 1;
        const y = bottom - (layer + drift) * depth / count;
        const span = spanAt(outline, y);
        if (!span) continue;
        const [left, right] = span;
        const width = right - left;
        const x = left + 2 + (width - 4) * (.08 + .84 * dot.x)
          + Math.sin(time * 2 + index + layer) * 1.6;
        ctx.fillStyle = dot.glint > .56 ? "#e3c08dc4" : "#694a34a1";
        ctx.fillRect(x, y, radius * 1.5, radius);
      }
    });
  });
}

function drawBed(ctx, sample, angle) {
  const mass = depositedSand(sample);
  if (mass < .013) return;
  const packedVolume = mass / grainDensity / (1 - bedPorosity);
  const depth = Math.max(.3, vessel.bottom - liquidLevel(packedVolume, 0, initialOutline));
  const lean = smoothstep(27, 81, angle);
  const left = -67 + 69 * lean;
  const right = 67;
  const levelAt = (fraction) => vessel.bottom - depth * (1 - lean * .66 + fraction * lean * 2.25)
    + (Math.sin(fraction * 35) + Math.sin(fraction * 61) * .42) * Math.min(depth * .18, .64);

  ctx.beginPath();
  ctx.moveTo(left, vessel.bottom + 2);
  for (let point = 0; point <= 20; point++) {
    const fraction = point / 20;
    ctx.lineTo(left + (right - left) * fraction, levelAt(fraction));
  }
  ctx.lineTo(right, vessel.bottom + 2);
  ctx.closePath();
  ctx.fillStyle = linear(ctx, 0, vessel.bottom - depth * 2, 0, vessel.bottom + 2, [
    [0, "#e5c696"], [.46, "#c8a276"], [1, "#79573c"],
  ]);
  ctx.fill();

  for (const dot of bedDots) {
    const y = levelAt(dot.x);
    ctx.fillStyle = dot.glint > .63 ? "#f8deb6a1" : "#69452c80";
    ctx.fillRect(left + (right - left) * dot.x, y + dot.y * (vessel.bottom - y + 1), 1 + dot.glint, .7);
  }
}

function drawLiquidAndSediment(ctx, sample, angle, time) {
  const outline = angle === 0 ? initialOutline : projection(angle);
  const bottom = Math.max(...outline.map((point) => point.y));
  ctx.save();
  ctx.rotate(-angle * radians);
  pathOutline(ctx, outline);
  ctx.clip();

  if (sample.water > .06) {
    const level = liquidLevel(sample.water + totalSand(sample) / grainDensity, angle, outline);
    ctx.fillStyle = linear(ctx, 0, level, 0, bottom, [
      [0, "#c3e5e449"], [.15, "#a8d8d929"], [.83, "#7aafbabd"], [1, "#a1c9c879"],
    ]);
    ctx.fillRect(-168, level, 388, bottom - level + 2);
    drawSuspension(ctx, sample, outline, level, bottom, time);

    const span = spanAt(outline, level);
    if (span && span[1] - span[0] > 1) {
      const [min, max] = span;
      const halfWidth = (max - min) / 2;
      const cloudy = clamp(suspendedSand(sample) * 12 / Math.max(5, sample.water), 0, 1);
      oval(ctx, min + halfWidth, level + .45, halfWidth, Math.min(8, halfWidth * .13));
      ctx.fillStyle = cloudy > .3 ? "#dfbf9576" : "#c6f1ed49";
      ctx.fill();
      ctx.strokeStyle = "#ecfffc9c";
      ctx.lineWidth = .85;
      ctx.stroke();
    }
  }

  ctx.rotate(angle * radians);
  drawBed(ctx, sample, angle);
  ctx.restore();
}

function drawGraduations(ctx, label) {
  ctx.font = "600 10px system-ui, sans-serif";
  ctx.textAlign = "right";
  ctx.textBaseline = "middle";
  ctx.fillStyle = "#ebfaf4dd";
  ctx.strokeStyle = "#ebfaf4af";
  ctx.lineWidth = 1.25;
  ctx.beginPath();
  for (const { volume, y } of graduations) {
    ctx.moveTo(39, y);
    ctx.lineTo(54, y + .5);
    ctx.fillText(volume, 35, y);
    const intermediate = y + 11.1;
    ctx.moveTo(46, intermediate);
    ctx.lineTo(54, intermediate + .4);
  }
  ctx.stroke();

  ctx.fillStyle = "#f0fcf9a1";
  ctx.font = "600 8px system-ui, sans-serif";
  ctx.fillText("mL", 54, graduations[4].y - 12);
  ctx.textAlign = "center";
  ctx.font = "650 23px system-ui, sans-serif";
  ctx.fillStyle = "#effbf7e6";
  ctx.fillText(label, -26, -72);
}

function drawGlassFront(ctx, label) {
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

  drawGraduations(ctx, label);
}

function drawBeaker(ctx, position, sample, label, time) {
  ctx.save();
  ctx.translate(position.x, position.y);
  ctx.rotate(position.angle * radians);
  drawGlassBack(ctx);
  drawLiquidAndSediment(ctx, sample, position.angle, time);
  drawGlassFront(ctx, label);
  ctx.restore();
}

function drawRod(ctx, position, progress, time) {
  const depth = smoothstep(0, .16, progress) * (1 - smoothstep(.83, 1, progress));
  const sweep = Math.sin(time * 17) * 19 * depth;
  const top = { x: position.x + 27 + sweep * .42, y: position.y - 184 - 39 * depth };
  const tip = { x: position.x - 13 + sweep, y: position.y - 170 + 147 * depth };
  ctx.lineCap = "round";
  for (const [offset, width, color] of [[0, 5.7, "#183f4280"], [0, 4.2, "#b4e0dfb5"], [-.9, 1.15, "#f2ffffc5"]]) {
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
  const bent = start.x + (end.x - start.x) * .85;
  const width = 1.4 + Math.sqrt(amount) * .64;
  const dirty = clamp(murk * 16, 0, .91);

  ctx.beginPath();
  ctx.moveTo(start.x, start.y);
  ctx.bezierCurveTo(bent, start.y + gap * .04, end.x - 3, end.y - gap * .3, end.x, end.y);
  ctx.lineWidth = width;
  ctx.lineCap = "round";
  ctx.strokeStyle = dirty > .16 ? "rgba(202,168,123," + (.5 + dirty * .43) + ")" : "#a8dedcad";
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(start.x - width * .24, start.y + 1);
  ctx.bezierCurveTo(bent - 1, start.y + gap * .05, end.x - 5, end.y - gap * .29, end.x - 1, end.y);
  ctx.lineWidth = Math.max(.8, width * .19);
  ctx.strokeStyle = "#f1fffd9e";
  ctx.stroke();

  const length = 7 + (time * 6 % 1) * 14;
  oval(ctx, end.x, end.y + .4, length, Math.max(.7, length * .14));
  ctx.strokeStyle = "#e3fffc89";
  ctx.lineWidth = .8;
  ctx.stroke();
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
  const opening = position.y + vessel.top;
  const strength = smoothstep(0, .1, fraction) * (1 - smoothstep(.86, 1, fraction));
  if (action.kind === "water") {
    if (strength > .01) drawWaterStream(ctx, { x: position.x - 32, y: opening - 67 }, { x: position.x - 13, y: surface }, 82 * strength, 0, time);
    return;
  }

  ctx.save();
  ctx.globalAlpha = strength;
  for (const dot of doseDots) {
    const fall = (dot.y + time * 3.7) % 1;
    const y = opening - 63 + fall ** 1.42 * (surface - opening + 63);
    const x = position.x - 16 + (dot.x - .5) * (24 - fall * 9);
    ctx.fillStyle = dot.glint > .45 ? "#f6d7a8" : "#a87b53";
    ctx.fillRect(x, y, 1.3 + dot.glint, 1.2 + dot.glint * 1.4);
  }
  ctx.restore();
}

function beakerPositions(benchY, angle) {
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
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.layout = null;
  }

  resize() {
    const width = this.canvas.clientWidth;
    const height = this.canvas.clientHeight;
    if (width === 0 || height === 0 || !this.ctx) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.canvas.width = Math.round(width * dpr);
    this.canvas.height = Math.round(height * dpr);
    const scale = Math.min(width / 480, height / 425);
    this.layout = { width, scale, dpr, benchY: height * .84 / scale };
    this.canvas.parentElement.style.setProperty("--label-width", 4 * spacing * scale + "px");
  }

  draw(model, time) {
    if (!this.layout) return;
    const { ctx, layout } = this;
    const { width, scale, dpr, benchY } = layout;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    ctx.setTransform(scale * dpr, 0, 0, scale * dpr, width * dpr / 2, 0);
    ctx.lineCap = "round";

    const { source, receiver, spout } = beakerPositions(benchY, model.angle);
    drawShadow(ctx, -spacing, benchY, smoothstep(0, 48, model.angle));
    drawShadow(ctx, receiver.x, benchY, 0);
    drawBeaker(ctx, receiver, model.receiver, "B", time);
    if (model.flowing) {
      const inlet = liquidLevel(model.receiver.water + totalSand(model.receiver) / grainDensity, 0, initialOutline);
      const end = { x: clamp(spout.x + 15, receiver.x - 45, receiver.x + 45), y: receiver.y + inlet };
      drawWaterStream(ctx, spout, end, model.flow, model.flowSand, time);
    }
    drawBeaker(ctx, source, model.source, "A", time);
    drawPreparation(ctx, source, model, time);
  }

  touchesSource(pointer, model) {
    if (!this.layout) return false;
    const { width, scale, benchY } = this.layout;
    const box = this.canvas.getBoundingClientRect();
    const { source } = beakerPositions(benchY, model.angle);
    const x = (pointer.clientX - box.left - width / 2) / scale - source.x;
    const y = (pointer.clientY - box.top) / scale - source.y;
    const local = rotatePoint(x, y, -source.angle);
    return Math.abs(local.x) < 90 && local.y < 13 && local.y > -181;
  }
}
