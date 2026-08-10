# Catalog Name Translation to pt-BR

**Date:** 2026-08-10
**Status:** draft

## Context

Os arquivos de catálogo P&ID em `frontend/src/features/pid/catalog/generated/` contêm símbolos com `name` em inglês e `category` já em pt-BR. O objetivo é traduzir todos os `name` para pt-BR, mantendo os nomes originais em inglês nos `aliases` para busca retroativa.

**Escopo:**
- `drawio-catalog.json` — 478 símbolos
- `drawio-pid2-catalog.json` — 69 símbolos
- Total: 547 `name` a traduzir

**Estado atual:** Todos os `name` já estão presentes nos `aliases`. Nenhuma ação necessária para a parte de cópia.

## Design

### Estrutura de arquivos

```
scripts/
├── translate_catalog.py          # Script que aplica traduções
└── catalog_translations.json     # Dicionário en-US → pt-BR
```

### Fluxo

1. **`catalog_translations.json`** contém o mapeamento `{ "Agitator (Anchor)": "Agitador (Âncora)", ... }`
2. **`translate_catalog.py`** lê os dois JSONs de catálogo, para cada símbolo:
   - Busca o `name` no dicionário de traduções
   - Se encontrado, substitui `name` pela tradução pt-BR
   - Se não encontrado, emite warning e mantém o original
3. O script regrava os JSONs com pretty-print (indent=2, mesma ordem de campos)

### Tratamento de erros

- Nome sem tradução no dicionário → warning no stderr, mantém original
- JSON malformado → erro fatal com mensagem clara
- Arquivo de tradução ausente → erro fatal

### Validação pós-tradução

Após aplicar, o script verifica:
- Estrutura JSON é válida (parseável após regravação)
- Contagem de símbolos preservada (mesmo número de itens)
- Heurística: reporta warning se algum `name` ainda parece estar em inglês (contém palavras como " and ", " or ", " with " que não existem em pt-BR)

## Não-escopo

- As categorias já estão em pt-BR, não são alteradas
- Os scripts geradores (`import_drawio_pid_catalog.py`, `import_drawio_pid2_catalog.mjs`) não são modificados
- Não há integração com pipeline de build/CI — o script é executado manualmente após regeneração

## Translation Strategy

As traduções serão fornecidas pelo LLM (assistente) diretamente no arquivo `catalog_translations.json`, cobrindo todos os 547 nomes. Termos técnicos de P&ID seguem a nomenclatura padrão da indústria em português brasileiro.

## Riscos

- **Termos ambíguos**: alguns nomes podem ter múltiplas traduções válidas ("Jacket" = Jaqueta/Camisa). Nesses casos, usa-se o termo mais comum na indústria brasileira.
- **Regeneração dos catálogos**: se os scripts geradores forem executados novamente, os JSONs voltarão a ter nomes em inglês. O `translate_catalog.py` precisa ser reexecutado.
