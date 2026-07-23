import assert from "node:assert/strict";
import test from "node:test";
import { CONTROLLER_HANDOFF_KEY, CONTROLLER_PATH, GAME_ID, completeDisplayRun, consumeControllerHandoff, parseLaunchContext } from "./contract.js";

test("accepts only the game-bound display launch context", () => {
  assert.deepEqual(parseLaunchContext(`?sessionId=session_01&gameId=${GAME_ID}`), { sessionId: "session_01", gameId: GAME_ID });
  assert.equal(parseLaunchContext("?sessionId=bad/value&gameId=other"), null);
});

test("consumes one exact same-origin Controller handoff", () => {
  const expires = new Date(Date.now() + 60_000).toISOString();
  let stored: string | null = JSON.stringify({ sessionId: "session_01", playerId: "player_01", slot: 2, displayName: "Player 2", token: "a-valid-player-token", tokenExpiresAt: expires, controllerUrl: CONTROLLER_PATH });
  const storage = { getItem: (key: string) => key === CONTROLLER_HANDOFF_KEY ? stored : null, removeItem: () => { stored = null; } };
  assert.equal(consumeControllerHandoff(storage, Date.now(), "https://edge.example.invalid")?.slot, 2);
  assert.equal(stored, null);
});

test("lets only the physical display complete the platform run", async () => {
  let endpoint = "";
  await completeDisplayRun(async (input, init) => {
    endpoint = String(input);
    assert.equal(init?.method, "POST");
    assert.equal(init?.credentials, "same-origin");
    return new Response(null, { status: 204 });
  });
  assert.equal(endpoint, "/launcher-api/v1/session/display-complete");
});
