import assert from "node:assert/strict";
import test from "node:test";

import { createControllerLifecycle, platformControlHeartbeat } from "./controller.js";

test("coalesces duplicate terminal notifications into one completion", () => {
  let completions = 0;
  const lifecycle = createControllerLifecycle(() => { completions += 1; });
  lifecycle.onSessionState("finished");
  lifecycle.onSessionState("finished");
  lifecycle.onSessionState("terminated");
  lifecycle.onError({ retryable: false });
  assert.equal(completions, 1);
});

test("completes once after a retryable reconnect path reaches finished", () => {
  let completions = 0;
  const lifecycle = createControllerLifecycle(() => { completions += 1; });
  lifecycle.onSessionState("playing");
  lifecycle.onError({ retryable: true });
  lifecycle.onSessionState("playing");
  lifecycle.onSessionState("finished");
  lifecycle.onSessionState("finished");
  assert.equal(completions, 1);
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
  const mode = await platformControlHeartbeat(async (path, options) => {
    endpoint = String(path);
    init = options;
    return new Response(JSON.stringify({ mode: "playing" }), { status: 200, headers: { "Content-Type": "application/json" } });
  });
  assert.equal(mode, "playing");
  assert.equal(endpoint, "/launcher-api/v1/control/heartbeat");
  assert.equal(init?.method, "POST");
  assert.equal(init?.credentials, "same-origin");
});

test("rejects an invalid platform heartbeat response", async () => {
  await assert.rejects(platformControlHeartbeat(async () => new Response(JSON.stringify({ mode: "unknown" }), { status: 200 })), /invalid platform heartbeat/u);
});
