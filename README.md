# El Niño — experiência climática

Uma narrativa interativa sobre o acoplamento oceano–atmosfera do El Niño, seus possíveis impactos e formas de preparação.

## Nova arquitetura visual

- Globo 3D renderizado diretamente na GPU com WebGL 1.0.
- Anomalia térmica, ventos e convecção calculados em fragment shader.
- Um único draw call por quadro; sem partículas no DOM, Leaflet ou tiles externos.
- Continentes carregados localmente de um GeoJSON simplificado e convertidos uma única vez em textura.
- Resolução gráfica limitada a 1,5× o DPR para manter fluidez em notebooks e celulares.
- Renderização suspensa quando a aba ou o globo não estão visíveis.
- Controles por arraste, roda/pinça, linha do tempo e camadas temáticas.
- Preferência de movimento reduzido respeitada e fallback explícito para navegadores sem WebGL.

## Executar localmente

O GeoJSON é carregado por `fetch`, portanto abra o projeto por um servidor HTTP local:

```bash
python3 -m http.server 8080
```

Depois acesse `http://localhost:8080`.

## Conteúdo e fontes

A animação representa o mecanismo físico do fenômeno para fins educativos; não contém observações ou previsão em tempo real.

- [NASA Earth Science — El Niño](https://science.nasa.gov/earth/explore/el-nino/)
- [NASA Scientific Visualization Studio — Ocean and atmosphere during ENSO](https://svs.gsfc.nasa.gov/5213/)
- [NOAA Climate.gov — ENSO](https://www.climate.gov/enso)
- [WMO — El Niño / La Niña](https://wmo.int/themes/el-nino-la-nina-phenomena)
- Contornos de países: [world.geo.json](https://github.com/johan/world.geo.json), derivados de dados Natural Earth de domínio público.

## Estrutura

- `index.html` — narrativa e interface acessível.
- `styles.css` — direção visual e layout responsivo.
- `app.js` — renderer WebGL, shader, interação e linha do tempo.
- `world.geo.json` — geometria local dos continentes.
- `.nojekyll` — publicação direta no GitHub Pages.
