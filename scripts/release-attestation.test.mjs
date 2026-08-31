import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import test from "node:test";
import { createAttestation, verifyAttestation } from "./release-attestation.mjs";

const digest = `sha256:${"a".repeat(64)}`;
const sourceRevision = "b".repeat(40);

test("generates an Edge-consumable release attestation", () => {
  const attestation = createAttestation({
    imageRepository: "ghcr.io/example/example-game",
    imageDigest: digest,
    sourceRevision
  });

  assert.equal(attestation.schemaVersion, 1);
  assert.equal(attestation.game.version, "0.9.0");
  assert.equal(attestation.game.source.revision, sourceRevision);
  assert.equal(attestation.image.digest, digest);
  assert.equal(attestation.gdk.version, "0.9.0");
  assert.equal(attestation.gdk.securityContract.version, "1.0.0");
  assert.match(attestation.gdk.securityContract.sha256, /^[0-9a-f]{64}$/);
  assert.equal(attestation.gdk.platformSet.sha256,
    createHash("sha256").update(readFileSync("vendor/platform-set.json")).digest("hex"));
  assert.deepEqual(verifyAttestation(attestation), attestation);
});

test("rejects a release attestation edited after generation", () => {
  const attestation = createAttestation({
    imageRepository: "ghcr.io/example/example-game",
    imageDigest: digest,
    sourceRevision
  });
  attestation.gdk.version = "0.6.2";
  assert.throws(() => verifyAttestation(attestation), /does not match this release source/);
});
