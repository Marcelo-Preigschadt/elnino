import { clamp } from "./treatment.js?v=4";

const width = 1120;
const height = 720;
const pixel = ([x, y]) => [x * width, y * height];
const topFront = [[.143396, .374642], [.856604, .374642]].map(pixel);
const topBack = [[.143396, .262169], [.856604, .262169]].map(pixel);
const floor = [[.143396,.705206],[.286792,.73911],[.399057,.778664],
  [.45566,.778664],[.580189,.74476],[.856604,.705206]].map(pixel);
const nozzle = pixel([.333019, .264309]);
const doseImpact = pixel([.333019, .332117]);
const rapidAxis = pixel([.537736, .599501]);
const slowAxes = [[.298113,.599501],[.701887,.599501]].map(pixel);
const outlet = [[.833962,.304694],[.864151,.310345],[.899057,.310345]].map(pixel);
const [waterLeft, waterline] = topFront[0];
const waterRight = topFront[1][0];
const bottom = Math.max(...floor.map((point) => point[1]));
const reversedFloor = [...floor].reverse();
const surface = [...topFront, ...[...topBack].reverse()];
const basin = [...topFront, ...reversedFloor];
const waterWidth = waterRight - waterLeft;
const wetHeight = bottom - waterline;

export const sampleLayers = Object.freeze({
  surface: { label: "Superfície", depth: .10 },
  middle: { label: "Meio", depth: .49 },
  bottom: { label: "Fundo", depth: .88 },
});

function random(seed) {
  const value = Math.sin(seed * 127.1 + 311.7) * 43758.5453;
  return value - Math.floor(value);
}

const particleSets = Array.from({ length: 4 }, (_, group) => (
  Array.from({ length: group === 3 ? 125 : 47 }, (_, index) => {
    const seed = 1 + index * 19 + group * 1301;
    return { x: random(seed), y: random(seed + 1), rank: random(seed + 2), size: random(seed + 3),
      shape: index % 5, phase: random(seed + 4) * Math.PI * 2 };
  })
));

function polygon(ctx, points) {
  ctx.beginPath();
  ctx.moveTo(...points[0]);
  for (const point of points.slice(1)) ctx.lineTo(...point);
  ctx.closePath();
}

function linear(ctx, x1, y1, x2, y2, stops) {
  const gradient = ctx.createLinearGradient(x1, y1, x2, y2);
  for (const [position, color] of stops) gradient.addColorStop(position, color);
  return gradient;
}

function sampleConcentration({ mass, drop }, depth) {
  const front = clamp((depth - drop + .025) / .050);
  return mass * front;
}

function concentration(reading, depth) {
  return reading.suspension.reduce((sum, group) => sum + sampleConcentration(group, depth), 0);
}

function floorAt(x) {
  const upper = floor.findIndex(([right]) => right >= x);
  const index = clamp(upper < 0 ? floor.length - 1 : upper, 1, floor.length - 1);
  const [[x0, y0], [x1, y1]] = floor.slice(index - 1, index + 1);
  return y0 + (y1 - y0) * clamp((x - x0) / (x1 - x0));
}

function createFloc(index) {
  const picture = document.createElement("canvas");
  picture.width = picture.height = 82;
  const ctx = picture.getContext("2d");
  const center = 41;

  for (let i = 0; i < 93; i++) {
    const seed = 28 * i + 379 * index;
    const branch = i % 6;
    const angle = branch * Math.PI / 3 + (random(seed + 1) - .5) * 1.55;
    const spread = 35 * random(seed + 2) ** 1.22;
    const x = center + Math.cos(angle) * spread * (.8 + random(seed + 3) * .2);
    const y = center + Math.sin(angle) * spread * .94;
    const r = 1.1 + random(seed + 4) * (4.65 - .032 * spread);
    const alpha = (.16 + .27 * random(seed + 5)) * (1 - spread / 54);
    const veil = ctx.createRadialGradient(x,y,0,x,y,r);
    veil.addColorStop(0, "rgba(84,60,39," + alpha + ")");
    veil.addColorStop(.6, "rgba(116,90,58," + .85 * alpha + ")");
    veil.addColorStop(1, "rgba(139,112,75,0)");
    ctx.fillStyle = veil;
    ctx.fillRect(x-r,y-r,2*r,2*r);
  }
  return picture;
}

function drawSurface(ctx, reading, time, mixing) {
  const murk = concentration(reading, .045);
  polygon(ctx, surface);
  ctx.fillStyle = linear(ctx, 0, topBack[0][1], 0, waterline, [
    [0, "rgba(99,139,135,.29)"],
    [.47, "rgba(139,171,162,.30)"],
    [1, "rgba(112,155,154,.43)"],
  ]);
  ctx.fill();
  ctx.fillStyle = "rgba(147,121,79," + (.42 * murk) + ")";
  ctx.fill();
  ctx.save();
  ctx.clip();
  for (let i = 0; i < 15; i++) {
    const seed = 53 + i * 4;
    const x = waterLeft + waterWidth * random(seed);
    const y = topBack[0][1] + (waterline - topBack[0][1]) * random(seed + 1);
    const span = 22 + 129 * random(seed + 2);
    const wave = time * (mixing ? 2.5 : .7) + random(seed + 3) * 5;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.quadraticCurveTo(x + span * .5, y + (.4 + Math.sin(wave) * 1.4), x + span, y);
    ctx.lineWidth = .7 + random(seed + 1) * .7;
    ctx.strokeStyle = "rgba(206,226,208," + (.10 + Math.sin(wave) * .045) + ")";
    ctx.stroke();
  }
  ctx.restore();
}

function drawSludge(ctx, reading, texture) {
  if (reading.retained < .007) return;
  const crest = [];
  for (let i = 0; i <= 52; i++) {
    const x = waterLeft + waterWidth * i / 52;
    const pooled = .78 + .5 * Math.exp(-(((x - width * .42) / 175) ** 2));
    const noise = (random(i * 7 + 323) - .5) * 4;
    crest.push([x, floorAt(x) - (30 * pooled + noise) * reading.retained]);
  }
  ctx.save();
  polygon(ctx, [...crest, ...reversedFloor]);
  ctx.fillStyle = "#594b34";
  ctx.fill();
  ctx.clip();
  if (texture?.naturalWidth) {
    ctx.globalAlpha = .48;
    ctx.drawImage(texture, waterLeft, bottom - 145, waterWidth, 145);
    ctx.globalAlpha = 1;
  }
  ctx.fillStyle = linear(ctx, 0, bottom - 120, 0, bottom, [
    [0,"#b0966732"], [.68,"#4c3b225e"], [1,"#2c2319b5"],
  ]);
  ctx.fillRect(waterLeft,bottom-146,waterWidth,147);
  ctx.restore();
}

function drawTankParticles(ctx, reading, time, sprites, mixing, settling) {
  const drift = mixing ? .027 : (settling ? .009 : 0);
  for (let group = 0; group < particleSets.length; group++) {
    const { mass, drop } = reading.suspension[group];
    const fine = group === 3;
    const show = clamp(mass * (fine ? 1.12 : 2.25));
    for (const dot of particleSets[group]) {
      if (dot.rank > show || dot.y + drop >= 1) continue;
      const x = waterLeft + 6 + (waterWidth - 12) * clamp(dot.x + Math.sin(time * .9 + dot.phase) * drift);
      const depth = clamp(dot.y + drop + Math.cos(time * .72 + dot.phase) * drift * .42);
      const y = waterline + (floorAt(x) - waterline) * depth;
      if (fine) {
        ctx.fillStyle = dot.size > .66 ? "#d4b88e81" : "#624e3890";
        ctx.fillRect(x, y, .5 + dot.size * 1.9, .5 + dot.size * 1.16);
      } else {
        const size = (12 - 2.4 * group) * (.54 + reading.maturity * .57) * (.7 + .85 * dot.size);
        ctx.globalAlpha = .82;
        ctx.drawImage(sprites[dot.shape], x - size / 2, y - size / 2, size, size);
      }
    }
  }
  ctx.globalAlpha = 1;
}

function drawPaddles(ctx, axes, time, spinning, rapid) {
  for (const [x, y] of axes) {
    const swing = spinning ? Math.cos(time * (rapid ? 13 : 3) + x * .02) : .39;
    const tip = 13 + 41 * Math.abs(swing);
    polygon(ctx, [[x-tip,y+4],[x+tip,y-6],[x+tip,y-18],[x-tip,y-6]]);
    ctx.fillStyle = linear(ctx, x-tip,y,x+tip,y, [[0,"#62746e"],[.58,"#9fada4"],[1,"#283d37"]]);
    ctx.fill();
    ctx.strokeStyle = "#b0c3b464";
    ctx.lineWidth = 1.3;
    ctx.stroke();
  }
}

function drawLiquid(ctx, plant, reading, time, sprites, dirt) {
  const mixing = plant.active && (plant.inMixingChamber || plant.phase === "flocculation");
  const settling = plant.phase === "settling" || plant.phase === "result";
  drawSurface(ctx, reading, time, mixing);
  ctx.save();
  polygon(ctx, basin);
  ctx.clip();
  ctx.fillStyle = linear(ctx, 0, waterline, 0, bottom, [
    [0,"#89b5ad62"], [.18,"#709c9855"], [.66,"#3669666b"], [1,"#203e3d8d"],
  ]);
  ctx.fillRect(waterLeft,waterline,waterWidth,wetHeight);
  const haze = ctx.createLinearGradient(0,waterline,0,bottom);
  for (let i = 0; i <= 18; i++) {
    const at = i / 18;
    const murk = concentration(reading, at);
    haze.addColorStop(at, "rgba(157,123,76," + (.59 * murk) + ")");
  }
  ctx.fillStyle = haze;
  ctx.fillRect(waterLeft,waterline,waterWidth,wetHeight);
  if (plant.inMixingChamber) drawPaddles(ctx, [rapidAxis], time, mixing, true);
  if (plant.phase === "flocculation") drawPaddles(ctx, slowAxes, time, mixing, false);
  if (settling) drawSludge(ctx, reading, dirt);
  drawTankParticles(ctx, reading, time, sprites, mixing, settling);
  ctx.restore();

  ctx.beginPath();
  ctx.moveTo(...topFront[0]);
  ctx.lineTo(...topFront[1]);
  ctx.strokeStyle = "#d0e4d58b";
  ctx.lineWidth = 1.6;
  ctx.stroke();
  ctx.strokeStyle = "#253d36aa";
  ctx.lineWidth = .75;
  ctx.stroke();
}

function drawReagent(ctx, plant, time) {
  const unit = plant.unit;
  if (!plant.inMixingChamber || !plant.active || plant.seconds >= unit.doseSeconds) return;
  const amount = plant.seconds / unit.doseSeconds;
  const [x, y] = nozzle;
  const [, impact] = doseImpact;
  const lime = plant.mixing.kind === "lime";
  const doseScale = .55 + .45 * Math.sqrt(clamp(plant.mixing.amount / (plant.mixing.kind === "pac" ? 30 : 6)));
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.quadraticCurveTo(x + 2, y + 18, x + 2 * Math.sin(time * 7), impact);
  ctx.lineWidth = doseScale * (1.7 + Math.sin(amount * Math.PI) * 2.8);
  ctx.strokeStyle = lime ? "#f5f2dcb2" : "#e7e3bb93";
  ctx.stroke();
  for (let i=0; i<2; i++) {
    const wave = (time * 1.8 + i * .5) % 1;
    ctx.beginPath();
    ctx.ellipse(x, impact, 5 + wave * 21, 1 + wave * 4, 0, 0, Math.PI * 2);
    ctx.strokeStyle = "rgba(239,243,218," + .58 * (1-wave) + ")";
    ctx.lineWidth = .95;
    ctx.stroke();
  }
}

function drawProbe(ctx, plant) {
  if (!plant.meterActive) return;
  const x = width * .425;
  const drop = 28 * clamp(plant.measurementSeconds * 4);
  const y = waterline - 119 + drop;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.quadraticCurveTo(x + 1, y - 31, x + 46, y - 32);
  ctx.lineWidth = 3;
  ctx.strokeStyle = "#26312c";
  ctx.stroke();
  ctx.fillStyle = linear(ctx, x - 7, y, x + 7, y, [[0,"#1c2825"],[.4,"#546362"],[1,"#242d2b"]]);
  ctx.fillRect(x - 6, y, 12, 68);
  ctx.fillStyle = linear(ctx, x - 3, y, x + 3, y, [[0,"#65736b"],[.44,"#e0e6db"],[1,"#7b8883"]]);
  ctx.fillRect(x - 3, y + 67, 6, 47);
  ctx.beginPath();
  ctx.arc(x, y + 115, 3.5, 0, Math.PI * 2);
  ctx.fillStyle = "#c6ded699";
  ctx.fill();
}

function drawOutlet(ctx, reading, time) {
  const strength = clamp(1 - reading.turbidity / 120);
  for (let line = 0; line < 4; line++) {
    ctx.beginPath();
    ctx.moveTo(outlet[0][0], outlet[0][1] + 2 * line);
    ctx.quadraticCurveTo(outlet[1][0], outlet[1][1] + 1.9 * line,
      outlet[2][0], outlet[2][1] + 1.9 * line);
    ctx.lineWidth = 1.65;
    ctx.strokeStyle = strength < .25 ? "#b7a78283" : "rgba(185,218,207," + (.37 + .10 * Math.sin(time * 6 - line)) + ")";
    ctx.stroke();
  }
}

function drawMicroscope(ctx, frame, reading, layer, time, sprites) {
  const { w, h, dpr } = frame;
  ctx.setTransform(dpr,0,0,dpr,0,0);
  ctx.fillStyle = linear(ctx,0,0,w,h,[[0,"#24342e"],[1,"#121f1e"]]);
  ctx.fillRect(0,0,w,h);
  const x = w / 2;
  const y = h / 2 + 2;
  const radius = Math.min(w*.40,h*.453);
  const murk = concentration(reading, layer.depth);
  const lamp = ctx.createRadialGradient(x-radius*.23,y-radius*.24,0,x,y,radius);
  lamp.addColorStop(0, murk > .43 ? "#ddd1ae" : "#e8e3c9");
  lamp.addColorStop(.77, murk > .43 ? "#bdb18c" : "#d7d0b0");
  lamp.addColorStop(1,"#928867");
  ctx.save();
  ctx.beginPath();
  ctx.arc(x,y,radius,0,Math.PI*2);
  ctx.fillStyle = lamp;
  ctx.fill();
  ctx.clip();

  for (let i = 0; i < 260; i++) {
    const dx = (random(i * 11 + 91) - .5) * 2 * radius;
    const dy = (random(i * 11 + 94) - .5) * 2 * radius;
    ctx.fillStyle = i % 3 ? "#4037220b" : "#fff9da37";
    ctx.fillRect(x + dx, y + dy, i % 11 ? .72 : 1.65, .85);
  }
  for (let group = 0; group < 4; group++) {
    const presence = sampleConcentration(reading.suspension[group], layer.depth);
    const fine = group === 3;
    const count = Math.round(presence * (fine ? 100 : 95));
    for (let i = 0; i < count; i++) {
      const dot = particleSets[group][i];
      if (!dot) break;
      const dx = 2 * radius * (dot.x - .5) + Math.cos(time * .36 + dot.phase) * 2;
      const dy = 2 * radius * (dot.y - .5) + Math.sin(time * .39 + dot.phase) * 2;
      if (fine) {
        ctx.beginPath();
        ctx.ellipse(x+dx,y+dy,.65+2.2*dot.size,.5+1.1*dot.size,dot.phase,0,Math.PI*2);
        ctx.fillStyle = dot.size > .58 ? "#7963407e" : "#9b8a615e";
        ctx.fill();
      } else {
        const scale = 2 * radius / 660;
        const size = (135-group*27) * scale * (.54 + .77 * dot.size) * (.6 + .4 * reading.maturity);
        ctx.drawImage(sprites[dot.shape],x+dx-size/2,y+dy-size/2,size,size);
      }
    }
  }
  if (layer === sampleLayers.bottom && reading.retained > .035) {
    for (let i = 0; i < 20; i++) {
      const size = radius * (.40 + .28 * random(i + 56));
      const dx = radius * (2.14 * random(i * 7 + 12) - 1.07);
      const dy = radius * (.72 - .25 * reading.retained + .26 * random(i + 83));
      ctx.drawImage(sprites[i % sprites.length],x+dx-size/2,y+dy-size/2,size,size);
    }
  }
  ctx.restore();
  ctx.beginPath();
  ctx.arc(x,y,radius + 2.5,0,Math.PI*2);
  ctx.strokeStyle = "#6f7b6e";
  ctx.lineWidth = 4;
  ctx.stroke();

  const left = x - radius * .51;
  const bar = radius * 2 * 100 / 660;
  const baseline = y + radius * .65;
  ctx.fillStyle = "#453c2d";
  ctx.fillRect(left, baseline, bar, 1.5);
  ctx.font = "600 10px Arial, sans-serif";
  ctx.fillText("100 µm", left, baseline - 4);
}

function loadAsset(path, onload) {
  const asset = new Image();
  asset.addEventListener("load", onload);
  asset.src = new URL("./assets/eta/" + path, import.meta.url).href;
  return asset;
}

export class StationView {
  constructor(canvas, onload) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.frame = null;
    this.sprites = this.ctx ? Array.from({length:5}, (_, index) => createFloc(index)) : [];
    this.scenes = {
      coagulation: loadAsset("coagulacao.webp", onload),
      flocculation: loadAsset("floculacao.webp", onload),
      settling: loadAsset("decantacao.webp", onload),
    };
    this.dirt = loadAsset("lodo.webp", onload);
  }

  resize() {
    const w = this.canvas.clientWidth;
    const h = this.canvas.clientHeight;
    if (!this.ctx || !w || !h) return;
    const dpr = Math.min(devicePixelRatio || 1, 1.8);
    this.canvas.width = Math.round(w * dpr);
    this.canvas.height = Math.round(h * dpr);
    const fit = Math.max(w / width, h / height);
    const scale = Math.min(fit, w / 832);
    this.frame = { w, h, dpr, scale,
      sx: (w - width * scale) / 2, sy: (h - height * scale) * .53 };
  }

  draw(plant, reading, mode, depth, time) {
    if (!this.frame) return;
    const { ctx, frame, sprites, dirt } = this;
    if (mode === "micro") {
      drawMicroscope(ctx, frame, reading, sampleLayers[depth], time, sprites);
      return;
    }
    const { dpr, scale, sx, sy } = frame;
    ctx.setTransform(1,0,0,1,0,0);
    ctx.clearRect(0,0,this.canvas.width,this.canvas.height);
    const image = this.scenes[plant.inMixingChamber ? "coagulation"
      : (plant.phase === "flocculation" ? "flocculation" : "settling")];
    if (!image.naturalWidth) return;
    ctx.setTransform(dpr*scale,0,0,dpr*scale,sx*dpr,sy*dpr);
    ctx.drawImage(image,0,0,width,height);
    drawLiquid(ctx,plant,reading,time,sprites,dirt);
    drawReagent(ctx,plant,time);
    drawProbe(ctx,plant);
    if (plant.phase === "settling" || plant.phase === "result") drawOutlet(ctx,reading,time);
  }
}
