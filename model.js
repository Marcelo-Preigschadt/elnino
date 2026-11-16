import { capacityAtLip, clamp, smoothstep } from "./vessel.js";

export const recipe = Object.freeze({ waterMl: 200, sandG: 20 });
export const maxAngle = 84;
export const layerCount = 14;
export const grainDensity = 2.65;
export const bedPorosity = .4;
const beakerAreaMm2 = Math.PI * 36 ** 2;
const epsilon = 1e-8;
const maxPourRateMlPerSecond = 18;
const overflowHeadMl = 23;

function settlingSpeed(diameterMm) {
  // Ferguson and Church (2004), natural quartz grains in water at 20 °C.
  const diameterM = diameterMm / 1000;
  const submergedGravity = 1.65 * 9.80665;
  const kinematicViscosity = 1.004e-6;
  return 1000 * submergedGravity * diameterM ** 2
    / (18 * kinematicViscosity + Math.sqrt(.75 * submergedGravity * diameterM ** 3));
}

const grainClasses = [
  { diameterMm: .160, share: .38 },
  { diameterMm: .078, share: .25 },
  { diameterMm: .041, share: .22 },
  { diameterMm: .022, share: .15 },
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
  sample.grains.forEach((grain, index) => {
    grain.layers[layerCount - 1] += mass * grainClasses[index].share;
  });
}

function mix(sample, fraction, dt) {
  const circulation = 1 - Math.exp(-2 * dt);
  for (const grain of sample.grains) {
    const released = grain.bed * fraction;
    grain.bed -= released;
    const average = grain.layers.reduce((total, mass) => total + mass, 0) / layerCount;
    for (let index = 0; index < layerCount; index++) {
      const redistributed = (average - grain.layers[index]) * circulation;
      grain.layers[index] += redistributed + released / layerCount;
    }
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

function angleDuringPour(angle, requested, contents) {
  if (requested <= angle || contents - capacityAtLip(requested) <= overflowHeadMl) return requested;

  // Keep the liquid near the spout while a hand pour drains the beaker.
  let lower = angle;
  let upper = requested;
  for (let iteration = 0; iteration < 8; iteration++) {
    const middle = (lower + upper) / 2;
    if (contents - capacityAtLip(middle) > overflowHeadMl) upper = middle;
    else lower = middle;
  }
  return lower;
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
    const durations = { water: 5.8, sand: 2.8, mix: 6 };
    this.preparation = { kind, time: 0, duration: durations[kind] };
  }

  advancePreparation(dt) {
    const action = this.preparation;
    const before = action.time / action.duration;
    action.time = Math.min(action.time + dt, action.duration);
    const after = action.time / action.duration;
    const dose = smoothstep(0, 1, after) - smoothstep(0, 1, before);
    if (action.kind === "water") this.source.water += recipe.waterMl * dose;
    if (action.kind === "sand") {
      addSand(this.source, recipe.sandG * dose);
      settle(this.source, dt);
    }
    if (action.kind === "mix") mix(this.source, (after - before) / (1 - before), dt);

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
    } else if (this.phase === "prepare") {
      settle(this.source, dt);
    }
  }

  advanceDecanting(dt) {
    const difference = this.targetAngle - this.angle;
    const movement = Math.abs(difference) < .18
      ? difference
      : clamp(difference * 9, -110, 54) * dt;
    const requested = this.angle + Math.sign(difference) * Math.min(Math.abs(movement), Math.abs(difference));
    const contents = this.source.water + totalSand(this.source) / grainDensity;
    const nextAngle = angleDuringPour(this.angle, requested, contents);
    const angularVelocity = (nextAngle - this.angle) / dt;
    this.angle = nextAngle;

    const capacity = this.targetAngle === 0 && this.angle === 0 ? vesselCapacityAtRest : capacityAtLip(this.angle);
    const excess = Math.max(0, contents - capacity);
    const freeWater = this.source.water - waterInPores(this.source);
    // A stream weakens as the free surface approaches the lip. The upper limit represents a hand pour.
    const discharge = maxPourRateMlPerSecond * (excess / (excess + 17)) ** .85;
    const waterOut = Math.min(freeWater, excess, discharge * dt);
    this.flow = waterOut / dt;
    this.flowSand = 0;

    if (waterOut > epsilon) {
      const fastTilt = smoothstep(28, 53, angularVelocity) * smoothstep(28, 59, this.angle);
      const nearBed = smoothstep(70, 84, this.angle) * (1 - smoothstep(33, 71, this.source.water));
      const lift = 1 - Math.exp(-(fastTilt * .13 + nearBed * .8) * waterOut / Math.max(14, freeWater));
      this.flowSand = transfer(this.source, this.receiver, waterOut, lift) / waterOut;
    }

    settle(this.source, dt * (1 - .58 * smoothstep(2, 18, this.flow)));
    settle(this.receiver, dt);
  }
}

const vesselCapacityAtRest = capacityAtLip(0);
