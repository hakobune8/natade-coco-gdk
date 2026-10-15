# Developing a natadeCOCO game

## Runtime mental model

Displayのゲーム状態の正本はブラウザメモリにある。共通Display SDKが
`natadecoco-display-state` v1へgameId / sessionId / runId単位で保存し、
所有権、初期化、復元、保存の直列化、再接続、必要ビューの公開と同期完了を管理する。
ゲームはStateAdapterに初期状態、ルール、形式検証、ビュー生成を定義する。
保存が欠けたり壊れたりしたrunを新規ゲームとして続行しない。

Controllerは共通state/eventを使う。`sendInput`は標準入力の共通stateヘルパーで、
独立した旧通信経路を追加しない。スターターはこの標準入力を使い、独自UIは
契約2の限定クライアントからゲーム固有の `sendEvent` / `sendState` を呼べる。
ゲーム固有のサーバーが正本を持つ場合はそれを維持し、再取得できるデータを
Displayに二重保存しない。

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
- omit `session.joinPolicy` to accept new players only before start; games that
  safely initialize a new player during an active run may opt in with
  `joinPolicy: while-playing`;
- `runtimeCompatibility`: the supported Runtime major range.

For intermittent visitors, see the independent
[empty-session lifecycle policy](empty-session-policy.md). The reference game's
default remains termination after every disconnected player expires.

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
- 復元と同期完了を待って描画し、同一Displayの通信再接続で最新メモリを巻き戻さない。
- Keep game completion idempotent and bound to the current run.
- Schedule the gameplay deadline from the wall clock independently of rendering
  or `requestAnimationFrame`, then submit `finishGame` exactly once. The Runtime
  does not turn `gameDurationSeconds` into a normal gameplay timeout; a game's
  `finishGame` call is the authority for normal completion.
- Rankings require unique player IDs, but multiple players may share the same
  rank. Cooperative games may report every participant as rank 1.
- Return to the Launcher through the supported result/lifecycle flow.
- Do not expose internal error details to players.

## Controller rules

- Declare `controllerImplementation`. The starter uses `platform-profile` with
  `directional-pad`; use `game-module` v2 for custom controls.
- Launcher and Join Page pass the validated same-tab handoff to `/controller/`.
  Game routes only redirect there and never consume or refresh credentials.
- A custom module receives `ControllerUIModuleContextV2` and renders into its
  content element using the restricted `GameUIControllerClientV2`. Release UI
  subscriptions in `destroy()` and consume `onPlatformSnapshot` for presentation.
- Platform owns the frame, heartbeat, WSS/WebRTC, host operations, reconnect,
  orientation, and session return. Game modules do not start those operations.
- Use the supported profile semantics, large touch targets, and safe areas.
  Test declared orientations. Vibration and other browser features are optional.
- Never put credentials in a URL or localStorage. The module has no token.
- On `finished`, disable game input. Platform exposes authorized rematch/end
  actions and creates a fresh run ID. Reset Display game state for the new run.
- The local preview renders controls against the SDK's development input facade;
  it does not mount a production Shell or emulate organizer authority.

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
context and the UI/input ownership boundary. Add browser tests for behavior that
depends on layout, touch, reload, or reconnect. UI changes require a contact
sheet; latency, device, and offline claims require evidence from the relevant
environment.
