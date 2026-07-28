import assert from "node:assert/strict";
import test from "node:test";
import { CONTROLLER_HANDOFF_KEY, CONTROLLER_PATH, GAME_ID, clearControllerHandoff, consumeControllerHandoff, parseLaunchContext, persistRefreshedControllerToken, platformSession, type ControllerHandoff } from "./contract.js";

test("accepts only the game-bound display launch context", () => {
  assert.deepEqual(parseLaunchContext(`?sessionId=session_01&gameId=${GAME_ID}`), { sessionId: "session_01", gameId: GAME_ID });
  assert.equal(parseLaunchContext("?sessionId=bad/value&gameId=other"), null);
});

test("retains one exact same-origin Controller handoff for same-tab reload", () => {
  const expires = new Date(Date.now() + 60_000).toISOString();
  let stored: string | null = JSON.stringify({ sessionId: "session_01", playerId: "player_01", slot: 2, displayName: "Player 2", token: "a-valid-player-token", tokenExpiresAt: expires, controllerUrl: CONTROLLER_PATH });
  const storage = { getItem: (key: string) => key === CONTROLLER_HANDOFF_KEY ? stored : null, removeItem: () => { stored = null; } };
  assert.equal(consumeControllerHandoff(storage, Date.now(), "https://edge.example.invalid")?.slot, 2);
  assert.notEqual(stored, null);
  assert.equal(consumeControllerHandoff(storage, Date.now(), "https://edge.example.invalid")?.playerId, "player_01");
  clearControllerHandoff(storage);
  assert.equal(stored, null);
});

test("persists refreshed credentials for a later same-tab reload", () => {
  const expires = new Date(Date.now() + 60_000).toISOString();
  const handoff: ControllerHandoff = { sessionId: "session_01", playerId: "player_01", slot: 2, displayName: "Player 2", token: "a-valid-player-token", tokenExpiresAt: expires, controllerUrl: CONTROLLER_PATH };
  let stored = "";
  persistRefreshedControllerToken({ setItem: (_key, value) => { stored = value; } }, handoff, "refreshed-player-token", expires);
  assert.equal(JSON.parse(stored).token, "refreshed-player-token");
});

test("reads the platform run without exposing operator credentials", async () => {
  let endpoint = "";
  const state = await platformSession(async (input, init) => {
    endpoint = String(input);
    assert.equal(init?.credentials, "same-origin");
    return new Response(JSON.stringify({ session: { state: "finished", runId: "run-1" } }), { status: 200, headers: { "Content-Type": "application/json" } });
  });
  assert.deepEqual(state, { state: "finished", runId: "run-1" });
  assert.equal(endpoint, "/launcher-api/v1/session");
});
