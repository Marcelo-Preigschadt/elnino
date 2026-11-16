# ETA Virtual

Simulação de uma estação convencional de tratamento de água, da leitura inicial do pH à saída do decantador. O aluno opera a sonda, escolhe o corretor, aplica doses incrementais de policloreto de alumínio (PAC), acompanha a galeria de floculação e coleta uma amostra do clarificado. Um toque na água abre o campo microscópico do ponto escolhido.

[Estação publicada](https://marcelo-preigschadt.github.io/elnino/)

## Executar localmente

Sirva a raiz por HTTP com o comando abaixo e abra http://localhost:8080/.

~~~sh
python3 -m http.server 8080
~~~

## Cenário didático

A água bruta parte de 120 uT, pH 7,20, alcalinidade de 22 mg/L como CaCO₃ e temperatura de 25 °C. A solução de PAC do cenário tem 10% em Al₂O₃ e basicidade de 50%. As doses virtuais são expressas em mg/L do produto assumido.

- **Ajuste de pH.** O modelo resolve o equilíbrio carbonático após a adição de hidróxido de cálcio, carbonato de sódio, ácido clorídrico ou PAC. A barrilha fornece carbono inorgânico e alcalinidade. A cal hidratada acrescenta alcalinidade. O ácido clorídrico e a hidrólise do PAC consomem alcalinidade. Cada adição exige uma nova leitura após a mistura.
- **Coagulação e floculação.** A eficiência da amostra reage à dose acumulada e ao pH. A mistura rápida dura 45 segundos de processo e a agitação na galeria pode chegar a 25 minutos.
- **Decantação.** Uma parcela representativa da água é acompanhada por até duas horas de processo. As partículas caem em ritmos diferentes e a fração sedimentada aparece no fundo. A turbidez estimada representa a fração média de sólidos em suspensão. A saída superficial destina-se às etapas seguintes de filtração e desinfecção.
- **Observação.** As unidades foram renderizadas em 3D e recebem água, flocos, lodo e instrumentos animados em Canvas. O campo microscópico acompanha a concentração e os flocos na posição e na profundidade selecionadas. No decantador, a vista também mostra o lodo depositado ao selecionar o leito. O seletor permite demonstração acelerada com fator explícito ou tempo real.

**treatment.js** contém o modelo de tratamento, **station-view.js** compõe as vistas e **app.js** opera os controles e as medições.

## Referências

- [COMUSA · Etapas do tratamento de água](https://www.comusa.rs.gov.br/index.php/saneamento/tratamentoagua)
- [Funasa · Manual de Saneamento](https://bvsms.saude.gov.br/bvs/publicacoes/funasa/capitulo_2.pdf)
- [AGENERSA · Uso de PAC e ensaio de jarros](https://www.rj.gov.br/agenersa/sites/default/files/arquivos_paginas_basicas/RF%20177-2024.pdf)
- [NHMRC · Policloreto de alumínio](https://guidelines.nhmrc.gov.au/australian-drinking-water-guidelines/part-5/treatment-chemicals/polyaluminium-chloride)
- [USGS · Alcalinidade e equilíbrio carbonático](https://water.usgs.gov/water-resources/memos/memo.php?id=2098)
