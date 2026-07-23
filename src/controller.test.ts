import assert from "node:assert/strict";
import test from "node:test";

import { completeControllerRun, createControllerLifecycle } from "./controller.js";

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

test("releases the platform Controller surface before returning home", async () => {
  const requests: Array<{ path: string; init: RequestInit | undefined }> = [];
  const navigation: string[] = [];
  await completeControllerRun(async (path, init) => {
    requests.push({ path: String(path), init });
    return new Response(null, { status: 204 });
  }, (path) => navigation.push(path));
  assert.equal(requests[0]?.path, "/launcher-api/v1/control/complete");
  assert.equal(requests[0]?.init?.method, "POST");
  assert.equal(requests[0]?.init?.credentials, "same-origin");
  assert.deepEqual(navigation, ["/control"]);
});

test("absorbs completion failure and returns home without an unhandled rejection", async () => {
  const navigation: string[] = [];
  await completeControllerRun(async () => { throw new Error("offline"); }, (path) => navigation.push(path));
  assert.deepEqual(navigation, ["/control"]);
});
