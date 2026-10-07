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

Prerequisites are Node.js 22+, pnpm 10.14.0, and Go 1.26.7+. Docker is
required only for the container build. See the complete
[Getting Started guide](docs/getting-started.md) if this is your first game.

## Open the local previews

- Display: `http://127.0.0.1:5176/games/gdk-reference/display?preview=display`
- Result: `http://127.0.0.1:5176/games/gdk-reference/display?preview=result`
- Controller: `http://127.0.0.1:5176/games/gdk-reference/controller?preview=controller`

Open Display and Controller together to see directional and ACTION inputs on Display. Add `&slot=1` through `&slot=4` to open multiple Controllers. Vite's development WebSocket relays the inputs.
For another device on a trusted local network, run `make dev HOST=0.0.0.0` and replace `127.0.0.1` in the URLs with the development machine's LAN address.

Preview mode needs no Edge node and is available only in the development build.
Production pages accept launch credentials from the natadeCOCO Launcher and
Join Page; credentials are never placed in URLs.

## Start editing

| File | Purpose |
| --- | --- |
| `src/display.ts` | Game state, large-screen rendering, score, and result flow |
| `src/controller.ts` | Development input preview; production controls are owned by Platform |
| `src/styles.css` | Display and responsive phone layout |
| `game.yaml` | Players, duration, browser features, routes, and compatibility |
| `src/contract.test.ts` | Display launch and Platform session observation tests |
| `src/controller.test.ts` | Platform route and credential ownership contract tests |

The starter uses simple Canvas/CSS visuals so you can replace the game without
untangling platform code. Read [Developing a game](docs/game-development.md) for
the SDK mental model, manifest rules, mobile-browser guidance, and boundaries.
The result screen stays game-owned: only the active organizer sees Play again
and End game, while the platform validates the lease and creates a fresh run
for a rematch.

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
RuntimeClass selection, and rollout approval remain operator actions. The Platform-owned `/controller/` consumes the same-tab Launcher handoff and
provides common lifecycle operations; game routes only redirect there. See
[Developing a game](docs/game-development.md) and
[Release handoff](docs/release-handoff.md). Source, workflow, dependency, and
release requirements are defined by the
[supply-chain security contract](docs/supply-chain-security-contract.md); use
the [migration guide](docs/supply-chain-security-migration.md) for an existing
game.

## Update the platform contract

Protocol, Controller SDK, Display SDK, and Game Schema must move as one tested
set. From clean game and `natade-coco-edge` checkouts:

```bash
make update-platform PLATFORM_SOURCE=../natade-coco-edge
git diff -- vendor package.json pnpm-lock.yaml
```

The command validates an offline candidate before changing the game and records
the exact source Git SHA and archive checksums in `vendor/platform-set.json`.
The release handoff also generates a machine-readable attestation that binds the
published image digest to this exact GDK and platform set; see
[`docs/release-handoff.md`](docs/release-handoff.md).
Review the complete change in one pull request.

## Maintain dependencies

Normal minor/patch updates are grouped separately for npm, Go, and GitHub
Actions. Major and security updates stay individual. The shared SDK set and
current Trivy/SBOM Actions follow the exceptions and checks in
[Dependency maintenance](SECURITY.md#dependency-maintenance).

The common grouping configuration originates in
`natade-coco-edge/game-platform/developer-kit/template/.github/dependabot.yml`.
This copy is synchronized from Edge revision
`e5124c0f0c7479978c99fbbc501871a8775bfd0a`. Future changes are reviewed in Edge's
generator first, then applied to this repository in a separate configuration PR.
Preserve this GDK's existing security contract and CI during synchronization;
its scanner, fixtures, and source-security/CodeQL jobs are ahead of the generator
starter. The grouping change does not synchronize that older starter's security
contract.

A new **Use this template** repository inherits these files. Existing games do
not receive later template changes automatically; apply reviewed settings in
an individual PR using the [migration guide](docs/supply-chain-security-migration.md#maintain-dependabot-settings).
Do not regenerate or overwrite an existing game to synchronize configuration.

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

For a breaking SDK change, edit the game sources and run
`node scripts/update-platform.mjs <edge-path> --with-working-tree`. The updater
validates the edited game and all four new archives together before replacing
the vendor set. The platform source must remain clean.
