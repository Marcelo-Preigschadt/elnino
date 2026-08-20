(() => {
  'use strict';

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

  const canvas = $('#globe-canvas');
  const stageElement = $('#globe-stage');
  const loadingElement = $('#globe-loading');
  const fallbackElement = $('#webgl-fallback');
  const rangeElement = $('#timeline-range');
  const outputElement = $('#timeline-output');
  const playButton = $('#play-button');
  const playLabel = $('.play-label', playButton);
  const playSymbol = $('.play-symbol', playButton);
  const motionButton = $('#motion-toggle');
  const motionLabel = $('.motion-label', motionButton);

  const stageIndex = $('#stage-index');
  const stageKicker = $('#stage-kicker');
  const stageTitle = $('#stage-title');
  const anomalyValue = $('#anomaly-value');
  const windValue = $('#wind-value');
  const rainValue = $('#rain-value');
  const ensoOverlay = $('#enso-story-overlay');
  const phenomenonKicker = $('#phenomenon-kicker');
  const phenomenonAction = $('#phenomenon-action');

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const phases = [
    { kicker: 'EQUILÍBRIO', title: 'O Pacífico antes do El Niño', label: 'Fase neutra', wind: 'normais', rain: 'oeste', action: 'Alísios empurram o calor para oeste' },
    { kicker: 'ATMOSFERA', title: 'Os ventos alísios perdem força', label: 'Ventos cedem', wind: 'enfraquecendo', rain: 'em trânsito', action: 'O motor atmosférico começa a ceder' },
    { kicker: 'OCEANO', title: 'O calor avança para leste', label: 'Calor avança', wind: 'fracos', rain: 'centro', action: 'Uma faixa quente atravessa o Pacífico' },
    { kicker: 'CONVECÇÃO', title: 'A chuva acompanha a água quente', label: 'Chuva migra', wind: 'alterados', rain: 'centro-leste', action: 'Nuvens e chuva seguem a água aquecida' },
    { kicker: 'TELECONEXÕES', title: 'O efeito alcança outros continentes', label: 'Impactos remotos', wind: 'reorganizados', rain: 'redistribuída', action: 'A circulação global redistribui o risco' }
  ];

  const state = {
    progress: 0,
    running: false,
    motionPaused: reduceMotion,
    layer: 0,
    autoLayer: false,
    time: 0,
    rotation: -2.74,
    tilt: -0.12,
    zoom: 0.91,
    dragging: false,
    pointerX: 0,
    pointerY: 0,
    moved: false,
    visible: true,
    dirty: true,
    ready: false
  };

  const vertexShaderSource = `
    attribute vec2 aPosition;
    void main() {
      gl_Position = vec4(aPosition, 0.0, 1.0);
    }
  `;

  const fragmentShaderSource = `
    precision highp float;

    uniform vec2 uResolution;
    uniform float uTime;
    uniform float uProgress;
    uniform float uRotation;
    uniform float uTilt;
    uniform float uZoom;
    uniform float uLayer;
    uniform sampler2D uLand;
    uniform vec2 uLandTexel;

    const float PI = 3.14159265359;
    const float TAU = 6.28318530718;

    float hash21(vec2 p) {
      p = fract(p * vec2(123.34, 456.21));
      p += dot(p, p + 45.32);
      return fract(p.x * p.y);
    }

    float noise21(vec2 p) {
      vec2 i = floor(p);
      vec2 f = fract(p);
      f = f * f * (3.0 - 2.0 * f);
      float a = hash21(i);
      float b = hash21(i + vec2(1.0, 0.0));
      float c = hash21(i + vec2(0.0, 1.0));
      float d = hash21(i + vec2(1.0, 1.0));
      return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
    }

    float fbm(vec2 p) {
      float value = 0.0;
      value += 0.5000 * noise21(p); p = p * 2.03 + 17.1;
      value += 0.2500 * noise21(p); p = p * 2.01 + 11.7;
      value += 0.1250 * noise21(p); p = p * 2.04 + 7.3;
      value += 0.0625 * noise21(p);
      return value;
    }

    float wrapAngle(float angle) {
      return atan(sin(angle), cos(angle));
    }

    vec3 thermalPalette(float t) {
      vec3 deep = vec3(0.025, 0.120, 0.285);
      vec3 cool = vec3(0.035, 0.620, 0.720);
      vec3 neutral = vec3(0.710, 0.800, 0.590);
      vec3 warm = vec3(1.000, 0.610, 0.210);
      vec3 hot = vec3(0.910, 0.115, 0.095);
      if (t < 0.28) return mix(deep, cool, t / 0.28);
      if (t < 0.52) return mix(cool, neutral, (t - 0.28) / 0.24);
      if (t < 0.76) return mix(neutral, warm, (t - 0.52) / 0.24);
      return mix(warm, hot, (t - 0.76) / 0.24);
    }

    void main() {
      vec2 frag = gl_FragCoord.xy;
      float shortSide = min(uResolution.x, uResolution.y);
      vec2 p = (frag * 2.0 - uResolution.xy) / shortSide;
      p /= uZoom;

      vec3 background = vec3(0.005, 0.026, 0.034);
      float vignette = 1.0 - 0.24 * length((frag / uResolution) - 0.5);
      background *= vignette;

      vec2 starCell = floor(frag / 22.0);
      float starSeed = hash21(starCell);
      float star = step(0.986, starSeed) * (0.16 + 0.30 * sin(starSeed * 90.0 + uTime * 0.35));
      background += star * vec3(0.50, 0.78, 0.82);

      float radius = length(p);
      if (radius > 1.0) {
        float atmosphere = exp(-(radius - 1.0) * 19.0) * 0.32;
        float thinRim = exp(-(radius - 1.0) * 70.0) * 0.24;
        vec3 halo = vec3(0.04, 0.62, 0.67) * atmosphere + vec3(0.25, 0.90, 0.88) * thinRim;
        gl_FragColor = vec4(background + halo, 1.0);
        return;
      }

      float z = sqrt(max(0.0, 1.0 - dot(p, p)));
      vec3 viewNormal = normalize(vec3(p.x, p.y, z));

      float cp = cos(uTilt);
      float sp = sin(uTilt);
      vec3 worldNormal = vec3(
        viewNormal.x,
        cp * viewNormal.y + sp * viewNormal.z,
        -sp * viewNormal.y + cp * viewNormal.z
      );

      float lon = wrapAngle(atan(worldNormal.x, worldNormal.z) + uRotation);
      float lat = asin(clamp(worldNormal.y, -1.0, 1.0));
      vec2 geoUv = vec2(fract(lon / TAU + 0.5), clamp(lat / PI + 0.5, 0.001, 0.999));

      float land = texture2D(uLand, geoUv).r;
      float landE = texture2D(uLand, geoUv + vec2(uLandTexel.x, 0.0)).r;
      float landW = texture2D(uLand, geoUv - vec2(uLandTexel.x, 0.0)).r;
      float landN = texture2D(uLand, geoUv + vec2(0.0, uLandTexel.y)).r;
      float landS = texture2D(uLand, geoUv - vec2(0.0, uLandTexel.y)).r;
      float coastline = clamp(abs(land - landE) + abs(land - landW) + abs(land - landN) + abs(land - landS), 0.0, 1.0);

      float eventStrength = smoothstep(0.04, 0.74, uProgress);
      float centerLon = 2.62 + 1.62 * eventStrength;
      float warmWidth = 0.24 + 0.98 * eventStrength;
      float warmDistance = wrapAngle(lon - centerLon);
      float warmCore = exp(-pow(warmDistance / warmWidth, 2.0) - pow(lat / 0.175, 2.0));
      float eastWarm = exp(-pow(wrapAngle(lon + 1.92) / 0.88, 2.0) - pow(lat / 0.22, 2.0));
      float coldTongue = exp(-pow(wrapAngle(lon + 1.73) / 0.60, 2.0) - pow(lat / 0.13, 2.0));
      float warmTrail = exp(-pow(wrapAngle(lon - 3.10) / 1.52, 4.0) - pow(lat / 0.205, 2.0));
      float anomaly = 1.52 * warmCore * eventStrength + 0.92 * eastWarm * eventStrength + 0.38 * warmTrail * eventStrength - 0.90 * coldTongue * (1.0 - eventStrength);

      float equatorialWarmth = exp(-pow(lat / 0.72, 2.0));
      float currentTexture = sin(lon * 31.0 + sin(lat * 17.0) * 1.4 + uTime * 0.24);
      currentTexture += 0.55 * sin(lon * 17.0 - lat * 27.0 - uTime * 0.16);
      float thermalValue = clamp(0.43 + anomaly * 0.48 + (equatorialWarmth - 0.55) * 0.08 + currentTexture * 0.010, 0.0, 1.0);
      vec3 baseOcean = mix(vec3(0.018, 0.105, 0.190), vec3(0.020, 0.350, 0.405), equatorialWarmth * 0.82);
      vec3 anomalyColor = thermalPalette(thermalValue);
      float anomalyVisibility = clamp(0.28 + abs(anomaly) * 0.92, 0.28, 1.0);
      vec3 ocean = mix(baseOcean, anomalyColor, anomalyVisibility);
      float heatFront = exp(-pow((abs(warmDistance) - warmWidth * 0.72) / 0.055, 2.0) - pow(lat / 0.20, 2.0)) * eventStrength;
      ocean += vec3(1.0, 0.52, 0.12) * heatFront * 0.48;

      float basin = exp(-pow(wrapAngle(lon - 3.12) / 1.72, 4.0));
      float equatorGate = exp(-pow(lat / 0.34, 2.0));
      float windStrength = mix(1.0, 0.28, eventStrength);
      float streamline = abs(sin((lat + 0.025 * sin(lon * 3.0 + uTime * 0.12)) * 46.0));
      streamline = 1.0 - smoothstep(0.018, 0.18, streamline);
      float dashPhase = sin(lon * 19.0 + lat * 4.0 + uTime * (2.2 * windStrength + 0.22));
      float dashes = pow(max(0.0, dashPhase), 5.0);
      float windField = streamline * dashes * equatorGate * basin;
      vec3 windColor = mix(vec3(0.28, 0.84, 0.86), vec3(0.78, 0.98, 0.95), dashes);

      float cloud = 0.0;
      float rainStreak = 0.0;
      if (uLayer > 1.5) {
        float rainCenter = 2.48 + 1.48 * eventStrength;
        float rainDistance = wrapAngle(lon - rainCenter);
        float rainZone = exp(-pow(rainDistance / (0.42 + 0.50 * eventStrength), 2.0) - pow(lat / 0.26, 2.0));
        float cloudNoise = fbm(vec2(lon * 5.8 + uTime * 0.035, lat * 17.0 - uTime * 0.08));
        cloud = smoothstep(0.56, 0.78, cloudNoise) * rainZone;
        rainStreak = pow(max(0.0, sin(lon * 42.0 - lat * 28.0 + uTime * 2.4)), 12.0) * rainZone;
      }

      if (uLayer < 0.5) {
        ocean = mix(ocean, windColor, windField * 0.18 * (0.35 + windStrength));
      } else if (uLayer < 1.5) {
        ocean = mix(ocean * vec3(0.45, 0.58, 0.62), windColor, windField * (0.64 + 0.28 * windStrength));
        float directionGlow = equatorGate * basin * (0.025 + windStrength * 0.035);
        ocean += vec3(0.10, 0.50, 0.53) * directionGlow;
      } else {
        ocean *= vec3(0.42, 0.54, 0.60);
        ocean = mix(ocean, vec3(0.79, 0.96, 0.95), cloud * 0.85);
        ocean += vec3(0.18, 0.65, 0.88) * rainStreak * cloud * 0.55;
      }

      float terrain = fbm(vec2(lon * 11.0, lat * 19.0));
      vec3 landColor = mix(vec3(0.075, 0.125, 0.125), vec3(0.20, 0.275, 0.245), terrain);
      if (uLayer > 1.5) landColor *= vec3(0.72, 0.78, 0.78);

      float gridLon = 1.0 - smoothstep(0.0, 0.021, abs(sin(lon * 6.0)));
      float gridLat = 1.0 - smoothstep(0.0, 0.021, abs(sin(lat * 6.0)));
      float grid = max(gridLon, gridLat) * 0.12;

      vec3 color = mix(ocean, landColor, smoothstep(0.34, 0.66, land));
      color += coastline * vec3(0.29, 0.56, 0.54) * 0.42;
      color = mix(color, vec3(0.31, 0.68, 0.66), grid * (1.0 - land * 0.58));

      vec3 lightDirection = normalize(vec3(-0.38, 0.32, 0.87));
      float diffuse = clamp(dot(viewNormal, lightDirection) * 0.56 + 0.54, 0.18, 1.0);
      float nightEdge = smoothstep(-0.22, 0.82, dot(viewNormal, lightDirection));
      color *= diffuse * mix(0.70, 1.0, nightEdge);

      float rim = pow(1.0 - viewNormal.z, 2.8);
      color += vec3(0.10, 0.72, 0.72) * rim * 0.48;
      color += vec3(0.54, 0.94, 0.90) * pow(rim, 3.0) * 0.32;

      float limbShade = smoothstep(0.0, 0.22, viewNormal.z);
      color *= mix(0.72, 1.0, limbShade);
      gl_FragColor = vec4(color, 1.0);
    }
  `;

  function compileShader(gl, type, source) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      const log = gl.getShaderInfoLog(shader);
      gl.deleteShader(shader);
      throw new Error(`Falha ao compilar shader: ${log}`);
    }
    return shader;
  }

  function createProgram(gl) {
    const vertex = compileShader(gl, gl.VERTEX_SHADER, vertexShaderSource);
    let fragment;
    try {
      fragment = compileShader(gl, gl.FRAGMENT_SHADER, fragmentShaderSource);
    } catch (highPrecisionError) {
      console.warn('Precisão gráfica alta indisponível; usando modo compatível.', highPrecisionError);
      fragment = compileShader(gl, gl.FRAGMENT_SHADER, fragmentShaderSource.replace('precision highp float;', 'precision mediump float;'));
    }
    const program = gl.createProgram();
    gl.attachShader(program, vertex);
    gl.attachShader(program, fragment);
    gl.linkProgram(program);
    gl.deleteShader(vertex);
    gl.deleteShader(fragment);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      const log = gl.getProgramInfoLog(program);
      gl.deleteProgram(program);
      throw new Error(`Falha ao vincular programa WebGL: ${log}`);
    }
    return program;
  }

  function drawRing(context, ring, width, height) {
    let previousX = null;
    let segmentStarted = false;
    ring.forEach(([longitude, latitude]) => {
      const x = ((longitude + 180) / 360) * width;
      const y = ((90 - latitude) / 180) * height;
      if (!segmentStarted || (previousX !== null && Math.abs(x - previousX) > width * 0.5)) {
        context.moveTo(x, y);
        segmentStarted = true;
      } else {
        context.lineTo(x, y);
      }
      previousX = x;
    });
    context.closePath();
  }

  function paintGeometry(context, geometry, width, height) {
    if (!geometry || !geometry.coordinates) return;
    const polygons = geometry.type === 'Polygon' ? [geometry.coordinates] : geometry.coordinates;
    if (geometry.type !== 'Polygon' && geometry.type !== 'MultiPolygon') return;
    polygons.forEach((polygon) => {
      context.beginPath();
      polygon.forEach((ring) => drawRing(context, ring, width, height));
      context.fill('evenodd');
    });
  }

  async function createLandCanvas() {
    const textureCanvas = document.createElement('canvas');
    textureCanvas.width = 1024;
    textureCanvas.height = 512;
    const context = textureCanvas.getContext('2d', { alpha: false });
    context.fillStyle = '#000';
    context.fillRect(0, 0, textureCanvas.width, textureCanvas.height);

    const response = await fetch('world.geo.json', { cache: 'force-cache' });
    if (!response.ok) throw new Error(`Mapa local indisponível (${response.status})`);
    const collection = await response.json();
    context.fillStyle = '#fff';
    collection.features.forEach((feature) => paintGeometry(context, feature.geometry, textureCanvas.width, textureCanvas.height));
    return textureCanvas;
  }

  function resizeCanvas(gl) {
    const rect = canvas.getBoundingClientRect();
    const pixelBudget = 1200000;
    const adaptiveDpr = Math.sqrt(pixelBudget / Math.max(1, rect.width * rect.height));
    const dpr = Math.max(0.8, Math.min(window.devicePixelRatio || 1, 1.5, adaptiveDpr));
    const width = Math.max(1, Math.round(rect.width * dpr));
    const height = Math.max(1, Math.round(rect.height * dpr));
    if (canvas.width === width && canvas.height === height) return false;
    canvas.width = width;
    canvas.height = height;
    gl.viewport(0, 0, width, height);
    return true;
  }

  function updateInterface(force = false) {
    const phaseNumber = Math.min(4, Math.floor(state.progress * 5));
    const phase = phases[phaseNumber];
    const progressPercent = Math.round(state.progress * 100);
    const anomaly = (state.progress * 2.4).toFixed(1).replace('.', ',');

    rangeElement.value = String(progressPercent);
    rangeElement.style.setProperty('--progress', `${progressPercent}%`);
    outputElement.textContent = phase.label;
    stageIndex.textContent = String(phaseNumber + 1).padStart(2, '0');
    stageKicker.textContent = phase.kicker;
    stageTitle.textContent = phase.title;
    anomalyValue.textContent = `+${anomaly} °C`;
    windValue.textContent = phase.wind;
    rainValue.textContent = phase.rain;
    phenomenonKicker.textContent = phaseNumber === 0 ? 'CONDIÇÃO NEUTRA' : `FASE 0${phaseNumber + 1} · ${phase.kicker}`;
    phenomenonAction.textContent = phase.action;
    ensoOverlay.style.setProperty('--enso', state.progress.toFixed(3));
    ensoOverlay.style.setProperty('--front-x', `${27 + state.progress * 47}%`);
    ensoOverlay.style.setProperty('--convection-x', `${32 + state.progress * 32}%`);
    ensoOverlay.style.setProperty('--wind-opacity', String(Math.max(.12, 1 - state.progress * .86)));
    ensoOverlay.className = `enso-story-overlay phase-${phaseNumber}`;

    playLabel.textContent = state.running ? 'Pausar fenômeno' : (state.progress > 0.97 ? 'Repetir o fenômeno' : 'Iniciar o fenômeno');
    playSymbol.textContent = state.running ? 'Ⅱ' : '▶';
    playButton.setAttribute('aria-pressed', String(state.running));

    if (force || state.motionPaused) {
      document.body.classList.toggle('motion-paused', state.motionPaused);
      motionButton.setAttribute('aria-pressed', String(state.motionPaused));
      motionLabel.textContent = state.motionPaused ? 'Retomar movimento' : 'Pausar movimento';
    }
  }

  function setProgress(value, fromUser = false) {
    state.progress = clamp(value, 0, 1);
    if (fromUser) {
      state.running = false;
      state.autoLayer = false;
    }
    state.dirty = true;
    updateInterface();
  }

  function setLayer(layer) {
    if (state.layer === layer) return;
    state.layer = layer;
    $$('.layer-button').forEach((item) => {
      const active = Number(item.dataset.layer) === layer;
      item.classList.toggle('active', active);
      item.setAttribute('aria-pressed', String(active));
    });
    state.dirty = true;
  }

  function cinematicLayer(progress) {
    if (progress < .34) return 1;
    if (progress < .66) return 0;
    if (progress < .86) return 2;
    return 0;
  }

  let lastStoryFrame = performance.now();
  function advanceStory(now) {
    const delta = Math.min(.05, Math.max(0, (now - lastStoryFrame) / 1000));
    lastStoryFrame = now;
    if (state.running && !state.motionPaused) {
      state.progress += delta / 14;
      if (state.autoLayer) setLayer(cinematicLayer(state.progress));
      if (state.progress >= 1) {
        state.progress = 1;
        state.running = false;
        state.autoLayer = false;
        setLayer(0);
      }
      state.dirty = true;
      updateInterface();
    }
    requestAnimationFrame(advanceStory);
  }

  function showFallback(error) {
    console.error(error);
    loadingElement.classList.add('ready');
    fallbackElement.hidden = false;
    stageElement.classList.add('fallback-mode');
    canvas.style.opacity = '0';
  }

  function initializeGlobe() {
    let gl;
    try {
      gl = canvas.getContext('webgl', {
        alpha: false,
        antialias: false,
        depth: false,
        stencil: false,
        premultipliedAlpha: false,
        powerPreference: 'high-performance',
        preserveDrawingBuffer: false
      }) || canvas.getContext('experimental-webgl');
      if (!gl) throw new Error('WebGL não está disponível.');

      const program = createProgram(gl);
      gl.useProgram(program);

      const buffer = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
      const positionLocation = gl.getAttribLocation(program, 'aPosition');
      gl.enableVertexAttribArray(positionLocation);
      gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);

      const uniforms = {
        resolution: gl.getUniformLocation(program, 'uResolution'),
        time: gl.getUniformLocation(program, 'uTime'),
        progress: gl.getUniformLocation(program, 'uProgress'),
        rotation: gl.getUniformLocation(program, 'uRotation'),
        tilt: gl.getUniformLocation(program, 'uTilt'),
        zoom: gl.getUniformLocation(program, 'uZoom'),
        layer: gl.getUniformLocation(program, 'uLayer'),
        land: gl.getUniformLocation(program, 'uLand'),
        landTexel: gl.getUniformLocation(program, 'uLandTexel')
      };

      const landTexture = gl.createTexture();
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, landTexture);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([0, 0, 0, 255]));
      gl.uniform1i(uniforms.land, 0);
      gl.uniform2f(uniforms.landTexel, 1 / 1024, 1 / 512);

      let lastFrame = performance.now();
      let lastRender = 0;
      const draw = (now) => {
        if (!state.dirty && now - lastRender < 1000 / 30) {
          requestAnimationFrame(draw);
          return;
        }
        const delta = Math.min(0.05, Math.max(0, (now - lastFrame) / 1000));
        lastFrame = now;
        lastRender = now;

        if (state.visible && !document.hidden) {
          if (!state.motionPaused) {
            state.time += delta;
            if (!state.dragging && !state.running) state.rotation += delta * 0.018;
          }

          resizeCanvas(gl);
          gl.uniform2f(uniforms.resolution, canvas.width, canvas.height);
          gl.uniform1f(uniforms.time, state.time);
          gl.uniform1f(uniforms.progress, state.progress);
          gl.uniform1f(uniforms.rotation, state.rotation);
          gl.uniform1f(uniforms.tilt, state.tilt);
          gl.uniform1f(uniforms.zoom, state.zoom);
          gl.uniform1f(uniforms.layer, state.layer);
          gl.drawArrays(gl.TRIANGLES, 0, 3);
          state.dirty = false;
        }
        requestAnimationFrame(draw);
      };

      createLandCanvas()
        .then((landCanvas) => {
          gl.activeTexture(gl.TEXTURE0);
          gl.bindTexture(gl.TEXTURE_2D, landTexture);
          gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
          gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, landCanvas);
        })
        .catch((error) => console.warn('O globo continuará sem o contorno continental detalhado.', error))
        .finally(() => {
          state.ready = true;
          loadingElement.classList.add('ready');
        });

      resizeCanvas(gl);
      requestAnimationFrame(draw);
      return gl;
    } catch (error) {
      showFallback(error);
      return null;
    }
  }

  playButton.addEventListener('click', () => {
    const starting = !state.running;
    if (state.progress > 0.97 && starting) state.progress = 0;
    state.running = starting;
    state.autoLayer = starting;
    if (starting) {
      state.rotation = -2.74;
      state.tilt = -0.12;
      state.zoom = 0.91;
      setLayer(cinematicLayer(state.progress));
    }
    if (state.running && state.motionPaused) {
      state.motionPaused = false;
      document.body.classList.remove('motion-paused');
    }
    updateInterface(true);
  });

  motionButton.addEventListener('click', () => {
    state.motionPaused = !state.motionPaused;
    if (state.motionPaused) state.running = false;
    updateInterface(true);
  });

  rangeElement.addEventListener('input', (event) => setProgress(Number(event.target.value) / 100, true));

  $$('.layer-button').forEach((button) => {
    button.addEventListener('click', () => {
      state.autoLayer = false;
      setLayer(Number(button.dataset.layer));
    });
  });

  stageElement.addEventListener('pointerdown', (event) => {
    if (event.target.closest('button')) return;
    state.dragging = true;
    state.moved = false;
    state.pointerX = event.clientX;
    state.pointerY = event.clientY;
    stageElement.setPointerCapture(event.pointerId);
  });

  stageElement.addEventListener('pointermove', (event) => {
    if (!state.dragging) return;
    const deltaX = event.clientX - state.pointerX;
    const deltaY = event.clientY - state.pointerY;
    if (Math.abs(deltaX) + Math.abs(deltaY) > 2) state.moved = true;
    state.rotation -= deltaX * 0.006;
    state.tilt = clamp(state.tilt + deltaY * 0.004, -0.58, 0.58);
    state.pointerX = event.clientX;
    state.pointerY = event.clientY;
    state.dirty = true;
  });

  const releasePointer = (event) => {
    state.dragging = false;
    if (stageElement.hasPointerCapture?.(event.pointerId)) stageElement.releasePointerCapture(event.pointerId);
  };
  stageElement.addEventListener('pointerup', releasePointer);
  stageElement.addEventListener('pointercancel', releasePointer);

  stageElement.addEventListener('wheel', (event) => {
    event.preventDefault();
    state.zoom = clamp(state.zoom - event.deltaY * 0.0007, 0.72, 1.20);
    state.dirty = true;
  }, { passive: false });

  stageElement.addEventListener('dblclick', () => {
    state.rotation = -2.74;
    state.tilt = -0.12;
    state.zoom = 0.91;
    state.dirty = true;
  });

  const revealObserver = 'IntersectionObserver' in window
    ? new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('in-view');
            revealObserver.unobserve(entry.target);
          }
        });
      }, { threshold: 0.12 })
    : null;

  $$('.reveal').forEach((element) => {
    if (revealObserver) revealObserver.observe(element);
    else element.classList.add('in-view');
  });

  if ('IntersectionObserver' in window) {
    const globeObserver = new IntersectionObserver(([entry]) => {
      state.visible = entry.isIntersecting;
    }, { threshold: 0.01 });
    globeObserver.observe(stageElement);
  }

  document.addEventListener('visibilitychange', () => { state.dirty = true; });
  window.addEventListener('resize', () => { state.dirty = true; }, { passive: true });
  canvas.addEventListener('webglcontextlost', (event) => {
    event.preventDefault();
    showFallback(new Error('O contexto gráfico foi interrompido pelo navegador.'));
  });

  updateInterface(true);
  initializeGlobe();
  requestAnimationFrame(advanceStory);
})();
