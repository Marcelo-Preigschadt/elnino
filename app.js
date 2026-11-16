import { Bench } from "./bench.js?v=2";
import { Decantation, maxAngle, suspendedSand, totalSand } from "./model.js";

const byId = (id) => document.getElementById(id);
const phases = ["prepare", "settle", "decant", "result"];
const panels = Object.fromEntries(phases.map((phase) => [phase, byId("controls-" + phase)]));
const headings = Object.fromEntries(phases.map((phase) => [phase, byId(phase + "-title")]));
const steps = phases.slice(0, 3).map((phase) => byId("step-" + phase));
const scene = byId("scene");
const canvas = byId("glassware");
const bench = new Bench(canvas);
const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
const angle = byId("angle");
const prepareButton = byId("prepare-action");
const stopButton = byId("stop-flow");
const finishButton = byId("finish");
const status = byId("scene-state");
const statusText = byId("scene-state-text");
const live = byId("announcement");
const volumeReadout = byId("water-value");
const massReadout = byId("sand-value");
const clockReadout = byId("rest-time");
const progressBar = byId("settled-progress");
const percent = byId("settled-percent");
const volume = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 0 });
const mass = new Intl.NumberFormat("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const preparationCopy = {
  water: { button: "Adicionar água", dose: "200 mL", help: "Adicione água ao béquer A. Em seguida, acrescente a areia.", running: "Adicionando água" },
  sand: { button: "Adicionar areia", dose: "20 g", help: "Adicione areia à água. Observe onde os grãos se acumulam.", running: "Adicionando areia" },
  mix: { button: "Misturar", dose: "", help: "Agite com o bastão de vidro para pôr os grãos em suspensão.", running: "Agitando a mistura" },
};
const decantHelp = "Arraste o béquer ou use o controle. Aumente o ângulo aos poucos e observe o sedimento.";

let model = new Decantation();
let currentPhase = null;
let previousPreparation = null;
let previousStatus = null;
let requestedFrame = 0;
let lastFrame = 0;
let remainder = 0;
let visualTime = 0;
let needsDraw = true;
let wasMoving = false;
let drag = null;
const simulationStep = 1 / 75;

function text(element, value) {
  if (element.textContent !== value) element.textContent = value;
}

function announce(message) {
  text(live, message);
}

function clock(seconds) {
  const elapsed = Math.floor(seconds);
  return String(Math.floor(elapsed / 60)).padStart(2, "0") + ":" + String(elapsed % 60).padStart(2, "0");
}

function massText(grams) {
  return grams > .000001 && grams < .01 ? "<0,01" : mass.format(grams);
}

function describeScene() {
  if (model.phase === "prepare") {
    const kind = model.preparation?.kind;
    if (kind) return [preparationCopy[kind].running, kind === "mix"];
    if (model.nextPreparation === "water") return ["Bancada pronta", false];
    if (model.nextPreparation === "sand") return ["Água no béquer A", false];
    return ["Areia no fundo do béquer A", false];
  }

  if (model.phase === "settle") {
    return model.settledPercent >= 99.5
      ? ["Sobrenadante clarificado", false]
      : ["Mistura em repouso", true];
  }

  if (model.phase === "result") return ["Decantação concluída", totalSand(model.receiver) >= .10];
  if (model.flowing) {
    return model.flowSand >= .003
      ? ["Areia passando para o béquer B", true]
      : ["Líquido passando para o béquer B", false];
  }
  if (totalSand(model.receiver) >= .10) return ["Areia no béquer de coleta", true];
  if (model.canFinish) return ["Béquer A na vertical", false];
  if (model.receiver.water >= 1) return ["Fluxo interrompido", false];
  return ["Incline o béquer A para a direita", false];
}

function paintPhase(moveFocus) {
  for (const [phase, panel] of Object.entries(panels)) panel.hidden = model.phase !== phase;
  const activeIndex = phases.indexOf(model.phase);
  steps.forEach((item, index) => {
    if (index === activeIndex) item.setAttribute("aria-current", "step");
    else item.removeAttribute("aria-current");
    item.classList.toggle("is-complete", index < activeIndex);
  });
  scene.toggleAttribute("data-adjustable", model.phase === "decant");
  if (model.phase === "result") paintResult();
  if (moveFocus) headings[model.phase].focus({ preventScroll: true });
}

function paintResult() {
  const grains = totalSand(model.receiver);
  let feedback;
  if (grains >= .10) {
    feedback = "Parte da areia passou para o béquer B. Compare com uma tentativa em que a mistura repousa mais e o béquer é inclinado aos poucos.";
  } else if (model.receiver.water < 120) {
    feedback = "O líquido coletado tem pouca areia. Ainda é possível recuperar mais sobrenadante do béquer A.";
  } else {
    feedback = "Você transferiu o sobrenadante e preservou a camada de sedimento no béquer A.";
  }
  text(byId("result-feedback"), feedback);
  text(byId("result-detail"), "No béquer A ficaram " + volume.format(model.source.water) + " mL de água e "
    + mass.format(totalSand(model.source)) + " g de areia.");
}

function paintInterface() {
  if (currentPhase !== model.phase) {
    paintPhase(currentPhase !== null);
    currentPhase = model.phase;
  }

  if (model.phase === "prepare") {
    const kind = model.preparation?.kind || model.nextPreparation;
    const active = Boolean(model.preparation);
    prepareButton.disabled = active;
    if (previousPreparation && !active && document.activeElement === document.body) {
      prepareButton.focus({ preventScroll: true });
    }
    previousPreparation = active;
    const copy = preparationCopy[kind];
    text(byId("prepare-help"), copy.help);
    text(byId("prepare-action-label"), active ? copy.running : copy.button);
    text(byId("prepare-dose"), active ? "" : copy.dose);
    byId("prepare-icon").hidden = active;
  }

  if (model.phase === "settle") {
    const settled = Math.min(100, Math.round(model.settledPercent));
    if (progressBar.value !== settled) progressBar.value = settled;
    text(percent, settled + "%");
  }

  if (model.phase === "decant") {
    text(byId("angle-readout"), Math.round(model.angle) + "°");
    stopButton.disabled = model.targetAngle === 0 && model.angle === 0;
    finishButton.disabled = !model.canFinish;
    let help = decantHelp;
    if (model.canFinish) help = "Observe o líquido coletado. Você pode ver o resultado ou voltar a inclinar o béquer.";
    else if (model.receiver.water >= 95 && !model.flowing) help = "Volte à vertical para avaliar a coleta ou ajuste a inclinação para continuar.";
    text(byId("decant-help"), help);
  }

  text(clockReadout, clock(model.restTime));
  text(volumeReadout, volume.format(model.receiver.water));
  text(massReadout, massText(totalSand(model.receiver)));
  const [label, turbid] = describeScene();
  if (label !== previousStatus) {
    text(statusText, label);
    canvas.setAttribute("aria-label", "Béquer A para preparo e béquer B para coleta. " + label + ".");
    status.toggleAttribute("data-turbid", turbid);
    if (model.phase !== "result") announce(label + ".");
    previousStatus = label;
  }
}

function requestUpdate() {
  needsDraw = true;
  if (!requestedFrame) requestedFrame = requestAnimationFrame(frame);
}

function isMoving() {
  if (model.preparation) return true;
  if (model.phase === "settle") return model.settledPercent < 99.995;
  return model.phase === "decant" && (
    model.angle !== model.targetAngle || model.flow > .001
    || suspendedSand(model.source) + suspendedSand(model.receiver) > .001
  );
}

function frame(now) {
  requestedFrame = 0;
  const elapsed = lastFrame ? Math.min(.09, (now - lastFrame) / 1000) : 0;
  lastFrame = now;
  if (isMoving() || model.phase === "settle") {
    remainder += elapsed;
    while (remainder >= simulationStep) {
      model.step(simulationStep);
      remainder -= simulationStep;
    }
    visualTime += elapsed;
  }
  paintInterface();

  const moving = isMoving();
  if (needsDraw || moving || wasMoving) {
    bench.draw(model, reducedMotion.matches ? 0 : visualTime);
    needsDraw = false;
  }
  wasMoving = moving;
  if ((moving || model.phase === "settle") && !document.hidden) requestedFrame = requestAnimationFrame(frame);
  else lastFrame = 0;
}

function resize() {
  bench.resize();
  requestUpdate();
}

function reset() {
  model = new Decantation();
  angle.value = 0;
  angle.setAttribute("aria-valuetext", "0 graus");
  lastFrame = 0;
  remainder = 0;
  visualTime = 0;
  drag = null;
  paintInterface();
  announce("Bancada reiniciada. Adicione água ao béquer A para começar.");
  requestUpdate();
}

function aim(value) {
  model.aim(value);
  angle.value = model.targetAngle;
  angle.setAttribute("aria-valuetext", model.targetAngle + " graus");
  requestUpdate();
}

byId("reset").addEventListener("click", reset);
byId("repeat").addEventListener("click", reset);
prepareButton.addEventListener("click", () => {
  model.prepare();
  paintInterface();
  requestUpdate();
});
byId("start-decant").addEventListener("click", () => {
  model.startDecanting();
  paintInterface();
  requestUpdate();
});
angle.addEventListener("input", () => aim(angle.valueAsNumber));
stopButton.addEventListener("click", () => {
  aim(0);
  angle.focus({ preventScroll: true });
});
finishButton.addEventListener("click", () => {
  model.finish();
  paintInterface();
  if (model.phase === "result") announce(byId("result-feedback").textContent);
  requestUpdate();
});

canvas.addEventListener("pointerdown", (event) => {
  if (model.phase !== "decant" || !event.isPrimary || event.button !== 0 || !bench.touchesSource(event, model)) return;
  drag = { id: event.pointerId, x: event.clientX, angle: model.targetAngle };
  canvas.setPointerCapture(event.pointerId);
});
canvas.addEventListener("pointermove", (event) => {
  if (drag?.id !== event.pointerId) return;
  const usableWidth = Math.min(520, canvas.clientWidth) * .48;
  aim(drag.angle + (event.clientX - drag.x) / usableWidth * maxAngle);
});
for (const eventType of ["pointerup", "pointercancel", "lostpointercapture"]) {
  canvas.addEventListener(eventType, (event) => {
    if (drag?.id === event.pointerId) drag = null;
  });
}

document.addEventListener("visibilitychange", () => {
  lastFrame = 0;
  if (document.hidden && requestedFrame) {
    cancelAnimationFrame(requestedFrame);
    requestedFrame = 0;
  } else if (!document.hidden) requestUpdate();
});
new ResizeObserver(resize).observe(scene);
paintInterface();
resize();
