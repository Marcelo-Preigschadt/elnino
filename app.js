(function () {
  'use strict';

  var stages = [
    {
      kicker: 'Condições normais',
      title: 'O Pacífico em equilíbrio',
      description:
        'Ventos alísios empurram a água superficial quente para oeste. Próximo à América do Sul, águas profundas, frias e ricas em nutrientes sobem até a superfície.',
      state: 'NEUTRO',
      anomaly: '+0,0 °C',
      wind: 'FORTES',
      valueText: 'Condições normais'
    },
    {
      kicker: 'O primeiro sinal',
      title: 'Os ventos perdem força',
      description:
        'A circulação de leste para oeste enfraquece. A água quente acumulada no Pacífico ocidental deixa de ser mantida tão fortemente junto à Ásia e à Oceania.',
      state: 'TRANSIÇÃO',
      anomaly: '+0,2 °C',
      wind: 'ENFRAQUECENDO',
      valueText: 'Ventos alísios enfraquecendo'
    },
    {
      kicker: 'O oceano responde',
      title: 'Uma onda de calor avança',
      description:
        'A massa de água superficial quente se desloca para o centro e o leste do Pacífico. A termoclina se achata e a ressurgência fria perde intensidade.',
      state: 'EM FORMAÇÃO',
      anomaly: '+0,6 °C',
      wind: 'FRACOS',
      valueText: 'Água quente avançando pelo Pacífico'
    },
    {
      kicker: 'O céu muda de lugar',
      title: 'A chuva acompanha o calor',
      description:
        'A convecção tropical migra para leste. O aquecimento do oceano reorganiza pressão, nuvens e circulação atmosférica sobre uma área imensa.',
      state: 'EL NIÑO',
      anomaly: '+1,2 °C',
      wind: 'MUITO FRACOS',
      valueText: 'El Niño estabelecido e chuva deslocada'
    },
    {
      kicker: 'Teleconexões',
      title: 'O efeito dominó alcança continentes',
      description:
        'A mudança no Pacífico altera probabilidades de chuva, seca e calor em regiões distantes. Os resultados variam, mas a exposição e a vulnerabilidade definem o tamanho dos danos.',
      state: 'IMPACTO GLOBAL',
      anomaly: '+2,0 °C',
      wind: 'DESORGANIZADOS',
      valueText: 'Impactos globais do El Niño'
    }
  ];

  var impacts = {
    'south-brazil': {
      tag: 'SUL DO BRASIL',
      title: 'Chuva persistente e enchentes',
      popup:
        'A primavera tende a ter chuva acima da média. A combinação com solo saturado, rios cheios e ocupação vulnerável aumenta o risco de enchentes e deslizamentos.',
      coordinate: '29,7° S · 53,0° O',
      visual: 'CHUVA<br />ACIMA DA MÉDIA',
      visualClass: 'rain',
      storyTitle: 'Quando a água encontra um território vulnerável',
      storyCopy:
        'Na primavera, episódios de El Niño tendem a favorecer chuva acima da média no Sul. Solo saturado, ocupação de áreas inundáveis e drenagem insuficiente transformam o evento climático em desastre.',
      list: [
        'Maior risco de enchentes e deslizamentos',
        'Prejuízos a lavouras e infraestrutura',
        'Impactos sobre moradia, mobilidade e saúde'
      ],
      center: [-29.7, -53],
      zoom: 4
    },
    'north-brazil': {
      tag: 'NORTE E NORDESTE',
      title: 'Menos chuva e mais pressão sobre a água',
      popup:
        'Partes do Norte e do Nordeste tendem a registrar menos chuva. Rios mais baixos, calor e vegetação seca pressionam abastecimento, agricultura e controle do fogo.',
      coordinate: '4,0° S · 51,0° O',
      visual: 'SECA<br />E CALOR',
      visualClass: 'drought',
      storyTitle: 'A ausência de chuva também avança devagar',
      storyCopy:
        'Em áreas do Norte e do Nordeste, o El Niño pode reduzir a chuva e elevar a temperatura. O impacto se acumula no tempo, atingindo rios, lavouras, floresta e comunidades.',
      list: [
        'Queda de níveis de rios e reservatórios',
        'Risco maior para agricultura de sequeiro',
        'Vegetação mais seca e incêndios mais prováveis'
      ],
      center: [-4, -51],
      zoom: 3.5
    },
    peru: {
      tag: 'PERU E EQUADOR',
      title: 'O oceano muda a pesca e a chuva',
      popup:
        'Água superficial mais quente reduz a ressurgência rica em nutrientes e pode favorecer chuva intensa na costa do noroeste do Peru e do Equador.',
      coordinate: '6,0° S · 80,0° O',
      visual: 'MAR QUENTE<br />MENOS NUTRIENTES',
      visualClass: 'fish',
      storyTitle: 'Quando a base da cadeia alimentar enfraquece',
      storyCopy:
        'A ressurgência costeira leva nutrientes à superfície. Quando ela diminui, cai a produtividade do fitoplâncton, alterando a disponibilidade de alimento para peixes e outros animais.',
      list: [
        'Mudanças na distribuição e abundância de peixes',
        'Pressão sobre pesca e renda costeira',
        'Maior chance de chuva intensa no litoral'
      ],
      center: [-6, -80],
      zoom: 4
    },
    oceania: {
      tag: 'INDONÉSIA E AUSTRÁLIA',
      title: 'A chuva se afasta do oeste do Pacífico',
      popup:
        'Com a convecção deslocada para leste, partes da Indonésia e da Austrália tendem a ficar mais secas, aumentando o risco de estiagem e incêndios.',
      coordinate: '16,0° S · 132,0° L',
      visual: 'MENOS CHUVA<br />MAIS FOGO',
      visualClass: 'fire',
      storyTitle: 'A floresta perde umidade antes de ganhar fogo',
      storyCopy:
        'A redução persistente da chuva resseca solo e vegetação. Quando calor, vento e fontes de ignição coincidem, o risco de incêndios cresce rapidamente.',
      list: [
        'Seca e estresse hídrico mais prováveis',
        'Maior risco de incêndios florestais',
        'Fumaça com impactos ambientais e sanitários'
      ],
      center: [-16, -228],
      zoom: 3
    },
    'southern-usa': {
      tag: 'SUL DOS ESTADOS UNIDOS',
      title: 'O jato do Pacífico muda de trajetória',
      popup:
        'No inverno do Hemisfério Norte, a corrente de jato tende a se deslocar para sul, favorecendo condições mais úmidas no sul dos Estados Unidos.',
      center: [32, -98],
      zoom: 3
    }
  };

  var impactMarkerDefinitions = [
    { id: 'south-brazil', position: [-29.7, -53], symbol: '≋' },
    { id: 'north-brazil', position: [-4, -51], symbol: '⌁' },
    { id: 'peru', position: [-6, -80], symbol: '≈' },
    { id: 'oceania', position: [-16, -228], symbol: '△' },
    { id: 'southern-usa', position: [32, -98], symbol: '↯' }
  ];

  var currentStage = 0;
  var playTimer = null;
  var selectedImpact = 'south-brazil';
  var map = null;
  var layers = {};
  var shapes = {};
  var impactMarkers = [];
  var prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var slider = document.getElementById('stage-slider');
  var playButton = document.getElementById('play-button');
  var resetButton = document.getElementById('reset-button');
  var motionToggle = document.getElementById('motion-toggle');
  var impactPopup = document.getElementById('impact-popup');

  function ellipsePoints(centerLat, centerLon, radiusLat, radiusLon) {
    var points = [];
    for (var angle = 0; angle <= 360; angle += 8) {
      var radians = (angle * Math.PI) / 180;
      points.push([
        centerLat + Math.sin(radians) * radiusLat,
        centerLon + Math.cos(radians) * radiusLon
      ]);
    }
    return points;
  }

  function buildMap() {
    var mapElement = document.getElementById('map');

    if (typeof window.L === 'undefined') {
      mapElement.innerHTML =
        '<div style="height:100%;display:grid;place-items:center;padding:30px;text-align:center;color:#b8cacc;background:#061c23">' +
        '<p>O mapa precisa de conexão com a internet para carregar a base cartográfica. O restante do conteúdo continua disponível abaixo.</p>' +
        '</div>';
      return;
    }

    map = L.map('map', {
      zoomControl: false,
      minZoom: 2,
      maxZoom: 6,
      worldCopyJump: true,
      maxBoundsViscosity: 0.8
    }).setView([0, -145], 2);

    map.setMaxBounds([
      [-72, -310],
      [78, 40]
    ]);

    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      subdomains: 'abcd',
      maxZoom: 20,
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
    }).addTo(map);

    L.control.zoom({ position: 'bottomleft' }).addTo(map);

    layers.ocean = L.layerGroup().addTo(map);
    layers.wind = L.layerGroup().addTo(map);
    layers.rain = L.layerGroup().addTo(map);
    layers.impact = L.layerGroup();
    layers.teleconnection = L.layerGroup();

    var renderer = L.svg({ padding: 0.6 });

    shapes.warmPrimary = L.polygon(ellipsePoints(0, -210, 12, 42), {
      renderer: renderer,
      className: 'thermal-blob',
      stroke: false,
      fillColor: '#ff8a43',
      fillOpacity: 0.5,
      interactive: false
    }).addTo(layers.ocean);

    shapes.warmSecondary = L.polygon(ellipsePoints(0, -169, 7, 31), {
      renderer: renderer,
      className: 'thermal-blob',
      stroke: false,
      fillColor: '#ff563f',
      fillOpacity: 0.08,
      interactive: false
    }).addTo(layers.ocean);

    shapes.cold = L.polygon(ellipsePoints(-2, -102, 10, 28), {
      renderer: renderer,
      className: 'thermal-blob',
      stroke: false,
      fillColor: '#18d0df',
      fillOpacity: 0.58,
      interactive: false
    }).addTo(layers.ocean);

    shapes.rain = L.polygon(ellipsePoints(1, -212, 16, 34), {
      renderer: renderer,
      className: 'rain-blob',
      stroke: false,
      fillColor: '#5cdfe4',
      fillOpacity: 0.25,
      interactive: false
    }).addTo(layers.rain);

    shapes.dry = L.polygon(ellipsePoints(-8, -228, 20, 27), {
      renderer: renderer,
      className: 'rain-blob',
      stroke: false,
      fillColor: '#ff9a4c',
      fillOpacity: 0,
      interactive: false
    }).addTo(layers.rain);

    [-8, 0, 8].forEach(function (latitude) {
      L.polyline(
        [
          [latitude, -94],
          [latitude, -205]
        ],
        {
          renderer: renderer,
          className: 'wind-stream',
          color: '#8be9ed',
          weight: 2,
          opacity: 0.82,
          interactive: false
        }
      ).addTo(layers.wind);
    });

    shapes.windLines = layers.wind.getLayers().slice();

    shapes.windLabel = L.marker([12, -151], {
      interactive: false,
      icon: L.divIcon({
        className: 'wind-label-icon',
        html: '<b>←</b> ventos alísios',
        iconSize: [132, 24],
        iconAnchor: [66, 12]
      })
    }).addTo(layers.wind);

    shapes.upwelling = L.marker([-12, -86], {
      interactive: false,
      icon: L.divIcon({
        className: 'upwelling-icon',
        html: '<span>↑</span>ressurgência',
        iconSize: [70, 60],
        iconAnchor: [35, 30]
      })
    }).addTo(layers.ocean);

    var teleTargets = [
      [-29.7, -53],
      [-4, -51],
      [-6, -80],
      [-16, -228],
      [32, -98]
    ];

    shapes.teleconnections = teleTargets.map(function (target) {
      return L.polyline(
        [
          [0, -150],
          [(target[0] + 0) / 2, (target[1] - 150) / 2],
          target
        ],
        {
          renderer: renderer,
          className: 'teleconnection',
          color: '#ffb23f',
          weight: 1.8,
          opacity: 0.62,
          interactive: false
        }
      ).addTo(layers.teleconnection);
    });

    impactMarkerDefinitions.forEach(function (definition) {
      var impact = impacts[definition.id];
      var marker = L.marker(definition.position, {
        title: impact.title,
        keyboard: true,
        icon: L.divIcon({
          className: 'impact-marker-shell',
          html:
            '<button type="button" class="impact-marker" aria-label="' +
            impact.tag +
            ': ' +
            impact.title +
            '">' +
            definition.symbol +
            '</button>',
          iconSize: [42, 42],
          iconAnchor: [21, 21]
        })
      });

      marker.on('click', function () {
        showImpactPopup(definition.id);
      });

      marker.bindTooltip(impact.tag, {
        direction: 'top',
        offset: [0, -20],
        className: 'impact-tooltip'
      });

      marker.addTo(layers.impact);
      impactMarkers.push(marker);
    });

    map.on('click', function () {
      impactPopup.hidden = true;
    });

    updateMap(0);
  }

  function updateMap(stage) {
    if (!map) {
      return;
    }

    var progress = stage / 4;
    var warmCenter = -210 + progress * 72;
    var warmRadius = 42 + progress * 19;
    var secondaryCenter = -170 + progress * 30;
    var rainCenter = -212 + progress * 63;

    shapes.warmPrimary.setLatLngs(ellipsePoints(0, warmCenter, 12 + progress * 3, warmRadius));
    shapes.warmPrimary.setStyle({ fillOpacity: 0.5 + progress * 0.25 });

    shapes.warmSecondary.setLatLngs(
      ellipsePoints(0, secondaryCenter, 8 + progress * 3, 31 + progress * 22)
    );
    shapes.warmSecondary.setStyle({ fillOpacity: 0.08 + progress * 0.5 });

    shapes.cold.setLatLngs(ellipsePoints(-2, -102, 10 - progress * 3, 28 - progress * 11));
    shapes.cold.setStyle({ fillOpacity: Math.max(0.05, 0.58 - progress * 0.5) });

    shapes.rain.setLatLngs(ellipsePoints(1, rainCenter, 16, 34 + progress * 8));
    shapes.rain.setStyle({ fillOpacity: 0.25 + progress * 0.12 });

    shapes.dry.setStyle({ fillOpacity: Math.max(0, progress - 0.42) * 0.27 });

    shapes.windLines.forEach(function (line, index) {
      line.setStyle({
        weight: 2.2 - progress * 0.9,
        opacity: 0.84 - progress * 0.55,
        color: stage >= 3 && index === 1 ? '#ffb23f' : '#8be9ed'
      });
    });

    if (shapes.windLabel.getElement()) {
      var arrow = stage >= 3 ? '↔' : '←';
      shapes.windLabel.getElement().innerHTML = '<b>' + arrow + '</b> ventos enfraquecidos';
      if (stage === 0) {
        shapes.windLabel.getElement().innerHTML = '<b>←</b> ventos alísios';
      }
      shapes.windLabel.getElement().style.opacity = String(1 - progress * 0.35);
    }

    if (shapes.upwelling.getElement()) {
      shapes.upwelling.getElement().style.opacity = String(1 - progress * 0.83);
    }

    updateImpactVisibility();
  }

  function updateImpactVisibility() {
    if (!map) {
      return;
    }

    var impactsChecked = document.getElementById('layer-impact').checked;
    var shouldShow = currentStage === 4 && impactsChecked;

    if (shouldShow) {
      if (!map.hasLayer(layers.impact)) {
        layers.impact.addTo(map);
      }
      if (!map.hasLayer(layers.teleconnection)) {
        layers.teleconnection.addTo(map);
      }
    } else {
      if (map.hasLayer(layers.impact)) {
        map.removeLayer(layers.impact);
      }
      if (map.hasLayer(layers.teleconnection)) {
        map.removeLayer(layers.teleconnection);
      }
      impactPopup.hidden = true;
    }
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

    var titles = [
      'Condições normais',
      'Ventos enfraquecendo',
      'Termoclina se achatando',
      'El Niño estabelecido',
      'Pacífico reorganizado'
    ];
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

  function setStage(stage, options) {
    var config = options || {};
    var nextStage = Math.max(0, Math.min(4, Number(stage)));
    var stageData = stages[nextStage];

    currentStage = nextStage;
    slider.value = String(nextStage);
    slider.setAttribute('aria-valuetext', stageData.valueText);

    document.getElementById('phase-number').textContent = String(nextStage + 1).padStart(2, '0');
    document.getElementById('phase-kicker').textContent = stageData.kicker;
    document.getElementById('phase-title').textContent = stageData.title;
    document.getElementById('phase-description').textContent = stageData.description;
    document.getElementById('state-label').textContent = stageData.state;
    document.getElementById('anomaly-label').textContent = stageData.anomaly;
    document.getElementById('wind-label').textContent = stageData.wind;
    document.getElementById('stage-output').textContent = String(nextStage * 25) + '%';

    document.querySelectorAll('.phase-list li').forEach(function (item, index) {
      item.classList.toggle('active', index === nextStage);
      item.classList.toggle('passed', index < nextStage);
    });

    updateMap(nextStage);
    updateCrossSection(nextStage);

    if (nextStage === 4 && map && !config.keepView) {
      map.flyTo([0, -105], 2, {
        animate: !prefersReducedMotion,
        duration: 1.1
      });
    }
  }

  function startPlayback() {
    if (playTimer) {
      stopPlayback();
      return;
    }

    if (currentStage >= 4) {
      setStage(0);
    }

    playButton.innerHTML = '<span class="play-symbol" aria-hidden="true">Ⅱ</span> Pausar';
    playButton.setAttribute('aria-label', 'Pausar reprodução do fenômeno');

    playTimer = window.setInterval(function () {
      if (currentStage >= 4) {
        stopPlayback();
        return;
      }

      setStage(currentStage + 1);

      if (currentStage >= 4) {
        stopPlayback();
      }
    }, prefersReducedMotion ? 900 : 2300);
  }

  function stopPlayback() {
    if (playTimer) {
      window.clearInterval(playTimer);
      playTimer = null;
    }
    playButton.innerHTML =
      '<span class="play-symbol" aria-hidden="true">▶</span> Reproduzir o fenômeno';
    playButton.setAttribute('aria-label', 'Reproduzir o fenômeno');
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
    document.getElementById('story-list').innerHTML = impact.list
      .map(function (item) {
        return '<li>' + item + '</li>';
      })
      .join('');
  }

  function focusPacific() {
    if (!map) {
      return;
    }
    map.flyTo([0, -145], 2, {
      animate: !prefersReducedMotion,
      duration: 1
    });
    document.getElementById('focus-pacific').classList.add('active');
    document.getElementById('focus-brazil').classList.remove('active');
  }

  function focusBrazil() {
    if (!map) {
      return;
    }
    setStage(4, { keepView: true });
    map.flyTo([-15, -51], 3, {
      animate: !prefersReducedMotion,
      duration: 1
    });
    document.getElementById('focus-brazil').classList.add('active');
    document.getElementById('focus-pacific').classList.remove('active');
  }

  function bindEvents() {
    slider.addEventListener('input', function (event) {
      stopPlayback();
      setStage(Number(event.target.value));
    });

    playButton.addEventListener('click', startPlayback);

    resetButton.addEventListener('click', function () {
      stopPlayback();
      setStage(0);
      focusPacific();
    });

    document.querySelectorAll('[data-stage]').forEach(function (button) {
      button.addEventListener('click', function () {
        stopPlayback();
        setStage(Number(button.dataset.stage));
      });
    });

    document.querySelectorAll('[data-impact-card]').forEach(function (button) {
      button.addEventListener('click', function () {
        selectImpactStory(button.dataset.impactCard);
      });
    });

    document.getElementById('show-on-map').addEventListener('click', function () {
      var impact = impacts[selectedImpact];
      setStage(4, { keepView: true });
      if (map) {
        map.flyTo(impact.center, impact.zoom, {
          animate: !prefersReducedMotion,
          duration: 1.2
        });
        showImpactPopup(selectedImpact);
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
      { id: 'layer-rain', key: 'rain' }
    ].forEach(function (control) {
      document.getElementById(control.id).addEventListener('change', function (event) {
        if (!map) {
          return;
        }
        if (event.target.checked && !map.hasLayer(layers[control.key])) {
          layers[control.key].addTo(map);
        } else if (!event.target.checked && map.hasLayer(layers[control.key])) {
          map.removeLayer(layers[control.key]);
        }
      });
    });

    document.getElementById('layer-impact').addEventListener('change', updateImpactVisibility);

    motionToggle.addEventListener('click', function () {
      var paused = document.body.classList.toggle('motion-paused');
      motionToggle.setAttribute('aria-pressed', String(paused));
      motionToggle.innerHTML =
        '<span aria-hidden="true">' +
        (paused ? '●' : '◌') +
        '</span>' +
        (paused ? 'Retomar animações' : 'Pausar animações');
      if (paused) {
        stopPlayback();
      }
    });

    window.addEventListener('resize', function () {
      if (map) {
        map.invalidateSize();
      }
    });

    document.addEventListener('keydown', function (event) {
      var activeTag = document.activeElement ? document.activeElement.tagName : '';
      if (activeTag === 'INPUT' || activeTag === 'BUTTON' || activeTag === 'A') {
        return;
      }

      if (event.key === 'ArrowRight') {
        stopPlayback();
        setStage(currentStage + 1);
      }
      if (event.key === 'ArrowLeft') {
        stopPlayback();
        setStage(currentStage - 1);
      }
      if (event.key === ' ') {
        event.preventDefault();
        startPlayback();
      }
    });
  }

  buildMap();
  bindEvents();
  setStage(0);
  selectImpactStory('south-brazil');
  document.getElementById('focus-pacific').classList.add('active');
})();
