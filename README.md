# El Niño — experiência climática

Uma narrativa interativa sobre como o El Niño nasce no Pacífico, reorganiza a atmosfera e altera o risco de chuva, enchentes e tempestades severas no Rio Grande do Sul.

## Nova arquitetura visual

- Globo 3D renderizado diretamente na GPU com WebGL 1.0.
- Anomalia térmica, ventos e convecção calculados em fragment shader.
- Um único draw call por quadro; sem partículas no DOM, Leaflet ou tiles externos.
- Continentes carregados localmente de um GeoJSON simplificado e convertidos uma única vez em textura.
- Resolução gráfica limitada a 1,5× o DPR para manter fluidez em notebooks e celulares.
- Renderização suspensa quando a aba ou o globo não estão visíveis.
- Controles por arraste, roda/pinça, linha do tempo e camadas temáticas.
- Viagem de câmera que acompanha o sinal térmico no Pacífico e termina no Rio Grande do Sul.
- Marcador de Porto Alegre reprojetado a cada quadro em 30,03°S e 51,23°O pelo mesmo sistema de câmera do shader.
- Contorno integral do Rio Grande do Sul destacado no globo com malha geográfica oficial do IBGE.
- Corte científico em SVG com curvas contínuas para superfície quente, termoclina, alísios e ressurgência.
- Galeria de registros reais do estado, com créditos e fontes verificáveis.
- Sistema visual responsivo com Space Grotesk nos títulos, Manrope na leitura e escalas tipográficas próprias para desktop, tablet e celular.
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
- [INMET — El Niño e o Rio Grande do Sul](https://portal.inmet.gov.br/noticias/el-ni%C3%B1o-o-que-esperar-e-como-isso-pode-afetar-o-rio-grande-do-sul)
- [Defesa Civil RS — avisos e alertas](https://defesacivil.rs.gov.br/avisos-e-alertas)
- [Wikimedia Commons — temporal na Praia do Cassino, Rio Grande](https://commons.wikimedia.org/wiki/File:Temporal_no_meio_do_mar.JPG)
- Referência matemática de projeção: [Google Data Arts Team — WebGL Globe](https://github.com/dataarts/webgl-globe)
- Malha estadual: [IBGE — API de Malhas Geográficas](https://servicodados.ibge.gov.br/api/docs/malhas?versao=3)
- Contornos de países: [world.geo.json](https://github.com/johan/world.geo.json), derivados de dados Natural Earth de domínio público.

## Estrutura

- `index.html` — narrativa e interface acessível.
- `styles.css` — direção visual e layout responsivo.
- `app.js` — renderer WebGL, shader, interação e linha do tempo.
- `world.geo.json` — geometria local dos continentes.
- `rs.geo.json` — contorno simplificado do Rio Grande do Sul fornecido pelo IBGE.
- `.nojekyll` — publicação direta no GitHub Pages.
