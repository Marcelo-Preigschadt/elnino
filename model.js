import { capacityAtLip, clamp, smoothstep } from "./vessel.js";

export const recipe = Object.freeze({ waterMl: 200, sandG: 20 });
export const maxAngle = 84;
export const layerCount = 14;
export const grainDensity = 2.65;
export const bedPorosity = .4;
const beakerAreaMm2 = Math.PI * 36 ** 2;
const epsilon = 1e-8;

function settlingSpeed(diameterMm) {
  // Ferguson and Church (2004), natural quartz grains in water at 20 °C.
  const diameterM = diameterMm / 1000;
  const submergedGravity = 1.65 * 9.80665;
  const kinematicViscosity = 1.004e-6;
  return 1000 * submergedGravity * diameterM ** 2
    / (18 * kinematicViscosity + Math.sqrt(.75 * submergedGravity * diameterM ** 3));
}

const grainClasses = [
  { diameterMm: .42, share: .44 },
  { diameterMm: .19, share: .34 },
  { diameterMm: .075, share: .22 },
].map((grain) => ({ ...grain, speed: settlingSpeed(grain.diameterMm) }));

function newSample() {
  return {
    water: 0,
    grains: grainClasses.map(() => ({
      bed: 0,
      layers: new Float64Array(layerCount),
      buffer: new Float64Array(layerCount),
    })),
  };
}

export function depositedSand(sample) {
  return sample.grains.reduce((total, grain) => total + grain.bed, 0);
}

export function suspendedSand(sample) {
  return sample.grains.reduce((total, grain) => (
    grain.layers.reduce((layerTotal, mass) => layerTotal + mass, total)
  ), 0);
}

export function totalSand(sample) {
  return depositedSand(sample) + suspendedSand(sample);
}

export function waterInPores(sample) {
  const poreVolume = depositedSand(sample) / grainDensity * bedPorosity / (1 - bedPorosity);
  return Math.min(sample.water, poreVolume);
}

function addSand(sample, mass) {
  sample.grains.forEach((grain, index) => { grain.bed += mass * grainClasses[index].share; });
}

function mix(sample, fraction) {
  for (const grain of sample.grains) {
    const released = grain.bed * fraction;
    grain.bed -= released;
    for (let index = 0; index < layerCount; index++) grain.layers[index] += released / layerCount;
  }
}

function settle(sample, dt) {
  if (suspendedSand(sample) < epsilon) return;

  const depth = Math.max(3, (sample.water - waterInPores(sample)) * 1000 / beakerAreaMm2);
  sample.grains.forEach((grain, classIndex) => {
    const shift = grainClasses[classIndex].speed * dt * layerCount / depth;
    const whole = Math.floor(shift);
    const partial = shift - whole;
    grain.buffer.fill(0);
    for (let index = 0; index < layerCount; index++) {
      const mass = grain.layers[index];
      const destination = index - whole;
      if (destination < 0) {
        grain.bed += mass;
        continue;
      }

      const moved = mass * partial;
      grain.buffer[destination] += mass - moved;
      if (destination === 0) grain.bed += moved;
      else grain.buffer[destination - 1] += moved;
    }
    [grain.layers, grain.buffer] = [grain.buffer, grain.layers];
  });
}

function transfer(source, receiver, water, liftFraction) {
  const waterFraction = water / source.water;
  let sandMoved = 0;
  source.grains.forEach((grain, index) => {
    const lifted = grain.bed * liftFraction;
    grain.bed -= lifted;
    let carried = lifted;

    for (let layer = 0; layer < layerCount; layer++) {
      // The outflow preferentially carries grains close to the free surface.
      const draw = waterFraction * (.5 + (layer + .5) / layerCount);
      const mass = grain.layers[layer] * Math.min(1, draw);
      grain.layers[layer] -= mass;
      carried += mass;
    }

    const incoming = receiver.grains[index].layers;
    incoming[layerCount - 2] += carried * .65;
    incoming[Math.floor(layerCount / 2)] += carried * .35;
    sandMoved += carried;
  });

  source.water -= water;
  receiver.water += water;
  return sandMoved;
}

export class Decantation {
  constructor() {
    this.source = newSample();
    this.receiver = newSample();
    this.phase = "prepare";
    this.preparation = null;
    this.restTime = 0;
    this.targetAngle = 0;
    this.angle = 0;
    this.flow = 0;
    this.flowSand = 0;
  }

  get nextPreparation() {
    if (this.source.water < recipe.waterMl - epsilon) return "water";
    if (totalSand(this.source) < recipe.sandG - epsilon) return "sand";
    return "mix";
  }

  get settledPercent() {
    return 100 * depositedSand(this.source) / recipe.sandG;
  }

  get flowing() {
    return this.flow > .1;
  }

  get canFinish() {
    return this.phase === "decant" && this.receiver.water >= 1 && this.targetAngle === 0 && this.angle === 0;
  }

  prepare() {
    if (this.phase !== "prepare" || this.preparation) return;
    const kind = this.nextPreparation;
    const durations = { water: 1, sand: .9, mix: 1.4 };
    this.preparation = { kind, time: 0, duration: durations[kind] };
  }

  advancePreparation(dt) {
    const action = this.preparation;
    const before = action.time / action.duration;
    action.time = Math.min(action.time + dt, action.duration);
    const after = action.time / action.duration;
    if (action.kind === "water") this.source.water += recipe.waterMl * (after - before);
    if (action.kind === "sand") addSand(this.source, recipe.sandG * (after - before));
    if (action.kind === "mix") mix(this.source, (after - before) / (1 - before));

    if (after === 1) {
      this.preparation = null;
      if (action.kind === "mix") this.phase = "settle";
    }
  }

  startDecanting() {
    if (this.phase === "settle") this.phase = "decant";
  }

  aim(angle) {
    if (this.phase === "decant" && Number.isFinite(angle)) {
      this.targetAngle = Math.round(clamp(angle, 0, maxAngle));
    }
  }

  finish() {
    if (this.canFinish) this.phase = "result";
  }

  step(dt) {
    if (!(dt > 0)) return;
    if (this.preparation) this.advancePreparation(dt);
    else if (this.phase === "settle") {
      this.restTime += dt;
      settle(this.source, dt);
    } else if (this.phase === "decant") {
      this.advanceDecanting(dt);
    }
  }

  advanceDecanting(dt) {
    const difference = this.targetAngle - this.angle;
    const movement = Math.abs(difference) < .18
      ? difference
      : clamp(difference * 13, -140, 102) * dt;
    this.angle += Math.sign(difference) * Math.min(Math.abs(difference), Math.abs(movement));

    const capacity = this.targetAngle === 0 && this.angle === 0 ? vesselCapacityAtRest : capacityAtLip(this.angle);
    const excess = Math.max(0, this.source.water + totalSand(this.source) / grainDensity - capacity);
    const freeWater = this.source.water - waterInPores(this.source);
    const waterOut = Math.min(freeWater, excess, Math.min(92, 13 * Math.sqrt(excess)) * dt);
    this.flow = waterOut / dt;
    this.flowSand = 0;

    if (waterOut > epsilon) {
      const fastTilt = smoothstep(36, 98, movement / dt) * smoothstep(28, 59, this.angle);
      const nearBed = smoothstep(70, 84, this.angle) * (1 - smoothstep(33, 71, this.source.water));
      const lift = 1 - Math.exp(-(fastTilt * .13 + nearBed * .8) * waterOut / Math.max(14, freeWater));
      this.flowSand = transfer(this.source, this.receiver, waterOut, lift) / waterOut;
    }

    settle(this.source, dt * (1 - .66 * smoothstep(2, 40, this.flow)));
    settle(this.receiver, dt);
  }
}

const vesselCapacityAtRest = capacityAtLip(0);
