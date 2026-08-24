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
  "docs/supply-chain-security-contract.md",
  "docs/supply-chain-security-migration.md",
  "docs/troubleshooting.md",
  "config/supply-chain-security-contract.json",
  "scripts/supply-chain-security.mjs",
  "scripts/supply-chain-security.test.mjs",
  "scripts/release-attestation.mjs",
  "scripts/release-attestation.test.mjs",
  ".github/ISSUE_TEMPLATE/bug_report.yml",
  ".github/ISSUE_TEMPLATE/feature_request.yml",
  ".github/ISSUE_TEMPLATE/config.yml",
  ".github/PULL_REQUEST_TEMPLATE.md",
  ".github/CODEOWNERS",
  ".github/dependabot.yml"
];

const files = Object.fromEntries(requiredFiles.map((path) => [path, readFileSync(path, "utf8")]));
const packageJSON = JSON.parse(readFileSync("package.json", "utf8"));
const marker = JSON.parse(readFileSync(".natadecoco-template.json", "utf8"));
const platformSet = JSON.parse(readFileSync("vendor/platform-set.json", "utf8"));
const gdkRelease = JSON.parse(readFileSync("vendor/gdk-release.json", "utf8"));
const securityContract = JSON.parse(readFileSync("config/supply-chain-security-contract.json", "utf8"));
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
assert(gdkRelease.schemaVersion === 1 && gdkRelease.repository === "https://github.com/hakobune8/natade-coco-gdk", "GDK release repository is invalid");
assert(/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/.test(gdkRelease.version), "GDK release version is invalid");
assert(gdkRelease.releaseTag === `v${gdkRelease.version}`, "GDK release tag does not match its version");
assert(securityContract.schemaVersion === 1 && /^\d+\.\d+\.\d+$/.test(securityContract.contractVersion), "supply-chain security contract is invalid");
assert(files["README.md"].includes("README.ja.md") && files["README.ja.md"].includes("README.md"), "README language links are missing");
assert(files["README.md"].includes("Use this template") && files["docs/getting-started.md"].includes("make init-game"), "external developer quick start is incomplete");
assert(files["SECURITY.md"].includes("Report a vulnerability"), "private vulnerability reporting instructions are missing");
assert(files["docs/release-handoff.md"].includes("Developer deliverables") && files["docs/release-handoff.md"].includes("Operator handoff"), "release responsibility boundary is incomplete");
assert(files["docs/release-handoff.md"].includes("release-attestation"), "release attestation handoff is undocumented");
assert(files["docs/supply-chain-security-contract.md"].includes(`Contract version: \`${securityContract.contractVersion}\``), "security contract version is not documented");
assert(makefile.includes("security-check") && workflow.includes("source-security:"), "source-security gate is not wired into local and CI validation");
assert(!/^\s*-?\s*uses:\s*[^\s]+@(?![a-f0-9]{40}(?:\s|$))/m.test(workflow), "GitHub Actions must use full commit SHAs");
assert(!files["CHANGELOG.md"].includes("TBD"), "changelog contains an unresolved placeholder");

console.log(`Release metadata: OK (${marker.identity.gameId} ${version})`);

function assert(condition, message) {
  if (!condition) throw new Error(message);
}
