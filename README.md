# El Niño — experiência climática interativa

Site estático, responsivo e pronto para GitHub Pages. A experiência recria, de
forma didática, a evolução típica do El Niño no Pacífico Equatorial e conecta o
mecanismo oceano-atmosfera aos impactos no Brasil e no mundo.

## Recursos

- mapa interativo com base OpenStreetMap/CARTO;
- animação em cinco etapas;
- camadas independentes de oceano, ventos, chuva e impactos;
- composição Canvas com campo térmico interpolado em tempo real;
- partículas de vento, correntes quentes, chuva e teleconexões animadas;
- pontos de impacto clicáveis;
- corte lateral do Pacífico com termoclina dinâmica;
- recorte específico para Sul, Norte e Nordeste do Brasil;
- orientações de prevenção e acesso ao alerta SMS 40199;
- navegação por teclado e suporte a redução de movimento;
- layout adaptado para computador, tablet e celular.

## Publicação no GitHub Pages

1. Abra **Settings → Pages** no repositório.
2. Em **Build and deployment**, selecione **Deploy from a branch**.
3. Escolha a branch main, pasta / (root) e clique em **Save**.

O endereço será:

https://marcelo-preigschadt.github.io/elnino/

## Estrutura

- index.html — conteúdo e estrutura semântica;
- styles.css — identidade visual, responsividade e animações;
- app.js — simulação, mapa e interações;
- .nojekyll — publicação direta dos arquivos estáticos.

## Fontes científicas

- NOAA Ocean Service — What are El Niño and La Niña?
- NASA Science — El Niño
- CPTEC/INPE — El Niño e La Niña
- CEMADEN — monitoramento e alertas
- Organização Meteorológica Mundial — El Niño/La Niña phenomena

A simulação é conceitual. Ela representa mecanismos e tendências típicas e não
deve ser interpretada como previsão meteorológica ou climática em tempo real.
