# natadeCOCO GDK Reference

[日本語ガイド](README.ja.md) | English

`gdk-reference` is an independently versioned natadeCOCO multiplayer web game.
It contains no Session Manager, Gateway, Catalog, Launcher, k3s, TLS, or Fleet
foundation code. The platform contract is limited to `game.yaml`, the
Controller/Display SDKs, Protocol v1, an immutable OCI image, and reviewed
deployment values.

When this repository is an uninitialized public reference, create a Public or
Private descendant with GitHub's **Use this template**, clone it, and run:

```bash
make init-game \
  GAME_ID=my-new-game \
  REPOSITORY=https://github.com/example/natade-coco-game-my-new-game
```

The command rewrites the manifest, routes, package, container, chart, tests, and
source label as one validated identity. It requires a clean working tree and is
permanently disabled after success. Normal generator output cannot run it. Do
not use Fork when private game development is required.

## Start here

Prerequisites: Node.js 22+, pnpm 10.14.0, Go 1.25.12+, and Docker for image
builds. The generated repository vendors exact SDK tarballs so the initial game
contract does not depend on an unpublished npm package.

```bash
make setup
make validate
make test
make lint
make build
make dev
```

Open the development previews:

- Display: `http://127.0.0.1:5176/games/gdk-reference/display?preview=display`
- Result: `http://127.0.0.1:5176/games/gdk-reference/display?preview=result`
- Controller: `http://127.0.0.1:5176/games/gdk-reference/controller?preview=controller`

Preview parameters are accepted only by the Vite development build. Production
pages require the Launcher Display ticket or one-time Controller handoff.

## What to edit

- `src/display.ts`: game state, rendering, score, finish/result behavior;
- `src/controller.ts`: Controller Profile wiring and game-specific labels;
- `src/styles.css`: kiosk and phone layout;
- `game.yaml`: player count, duration, browser features, capability declaration;
- `deploy/`: reviewed image digest, shared chart registry, and Fleet target.

Keep session/player authentication in the SDK and platform. Never place tokens
in URLs, logs, localStorage, screenshots, or game results. Do not call the k3s
API or mount platform Secrets into the game.

## SDK update

The `vendor/*.tgz` files and `vendor/platform-set.json` pin the exact platform
revision, versions, filenames, and SHA-256 checksums used by this game. From a
clean checkout of both repositories, update all four packages atomically:

```bash
make update-platform PLATFORM_SOURCE=../natade-coco-games
git diff -- vendor package.json pnpm-lock.yaml
```

The command builds and packs Protocol, Controller SDK, Display SDK, and Game
Schema from one clean platform Git revision. It validates the candidate in a
temporary copy with an offline frozen lockfile before changing this repository.
Review and commit the resulting compatible set; never copy one archive alone.

When the packages are published to an approved npm Registry, replace the local
archives with exact released versions; do not use ranges for a production game.

## Container and release

```bash
make container-build
```

The committed Registry, shared chart repository, digest, Fleet profile, and
GitHub owner are fail-closed placeholders. Publishing an image does not deploy
it. A platform operator verifies scan/SBOM/signature evidence, records the exact
digest, selects the target profile, and performs the session-aware rollout.

`sandbox.profile: standard` is for reviewed first-party games. Third-party
games require an Edge-accepted `hardened` RuntimeClass; there is no fallback.

Before a release, run `make release-check` and follow the
[release policy](docs/release-policy.md). Maintainers of the upstream reference
also use the [publication checklist](docs/publication-checklist.md) before
making the GitHub Template Repository public.

## CI

The generated workflow runs schema/package validation, tests, type checking,
browser/server builds, a non-root OCI build, SPDX/CycloneDX SBOM generation,
and a fixed HIGH/CRITICAL vulnerability gate. It does not push or deploy.

## Repository source

OCI source label: `https://github.com/hakobune8/natade-coco-gdk`
