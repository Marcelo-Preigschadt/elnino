(function () {
  'use strict';

  var stages = [
    {
      kicker: 'Condições normais',
      title: 'O Pacífico em equilíbrio',
      description: 'Ventos alísios empurram a água superficial quente para oeste. Próximo à América do Sul, águas profundas, frias e ricas em nutrientes sobem até a superfície.',
      state: 'NEUTRO',
      wind: 'FORTES',
      valueText: 'Condições normais',
      mapKicker: 'PACÍFICO EQUATORIAL',
      mapTitle: 'Circulação normal'
    },
    {
      kicker: 'O primeiro sinal',
      title: 'Os ventos perdem força',
      description: 'A circulação de leste para oeste enfraquece. A água quente acumulada no Pacífico ocidental deixa de ser mantida tão fortemente junto à Ásia e à Oceania.',
      state: 'TRANSIÇÃO',
      wind: 'ENFRAQUECENDO',
      valueText: 'Ventos alísios enfraquecendo',
      mapKicker: 'ATMOSFERA',
      mapTitle: 'Alísios perdendo intensidade'
    },
    {
      kicker: 'O oceano responde',
      title: 'Uma onda de calor avança',
      description: 'A massa de água superficial quente se desloca para o centro e o leste do Pacífico. A termoclina se achata e a ressurgência fria perde intensidade.',
      state: 'EM FORMAÇÃO',
      wind: 'FRACOS',
      valueText: 'Água quente avançando pelo Pacífico',
      mapKicker: 'OCEANO',
      mapTitle: 'Calor deslocando-se para leste'
    },
    {
      kicker: 'O céu muda de lugar',
      title: 'A chuva acompanha o calor',
      description: 'A convecção tropical migra para leste. O aquecimento do oceano reorganiza pressão, nuvens e circulação atmosférica sobre uma área imensa.',
      state: 'EL NIÑO',
      wind: 'MUITO FRACOS',
      valueText: 'El Niño estabelecido e chuva deslocada',
      mapKicker: 'OCEANO + ATMOSFERA',
      mapTitle: 'Convecção migrando pelo Pacífico'
    },
    {
      kicker: 'Teleconexões',
      title: 'O efeito dominó alcança continentes',
      description: 'A mudança no Pacífico altera probabilidades de chuva, seca e calor em regiões distantes. Os resultados variam, mas a exposição e a vulnerabilidade definem o tamanho dos danos.',
      state: 'IMPACTO GLOBAL',
      wind: 'DESORGANIZADOS',
      valueText: 'Impactos globais do El Niño',
      mapKicker: 'TELECONEXÕES',
      mapTitle: 'O Pacífico influencia continentes'
    }
  ];

  var anomalyStops = [0, 0.2, 0.6, 1.2, 2];

  var impacts = {
    'south-brazil': {
      tag: 'SUL DO BRASIL',
      title: 'Chuva persistente e enchentes',
      popup: 'A primavera tende a ter chuva acima da média. A combinação com solo saturado, rios cheios e ocupação vulnerável aumenta o risco de enchentes e deslizamentos.',
      coordinate: '29,7° S · 53,0° O',
      visual: 'CHUVA<br />ACIMA DA MÉDIA',
      visualClass: 'rain',
      storyTitle: 'Quando a água encontra um território vulnerável',
      storyCopy: 'Na primavera, episódios de El Niño tendem a favorecer chuva acima da média no Sul. Solo saturado, ocupação de áreas inundáveis e drenagem insuficiente transformam o evento climático em desastre.',
      list: ['Maior risco de enchentes e deslizamentos', 'Prejuízos a lavouras e infraestrutura', 'Impactos sobre moradia, mobilidade e saúde'],
      center: [-29.7, -53],
      mapPosition: [-29.7, -53],
      zoom: 4,
      symbol: '≋'
    },
    'north-brazil': {
      tag: 'NORTE E NORDESTE',
      title: 'Menos chuva e mais pressão sobre a água',
      popup: 'Partes do Norte e do Nordeste tendem a registrar menos chuva. Rios mais baixos, calor e vegetação seca pressionam abastecimento, agricultura e controle do fogo.',
      coordinate: '4,0° S · 51,0° O',
      visual: 'SECA<br />E CALOR',
      visualClass: 'drought',
      storyTitle: 'A ausência de chuva também avança devagar',
      storyCopy: 'Em áreas do Norte e do Nordeste, o El Niño pode reduzir a chuva e elevar a temperatura. O impacto se acumula no tempo, atingindo rios, lavouras, floresta e comunidades.',
      list: ['Queda de níveis de rios e reservatórios', 'Risco maior para agricultura de sequeiro', 'Vegetação mais seca e incêndios mais prováveis'],
      center: [-4, -51],
      mapPosition: [-4, -51],
      zoom: 3.5,
      symbol: '⌁'
    },
    peru: {
      tag: 'PERU E EQUADOR',
      title: 'O oceano muda a pesca e a chuva',
      popup: 'Água superficial mais quente reduz a ressurgência rica em nutrientes e pode favorecer chuva intensa na costa do noroeste do Peru e do Equador.',
      coordinate: '6,0° S · 80,0° O',
      visual: 'MAR QUENTE<br />MENOS NUTRIENTES',
      visualClass: 'fish',
      storyTitle: 'Quando a base da cadeia alimentar enfraquece',
      storyCopy: 'A ressurgência costeira leva nutrientes à superfície. Quando ela diminui, cai a produtividade do fitoplâncton, alterando a disponibilidade de alimento para peixes e outros animais.',
      list: ['Mudanças na distribuição e abundância de peixes', 'Pressão sobre pesca e renda costeira', 'Maior chance de chuva intensa no litoral'],
      center: [-6, -80],
      mapPosition: [-6, -80],
      zoom: 4,
      symbol: '≈'
    },
    oceania: {
      tag: 'INDONÉSIA E AUSTRÁLIA',
      title: 'A chuva se afasta do oeste do Pacífico',
      popup: 'Com a convecção deslocada para leste, partes da Indonésia e da Austrália tendem a ficar mais secas, aumentando o risco de estiagem e incêndios.',
      coordinate: '16,0° S · 132,0° L',
      visual: 'MENOS CHUVA<br />MAIS FOGO',
      visualClass: 'fire',
      storyTitle: 'A floresta perde umidade antes de ganhar fogo',
      storyCopy: 'A redução persistente da chuva resseca solo e vegetação. Quando calor, vento e fontes de ignição coincidem, o risco de incêndios cresce rapidamente.',
      list: ['Seca e estresse hídrico mais prováveis', 'Maior risco de incêndios florestais', 'Fumaça com impactos ambientais e sanitários'],
      center: [-16, -228],
      mapPosition: [-16, -228],
      zoom: 3,
      symbol: '△'
    },
    'southern-usa': {
      tag: 'SUL DOS ESTADOS UNIDOS',
      title: 'O jato do Pacífico muda de trajetória',
      popup: 'No inverno do Hemisfério Norte, a corrente de jato tende a se deslocar para sul, favorecendo condições mais úmidas no sul dos Estados Unidos.',
      center: [32, -98],
      mapPosition: [32, -98],
      zoom: 3,
      symbol: '↯'
    }
  };

  var impactOrder = ['south-brazil', 'north-brazil', 'peru', 'oceania', 'southern-usa'];
  var canvasFlags = { ocean: true, wind: true, rain: true, impact: true };
  var map = null;
  var impactLayer = null;
  var canvas = document.getElementById('climate-canvas');
  var context = canvas ? canvas.getContext('2d') : null;
  var slider = document.getElementById('stage-slider');
  var playButton = document.getElementById('play-button');
  var resetButton = document.getElementById('reset-button');
  var motionToggle = document.getElementById('motion-toggle');
  var impactPopup = document.getElementById('impact-popup');
  var displayProgress = 0;
  var targetProgress = 0;
  var currentStage = -1;
  var playing = false;
  var motionPaused = false;
  var selectedImpact = 'south-brazil';
  var previousFrameTime = performance.now();
  var canvasWidth = 0;
  var canvasHeight = 0;
  var pixelRatio = 1;
  var prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var windParticles = [];
  var currentParticles = [];
  var rainParticles = [];

  function clamp(value, minimum, maximum) {
    return Math.max(minimum, Math.min(maximum, value));
  }

  function lerp(start, end, amount) {
    return start + (end - start) * amount;
  }

  function smoothstep(edge0, edge1, value) {
    var x = clamp((value - edge0) / (edge1 - edge0), 0, 1);
    return x * x * (3 - 2 * x);
  }

  function interpolateStops(stops, value) {
    var lower = Math.floor(value);
    var upper = Math.min(stops.length - 1, lower + 1);
    return lerp(stops[lower], stops[upper], value - lower);
  }

  function randomBetween(minimum, maximum) {
    return minimum + Math.random() * (maximum - minimum);
  }

  function createParticles() {
    var index;
    for (index = 0; index < 180; index += 1) {
      windParticles.push({
        t: Math.random(),
        latitude: randomBetween(-11, 11),
        speed: randomBetween(0.55, 1.45),
        length: randomBetween(5, 15),
        alpha: randomBetween(0.22, 0.85),
        phase: Math.random() * Math.PI * 2,
        reverses: Math.random() < 0.3
      });
    }
    for (index = 0; index < 90; index += 1) {
      currentParticles.push({
        t: Math.random(),
        latitude: randomBetween(-7, 7),
        speed: randomBetween(0.45, 1.15),
        alpha: randomBetween(0.18, 0.65),
        phase: Math.random() * Math.PI * 2
      });
    }
    for (index = 0; index < 145; index += 1) {
      rainParticles.push({
        longitudeOffset: randomBetween(-28, 28),
        latitudeOffset: randomBetween(-13, 13),
        fall: Math.random(),
        speed: randomBetween(0.45, 1.35),
        alpha: randomBetween(0.2, 0.8),
        length: randomBetween(4, 13)
      });
    }
  }

  function wrapLongitude(longitude) {
    if (!map) {
      return longitude;
    }
    var center = map.getCenter().lng;
    var wrapped = longitude;
    while (wrapped - center > 180) {
      wrapped -= 360;
    }
    while (wrapped - center < -180) {
      wrapped += 360;
    }
    return wrapped;
  }

  function project(latitude, longitude) {
    if (!map) {
      return { x: 0, y: 0 };
    }
    var point = map.latLngToContainerPoint([latitude, wrapLongitude(longitude)]);
    return { x: point.x, y: point.y };
  }

  function worldPixelsPerDegree() {
    return map ? (256 * Math.pow(2, map.getZoom())) / 360 : 1;
  }

  function resizeCanvas() {
    if (!canvas || !context) {
      return;
    }
    var rectangle = canvas.getBoundingClientRect();
    pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
    canvasWidth = Math.max(1, rectangle.width);
    canvasHeight = Math.max(1, rectangle.height);
    canvas.width = Math.round(canvasWidth * pixelRatio);
    canvas.height = Math.round(canvasHeight * pixelRatio);
    context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
  }

  function buildMap() {
    var mapElement = document.getElementById('map');
    if (typeof window.L === 'undefined') {
      mapElement.innerHTML = '<div style="height:100%;display:grid;place-items:center;padding:30px;text-align:center;color:#b8cacc;background:#061c23"><p>O mapa precisa de conexão com a internet para carregar a base cartográfica.</p></div>';
      return;
    }

    map = L.map('map', {
      zoomControl: false,
      minZoom: 2,
      maxZoom: 6,
      worldCopyJump: true,
      preferCanvas: true
    }).setView([0, -145], 2);

    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      subdomains: 'abcd',
      maxZoom: 20,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
    }).addTo(map);

    L.control.zoom({ position: 'bottomleft' }).addTo(map);
    impactLayer = L.layerGroup();

    impactOrder.forEach(function (impactId) {
      var impact = impacts[impactId];
      var marker = L.marker(impact.mapPosition, {
        title: impact.title,
        keyboard: true,
        icon: L.divIcon({
          className: 'impact-marker-shell',
          html: '<button type="button" class="impact-marker" aria-label="' + impact.tag + ': ' + impact.title + '">' + impact.symbol + '</button>',
          iconSize: [42, 42],
          iconAnchor: [21, 21]
        })
      });
      marker.on('click', function () {
        showImpactPopup(impactId);
      });
      marker.bindTooltip(impact.tag, {
        direction: 'top',
        offset: [0, -20],
        className: 'impact-tooltip'
      });
      marker.addTo(impactLayer);
    });

    map.on('click', function () {
      impactPopup.hidden = true;
    });
    map.on('resize zoomend', resizeCanvas);
    window.setTimeout(function () {
      map.invalidateSize();
      resizeCanvas();
    }, 60);
  }

  function clearCanvas() {
    if (!context) {
      return;
    }
    context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    context.clearRect(0, 0, canvasWidth, canvasHeight);
  }

  function drawEllipseGlow(latitude, longitude, radiusLatitude, radiusLongitude, colors, alpha) {
    if (!context || alpha <= 0.001) {
      return;
    }
    var center = project(latitude, longitude);
    var latitudeEdge = project(latitude + radiusLatitude, longitude);
    var radiusX = Math.max(8, radiusLongitude * worldPixelsPerDegree());
    var radiusY = Math.max(8, Math.abs(center.y - latitudeEdge.y));
    if (center.x + radiusX < -40 || center.x - radiusX > canvasWidth + 40 || center.y + radiusY < -40 || center.y - radiusY > canvasHeight + 40) {
      return;
    }
    context.save();
    context.globalCompositeOperation = 'screen';
    context.globalAlpha = alpha;
    context.translate(center.x, center.y);
    context.scale(radiusX, radiusY);
    var gradient = context.createRadialGradient(0, 0, 0, 0, 0, 1);
    gradient.addColorStop(0, colors[0]);
    gradient.addColorStop(0.46, colors[1]);
    gradient.addColorStop(1, colors[2]);
    context.fillStyle = gradient;
    context.beginPath();
    context.arc(0, 0, 1, 0, Math.PI * 2);
    context.fill();
    context.restore();
  }

  function drawContour(latitude, longitude, radiusLatitude, radiusLongitude, color, alpha, phase) {
    if (!context || alpha <= 0.001) {
      return;
    }
    var center = project(latitude, longitude);
    var latitudeEdge = project(latitude + radiusLatitude, longitude);
    var radiusX = Math.max(8, radiusLongitude * worldPixelsPerDegree());
    var radiusY = Math.max(8, Math.abs(center.y - latitudeEdge.y));
    context.save();
    context.globalCompositeOperation = 'screen';
    context.globalAlpha = alpha;
    context.strokeStyle = color;
    context.lineWidth = 1;
    context.setLineDash([2, 8]);
    context.lineDashOffset = phase;
    context.beginPath();
    context.ellipse(center.x, center.y, radiusX, radiusY, 0, 0, Math.PI * 2);
    context.stroke();
    context.restore();
  }

  function drawEquatorialReference() {
    if (!context || !map) {
      return;
    }
    var west = project(0, -235);
    var east = project(0, -75);
    context.save();
    context.globalAlpha = 0.24;
    context.strokeStyle = '#b9f4f0';
    context.lineWidth = 1;
    context.setLineDash([2, 7]);
    context.beginPath();
    context.moveTo(west.x, west.y);
    context.lineTo(east.x, east.y);
    context.stroke();
    context.setLineDash([]);
    context.fillStyle = '#a9c5c8';
    context.font = '700 9px Inter, sans-serif';
    context.fillText('EQUADOR', east.x - 54, east.y - 7);
    context.restore();
  }

  function drawNinoZone(progress) {
    var alpha = smoothstep(0.22, 0.58, progress);
    if (!context || !map || alpha <= 0.001) {
      return;
    }
    var northwest = project(5, -170);
    var southeast = project(-5, -120);
    var x = Math.min(northwest.x, southeast.x);
    var y = Math.min(northwest.y, southeast.y);
    var width = Math.abs(southeast.x - northwest.x);
    var height = Math.abs(southeast.y - northwest.y);
    context.save();
    context.globalAlpha = alpha * 0.66;
    context.strokeStyle = '#ffd58b';
    context.lineWidth = 1;
    context.setLineDash([5, 6]);
    context.strokeRect(x, y, width, height);
    context.setLineDash([]);
    context.fillStyle = '#ffe0a3';
    context.font = '800 9px Inter, sans-serif';
    context.fillText('REGIÃO NIÑO 3.4', x + 7, y - 8);
    context.restore();
  }

  function drawTemperatureField(progress, time) {
    if (!canvasFlags.ocean) {
      return;
    }
    var warmLongitude = lerp(-210, -139, progress);
    var warmRadiusLongitude = lerp(42, 66, progress);
    var warmRadiusLatitude = lerp(12, 17, progress);
    var eastWarmAlpha = smoothstep(0.18, 0.75, progress);
    var coldAlpha = lerp(0.74, 0.08, progress);
    drawEllipseGlow(0, warmLongitude, warmRadiusLatitude, warmRadiusLongitude, ['rgba(255,178,63,0.98)', 'rgba(255,92,70,0.56)', 'rgba(255,80,54,0)'], 0.72);
    drawEllipseGlow(0, lerp(-177, -121, progress), lerp(8, 13, progress), lerp(28, 47, progress), ['rgba(255,105,58,0.95)', 'rgba(255,52,43,0.45)', 'rgba(255,52,43,0)'], eastWarmAlpha * 0.76);
    drawEllipseGlow(-1, -98, lerp(11, 7, progress), lerp(31, 17, progress), ['rgba(65,232,239,0.96)', 'rgba(16,179,211,0.45)', 'rgba(16,179,211,0)'], coldAlpha);
    drawContour(0, warmLongitude, warmRadiusLatitude * 0.72, warmRadiusLongitude * 0.76, '#ffc26b', 0.52, -time * 0.016);
    drawContour(0, warmLongitude, warmRadiusLatitude * 1.04, warmRadiusLongitude * 1.03, '#ff7657', 0.34, time * 0.012);
    drawNinoZone(progress);
  }

  function drawWindField(progress, time, delta) {
    if (!canvasFlags.wind || !context || !map) {
      return;
    }
    var strength = lerp(1, 0.16, progress);
    var reversal = smoothstep(0.63, 0.94, progress);
    var deltaFactor = motionPaused || prefersReducedMotion ? 0 : delta;
    context.save();
    context.globalCompositeOperation = 'screen';
    context.lineCap = 'round';
    windParticles.forEach(function (particle) {
      var reversed = particle.reverses && reversal > 0.1;
      var direction = reversed ? 1 : -1;
      var speedMultiplier = reversed ? Math.max(0.15, reversal) : strength;
      particle.t += direction * deltaFactor * 0.000035 * particle.speed * speedMultiplier;
      if (particle.t < 0) {
        particle.t += 1;
      }
      if (particle.t > 1) {
        particle.t -= 1;
      }
      var longitude = lerp(-222, -88, particle.t);
      var latitude = particle.latitude + Math.sin(time * 0.0007 + particle.phase + particle.t * 4) * 1.1;
      var point = project(latitude, longitude);
      var tailDirection = reversed ? -1 : 1;
      var tailLength = particle.length * lerp(1, 0.58, progress);
      if (point.x < -20 || point.x > canvasWidth + 20 || point.y < -20 || point.y > canvasHeight + 20) {
        return;
      }
      context.globalAlpha = particle.alpha * (reversed ? reversal * 0.85 : lerp(0.78, 0.34, progress));
      context.strokeStyle = reversed ? '#ffb45b' : '#a2f5f0';
      context.lineWidth = reversed ? 1.4 : 1.1;
      context.beginPath();
      context.moveTo(point.x, point.y);
      context.lineTo(point.x + tailDirection * tailLength, point.y - tailLength * 0.07);
      context.stroke();
    });
    context.restore();
  }

  function drawWarmCurrent(progress, time, delta) {
    if (!canvasFlags.ocean || !context || !map) {
      return;
    }
    var alpha = smoothstep(0.05, 0.36, progress);
    if (alpha <= 0.001) {
      return;
    }
    var deltaFactor = motionPaused || prefersReducedMotion ? 0 : delta;
    context.save();
    context.globalCompositeOperation = 'screen';
    currentParticles.forEach(function (particle) {
      particle.t += deltaFactor * 0.000027 * particle.speed * lerp(0.35, 1.1, progress);
      if (particle.t > 1) {
        particle.t -= 1;
      }
      var longitude = lerp(-216, -92, particle.t);
      var latitude = particle.latitude + Math.sin(time * 0.0008 + particle.phase + particle.t * 6) * 0.8;
      var point = project(latitude, longitude);
      if (point.x < -15 || point.x > canvasWidth + 15 || point.y < -15 || point.y > canvasHeight + 15) {
        return;
      }
      context.globalAlpha = particle.alpha * alpha;
      context.fillStyle = '#ffd275';
      context.shadowColor = '#ff714b';
      context.shadowBlur = 8;
      context.beginPath();
      context.arc(point.x, point.y, 1.2, 0, Math.PI * 2);
      context.fill();
    });
    context.restore();
  }

  function drawRainField(progress, time, delta) {
    if (!canvasFlags.rain || !context || !map) {
      return;
    }
    var centerLongitude = lerp(-212, -148, progress);
    var centerPoint = project(1, centerLongitude);
    var glowRadius = Math.max(65, 30 * worldPixelsPerDegree());
    var deltaFactor = motionPaused || prefersReducedMotion ? 0 : delta;
    context.save();
    context.globalCompositeOperation = 'screen';
    context.globalAlpha = 0.22;
    var glow = context.createRadialGradient(centerPoint.x, centerPoint.y, 0, centerPoint.x, centerPoint.y, glowRadius);
    glow.addColorStop(0, 'rgba(107,230,238,0.66)');
    glow.addColorStop(0.5, 'rgba(39,163,196,0.2)');
    glow.addColorStop(1, 'rgba(39,163,196,0)');
    context.fillStyle = glow;
    context.beginPath();
    context.arc(centerPoint.x, centerPoint.y, glowRadius, 0, Math.PI * 2);
    context.fill();
    context.restore();
    context.save();
    context.globalCompositeOperation = 'screen';
    context.lineCap = 'round';
    rainParticles.forEach(function (drop) {
      drop.fall += deltaFactor * 0.00022 * drop.speed;
      if (drop.fall > 1) {
        drop.fall -= 1;
      }
      var point = project(drop.latitudeOffset, centerLongitude + drop.longitudeOffset);
      var fallOffset = drop.fall * 34 - 17;
      if (point.x < -20 || point.x > canvasWidth + 20 || point.y < -30 || point.y > canvasHeight + 30) {
        return;
      }
      context.globalAlpha = drop.alpha * 0.56;
      context.strokeStyle = '#8fe8ef';
      context.lineWidth = 0.9;
      context.beginPath();
      context.moveTo(point.x, point.y + fallOffset);
      context.lineTo(point.x - 2, point.y + fallOffset + drop.length);
      context.stroke();
    });
    context.restore();
  }

  function drawUpwelling(progress, time) {
    if (!canvasFlags.ocean || !context || !map) {
      return;
    }
    var alpha = lerp(0.92, 0.1, progress);
    var anchor = project(-10, -84);
    context.save();
    context.globalCompositeOperation = 'screen';
    context.strokeStyle = '#7ff3f0';
    context.fillStyle = '#bafff9';
    context.lineWidth = 1.2;
    for (var arrow = 0; arrow < 5; arrow += 1) {
      var phase = motionPaused || prefersReducedMotion ? arrow / 5 : (time * 0.00028 + arrow / 5) % 1;
      var x = anchor.x - 24 + arrow * 12;
      var y = anchor.y + 24 - phase * 48;
      context.globalAlpha = alpha * Math.sin(Math.PI * phase);
      context.beginPath();
      context.moveTo(x, y + 8);
      context.lineTo(x, y);
      context.lineTo(x - 3, y + 4);
      context.moveTo(x, y);
      context.lineTo(x + 3, y + 4);
      context.stroke();
    }
    context.globalAlpha = alpha * 0.76;
    context.font = '800 9px Inter, sans-serif';
    context.fillText('RESSURGÊNCIA FRIA', anchor.x - 55, anchor.y + 43);
    context.restore();
  }

  function quadraticPoint(start, control, end, amount) {
    var inverse = 1 - amount;
    return {
      x: inverse * inverse * start.x + 2 * inverse * amount * control.x + amount * amount * end.x,
      y: inverse * inverse * start.y + 2 * inverse * amount * control.y + amount * amount * end.y
    };
  }

  function drawTargetPulse(point, alpha, phase) {
    context.save();
    context.globalCompositeOperation = 'screen';
    context.globalAlpha = alpha * (1 - phase);
    context.strokeStyle = '#ffbc62';
    context.lineWidth = 1.2;
    context.beginPath();
    context.arc(point.x, point.y, 5 + phase * 14, 0, Math.PI * 2);
    context.stroke();
    context.restore();
  }

  function drawTeleconnections(progress, time) {
    if (!canvasFlags.impact || !context || !map) {
      return;
    }
    var alpha = smoothstep(0.72, 0.98, progress);
    if (alpha <= 0.001) {
      return;
    }
    var source = project(0, -150);
    context.save();
    context.globalCompositeOperation = 'screen';
    context.lineWidth = 1.15;
    context.setLineDash([2, 9]);
    context.lineDashOffset = motionPaused || prefersReducedMotion ? 0 : -time * 0.018;
    impactOrder.forEach(function (impactId, index) {
      var impact = impacts[impactId];
      var target = project(impact.mapPosition[0], impact.mapPosition[1]);
      var control = {
        x: (source.x + target.x) / 2,
        y: Math.min(source.y, target.y) - 55 - Math.abs(target.x - source.x) * 0.08
      };
      var gradient = context.createLinearGradient(source.x, source.y, target.x, target.y);
      gradient.addColorStop(0, 'rgba(255,174,77,0.2)');
      gradient.addColorStop(0.6, 'rgba(255,191,94,0.8)');
      gradient.addColorStop(1, 'rgba(255,107,73,0.9)');
      context.globalAlpha = alpha * 0.68;
      context.strokeStyle = gradient;
      context.beginPath();
      context.moveTo(source.x, source.y);
      context.quadraticCurveTo(control.x, control.y, target.x, target.y);
      context.stroke();
      var pulseAmount = motionPaused || prefersReducedMotion ? 0.72 : (time * 0.00012 + index * 0.17) % 1;
      var pulsePoint = quadraticPoint(source, control, target, pulseAmount);
      context.setLineDash([]);
      context.globalAlpha = alpha;
      context.fillStyle = '#ffd58d';
      context.shadowColor = '#ff714b';
      context.shadowBlur = 10;
      context.beginPath();
      context.arc(pulsePoint.x, pulsePoint.y, 2.2, 0, Math.PI * 2);
      context.fill();
      context.setLineDash([2, 9]);
      drawTargetPulse(target, alpha * 0.76, motionPaused || prefersReducedMotion ? 0.35 : (time * 0.00035 + index * 0.2) % 1);
    });
    context.restore();
  }

  function drawFrame(time, delta) {
    if (!context || !map) {
      return;
    }
    clearCanvas();
    var progress = clamp(displayProgress / 4, 0, 1);
    drawEquatorialReference();
    drawTemperatureField(progress, time);
    drawWarmCurrent(progress, time, delta);
    drawRainField(progress, time, delta);
    drawWindField(progress, time, delta);
    drawUpwelling(progress, time);
    drawTeleconnections(progress, time);
  }

  function updateStageContent(stage) {
    if (stage === currentStage) {
      return;
    }
    currentStage = stage;
    var data = stages[stage];
    document.getElementById('phase-number').textContent = String(stage + 1).padStart(2, '0');
    document.getElementById('phase-kicker').textContent = data.kicker;
    document.getElementById('phase-title').textContent = data.title;
    document.getElementById('phase-description').textContent = data.description;
    document.getElementById('state-label').textContent = data.state;
    document.getElementById('wind-label').textContent = data.wind;
    document.getElementById('map-narrative-kicker').textContent = data.mapKicker;
    document.getElementById('map-narrative-title').textContent = data.mapTitle;
    slider.setAttribute('aria-valuetext', data.valueText);
    document.querySelectorAll('.phase-list li').forEach(function (item, index) {
      item.classList.toggle('active', index === stage);
      item.classList.toggle('passed', index < stage);
    });
    updateCrossSection(stage);
  }

  function updateContinuousReadout() {
    var roundedStage = clamp(Math.round(displayProgress), 0, 4);
    var anomaly = interpolateStops(anomalyStops, clamp(displayProgress, 0, 4));
    var percentage = Math.round((displayProgress / 4) * 100);
    updateStageContent(roundedStage);
    document.getElementById('anomaly-label').textContent = '+' + anomaly.toFixed(1).replace('.', ',') + ' °C';
    document.getElementById('stage-output').textContent = String(percentage) + '%';
    if (playing) {
      slider.value = displayProgress.toFixed(2);
    }
    syncImpactMarkers();
  }

  function setProgress(value, options) {
    var configuration = options || {};
    targetProgress = clamp(Number(value), 0, 4);
    if (configuration.immediate || prefersReducedMotion) {
      displayProgress = targetProgress;
    }
    slider.value = targetProgress.toFixed(2);
    updateContinuousReadout();
  }

  function startPlayback() {
    if (playing) {
      stopPlayback();
      return;
    }
    if (targetProgress >= 3.99) {
      targetProgress = 0;
      displayProgress = 0;
      updateContinuousReadout();
    }
    playing = true;
    playButton.innerHTML = '<span class="play-symbol" aria-hidden="true">Ⅱ</span> Pausar';
    playButton.setAttribute('aria-label', 'Pausar reprodução do fenômeno');
  }

  function stopPlayback() {
    playing = false;
    playButton.innerHTML = '<span class="play-symbol" aria-hidden="true">▶</span> Reproduzir o fenômeno';
    playButton.setAttribute('aria-label', 'Reproduzir o fenômeno');
  }

  function animationLoop(time) {
    var delta = Math.min(40, Math.max(0, time - previousFrameTime));
    previousFrameTime = time;
    if (playing && !motionPaused) {
      targetProgress += (delta / 12800) * 4;
      if (targetProgress >= 4) {
        targetProgress = 4;
        stopPlayback();
      }
    }
    var easing = 1 - Math.exp(-delta / 130);
    displayProgress += (targetProgress - displayProgress) * easing;
    if (Math.abs(targetProgress - displayProgress) < 0.001) {
      displayProgress = targetProgress;
    }
    updateContinuousReadout();
    drawFrame(time, delta);
    window.requestAnimationFrame(animationLoop);
  }

  function syncImpactMarkers() {
    if (!map || !impactLayer) {
      return;
    }
    var shouldShow = displayProgress >= 3.35 && canvasFlags.impact;
    if (shouldShow && !map.hasLayer(impactLayer)) {
      impactLayer.addTo(map);
    } else if (!shouldShow && map.hasLayer(impactLayer)) {
      map.removeLayer(impactLayer);
      impactPopup.hidden = true;
    }
  }

  function showImpactPopup(id) {
    var impact = impacts[id];
    if (!impact) {
      return;
    }
    document.getElementById('impact-tag').textContent = impact.tag;
    document.getElementById('impact-title').textContent = impact.title;
    document.getElementById('impact-text').textContent = impact.popup;
    impactPopup.hidden = false;
  }

  function selectImpactStory(id) {
    var impact = impacts[id];
    if (!impact || !impact.visualClass) {
      return;
    }
    selectedImpact = id;
    document.querySelectorAll('[data-impact-card]').forEach(function (button) {
      button.setAttribute('aria-selected', String(button.dataset.impactCard === id));
    });
    var visual = document.querySelector('.impact-visual');
    visual.className = 'impact-visual ' + impact.visualClass;
    visual.querySelector('.impact-coordinate').textContent = impact.coordinate;
    visual.querySelector('strong').innerHTML = impact.visual;
    document.getElementById('story-region').textContent = impact.tag;
    document.getElementById('story-title').textContent = impact.storyTitle;
    document.getElementById('story-copy').textContent = impact.storyCopy;
    document.getElementById('story-list').innerHTML = impact.list.map(function (item) {
      return '<li>' + item + '</li>';
    }).join('');
  }

  function updateCrossSection(stage) {
    var progress = stage / 4;
    var diagram = document.getElementById('ocean-diagram');
    var warmWater = diagram.querySelector('.warm-water');
    var thermocline = diagram.querySelector('.thermocline');
    var cloudField = diagram.querySelector('.cloud-field');
    var upwelling = diagram.querySelector('.upwelling-arrows');
    var eastLabel = diagram.querySelector('.surface-label.east');
    diagram.classList.toggle('el-nino', stage >= 3);
    warmWater.style.width = String(62 + progress * 38) + '%';
    thermocline.style.top = String(53 + progress * 6) + '%';
    thermocline.style.transform = 'rotate(' + String(-10 + progress * 8.5) + 'deg)';
    cloudField.style.left = String(19 + progress * 38) + '%';
    upwelling.style.opacity = String(1 - progress * 0.8);
    eastLabel.style.opacity = String(1 - progress * 0.8);
    var titles = ['Condições normais', 'Ventos enfraquecendo', 'Termoclina se achatando', 'El Niño estabelecido', 'Pacífico reorganizado'];
    var copies = [
      'A termoclina é mais rasa no leste, favorecendo a ressurgência junto à América do Sul.',
      'A inclinação ainda existe, mas a água quente começa a escapar para leste.',
      'A camada superficial quente avança e a subida de água fria perde força.',
      'A termoclina fica mais profunda no leste e a ressurgência é fortemente reduzida.',
      'Calor e convecção ocupam o centro-leste do Pacífico, conectando oceano e atmosfera.'
    ];
    document.getElementById('cross-section-title').textContent = titles[stage];
    document.getElementById('cross-section-copy').textContent = copies[stage];
  }

  function focusPacific() {
    if (!map) {
      return;
    }
    map.flyTo([0, -145], 2, { animate: !prefersReducedMotion, duration: 1 });
    document.getElementById('focus-pacific').classList.add('active');
    document.getElementById('focus-brazil').classList.remove('active');
  }

  function focusBrazil() {
    if (!map) {
      return;
    }
    setProgress(4);
    map.flyTo([-15, -51], 3, { animate: !prefersReducedMotion, duration: 1 });
    document.getElementById('focus-brazil').classList.add('active');
    document.getElementById('focus-pacific').classList.remove('active');
  }

  function bindEvents() {
    slider.addEventListener('input', function (event) {
      stopPlayback();
      setProgress(Number(event.target.value), { immediate: true });
    });
    playButton.addEventListener('click', startPlayback);
    resetButton.addEventListener('click', function () {
      stopPlayback();
      setProgress(0, { immediate: true });
      focusPacific();
    });
    document.querySelectorAll('[data-stage]').forEach(function (button) {
      button.addEventListener('click', function () {
        stopPlayback();
        setProgress(Number(button.dataset.stage));
      });
    });
    document.querySelectorAll('[data-impact-card]').forEach(function (button) {
      button.addEventListener('click', function () {
        selectImpactStory(button.dataset.impactCard);
      });
    });
    document.getElementById('show-on-map').addEventListener('click', function () {
      var impact = impacts[selectedImpact];
      setProgress(4);
      if (map) {
        map.flyTo(impact.center, impact.zoom, { animate: !prefersReducedMotion, duration: 1.2 });
        window.setTimeout(function () {
          showImpactPopup(selectedImpact);
        }, prefersReducedMotion ? 0 : 850);
      }
      document.getElementById('simulador').scrollIntoView({
        behavior: prefersReducedMotion ? 'auto' : 'smooth',
        block: 'start'
      });
    });
    document.getElementById('close-impact').addEventListener('click', function () {
      impactPopup.hidden = true;
    });
    document.getElementById('focus-pacific').addEventListener('click', focusPacific);
    document.getElementById('focus-brazil').addEventListener('click', focusBrazil);
    [
      { id: 'layer-ocean', key: 'ocean' },
      { id: 'layer-wind', key: 'wind' },
      { id: 'layer-rain', key: 'rain' },
      { id: 'layer-impact', key: 'impact' }
    ].forEach(function (control) {
      document.getElementById(control.id).addEventListener('change', function (event) {
        canvasFlags[control.key] = event.target.checked;
        syncImpactMarkers();
      });
    });
    motionToggle.addEventListener('click', function () {
      motionPaused = !motionPaused;
      document.body.classList.toggle('motion-paused', motionPaused);
      motionToggle.setAttribute('aria-pressed', String(motionPaused));
      motionToggle.innerHTML = '<span aria-hidden="true">' + (motionPaused ? '●' : '◌') + '</span>' + (motionPaused ? 'Retomar animações' : 'Pausar animações');
      if (motionPaused) {
        stopPlayback();
      }
    });
    window.addEventListener('resize', function () {
      if (map) {
        map.invalidateSize();
      }
      resizeCanvas();
    });
    document.addEventListener('keydown', function (event) {
      var activeTag = document.activeElement ? document.activeElement.tagName : '';
      if (activeTag === 'INPUT' || activeTag === 'BUTTON' || activeTag === 'A') {
        return;
      }
      if (event.key === 'ArrowRight') {
        stopPlayback();
        setProgress(Math.min(4, Math.round(targetProgress) + 1));
      }
      if (event.key === 'ArrowLeft') {
        stopPlayback();
        setProgress(Math.max(0, Math.round(targetProgress) - 1));
      }
      if (event.key === ' ') {
        event.preventDefault();
        startPlayback();
      }
    });
  }

  createParticles();
  buildMap();
  bindEvents();
  resizeCanvas();
  setProgress(0, { immediate: true });
  selectImpactStory('south-brazil');
  document.getElementById('focus-pacific').classList.add('active');
  window.requestAnimationFrame(animationLoop);
})();
