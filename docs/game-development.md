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
- session duration and result time: values covered by tests;
- `runtimeCompatibility`: the supported Runtime major range.

`make validate` rejects unknown fields, route drift, version drift, incomplete
platform sets, and release metadata mismatches.

## Display rules

- Design for 1920×1080, but keep layout stable at smaller development sizes.
- Rebuild from the SDK snapshot after reload or reconnect.
- Keep game completion idempotent and bound to the current run.
- Return to the Launcher through the supported result/lifecycle flow.
- Do not expose internal error details to players.

## Controller rules

- Use the provided Controller Profile semantics before inventing raw messages.
- Make touch targets large and prevent scroll and text selection during play.
- Respect safe areas and test portrait and landscape where declared.
- Treat vibration, Wake Lock, orientation, and fullscreen as optional features.
- Never put a token or reconnect handle in a URL or localStorage.

## Offline and security boundary

An offline-capable game bundles every script, font, image, and sound needed
during play. The game Pod has no Kubernetes API credentials, platform Secret,
host namespace, or game-to-game network requirement. The release container runs
non-root with a read-only filesystem and no Linux capabilities through the
shared platform Chart.

## Testing strategy

Unit-test game rules separately from SDK transport. Contract tests cover launch
context and one-time Controller handoff. Add browser tests for behavior that
depends on layout, touch, reload, or reconnect. UI changes require a contact
sheet; latency, device, and offline claims require evidence from the relevant
environment.
