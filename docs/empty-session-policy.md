# Empty-session lifecycle contract

Status: 0.9.0 release candidate; requires Runtime 1.1 or newer.

For installations with intermittent visitors, participation can fall to zero
while the experience remains active. Declare both policies independently:

```yaml
spec:
  runtimeCompatibility: ">=1.1.0 <2.0.0"
  session:
    joinPolicy: while-playing
    emptySessionPolicy: keep-alive
    waitingTimeoutSeconds: 300
    reconnectGraceSeconds: 30
    gameDurationSeconds: 60
    resultDisplaySeconds: 60
```

- Omitted or `terminate`: once all disconnected players expire, terminate the
  playing session. This remains the default for the reference game.
- `keep-alive`: remove expired players and free their slots but retain the same
  playing session, run and Display. New visitors join through the normal
  QR/Launcher/Controller handoff when `joinPolicy` allows it.
- These settings are operator-applied manifest policy, not participant input.
- Reconnect grace is still enforced; expired handles cannot resurrect old players.
- Waiting/result/error timeouts and explicit termination remain in effect.
- An empty playing session still blocks deployment. End it explicitly before
  maintenance; do not fake player connections or extend grace to keep it alive.

The game owns its own play timer; `gameDurationSeconds` is informational.
If a game deliberately keeps running without participants, it must expose an
appropriate operator end action and handle terminal Platform state on Display.
The policy is not a promise of recovery across Runtime restarts.

Before deployment, the operator must install compatible Catalog/schema, Launcher,
and Session Manager images together. Changing a version label alone is not an
upgrade. Verify the effective `emptySessionPolicy` in the session API response.
Do not deploy this manifest against a pre-1.1 Runtime.

Accept with a real full cycle: all players leave, grace expires, the same session
stays active, a fresh browser joins the freed slot, and explicit end returns the
Display to Launcher. Run the cycle more than once. CI does not replace hardware
acceptance.
