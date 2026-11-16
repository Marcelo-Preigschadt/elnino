export const rawTurbidity = 120;
export const initialPh = 7.20;
export const alkalinity = 22;
export const maxDose = 60;
export const initialIncrement = 10;
export const maximumCorrection = 12;
export const tankDepth = 3.0;

export const process = Object.freeze({
  correction: Object.freeze({ duration: 24, demonstrationRate: 3, doseSeconds: 8 }),
  coagulation: Object.freeze({ duration: 45, demonstrationRate: 3, doseSeconds: 12 }),
  flocculation: Object.freeze({ duration: 25 * 60, demonstrationRate: 30, minimumContact: 5 * 60 }),
  settling: Object.freeze({ duration: 2 * 60 * 60, demonstrationRate: 60, minimumContact: 15 * 60 }),
});

export const correctors = Object.freeze({
  lime: Object.freeze({ label: "Cal hidratada", molarMass: 74.09, equivalents: 2, carbon: 0 }),
  soda: Object.freeze({ label: "Barrilha", molarMass: 105.99, equivalents: 2, carbon: 1 }),
  acid: Object.freeze({ label: "Ácido clorídrico", molarMass: 36.46, equivalents: -1, carbon: 0 }),
});

const groups = Object.freeze([
  { fraction: .46, speed: 4.5 },
  { fraction: .37, speed: 2.65 },
  { fraction: .17, speed: 1.25 },
]);

export const clamp = (n, low = 0, high = 1) => Math.min(high, Math.max(low, n));

const k1 = 10 ** -6.35;
const k2 = 10 ** -10.33;
const kw = 1e-14;
const stabilizationSeconds = 2.4;

function carbonateCharges(hydrogen) {
  const denominator = hydrogen ** 2 + k1 * hydrogen + k1 * k2;
  return (k1 * hydrogen + 2 * k1 * k2) / denominator;
}

const initialHydrogen = 10 ** -initialPh;
const alkalinityMolar = alkalinity / 50000;
const dissolvedCarbon = (alkalinityMolar - kw / initialHydrogen + initialHydrogen)
  / carbonateCharges(initialHydrogen);

export function estimatePh(doseMgL, corrections = {}) {
  // Scenario: PAC with 10% Al₂O₃ and 50% basicity, a carbonate buffer at 25 °C.
  const aluminium = doseMgL * .001 * .10 * 2 / 101.96;
  const acidity = aluminium * 3 * (1 - .50);
  let remaining = alkalinityMolar - acidity;
  let carbon = dissolvedCarbon;
  for (const [name, { molarMass, equivalents, carbon: addedCarbon }] of Object.entries(correctors)) {
    const moles = (corrections[name] ?? 0) * .001 / molarMass;
    remaining += moles * equivalents;
    carbon += moles * addedCarbon;
  }
  let low = 0;
  let high = 14;
  for (let i = 0; i < 28; i++) {
    const mid = (low + high) / 2;
    const hydrogen = 10 ** -mid;
    const carbonateAlkalinity = carbon * carbonateCharges(hydrogen) + kw / hydrogen - hydrogen;
    if (carbonateAlkalinity < remaining) low = mid;
    else high = mid;
  }
  return (low + high) / 2;
}

function doseEffect(dose, ph) {
  const destabilization = 1 - Math.exp(-dose / 9);
  const excess = Math.max(0, dose - 30) / 24;
  const acidity = (ph - 6.85) / .95;
  return destabilization * Math.exp(-(excess ** 2) - acidity ** 4);
}

export class Treatment {
  constructor() {
    this.phase = "ready";
    this.seconds = 0;
    this.appliedDose = 0;
    this.corrections = { lime: 0, soda: 0, acid: 0 };
    this.revision = 0;
    this.mixing = null;
    this.flocculationSeconds = 0;
    this.readings = [];
    this.measurementSeconds = null;
    this.sample = null;
  }

  get inMixingChamber() {
    return this.phase === "ready" || this.phase === "coagulation";
  }

  get active() {
    const unit = this.unit;
    return Boolean(unit) && this.seconds < unit.duration;
  }

  get unit() {
    if (!this.inMixingChamber) return process[this.phase];
    if (!this.mixing) return null;
    return this.mixing.kind === "pac" ? process.coagulation : process.correction;
  }

  get meterActive() {
    return this.measurementSeconds !== null;
  }

  get lastReading() {
    return this.readings.at(-1);
  }

  get measuredCurrent() {
    return this.lastReading?.revision === this.revision;
  }

  get canMeasure() {
    return this.inMixingChamber && !this.active && !this.meterActive && !this.measuredCurrent;
  }

  get canAdjust() {
    return this.inMixingChamber && !this.active && !this.meterActive && this.measuredCurrent;
  }

  get canAddDose() {
    return this.canAdjust && this.appliedDose < maxDose;
  }

  get canAdvance() {
    switch (this.phase) {
      case "coagulation":
        return this.canAdjust;
      case "flocculation":
        return this.seconds >= process.flocculation.minimumContact;
      case "settling":
        return this.seconds >= process.settling.minimumContact;
      default:
        return false;
    }
  }

  measure() {
    if (this.canMeasure) this.measurementSeconds = 0;
  }

  stepMeter(seconds) {
    if (!this.meterActive || !Number.isFinite(seconds) || seconds <= 0) return;
    this.measurementSeconds += seconds;
    if (this.measurementSeconds < stabilizationSeconds) return;
    this.readings.push({
      revision: this.revision,
      operation: this.mixing?.kind ?? "raw",
      dose: this.appliedDose,
      ph: estimatePh(this.appliedDose, this.corrections),
    });
    this.measurementSeconds = null;
  }

  mix(kind, amount) {
    this.revision++;
    this.mixing = { kind, amount };
    this.seconds = 0;
  }

  correct(kind, dose) {
    if (!this.canAdjust || !Object.hasOwn(correctors, kind) || !Number.isFinite(dose)
      || dose < .5 || dose > maximumCorrection) return;
    this.corrections[kind] += dose;
    this.mix(kind, dose);
  }

  addDose(dose) {
    if (!this.canAddDose || !Number.isFinite(dose) || dose < 1) return;
    const amount = Math.min(maxDose - this.appliedDose, dose);
    this.appliedDose += amount;
    this.phase = "coagulation";
    this.mix("pac", amount);
  }

  step(seconds) {
    if (!this.active || !Number.isFinite(seconds) || seconds <= 0) return;
    this.seconds = Math.min(this.seconds + seconds, this.unit.duration);
  }

  advance() {
    if (!this.canAdvance) return;
    switch (this.phase) {
      case "coagulation":
        this.phase = "flocculation";
        this.seconds = 0;
        this.mixing = null;
        break;
      case "flocculation":
        this.flocculationSeconds = this.seconds;
        this.phase = "settling";
        this.seconds = 0;
        break;
      case "settling":
        this.sample = this.read();
        this.phase = "result";
        break;
    }
  }

  read() {
    if (this.sample) return this.sample;
    const flocTime = this.phase === "flocculation" ? this.seconds : this.flocculationSeconds;
    const maturity = 1 - Math.exp(-flocTime / 370);
    const ph = this.lastReading?.ph ?? initialPh;
    const effect = doseEffect(this.appliedDose, ph);
    const aggregated = effect * maturity * .985;
    const hours = this.phase === "settling" ? this.seconds / 3600 : 0;
    const velocityFactor = .48 + .52 * Math.sqrt(maturity * effect);
    const flocs = groups.map(({ fraction, speed }) => ({
      mass: fraction * aggregated,
      drop: hours * speed * velocityFactor / tankDepth,
    }));
    const fines = { mass: 1 - aggregated, drop: hours * .12 / tankDepth };
    const suspension = [...flocs, fines];
    const retained = suspension.reduce((total, { mass, drop }) => total + mass * clamp(drop), 0);
    return {
      seconds: this.seconds,
      dose: this.appliedDose,
      ph,
      maturity,
      aggregated,
      retained,
      turbidity: rawTurbidity * (1 - retained),
      suspension,
    };
  }
}
