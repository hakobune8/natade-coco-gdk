# Developing a natadeCOCO game

## Runtime mental model

The Display SDK subscribes to players, session state, and latest controller
input. The Controller SDK handles authenticated WebSocket connection, sequence,
input scheduling, heartbeat, and reconnect. Game code maps semantic input to
game rules and submits one idempotent result for the active run.

Do not build a second room, token, player-slot, or WebSocket system inside the
game container. Doing so breaks Launcher, reconnect, observability, and rollout
contracts.

## Manifest first

Keep `game.yaml` accurate as behavior changes:

- `players`: the tested minimum and maximum;
- `controllerProfile`: one of the supported semantic profiles;
- `orientation`: the layouts the Controller actually supports;
- `browserFeatures.required`: only features without which the game cannot run;
- `browserFeatures.optional`: features that degrade safely;
- session duration and result time: values owned by the game and covered by
  tests;
- `runtimeCompatibility`: the supported Runtime major range.

### Artwork contract

Games may provide Launcher-owned presentation metadata without giving the
Launcher executable markup:

```yaml
presentation:
  catalogArtworkPath: /games/my-game/assets/catalog.webp
  lobbyArtworkPath: /games/my-game/assets/lobby.webp
  accentColor: "#56D6B8"
```

Artwork must be a bundled AVIF, JPEG, PNG, or WebP file below the exact
`/games/<game-id>/assets/` route. `catalogArtworkPath` should use a 16:9-safe
composition; `lobbyArtworkPath` should remain readable beneath left and bottom
status overlays. The Launcher renders a deterministic fallback when the block
is absent. SVG, remote URLs, HTML, and CSS values other than the six-digit
accent color are rejected.

`make validate` rejects unknown fields, route drift, version drift, incomplete
platform sets, and release metadata mismatches.

## Display rules

- Design for 1920×1080, but keep layout stable at smaller development sizes.
- Rebuild from the SDK snapshot after reload or reconnect.
- Keep game completion idempotent and bound to the current run.
- Schedule the gameplay deadline from the wall clock independently of rendering
  or `requestAnimationFrame`, then submit `finishGame` exactly once. The Runtime
  does not turn `gameDurationSeconds` into a normal gameplay timeout; a game's
  `finishGame` call is the authority for normal completion.
- Return to the Launcher through the supported result/lifecycle flow.
- Do not expose internal error details to players.

## Controller rules

- Use the provided Controller Profile semantics before inventing raw messages.
- Make touch targets large and prevent scroll and text selection during play.
- Respect safe areas and test portrait and landscape where declared.
- Treat vibration, Wake Lock, orientation, and fullscreen as optional features.
- Never put a token or reconnect handle in a URL or localStorage.
- Treat `/control` as the stable platform entry. The Launcher consumes the
  catalog lease, creates or reconnects the player, stores one short-lived
  handoff in `sessionStorage`, and navigates to the exact game Controller path.
- Keep calling the platform control heartbeat while the game Controller is
  open. This preserves the organizer lease across the game route.
- On `finished`, `terminated`, or terminal `error`, disable game input and keep
  the result state visible. The physical Display owns the result dwell and
  platform completion. Return to `/control` only after the heartbeat reports a
  mode other than `playing`; do not invent a second lobby or home route.

This v1 top-level handoff intentionally lets the game Controller use the
Controller SDK directly. A sandboxed iframe/message bridge is a possible
future security boundary, not a requirement of this contract.

## Offline and security boundary

An offline-capable game bundles every script, font, image, and sound needed
during play. The game Pod has no Kubernetes API credentials, platform Secret,
host namespace, or game-to-game network requirement. The release container runs
non-root with a read-only filesystem and no Linux capabilities through the
shared platform Chart.

Persistent Spot progress is also a future platform capability. A game may
submit only the normal bounded run result today; it must not retain platform
credentials, call Kubernetes, or write directly to a central database. A
future Results SDK will own trusted `spotId`, idempotent `runId`, durable outbox,
and synchronization semantics.

## Testing strategy

Unit-test game rules separately from SDK transport. Contract tests cover launch
context and one-time Controller handoff. Add browser tests for behavior that
depends on layout, touch, reload, or reconnect. UI changes require a contact
sheet; latency, device, and offline claims require evidence from the relevant
environment.
