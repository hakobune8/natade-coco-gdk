import { createHash } from "node:crypto";
import { readFileSync, readdirSync } from "node:fs";

const gameID = "gdk-reference";
const manifest = readFileSync("game.yaml", "utf8");
const dockerfile = readFileSync("Dockerfile", "utf8");
const fleet = readFileSync("deploy/fleet.yaml.example", "utf8");
const values = readFileSync("deploy/release-values.yaml", "utf8");
const packageJSON = JSON.parse(readFileSync("package.json", "utf8"));
const templateMarker = JSON.parse(readFileSync(".natadecoco-template.json", "utf8"));
const platformSet = JSON.parse(readFileSync("vendor/platform-set.json", "utf8"));

assert(packageJSON.name === `natadecoco-game-${gameID}`, "package identity drifted");
assert(templateMarker.schemaVersion === 1 && templateMarker.identity?.gameId === gameID, "template marker identity drifted");
assert(templateMarker.referenceTemplate === true || templateMarker.initialized === true, "ordinary game repositories must disable initialization");
assert(platformSet.schemaVersion === 1 && /^https:\/\/github\.com\/[^/]+\/[^/]+$/.test(platformSet.source?.repository), "platform set source is invalid");
assert(/^[a-f0-9]{40}$/.test(platformSet.source?.revision), "platform set revision must be a full Git SHA");
const expectedPackages = ["@natadecoco/protocol", "@natadecoco/controller-sdk", "@natadecoco/display-sdk", "@natadecoco/game-schema"];
for (const name of expectedPackages) {
  const record = platformSet.packages?.[name];
  assert(record && /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/.test(record.version), `${name} version is invalid`);
  assert(/^natadecoco-[a-z-]+-\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?\.tgz$/.test(record.archive), `${name} archive is invalid`);
  assert(packageJSON.dependencies?.[name] === `file:vendor/${record.archive}`, `${name} dependency does not match the platform set`);
  const digest = createHash("sha256").update(readFileSync(`vendor/${record.archive}`)).digest("hex");
  assert(digest === record.sha256, `${name} archive checksum mismatch`);
}
assert(packageJSON.pnpm?.overrides?.["@natadecoco/protocol"] === `file:vendor/${platformSet.packages["@natadecoco/protocol"].archive}`, "Protocol override does not match the platform set");
const actualArchives = readdirSync("vendor").filter((name) => name.endsWith(".tgz")).sort();
const expectedArchives = expectedPackages.map((name) => platformSet.packages[name].archive).sort();
assert(JSON.stringify(actualArchives) === JSON.stringify(expectedArchives), "vendor must contain exactly one complete platform set");
assert(manifest.includes(`name: ${gameID}`) && manifest.includes(`/games/${gameID}/display`) && manifest.includes(`/games/${gameID}/controller`), "Game identity and routes must agree");
assert(manifest.includes("registry.example.invalid/"), "starter manifest must remain non-deployable until promotion values are reviewed");
assert(/^# syntax=docker\/dockerfile:[^@\n]+@sha256:[a-f0-9]{64}$/m.test(dockerfile), "Dockerfile frontend must be digest pinned");
assert(!/:latest\b/.test(dockerfile), "latest is forbidden");
assert(/^FROM scratch$/m.test(dockerfile) && /^USER 65532:65532$/m.test(dockerfile), "final image must be scratch and non-root");
assert(dockerfile.includes(`NATADECOCO_STATIC_PREFIX=/games/${gameID}/`), "container route prefix drifted");
assert(values.includes("requireImageDigest: true") && values.includes("sandbox:\n  profile: standard"), "release values must require digest and an explicit sandbox");
assert(fleet.includes("doNotDeploy: true") && fleet.includes("REPLACE_WITH_APPROVED_PROFILE"), "Fleet example must fail closed until the platform operator reviews targeting");
assert(!/[A-Za-z0-9_-]*(token|password|secret)[A-Za-z0-9_-]*\s*[:=]\s*[^\s#]+/i.test(`${manifest}\n${values}\n${fleet}`), "deployment files must not contain credentials");
console.log(`External game package contract: OK (${gameID})`);

function assert(condition, message) { if (!condition) throw new Error(message); }
