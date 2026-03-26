#!/usr/bin/env bash
set -euo pipefail

# ══════════════════════════════════════════════════════════
#  AMILCAR Auto Care — Production Deployment Script
# ══════════════════════════════════════════════════════════

COMPOSE_FILE="docker-compose.prod.yml"
ENV_FILE=".env.production"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log()  { echo -e "${GREEN}[DEPLOY]${NC} $1"; }
warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
err()  { echo -e "${RED}[ERROR]${NC} $1" >&2; }

# ─── Preflight checks ───
if [ ! -f "$ENV_FILE" ]; then
    err "$ENV_FILE not found. Copy .env.production.example and fill in values:"
    err "  cp .env.production.example .env.production"
    exit 1
fi

# shellcheck source=/dev/null
source "$ENV_FILE"

if [ -z "${DOMAIN:-}" ]; then
    err "DOMAIN is not set in $ENV_FILE"
    exit 1
fi

if [ -z "${CERTBOT_EMAIL:-}" ]; then
    err "CERTBOT_EMAIL is not set in $ENV_FILE"
    exit 1
fi

if [ ! -f "backend/firebase/service-account.json" ]; then
    warn "backend/firebase/service-account.json not found — push notifications won't work"
fi

# ─── Functions ───
obtain_ssl() {
    log "Obtaining SSL certificate for $DOMAIN ..."

    # Create a temporary self-signed cert so nginx can start
    local cert_dir="./certbot/conf/live/$DOMAIN"
    if [ ! -f "$cert_dir/fullchain.pem" ]; then
        log "Creating temporary self-signed certificate ..."
        mkdir -p "$cert_dir"
        openssl req -x509 -nodes -newkey rsa:2048 -days 1 \
            -keyout "$cert_dir/privkey.pem" \
            -out "$cert_dir/fullchain.pem" \
            -subj "/CN=$DOMAIN" 2>/dev/null
    fi

    # Start nginx with the temp cert
    docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" up -d nginx
    sleep 3

    # Request real cert from Let's Encrypt
    docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" run --rm certbot \
        certbot certonly \
        --webroot \
        --webroot-path=/var/www/certbot \
        --email "$CERTBOT_EMAIL" \
        --agree-tos \
        --no-eff-email \
        --force-renewal \
        -d "$DOMAIN"

    # Reload nginx with real cert
    docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" exec nginx nginx -s reload
    log "SSL certificate obtained successfully!"
}

deploy() {
    log "Starting production deployment for $DOMAIN ..."

    # Build images
    log "Building Docker images ..."
    docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" build

    # Start database first
    log "Starting database ..."
    docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" up -d db
    sleep 5

    # Start API
    log "Starting API ..."
    docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" up -d api

    # Start frontend
    log "Starting frontend ..."
    docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" up -d frontend

    # Check if SSL cert exists
    if docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" exec nginx \
        test -f "/etc/letsencrypt/live/$DOMAIN/fullchain.pem" 2>/dev/null; then
        log "SSL certificate found. Starting Nginx with HTTPS ..."
    else
        warn "No SSL certificate found. Run: $0 ssl"
        warn "Starting Nginx (HTTP only for now) ..."
    fi

    # Start nginx + certbot
    docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" up -d nginx certbot

    log "Deployment complete!"
    log "Site: https://$DOMAIN"
    log "API:  https://$DOMAIN/api/v1/"
    log "Docs: https://$DOMAIN/docs"
}

status() {
    docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" ps
}

logs() {
    local service="${1:-}"
    if [ -n "$service" ]; then
        docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" logs -f "$service"
    else
        docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" logs -f
    fi
}

stop() {
    log "Stopping all services ..."
    docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" down
}

update() {
    log "Pulling latest code and redeploying ..."
    git pull origin main
    deploy
}

# ─── CLI ───
case "${1:-deploy}" in
    deploy)  deploy ;;
    ssl)     obtain_ssl ;;
    status)  status ;;
    logs)    logs "${2:-}" ;;
    stop)    stop ;;
    update)  update ;;
    *)
        echo "Usage: $0 {deploy|ssl|status|logs [service]|stop|update}"
        echo ""
        echo "  deploy  - Build and start all services"
        echo "  ssl     - Obtain/renew SSL certificate"
        echo "  status  - Show running containers"
        echo "  logs    - Tail logs (optionally for a specific service)"
        echo "  stop    - Stop all services"
        echo "  update  - Git pull + redeploy"
        exit 1
        ;;
esac
