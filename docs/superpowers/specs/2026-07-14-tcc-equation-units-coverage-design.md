# TCC Equation Units Coverage Design

## Goal

Planejar a correcao textual das unidades associadas a todos os 60 blocos
`\begin{equation}` do TCC em `final-paper/TEX/chapters/`.

O objetivo e garantir que cada equacao tenha, na descricao imediatamente
relacionada a ela, as unidades das grandezas principais ou a indicacao explicita
de que a grandeza e adimensional. O trabalho deve preservar o significado
tecnico das equacoes e refletir o que o sistema implementa.

## Scope

Este ciclo cobre todos os blocos `equation` encontrados nos capitulos:

- `final-paper/TEX/chapters/4.2-engenharia-part1.tex`;
- `final-paper/TEX/chapters/4.2-engenharia-part2.tex`;
- `final-paper/TEX/chapters/4.4-validacao.tex`.

O escopo inclui equacoes teoricas, definicoes, correlacoes, balancos,
equacoes adimensionais e contas numericas de validacao.

## Non-Goals

- Nao alterar o codigo do sistema.
- Nao mudar o significado matematico das equacoes sem conferencia tecnica.
- Nao substituir referencias bibliograficas.
- Nao reorganizar capitulos.
- Nao transformar todas as descricoes em listas longas quando uma frase curta
  cumprir o criterio com clareza.

## Chosen Approach

Usar uma abordagem hibrida.

Para equacoes teoricas e metodologicas, a descricao de unidades deve aparecer
no texto imediatamente proximo da equacao. Para equacoes de validacao numerica,
o proprio contexto da conta deve explicitar a base de calculo, as unidades dos
dados relevantes e a unidade do resultado. Para relacoes adimensionais, o texto
deve declarar explicitamente essa condicao.

Essa abordagem foi escolhida porque atende ao criterio estrito de cobrir as 60
equacoes sem tornar o capitulo de validacao repetitivo demais.

## Equation Matrix

A implementacao deve criar ou atualizar uma matriz de controle com uma linha por
bloco `equation`.

Cada linha deve conter:

- arquivo;
- linha inicial;
- `\label`, quando existir;
- tipo da equacao;
- variaveis principais;
- unidade ou status adimensional de cada variavel relevante;
- evidencia consultada;
- decisao de edicao;
- status final.

Os tipos de equacao sao:

- `teorica/metodologica`;
- `definicao`;
- `correlacao`;
- `balanco`;
- `validacao numerica`;
- `adimensional`;
- `base dependente`, quando a unidade depende da base escolhida no modelo.

## Unit Rules

### Equacoes teoricas e metodologicas

O texto deve informar as unidades das entradas principais e do resultado. Quando
o sistema usa SI coerente, a descricao deve declarar essa base. Quando a
interface converte a saida, o texto deve explicar a unidade matematica e a
unidade apresentada pelo sistema.

Exemplo de regra: `Q` em `m^3/s` e `V` em `m/s` resultam em `D` em `m`; a
interface pode apresentar `D` em `mm`.

### Definicoes e correlacoes

O texto deve separar:

- variaveis dimensionais, com suas unidades;
- razoes e fatores adimensionais;
- exigencias de consistencia, como `epsilon` e `D` na mesma unidade de
  comprimento.

### Balancos

O texto deve indicar a base do balanco, por exemplo molar, massica ou
volumetrica. Quando a equacao for escrita de forma generica, o texto deve dizer
que todas as parcelas devem estar na mesma base e unidade coerente.

### Equacoes adimensionais

O texto deve declarar explicitamente que o resultado ou fator e adimensional.
Isso se aplica, por exemplo, a conversao, numero de Reynolds, fator de atrito,
fracoes, razoes e fatores definidos como quocientes de grandezas equivalentes.

### Validacoes numericas

Cada bloco de validacao deve informar a unidade dos dados que entram na conta e
a unidade do resultado. Quando uma linha intermediaria omitir unidades para
evitar poluicao visual, a frase imediatamente anterior ou posterior deve
amarrar aquela conta a uma base de unidades clara.

## Technical Traceability

Antes de editar equacoes tecnicamente sensiveis, a forma final do texto deve ser
definida contra tres fontes:

1. o LaTeX atual;
2. o codigo implementado;
3. a referencia ou citacao usada no texto.

Se a referencia local nao estiver disponivel, isso deve ser registrado como
limitacao. Se codigo, texto e referencia divergirem, a correcao deve ser
marcada como pendencia tecnica em vez de ser resolvida por suposicao.

## Workflow

1. Capturar `git status --short`.
2. Gerar a lista das 60 equacoes com arquivo, linha e `\label`.
3. Criar a matriz de unidades no documento de auditoria ou em um novo arquivo de
   auditoria complementar.
4. Classificar cada equacao por tipo.
5. Definir a regra de unidade aplicavel a cada tipo.
6. Conferir equacoes tecnicamente sensiveis contra LaTeX, codigo e referencia.
7. Editar os textos ao redor das equacoes.
8. Atualizar a lista de nomenclatura se algum simbolo usado nas descricoes ainda
   nao estiver listado.
9. Compilar `final-paper/TEX/main.pdf`.
10. Recontar os 60 blocos `equation` e marcar cada linha da matriz como coberta,
    parcial ou pendente.

## Acceptance Criteria

- A contagem final ainda identifica 60 blocos `equation`.
- Cada uma das 60 linhas da matriz possui status final.
- Nenhuma equacao fica com status `unreviewed`.
- Cada equacao tem descricao de unidades, base coerente ou declaracao
  adimensional no contexto imediatamente associado.
- O PDF final compila sem erro.
- O resumo final lista eventuais pendencias tecnicas, se existirem.
- O trabalho nao altera codigo de backend, frontend ou calculos.

