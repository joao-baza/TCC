from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]


def read(rel_path: str) -> str:
    return (ROOT / rel_path).read_text(encoding="utf-8")


def test_frontend_dockerfile_builds_and_serves_vite_bundle():
    dockerfile = read("deploy/Dockerfile.frontend")

    assert "npm ci" in dockerfile
    assert "npm run build" in dockerfile
    assert "/app/dist/" in dockerfile
    assert "/usr/share/nginx/html/" in dockerfile
    assert 'CMD ["nginx", "-g", "daemon off;"]' in dockerfile
    assert "EXPOSE 80" in dockerfile


def test_compose_routes_frontend_to_nginx_and_main_host_api_to_backend():
    compose = read("deploy/docker-compose.yaml")

    assert "traefik.http.services.tcc-frontend.loadbalancer.server.port=80" in compose
    assert (
        "traefik.http.routers.tcc-api-main.rule=Host(`tcc.joao.baza.dev.br`) "
        "&& PathPrefix(`/api`)"
    ) in compose
    assert "traefik.http.middlewares.tcc-api-strip.stripprefix.prefixes=/api" in compose
    assert "traefik.http.routers.tcc-api-main.middlewares=tcc-api-strip" in compose


def test_canonical_deploy_script_builds_and_uses_the_vite_frontend_image():
    script = read("deploy/deploy.sh")

    assert (
        'docker build --no-cache --build-arg VITE_PID_ADAPTER=disabled '
        '-t "$FRONTEND_IMAGE_NAME" -f deploy/Dockerfile.frontend .'
    ) in script
    assert 'docker stack deploy -c "$COMPOSE_FILE" "$STACK_NAME"' in script
    assert 'docker service update --force "$svc"' in script
