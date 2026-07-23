import assert from "node:assert/strict";
import test from "node:test";

import { completeControllerRun } from "./controller.js";

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

test("returns home even when completion acknowledgement is unavailable", async () => {
  const navigation: string[] = [];
  await assert.rejects(completeControllerRun(async () => { throw new Error("offline"); }, (path) => navigation.push(path)));
  assert.deepEqual(navigation, ["/control"]);
});
