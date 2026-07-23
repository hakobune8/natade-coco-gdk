import { readFileSync } from "node:fs";

const requiredFiles = [
  "README.md",
  "README.ja.md",
  "LICENSE",
  "CONTRIBUTING.md",
  "SECURITY.md",
  "SUPPORT.md",
  "CHANGELOG.md",
  "docs/getting-started.md",
  "docs/game-development.md",
  "docs/release-policy.md",
  "docs/release-handoff.md",
  "docs/troubleshooting.md",
  ".github/ISSUE_TEMPLATE/bug_report.yml",
  ".github/ISSUE_TEMPLATE/feature_request.yml",
  ".github/ISSUE_TEMPLATE/config.yml",
  ".github/PULL_REQUEST_TEMPLATE.md"
];

const files = Object.fromEntries(requiredFiles.map((path) => [path, readFileSync(path, "utf8")]));
const packageJSON = JSON.parse(readFileSync("package.json", "utf8"));
const marker = JSON.parse(readFileSync(".natadecoco-template.json", "utf8"));
const platformSet = JSON.parse(readFileSync("vendor/platform-set.json", "utf8"));
const game = readFileSync("game.yaml", "utf8");
const chart = readFileSync("deploy/chart/Chart.yaml", "utf8");
const chartValues = readFileSync("deploy/chart/values.yaml", "utf8");
const releaseValues = readFileSync("deploy/release-values.yaml", "utf8");
const makefile = readFileSync("Makefile", "utf8");
const workflow = readFileSync(".github/workflows/ci.yml", "utf8");
const version = packageJSON.version;
const escapedVersion = version.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

assert(/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/.test(version), "package version must be SemVer without v");
assert(new RegExp(`\\n  version: ${escapedVersion}\\n`).test(game), "game version does not match package version");
assert(new RegExp(`\\nversion: ${escapedVersion}\\n`).test(chart), "Chart version does not match package version");
assert(new RegExp(`\\nappVersion: [\"']?${escapedVersion}[\"']?\\n`).test(chart), "Chart appVersion does not match package version");
assert(chartValues.includes(`      version: ${version}\n`) && chartValues.includes(`        tag: ${version}\n`), "Chart values do not match package version");
assert(releaseValues.includes(`    version: ${version}\n`) && releaseValues.includes(`      tag: ${version}\n`), "release handoff values do not match package version");
assert(makefile.includes(`--build-arg VERSION=${version}`) && makefile.includes(`:${version} .`), "container target does not match package version");
assert(workflow.includes(`            VERSION=${version}\n`), "CI container version does not match package version");
assert(marker.schemaVersion === 1 && marker.identity?.gameId && marker.identity?.repository?.startsWith("https://github.com/"), "template identity is invalid");
assert(platformSet.schemaVersion === 1 && /^[a-f0-9]{40}$/.test(platformSet.source?.revision), "platform set source revision is invalid");
assert(Object.keys(platformSet.packages ?? {}).length === 4, "platform set must contain four packages");
assert(files["README.md"].includes("README.ja.md") && files["README.ja.md"].includes("README.md"), "README language links are missing");
assert(files["README.md"].includes("Use this template") && files["docs/getting-started.md"].includes("make init-game"), "external developer quick start is incomplete");
assert(files["SECURITY.md"].includes("Report a vulnerability"), "private vulnerability reporting instructions are missing");
assert(files["docs/release-handoff.md"].includes("Developer deliverables") && files["docs/release-handoff.md"].includes("Operator handoff"), "release responsibility boundary is incomplete");
assert(!/^\s*-?\s*uses:\s*[^\s]+@(?![a-f0-9]{40}(?:\s|$))/m.test(workflow), "GitHub Actions must use full commit SHAs");
assert(!files["CHANGELOG.md"].includes("TBD"), "changelog contains an unresolved placeholder");

console.log(`Release metadata: OK (${marker.identity.gameId} ${version})`);

function assert(condition, message) {
  if (!condition) throw new Error(message);
}
