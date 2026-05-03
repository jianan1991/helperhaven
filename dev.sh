#!/usr/bin/env bash
set -euo pipefail

# Usage:
#   ./dev.sh up        # build + start full local stack
#   ./dev.sh down      # stop stack
#   ./dev.sh logs [svc]
#   ./dev.sh rebuild   # down + build no-cache + up
#   ./dev.sh psql      # open psql in the postgres container
#   ./dev.sh reset-db  # wipe db volume (destructive — asks to confirm)

cd "$(dirname "$0")"

if [[ ! -f .env ]]; then
    echo "No .env found — creating one from .env.example"
    cp .env.example .env
fi

COMPOSE="docker compose -f infra/docker-compose.yml --env-file .env"

cmd="${1:-up}"
case "$cmd" in
    up)
        $COMPOSE up -d --build
        echo ""
        echo "Stack up:"
        echo "  Web:        http://localhost:5173"
        echo "  Admin:      http://localhost:5174"
        echo "  Backend:    http://localhost:8080/api/hello"
        echo "  Swagger:    http://localhost:8080/swagger-ui.html"
        echo "  MailHog:    http://localhost:8025"
        echo "  Postgres:   localhost:5432 (helperhaven/helperhaven)"
        ;;
    down)
        $COMPOSE down
        ;;
    logs)
        shift || true
        $COMPOSE logs -f "$@"
        ;;
    rebuild)
        $COMPOSE down
        $COMPOSE build --no-cache
        $COMPOSE up -d
        ;;
    psql)
        $COMPOSE exec postgres psql -U helperhaven -d helperhaven
        ;;
    reset-db)
        read -rp "This will DESTROY all local DB data. Type yes to continue: " ans
        if [[ "$ans" == "yes" ]]; then
            $COMPOSE down -v
            $COMPOSE up -d postgres
        else
            echo "Aborted."
        fi
        ;;
    *)
        echo "Unknown command: $cmd"
        echo "Usage: $0 {up|down|logs|rebuild|psql|reset-db}"
        exit 1
        ;;
esac
