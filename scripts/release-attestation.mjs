#!/usr/bin/env node
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import process from "node:process";

const semver = /^(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)(?:-[0-9A-Za-z.-]+)?$/;
const revision = /^[0-9a-f]{40}$/;
const imageDigest = /^sha256:[0-9a-f]{64}$/;
const imageRepository = /^[a-z0-9.-]+(?::[0-9]+)?\/[a-z0-9._/-]+$/;

export function createAttestation(options, root = process.cwd()) {
  const packageJSON = json(root, "package.json");
  const marker = json(root, ".natadecoco-template.json");
  const gdkRelease = json(root, "vendor/gdk-release.json");
  const securityBytes = readFileSync(resolve(root, "config/supply-chain-security-contract.json"));
  const securityContract = JSON.parse(securityBytes.toString("utf8"));
  const platformBytes = readFileSync(resolve(root, "vendor/platform-set.json"));
  const platformSet = JSON.parse(platformBytes.toString("utf8"));
  const sourceRevision = options.sourceRevision ?? gitRevision(root);

  assert(marker.schemaVersion === 1 && marker.identity?.gameId, "game identity is invalid");
  assert(marker.identity.repository?.startsWith("https://github.com/"), "game source repository is invalid");
  assert(semver.test(packageJSON.version), "game version must be SemVer without v");
  validateGDKRelease(gdkRelease);
  assert(securityContract.schemaVersion === 1, "security contract schema is invalid");
  assert(semver.test(securityContract.contractVersion), "security contract version is invalid");
  assert(platformSet.schemaVersion === 1, "platform set schema is invalid");
  assert(platformSet.source?.repository?.startsWith("https://"), "platform source repository is invalid");
  assert(revision.test(platformSet.source?.revision), "platform source revision is invalid");
  assert(imageRepository.test(options.imageRepository ?? ""), "image repository must be an untagged OCI repository");
  assert(imageDigest.test(options.imageDigest ?? ""), "image digest must be an immutable sha256 digest");
  assert(revision.test(sourceRevision), "source revision must be a full Git SHA");

  return {
    schemaVersion: 1,
    game: {
      id: marker.identity.gameId,
      version: packageJSON.version,
      source: {
        repository: marker.identity.repository,
        revision: sourceRevision,
        tag: `v${packageJSON.version}`
      }
    },
    image: {
      repository: options.imageRepository,
      digest: options.imageDigest
    },
    gdk: {
      repository: gdkRelease.repository,
      version: gdkRelease.version,
      releaseTag: gdkRelease.releaseTag,
      securityContract: {
        version: securityContract.contractVersion,
        sha256: createHash("sha256").update(securityBytes).digest("hex")
      },
      platformSet: {
        repository: platformSet.source.repository,
        revision: platformSet.source.revision,
        sha256: createHash("sha256").update(platformBytes).digest("hex")
      }
    }
  };
}

export function verifyAttestation(attestation, root = process.cwd()) {
  exactKeys(attestation, ["schemaVersion", "game", "image", "gdk"], "attestation");
  exactKeys(attestation.game, ["id", "version", "source"], "game");
  exactKeys(attestation.game.source, ["repository", "revision", "tag"], "game source");
  exactKeys(attestation.image, ["repository", "digest"], "image");
  exactKeys(attestation.gdk, ["repository", "version", "releaseTag", "securityContract", "platformSet"], "GDK");
  exactKeys(attestation.gdk.securityContract, ["version", "sha256"], "security contract");
  exactKeys(attestation.gdk.platformSet, ["repository", "revision", "sha256"], "platform set");

  const expected = createAttestation({
    imageRepository: attestation.image.repository,
    imageDigest: attestation.image.digest,
    sourceRevision: attestation.game.source.revision
  }, root);
  assert(JSON.stringify(attestation) === JSON.stringify(expected), "attestation does not match this release source");
  return expected;
}

function validateGDKRelease(value) {
  exactKeys(value, ["schemaVersion", "repository", "version", "releaseTag"], "GDK release metadata");
  assert(value.schemaVersion === 1, "GDK release schema is invalid");
  assert(value.repository?.startsWith("https://github.com/"), "GDK repository is invalid");
  assert(semver.test(value.version ?? ""), "GDK version is invalid");
  assert(value.releaseTag === `v${value.version}`, "GDK release tag does not match its version");
}

function exactKeys(value, expected, label) {
  assert(value && typeof value === "object" && !Array.isArray(value), `${label} must be an object`);
  const actual = Object.keys(value).sort();
  assert(JSON.stringify(actual) === JSON.stringify([...expected].sort()), `${label} keys are invalid`);
}

function json(root, path) {
  return JSON.parse(readFileSync(resolve(root, path), "utf8"));
}

function gitRevision(root) {
  try {
    return execFileSync("git", ["rev-parse", "HEAD"], { cwd: root, encoding: "utf8" }).trim();
  } catch {
    throw new Error("--source-revision is required outside a Git checkout");
  }
}

function parseArguments(argv) {
  const command = argv.shift();
  if (command === "verify") {
    assert(argv.length === 1, "verify requires one attestation path");
    return { command, path: argv[0] };
  }
  assert(command === "generate", "command must be generate or verify");
  const options = { output: "dist/natadecoco-release-attestation.json" };
  const names = new Map([
    ["--image-repository", "imageRepository"],
    ["--image-digest", "imageDigest"],
    ["--source-revision", "sourceRevision"],
    ["--output", "output"]
  ]);
  while (argv.length > 0) {
    const flag = argv.shift();
    const name = names.get(flag);
    const value = argv.shift();
    assert(name && value, `invalid or incomplete option: ${flag ?? ""}`);
    options[name] = value;
  }
  return { command, options };
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function usage() {
  return "Usage: node scripts/release-attestation.mjs generate --image-repository <repository> --image-digest <sha256:digest> [--source-revision <git-sha>] [--output <path>]\n       node scripts/release-attestation.mjs verify <path>";
}

if (process.argv[1] && resolve(process.argv[1]) === resolve(new URL(import.meta.url).pathname)) {
  try {
    const parsed = parseArguments(process.argv.slice(2));
    if (parsed.command === "verify") {
      const attestation = JSON.parse(readFileSync(parsed.path, "utf8"));
      const verified = verifyAttestation(attestation);
      console.log(`Release attestation: OK (${verified.game.id} ${verified.game.version})`);
    } else {
      const attestation = createAttestation(parsed.options);
      const output = resolve(parsed.options.output);
      mkdirSync(dirname(output), { recursive: true });
      writeFileSync(output, `${JSON.stringify(attestation, null, 2)}\n`);
      console.log(`Release attestation: ${output}`);
    }
  } catch (error) {
    console.error(`ERROR: ${error.message}\n\n${usage()}`);
    process.exitCode = 1;
  }
}
