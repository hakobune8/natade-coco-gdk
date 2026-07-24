# Changelog

All notable changes to this game repository are recorded here. Releases use SemVer.

## [Unreleased]

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
