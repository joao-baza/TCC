# TCC Board Feedback Normalization Design

## Goal

Planejar a normalizacao final dos apontamentos recentes da banca no texto do TCC, com foco em:

- atualizar a figura de Levenspiel ja corrigida no codigo;
- fortalecer o capitulo de Resultados e Discussoes;
- padronizar terminologia tecnica e acentuacao;
- ajustar linguagem academica na validacao;
- reorganizar a narrativa da Metodologia;
- incluir Abstract em ingles a partir do resumo atual;
- reduzir capturas extensas de codigo/JSON no corpo do texto.

Este desenho nao autoriza alteracoes funcionais no backend ou frontend. O codigo pode ser executado para gerar evidencias, testes e nova captura de tela, mas a intervencao principal e documental.

## Approved Approach

Usar a abordagem intermediaria, escolhida pelo usuario como opcao B.

Essa abordagem corrige os pontos que prejudicam a leitura academica e a credibilidade tecnica, sem transformar a monografia inteira em uma reescrita ampla. O corpo do texto deve manter screenshots de interface e graficos quando eles ajudam a avaliar o produto, mas deve trocar capturas grandes de codigo ou JSON por representacoes mais didaticas.

## Scope

### Levenspiel

O calculo atual ja foi considerado corrigido via codigo. A acao deste ciclo e:

- rodar ou usar a aplicacao atual;
- acessar o grafico de Levenspiel correspondente;
- recapturar a tela atual;
- substituir a imagem usada no PDF, incluindo a Figura 83 citada pela banca;
- conferir no PDF gerado se PFR e CSTR aparecem coerentes com o comportamento esperado para cinetica positiva.

Nao deve haver alteracao funcional no calculo nesta etapa. Se a legenda/subtitulo ainda indicar "sem reciclo" em um caso com `recycling_ratio`, isso deve ser registrado como ajuste textual/visual da captura ou como pendencia separada, conforme o estado real da tela.

### Resultados e Discussoes

O capitulo `final-paper/TEX/chapters/5-resultados.tex` deve deixar de ser apenas uma sintese geral.

Ele deve consolidar evidencias ja existentes na Metodologia, na Validacao e nos testes executados, preferencialmente em uma tabela com os campos:

- modulo implementado;
- tipo de validacao;
- referencia de comparacao, usando "calculos manuais/literatura";
- erro, desvio ou criterio de concordancia;
- evidencia por teste de codigo ou execucao;
- limitacao principal;
- achado didatico.

O texto nao deve afirmar concordancia com "softwares consolidados" se essa comparacao nao tiver sido demonstrada. A formulacao padrao deve ser "valores de referencia da literatura e calculos manuais" ou equivalente.

### Metodologia

A narrativa da Metodologia deve seguir a ordem aprovada:

1. transporte de fluidos;
2. bombas;
3. propriedades;
4. reatores;
5. balanco de massa;
6. software, API, validacao e recursos didaticos.

A implementacao pode optar por reordenar `\input`s ou por manter arquivos fisicos existentes com transicoes fortes, desde que a leitura final do PDF siga essa ordem conceitual. Movimentacoes de arquivo so devem ocorrer se reduzirem confusao; a prioridade e preservar estabilidade do LaTeX.

### Terminologia e Acentuacao

O texto tecnico deve padronizar "densidade" para "massa especifica" quando o conceito for a propriedade fisica representada por `\rho`.

Ocorrencias de "density" ou "densidade" podem permanecer apenas quando forem:

- chaves de biblioteca;
- nomes de campos de API;
- termos em ingles citados como identificadores tecnicos;
- contexto explicitamente justificado.

A lista de simbolos e seus cabecalhos devem ser revisados para corrigir acentos, incluindo "Lista de simbolos", "Descricao", "Localizacao" e descricoes como "Concentracao", "Vazao", "Aceleracao", "Pressao", "succao", "diluicao" e "validacao".

### Abstract

O Abstract comentado em `final-paper/TEX/main.tex` deve ser substituido por uma traducao fiel do resumo atualmente contido no documento.

A traducao deve manter o conteudo ja aprovado no resumo, sem acrescentar promessas tecnicas novas. As keywords devem ser a traducao direta e academica das palavras-chave atuais.

### Figuras de Codigo, JSON e Pseudocodigo

O corpo do texto deve reduzir capturas extensas de codigo/JSON, especialmente nas regioes equivalentes as paginas 36-75 e 100-103 do PDF.

Para a abordagem B, a regra e:

- manter poucas capturas essenciais quando a interface, grafico ou resultado visual for o objeto de avaliacao;
- substituir codigo grande por pseudocodigo em LaTeX;
- substituir JSON repetitivo por tabelas de contrato, entradas/saidas ou campos principais;
- usar Mermaid renderizado como imagem quando houver fluxo, decisao ou arquitetura que fique mais claro visualmente;
- evitar dependencia obrigatoria de Mermaid no build LaTeX. Se a ferramenta de renderizacao nao estiver disponivel, usar tabela ou pseudocodigo.

### Validacao

O capitulo `final-paper/TEX/chapters/4.4-validacao.tex` deve trocar marcas de depuracao ou tokens informais por linguagem academica.

Substituicoes esperadas:

- `[MATCH]` por "Concordante", "Resultado concordante" ou indicacao equivalente;
- `[CONVERGENCIA CONFIRMADA]` por "Convergencia confirmada";
- marcadores similares por "erro relativo", "desvio percentual" ou frase descritiva.

A validacao deve permanecer rastreavel: quando houver teste automatizado ou execucao por codigo, o texto pode mencionar o teste como evidencia, mas sem inserir prints de codigo desnecessarios.

### Limitacoes e Continuidade

O pedido sobre aco inoxidavel/SCH 10S/40S nao deve virar implementacao neste ciclo.

Se o tema aparecer no documento, deve ser registrado apenas como limitacao ou continuidade: inclusao futura de catalogo/norma validada para materiais inoxidaveis e schedules especificos.

## Data and Evidence Flow

1. Buscar no LaTeX os termos, figuras e marcadores citados pela banca.
2. Executar testes ou comandos locais apenas quando eles ajudam a sustentar a tabela de Resultados ou a nova captura.
3. Converter evidencias tecnicas detalhadas em uma forma resumida para Resultados.
4. Atualizar imagens em `final-paper/TEX/media/` somente quando a captura atual for confirmada visualmente.
5. Compilar o PDF.
6. Extrair texto do PDF e executar varreduras para confirmar que os problemas textuais nao permaneceram.
7. Renderizar paginas criticas do PDF para conferir figura, tabela e quebras de linha.

## Error Handling

- Se a aplicacao local nao subir ou a tela de Levenspiel nao estiver acessivel, registrar comando, erro e arquivo de imagem nao atualizado em vez de simular a captura.
- Se o build LaTeX falhar por causa de alteracao textual, corrigir a causa local sem fazer reformatacao ampla.
- Se Mermaid nao puder gerar imagem localmente, substituir por pseudocodigo ou tabela.
- Se uma ocorrencia de "densidade" permanecer por ser chave tecnica, justificar no texto ou na revisao final.
- Se a reorganizacao da Metodologia gerar muitas quebras de referencia, preferir transicoes fortes a uma movimentacao fisica agressiva de arquivos.

## Verification Plan

Verificacoes esperadas apos a implementacao:

- `git status --short` antes e depois, preservando alteracoes preexistentes nao relacionadas;
- busca textual nos `.tex` por `densidade`, `softwares consolidados`, `[MATCH]`, `[CONVERGENCIA CONFIRMADA]`, `Lista de simbolos`, `Descricao` e `Localizacao`;
- build de `final-paper/TEX/main.tex` com o comando LaTeX usado pelo projeto;
- extracao de texto do PDF para repetir as buscas no artefato final;
- revisao visual das paginas de Resultados, Lista de simbolos, Validacao e Levenspiel;
- execucao de testes de codigo selecionados apenas quando forem usados como evidencia na tabela de Resultados.

## Acceptance Criteria

- O PDF final contem Abstract em ingles e keywords correspondentes.
- O capitulo de Resultados apresenta tabela ou quadro de evidencia tecnica, nao apenas uma sintese geral.
- O texto nao usa "softwares consolidados" como comparacao sem demonstracao.
- O texto tecnico padroniza "massa especifica" para a propriedade fisica.
- A lista de simbolos e seus cabecalhos aparecem com acentuacao correta.
- O capitulo de Validacao nao apresenta tokens como `[MATCH]` no texto final.
- A figura de Levenspiel foi recapturada a partir da tela atual e esta coerente com o codigo corrigido.
- Capturas grandes de codigo/JSON foram reduzidas no corpo do texto e substituidas por representacoes didaticas quando apropriado.
- O pedido de inox/SCH 10S/40S aparece, no maximo, como limitacao ou continuidade, sem implementacao funcional.

## Non-Goals

- Corrigir funcionalidade de backend, frontend ou modelos de calculo.
- Adicionar materiais inoxidaveis ou schedules novos ao sistema.
- Reescrever a monografia inteira.
- Mover toda a validacao para Resultados.
- Remover todas as figuras de codigo indiscriminadamente.
- Introduzir dependencia obrigatoria de Mermaid no processo LaTeX.
- Alterar slides neste ciclo, salvo se o usuario ampliar o escopo.
