const types = Object.freeze({
  bacteria: [
    { name: "Bacilos", shape: "rod", count: 18 },
    { name: "Cocos", shape: "cocci", count: 12 },
    { name: "Espirilos", shape: "spiral", count: 7 },
  ],
  protozoa: [
    { name: "Ciliados", shape: "ciliate", count: 3 },
    { name: "Flagelados", shape: "flagellate", count: 5 },
    { name: "Amebas", shape: "amoeba", count: 2 },
  ],
});

function random(seed) {
  const value = Math.sin(seed * 127.1 + 311.7) * 43758.5453;
  return value - Math.floor(value);
}

export function organismsAt(mode, point, chlorine, before = false) {
  const survival = before ? 1 : (chlorine?.[mode] ?? 1);
  const seed = Math.round(point.x * 1000) * 1009 + Math.round(point.depth * 1000);
  const organisms = [];
  const counts = types[mode].map((type, group) => {
    const count = type.count + Math.floor(3 * random(seed + group * 31)) - 1;
    let active = 0;
    for (let i = 0; i < count; i++) {
      const cellSeed = seed + group * 2731 + i * 47 + 193;
      const alive = (i + .5) / count < survival;
      if (alive) active++;
      organisms.push({
        shape: type.shape,
        seed: cellSeed,
        x: random(cellSeed),
        y: random(cellSeed + 1),
        size: .74 + .47 * random(cellSeed + 2),
        phase: Math.PI * 2 * random(cellSeed + 3),
        alive,
      });
    }
    return { name: type.name, active, total: count };
  });
  return {
    mode, organisms, counts,
    active: counts.reduce((sum, { active }) => sum + active, 0),
    total: organisms.length,
    survival,
    before,
    diameter: mode === "bacteria" ? 50 : 400,
  };
}

function ellipse(ctx, x, y, rx, ry) {
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
}

function membrane(ctx, length, thickness) {
  const light = ctx.createLinearGradient(0, -thickness, 0, thickness);
  light.addColorStop(0, "#f0f5d9c7");
  light.addColorStop(.26, "#a7b8a18c");
  light.addColorStop(.72, "#637f707d");
  light.addColorStop(1, "#edf2d5ad");
  ctx.fillStyle = light;
  ctx.fill();
  ctx.lineWidth = .85;
  ctx.strokeStyle = "#455e52c7";
  ctx.stroke();
  ctx.lineWidth = .45;
  ctx.strokeStyle = "#faffef8c";
  ellipse(ctx, 0, 0, length * .96, thickness * .91);
  ctx.stroke();
}

function drawBacterium(ctx, cell, pixelsPerMicron, time) {
  const size = cell.size * pixelsPerMicron;
  if (cell.shape === "rod") {
    const length = 2.2 * size;
    const thickness = .46 * size;
    ctx.beginPath();
    ctx.roundRect(-length / 2, -thickness, length, 2 * thickness, thickness);
    membrane(ctx, length / 2, thickness);
    ctx.fillStyle = "#64776583";
    for (let i = 0; i < 6; i++) {
      const x = (random(cell.seed + i * 8) - .5) * length * .72;
      const y = (random(cell.seed + i * 8 + 1) - .5) * thickness * 1.1;
      ellipse(ctx, x, y, .11 * size, .08 * size);
      ctx.fill();
    }
    if (cell.seed % 3 === 0) {
      ctx.beginPath();
      ctx.moveTo(length / 2, 0);
      ctx.bezierCurveTo(length * .8, -size * .5, length, size * .7, length * 1.6, Math.sin(time * 7 + cell.phase) * size * .5);
      ctx.lineWidth = .45;
      ctx.strokeStyle = "#7083708c";
      ctx.stroke();
    }
    return;
  }
  if (cell.shape === "cocci") {
    const count = 2 + cell.seed % 4;
    const radius = .36 * size;
    for (let i = 0; i < count; i++) {
      const angle = i * 2.2;
      const x = Math.cos(angle) * radius * (i ? 1.25 : 0);
      const y = Math.sin(angle) * radius * (i ? 1.25 : 0);
      ctx.save();
      ctx.translate(x, y);
      ellipse(ctx, 0, 0, radius, radius);
      membrane(ctx, radius, radius);
      ctx.restore();
    }
    return;
  }
  ctx.beginPath();
  for (let i = 0; i <= 28; i++) {
    const x = (i / 28 - .5) * 4.2 * size;
    const y = Math.sin(i / 28 * Math.PI * 4.5) * size * .48;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.strokeStyle = "#4f6b5bb8";
  ctx.lineWidth = .34 * size;
  ctx.lineCap = "round";
  ctx.stroke();
  ctx.strokeStyle = "#e7f0c995";
  ctx.lineWidth = Math.max(.45, .1 * size);
  ctx.stroke();
}

function drawProtozoan(ctx, cell, pixelsPerMicron, time) {
  const scale = cell.size * pixelsPerMicron;
  const ciliate = cell.shape === "ciliate";
  const flagellate = cell.shape === "flagellate";
  const length = (ciliate ? 67 : flagellate ? 16 : 46) * scale;
  const thickness = length * (ciliate ? .43 : flagellate ? .43 : .78);
  if (cell.shape === "amoeba") {
    ctx.beginPath();
    for (let i = 0; i <= 80; i++) {
      const angle = i / 80 * Math.PI * 2;
      const extension = 1 + .24 * Math.sin(5 * angle + cell.phase) + .15 * Math.cos(3 * angle - time * .6);
      const x = Math.cos(angle) * length * .63 * extension;
      const y = Math.sin(angle) * thickness * .65 * extension;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
  } else {
    ellipse(ctx, 0, 0, length / 2, thickness / 2);
  }
  const cytoplasm = ctx.createRadialGradient(-length * .17, -thickness * .2, 1, 0, 0, length * .6);
  cytoplasm.addColorStop(0, "#eff0d7b5");
  cytoplasm.addColorStop(.55, "#b8c3a69c");
  cytoplasm.addColorStop(.87, "#768f7e91");
  cytoplasm.addColorStop(1, "#d4dec2c0");
  ctx.fillStyle = cytoplasm;
  ctx.fill();
  ctx.lineWidth = 1.1;
  ctx.strokeStyle = "#48675ac2";
  ctx.stroke();
  ctx.save();
  ctx.clip();
  for (let i = 0; i < (flagellate ? 18 : 55); i++) {
    const seed = cell.seed + 19 * i;
    const x = (random(seed) - .5) * length * 1.4;
    const y = (random(seed + 1) - .5) * thickness * 1.3;
    const r = (.65 + 2.4 * random(seed + 2)) * scale;
    ellipse(ctx, x, y, r, r * .69);
    ctx.fillStyle = i % 3 ? "#4b64543b" : "#f9ffe28c";
    ctx.fill();
  }
  ellipse(ctx, -length * .1, thickness * .05, length * .13, thickness * .18);
  ctx.fillStyle = "#788f6c66";
  ctx.fill();
  ctx.strokeStyle = "#697f6689";
  ctx.lineWidth = .6;
  ctx.stroke();
  for (const sign of [-1, 1]) {
    ellipse(ctx, length * .29 * sign, -thickness * .09, thickness * .105, thickness * .105);
    ctx.fillStyle = "#f6fbd7be";
    ctx.fill();
    ctx.strokeStyle = "#738b7175";
    ctx.stroke();
  }
  ctx.restore();
  ctx.strokeStyle = "#5c7b637d";
  ctx.lineWidth = .58;
  if (ciliate) {
    for (let i = 0; i < 38; i++) {
      const angle = i / 38 * Math.PI * 2;
      const x = Math.cos(angle) * length / 2;
      const y = Math.sin(angle) * thickness / 2;
      const beat = Math.sin(time * 15 - angle * 5) * .7;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + (Math.cos(angle) * 3.5 + beat) * scale, y + (Math.sin(angle) * 3.5 + beat) * scale);
      ctx.stroke();
    }
  }
  if (flagellate) {
    for (const sign of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(length / 2, sign * thickness * .13);
      ctx.bezierCurveTo(length, sign * thickness * .9, length * 1.3, Math.sin(time * 9 + sign) * thickness,
        length * 2, sign * thickness * .3);
      ctx.stroke();
    }
  }
}

export function drawMicrobiology(ctx, frame, field, time, showInactive) {
  const { w, h, dpr } = frame;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.fillStyle = "#182a27";
  ctx.fillRect(0, 0, w, h);
  const x = w / 2;
  const y = h / 2 + 2;
  const radius = Math.min(w * .44, h * .45);
  const pixelsPerMicron = 2 * radius / field.diameter;
  const lamp = ctx.createRadialGradient(x - radius * .22, y - radius * .19, 0, x, y, radius);
  lamp.addColorStop(0, "#f5f3dd");
  lamp.addColorStop(.8, "#dce4cd");
  lamp.addColorStop(1, "#9aa78c");
  ctx.save();
  ellipse(ctx, x, y, radius, radius);
  ctx.fillStyle = lamp;
  ctx.fill();
  ctx.clip();
  for (const cell of field.organisms) {
    if (!cell.alive && !showInactive) continue;
    const motion = cell.alive ? time : 0;
    const speed = cell.shape === "ciliate" ? .08 : .035;
    const orbitX = .76 * Math.sin(cell.phase + motion * speed);
    const orbitY = .76 * Math.cos(cell.phase * 2.1 + motion * speed * .83);
    const localX = .33 * (2 * cell.x - 1) + orbitX;
    const localY = .33 * (2 * cell.y - 1) + orbitY;
    const distance = Math.max(1, Math.hypot(localX, localY) / .83);
    const dx = radius * localX / distance;
    const dy = radius * localY / distance;
    ctx.save();
    ctx.translate(x + dx, y + dy);
    ctx.rotate(cell.phase + Math.sin(motion * .39 + cell.phase) * .38);
    if (!cell.alive) ctx.globalAlpha = .23;
    if (field.mode === "bacteria") drawBacterium(ctx, cell, pixelsPerMicron, motion);
    else drawProtozoan(ctx, cell, pixelsPerMicron, motion);
    ctx.restore();
  }
  ctx.restore();
  ellipse(ctx, x, y, radius + 2, radius + 2);
  ctx.lineWidth = 4;
  ctx.strokeStyle = "#718677";
  ctx.stroke();
  const microns = field.mode === "bacteria" ? 5 : 50;
  const left = x - radius * .56;
  const baseline = y + radius * .70;
  ctx.fillStyle = "#334b3b";
  ctx.fillRect(left, baseline, microns * pixelsPerMicron, 2);
  ctx.font = "600 10px Arial, sans-serif";
  ctx.fillText(microns + " µm", left, baseline - 5);
}
