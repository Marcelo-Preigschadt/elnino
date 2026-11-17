# ETA Virtual

Simulação de uma estação convencional de tratamento de água, da leitura inicial do pH à cloração. O aluno opera a sonda, escolhe o corretor, aplica doses incrementais de policloreto de alumínio (PAC), acompanha a galeria de floculação e coleta uma amostra do clarificado. Depois de uma filtração simplificada, compara derivados clorados, mede os residuais e observa os microrganismos no tanque de contato. Um toque na água abre o campo microscópico do ponto escolhido.

[Estação publicada](https://marcelo-preigschadt.github.io/elnino/)

[Exemplo no decantador](https://marcelo-preigschadt.github.io/elnino/?exemplo=decantador) abre uma amostra pausada aos 20 minutos de sedimentação para comparar os pontos. O botão **Retomar** continua a decantação.

[Exemplo de cloração](https://marcelo-preigschadt.github.io/elnino/?exemplo=cloracao) abre a água filtrada antes da primeira dose de cloro. O aluno pode observar os microrganismos, comparar os produtos, dosar e medir.

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
- **Cloração.** O cenário oferece hipoclorito de sódio a 12% e a 2,5%, hipoclorito de cálcio a 65% e Cl₂ puro a 100% equivalente. A dose de produto em mg/L é convertida em cloro ativo como Cl₂ pela fração mássica. A filtração retira 99,5% da massa de partículas remanescente. A água conserva o pH de saída da mistura, a 25 °C.
- **Contato e residuais.** A demanda inicial do cenário é 0,40 mg/L acrescida de 0,07 vezes a turbidez filtrada, com acréscimo limitado a 0,60 mg/L. Uma fração de 15% da demanda consumida representa cloro combinado. O cloro livre decai a 0,006 min⁻¹ e o combinado a 0,003 min⁻¹. O CT é integrado analiticamente em cada avanço. Novas doses preservam o CT acumulado e o tempo anterior. A observação começa com 60 minutos de processo e ganha 30 minutos adicionais se ocorrer nova dose após esse período.
- **Instrumentos.** A amostra com ortotolidina (OTO) desenvolve amarelo proporcional ao cloro total coletado, com faixa ilustrativa de 0–10 mg/L. Cada ensaio preserva a concentração do instante de coleta. O eletrodo representa um sensor amperométrico seletivo para cloro livre, com estabilização abreviada a três segundos de tela e leitura contínua.
- **Microrganismos.** O aluno alterna entre flocos, bactérias e protozoários. Bacilos, cocos e espirilos usam um campo de 50 µm. Ciliados, flagelados e amebas usam um campo de 400 µm. O mesmo ponto mantém os organismos representativos na comparação antes/agora. As estruturas inativadas podem ser exibidas com a opção correspondente.

O modelo microbiológico é didático. A sobrevivência segue 10^(-k × CT × fração_HOCl / 0,76), com k = 2,2 para bactérias e k = 0,12 para formas vegetativas de protozoários. A fração de HOCl usa pKa 7,5. Populações, parâmetros de demanda e constantes são escolhas do cenário. A confirmação de viabilidade exige ensaios microbiológicos. Cistos resistentes como os de Cryptosporidium exigem outras barreiras de tratamento.

**treatment.js** contém o modelo de clarificação e as transições. **chlorine.js** calcula dosagem, contato e instrumentos. **station-view.js** e **microbiology.js** desenham os campos. **app.js** opera os controles e as medições.

## Referências

- [COMUSA · Etapas do tratamento de água](https://www.comusa.rs.gov.br/index.php/saneamento/tratamentoagua)
- [Funasa · Manual de Saneamento](https://bvsms.saude.gov.br/bvs/publicacoes/funasa/capitulo_2.pdf)
- [AGENERSA · Uso de PAC e ensaio de jarros](https://www.rj.gov.br/agenersa/sites/default/files/arquivos_paginas_basicas/RF%20177-2024.pdf)
- [NHMRC · Policloreto de alumínio](https://guidelines.nhmrc.gov.au/australian-drinking-water-guidelines/part-5/treatment-chemicals/polyaluminium-chloride)
- [USGS · Alcalinidade e equilíbrio carbonático](https://water.usgs.gov/water-resources/memos/memo.php?id=2098)
- [Funasa · Manual de cloração de água em pequenas comunidades](https://www.funasa.gov.br/site/wp-content/files_mf/manualdecloracaodeaguaempequenascomunidades.pdf)
- [OMS · Reduções microbiológicas nos processos de tratamento](https://www.ncbi.nlm.nih.gov/books/NBK579466/table/ch7.tab7/)
- [Hach · Sensor amperométrico para cloro livre](https://my.hach.com/9184sc-free-chlorine-afc-amperometric-sensor/product-details?id=59428579093)
