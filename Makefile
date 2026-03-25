COMPOSE := docker-compose

.PHONY: up api api-build api-restart restart down logs-api ps

up:
	$(COMPOSE) up -d db
	$(COMPOSE) up -d frontend 2>/dev/null || true
	$(MAKE) api

api-build:
	./scripts/api-container-safe.sh build

api:
	./scripts/api-container-safe.sh rebuild

api-restart:
	./scripts/api-container-safe.sh restart

restart:
	$(COMPOSE) restart db
	$(MAKE) api-restart

down:
	$(COMPOSE) down

logs-api:
	$(COMPOSE) logs -f api

ps:
	$(COMPOSE) ps
