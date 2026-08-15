# Editor P&ID colaborativo — design aprovado

**Data:** 8 de agosto de 2026

**Status:** aprovado para planejamento

**Tipo:** design mestre; a implementação será dividida em cinco entregas

## 1. Resumo

O DCOU ganhará um editor web colaborativo de diagramas de tubulação e instrumentação (P&ID). O editor permitirá compor fluxogramas com catálogos licenciados ISA e ISO, conectar equipamentos por tubulações e sinais, editar tags e propriedades, compartilhar links de leitura ou edição e exportar PNG ou SVG.

O MVP não executará cálculos. Seu modelo, porém, atribuirá identidade e metadados estáveis a equipamentos, portas, instrumentos e linhas. Adaptadores futuros poderão associar esses elementos aos módulos de bombas, escoamento, reatores e balanço sem substituir o editor.

A solução usará React Flow no frontend, Yjs para convergência colaborativa, Hocuspocus como gateway WebSocket, FastAPI para metadados e autorização, PostgreSQL como fonte durável e Redis como barramento efêmero. O projeto rodará apenas na versão web.

## 2. Avaliação de complexidade

O recurso tem complexidade muito alta. O canvas representa uma parcela pequena do esforço. Os principais custos estão no catálogo duplo, nas regras P&ID, na colaboração segura, na exportação vetorial e na operação de PostgreSQL e Redis.

Para uma pessoa experiente, a estimativa é:

- **20 a 28 semanas** quando os símbolos licenciados já estiverem vetorizados e organizados;
- **30 a 44 semanas** quando os símbolos exigirem normalização ou redesenho manual.

Essas faixas incluem implementação, testes, documentação e implantação. Elas não incluem integração com cálculos.

O draw.io e o Wikimedia Commons tendem a reduzir o risco de redesenho manual e aproximar o projeto da faixa de 20 a 28 semanas. Essa redução só poderá ser confirmada depois de reconciliar os ativos encontrados com o inventário normativo e validar licença, qualidade vetorial e cobertura de portas de cada símbolo.

## 3. Contexto atual

O frontend usa React 19, TypeScript, Vite e React Router. O projeto já contém componentes SVG de visualização, mas nenhum motor de edição gráfica. O backend usa FastAPI e não mantém estado persistente. A implantação atual separa frontend e API no Docker Swarm.

A nova funcionalidade introduzirá:

- um motor de edição de grafos;
- um modelo P&ID independente do renderer;
- colaboração por WebSocket;
- PostgreSQL e migrations;
- Redis para coordenação em tempo real;
- autorização por links de capacidade;
- catálogos ISA e ISO versionados;
- exportação PNG e SVG.

## 4. Objetivos

O MVP deverá:

1. criar um fluxograma com UUID;
2. exigir a escolha de ISA ou ISO na criação;
3. oferecer um catálogo praticamente exaustivo do padrão escolhido;
4. permitir inserir, mover, girar, agrupar, copiar e excluir elementos;
5. permitir conectar portas por tubulações, linhas de sinal e conexões mecânicas;
6. permitir editar tags, descrições e propriedades livres;
7. mostrar alertas estruturais e de notação;
8. sincronizar até dez participantes em tempo real;
9. gerar links revogáveis de leitura e edição;
10. exportar o fluxograma atual como PNG ou SVG;
11. restaurar o documento após reinícios dos gateways;
12. manter IDs e metadados adequados a integrações futuras com cálculos.

## 5. Fora do escopo

O MVP não incluirá:

- cálculos, simulação ou propagação de resultados;
- edição offline persistente;
- contas de usuário;
- aplicativo desktop;
- importação de arquivos draw.io;
- exportação PDF;
- arquivo editável para download e reimportação;
- várias páginas ou camadas configuráveis;
- templates personalizados;
- editor de símbolos;
- histórico navegável de versões;
- seleção dinâmica entre ISA e ISO dentro do mesmo fluxograma.

## 6. Decisões centrais

| Tema | Decisão |
| --- | --- |
| Escopo | Editor P&ID web, sem cálculos no MVP |
| Canvas | React Flow com nós e arestas personalizados |
| Colaboração | Yjs e Hocuspocus |
| Persistência | PostgreSQL |
| Coordenação | Redis |
| Identidade | Nome informado ao entrar; sem conta |
| Compartilhamento | Links separados de leitura e edição |
| Padrões | ISA ou ISO por fluxograma |
| Catálogo | Inventário normativo completo, com ativos versionados e proveniência por arquivo |
| Exportação | PNG e SVG |
| Distribuição | Somente web |
| Implantação | PostgreSQL e Redis auto-hospedados no Swarm |
| Configuração | Segredos lidos de `.env`; `.env` fora do Git |
| Backup | Sem backup externo obrigatório |
| Exclusão | Soft delete por 30 dias |

## 7. Arquitetura

### 7.1 Frontend

O frontend adicionará uma rota própria, `/pid`, e a rota de documento `/pid/:diagramId`. React Flow controlará viewport, seleção, arraste, zoom, portas e conexões. Componentes próprios renderizarão símbolos, linhas, instrumentos, anotações e indicadores de validação.

O frontend manterá um `Y.Doc` por fluxograma. Adaptadores converterão o documento P&ID em nós e arestas do React Flow. Nenhuma regra de domínio dependerá de tipos internos do React Flow. Essa fronteira permitirá trocar o renderer ou conectar cálculos sem migrar o documento.

O frontend também conterá:

- catálogo pesquisável;
- inspetor de propriedades;
- toolbar de edição;
- lista de validações;
- presença de participantes;
- estado de sincronização;
- exportador PNG/SVG;
- undo/redo por participante.

### 7.2 FastAPI

O FastAPI será responsável por:

- criar fluxogramas e UUIDs;
- emitir, trocar, revogar e regenerar tokens;
- servir metadados e versões de catálogo;
- administrar soft delete e restauração;
- validar a projeção persistida do documento;
- emitir tickets curtos para WebSocket;
- expor health checks.

O FastAPI não distribuirá mudanças em tempo real. Ele administrará metadados e permissões.

### 7.3 Gateway colaborativo

Hocuspocus manterá as salas Yjs. Cada UUID corresponderá a uma sala. O gateway:

- autenticará cada conexão;
- aplicará o escopo `view` ou `edit`;
- propagará mudanças e awareness;
- sincronizará gateways pelo Redis;
- carregará e consolidará documentos no PostgreSQL;
- rejeitará mensagens excessivas ou inválidas;
- encerrará sessões revogadas.

O gateway não conhecerá cálculos nem regras específicas de engenharia. Ele manipulará documentos colaborativos e autorização de transporte.

### 7.4 PostgreSQL

PostgreSQL será a única fonte durável. Ele armazenará metadados, tokens com hash, snapshots Yjs, projeções JSON validadas, versões de catálogo e datas de exclusão.

FastAPI e Hocuspocus usarão tabelas distintas e transações curtas. Migrations versionadas criarão e alterarão o schema.

### 7.5 Redis

Redis armazenará apenas dados efêmeros:

- Pub/Sub entre gateways;
- awareness e presença com TTL;
- tickets WebSocket curtos e de uso único;
- eventos de revogação;
- rate limiting.

Redis nunca guardará a única cópia de um documento. Após reiniciar, os clientes obterão novos tickets e reconstruirão a presença.

## 8. Interface

O editor ocupará a área principal do DCOU.

### 8.1 Barra superior

A barra superior mostrará:

- título do fluxograma;
- padrão ativo;
- desfazer e refazer;
- ferramentas de seleção, tubulação e texto;
- estado de salvamento;
- participantes;
- compartilhamento;
- exportação.

### 8.2 Catálogo esquerdo

O catálogo permitirá buscar nomes e aliases em português ou inglês. Categorias recolhíveis organizarão equipamentos, vasos, bombas, compressores, trocadores, válvulas, instrumentos, atuadores, tubulações, conexões, sinais, utilidades e anotações.

O usuário arrastará um símbolo para o canvas. O padrão escolhido na criação permanecerá imutável. Para trocar de padrão, o usuário criará outro fluxograma. Uma migração explícita poderá ser adicionada no futuro.

### 8.3 Canvas central

O canvas oferecerá:

- grade, pan, zoom e enquadramento;
- minimapa;
- arraste com alinhamento;
- seleção simples e múltipla;
- conexão por portas;
- rotação;
- agrupamento;
- copiar, colar e duplicar;
- atalhos de teclado;
- destaque de seleção remota;
- destaque de validações.

### 8.4 Inspetor direito

O inspetor editará tag, descrição, rotação, portas, propriedades do símbolo e propriedades livres. Campos específicos virão do manifesto do catálogo.

## 9. Modelo P&ID

### 9.1 Documento colaborativo

Cada `Y.Doc` terá mapas de alto nível:

```text
document
nodes
ports
edges
annotations
groups
```

`document` armazenará título, padrão, versão do catálogo, versão do schema, unidades e viewport. `nodes`, `ports` e `edges` usarão UUIDs estáveis. O modelo não armazenará componentes React.

### 9.2 Nós

Cada nó conterá:

```text
id
symbolKey
catalogVersion
position
size
rotation
tag
label
properties
```

`symbolKey` identificará uma definição estável no catálogo. `properties` aceitará campos declarados pelo símbolo e um bloco de propriedades livres.

### 9.3 Portas

Cada porta conterá:

```text
id
nodeId
templateKey
direction
connectionClass
capacity
```

`direction` indicará entrada, saída ou bidirecional. `connectionClass` distinguirá processo, sinal, conexão mecânica e utilidade. `capacity` limitará a quantidade de conexões quando a definição exigir.

### 9.4 Arestas

Cada aresta conterá:

```text
id
sourceNodeId
sourcePortId
targetNodeId
targetPortId
lineType
route
tag
label
properties
```

`route` armazenará pontos de controle independentes do renderer. `lineType` definirá tubulação, sinal pneumático, sinal elétrico, conexão mecânica ou outra opção permitida pelo catálogo.

### 9.5 Presença

Awareness manterá nome, cor, cursor, viewport, seleção e instante do último heartbeat. Esses dados expirarão e não serão persistidos no PostgreSQL.

## 10. Schema PostgreSQL

### 10.1 `pid_diagrams`

| Campo | Tipo | Regra |
| --- | --- | --- |
| `id` | UUID | chave primária |
| `title` | texto | obrigatório |
| `standard` | enum | `isa` ou `iso` |
| `catalog_version` | texto | obrigatório |
| `schema_version` | inteiro | obrigatório |
| `created_at` | timestamptz | obrigatório |
| `updated_at` | timestamptz | obrigatório |
| `deleted_at` | timestamptz | nulo até soft delete |

### 10.2 `pid_access_tokens`

| Campo | Tipo | Regra |
| --- | --- | --- |
| `id` | UUID | chave primária |
| `diagram_id` | UUID | chave estrangeira |
| `scope` | enum | `view` ou `edit` |
| `token_hash` | texto | único; token puro nunca persistido |
| `created_at` | timestamptz | obrigatório |
| `revoked_at` | timestamptz | nulo até revogação |

### 10.3 `pid_document_snapshots`

| Campo | Tipo | Regra |
| --- | --- | --- |
| `diagram_id` | UUID | chave estrangeira |
| `revision` | bigint | crescente por documento |
| `yjs_state` | bytea | estado consolidado |
| `document_projection` | jsonb | projeção independente do CRDT |
| `schema_version` | inteiro | obrigatório |
| `is_valid` | booleano | resultado estrutural |
| `created_at` | timestamptz | obrigatório |

O sistema manterá o snapshot atual e o snapshot válido anterior. Essa retenção técnica não será exposta como histórico ao usuário.

### 10.4 `pid_catalog_versions`

| Campo | Tipo | Regra |
| --- | --- | --- |
| `standard` | enum | `isa` ou `iso` |
| `version` | texto | parte da chave |
| `manifest_hash` | texto | checksum do manifesto |
| `activated_at` | timestamptz | obrigatório |

Os SVGs e manifestos ficarão nos artefatos da aplicação. A tabela registrará quais versões podem abrir documentos.

## 11. Catálogos ISA e ISO e origem dos ativos

### 11.1 Pré-requisito legal

O projeto possui autorização explícita para reproduzir e distribuir os símbolos ISA e ISO e autorização expressa para baixar, converter, modificar e redistribuir os stencils P&ID do draw.io. A importação exigirá que o repositório registre a origem, o escopo da autorização e a versão normativa. A evidência da autorização será referenciada no inventário sem publicar material privado ou desnecessário.

Ativos do Wikimedia Commons somente entrarão no catálogo depois da verificação da página individual do arquivo. Pertencer a uma categoria do Commons não determina, por si só, a licença do arquivo. A licença, autoria, atribuição e permissão de obras derivadas serão avaliadas asset por asset.

### 11.2 Hierarquia de fontes

As fontes terão responsabilidades diferentes:

1. o inventário autorizado ISA/ISO será a referência normativa para significado, categoria, portas e conexões;
2. os stencils P&ID do draw.io serão a principal base vetorial para acelerar a produção do catálogo;
3. o Wikimedia Commons será uma fonte complementar para lacunas, alternativas gráficas e símbolos de engenharia química.

Quando a aparência ou os metadados de uma fonte gráfica divergirem da referência normativa, prevalecerá a referência ISA/ISO autorizada. Nenhum SVG ou PNG externo será tratado como autoridade semântica apenas por citar um padrão no nome ou na descrição.

### 11.3 Pesquisa inicial de fontes

A pesquisa interativa realizada em 8 de agosto de 2026 identificou:

- no draw.io, os stencils `separators.xml`, `shaping_machines.xml`, `valves.xml` e `vessels.xml` em `src/main/webapp/stencils/pid`, além das formas programáticas `mxPidInstruments.js`, `mxPidMisc.js` e `mxPidValves.js` em `src/main/webapp/shapes/pid2`;
- na categoria [P&ID symbols](https://commons.wikimedia.org/wiki/Category:P%26ID_symbols), revisão `1007862109`, 26 subcategorias e 82 arquivos diretamente na raiz;
- na categoria [Chemical engineering symbols](https://commons.wikimedia.org/wiki/Category:Chemical_engineering_symbols), revisão `1254967890`, 12 arquivos: oito SVGs e quatro PNGs.

Os 12 arquivos de engenharia química observados foram `Batch reactor STR.svg`, `Chem-eng icon.svg`, `Chemostat shematic.svg`, `Continuous bach reactor CSTR.svg`, `Fed batch reactor FSTR.svg`, `ReactorBatch.PNG`, `ReactorBatch.svg`, `ReactorCSTR.PNG`, `ReactorCSTR.svg`, `ReactorFedBatch.PNG`, `ReactorPlugFlow.PNG` e `ReactorPlugFlow.svg`.

A amostragem confirmou licenças distintas que precisam permanecer registradas: `Batch reactor STR.svg`, `Autoclave.svg` e `Cone type (ISO 10628-2).svg` estavam declarados como domínio público; `ReactorBatch.svg`, derivado de `ReactorBatch.PNG`, estava sob CC0 1.0. Esses resultados orientam a triagem, mas não autorizam automaticamente os demais arquivos das categorias.

### 11.4 Manifesto

Cada símbolo terá:

```text
key
standard
catalogVersion
name
aliases
category
svgPath
viewBox
defaultSize
rotationPolicy
portTemplates
propertySchema
allowedConnections
sourceKind
sourcePageUrl
sourceDownloadUrl
sourceRevision
sourceAuthor
sourceReference
licenseName
licenseUrl
licenseReference
attributionText
originalFormat
originalChecksum
derivationRecord
```

`sourceKind` distinguirá `normative`, `drawio`, `wikimedia` e `project`. `derivationRecord` registrará conversões, redesenhos, ajustes e a ferramenta usada. Um arquivo `THIRD_PARTY_NOTICES.md` agregará as atribuições exigidas sem substituir o registro por asset.

O build sanitizará SVGs, removerá scripts, eventos e referências externas, normalizará `viewBox` e verificará chaves duplicadas. PNGs serão decodificados e regravados, terão metadados desnecessários removidos e dimensões limitadas. O checksum sempre representará o arquivo original baixado.

### 11.5 Pipeline de ingestão

O pipeline de catálogo executará as seguintes etapas reproduzíveis:

1. fixar o commit do draw.io e a revisão das páginas do Commons usadas pelo inventário;
2. baixar o arquivo original, nunca uma miniatura ou captura de tela;
3. registrar URL da página, URL de download, autoria, licença, atribuição, revisão e checksum;
4. reconciliar o item com o inventário normativo ISA/ISO;
5. converter stencil draw.io em SVG canônico ou importar o SVG original do Commons;
6. preferir SVG e aceitar PNG apenas quando não existir equivalente vetorial adequado e o raster for necessário;
7. sanitizar, normalizar geometria e produzir o ativo final do catálogo;
8. executar gates de licença, segurança, duplicidade, cobertura e regressão visual.

A ingestão de stencils no build não implica suporte a arquivos draw.io no produto. A importação de diagramas `.drawio` pelo usuário continuará fora do escopo do MVP.

### 11.6 Cobertura

O inventário normativo autorizado será a lista de referência. Cada item deverá aparecer no manifesto ou em um registro de exceções com justificativa concreta. O gate de catálogo falhará quando um item não estiver mapeado. Os inventários do draw.io e do Wikimedia serão reconciliados contra essa lista; quantidade de arquivos externos não será usada como medida de conformidade. Esse critério torna “praticamente exaustivo” mensurável sem fixar uma contagem antes de inspecionar os arquivos autorizados.

### 11.7 Versionamento

Fluxogramas permanecerão fixados à versão usada na criação. Atualizar o catálogo não alterará documentos existentes. Uma migration explícita poderá remapear chaves em versão posterior. A versão do catálogo também fixará o commit do draw.io, as revisões do Commons e os checksums de todos os originais.

## 12. Validação

O frontend oferecerá feedback imediato. O backend validará a projeção antes de marcar um snapshot como válido. Regras declarativas no manifesto e fixtures de conformidade manterão os dois validadores equivalentes.

### 12.1 Regras bloqueantes

O editor bloqueará ações locais que:

- misturem ISA e ISO;
- conectem classes incompatíveis;
- excedam a capacidade de uma porta;
- criem IDs duplicados;
- referenciem elementos ou portas inexistentes;
- violem o schema do documento.

Uma mesclagem remota ainda pode produzir uma inconsistência transitória. Nesse caso, o gateway manterá a sessão ativa para permitir correção, mas o backend preservará o último snapshot estruturalmente válido.

### 12.2 Alertas

O editor avisará quando encontrar:

- tag ausente, duplicada ou fora do formato;
- porta obrigatória desconectada;
- direção de fluxo inconsistente;
- linha incompatível com o elemento;
- instrumento sem variável ou função;
- propriedade obrigatória ausente.

Alertas não impedirão edição ou exportação. Um P&ID incompleto é um estado normal durante o desenho.

### 12.3 Limite semântico

O validador verificará estrutura e notação. Ele não confirmará pressão, vazão, dimensionamento, balanço, segurança de processo ou viabilidade física.

## 13. Compartilhamento e autorização

### 13.1 Links de capacidade

Ao criar um fluxograma, o FastAPI retornará dois links:

```text
/pid/{uuid}#access={viewToken}
/pid/{uuid}#access={editToken}
```

O fragmento mantém o token fora da requisição inicial. O frontend lerá o token, trocará por uma sessão e o manterá apenas na memória da aba. Recarregar a página reutilizará o fragmento.

Como não haverá contas, o sistema não oferecerá uma lista pessoal de fluxogramas nem recuperação por e-mail. A tela de criação exigirá que o visitante copie o link de edição. Perder esse link elimina o acesso administrativo ao documento.

### 13.2 Troca por ticket

O frontend enviará o token longo por HTTPS no corpo ou cabeçalho de uma requisição. O FastAPI comparará seu hash e emitirá um ticket WebSocket de uso único com TTL de 60 segundos. Redis armazenará o ticket até consumo ou expiração.

O cliente abrirá o WebSocket sem credencial na query string e enviará o ticket como primeira mensagem. O gateway não aceitará awareness nem mudanças antes da autenticação.

### 13.3 Escopos

`view` permite:

- abrir o documento;
- receber atualizações;
- publicar awareness;
- exportar PNG/SVG.

`edit` acrescenta:

- alterar o documento;
- alterar título;
- regenerar ou revogar links;
- restaurar soft delete;
- excluir o fluxograma.

Cada ação crítica verificará o escopo. A conexão inicial não concederá autorização irrestrita.

### 13.4 Revogação

Revogar ou regenerar um link atualizará PostgreSQL e publicará um evento no Redis. Os gateways encerrarão todas as sessões que usam o token revogado.

### 13.5 Exclusão

Excluir definirá `deleted_at`. O link de edição poderá restaurar o documento durante 30 dias. Uma rotina removerá definitivamente documentos expirados.

## 14. Colaboração

### 14.1 Convergência

Yjs representará `nodes`, `ports`, `edges`, `annotations` e `groups`. Mudanças simultâneas convergirão sem usar “último salvamento vence”. Alertas semânticos serão recalculados após cada mesclagem.

### 14.2 Undo e redo

`Y.UndoManager` rastreará somente operações originadas pelo participante atual. Desfazer não reverterá alterações de outros participantes.

### 14.3 Awareness

Cada participante informará um nome ao entrar. O sistema atribuirá uma cor. Awareness propagará cursor, viewport, seleção e heartbeat. PostgreSQL não armazenará esses dados.

### 14.4 Salvamento

O gateway agrupará mudanças e consolidará o documento no PostgreSQL. A interface mostrará quatro estados: sincronizado, salvando, reconectando e não salvo.

## 15. Exportação

O exportador renderizará o modelo P&ID canônico, não uma captura da interface. Ele reutilizará os SVGs sanitizados e a geometria das linhas.

SVG será a representação base. PNG resultará da rasterização desse SVG. A exportação:

- aguardará sincronização;
- enquadrará todos os elementos;
- preservará textos, linhas e cores;
- excluirá cursores, seleções, minimapa e alertas;
- aceitará fundo branco ou transparente;
- usará o título do fluxograma no nome do arquivo.

## 16. Falhas e recuperação

### 16.1 WebSocket

O cliente tentará reconectar com atraso exponencial. Ele manterá alterações em memória por até 30 segundos. Depois, o editor entrará em leitura até restabelecer a conexão. Essa tolerância breve não constitui suporte offline.

### 16.2 Redis

Se Redis falhar, os gateways rejeitarão novas sessões e converterão sessões de edição para leitura. Essa política evita divergência entre réplicas. Após recuperar Redis, os clientes obterão novos tickets e resincronizarão.

### 16.3 PostgreSQL

Se PostgreSQL falhar, a interface não confirmará salvamento. Após a tentativa pendente falhar, o gateway bloqueará novas edições até recuperar a persistência. O cliente preservará mudanças recentes em memória durante a janela de reconexão.

### 16.4 Snapshot inválido

O backend manterá o último snapshot válido, registrará o erro estrutural e deixará a sessão ativa para correção. Alertas semânticos não invalidarão snapshots.

### 16.5 Exportação

O sistema bloqueará exportação durante estado não salvo. Uma falha de rasterização PNG não impedirá download SVG.

## 17. Segurança

O editor aplicará:

- TLS e WSS;
- allowlist exata de `Origin`;
- tickets curtos e de uso único;
- autorização por mensagem;
- limite de tamanho de payload;
- limite de mensagens e conexões;
- heartbeat e timeout de sessão;
- backpressure;
- sanitização de SVG;
- validação de schema;
- logs sem tokens, tickets ou conteúdo completo do documento;
- encerramento imediato após revogação;
- testes contra escrita com link de leitura.

## 18. Implantação

O stack Swarm terá:

```text
tcc-frontend
tcc-api
tcc-collaboration (2 réplicas)
tcc-postgres
tcc-redis
```

Traefik encaminhará HTTP para frontend/API e WebSocket para colaboração. PostgreSQL usará volume persistente. Redis será efêmero. O projeto não exigirá backup externo.

A perda do volume PostgreSQL causará perda definitiva dos fluxogramas. O projeto aceita esse risco no MVP open source.

Credenciais e URLs serão lidas de `.env`. O arquivo real permanecerá no `.gitignore` e terá acesso restrito no host. O repositório publicará `.env.example` com nomes de variáveis e valores inofensivos.

Variáveis previstas:

```text
POSTGRES_DB
POSTGRES_USER
POSTGRES_PASSWORD
DATABASE_URL
REDIS_URL
PID_TOKEN_PEPPER
PID_ALLOWED_ORIGINS
PID_WS_PUBLIC_URL
```

Health checks cobrirão FastAPI, gateway, PostgreSQL e Redis. Migrations rodarão antes de liberar a nova versão da API.

## 19. Desempenho

O MVP deverá suportar:

- 500 elementos e 1.000 conexões por fluxograma;
- dez participantes simultâneos por sala;
- propagação p95 inferior a 500 ms em rede regional;
- restauração completa após reinício dos gateways;
- pan, zoom e seleção responsivos no documento de referência.

O teste de referência usará a quantidade máxima de elementos, conexões e participantes. Virtualização do catálogo, memoização de nós e agrupamento de atualizações serão requisitos de desempenho, não otimizações opcionais.

## 20. Testes

### 20.1 Unitários

Testes unitários cobrirão:

- manifesto e inventário do catálogo;
- sanitização SVG;
- portas e compatibilidade;
- tags e validações;
- migrations do modelo;
- serialização e projeção;
- escopos e revogação;
- nomes de exportação.

### 20.2 Componentes

Testes de componentes cobrirão arraste, seleção, conexão, rotação, propriedades, copiar/colar, agrupamento, undo/redo, estados de sincronização e exportação.

### 20.3 API

Pytest cobrirá criação, troca de token, ticket, revogação, soft delete, restauração, expurgo, metadados, snapshots e autorização.

### 20.4 Colaboração

Testes iniciarão dois ou mais clientes para provar:

- convergência após edições simultâneas;
- undo isolado por participante;
- reconexão;
- restauração do PostgreSQL;
- sincronização entre gateways por Redis;
- revogação imediata;
- impossibilidade de escrita com `view`.

### 20.5 E2E

Playwright abrirá contextos de navegador independentes. O fluxo principal criará um documento, compartilhará os dois links, editará em duas sessões, verificará a visualização, recarregará o documento e exportará PNG/SVG.

### 20.6 Segurança e falhas

Testes cobrirão origem inválida, ticket expirado, reutilização de ticket, payload excessivo, flood, SVG malicioso, token em logs, reinício de gateway, falha de Redis e indisponibilidade de PostgreSQL.

## 21. Critérios de aceitação

O MVP estará concluído quando:

1. um visitante criar um P&ID ISA ou ISO;
2. o catálogo aprovado estiver completo segundo o inventário normativo autorizado e cada ativo tiver proveniência e licença verificáveis;
3. duas sessões de edição alterarem o mesmo documento e convergirem;
4. uma sessão de leitura acompanhar mudanças sem conseguir escrever;
5. links puderem ser revogados e regenerados;
6. o documento sobreviver ao reinício dos gateways;
7. validações destacarem erros e alertas conforme esta especificação;
8. exportações PNG e SVG representarem o documento inteiro;
9. os limites de desempenho forem atendidos;
10. testes unitários, de integração, E2E, segurança e falha passarem;
11. `.env` permanecer fora do Git e `.env.example` documentar as variáveis;
12. o sistema não executar cálculos nem misturar padrões.

## 22. Decomposição da implementação

Este design será executado em cinco entregas, cada uma com especificação e plano próprios.

### Entrega 1 — Fundação

- PostgreSQL, Redis e migrations;
- tabelas e repositórios;
- UUIDs, tokens, tickets e soft delete;
- estrutura e versionamento do catálogo;
- inventário de fontes, pipeline de proveniência e gates de licença;
- serviços do Swarm e `.env.example`.

### Entrega 2 — Editor

- rota e shell do editor;
- React Flow;
- modelo P&ID e adaptadores;
- catálogo, inspetor, portas, linhas e histórico local;
- exportador inicial.

### Entrega 3 — Colaboração

- Yjs e Hocuspocus;
- awareness;
- múltiplos gateways e Redis;
- links, escopos, revogação e reconexão;
- persistência de snapshots.

### Entrega 4 — P&ID completo

- ingestão integral dos catálogos ISA/ISO a partir das fontes aprovadas;
- aliases, propriedades e conexões;
- validações bloqueantes e alertas;
- fixtures de conformidade.

### Entrega 5 — Finalização

- PNG/SVG finais;
- desempenho;
- segurança;
- observabilidade;
- testes de falha;
- documentação de operação e uso.

O primeiro plano de implementação deverá cobrir somente a Entrega 1.

## 23. Evolução para cálculos

Uma fase futura poderá mapear `symbolKey`, propriedades, portas e arestas para os módulos existentes. Adaptadores poderão:

- preencher parâmetros de bombas e tubulações;
- transformar correntes em entradas de balanço;
- associar reatores a CSTR ou PFR;
- executar cálculos no backend;
- devolver resultados e alertas por UUID de elemento.

Essa evolução não faz parte do MVP. O modelo definido aqui evita que ela exija outro editor ou uma migração estrutural completa.

## 24. Referências técnicas

- [React Flow — custom nodes](https://reactflow.dev/learn/customization/custom-nodes)
- [React Flow — handles](https://reactflow.dev/learn/customization/handles)
- [React Flow — save and restore](https://reactflow.dev/examples/interaction/save-and-restore)
- [Yjs](https://github.com/yjs/yjs)
- [Yjs WebSocket provider](https://github.com/yjs/y-websocket)
- [Hocuspocus — Redis](https://tiptap.dev/docs/hocuspocus/server/extensions/redis)
- [Hocuspocus — scalability](https://tiptap.dev/docs/hocuspocus/guides/scalability)
- [PostgreSQL — MVCC](https://www.postgresql.org/docs/current/mvcc-intro.html)
- [OWASP — WebSocket Security Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/WebSocket_Security_Cheat_Sheet.html)
- [MDN — URI fragment](https://developer.mozilla.org/en-US/docs/Web/URI/Reference/Fragment)
- [draw.io — process engineering shapes](https://www.drawio.com/blog/process-engineering-shapes)
- [draw.io — stencils P&ID](https://github.com/jgraph/drawio/tree/dev/src/main/webapp/stencils/pid)
- [draw.io — formas P&ID programáticas](https://github.com/jgraph/drawio/tree/dev/src/main/webapp/shapes/pid2)
- [Wikimedia Commons — P&ID symbols](https://commons.wikimedia.org/wiki/Category:P%26ID_symbols)
- [Wikimedia Commons — Chemical engineering symbols](https://commons.wikimedia.org/wiki/Category:Chemical_engineering_symbols)
- [ISO copyright](https://www.iso.org/copyright.html)
- [ISA copyright policy](https://www.isa.org/getmedia/2fca54ba-d049-4b94-8b9e-f31f0de2a27e/Copyright-of-ISA-Standards.pdf)
