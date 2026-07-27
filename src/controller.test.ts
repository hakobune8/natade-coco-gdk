import assert from "node:assert/strict";
import test from "node:test";

import { createControllerLifecycle } from "./controller.js";
import { endPlatformGame, platformControlHeartbeat, restartPlatformGame } from "./contract.js";

test("keeps a finished controller alive for a rematch and coalesces session termination", () => {
  let completions = 0;
  const lifecycle = createControllerLifecycle(() => { completions += 1; });
  lifecycle.onSessionState("finished");
  lifecycle.onSessionState("finished");
  assert.equal(completions, 0);
  lifecycle.onSessionState("terminated");
  lifecycle.onError({ retryable: false });
  assert.equal(completions, 1);
});

test("does not complete after a retryable reconnect path reaches finished", () => {
  let completions = 0;
  const lifecycle = createControllerLifecycle(() => { completions += 1; });
  lifecycle.onSessionState("playing");
  lifecycle.onError({ retryable: true });
  lifecycle.onSessionState("playing");
  lifecycle.onSessionState("finished");
  lifecycle.onSessionState("finished");
  assert.equal(completions, 0);
});

test("completes on a non-retryable SDK error", () => {
  let completions = 0;
  const lifecycle = createControllerLifecycle(() => { completions += 1; });
  lifecycle.onError({ retryable: true });
  assert.equal(completions, 0);
  lifecycle.onError({ retryable: false });
  assert.equal(completions, 1);
});

test("keeps the platform control lease alive while the game controller is open", async () => {
  let endpoint = "";
  let init: RequestInit | undefined;
  const state = await platformControlHeartbeat(async (path, options) => {
    endpoint = String(path);
    init = options;
    return new Response(JSON.stringify({ mode: "playing", role: "organizer", hasLease: true }), { status: 200, headers: { "Content-Type": "application/json" } });
  });
  assert.deepEqual(state, { mode: "playing", role: "organizer", hasLease: true });
  assert.equal(endpoint, "/launcher-api/v1/control/heartbeat");
  assert.equal(init?.method, "POST");
  assert.equal(init?.credentials, "same-origin");
});

test("rejects an invalid platform heartbeat response", async () => {
  await assert.rejects(platformControlHeartbeat(async () => new Response(JSON.stringify({ mode: "unknown" }), { status: 200 })), /invalid platform heartbeat/u);
});

test("uses organizer-authorized platform lifecycle endpoints", async () => {
  const calls: string[] = [];
  const fetcher = async (input: string | URL | Request): Promise<Response> => {
    calls.push(String(input));
    if (String(input).endsWith("/restart")) {
      return new Response(JSON.stringify({ session: { state: "playing", runId: "run-2" } }), { status: 200, headers: { "Content-Type": "application/json" } });
    }
    return new Response(null, { status: 204 });
  };
  assert.deepEqual(await restartPlatformGame(fetcher), { state: "playing", runId: "run-2" });
  await endPlatformGame(fetcher);
  assert.deepEqual(calls, ["/launcher-api/v1/control/restart", "/launcher-api/v1/control/end"]);
});
