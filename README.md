# Bancada de Química · Decantação

Laboratório virtual de separação sólido-líquido para uso em aula. O aluno prepara uma mistura de 200 mL de água e 20 g de areia em um béquer, observa a formação do sedimento e ajusta a inclinação para coletar o sobrenadante em outro béquer. A bancada mede o tempo de repouso, o volume de água coletada e a massa de areia transferida.

[Laboratório publicado](https://marcelo-preigschadt.github.io/elnino/)

## Executar localmente

Sirva a raiz para que o navegador carregue os módulos JavaScript.

~~~sh
python3 -m http.server 8080
~~~

Acesse http://localhost:8080.

## Modelo da bancada

- **model.js** representa três frações granulométricas de areia quartzosa (0,42 mm, 0,19 mm e 0,075 mm) em água a 20 °C. O transporte sedimentar conserva a massa de areia entre suspensão, leito e recipiente de coleta.
- **vessel.js** aproxima o béquer por um tronco de cone e integra seções circulares para calcular o volume retido quando inclinado. O nível do líquido permanece horizontal no referencial da bancada.
- **bench.js** desenha o vidro graduado, o menisco, as partículas ampliadas, o sedimento e o escoamento. **app.js** liga o modelo ao roteiro e aos controles.
- A vazão, a porosidade do leito e o arraste do sedimento usam aproximações didáticas. As leituras na tela são resultados do modelo.

[Introdução Clássica à Química Geral, IFRN, seção sobre decantação](https://docentes.ifrn.edu.br/albinonunes/disciplinas/quimica-experimental/livro-de-quimica-geral-grupotche-quimica/)

[Ferguson e Church, 2004, equação de velocidade de sedimentação](https://durham-repository.worktribe.com/output/1597463/a-simple-universal-equation-for-grain-settling-velocity)
