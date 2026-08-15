# P&ID com norma única `free`

## Objetivo

O editor P&ID terá uma única modalidade livre. O frontend, o backend e o banco aceitarão apenas `free`. A mudança remove as opções ISA e ISO sem preservar dados legados, pois o banco atual não contém diagramas importantes.

## Escopo

- Excluir os ativos originais `pump.svg`, `tank.svg`, `valve.svg` e `instrument.svg`.
- Excluir as quatro entradas `project.*` que usam esses ativos.
- Manter os SVGs derivados dos stencils Draw.io e classificá-los somente como `free`.
- Remover ISA e ISO da interface de criação, dos contratos, dos schemas, das regras de compatibilidade e do modelo do backend.
- Substituir os manifests ISA e ISO por um manifest `free`.
- Restringir o enum PostgreSQL `pid_standard` ao valor `free`.
- Atualizar os testes afetados sem alterar cálculos ou outras áreas do DCOU.

## Frontend

A página de criação não exibirá o seletor de norma. O formulário enviará título e nome do participante, e o adaptador local criará o documento com `standard: "free"`.

`PidStandard` passará a representar apenas `"free"`. Os schemas de criação, persistência e documento canônico rejeitarão `"isa"` e `"iso"`. O índice do catálogo deixará de manter subconjuntos por norma e retornará o catálogo completo para `free`.

O catálogo local será composto apenas pelos símbolos Draw.io. Cada entrada gerada terá `standards: ["free"]`. Nomes de arquivos e nomes técnicos provenientes do Draw.io poderão conservar a palavra `iso` para preservar a identidade da fonte; ela não representará uma opção ou classificação do produto.

## Backend e banco de dados

`PidStandard` conterá somente `FREE`. A criação de diagramas não receberá uma escolha de norma e gravará `PidStandard.FREE`. Repositórios de catálogo continuarão usando a coluna `standard`, mas aceitarão apenas o único valor disponível.

Uma nova migração apagará registros P&ID que não sejam `free`, removerá os valores ISA e ISO do tipo PostgreSQL e manterá as tabelas existentes. O downgrade restaurará os três valores do enum, sem reconstruir dados apagados.

O schema de manifest aceitará somente `free`. Os manifests vazios de ISA e ISO serão removidos, e `pid/catalog/manifests/free/foundation.json` será a única base formal.

## Ativos e procedência

Os 547 SVGs derivados do Draw.io permanecerão disponíveis sob a atribuição e a licença já registradas. A remoção atingirá somente os quatro ativos vetoriais originais do projeto e suas entradas no catálogo.

O gerador Draw.io produzirá exclusivamente `standards: ["free"]`. Assim, uma futura regeneração não reintroduzirá a classificação ISO.

## Compatibilidade e erros

- Novas entradas `isa` ou `iso` falharão na validação do frontend.
- O backend rejeitará esses valores por não existirem em `PidStandard`.
- Documentos locais antigos com ISA ou ISO serão considerados incompatíveis; não haverá migração automática.
- A migração de banco removerá registros P&ID incompatíveis antes de restringir o enum.

## Testes e validação

Os testes deverão provar que:

1. A página cria diagramas sem seletor de norma e sempre usa `free`.
2. Os schemas rejeitam ISA e ISO.
3. Todos os símbolos do catálogo possuem somente `standards: ["free"]`.
4. Nenhuma entrada do catálogo referencia os quatro SVGs excluídos.
5. O importador Draw.io não volta a gerar classificações ISO.
6. O backend expõe somente `PidStandard.FREE` e cria diagramas livres.
7. O manifest `free` passa na validação, e ISA/ISO falham.
8. A migração sobe e desce em PostgreSQL de teste.
9. As suítes P&ID, frontend e backend permanecem verdes.

## Fora do escopo

- Alterar os desenhos importados do Draw.io.
- Renomear todos os arquivos que contêm `iso` na identidade de origem.
- Preservar ou converter diagramas ISA/ISO existentes.
- Relacionar o editor P&ID aos cálculos do DCOU.
- Preparar agora a reintrodução futura de normas formais.
