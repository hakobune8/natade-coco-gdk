import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { parse } from "yaml";
import { validateGameManifest } from "@natadecoco/game-schema";
import type { EmptySessionPolicy, CreateSessionRequest } from "@natadecoco/protocol";

test("ships the empty-session schema and protocol together without opting the reference game in", () => {
  const manifest = parse(readFileSync("game.yaml", "utf8"));
  assert.equal(manifest.spec.session.emptySessionPolicy, undefined);
  assert.equal(validateGameManifest(manifest).valid, true);
  const policy: EmptySessionPolicy = "keep-alive";
  const request: CreateSessionRequest = { idempotencyKey: "example-request", emptySessionPolicy: policy };
  assert.equal(request.emptySessionPolicy, policy);
  manifest.spec.runtimeCompatibility = ">=1.1.0 <2.0.0";
  manifest.spec.session.joinPolicy = "while-playing";
  manifest.spec.session.emptySessionPolicy = policy;
  assert.equal(validateGameManifest(manifest).valid, true);
  manifest.spec.session.emptySessionPolicy = "forever";
  assert.equal(validateGameManifest(manifest).valid, false);
});
