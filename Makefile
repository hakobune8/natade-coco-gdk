SHELL := /usr/bin/env bash
.DEFAULT_GOAL := help
PNPM ?= pnpm

.PHONY: help init-game update-platform setup lint test validate release-check build dev container-build clean

help: ## Show targets
	@awk 'BEGIN {FS = ":.*## "; printf "Usage: make <target>\n\n"} /^[a-zA-Z_-]+:.*## / {printf "  %-16s %s\n", $$1, $$2}' $(MAKEFILE_LIST)

init-game: ## Initialize a reference-template descendant (GAME_ID and REPOSITORY required)
	@test -n "$(GAME_ID)" -a -n "$(REPOSITORY)" || { echo 'ERROR: GAME_ID and REPOSITORY are required' >&2; exit 1; }
	@node scripts/init-game.mjs "$(GAME_ID)" --repository "$(REPOSITORY)" $(if $(DISPLAY_NAME),--display-name "$(DISPLAY_NAME)") $(if $(DESCRIPTION),--description "$(DESCRIPTION)")

update-platform: ## Update SDK, Protocol, and Schema as one exact set (PLATFORM_SOURCE required)
	@test -n "$(PLATFORM_SOURCE)" || { echo 'ERROR: PLATFORM_SOURCE is required' >&2; exit 1; }
	@node scripts/update-platform.mjs "$(PLATFORM_SOURCE)"

setup: ## Install exact dependencies
	@test "$$($(PNPM) --version 2>/dev/null)" = '10.14.0' || { echo 'ERROR: pnpm 10.14.0 is required' >&2; exit 1; }
	@$(PNPM) install --frozen-lockfile

lint: ## Type-check TypeScript and vet the static server
	@$(PNPM) typecheck
	@test -z "$$(gofmt -l server)" || { gofmt -d server; exit 1; }
	@cd server && GOWORK=off go vet ./...

test: ## Run game and server tests
	@$(PNPM) test
	@cd server && GOWORK=off go test ./...

validate: ## Validate Game Schema and package boundaries
	@$(PNPM) validate
	@$(MAKE) release-check

release-check: ## Validate release metadata, public documentation, and CI policy
	@node scripts/validate-release.mjs

build: ## Build browser assets and static server
	@$(PNPM) build
	@cd server && GOWORK=off go build -trimpath -o ../dist/static-web .

dev: ## Start the Display/Controller preview server
	@$(PNPM) dev

container-build: ## Build the immutable game image locally
	@docker build --build-arg VERSION=0.4.0 --build-arg REVISION=$$(git rev-parse HEAD 2>/dev/null || echo unknown) -t gdk-reference:0.4.0 .

clean: ## Remove generated build output
	@rm -r dist 2>/dev/null || true
