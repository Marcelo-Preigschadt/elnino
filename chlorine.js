export const chlorineProducts = Object.freeze({
  sodium: Object.freeze({ name: "Hipoclorito de sódio", formula: "NaClO", active: 12, form: "Solução concentrada" }),
  diluted: Object.freeze({ name: "Hipoclorito de sódio", formula: "NaClO", active: 2.5, form: "Solução diluída" }),
  calcium: Object.freeze({ name: "Hipoclorito de cálcio", formula: "Ca(ClO)₂", active: 65, form: "Granulado" }),
  gas: Object.freeze({ name: "Cloro gasoso", formula: "Cl₂", active: 100, form: "Cl₂ puro no cenário" }),
});

export function activeChlorine(product, dose) {
  if (!Object.hasOwn(chlorineProducts, product) || !Number.isFinite(dose) || dose <= 0) return 0;
  return dose * chlorineProducts[product].active / 100;
}

export function otoColor(concentration) {
  const intensity = 1 - Math.exp(-Math.max(0, concentration) / 1.6);
  return "rgb(" + [255, 255 - 60 * intensity, 251 - 246 * intensity].map(Math.round).join(",") + ")";
}

const decayPerMinute = .006;

export class Chlorination {
  constructor(ph, turbidity) {
    this.ph = ph;
    this.demand = .40 + Math.min(.6, .07 * turbidity);
    this.demandRemaining = this.demand;
    this.seconds = 0;
    this.applied = 0;
    this.free = 0;
    this.combined = 0;
    this.ct = 0;
    this.doses = [];
    this.running = false;
    this.oto = null;
    this.otoSeconds = 0;
    this.electrode = null;
    this.electrodeSeconds = 0;
  }

  add(product, dose) {
    const active = activeChlorine(product, dose);
    if (!active || dose < .1 || dose > 200) return false;
    const consumed = Math.min(active, this.demandRemaining);
    this.demandRemaining -= consumed;
    this.applied += active;
    this.free += active - consumed;
    // A small combined-chlorine fraction represents the nitrogenous demand in this scenario.
    this.combined += .15 * consumed;
    this.doses.push({ product, dose, active, seconds: this.seconds });
    this.running = true;
    return true;
  }

  step(seconds) {
    if (!this.running || !Number.isFinite(seconds) || seconds <= 0) return;
    const minutes = seconds / 60;
    const fraction = Math.exp(-decayPerMinute * minutes);
    // Integrate the residual, preserving CT across increments and repeated doses.
    this.ct += this.free * (1 - fraction) / decayPerMinute;
    this.free *= fraction;
    this.combined *= Math.exp(-.003 * minutes);
    this.seconds += seconds;
  }

  testOto() {
    if (this.oto && this.otoSeconds < 2) return;
    this.oto = { total: this.free + this.combined, seconds: this.seconds };
    this.otoSeconds = 0;
  }

  attachElectrode() {
    if (this.electrode !== null) return;
    this.electrode = 0;
    this.electrodeSeconds = 0;
  }

  stepInstruments(seconds) {
    if (!Number.isFinite(seconds) || seconds <= 0) return;
    if (this.oto) this.otoSeconds = Math.min(2, this.otoSeconds + seconds);
    if (this.electrode !== null) {
      this.electrodeSeconds += seconds;
      this.electrode += (this.free - this.electrode) * (1 - Math.exp(-seconds / .7));
    }
  }

  get instrumentsActive() {
    return Boolean(this.oto && this.otoSeconds < 2)
      || (this.electrode !== null && (this.electrodeSeconds < 3 || Math.abs(this.electrode - this.free) > .002));
  }

  read() {
    const hocl = 1 / (1 + 10 ** (this.ph - 7.5));
    const effectiveCt = this.ct * hocl / .76;
    return {
      seconds: this.seconds,
      applied: this.applied,
      free: this.free,
      combined: this.combined,
      total: this.free + this.combined,
      demand: this.demand,
      demandRemaining: this.demandRemaining,
      ct: this.ct,
      hocl,
      bacteria: 10 ** -Math.min(12, effectiveCt * 2.2),
      protozoa: 10 ** -Math.min(12, effectiveCt * .12),
    };
  }
}
