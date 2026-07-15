# TCC Board Corrections Design

## Goal

Planejar a correcao dos apontamentos da banca de avaliacao do TCC relacionados apenas a:

- slides/apresentacao;
- escrita final do TCC em `final-paper/TEX/`;
- nomenclatura, equacoes, termos tecnicos e figuras do documento.

Este desenho nao autoriza alteracoes funcionais no sistema. O codigo pode ser consultado como evidencia tecnica para corrigir a escrita, mas qualquer inconsistencia funcional encontrada deve virar pendencia separada para outro ciclo.

## Source Inputs

Os apontamentos partem da transcricao em `/home/jpbgr/Downloads/transcricoes/audio.txt` e da lista refinada pelo usuario nesta conversa.

Os alvos locais identificados sao:

- `slides/main.tex`;
- `slides/sections/*.tex`;
- `final-paper/TEX/main.tex`;
- `final-paper/TEX/chapters/*.tex`;
- `final-paper/TEX/media/`.

## Chosen Approach

Usar uma matriz de correcoes com conferencia tecnica antes das edicoes.

Cada item deve ser classificado por tipo:

- `slides`;
- `escrita conceitual`;
- `termos e traducao`;
- `nomenclatura`;
- `equacao ou trecho tecnico`;
- `figura`.

Para os itens matematicos, a correcao so deve ser definida depois de comparar:

1. o trecho LaTeX atual;
2. a funcao Python correspondente;
3. a referencia bibliografica ou citacao usada no texto.

Essa abordagem foi escolhida porque preserva rastreabilidade com a banca e evita trocar uma equacao duvidosa por outra forma tambem nao confirmada.

## Scope

### Slides e Apresentacao

O plano deve revisar todos os arquivos em `slides/sections/*.tex`, nao apenas o slide citado pela banca.

Correcoes previstas:

- substituir usos inadequados de `monografia` por `TCC`, `PCC` ou `trabalho de conclusao de curso`, conforme o contexto;
- corrigir a classificacao do `McCabe-Thiele` no slide de funcionalidades, pois ele e metodo de calculo/construcao grafica, nao propriedade;
- procurar problemas equivalentes de classificacao conceitual em outros itens do slide de cobertura, separando propriedades, metodos, graficos, modulos e operacoes.

### Escrita Conceitual e Didatica

O plano deve revisar `final-paper/TEX/chapters/*.tex` e `final-paper/TEX/main.tex` para tornar a escrita mais clara para leitores de Engenharia Quimica sem conhecimento forte de programacao.

Correcoes previstas:

- tornar a parte de integracao e arquitetura de software mais didatica, sem remover rigor tecnico;
- reforcar a justificativa do projeto aberto: gratuidade, codigo auditavel, banco de propriedades, extensibilidade, verificacao de erros e continuidade academica;
- substituir `densidade` por `massa especifica` quando o conceito fisico for `\rho`, mantendo `densidade` apenas onde o contexto justificar;
- revisar termos mal traduzidos, ambiguos ou perdidos entre ingles e portugues, incluindo `pilha`, `stack`, `motor computacional`, `head`, labels antigos, `curva de reacao` e termos equivalentes encontrados na varredura;
- trocar `head` por `altura manometrica` quando o sentido tecnico for esse;
- revisar `motor computacional` e preferir `backend`, `camada de calculo` ou explicacao equivalente quando a frase ficar mais clara.

### Nomenclatura e Padronizacao

A lista de siglas e simbolos em `final-paper/TEX/main.tex` deve funcionar como indice de consistencia.

Correcoes previstas:

- incluir ou ajustar simbolos que forem usados nas equacoes revisadas;
- padronizar os termos `tubulacao`, `tubo`, `linha` e `corrente` conforme o dominio do trecho;
- padronizar a nomenclatura do coeficiente estequiometrico entre as equacoes citadas pela banca;
- padronizar o fator de diluicao, especialmente se houver conflito entre `\psi`, `\varphi` e outras letras gregas;
- revisar a descricao de `coeficiente de expansao` para contemplar expansao e contracao, quando aplicavel.

### Equacoes e Trechos Tecnicos

Os itens tecnicos devem ser tratados com conferencia antes da edicao.

Correcoes previstas:

- pagina 32: explicitar as unidades de `Q`, `V` e `D` na equacao de diametro calculado e explicar que o sistema converte/retorna em milimetros;
- pagina 35: revisar a razao para determinacao do reagente limitante, usando o simbolo estequiometrico correto e modulo no denominador quando necessario;
- equacoes 4.2 e 4.4: padronizar o coeficiente estequiometrico;
- pagina 38: revisar a equacao de concentracao de saida, o simbolo do fator no denominador e a forma conforme codigo e referencia;
- trocar `coeficiente de expansao` por termo que contemple expansao e contracao quando o texto tratar de variacao volumetrica;
- equacao 4.6: padronizar o simbolo do fator de diluicao e sua descricao;
- equacao 4.11: conferir a inversao apontada pela banca contra a 4.13, codigo e referencia antes de editar;
- pagina 49: esclarecer a razao de reciclo `R`, indicando se a razao e definida em termos de vazao molar, massica, volumetrica ou outra base usada pelo modelo;
- pagina 64: incluir o termo `h_f` na equacao de Bernoulli para altura manometrica, desde que a conferencia confirme a forma correta com os sinais adotados no texto.

Se uma referencia nao estiver acessivel localmente ou se codigo e literatura divergirem, a implementacao deve registrar a pendencia em vez de corrigir por suposicao.

### Figuras

O plano deve revisar figuras citadas pela banca e problemas equivalentes.

Correcoes previstas:

- atualizar a Figura 1 se ela ainda representar interface antiga ou termos em ingles;
- localizar placeholders criados por `\imgouplaceholder`;
- conferir as figuras faltantes a partir da pagina 102 do PDF final;
- verificar se a imagem correta ja existe em `final-paper/TEX/media/`;
- quando for necessario capturar imagem atual da aplicacao, usar `localhost:5173`, navegar ate o modulo correspondente, tirar screenshot legivel e salvar em `final-paper/TEX/media/`;
- substituir uma figura apenas quando houver evidencia clara do arquivo correto e quando a imagem renderizar no PDF final.

## Workflow

1. Capturar estado inicial com `git status --short`.
2. Compilar ou inspecionar os artefatos atuais para mapear paginas reais, figuras faltantes e termos ainda presentes.
3. Criar a matriz de correcoes com status por item.
4. Revisar slides e classificacoes conceituais.
5. Revisar escrita conceitual, termos ambiguos e traducao.
6. Revisar nomenclatura e lista de simbolos.
7. Conferir e corrigir equacoes, uma a uma, contra LaTeX, codigo e referencia.
8. Atualizar figuras faltantes ou obsoletas, usando `localhost:5173` quando necessario.
9. Compilar `slides/` e `final-paper/TEX/`.
10. Extrair texto dos PDFs e repetir varreduras de termos para validar o resultado.

## Acceptance Criteria

### Textual Scan

Buscas devem ser executadas para termos como:

- `monografia`;
- `densidade`;
- `head`;
- `pilha`;
- `stack`;
- `motor computacional`;
- `linha`;
- `corrente`;
- `tubo`;
- `tubulacao`;
- `McCabe-Thiele`;
- `coeficiente de expansao`;
- `fator de diluicao`.

O criterio de aceite nao e zerar todas as ocorrencias. Cada ocorrencia restante deve estar correta ou justificada pelo contexto.

### Artifact Validation

- O deck em `slides/` deve compilar sem erro LaTeX.
- O TCC em `final-paper/TEX/` deve compilar sem erro LaTeX.
- As correcoes devem aparecer no PDF gerado, nao apenas nos fontes.
- Figuras substituidas devem estar legiveis e no modulo correto.

### Technical Traceability

Para cada equacao revisada, o resumo de implementacao deve registrar quais fontes foram comparadas:

- arquivo `.tex` e trecho;
- funcao Python correspondente;
- referencia/citacao usada.

Se alguma equacao nao puder ser confirmada, ela deve ficar como pendencia tecnica explicita.

## Non-Goals

- Nao corrigir funcionamento do backend, frontend ou exemplos.
- Nao adicionar novos modulos ao sistema.
- Nao reestruturar toda a apresentacao.
- Nao trocar o tema Beamer.
- Nao substituir figuras por screenshots sem relacao direta com o texto.
- Nao alterar equacoes apenas por interpretacao da transcricao, sem conferencia tecnica.
