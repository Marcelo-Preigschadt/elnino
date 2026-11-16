import { Treatment, alkalinity, clamp, correctors, initialIncrement, maxDose, maximumCorrection, process, rawTurbidity } from "./treatment.js?v=4";
import { StationView, sampleLayers } from "./station-view.js?v=4";

const byId = (id) => document.getElementById(id);
const canvas = byId("treatment-scene");
const scene = byId("scene");
const progress = ["coagulation", "flocculation", "settling"].map((name) => ({
  bar: byId(name + "-progress"),
  text: byId(name + "-percent"),
  step: byId("stage-" + name),
}));
const panels = Object.fromEntries(["dose", "flocculation", "settling", "result"].map((name) => [
  name, byId("panel-" + name),
]));
const speedControl = byId("speed");
const doseControl = byId("dose");
const measureButton = byId("measure-ph");
const correctionPanel = byId("correction-panel");
const correctorControl = byId("corrector");
const correctionDose = byId("correction-dose");
const viewTank = byId("view-tank");
const viewMicro = byId("view-micro");
const depthControl = byId("sample-depth");
const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");
const decimal = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 1 });
const pHFormat = new Intl.NumberFormat("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const titles = {
  dose: "Câmara de mistura rápida",
  flocculation: "Galeria de floculação",
  settling: "Decantador",
  result: "Decantador",
};

let plant = new Treatment();
let currentPanel = null;
let lastReadCount = -1;
let paused = false;
let mode = "tank";
let frameId = 0;
let previousFrame = 0;
let lastPaint = -Infinity;
let lastUi = -Infinity;
let visualTime = 0;
let dirty = true;
let lastStatus = "";
const view = new StationView(canvas, queue);

function setText(element, value) {
  if (element.textContent !== value) element.textContent = value;
}

function put(id, value) {
  setText(byId(id), value);
}

function announce(value) {
  put("announcement", value);
}

function elapsedLabel(seconds) {
  const s = Math.floor(seconds);
  const pair = (value) => String(value).padStart(2, "0");
  const hours = Math.floor(s / 3600);
  return (hours ? pair(hours) + ":" : "") + pair(Math.floor(s / 60) % 60) + ":" + pair(s % 60);
}

function operationName(operation) {
  if (operation === "raw") return "Água bruta";
  if (operation === "pac") return "PAC";
  return correctors[operation].label;
}

function renderPanels(panel) {
  if (currentPanel === panel) return;
  for (const [key, element] of Object.entries(panels)) element.hidden = key !== panel;
  const index = ["dose", "flocculation", "settling", "result"].indexOf(panel);
  progress.forEach(({ step }, position) => {
    if (position === index) step.setAttribute("aria-current", "step");
    else step.removeAttribute("aria-current");
    step.classList.toggle("is-complete", position < index);
  });
  if (currentPanel) byId("heading-" + panel).focus({ preventScroll: true });
  currentPanel = panel;
}

function renderHistory() {
  if (plant.readings.length === lastReadCount) return;
  const rows = plant.readings.map(({ operation, dose, ph }) => {
    const row = document.createElement("tr");
    for (const value of [operationName(operation), decimal.format(dose), pHFormat.format(ph)]) {
      setText(row.insertCell(), value);
    }
    return row;
  });
  byId("ph-rows").replaceChildren(...rows);
  byId("ph-history").hidden = !rows.length;
  correctionPanel.hidden = !rows.length;
  if (rows.length === 1 && lastReadCount < 1) correctionPanel.open = true;
  if (rows.length) announce("pH medido " + pHFormat.format(plant.lastReading.ph) + ".");
  lastReadCount = rows.length;
}

function setProgress(index, unit) {
  const pct = Math.floor(100 * clamp(plant.seconds / unit.duration));
  const { bar, text } = progress[index];
  if (bar.value !== pct) bar.value = pct;
  setText(text, pct + "%");
}

function renderDosage() {
  renderHistory();
  const measuring = plant.meterActive;
  const mixing = plant.active;
  const read = plant.measuredCurrent && plant.lastReading;
  put("ph-value", measuring ? "···" : (read ? pHFormat.format(read.ph) : "—"));
  put("total-dose", decimal.format(plant.appliedDose) + " mg/L");
  if (measuring) put("ph-state", "Estabilizando");
  else if (!read) put("ph-state", "Aguardando medição");
  else put("ph-state", read.operation === "raw" ? "Água bruta" : "Após " + operationName(read.operation));

  measureButton.disabled = !plant.canMeasure;
  measureButton.hidden = Boolean(read);
  setText(measureButton, measuring ? "Medindo pH"
    : plant.mixing ? "Medir pH após a mistura" : "Medir pH da água bruta");

  byId("correction-fields").disabled = !plant.canAdjust;
  const remainder = Math.round(maxDose - plant.appliedDose);
  if (Number(doseControl.max) !== Math.max(1, remainder)) doseControl.max = Math.max(1, remainder);
  doseControl.disabled = !plant.canAddDose;
  put("dose-upper-bound", remainder + " mg/L");
  const doseValue = remainder ? doseControl.valueAsNumber : 0;
  put("dose-value", doseValue + " mg/L");
  doseControl.setAttribute("aria-valuetext", doseValue + " miligramas por litro adicionais");
  byId("apply-dose").disabled = !plant.canAddDose;
  byId("mix-progress").hidden = !mixing;
  if (mixing) setProgress(0, plant.unit);
  const next = byId("to-flocculation");
  next.hidden = plant.appliedDose === 0;
  next.disabled = !plant.canAdvance;

  let help = "Meça o pH da água bruta para começar.";
  if (mixing) help = "Aguarde a mistura antes de repetir a leitura.";
  else if (measuring) help = "A sonda está estabilizando na amostra.";
  else if (!read && plant.mixing) help = "Meça o pH depois da adição.";
  else if (read && next.disabled) help = "Escolha um corretor de pH ou adicione PAC.";
  else if (read) help = "Ajuste outra dose ou envie a mistura à galeria de floculação.";
  put("dose-help", help);
}

function renderStage(panel, reading) {
  if (panel === "dose") renderDosage();
  if (panel === "flocculation") {
    setProgress(1, process.flocculation);
    byId("to-settling").disabled = !plant.canAdvance;
    put("flocculation-help", plant.active
      ? "Na galeria, a água passa pela agitação lenta. Observe o crescimento dos flocos."
      : "O tempo previsto na galeria terminou. Envie a água floculada ao decantador.");
  }
  if (panel === "settling") {
    setProgress(2, process.settling);
    byId("take-sample").disabled = !plant.canAdvance;
  }
  if (panel === "result") {
    put("sample-note", "Com " + decimal.format(reading.dose) + " mg/L de PAC e pH "
      + pHFormat.format(reading.ph) + " após a mistura, a água clarificada segue para filtração e desinfecção.");
    put("sample-inlet", rawTurbidity + " uT");
    put("sample-outlet", decimal.format(reading.turbidity) + " uT");
    put("sample-reduction", decimal.format(100 * reading.retained) + "%");
  }
}

function sceneStatus(panel, reading) {
  if (panel === "dose") {
    if (plant.meterActive) return "Sonda de pH imersa";
    if (plant.active && plant.seconds < plant.unit.doseSeconds) return "Dosando " + operationName(plant.mixing.kind);
    if (plant.active) return "Mistura rápida em andamento";
    if (plant.mixing) return "Amostra após a mistura";
    return "Água bruta na câmara";
  }
  if (panel === "flocculation") return reading.aggregated < .08 ? "Agitação lenta na galeria" : "Flocos em formação";
  if (mode === "micro") return "Campo microscópico · " + sampleLayers[depthControl.value].label;
  if (panel === "result") return "Amostra coletada";
  if (!plant.active) return "Fim da observação";
  return reading.retained < .18 ? "Flocos descendo no decantador" : "Lodo acumulando no fundo";
}

function updateInterface(reading) {
  const panel = plant.inMixingChamber ? "dose" : plant.phase;
  renderPanels(panel);
  renderStage(panel, reading);
  put("basin-title", titles[panel]);

  const observing = panel === "settling" || panel === "result";
  byId("observation-tools").hidden = !observing;
  byId("settling-legend").hidden = !observing || mode === "micro";
  byId("depth-control").hidden = !observing || mode !== "micro";
  viewTank.setAttribute("aria-pressed", String(mode === "tank"));
  viewMicro.setAttribute("aria-pressed", String(mode === "micro"));
  put("process-time", elapsedLabel(reading.seconds));
  put("turbidity", decimal.format(reading.turbidity));
  put("solids", Math.round(100 * reading.retained) + "%");

  const status = sceneStatus(panel, reading);
  put("scene-status", status);
  if (lastStatus !== status) {
    canvas.setAttribute("aria-label", titles[panel] + ". " + status + ".");
    lastStatus = status;
  }
  const caption = panel === "dose" ? "Câmara de ajuste de pH e dosagem"
    : panel === "flocculation" ? "Água seguindo para o decantador"
    : mode === "micro" ? "Campo ilustrativo da amostra"
    : "Saída pela canaleta → filtração";
  put("scene-caption", caption);
  scene.toggleAttribute("data-active", (plant.active && !paused) || plant.meterActive);

  const rate = clockRate();
  byId("timing").hidden = panel === "result";
  byId("pause").hidden = !plant.active;
  put("pause", paused ? "Retomar" : "Pausar");
  put("speed-explanation", rate === 1 ? "1 s na tela = 1 s de processo" : "1 s na tela = " + rate + " s de processo");
}

function clockRate() {
  return speedControl.value === "real" ? 1 : (plant.unit ?? process.coagulation).demonstrationRate;
}

function queue() {
  dirty = true;
  if (!frameId && !document.hidden) frameId = requestAnimationFrame(frame);
}

function frame(now) {
  frameId = 0;
  const elapsed = previousFrame ? Math.min(.25, (now - previousFrame) / 1000) : 0;
  previousFrame = now;
  const wasMoving = (plant.active && !paused) || plant.meterActive;
  if (plant.meterActive) plant.stepMeter(elapsed);
  if (!paused) plant.step(elapsed * clockRate());
  if (wasMoving) visualTime += elapsed;
  const moving = (plant.active && !paused) || plant.meterActive;
  const justStopped = wasMoving && !moving;
  const reading = plant.read();
  if (dirty || now - lastUi >= 120 || justStopped) {
    updateInterface(reading);
    lastUi = now;
  }
  if (dirty || (wasMoving && now - lastPaint >= 1000 / 32) || justStopped) {
    view.draw(plant, reading, mode, depthControl.value, reducedMotion.matches ? 0 : visualTime);
    lastPaint = now;
  }
  dirty = false;
  if (moving && !document.hidden) frameId = requestAnimationFrame(frame);
  else previousFrame = 0;
}

function reset() {
  plant = new Treatment();
  paused = false;
  mode = "tank";
  doseControl.max = maxDose;
  doseControl.value = initialIncrement;
  correctionPanel.open = false;
  byId("ph-history").open = false;
  correctionDose.value = "1";
  correctorControl.value = "lime";
  depthControl.value = "surface";
  previousFrame = 0;
  visualTime = 0;
  lastReadCount = -1;
  announce("Estação reiniciada. Faça a leitura do pH da água bruta.");
  queue();
}

const advance = () => {
  plant.advance();
  paused = false;
  queue();
};
measureButton.addEventListener("click", () => { plant.measure(); queue(); });
doseControl.addEventListener("input", queue);
byId("apply-dose").addEventListener("click", () => {
  plant.addDose(doseControl.valueAsNumber);
  paused = false;
  queue();
});
byId("apply-correction").addEventListener("click", () => {
  if (!correctionDose.reportValidity()) return;
  plant.correct(correctorControl.value, correctionDose.valueAsNumber);
  paused = false;
  queue();
});
byId("to-flocculation").addEventListener("click", advance);
byId("to-settling").addEventListener("click", advance);
byId("take-sample").addEventListener("click", advance);
for (const id of ["reset", "repeat"]) byId(id).addEventListener("click", reset);
byId("pause").addEventListener("click", () => { paused = !paused; previousFrame = 0; queue(); });
speedControl.addEventListener("change", () => { previousFrame = 0; queue(); });
viewTank.addEventListener("click", () => { mode = "tank"; queue(); });
viewMicro.addEventListener("click", () => { mode = "micro"; queue(); });
depthControl.addEventListener("change", queue);
reducedMotion.addEventListener("change", queue);
document.addEventListener("visibilitychange", () => {
  previousFrame = 0;
  if (document.hidden && frameId) {
    cancelAnimationFrame(frameId);
    frameId = 0;
  } else queue();
});

put("raw-alkalinity", String(alkalinity));
document.querySelectorAll("[data-raw-turbidity]").forEach((node) => setText(node, String(rawTurbidity)));
correctionDose.max = String(maximumCorrection);
doseControl.value = initialIncrement;
new ResizeObserver(() => { view.resize(); queue(); }).observe(scene);
view.resize();
queue();
