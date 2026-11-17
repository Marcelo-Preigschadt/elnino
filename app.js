import { Treatment, alkalinity, clamp, correctors, initialIncrement, maxDose, maximumCorrection, process, rawTurbidity } from "./treatment.js?v=7";
import { StationView, inspectPoint } from "./station-view.js?v=7";
import { activeChlorine, chlorineProducts, otoColor } from "./chlorine.js?v=7";
import { organismsAt } from "./microbiology.js?v=7";

const byId = (id) => document.getElementById(id);
const canvas = byId("treatment-scene");
const scene = byId("scene");
const progress = ["coagulation", "flocculation", "settling", "disinfection"].map((name) => ({
  bar: byId(name + "-progress"),
  text: byId(name + "-percent"),
  step: byId("stage-" + name),
}));
const panels = Object.fromEntries(["dose", "flocculation", "settling", "result", "disinfection"].map((name) => [
  name, byId("panel-" + name),
]));
const speedControl = byId("speed");
const doseControl = byId("dose");
const measureButton = byId("measure-ph");
const correctionPanel = byId("correction-panel");
const correctorControl = byId("corrector");
const correctionDose = byId("correction-dose");
const microscope = byId("microscope");
const lens = byId("microscope-scene");
const microscopeMode = byId("microscope-mode");
const chlorineProduct = byId("chlorine-product");
const chlorineDose = byId("chlorine-dose");
const showInactive = byId("show-inactive");
const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");
const decimal = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 1 });
const pHFormat = new Intl.NumberFormat("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const titles = {
  dose: "Câmara de mistura rápida",
  flocculation: "Galeria de floculação",
  settling: "Decantador",
  result: "Decantador",
  disinfection: "Tanque de contato com cloro",
};

const exampleName = new URLSearchParams(location.search).get("exemplo");
let plant = ["decantador", "cloracao"].includes(exampleName) ? startExample(exampleName) : new Treatment();
let currentPanel = null;
let lastReadCount = -1;
let paused = exampleName === "decantador";
let microBefore = false;
let selectedPoint = null;
let frameId = 0;
let previousFrame = 0;
let lastPaint = -Infinity;
let lastUi = -Infinity;
let visualTime = 0;
let dirty = true;
let lastStatus = "";
const view = new StationView(canvas, lens, queue);

function startExample(name) {
  const example = new Treatment();
  example.measure();
  example.stepMeter(3);
  example.addDose(28);
  example.step(process.coagulation.duration);
  example.measure();
  example.stepMeter(3);
  example.advance();
  example.step(18 * 60);
  example.advance();
  example.step(20 * 60);
  if (name === "cloracao") {
    example.step(process.settling.duration);
    example.advance();
    example.startDisinfection();
  }
  return example;
}

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
  const index = panel === "result" ? 2 : ["dose", "flocculation", "settling", "disinfection"].indexOf(panel);
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
  if (panel === "disinfection") renderDisinfection(reading);
}

function renderDisinfection(reading) {
  const treatment = plant.chlorination;
  const { chlorine } = reading;
  const product = chlorineProducts[chlorineProduct.value];
  put("chlorine-product-info", product.form + " · " + product.formula + " · "
    + decimal.format(product.active) + "% de cloro ativo");
  put("chlorine-equivalent", pHFormat.format(activeChlorine(chlorineProduct.value, chlorineDose.valueAsNumber)) + " mg/L como Cl₂");
  put("chlorine-total-dose", pHFormat.format(chlorine.applied) + " mg/L como Cl₂");
  put("chlorine-contact", elapsedLabel(chlorine.seconds));
  put("chlorine-ct", pHFormat.format(chlorine.ct));
  put("chlorine-conditions", pHFormat.format(reading.ph) + " / 25 °C");
  setProgress(3, plant.unit);
  let help = "Abra a amostra antes da cloração para observar as formas de bactérias e protozoários.";
  if (chlorine.applied && chlorine.free < .01) help = "A demanda inicial consumiu o cloro livre. Compare os medidores e ajuste outra dose.";
  else if (chlorine.applied) help = "O residual livre atua durante o contato. Compare a amostra atual com a amostra antes do cloro.";
  if (chlorine.applied && !plant.active) help = "A observação deste contato terminou. Compare os organismos ativos e as estruturas inativadas.";
  put("chlorine-help", help);

  const developing = treatment.oto && treatment.otoSeconds < 2;
  byId("test-oto").disabled = Boolean(developing);
  put("oto-value", !treatment.oto ? "—" : developing ? "···"
    : treatment.oto.total > 10 ? ">10" : pHFormat.format(treatment.oto.total));
  put("oto-state", !treatment.oto ? "Aguardando ensaio" : developing ? "Desenvolvendo a cor"
    : "Coletada aos " + elapsedLabel(treatment.oto.seconds));
  const color = treatment.oto ? otoColor(treatment.oto.total * clamp(treatment.otoSeconds / 2)) : otoColor(0);
  byId("oto-sample").style.setProperty("--sample-color", color);

  const attached = treatment.electrode !== null;
  const stabilizing = attached && treatment.electrodeSeconds < 3;
  put("electrode-value", !attached ? "—" : stabilizing ? "···" : pHFormat.format(treatment.electrode));
  put("electrode-state", !attached ? "Sonda fora da água" : stabilizing ? "Estabilizando" : "Leitura contínua");
  byId("immerse-electrode").disabled = attached;
  put("immerse-electrode", attached ? "Eletrodo imerso" : "Imergir eletrodo");
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
  if (panel === "result") return "Amostra coletada";
  if (panel === "disinfection") {
    if (!reading.chlorine.applied) return "Água filtrada antes do cloro";
    if (paused) return "Contato com cloro pausado";
    return plant.active ? "Cloro em contato com a água" : "Contato observado";
  }
  if (!plant.active) return "Fim da observação";
  return reading.retained < .18 ? "Flocos descendo no decantador" : "Lodo acumulando no fundo";
}

function updateInterface(reading) {
  const panel = plant.inMixingChamber ? "dose" : plant.phase;
  renderPanels(panel);
  renderStage(panel, reading);
  put("basin-title", titles[panel]);

  byId("settling-legend").hidden = panel !== "settling" && panel !== "result";
  put("process-time", elapsedLabel(reading.seconds));
  put("turbidity", decimal.format(reading.turbidity));
  put("solids-label", reading.chlorine ? "Cloro ativo aplicado" : "Sólidos no fundo");
  put("solids", reading.chlorine ? decimal.format(reading.chlorine.applied) + " mg/L" : Math.round(100 * reading.retained) + "%");

  const status = sceneStatus(panel, reading);
  put("scene-status", status);
  if (lastStatus !== status) {
    canvas.setAttribute("aria-label", titles[panel] + ". " + status + ". Selecionar ponto para o microscópio.");
    lastStatus = status;
  }
  const caption = panel === "dose" ? "Câmara de ajuste de pH e dosagem"
    : panel === "flocculation" ? "Água seguindo para o decantador"
    : panel === "disinfection" ? "Água filtrada · tanque de contato"
    : "Saída pela canaleta → filtração";
  put("scene-caption", caption);
  scene.toggleAttribute("data-active", (plant.active && !paused) || plant.meterActive);

  const rate = clockRate();
  byId("timing").hidden = panel === "result";
  byId("pause").hidden = !plant.active;
  put("pause", paused ? "Retomar" : "Pausar");
  put("speed-explanation", rate === 1 ? "1 s na tela = 1 s de processo" : "1 s na tela = " + rate + " s de processo");
}

function pointLabel({ x, depth }) {
  const layer = depth < .24 ? "Superfície" : depth > .82 ? "Fundo" : "Meia profundidade";
  const side = x < .30 ? "junto à entrada" : x > .70 ? "junto à saída" : "no centro";
  return layer + " · " + side;
}

function renderMicroscope(sample, biology = null) {
  const location = pointLabel(selectedPoint);
  const settling = plant.phase === "settling" || plant.phase === "result";
  const flocs = sample.flocs >= .046;
  const status = sample.inSludge ? "Lodo depositado"
    : sample.deposit >= .14 ? "Transição para o lodo"
    : settling && flocs ? "Flocos em suspensão"
    : settling && sample.concentration < .19 ? "Água com poucos sólidos"
    : flocs ? "Flocos em formação" : "Partículas finas dispersas";
  const concentration = Math.round(100 * sample.concentration) + "% da água bruta";
  put("micro-location", location);
  const bioStatus = !biology ? "" : microBefore ? "Antes da cloração"
    : biology.active ? "Microrganismos ativos no campo" : "Nenhum organismo ativo no campo simulado";
  put("micro-status", biology ? bioStatus : status);
  put("micro-depth", Math.round(100 * selectedPoint.depth) + "%");
  put("micro-concentration", concentration);
  byId("particle-readings").hidden = Boolean(biology);
  byId("biology-readings").hidden = !biology;
  byId("micro-comparison").hidden = !biology || !plant.chlorination;
  byId("micro-before").setAttribute("aria-pressed", String(microBefore));
  byId("micro-now").setAttribute("aria-pressed", String(!microBefore));
  if (biology) {
    put("bio-active", biology.active + " de " + biology.total);
    put("bio-contact", microBefore ? "Antes da dose" : elapsedLabel(plant.chlorination?.seconds ?? 0));
    put("bio-species", biology.counts.map(({ name, active }) => name + " " + active).join(" · "));
    byId("micro-pause").hidden = !plant.chlorination?.running || !plant.active;
    put("micro-pause", paused ? "Retomar contato" : "Pausar contato");
  }
  put("micro-note", biology
    ? "Morfologias e viabilidade simuladas. A inativação pode preservar estruturas celulares. Confirmação de viabilidade exige ensaios microbiológicos."
    : "Campo ilustrativo do ponto selecionado. Volte ao tanque e toque em outro ponto para comparar.");
  lens.setAttribute("aria-label", location + ". " + (biology ? bioStatus + ". " + biology.active + " ativos no campo simulado." : status + ". " + concentration + "."));
}

function openMicroscope(point) {
  selectedPoint = point;
  const reading = plant.read();
  renderMicroscope(inspectPoint(reading, point), biologyFor(reading));
  microscope.showModal();
  view.resizeMicroscope();
  queue();
}

function biologyFor(reading) {
  if (!selectedPoint || microscopeMode.value === "particles") return null;
  return organismsAt(microscopeMode.value, selectedPoint, reading.chlorine, microBefore);
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
  const bioMoving = microscope.open && microscopeMode.value !== "particles" && !paused;
  const wasMoving = (plant.active && !paused) || plant.meterActive || plant.chlorination?.instrumentsActive || bioMoving;
  if (plant.meterActive) plant.stepMeter(elapsed);
  plant.chlorination?.stepInstruments(elapsed);
  if (!paused) plant.step(elapsed * clockRate());
  if (wasMoving) visualTime += elapsed;
  const moving = (plant.active && !paused) || plant.meterActive || plant.chlorination?.instrumentsActive || bioMoving;
  const justStopped = wasMoving && !moving;
  const reading = plant.read();
  const sample = microscope.open && selectedPoint ? inspectPoint(reading, selectedPoint) : null;
  const biology = sample ? biologyFor(reading) : null;
  if (dirty || now - lastUi >= 120 || justStopped) {
    updateInterface(reading);
    if (sample) renderMicroscope(sample, biology);
    lastUi = now;
  }
  if (dirty || (wasMoving && now - lastPaint >= 1000 / 32) || justStopped) {
    const time = reducedMotion.matches ? 0 : visualTime;
    if (dirty || !sample) view.draw(plant, reading, selectedPoint, time);
    if (sample) view.drawSample(reading, sample, time, biology, showInactive.checked);
    lastPaint = now;
  }
  dirty = false;
  if (moving && !document.hidden) frameId = requestAnimationFrame(frame);
  else previousFrame = 0;
}

function reset() {
  plant = new Treatment();
  paused = false;
  selectedPoint = null;
  microBefore = false;
  microscopeMode.value = "particles";
  showInactive.checked = false;
  chlorineProduct.value = "sodium";
  chlorineDose.value = "25";
  if (microscope.open) microscope.close();
  doseControl.max = maxDose;
  doseControl.value = initialIncrement;
  correctionPanel.open = false;
  byId("ph-history").open = false;
  correctionDose.value = "1";
  correctorControl.value = "lime";
  previousFrame = 0;
  visualTime = 0;
  lastReadCount = -1;
  announce("Estação reiniciada. Faça a leitura do pH da água bruta.");
  queue();
}

const advance = () => {
  plant.advance();
  if (plant.phase !== "result") selectedPoint = null;
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
byId("to-disinfection").addEventListener("click", () => {
  plant.startDisinfection();
  selectedPoint = null;
  microscopeMode.value = "protozoa";
  microBefore = false;
  paused = false;
  queue();
});
byId("observe-before").addEventListener("click", () => {
  microscopeMode.value = "protozoa";
  microBefore = true;
  openMicroscope(selectedPoint ?? { x: .5, depth: .5 });
});
chlorineProduct.addEventListener("change", queue);
chlorineDose.addEventListener("input", queue);
byId("apply-chlorine").addEventListener("click", () => {
  if (!chlorineDose.reportValidity() || !plant.addChlorine(chlorineProduct.value, chlorineDose.valueAsNumber)) return;
  paused = false;
  microBefore = false;
  if (microscopeMode.value === "particles") microscopeMode.value = "protozoa";
  openMicroscope(selectedPoint ?? { x: .5, depth: .5 });
});
byId("test-oto").addEventListener("click", () => { plant.chlorination?.testOto(); queue(); });
byId("immerse-electrode").addEventListener("click", () => { plant.chlorination?.attachElectrode(); queue(); });
for (const id of ["reset", "repeat"]) byId(id).addEventListener("click", reset);
byId("pause").addEventListener("click", () => { paused = !paused; previousFrame = 0; queue(); });
speedControl.addEventListener("change", () => { previousFrame = 0; queue(); });
microscopeMode.addEventListener("change", queue);
showInactive.addEventListener("change", queue);
byId("micro-before").addEventListener("click", () => { microBefore = true; queue(); });
byId("micro-now").addEventListener("click", () => { microBefore = false; queue(); });
byId("micro-pause").addEventListener("click", () => { paused = !paused; previousFrame = 0; queue(); });
const centerPoint = { x: .5, depth: .5 };
canvas.addEventListener("click", (event) => {
  const point = event.detail === 0 ? (selectedPoint ?? centerPoint) : view.pointAt(event.clientX, event.clientY);
  if (point) openMicroscope(point);
  else announce("Toque na água dentro do tanque para escolher a amostra.");
});
const pointDirections = {
  ArrowLeft: [-.08, 0], ArrowRight: [.08, 0], ArrowUp: [0, -.08], ArrowDown: [0, .08],
};
canvas.addEventListener("keydown", (event) => {
  const direction = pointDirections[event.key];
  const point = selectedPoint ?? centerPoint;
  if (direction) {
    event.preventDefault();
    selectedPoint = { x: clamp(point.x + direction[0]), depth: clamp(point.depth + direction[1]) };
    announce(pointLabel(selectedPoint) + ". Profundidade " + Math.round(100 * selectedPoint.depth) + "%.");
    queue();
  } else if (event.key === "Enter" || event.key === " ") {
    event.preventDefault();
    openMicroscope(point);
  }
});
microscope.addEventListener("close", () => {
  canvas.focus({ preventScroll: true });
  queue();
});
byId("locate-microscope").addEventListener("click", () => {
  scene.scrollIntoView({ block: "center" });
  canvas.focus({ preventScroll: true });
});
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
const resizeObserver = new ResizeObserver((entries) => {
  for (const { target } of entries) {
    if (target === scene) view.resize();
    else view.resizeMicroscope();
  }
  queue();
});
resizeObserver.observe(scene);
resizeObserver.observe(lens.parentElement);
view.resize();
queue();
