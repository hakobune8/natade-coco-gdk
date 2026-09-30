import assert from "node:assert/strict";
import test from "node:test";
import { GAME_ID, parseLaunchContext, platformSession } from "./contract.js";

test("accepts only the game-bound display launch context", () => {
  assert.deepEqual(parseLaunchContext(`?sessionId=session_01&gameId=${GAME_ID}`), { sessionId: "session_01", gameId: GAME_ID });
  assert.equal(parseLaunchContext("?sessionId=bad/value&gameId=other"), null);
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
