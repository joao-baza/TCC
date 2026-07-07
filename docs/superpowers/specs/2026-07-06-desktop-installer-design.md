# Design: instalador desktop autossuficiente para macOS, Windows e Linux

**Data:** 2026-07-06  
**Escopo:** transformar o app atual em uma distribuição desktop autossuficiente, com instalador por plataforma, reaproveitando o frontend React/Vite e o backend FastAPI/Python já existentes.  
**Fora de escopo:** reescrever a UI em tecnologia nativa, mudar a lógica funcional do produto, trocar o stack científico do backend, ou criar uma única build universal para todos os sistemas operacionais.

---

## 1. Contexto

O projeto atual já é uma aplicação web com dois blocos claros:

- `frontend/`: SPA em `React + TypeScript + Vite`.
- backend Python/FastAPI com rotas e cálculos científicos já consolidados.

Hoje a execução local e o deploy estão orientados para web e Docker. Isso é bom para distribuição web, mas não resolve o pedido de um instalador desktop autossuficiente.

O caminho com menor retrabalho é criar uma camada desktop fina que:

- inicializa o backend local;
- serve o frontend compilado;
- expõe a aplicação em uma janela nativa;
- empacota tudo por plataforma.

---

## 2. Objetivo

Entregar um aplicativo desktop instalável em:

- macOS;
- Windows;
- Linux.

O instalador deve ser autossuficiente, ou seja:

- não depender de Node.js instalado na máquina do usuário;
- não depender de Python instalado na máquina do usuário;
- não depender de Docker para executar o app;
- abrir a interface pronta para uso ao iniciar.

---

## 3. Decisão Aprovada

A direção escolhida no brainstorming foi:

1. **Electron** como shell desktop.
2. **Backend Python empacotado** como executável local por plataforma.
3. **Frontend Vite compilado** servido localmente dentro do app desktop.
4. **Proxy local `/api`** preservado para que o frontend continue usando o mesmo contrato lógico de chamada.

Essa combinação preserva a maior parte do código atual e evita reescrever a interface em uma stack nativa.

---

## 4. Alternativas Consideradas

### 4.1 Tauri

Vantagens:

- instalador menor;
- consumo potencialmente menor de memória.

Desvantagens:

- maior custo inicial de integração;
- mais atrito para empacotar o backend científico Python;
- menos alinhado ao objetivo de menor esforço.

### 4.2 Electron com backend remoto

Vantagens:

- seria simples no lado desktop.

Desvantagens:

- não atende ao requisito de autossuficiência;
- depende de infraestrutura externa ou de uma instalação separada da API.

### 4.3 Electron + backend Python empacotado

Vantagens:

- reaproveita o stack atual;
- atende ao requisito de autossuficiência;
- mantém a lógica científica em Python;
- facilita portabilidade por plataforma.

Desvantagem principal:

- instaladores maiores do que Tauri ou uma abordagem web pura.

Direção aprovada: **Electron + backend Python empacotado**.

---

## 5. Arquitetura Proposta

### 5.1 Componentes

O produto desktop terá três camadas:

1. **Electron main process**
   - inicia o app desktop;
   - escolhe portas locais livres;
   - sobe o backend local;
   - serve o frontend compilado;
   - abre a janela principal.

2. **Backend Python empacotado**
   - roda como processo local;
   - expõe a API FastAPI;
   - mantém a lógica científica inalterada.

3. **Frontend compilado**
   - build do Vite;
   - assets estáticos servidos localmente;
   - continua consumindo `"/api"` como base lógica.

### 5.2 Fluxo de inicialização

1. O usuário abre o instalador e inicia o app.
2. O Electron inicia.
3. O Electron encontra uma porta livre para o backend.
4. O Electron inicia o executável Python local.
5. O Electron sobe um servidor local para os assets do frontend.
6. Esse servidor também faz proxy de `"/api"` para o backend.
7. A janela principal abre apontando para o host local.

### 5.3 Contrato de API

O frontend não deve precisar saber se está rodando:

- em desenvolvimento;
- em web deploy;
- ou no desktop empacotado.

Para isso, o contrato ideal é manter chamadas relativas para `"/api"` e centralizar a adaptação no host desktop.

---

## 6. Estrutura de Build e Empacotamento

### 6.1 Frontend

O frontend continua sendo compilado com Vite.

Saída esperada:

- bundle estático;
- assets versionados;
- carregamento local no desktop.

### 6.2 Backend

O backend deve ser empacotado como executável standalone por sistema operacional.

Recomendação inicial:

- `PyInstaller` em modo `onedir`.

Motivo:

- o backend usa dependências científicas e bibliotecas nativas;
- o modo `onedir` tende a ser mais previsível do que `onefile` para esse tipo de carga;
- reduz risco de extração lenta ou falhas de biblioteca no boot.

### 6.3 Desktop Shell

O shell desktop deve ser empacotado com Electron usando uma ferramenta de distribuição como `electron-builder`.

Artefatos esperados:

- `.dmg` para macOS;
- `.exe`/installer para Windows;
- `.AppImage` ou pacote equivalente para Linux.

### 6.4 Recursos Embutidos

O pacote desktop deve incluir:

- o frontend compilado;
- o binário do backend para a plataforma corrente;
- arquivos de configuração necessários;
- ícones e metadados do aplicativo.

---

## 7. Impacto no Código Atual

### 7.1 Frontend

O frontend deve sofrer alterações mínimas.

Pontos prováveis:

- garantir que o build funcione em contexto local servido por Electron;
- manter chamadas relativas para `"/api"`;
- evitar depender de caminhos absolutos do navegador.

### 7.2 Backend

O backend precisa aceitar execução local empacotada.

Pontos prováveis:

- porta configurável por argumento;
- inicialização sem dependência de `uvicorn` como comando de shell;
- possível endpoint de healthcheck para o host desktop validar startup.

### 7.3 Nova Pasta `desktop/`

É recomendável criar uma área própria para o shell desktop, por exemplo:

- processo principal do Electron;
- lógica de bootstrap;
- scripts de build e empacotamento;
- configuração de assinatura e distribuição por plataforma.

---

## 8. Riscos Técnicos

### 8.1 Dependências nativas do backend

Bibliotecas como `CoolProp`, `SciPy` e `NumPy` podem exigir atenção específica em cada sistema operacional.

Mitigação:

- empacotar por plataforma;
- validar binário por OS;
- manter build separado para macOS, Windows e Linux.

### 8.2 Porta e inicialização

Se a porta do backend for fixa, pode haver conflito com outro processo local.

Mitigação:

- escolher porta livre no boot;
- iniciar backend com porta dinâmica;
- fazer o host desktop esperar o healthcheck antes de abrir a janela.

### 8.3 Carga de instalação

O pacote final será maior do que uma web app ou um build Tauri.

Mitigação:

- evitar empacotar dependências desnecessárias;
- usar `onedir` apenas quando ele reduzir risco real;
- manter o frontend estático enxuto.

### 8.4 Assinatura e distribuição

macOS e Windows podem exigir assinatura, notary ou configuração adicional para reduzir alertas do sistema operacional.

Mitigação:

- tratar isso como etapa de distribuição, não como mudança de produto;
- separar claramente build local de build publicado.

---

## 9. Critérios de Aceite

A entrega será considerada pronta quando:

- o app instalar e abrir em macOS, Windows e Linux;
- o usuário não precisar instalar Python ou Node;
- a interface abrir localmente sem depender de internet;
- as principais telas continuarem funcionando com a API local;
- o backend científico responder corretamente dentro do pacote;
- o fluxo de inicialização não exigir ações manuais do usuário além de abrir o app.

---

## 10. Testes e Verificação

### 10.1 Frontend

Validar:

- build do Vite;
- teste de navegação principal;
- execução local com o host desktop.

### 10.2 Backend

Validar:

- testes Python existentes;
- inicialização empacotada;
- resposta do healthcheck;
- chamadas reais às rotas críticas.

### 10.3 Desktop

Validar:

- o binário abre a janela principal;
- o backend sobe antes da UI ficar pronta;
- o host local serve os assets corretamente;
- `"/api"` funciona no pacote final.

### 10.4 Matriz de Build

Validar separadamente:

- Windows;
- macOS;
- Linux.

---

## 11. Sequência de Implementação

1. Definir o host desktop mínimo.
2. Tornar o backend iniciável como processo empacotado.
3. Compilar o frontend para uso local no desktop.
4. Montar o bootstrap Electron.
5. Empacotar por plataforma.
6. Criar smoke tests de abertura e healthcheck.
7. Ajustar detalhes de distribuição, ícones e instaladores.

---

## 12. Fora de Escopo

Não entra nesta entrega:

- reescrever a aplicação em Qt, Swift, .NET ou Flutter;
- refatorar a lógica científica do backend;
- migrar a app inteira para offline-first com sincronização;
- redesenhar a interface só por causa do desktop;
- unificar todos os sistemas operacionais em um único artefato binário.

