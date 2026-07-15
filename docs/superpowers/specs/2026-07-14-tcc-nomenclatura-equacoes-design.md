# TCC Equation Nomenclature Design

## Goal

Planejar a correcao da lista inicial do TCC para separar siglas/acronimos de simbolos matematicos e garantir que todo simbolo ou variavel usado nas equacoes apareca na nomenclatura.

A correcao deve cobrir tanto as equacoes teoricas/metodologicas quanto as equacoes de validacao e exemplos numericos.

## Current State

A lista atual esta em `final-paper/TEX/main.tex`, dentro do ambiente `siglas`.

Ela mistura:

- siglas e acronimos de software ou engenharia, como `API`, `HTML`, `CSTR`, `PFR` e `NPSH`;
- simbolos matematicos, como `$Q$`, `$D$`, `$Re$`, `$\rho$`, `$\mu$`, `$\tau$`, `$\varepsilon$` e `$\psi$`.

As equacoes estao concentradas principalmente em:

- `final-paper/TEX/chapters/4.2-engenharia-part1.tex`;
- `final-paper/TEX/chapters/4.2-engenharia-part2.tex`;
- `final-paper/TEX/chapters/4.4-validacao.tex`.

A auditoria inicial mostrou que a lista atual nao cobre todos os simbolos usados nas equacoes e que ha ambiguidades, como `$P$` usado como pressao em algumas equacoes e como perimetro molhado na equacao de diametro hidraulico.

## Chosen Approach

Separar formalmente a lista de siglas/acronimos da lista de simbolos/nomenclatura.

Manter o ambiente de siglas para termos como `API`, `ASGI`, `BEP`, `CSTR`, `PFR`, `NPSH`, `REST`, `UI` e `UX`.

Criar uma nova lista de simbolos/nomenclatura logo apos a lista de siglas. Cada entrada deve conter:

- simbolo;
- descricao;
- unidade ou indicacao de que e adimensional;
- localizacao no TCC.

A localizacao deve usar referencias de equacoes sempre que houver `\label{eq:...}`. Para equacoes de validacao que ainda nao possuem label, a implementacao deve adicionar labels quando isso deixar a localizacao mais clara e nao alterar o conteudo matematico.

## Alternatives Considered

### Lista unica ampliada

Adicionar todos os simbolos faltantes ao ambiente `siglas`.

Essa alternativa e simples, mas mantem a mistura entre siglas textuais e variaveis matematicas. Ela tambem dificulta a leitura da banca, porque `API` e `\rho` aparecem no mesmo indice conceitual.

### Tabela manual de simbolos

Criar uma tabela direta com simbolo, descricao, unidade e localizacao.

Essa alternativa da controle total sobre o resultado visual, mas tende a gerar manutencao manual e repeticao de formatacao.

### Macro simples para simbolos

Criar ou usar uma macro local simples para padronizar as entradas da nova lista.

Essa e a abordagem recomendada. Ela organiza a nomenclatura sem introduzir pacote LaTeX novo nem mudar o fluxo de build. Tambem facilita revisar todas as entradas pelo padrao da macro.

### Pacote dedicado de nomenclatura

Usar pacotes como `nomencl` ou `glossaries`.

Essa alternativa e formal, mas aumenta a complexidade de build perto da entrega e pode criar dependencias auxiliares desnecessarias.

## Scope

A lista de simbolos deve cobrir:

- simbolos das equacoes teoricas e metodologicas;
- simbolos das equacoes de validacao e exemplos numericos;
- grandezas com subscritos quando o subscrito muda o significado, como `F_{A0}`, `F_R`, `X_{in}`, `X_{out}`, `P_{atm}` e `V_{manual}`;
- simbolos-base quando o subscrito e apenas indice generico, como `C_i`, `Q_i` e `\nu_i`;
- grandezas adimensionais, marcadas explicitamente como `adimensional`;
- variaveis com significado ambiguo, separadas em entradas distintas quando necessario.

Ficam fora deste plano:

- alterar a forma matematica das equacoes;
- revisar tecnicamente os calculos;
- reorganizar capitulos;
- corrigir codigo do sistema;
- alterar figuras ou slides.

Inconsistencias tecnicas encontradas durante a catalogacao devem ser registradas como pendencias para outro ciclo, sem edicao especulativa da equacao.

## Data Model

Cada entrada da nova lista de simbolos deve ter os seguintes campos conceituais:

- `symbol`: forma LaTeX do simbolo;
- `description`: descricao curta e precisa em portugues;
- `unit`: unidade SI ou unidade usada pelo texto/codigo, ou `adimensional`;
- `locations`: referencias onde o simbolo aparece.

Exemplo conceitual:

```text
$Q$ | Vazao volumetrica | m^3/s | Eq. \ref{eq:diametro_calc}, Eq. \ref{eq:hazen}
```

Quando a unidade depender da base adotada, a entrada deve deixar isso explicito. Por exemplo, vazoes `F` podem ser molares, massicas ou volumetricas conforme o trecho. Nesses casos, a descricao deve indicar a base, ou a nomenclatura deve separar simbolos diferentes para evitar ambiguidade.

## Implementation Workflow

1. Extrair todos os ambientes `equation` dos capitulos finais do TCC.
2. Montar uma tabela de controle com equacao, label, simbolos, unidade esperada e observacoes.
3. Separar a lista atual de `siglas`, deixando nela apenas siglas/acronimos.
4. Criar a nova lista de simbolos/nomenclatura apos a lista de siglas.
5. Adicionar labels a equacoes de validacao sem label quando a localizacao por referencia for necessaria.
6. Preencher a nomenclatura com todos os simbolos identificados.
7. Conferir que todo simbolo extraido das equacoes possui entrada na lista.
8. Compilar o PDF com `latexmk`.
9. Verificar se nao ha referencias quebradas, especialmente `??` nas localizacoes.

## Acceptance Criteria

- Siglas e simbolos ficam em listas separadas.
- Todo simbolo ou variavel usado em ambiente `equation` aparece na lista de simbolos/nomenclatura.
- Simbolos usados apenas em equacoes de validacao e exemplos tambem aparecem na lista.
- Cada entrada possui simbolo, descricao, unidade ou `adimensional`, e localizacao.
- Ambiguidades como `$P$` para pressao e `$P$` para perimetro molhado sao resolvidas por descricao/localizacao ou por simbolo mais especifico.
- O PDF final compila sem erro LaTeX.
- As novas referencias de localizacao nao aparecem como `??` no PDF.

## Verification

A implementacao deve incluir uma checagem textual ou script local simples para comparar:

- simbolos extraidos dos ambientes `equation`;
- simbolos cadastrados na nova lista de nomenclatura.

A verificacao final deve registrar:

- comando usado para compilar o PDF;
- resultado do build;
- resultado da busca por referencias quebradas;
- simbolos que exigiram julgamento manual, se houver.

## Risks

- A extracao automatica de simbolos pode capturar falsos positivos em equacoes textuais, como `Entradas` e `Saidas`.
- Alguns simbolos possuem significado diferente conforme o contexto, como `P`, `F`, `V` e `f`.
- Entradas demais podem deixar a lista longa. A solucao preferida e agrupar indices genericos quando o significado nao muda, mas separar subscritos quando eles alteram a grandeza.
- Equacoes de validacao sem label podem exigir pequenas edicoes estruturais para permitir localizacao por referencia.

## Non-Goals

- Nao corrigir equacoes tecnicamente nesta etapa.
- Nao alterar a ordem do material.
- Nao revisar figuras.
- Nao mexer no backend ou frontend.
- Nao introduzir pacote LaTeX novo sem necessidade.
