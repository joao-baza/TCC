#!/usr/bin/env bash
# Deploy Docker Swarm da stack TCC.
#
# Ciclo completo: derruba a stack, remove imagens, rebuild e sobe novamente.
#
# Variáveis opcionais:
#   STACK_NAME              nome da stack (padrão: tcc)
#   IMAGE_NAME              imagem da API (padrão: tcc-api:latest)
#   FRONTEND_IMAGE_NAME     imagem do frontend (padrão: tcc-frontend:latest)
#   COMPOSE_FILE            compose relativo à raiz do projeto (padrão: deploy/docker-compose.yaml)
#   NETWORK_NAME            rede overlay externa (padrão: SJNet)
#   WAIT_TIMEOUT_SECONDS    tempo máximo aguardando réplicas (padrão: 600)
#   WAIT_INTERVAL_SECONDS   intervalo entre checagens (padrão: 5)
#   FORCE_ROLLING_UPDATE    0 para omitir service update --force em deploy incremental (padrão: 1)
#   SKIP_BUILD              1 para pular build/remoção de imagens (usa imagens já carregadas no host)
set -euo pipefail

STACK_NAME="${STACK_NAME:-tcc}"
IMAGE_NAME="${IMAGE_NAME:-tcc-api:latest}"
FRONTEND_IMAGE_NAME="${FRONTEND_IMAGE_NAME:-tcc-frontend:latest}"
COMPOSE_FILE="${COMPOSE_FILE:-deploy/docker-compose.yaml}"
NETWORK_NAME="${NETWORK_NAME:-SJNet}"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
cd "${PROJECT_ROOT}"

if [[ ! -f "$COMPOSE_FILE" ]]; then
  echo "Arquivo ${COMPOSE_FILE} não encontrado." >&2
  exit 1
fi

command -v docker >/dev/null 2>&1 || { echo "Docker não encontrado." >&2; exit 1; }

if ! docker info --format '{{.Swarm.LocalNodeState}}' 2>/dev/null | grep -q "active"; then
  echo "Docker Swarm não está ativo. Execute 'docker swarm init' primeiro." >&2
  exit 1
fi

if ! docker network ls --format '{{.Name}}' | grep -q "^${NETWORK_NAME}$"; then
  echo "==> Rede '${NETWORK_NAME}' não encontrada. Criando..."
  docker network create --driver overlay --attachable "${NETWORK_NAME}"
fi

echo "==> Removendo stack ${STACK_NAME}..."
STACK_WAS_REMOVED=0
if docker stack ls --format '{{.Name}}' | grep -q "^${STACK_NAME}$"; then
  docker stack rm "$STACK_NAME"
  STACK_WAS_REMOVED=1
  echo "    Aguardando serviços encerrarem..."
  while docker stack ls --format '{{.Name}}' | grep -q "^${STACK_NAME}$"; do
    sleep 2
  done
  while docker ps -q --filter "label=com.docker.stack.namespace=${STACK_NAME}" | grep -q .; do
    sleep 2
  done
else
  echo "    Stack ${STACK_NAME} não estava em execução."
fi

if [[ "${SKIP_BUILD:-0}" == "1" ]]; then
  echo "==> SKIP_BUILD=1 — usando imagens já presentes no host."
  missing=0
  for img in "$IMAGE_NAME" "$FRONTEND_IMAGE_NAME"; do
    if docker image inspect "$img" >/dev/null 2>&1; then
      echo "    OK: ${img}"
    else
      echo "    Faltando: ${img}" >&2
      missing=1
    fi
  done
  if [[ "$missing" -eq 1 ]]; then
    echo "Imagens pré-buildadas não encontradas. Execute deploy_app.sh ou faça docker load no host." >&2
    exit 1
  fi
else
  echo "==> Removendo imagem ${IMAGE_NAME}..."
  if docker image inspect "$IMAGE_NAME" >/dev/null 2>&1; then
    docker rmi -f "$IMAGE_NAME"
  else
    echo "    Imagem ${IMAGE_NAME} não encontrada."
  fi

  echo "==> Removendo imagem ${FRONTEND_IMAGE_NAME}..."
  if docker image inspect "$FRONTEND_IMAGE_NAME" >/dev/null 2>&1; then
    docker rmi -f "$FRONTEND_IMAGE_NAME"
  else
    echo "    Imagem ${FRONTEND_IMAGE_NAME} não encontrada."
  fi

  echo "==> Buildando imagem ${IMAGE_NAME}..."
  # Sem --pull: usa python:3.10-slim já em cache se Docker Hub estiver lento/indisponível
  # (--pull=never exige Docker recente; buildx antigo só aceita bool em --pull)
  docker build -t "$IMAGE_NAME" -f deploy/Dockerfile.api .

  echo "==> Buildando imagem ${FRONTEND_IMAGE_NAME}..."
  # Frontend é só COPY estático — sem --no-cache o Docker reutiliza camadas antigas
  # mesmo após rsync/deploy (tag :latest idêntica, conteúdo desatualizado).
  docker build --no-cache -t "$FRONTEND_IMAGE_NAME" -f deploy/Dockerfile.frontend .
fi

echo "==> Subindo stack ${STACK_NAME}..."
docker stack deploy -c "$COMPOSE_FILE" "$STACK_NAME"

# Rolling update forçado só quando a stack já existia (tag :latest, digest novo).
# Após stack rm + rebuild, os serviços são criados do zero com as imagens novas;
# service update --force nesse momento causa "update out of sequence".
if [[ "${STACK_WAS_REMOVED:-0}" -eq 0 ]] && [[ "${FORCE_ROLLING_UPDATE:-1}" != "0" ]]; then
  echo "==> Forçando rolling update (tag :latest)..."
  for svc in "${STACK_NAME}_tcc-api" "${STACK_NAME}_tcc-frontend"; do
    if ! docker service inspect "$svc" >/dev/null 2>&1; then
      continue
    fi
    # Aguarda o deploy inicial estabilizar antes de forçar update.
    wait_elapsed=0
    while (( wait_elapsed < 120 )); do
      state=$(docker service inspect "$svc" --format '{{if .UpdateStatus}}{{.UpdateStatus.State}}{{else}}completed{{end}}' 2>/dev/null || echo "pending")
      if [[ "$state" == "completed" ]]; then
        break
      fi
      sleep 2
      wait_elapsed=$((wait_elapsed + 2))
    done
    attempt=0
    while (( attempt < 5 )); do
      if docker service update --force "$svc" >/dev/null 2>&1; then
        break
      fi
      attempt=$((attempt + 1))
      sleep 5
    done
    if (( attempt >= 5 )); then
      echo "    Falha ao forçar update de ${svc} após 5 tentativas." >&2
      docker service update --force "$svc"
      exit 1
    fi
  done
elif [[ "${STACK_WAS_REMOVED:-0}" -eq 1 ]]; then
  echo "==> Stack recriada — imagens novas já em uso (rolling update omitido)."
fi

WAIT_TIMEOUT_SECONDS="${WAIT_TIMEOUT_SECONDS:-600}"
WAIT_INTERVAL_SECONDS="${WAIT_INTERVAL_SECONDS:-5}"

echo "==> Aguardando réplicas ficarem prontas (timeout: ${WAIT_TIMEOUT_SECONDS}s)..."
elapsed=0
while (( elapsed < WAIT_TIMEOUT_SECONDS )); do
  echo ""
  echo "--- Status ($(date '+%H:%M:%S')) ---"
  docker stack services "$STACK_NAME"

  not_ready=0
  service_count=0
  while IFS= read -r replicas; do
    [[ -z "$replicas" ]] && continue
    service_count=$((service_count + 1))
    current="${replicas%%/*}"
    desired="${replicas##*/}"
    if [[ "$current" != "$desired" ]]; then
      not_ready=1
      break
    fi
  done < <(docker stack services "$STACK_NAME" --format '{{.Replicas}}')

  if [[ "$service_count" -gt 0 && "$not_ready" -eq 0 ]]; then
    echo ""
    echo "==> Deploy concluído — todas as réplicas OK."
    echo "    API:      https://tcc.api.homelab.sistemasj.com.br"
    echo "    Frontend: https://tcc.homelab.sistemasj.com.br"
    echo "    Dica: se o navegador ainda mostrar versão antiga, use Ctrl+Shift+R (cache de JS/CSS: 7 dias)."
    exit 0
  fi

  sleep "$WAIT_INTERVAL_SECONDS"
  elapsed=$((elapsed + WAIT_INTERVAL_SECONDS))
done

echo "" >&2
echo "==> Timeout: nem todas as réplicas ficaram prontas após ${WAIT_TIMEOUT_SECONDS}s." >&2
echo "==> Tarefas da stack:" >&2
docker stack ps "$STACK_NAME" --no-trunc
exit 1
