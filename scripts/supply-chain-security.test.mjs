import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { workflowFindings, unicodeFindings } from "./supply-chain-security.mjs";

const contract = JSON.parse(readFileSync("config/supply-chain-security-contract.json", "utf8"));
const sha = "a".repeat(40);

test("rejects invisible and bidirectional Unicode with location and code point", () => {
  const cases = [0x200b, 0xfe0f, 0xe0100, 0x202e, 0x2066];
  for (const codePoint of cases) {
    const findings = unicodeFindings("fixture.ts", `safe\ntext${String.fromCodePoint(codePoint)}hidden`, contract);
    assert.equal(findings.length, 1);
    assert.equal(findings[0].line, 2);
    assert.match(findings[0].message, /U\+[0-9A-F]+/);
  }
  assert.deepEqual(unicodeFindings("safe.ts", "ordinary UTF-8 日本語\n", contract), []);
});

test("rejects mutable Actions, dangerous triggers, permissions, runners and secrets", () => {
  const safe = `
name: fixture
on: [pull_request]
permissions:
  contents: read
jobs:
  test:
    runs-on: ubuntu-24.04
    steps:
      - uses: actions/checkout@${sha}
`;
  assert.deepEqual(workflowFindings(".github/workflows/fixture.yml", safe, contract), []);

  const cases = [
    [safe.replace(`@${sha}`, "@v7"), /full commit SHA/],
    [safe.replace("pull_request", "pull_request_target"), /pull_request_target/],
    [safe.replace("contents: read", "contents: write"), /default to contents: read/],
    [safe.replace("ubuntu-24.04", "[self-hosted, Linux, X64]"), /literal approved runner/],
    [safe.replace("steps:", "env:\n      TOKEN: ${{ secrets.RELEASE_TOKEN }}\n    steps:"), /must not reference repository secrets/]
  ];
  for (const [workflow, message] of cases) {
    assert.ok(workflowFindings(".github/workflows/fixture.yml", workflow, contract)
      .some((finding) => message.test(finding.message)));
  }
});

test("requires docker Actions to use an immutable digest", () => {
  const workflow = `
name: fixture
on: push
permissions: {}
jobs:
  test:
    runs-on: ubuntu-24.04
    steps:
      - uses: docker://example/tool:latest
`;
  assert.ok(workflowFindings(".github/workflows/fixture.yml", workflow, contract)
    .some((finding) => finding.message.includes("full commit SHA")));
  const pinned = workflow.replace(":latest", `@sha256:${"b".repeat(64)}`);
  assert.deepEqual(workflowFindings(".github/workflows/fixture.yml", pinned, contract), []);
});
