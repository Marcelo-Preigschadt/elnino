# Bancada de Química · Decantação

Laboratório virtual de separação sólido-líquido para uso em aula. O aluno prepara uma mistura de 200 mL de água e 20 g de areia fina com silte, observa a formação do sedimento e ajusta a inclinação para coletar o sobrenadante em outro béquer. A bancada mede o tempo de repouso, o volume de água coletada e a massa de sólidos transferida.

[Laboratório publicado](https://marcelo-preigschadt.github.io/elnino/)

## Executar localmente

Sirva a raiz para que o navegador carregue os módulos JavaScript.

~~~sh
python3 -m http.server 8080
~~~

Acesse http://localhost:8080.

## Modelo da bancada

- **model.js** representa areia quartzosa de 0,160 mm e 0,078 mm e silte quartzoso de 0,041 mm e 0,022 mm em água a 20 °C. As frações do modelo são 38%, 25%, 22% e 15% em massa. A areia desce primeiro e o silte mantém turbidez visível durante o repouso. O modelo conserva a massa de sólidos entre suspensão, leito e recipiente de coleta.
- **vessel.js** aproxima o béquer por um tronco de cone e integra seções circulares para calcular o volume retido quando inclinado. O nível do líquido permanece horizontal no referencial da bancada.
- **bench.js** combina um render óptico de vidro borossilicato com a refração do fundo, a turbidez, o menisco e a textura do sedimento. **app.js** liga o modelo ao roteiro e aos controles.
- A vazão diminui à medida que o nível do líquido chega ao bico. O béquer avança em direção à inclinação solicitada conforme o líquido escoa. A vazão, a porosidade do leito e o arraste usam aproximações didáticas.

[Introdução Clássica à Química Geral, IFRN, seção sobre decantação](https://docentes.ifrn.edu.br/albinonunes/disciplinas/quimica-experimental/livro-de-quimica-geral-grupotche-quimica/)

[Ferguson e Church, 2004, equação de velocidade de sedimentação](https://durham-repository.worktribe.com/output/1597463/a-simple-universal-equation-for-grain-settling-velocity)

[Serviço Geológico dos Estados Unidos, classificação granulométrica de Wentworth](https://www.usgs.gov/publications/a-visual-basic-program-classify-sediments-based-gravel-sand-silt-clay-ratios)
