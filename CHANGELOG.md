# Changelog

All notable changes to this game repository are recorded here. Releases use SemVer.

## [Unreleased]

## [0.8.0] - 2026-08-28

- Add the opt-in transient WebRTC input contract without changing the reliable
  WebSocket `sendInput()` and `onInput()` state-synchronization semantics.
- Expose `sendTransientInput()` to Controllers, `onTransientInput()` to
  Displays, and `transientInputAvailable` in SDK connection state.
- Add the bounded `input.transient` and `input.transient.received` protocol
  envelopes used by the authenticated Realtime Gateway data plane.
- Refresh the complete vendored platform set from reviewed Edge revision
  `5f6821cf2f9f6d95699d602d21e632d54b2c0957`.

## [0.7.1] - 2026-08-24

- Update the reference toolchain to TypeScript 7.0.2, Vite 8.2.2, tsx 4.23.12,
  Node.js types 26.2.0, and yaml 2.9.0.
- Refresh pinned GitHub Actions for checkout, pnpm, Buildx, Trivy, and CodeQL.
- Keep CodeQL initialization and analysis on the same v4.37.8 revision.

## [0.7.0] - 2026-08-24

- Define supply-chain security contract 1.0.0 with machine-verifiable Unicode,
  workflow, runner, permission, lifecycle-script, and lockfile controls.
- Gate validation, CodeQL, dependency audit, image/SBOM checks, and release
  attestation behind source-security validation.
- Bind release attestations to the exact security contract version and SHA-256.
- Add migration, Ruleset, CODEOWNERS, and Dependabot guidance for compatible
  game repositories.
- Update Vite and vulnerable transitive packages until the moderate dependency
  audit is clean.
- Build the reference image with the digest-pinned Go 1.26.7 security release.
- Update the compatible platform set so a newly joined player safely replaces
  a disconnected slot owner after reconnect grace expiry while connected-owner
  conflicts remain fatal.

## [0.6.3] - 2026-07-31

- Stop a superseded Controller connection from reconnecting so the newest
  browser tab retains the player connection.
- Preserve reconnect recovery for stale input epochs and other transient
  transport failures.
- Update the vendored Platform set to the merged Edge Controller SDK revision.

## [0.6.2] - 2026-07-31

- Update the vendored Platform set for game-scoped `session.joinPolicy`.
- Document that active-run joins remain opt-in and default to pre-start only.

## [0.6.1] - 2026-07-28

- Retain the validated, short-lived Controller handoff in same-tab session
  storage so reload restores the same player.
- Persist refreshed player tokens back to that handoff and clear it on explicit
  platform return, expiry, or validation failure.
- Update the vendored platform SDK set for reload-safe Controller recovery.

## [0.6.0] - 2026-07-27

- Let the active organizer restart a finished game or end an active or finished
  game from the game Controller.
- Preserve the session, room, and player roster across rematches while creating
  a fresh run ID.
- Keep finished Controller and Display connections available for rematch and
  reconnect.
- Extend the result fail-safe window to one minute.
- Update the vendored platform SDK set to the organizer-owned game lifecycle
  contract.

## [0.5.0] - 2026-07-24

- Allow cooperative games to submit tied rankings such as all players at rank 1.
- Update the vendored platform SDK set to the tied-ranking Edge contract.

## [0.4.0] - 2026-07-24

- Make the game `finishGame` call the sole authority for normal completion.
- Schedule the reference game's deadline independently from animation frames.
- Update the compatible Edge source revision for the finish-authority contract.

## [0.3.0] - 2026-07-23

- Keep the platform organizer lease alive while a game Controller is open.
- Make the physical Display own result dwell and platform run completion.
- Return Controllers to `/control` only after the platform leaves `playing`.

## [0.2.0] - 2026-07-23

- Added the bounded catalog/lobby artwork manifest contract.
- Added one-time Controller handoff completion and stable `/control` return.
- Completed Controller runs on non-retryable SDK errors without leaking
  completion acknowledgement failures to the browser.
- Updated the compatible platform set from the integrated `natade-coco-edge`
  source layout.

## [0.1.0] - 2026-07-19

- Added the runnable Display and Controller starter.
- Added one-time game identity initialization for Template descendants.
- Added exact Protocol, Controller SDK, Display SDK, and Game Schema archives.
- Added atomic compatible-set updates with revision and checksum verification.
- Added Helm/Fleet handoff examples, hardened container build, CI, SBOM, and
  vulnerability scanning.
