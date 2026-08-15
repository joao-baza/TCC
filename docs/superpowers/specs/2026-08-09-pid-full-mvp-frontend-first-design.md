# MVP completo do editor P&ID — frontend-first

**Data:** 9 de agosto de 2026

**Status:** aprovado para especificação e planejamento

**Base:** `2026-08-08-collaborative-pid-editor-design.md`

## 1. Objetivo

Esta especificação detalha o restante do MVP do editor P&ID. Ela preserva o design mestre e substitui sua decomposição das Entregas 2 a 5 por uma única iniciativa frontend-first.

O produto final permitirá criar, editar, compartilhar, validar e exportar diagramas P&ID colaborativos. O editor usará PostgreSQL como fonte durável, Redis como infraestrutura efêmera, Yjs para convergência e Hocuspocus como gateway WebSocket.

O MVP não executará cálculos. UUIDs, portas, propriedades e conexões manterão os contratos necessários para integrar cálculos no futuro.

## 2. Decisões aprovadas

| Tema | Decisão |
| --- | --- |
| Abordagem | Frontend completo antes da integração real |
| Persistência final | PostgreSQL desde o primeiro MVP entregue |
| Colaboração final | Completa, com Yjs, Hocuspocus, presença e cursores |
| Catálogo | Todos os ativos elegíveis do Draw.io e Wikimedia Commons |
| Padrões | ISA, ISO e Livre |
| Layout | Estúdio focado |
| Linguagem visual | Técnico claro; dark mode alternativo |
| Desktop e tablet | Edição completa |
| Celular | Leitura, navegação, validações e exportação |
| Exportação | SVG e PNG |
| Cálculos | Fora do MVP |

## 3. Relação com o design mestre

O design mestre continua normativo para segurança, autorização, modelo de dados, infraestrutura, limites de desempenho, retenção e evolução para cálculos. Esta especificação altera quatro decisões de entrega:

1. O frontend será concluído contra contratos e adaptadores locais antes da integração real.
2. O MVP unificará as antigas Entregas 2, 3, 4 e 5.
3. O catálogo incluirá o padrão Livre.
4. O escopo de ingestão abrangerá todos os ativos elegíveis das fontes aprovadas, não apenas os símbolos reconciliados com ISA ou ISO.

Os adaptadores locais servirão ao desenvolvimento e aos testes. Nenhuma versão será considerada entregue enquanto depender deles em produção.

## 4. Rotas e fluxo de entrada

### 4.1 Criação

A rota `/pid` exibirá um formulário com:

- título do diagrama;
- padrão ISA, ISO ou Livre;
- nome do participante.

O FastAPI criará o UUID e emitirá links de leitura e edição. A interface destacará o link de edição e exigirá que o usuário confirme sua cópia. Sem contas, o sistema não oferecerá recuperação por e-mail nem lista pessoal de documentos.

### 4.2 Documento

A rota `/pid/:diagramId` abrirá o editor. O token permanecerá no fragmento `#access=...`, será mantido somente na memória da aba e será trocado por uma sessão HTTP e um ticket WebSocket curto.

Links de leitura abrirão o mesmo editor em modo somente leitura. Links de edição permitirão alterar o documento, compartilhar, regenerar tokens, excluir e restaurar.

## 5. Arquitetura do frontend

O frontend manterá fronteiras explícitas:

### 5.1 `pid-domain`

Define o documento canônico, comandos, invariantes, serialização, compatibilidade de portas, tags, validações e projeção. O módulo não importará React, React Flow, Yjs nem APIs de navegador.

### 5.2 `pid-canvas`

Adapta nós e arestas canônicos para React Flow. Controla viewport, seleção, arraste, zoom, portas e conexões. Tipos internos do React Flow não entrarão no documento persistido.

### 5.3 `pid-catalog`

Carrega manifestos, indexa nomes e aliases, organiza categorias, filtra padrões, renderiza previews e virtualiza listas extensas.

### 5.4 `pid-editor`

Compõe shell, toolbar, catálogo, canvas, inspetor, validações, presença, atalhos, histórico e feedback de salvamento.

### 5.5 `pid-export`

Renderiza SVG a partir do modelo canônico e dos ativos sanitizados. Gera PNG pela rasterização do SVG. Não captura a interface.

### 5.6 `pid-collaboration`

Conecta o modelo ao Yjs. Controla `Y.Doc`, `Y.UndoManager`, awareness, reconexão, tickets e permissões.

### 5.7 `pid-api`

Define contratos para criação, metadados, sessões, compartilhamento, exclusão, restauração, snapshots e catálogos. Um adaptador local implementará esses contratos durante o desenvolvimento. O adaptador real substituirá o local sem alterar componentes.

## 6. Interface

### 6.1 Estúdio focado

O editor ocupará a área útil do navegador. A navegação geral do DCOU ficará disponível por uma ação de retorno, sem manter a barra lateral atual como uma quarta coluna.

A composição terá:

- barra superior com retorno, título, padrão, undo, redo, ferramentas, sincronização, participantes, compartilhamento e exportação;
- catálogo esquerdo recolhível;
- canvas central;
- inspetor direito contextual e recolhível;
- barra inferior com coordenadas, zoom, contagem de elementos e resumo das validações.

### 6.2 Catálogo

O catálogo oferecerá busca em português e inglês, categorias recolhíveis, filtros de fonte e previews. Arrastar ou acionar a alternativa de teclado inserirá o símbolo no canvas.

### 6.3 Canvas

O canvas oferecerá grade, pan, zoom, enquadramento, minimapa, seleção simples e múltipla, alinhamento, conexão por portas, rotação, agrupamento, cópia, colagem e duplicação.

### 6.4 Inspetor

O inspetor mostrará campos adequados ao documento, nó, porta, aresta, grupo ou anotação selecionada. Erros aparecerão junto ao campo e em uma região `aria-live`.

### 6.5 Responsividade

Viewports com pelo menos 768 pixels de largura permitirão edição. Viewports menores oferecerão leitura, pan, zoom, participantes, validações e exportação. A interface explicará por que a edição exige uma tela maior.

## 7. Sistema visual e acessibilidade

O editor usará Geist, Lucide e os tokens azuis existentes do DCOU. O canvas claro preservará a leitura de símbolos normativos e a correspondência com exportações. O dark mode alterará a interface, mas manterá as cores canônicas exportadas.

Controles terão área interativa mínima de 44 por 44 pixels. O teclado acessará todas as operações essenciais. Foco visível, rótulos acessíveis e mensagens textuais acompanharão cor e ícones. Atalhos terão alternativas na interface.

Microinterações durarão entre 150 e 300 milissegundos e comunicarão causa e efeito. O editor respeitará `prefers-reduced-motion`. Painéis fixos reservarão espaço e não cobrirão o canvas.

## 8. Modelo canônico

O documento terá mapas de alto nível para metadados, nós, portas, arestas, anotações e grupos. Todos os elementos usarão UUIDs estáveis.

Nós guardarão símbolo, versão do catálogo, posição, tamanho, rotação, tag, rótulo e propriedades. Portas guardarão nó, template, direção, classe de conexão e capacidade. Arestas guardarão origem, destino, tipo, rota, tag, rótulo e propriedades.

O documento persistirá geometria e semântica. Seleções, menus, painéis abertos e outros estados transitórios ficarão fora do modelo.

## 9. Padrões e catálogos

### 9.1 ISA

Diagramas ISA aceitarão somente ativos reconciliados e aprovados para o inventário ISA.

### 9.2 ISO

Diagramas ISO aceitarão somente ativos reconciliados e aprovados para o inventário ISO.

### 9.3 Livre

Diagramas Livres aceitarão todos os ativos elegíveis do Draw.io e das categorias P&ID e Chemical engineering symbols do Wikimedia Commons. Um símbolo poderá entrar no padrão Livre sem associação normativa segura, mas sua origem e natureza complementar permanecerão visíveis.

O inventário do Draw.io abrangerá `src/main/webapp/stencils/pid` e `src/main/webapp/shapes/pid2` no commit fixado. O inventário do Wikimedia abrangerá os arquivos das duas categorias e de suas subcategorias diretamente relacionadas, conforme as revisões fixadas pelo pipeline. Arquivos repetidos serão deduplicados por checksum sem apagar seus registros de origem.

### 9.4 Elegibilidade

O pipeline baixará o original, fixará revisão ou commit, calculará checksum, registrará autoria e licença, sanitizará o arquivo e produzirá o ativo canônico. Símbolos sem licença compatível, com origem insuficiente ou conteúdo inseguro entrarão no relatório de exceções e não serão distribuídos.

O padrão Livre amplia o catálogo; ele não elimina os gates de licença, segurança e proveniência.

## 10. Edição e validação

O editor permitirá inserir, mover, girar, conectar, agrupar, copiar, colar, duplicar e excluir elementos. O histórico local preservará relações internas e não desfará mudanças remotas.

O domínio bloqueará:

- mistura de padrões em documentos ISA ou ISO;
- classes de conexão incompatíveis;
- capacidade excedida;
- IDs duplicados;
- referências a nós ou portas inexistentes;
- documentos fora do schema.

O domínio alertará sobre tags ausentes, duplicadas ou inválidas; portas obrigatórias desconectadas; fluxo inconsistente; instrumentos incompletos; e propriedades obrigatórias ausentes. Alertas permitirão edição e exportação.

## 11. Colaboração e persistência

Cada diagrama terá um `Y.Doc`. Comandos do domínio alterarão esse documento; React Flow apenas projetará e manipulará a interface.

Hocuspocus distribuirá mudanças e awareness. Redis coordenará gateways, tickets, revogação e presença. PostgreSQL armazenará snapshots Yjs e projeções JSON validadas.

`Y.UndoManager` rastreará somente operações do participante atual. Awareness enviará nome, cor, cursor, viewport, seleção e heartbeat sem persistir esses dados.

O autosave será contínuo. A interface mostrará `Sincronizado`, `Salvando`, `Reconectando`, `Não salvo` ou `Somente leitura`.

## 12. Compartilhamento e autorização

O FastAPI emitirá tokens longos de leitura e edição e persistirá somente seus hashes. O cliente trocará o token por um ticket WebSocket de uso único com TTL de 60 segundos. O gateway rejeitará mensagens anteriores à autenticação.

O escopo de leitura permitirá abrir, acompanhar, publicar presença e exportar. O escopo de edição acrescentará alterações, compartilhamento, revogação, exclusão e restauração.

Revogar um token atualizará PostgreSQL, publicará um evento no Redis e encerrará as sessões correspondentes. Excluir um diagrama aplicará soft delete por 30 dias.

## 13. Exportação

O exportador produzirá SVG a partir do documento canônico e dos ativos sanitizados. PNG será derivado desse SVG. Ambos enquadrarão todos os elementos, preservarão textos e linhas e excluirão cursores, seleções, minimapa e alertas.

O usuário escolherá fundo branco ou transparente. O título formará o nome do arquivo. A exportação aguardará sincronização; uma falha na rasterização PNG manterá a opção SVG disponível.

## 14. Falhas e recuperação

O cliente tentará reconectar com atraso exponencial e manterá mudanças em memória por até 30 segundos. Após esse prazo, bloqueará novas edições até recuperar a conexão.

Uma falha do Redis converterá sessões de edição em leitura. Uma falha do PostgreSQL impedirá a confirmação de salvamento e bloqueará novas mudanças quando a janela de memória terminar. O sistema preservará o último snapshot estruturalmente válido.

Mensagens de erro explicarão a causa e a ação de recuperação. Falhas de rede oferecerão nova tentativa sem descartar o documento em memória.

## 15. Sequência de implementação

A iniciativa seguirá seis estágios:

1. contratos do domínio, fixtures definitivas e adaptadores locais;
2. editor completo com criação, catálogo, canvas, inspetor, histórico, validação e exportação;
3. ingestão e auditoria dos ativos elegíveis;
4. APIs reais de diagramas, sessões, compartilhamento e snapshots;
5. Yjs, Hocuspocus, Redis, presença, revogação e reconexão;
6. remoção dos adaptadores locais da aplicação e execução dos testes de aceitação.

O frontend completo aparecerá antes da integração. O produto permanecerá em desenvolvimento até concluir o sexto estágio.

## 16. Testes

Testes unitários cobrirão comandos, serialização, portas, compatibilidade, tags, validações, projeção e nomes de exportação. Testes de componentes cobrirão teclado, arraste, seleção, conexão, propriedades, histórico e estados de erro.

Testes de contrato executarão as mesmas expectativas contra adaptadores locais e reais. Playwright abrirá sessões independentes para provar criação, persistência após recarga, edição simultânea, leitura sem escrita, revogação, reconexão e exportação.

O pipeline do catálogo verificará licença, proveniência, checksum, sanitização, duplicidade, cobertura e regressão visual.

## 17. Desempenho

O documento de referência terá 500 elementos e 1.000 conexões. Pan, zoom e seleção permanecerão responsivos. O catálogo usará virtualização, nós usarão memoização e mudanças colaborativas serão agrupadas.

O frontend carregará o editor por rota para não aumentar o bundle inicial dos módulos de cálculo. Testes usarão 375, 768, 1024 e 1440 pixels, modo escuro e movimento reduzido.

## 18. Critérios de aceitação

O MVP estará concluído quando:

1. um visitante criar um diagrama ISA, ISO ou Livre;
2. o documento persistir no PostgreSQL após recarga e reinício do gateway;
3. todos os ativos elegíveis das fontes aprovadas estiverem publicados ou justificados no relatório de exceções;
4. duas sessões de edição convergirem em tempo real;
5. uma sessão de leitura acompanhar mudanças sem conseguir escrever;
6. revogação encerrar sessões existentes;
7. validações bloquearem estruturas inválidas e sinalizarem alertas sem impedir o desenho;
8. SVG e PNG representarem todo o documento;
9. o celular oferecer leitura sem expor controles de edição;
10. os limites de desempenho forem atendidos;
11. testes unitários, de contrato, integração, E2E, segurança e falha passarem;
12. nenhum segredo nem ativo rejeitado entrar nos artefatos;
13. nenhum fluxo executar cálculos ou misturar padrões ISA e ISO.

## 19. Fora do escopo

Continuam fora do MVP:

- cálculos e simulação;
- contas de usuário;
- edição offline persistente;
- importação de diagramas `.drawio`;
- exportação PDF;
- editor de símbolos;
- documentos com várias páginas;
- templates personalizados;
- histórico navegável de versões;
- aplicativo desktop.
