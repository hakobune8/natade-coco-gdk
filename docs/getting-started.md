# Getting Started

This guide takes a game developer from GitHub Template creation to a local
Display and Controller preview. No Edge node or platform service is required.

## 1. Create an independent repository

Choose **Use this template** on the GDK repository. Select Public or Private,
create the repository under your account or organization, and clone it. A
Template repository has independent history; do not use Fork for a private game.

## 2. Initialize once

From the clean clone, choose a DNS-label game ID and run:

```bash
make init-game \
  GAME_ID=my-new-game \
  DISPLAY_NAME="My New Game" \
  DESCRIPTION="A short catalog description" \
  REPOSITORY=https://github.com/example/natade-coco-game-my-new-game
```

The initializer updates the manifest, routes, package, tests, container labels,
Go module, Chart, and Fleet example together. Commit the result. A second run is
rejected by design.

## 3. Verify the untouched starter

```bash
make setup
make validate
make test
make lint
make build
```

Fix tool-version or environment problems before changing game code. This gives
you a known-good baseline for later pull requests.

## 4. Preview all three states

Run `make dev`, then open the Display, Result, and Controller URLs listed in the
README. These development-only states use no real session or credential. Check
both portrait and landscape phone layouts before adding game logic.

## 5. Make the first game change

Start with `src/display.ts` and its tests. Keep input semantics in
`src/controller.ts`, declare real player and browser requirements in `game.yaml`,
and keep platform authentication inside the SDK clients.

Run `make validate test lint build` for every pull request. For visible UI
changes, attach a contact sheet showing relevant Display and Controller states.

Next: [Developing a game](game-development.md).
