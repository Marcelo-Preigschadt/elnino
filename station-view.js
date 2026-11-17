import { clamp } from "./treatment.js?v=7";
import { drawMicrobiology } from "./microbiology.js?v=7";

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

function columnDrop(drop, x) {
  const mean = clamp(drop);
  // The outlet side clears sooner, with the same mean retention as the bulk model.
  const gradient = .86 * Math.min(mean, 1 - mean);
  return mean + gradient * (2 * x - 1);
}

function suspensionProfile(front, depth) {
  if (front === 0) return 1;
  if (front === 1) return 0;
  const remaining = 1 - front;
  const spread = Math.min(.085, front, remaining);
  const presence = clamp((depth - front + spread) / (2 * spread));
  // Enrich the deeper water around the mean depth of the surviving suspension.
  // The adjustment integrates to zero over the column.
  const meanDepth = (1 + front) / 2 - spread ** 2 / (6 * remaining);
  return presence * (1 + 1.4 * Math.sqrt(front) * (depth - meanDepth));
}

function concentration(reading, x, depth) {
  return reading.suspension.reduce((sum, { mass, drop }) => (
    sum + mass * suspensionProfile(columnDrop(drop, x), depth)
  ), 0);
}

function floorAt(x) {
  const upper = floor.findIndex(([right]) => right >= x);
  const index = clamp(upper < 0 ? floor.length - 1 : upper, 1, floor.length - 1);
  const [[x0, y0], [x1, y1]] = floor.slice(index - 1, index + 1);
  return y0 + (y1 - y0) * clamp((x - x0) / (x1 - x0));
}

function sludgeTop(x, retained, localFloor = floorAt(x)) {
  const pooled = .78 + .5 * Math.exp(-(((x - width * .42) / 175) ** 2));
  return localFloor - 49 * pooled * retained;
}

export function inspectPoint(reading, point) {
  const { x, depth } = point;
  const worldX = waterLeft + waterWidth * x;
  const localFloor = floorAt(worldX);
  const columnHeight = localFloor - waterline;
  const worldY = waterline + columnHeight * depth;
  const crest = sludgeTop(worldX, reading.retained, localFloor);
  const inSludge = !reading.chlorine && reading.retained >= .007 && worldY >= crest;
  const fieldHeight = .11 * columnHeight;
  const bedThickness = localFloor - crest;
  const deposit = reading.chlorine || reading.retained < .007 ? 0
    : clamp(.55 + (worldY - crest) / fieldHeight) * clamp(bedThickness / 6);
  const groups = reading.suspension.map(({ mass, drop }) => {
    const front = columnDrop(drop, x);
    return { front, mass: mass * suspensionProfile(front, Math.max(.018, depth)) * (1 - deposit) };
  });

  const fines = groups.at(-1).mass;
  const flocs = groups.slice(0, -1).reduce((sum, { mass }) => sum + mass, 0);
  return {
    groups, inSludge, deposit, fines, flocs,
    concentration: flocs + fines,
    seed: Math.round(x * 1000) * 1009 + Math.round(depth * 1000),
  };
}

function createFloc(index, magnified = false) {
  const picture = document.createElement("canvas");
  picture.width = picture.height = 82;
  const ctx = picture.getContext("2d");
  const center = 41;
  const branches = magnified ? 5 + index % 3 : 6;

  for (let i = 0; i < (magnified ? 195 : 93); i++) {
    const seed = 28 * i + 379 * index;
    const branch = i % branches;
    const angle = branch * (Math.PI * 2 / branches) + (random(seed + 1) - .5) * 1.55;
    const spread = 35 * random(seed + 2) ** (magnified ? .88 : 1.22);
    const stretch = magnified ? .67 + .27 * random(seed + 6 + index * 2) : .94;
    const x = center + Math.cos(angle) * spread * (.8 + random(seed + 3) * .2);
    const y = center + Math.sin(angle) * spread * stretch;
    const r = 1.1 + random(seed + 4) * (4.65 - .032 * spread);
    const alpha = (.16 + .27 * random(seed + 5)) * (1 - spread / 54) * (magnified ? 1.72 : 1);
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
  polygon(ctx, surface);
  ctx.fillStyle = linear(ctx, 0, topBack[0][1], 0, waterline, [
    [0, "rgba(99,139,135,.29)"],
    [.47, "rgba(139,171,162,.30)"],
    [1, "rgba(112,155,154,.43)"],
  ]);
  ctx.fill();
  const haze = ctx.createLinearGradient(waterLeft, 0, waterRight, 0);
  for (let i = 0; i <= 12; i++) {
    const x = i / 12;
    const murk = concentration(reading, x, .018);
    haze.addColorStop(x, "rgba(147,121,79," + (.42 * murk) + ")");
  }
  ctx.fillStyle = haze;
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
    crest.push([x, sludgeTop(x, reading.retained)]);
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
      if (dot.rank > show) continue;
      const column = clamp(dot.x + Math.sin(time * .9 + dot.phase) * drift);
      const front = columnDrop(drop, column);
      const x = waterLeft + waterWidth * column;
      const depth = Math.max(front, dot.y + front + Math.cos(time * .72 + dot.phase) * drift * .42);
      if (depth >= 1) continue;
      const y = waterline + (floorAt(x) - waterline) * depth;
      if (settling && reading.retained >= .007 && y >= sludgeTop(x, reading.retained)) continue;
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

function drawWaterHaze(ctx, reading, haze) {
  if (haze.retained !== reading.retained) {
    const { image, context } = haze;
    const { data, width: columns, height: rows } = image;
    for (let col = 0; col < columns; col++) {
      const x = col / (columns - 1);
      const depthScale = wetHeight / (floorAt(waterLeft + waterWidth * x) - waterline);
      const fronts = reading.suspension.map(({ drop }) => columnDrop(drop, x));
      for (let row = 0; row < rows; row++) {
        const depth = row / (rows - 1) * depthScale;
        let murk = 0;
        for (let group = 0; group < fronts.length; group++) {
          murk += reading.suspension[group].mass * suspensionProfile(fronts[group], Math.min(1, depth));
        }
        const pixelIndex = (row * columns + col) * 4;
        data[pixelIndex] = 157;
        data[pixelIndex + 1] = 123;
        data[pixelIndex + 2] = 76;
        data[pixelIndex + 3] = 150 * murk;
      }
    }
    context.putImageData(image, 0, 0);
    haze.retained = reading.retained;
  }
  ctx.drawImage(haze.canvas, waterLeft, waterline, waterWidth, wetHeight);
}

function drawLiquid(ctx, plant, reading, time, sprites, dirt, haze) {
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
  drawWaterHaze(ctx, reading, haze);
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

function drawChlorineInstruments(ctx, plant, time) {
  const treatment = plant.chlorination;
  const lastDose = treatment.doses.at(-1);
  if (lastDose && treatment.seconds - lastDose.seconds < 12) {
    const x = width * .26;
    const impact = waterline - 14;
    ctx.strokeStyle = "#d8ede3b2";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(x, topBack[0][1] - 25);
    ctx.lineTo(x, impact);
    ctx.stroke();
    ctx.beginPath();
    ctx.ellipse(x, impact, 13 + Math.sin(time * 5) * 4, 3, 0, 0, Math.PI * 2);
    ctx.stroke();
  }
  if (treatment.electrode === null) return;
  const x = width * .72;
  const y = topBack[0][1] - 33;
  ctx.fillStyle = "#233d37";
  ctx.fillRect(x - 25, y, 50, 47);
  ctx.fillStyle = "#b8d5b6";
  ctx.fillRect(x - 19, y + 7, 38, 24);
  ctx.font = "700 15px monospace";
  ctx.fillStyle = "#1b382b";
  ctx.fillText(treatment.electrode.toFixed(2), x - 18, y + 24);
  ctx.fillStyle = "#687b72";
  ctx.fillRect(x - 4, y + 47, 8, 83);
  ctx.fillStyle = "#c5d5c6";
  ctx.fillRect(x - 2, y + 124, 4, 20);
}

function drawSamplingPoint(ctx, point, scale) {
  const x = waterLeft + waterWidth * point.x;
  const y = point.surfaceY ?? waterline + (floorAt(x) - waterline) * point.depth;
  const radius = 13 / scale;
  ctx.save();
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fillStyle = "#064b373c";
  ctx.fill();
  ctx.lineWidth = 4 / scale;
  ctx.strokeStyle = "#173b36";
  ctx.stroke();
  ctx.lineWidth = 2 / scale;
  ctx.strokeStyle = "#baffd4";
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(x - radius * .46, y);
  ctx.lineTo(x + radius * .46, y);
  ctx.moveTo(x, y - radius * .46);
  ctx.lineTo(x, y + radius * .46);
  ctx.stroke();
  ctx.restore();
}

function createMicroscopeSediment(sprites) {
  const texture = document.createElement("canvas");
  const size = texture.width = texture.height = 384;
  const ctx = texture.getContext("2d");
  const grains = ["#19120d", "#302219", "#7e593d", "#ad8258", "#ccb190"];
  for (let i = 0; i < 1850; i++) {
    const seed = 16 * i + 47;
    const x = size * random(seed);
    const y = size * random(seed + 1);
    const radius = .65 + 8 * random(seed + 2) ** 3.2;
    const hue = grains[Math.floor(random(seed + 5) * grains.length)];
    const haze = ctx.createRadialGradient(x - radius * .18, y - radius * .25, 0, x, y, radius);
    haze.addColorStop(0, hue + "dc");
    haze.addColorStop(.54, hue + "b0");
    haze.addColorStop(1, hue + "12");
    ctx.beginPath();
    ctx.ellipse(x, y, radius, radius * (.38 + .58 * random(seed + 3)), random(seed + 4) * Math.PI, 0, Math.PI * 2);
    ctx.fillStyle = haze;
    ctx.fill();
    if (i % 13 === 0) {
      const diameter = 15 + 22 * random(seed + 6);
      ctx.drawImage(sprites[i % sprites.length], x - diameter / 2, y - diameter / 2, diameter, diameter);
    }
  }
  return texture;
}

function drawMicroscopeSediment(ctx, x, y, radius, sample, texture) {
  const crest = y + radius * (1.06 - 2.24 * sample.deposit);
  const phase = sample.seed * .027;
  ctx.save();
  ctx.beginPath();
  for (let i = 0; i <= 48; i++) {
    const at = i / 48;
    const edge = crest + radius * (.037 * Math.sin(10 * at + phase) + .017 * Math.sin(37 * at + phase));
    if (i === 0) ctx.moveTo(x - radius, edge);
    else ctx.lineTo(x - radius + 2 * radius * at, edge);
  }
  ctx.lineTo(x + radius, y + radius);
  ctx.lineTo(x - radius, y + radius);
  ctx.closePath();
  ctx.clip();
  ctx.fillStyle = linear(ctx, 0, crest, 0, y + radius, [[0, "#846043"], [.32, "#5c402e"], [1, "#36271f"]]);
  ctx.fillRect(x - radius, y - radius, 2 * radius, 2 * radius);
  const crop = texture.width * .68;
  const xOffset = (texture.width - crop) * random(sample.seed + 1);
  const yOffset = (texture.height - crop) * random(sample.seed + 2);
  ctx.drawImage(texture, xOffset, yOffset, crop, crop, x - radius, y - radius, 2 * radius, 2 * radius);
  ctx.restore();
}

function opticalColor(light, dark, opacity) {
  const channels = light.map((value, i) => Math.round(value + (dark[i] - value) * opacity));
  return "rgb(" + channels.join(",") + ")";
}

function drawMicroscope(ctx, frame, reading, sample, time, sprites, sediment) {
  const { w, h, dpr } = frame;
  ctx.setTransform(dpr,0,0,dpr,0,0);
  ctx.fillStyle = linear(ctx,0,0,w,h,[[0,"#24342e"],[1,"#121f1e"]]);
  ctx.fillRect(0,0,w,h);
  const x = w / 2;
  const y = h / 2 + 2;
  const radius = Math.min(w*.40,h*.453);
  const opacity = clamp(.80 * sample.fines + 1.08 * sample.flocs);
  const lamp = ctx.createRadialGradient(x-radius*.23,y-radius*.24,0,x,y,radius);
  lamp.addColorStop(0, opticalColor([251, 252, 240], [215, 179, 123], opacity));
  lamp.addColorStop(.83, opticalColor([235, 239, 222], [177, 140, 90], opacity));
  lamp.addColorStop(1, opticalColor([162, 174, 157], [116, 88, 57], opacity));
  ctx.save();
  ctx.beginPath();
  ctx.arc(x,y,radius,0,Math.PI*2);
  ctx.fillStyle = lamp;
  ctx.fill();
  ctx.clip();

  const diameterMicrons = [180, 117, 74];
  const micronsPerPixel = 660 / (2 * radius);
  for (let group = sample.groups.length - 1; group >= 0; group--) {
    const { mass, front } = sample.groups[group];
    const fine = group === 3;
    const dots = particleSets[group];
    const count = Math.min(dots.length, Math.round(mass * (fine ? 117 : 73)));
    const descent = time ? front * (fine ? 1.15 : 2.25) : 0;
    for (let i = 0; i < count; i++) {
      const dot = dots[i];
      const seed = sample.seed + 1301 * group + 19 * i;
      const dx = 2 * radius * (random(seed) - .5) + Math.cos(time * .36 + dot.phase) * 2;
      const dy = 2 * radius * ((random(seed + 1) + descent) % 1 - .5)
        + Math.sin(time * .39 + dot.phase) * 2;
      if (fine) {
        const grain = .60 + 1.90 * dot.size ** 1.45;
        ctx.beginPath();
        ctx.ellipse(x + dx, y + dy, grain, grain * (.55 + .31 * dot.rank), dot.phase, 0, Math.PI * 2);
        ctx.fillStyle = dot.size > .61 ? "#614832bc" : "#8d775b89";
        ctx.fill();
      } else {
        const size = (diameterMicrons[group] / micronsPerPixel) * (.67 + .69 * dot.size) * (.56 + .44 * reading.maturity);
        ctx.drawImage(sprites[dot.shape], x + dx - size / 2, y + dy - size / 2, size, size);
      }
    }
  }
  if (sample.deposit > 0) drawMicroscopeSediment(ctx, x, y, radius, sample, sediment);
  ctx.restore();
  ctx.beginPath();
  ctx.arc(x,y,radius + 2.5,0,Math.PI*2);
  ctx.strokeStyle = "#6f7b6e";
  ctx.lineWidth = 4;
  ctx.stroke();

  const left = x - radius * .51;
  const bar = 100 / micronsPerPixel;
  const baseline = y + radius * .65;
  ctx.fillStyle = sample.deposit > .28 ? "#fff3da" : "#453c2d";
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
  constructor(canvas, microscope, onload) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.frame = null;
    this.microscope = microscope;
    this.lens = microscope.getContext("2d");
    this.lensFrame = null;
    this.sprites = this.ctx ? Array.from({length:5}, (_, index) => createFloc(index)) : [];
    this.microscopeSprites = null;
    this.microscopeSediment = null;
    const haze = document.createElement("canvas");
    haze.width = 64;
    haze.height = 48;
    const context = haze.getContext("2d");
    this.haze = { canvas: haze, context, image: context.createImageData(haze.width, haze.height) };
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

  resizeMicroscope() {
    const w = this.microscope.clientWidth;
    const h = this.microscope.clientHeight;
    if (!this.lens || !w || !h) return;
    if (!this.microscopeSprites) {
      this.microscopeSprites = Array.from({ length: 7 }, (_, index) => createFloc(index, true));
      this.microscopeSediment = createMicroscopeSediment(this.microscopeSprites);
    }
    const dpr = Math.min(devicePixelRatio || 1, 1.8);
    this.microscope.width = Math.round(w * dpr);
    this.microscope.height = Math.round(h * dpr);
    this.lensFrame = { w, h, dpr };
  }

  pointAt(clientX, clientY) {
    if (!this.frame) return null;
    const rect = this.canvas.getBoundingClientRect();
    const { w, h, scale, sx, sy } = this.frame;
    const worldX = ((clientX - rect.left) * w / rect.width - sx) / scale;
    const worldY = ((clientY - rect.top) * h / rect.height - sy) / scale;
    const localFloor = floorAt(worldX);
    if (worldX < waterLeft || worldX > waterRight || worldY < topBack[0][1] || worldY > localFloor) return null;
    const x = (worldX - waterLeft) / waterWidth;
    const depth = clamp((worldY - waterline) / (localFloor - waterline));
    return { x, depth, surfaceY: worldY < waterline ? worldY : undefined };
  }

  draw(plant, reading, point, time) {
    if (!this.frame) return;
    const { ctx, frame, sprites, dirt, haze } = this;
    const { dpr, scale, sx, sy } = frame;
    ctx.setTransform(1,0,0,1,0,0);
    ctx.clearRect(0,0,this.canvas.width,this.canvas.height);
    const image = this.scenes[plant.inMixingChamber ? "coagulation"
      : (plant.phase === "flocculation" ? "flocculation" : "settling")];
    if (!image.naturalWidth) return;
    ctx.setTransform(dpr*scale,0,0,dpr*scale,sx*dpr,sy*dpr);
    ctx.drawImage(image,0,0,width,height);
    drawLiquid(ctx,plant,reading,time,sprites,dirt,haze);
    drawReagent(ctx,plant,time);
    drawProbe(ctx,plant);
    if (plant.phase === "settling" || plant.phase === "result") drawOutlet(ctx,reading,time);
    if (plant.phase === "disinfection") drawChlorineInstruments(ctx, plant, time);
    if (point) drawSamplingPoint(ctx, point, scale);
  }

  drawSample(reading, sample, time, biology = null, showInactive = false) {
    if (this.lensFrame) {
      if (biology) drawMicrobiology(this.lens, this.lensFrame, biology, time, showInactive);
      else drawMicroscope(this.lens, this.lensFrame, reading, sample, time, this.microscopeSprites, this.microscopeSediment);
    }
  }
}
