#!/bin/bash
set -euo pipefail

# ============================================================
#  TCC - Educational Simulator for Unit Operations
#  Deploy Script (Docker Swarm + Traefik)
# ============================================================

STACK_NAME="tcc"
COMPOSE_FILE="deploy/docker-compose.yaml"
NETWORK_NAME="SJNet"

# --- Colors ------------------------------------------------
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

log()   { echo -e "${CYAN}[INFO]${NC}  $*"; }
warn()  { echo -e "${YELLOW}[WARN]${NC}  $*"; }
ok()    { echo -e "${GREEN}[ OK ]${NC}  $*"; }
err()   { echo -e "${RED}[ERRO]${NC}  $*"; exit 1; }

# --- Pre-flight checks -------------------------------------
log "Verificando pré-requisitos..."

command -v docker >/dev/null 2>&1 || err "Docker não encontrado. Instale antes de continuar."

if ! docker info --format '{{.Swarm.LocalNodeState}}' 2>/dev/null | grep -q "active"; then
    err "Docker Swarm não está ativo. Execute 'docker swarm init' primeiro."
fi

if ! docker network ls --format '{{.Name}}' | grep -q "^${NETWORK_NAME}$"; then
    warn "Rede '${NETWORK_NAME}' não encontrada. Criando..."
    docker network create --driver overlay --attachable "${NETWORK_NAME}"
    ok "Rede '${NETWORK_NAME}' criada."
else
    ok "Rede '${NETWORK_NAME}' encontrada."
fi

# --- Resolve project root ----------------------------------
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"

log "Diretório do projeto: ${PROJECT_ROOT}"
cd "${PROJECT_ROOT}"

# --- Build images ------------------------------------------
log "Construindo imagem da API..."
docker build -t tcc-api:latest -f deploy/Dockerfile.api .
ok "Imagem tcc-api:latest construída."

log "Construindo imagem do Frontend..."
docker build -t tcc-frontend:latest -f deploy/Dockerfile.frontend .
ok "Imagem tcc-frontend:latest construída."

# --- Deploy stack ------------------------------------------
log "Realizando deploy da stack '${STACK_NAME}'..."
docker stack deploy -c "${COMPOSE_FILE}" "${STACK_NAME}"
ok "Stack '${STACK_NAME}' enviada ao Swarm."

# --- Health check ------------------------------------------
log "Aguardando serviços iniciarem..."
sleep 5

echo ""
log "Status dos serviços:"
docker stack services "${STACK_NAME}"

echo ""
ok "Deploy concluído!"
log "API:      https://tcc.api.homelab.sistemasj.com.br"
log "Frontend: https://tcc.homelab.sistemasj.com.br"
