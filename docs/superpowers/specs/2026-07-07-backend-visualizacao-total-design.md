# Backend-Owned Visualization Model

## Objetivo

Centralizar no backend toda a matemática usada hoje pelo frontend, incluindo:

- resultados físicos principais
- pontos de curva e amostragens auxiliares
- escalas, domínios, ticks e marcações
- aproximações didáticas usadas apenas para desenhar gráficos

A interface visual deve permanecer praticamente igual. A mudança é de origem dos dados, não de layout.

## Contexto Atual

O frontend já funciona como uma camada híbrida:

- algumas telas só enviam parâmetros para a API e exibem o resultado
- outras telas ainda calculam curvas, pontos operacionais, escalas e aproximações no cliente
- vários gráficos são desenhados com SVG e helpers locais, não com um motor unificado de visualização

Isso cria dois problemas:

1. a matemática fica duplicada entre tela e backend
2. qualquer ajuste de fórmula ou escala exige mudar a UI

## Princípio De Design

Regra principal:

- o frontend não pode mais conter conta de engenharia, amostragem de curva, cálculo de eixo, aproximação didática ou inferência de ponto operacional
- o frontend pode continuar fazendo somente transformação mecânica de renderização, como converter coordenadas lógicas em posições visuais, usando dados já calculados pelo backend

Em outras palavras:

- backend calcula
- frontend renderiza

## Arquitetura Proposta

### 1. Endpoints específicos de visualização

Cada área relevante passa a expor um endpoint próprio para devolver um modelo de visualização pronto:

- `flow` para Reynolds, fator de atrito, diâmetro hidráulico e Moody
- `pump` para headloss, NPSH, altura manométrica e curvas auxiliares
- `reactor` para Levenspiel, Arrhenius, perfil PFR e comparações didáticas
- `balance` para qualquer corrente ou visual derivada que hoje dependa de conta local
- `components` e `exercises` para gráficos derivados que ainda não sejam apenas consumo de resultado numérico

Os endpoints de cálculo já existentes podem continuar, mas a visualização deve consumir o novo contrato do backend.

O nome final das rotas pode ser ajustado na implementação, mas cada visualização precisa ter um endpoint próprio e explícito, sem reciclar a mesma resposta do cálculo bruto.

### 2. Modelo comum de visualização

O backend deve devolver um `ChartModel` comum para evitar contratos ad hoc em cada tela.

Estrutura sugerida:

```ts
ChartModel = {
  id: string;
  title: string;
  subtitle?: string;
  approximationNotice?: string;
  axes: {
    x: AxisModel;
    y: AxisModel;
  };
  series: SeriesModel[];
  markers?: MarkerModel[];
  annotations?: AnnotationModel[];
  metadata?: {
    units?: Record<string, string>;
    version: string;
  };
};
```

Campos principais:

- `AxisModel`: domínio, escala, ticks, rótulo, unidade, formato de exibição
- `SeriesModel`: pontos, linhas, áreas ou faixas
- `MarkerModel`: ponto operacional, referência, destaque
- `AnnotationModel`: legenda textual, indicação didática, chamada de atenção

O objetivo do contrato comum é padronizar a leitura do frontend sem engessar o formato de cada visualização.

### 3. Serviços compartilhados no backend

A matemática hoje espalhada em componentes React deve migrar para helpers puros no backend.

Esses helpers devem cobrir:

- amostragem em escala linear e logarítmica
- geração de ticks
- arredondamento e formatação numérica de exibição
- cálculo de curvas e pontos de referência
- domínio e faixa de plotagem

Os módulos de domínio continuam responsáveis pela fórmula física; os helpers compartilhados só organizam o resultado para renderização.

## Fluxo Por Área

### Flow

Hoje o frontend ainda calcula parte do Moody chart e monta os parâmetros para visualização.

Depois da migração:

- backend calcula Reynolds, fator de atrito e diâmetro hidráulico
- backend calcula a curva do Moody, os trechos laminar/turbulento, ticks e rótulos
- frontend apenas exibe o `ChartModel`

### Pump

Hoje o frontend ainda faz conta local para:

- área da seção
- sincronização vazão/velocidade
- curva auxiliar da bomba
- termos auxiliares da altura manométrica

Depois da migração:

- backend passa a calcular também os pontos da curva, aproximações da bomba e dados de apoio da tela
- frontend mantém somente o estado da interface e a renderização

### Reactor

Hoje o frontend ainda calcula:

- curva e pontos do Levenspiel
- ponto operacional de CSTR/PFR
- curva de Arrhenius
- amostras do perfil PFR

Depois da migração:

- backend devolve todos esses modelos prontos
- o frontend só compara inputs, navega entre abas e desenha o que vier pronto

### Balance

O fluxo principal já é bastante backend-driven, mas qualquer visual derivado deve seguir a mesma regra.

Se a tela precisar de visualização de correntes ou fluxos, o backend deve devolvê-la como modelo pronto.

### Components e Exercises

Qualquer gráfico ou visual derivado nessas áreas também deve virar backend-owned.

Se a tela só precisar de tabela, sem conta local relevante, ela pode continuar consumindo apenas o resultado numérico.

## Migração

A migração deve ser incremental, mantendo a interface estável.

### Fase 1

- criar o contrato `ChartModel` no backend
- implementar helpers compartilhados de domínio/ticks/amostragem
- adicionar endpoints de visualização para os gráficos mais críticos

### Fase 2

- migrar `flow`, `pump` e `reactor`
- atualizar o frontend para consumir os novos modelos
- remover a matemática local desses componentes

### Fase 3

- migrar visuais auxiliares em `balance`, `components` e `exercises`
- eliminar os helpers de cálculo que sobrar no frontend

## Testes

### Backend

- validar o formato do `ChartModel`
- validar valores numéricos contra casos já conhecidos
- validar ticks, domínios e pontos operacionais
- validar curvas logarítmicas e aproximações didáticas

### Frontend

- garantir que as telas continuam com a mesma estrutura visual
- garantir que os componentes migrados apenas renderizam dados
- garantir que não exista retorno para matemática local nos componentes migrados

### Regressão

- adicionar testes que falhem se um componente migrado voltar a calcular curva, escala ou ponto operacional no cliente
- revisar os testes existentes para preservar o comportamento visual atual

## Critérios De Aceite

- o frontend não executa mais cálculo de engenharia nem cálculo auxiliar de gráfico nos módulos migrados
- o backend fornece os dados prontos para renderização
- a interface visual permanece praticamente igual
- a mudança é validada com testes de backend e frontend

## Riscos

- o contrato pode crescer demais se cada gráfico inventar seu próprio formato
- a migração pode quebrar a aparência se o frontend passar a interpretar mal o modelo novo
- alguns componentes hoje misturam cálculo de exibição com layout; esses casos precisam ser separados com cuidado

## Fora De Escopo

- redesign visual
- troca do stack de renderização apenas por preferência estética
- revisão de fórmulas físicas que não estejam ligadas à visualização
- criação de um meta-endpoint genérico para todos os gráficos se isso aumentar o acoplamento

## Decisão Fechada

Para este trabalho, a decisão é:

- usar endpoints específicos de visualização
- manter a interface atual
- mover para o backend toda conta que hoje existe apenas para resultado ou gráfico
- deixar o frontend como camada de renderização e estado de tela
