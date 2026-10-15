# Changelog

All notable changes to this game repository are recorded here. Releases use SemVer.

## [Unreleased]

## [0.11.2] - 2026-10-15

- Preserve unchanged optional OS/CPU dependencies and their exact locked closure
  during whole-set SDK updates; fail if the ordinary or retained optional graph changed.
- Adopt the shared clock freshness correction from reviewed Edge #924, merged at
  `d3439d288a8d1b9182ebbea919996fba63326f42`, and the final-view-before-finish
  ordering correction in reviewed Edge #925, merged at
  `8c1c0cf758518b294ef40316aac69bc9c7d6db79`, as one complete package set:
  Protocol/Display SDK/Schema 0.3.2 and Controller SDK 0.4.2.
  The published 0.11.0 release remains immutable.

## [0.11.0]

- Update the digest-pinned Go build image and CI toolchain to 1.26.9; retain
  vulnerability enforcement and print failed scan findings for diagnosis.

- Prepare 0.11.0 for Runtime 1.2 common game sync and Display recovery.
- Keep authoritative score and input deduplication in a game StateAdapter;
  delegate IndexedDB ownership, initialization, save ordering, reconnection,
  view publication and terminal recovery to the common Display SDK.
- Preserve the absolute run deadline and restore confirmed results read-only.
- Vendor all four SDK packages as one exact set from reviewed Edge PR #914,
  merged at `6c08ecfe5df3dc96ab146a59c4a26282455d9e82` (Protocol/Display SDK/Schema
  0.3.0, Controller SDK 0.4.0). Publication requires review and the matching GDK tag.

## [0.10.0]

- Pin the existing fast-uri override to 3.1.8 to pass the dependency audit.
- Prepare 0.10.0 for the Platform-owned Controller contract. Production game
  routes redirect to `/controller/` without reading participant credentials.
- Remove game-owned authentication, control heartbeat, organizer operations,
  connection chrome, and the legacy `controllerPath` Manifest field.
- Retain the local Controller input relay and Display scoring preview through
  the public development input facade; custom games receive bounded UI context.
- Update all four Platform packages together, with candidate validation of game
  edits supported by the explicit `--with-working-tree` migration option.

## [0.9.0]

- Record merged Edge PR #746 as the platform set source revision; the four
  vendored package archives are unchanged from the reviewed candidate.
- Prepare 0.9.0 with the additive `emptySessionPolicy` contract: explicit
  `keep-alive` keeps an empty playing session, while omitted/`terminate`
  preserves the existing behavior.
- Refresh all four vendored Platform packages together; document Runtime 1.1
  rollout prerequisites and independent player-slot expiry.
- Pin the complete set to merged upstream revision
  `7d208c71f4300083dc5822c63e5b0897dd97315f`; package archive checksums are
  unchanged from the tested candidate.
- Publication and hardware acceptance remain pending.

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
