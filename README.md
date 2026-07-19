# natadeCOCO GDK Reference

[日本語](README.ja.md) | English

Build a natadeCOCO multiplayer web game that runs on a shared large display and
uses players' phones as browser-based controllers. This repository is a game
starter: it includes the SDK integration, manifest, tests, container build, and
deployment handoff needed for one independently versioned game.

You do not need to implement room management, player authentication, reconnect,
or WebSocket routing in each game. Those responsibilities stay in the
natadeCOCO platform and SDKs.

## Create your game

1. Select **Use this template** on GitHub and create a new Public or Private
   repository. Do not use Fork if the game may be private.
2. Clone the new repository.
3. Initialize its identity once from a clean checkout:

   ```bash
   make init-game \
     GAME_ID=my-new-game \
     DISPLAY_NAME="My New Game" \
     REPOSITORY=https://github.com/example/natade-coco-game-my-new-game
   ```

4. Install and verify the starter:

   ```bash
   make setup
   make validate
   make test
   make lint
   make build
   make dev
   ```

Prerequisites are Node.js 22+, pnpm 10.14.0, and Go 1.25.12+. Docker is
required only for the container build. See the complete
[Getting Started guide](docs/getting-started.md) if this is your first game.

## Open the local previews

- Display: `http://127.0.0.1:5176/games/gdk-reference/display?preview=display`
- Result: `http://127.0.0.1:5176/games/gdk-reference/display?preview=result`
- Controller: `http://127.0.0.1:5176/games/gdk-reference/controller?preview=controller`

Preview mode needs no Edge node and is available only in the development build.
Production pages accept launch credentials from the natadeCOCO Launcher and
Join Page; credentials are never placed in URLs.

## Start editing

| File | Purpose |
| --- | --- |
| `src/display.ts` | Game state, large-screen rendering, score, and result flow |
| `src/controller.ts` | Phone controls and Controller Profile labels |
| `src/styles.css` | Display and responsive phone layout |
| `game.yaml` | Players, duration, browser features, routes, and compatibility |
| `src/contract.test.ts` | Game-specific launch and handoff contract tests |

The starter uses simple Canvas/CSS visuals so you can replace the game without
untangling platform code. Read [Developing a game](docs/game-development.md) for
the SDK mental model, manifest rules, mobile-browser guidance, and boundaries.

## Validate and release

Before handing a version to a platform operator, run:

```bash
make setup
make validate
make test
make lint
make build
make container-build
```

Provide the operator with the SemVer version, reviewed Git SHA, immutable image
digest, SBOMs, vulnerability result, and a contact sheet for visible UI changes.
Publishing an image does not deploy it. Fleet targeting, Registry values,
RuntimeClass selection, and rollout approval remain operator actions. See
[Release handoff](docs/release-handoff.md).

## Update the platform contract

Protocol, Controller SDK, Display SDK, and Game Schema must move as one tested
set. From clean game and `natade-coco-games` checkouts:

```bash
make update-platform PLATFORM_SOURCE=../natade-coco-games
git diff -- vendor package.json pnpm-lock.yaml
```

The command validates an offline candidate before changing the game and records
the exact source Git SHA and archive checksums in `vendor/platform-set.json`.
Review the complete change in one pull request.

## Scope and help

This repository does not install or operate k3s, Fleet, DNS, TLS, Wi-Fi,
Launcher, Session Manager, Realtime Gateway, or Game Catalog. You can develop
and preview a game without those services; an operator supplies them for an
integrated deployment.

- Setup problem: [Troubleshooting](docs/troubleshooting.md)
- Bug or reusable improvement: use the repository Issue forms
- Security concern: follow [SECURITY.md](SECURITY.md), never a public issue
- Contribution: read [CONTRIBUTING.md](CONTRIBUTING.md)
- Supported scope: read [SUPPORT.md](SUPPORT.md)

Licensed under Apache-2.0. OCI source label: `https://github.com/hakobune8/natade-coco-gdk`.
