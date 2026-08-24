#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import { readFileSync, readdirSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import process from "node:process";
import { parse } from "yaml";

const lifecycleScripts = new Set([
  "preinstall", "install", "postinstall", "prepublish", "prepublishOnly", "prepare"
]);
const singleCodePoints = new Map([
  [0x061c, "bidi control"], [0x200b, "zero-width character"],
  [0x200c, "zero-width character"], [0x200d, "zero-width character"],
  [0x200e, "bidi control"], [0x200f, "bidi control"],
  [0x2060, "zero-width character"], [0xfeff, "zero-width character"]
]);

export function unicodeFindings(path, text, contract) {
  const findings = [];
  let line = 1;
  let column = 1;
  for (const character of text) {
    const codePoint = character.codePointAt(0);
    const category = suspiciousCategory(codePoint);
    if (category && !unicodeAllowlisted(path, line, codePoint, contract)) {
      findings.push({
        path, line, column,
        message: `${category} U+${codePoint.toString(16).toUpperCase().padStart(4, "0")} is forbidden`
      });
    }
    if (character === "\n") {
      line += 1;
      column = 1;
    } else {
      column += 1;
    }
  }
  return findings;
}

export function workflowFindings(path, content, contract) {
  const findings = [];
  for (const [index, line] of content.split("\n").entries()) {
    const match = line.match(/^\s*(?:-\s*)?uses:\s*["']?([^\s"'#]+)["']?/);
    if (!match || validActionReference(match[1])) continue;
    findings.push(finding(path, index + 1, line.indexOf("uses:") + 1,
      `external Action must use a full commit SHA: ${match[1]}`));
  }

  let document;
  try {
    document = parse(content);
  } catch (error) {
    return [...findings, finding(path, error.linePos?.[0]?.line ?? 1, 1,
      `workflow YAML cannot be audited: ${error.message}`)];
  }
  const triggers = workflowTriggers(document?.on);
  if (triggers.includes("pull_request_target")) {
    findings.push(finding(path, lineContaining(content, "pull_request_target"), 1,
      "pull_request_target is forbidden for executable repository workflows"));
  }
  if (!validDefaultPermissions(document?.permissions)) {
    findings.push(finding(path, lineContaining(content, "permissions:"), 1,
      "workflow permissions must default to contents: read or {}"));
  }

  const pullRequest = triggers.includes("pull_request");
  for (const [jobName, job] of Object.entries(document?.jobs ?? {})) {
    const jobLine = lineMatching(content, new RegExp(`^  ${escapeRegExp(jobName)}:\\s*$`));
    for (const [scope, access] of Object.entries(job?.permissions ?? {})) {
      const allowance = contract.workflows.allowedWritePermissions[`${path}:${jobName}`];
      const allowed = allowance?.scopes ?? [];
      if (access === "write" && !allowed.includes(scope)) {
        findings.push(finding(path, jobLine, 1,
          `job ${jobName} has unapproved ${scope}: write permission`));
      }
    }
    if (!pullRequest) continue;
    if (!approvedRunner(job?.["runs-on"], contract)) {
      findings.push(finding(path, jobLine, 1,
        `pull_request job ${jobName} must use a literal approved runner`));
    }
    if (JSON.stringify(job).includes("secrets.")) {
      findings.push(finding(path, jobLine, 1,
        `pull_request job ${jobName} must not reference repository secrets`));
    }
    if (job?.secrets === "inherit") {
      findings.push(finding(path, jobLine, 1,
        `pull_request job ${jobName} must not inherit secrets`));
    }
  }
  return findings;
}

export function scanRepository(root, mode = "all", base = "") {
  const contract = loadContract(root);
  const files = repositoryFiles(root);
  const findings = [];
  if (["all", "unicode"].includes(mode)) {
    for (const path of files) {
      if (contract.unicode.ignoredPaths.some((entry) => entry.path === path)) continue;
      const bytes = readFileSync(resolve(root, path));
      if (bytes.includes(0)) continue;
      let text;
      try {
        text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
      } catch {
        continue;
      }
      findings.push(...unicodeFindings(path, text, contract));
    }
  }
  if (["all", "workflows"].includes(mode)) {
    for (const path of files.filter((name) => /^\.github\/workflows\/.*\.ya?ml$/.test(name))) {
      findings.push(...workflowFindings(path, readFileSync(resolve(root, path), "utf8"), contract));
    }
  }
  if (["all", "dependencies"].includes(mode)) {
    findings.push(...dependencyFindings(root, files, contract, base));
  }
  return findings;
}

function dependencyFindings(root, files, contract, base) {
  const findings = [];
  for (const path of files.filter((name) => name.endsWith("package.json"))) {
    const scripts = JSON.parse(readFileSync(resolve(root, path), "utf8")).scripts ?? {};
    for (const name of Object.keys(scripts)) {
      if (!lifecycleScripts.has(name)) continue;
      if (!contract.dependencies.lifecycleScriptAllowlist.some((entry) => entry.key === `${path}:${name}`)) {
        findings.push(finding(path, 1, 1,
          `package lifecycle script ${name} is not explicitly allowlisted`));
      }
    }
  }
  if (!base) return findings;
  const lockfiles = contract.dependencies.lockfiles;
  for (const line of git(root, "diff", "--name-status", `${base}...HEAD`).split("\n")) {
    const [status, path] = line.split("\t");
    if (status === "D" && lockfiles.includes(path)) {
      findings.push(finding(path, 1, 1, "lockfile deletion is forbidden"));
    }
  }
  const maximum = contract.dependencies.maximumChangedLinesPerLockfile;
  const diff = git(root, "diff", "--numstat", `${base}...HEAD`, "--", ...lockfiles);
  for (const line of diff.split("\n")) {
    const [added, deleted, path] = line.split("\t");
    if (!/^\d+$/.test(added ?? "") || !/^\d+$/.test(deleted ?? "")) continue;
    if (Number(added) + Number(deleted) > maximum) {
      findings.push(finding(path, 1, 1,
        `lockfile changes exceed ${maximum} lines and require a split review`));
    }
  }
  return findings;
}

function loadContract(root) {
  const path = resolve(root, "config/supply-chain-security-contract.json");
  const contract = JSON.parse(readFileSync(path, "utf8"));
  assert(contract.schemaVersion === 1, "unsupported supply-chain contract schema");
  assert(/^\d+\.\d+\.\d+$/.test(contract.contractVersion), "contractVersion must be SemVer");
  for (const entry of contract.unicode.ignoredPaths) {
    assert(entry.path && entry.reason && entry.owner, "ignored Unicode paths require path, reason and owner");
  }
  for (const entry of contract.unicode.allowlist) {
    assert(entry.path && entry.codePoint && entry.reason && entry.owner && entry.expiresOn,
      "Unicode allowlist entries require path, codePoint, reason, owner and expiresOn");
    assert(!Number.isNaN(Date.parse(`${entry.expiresOn}T00:00:00Z`)), "Unicode allowlist expiry is invalid");
    assert(entry.expiresOn >= new Date().toISOString().slice(0, 10), "Unicode allowlist entry is expired");
  }
  for (const [key, entry] of Object.entries(contract.workflows.allowedWritePermissions)) {
    assert(key.includes(":") && Array.isArray(entry.scopes) && entry.scopes.length > 0 && entry.reason && entry.owner,
      "write permission allowances require job, scopes, reason and owner");
  }
  for (const entry of contract.workflows.selfHostedRunnerLabelAllowlist) {
    assert(Array.isArray(entry.labels) && entry.labels.length > 0 && entry.reason && entry.owner,
      "self-hosted runner allowances require labels, reason and owner");
  }
  for (const entry of contract.dependencies.lifecycleScriptAllowlist) {
    assert(entry.key && entry.reason && entry.owner && entry.expiresOn,
      "lifecycle allowlist entries require key, reason, owner and expiresOn");
    assert(!Number.isNaN(Date.parse(`${entry.expiresOn}T00:00:00Z`)), "lifecycle allowlist expiry is invalid");
    assert(entry.expiresOn >= new Date().toISOString().slice(0, 10), "lifecycle allowlist entry is expired");
  }
  return contract;
}

function suspiciousCategory(codePoint) {
  if ((codePoint >= 0xfe00 && codePoint <= 0xfe0f) ||
      (codePoint >= 0xe0100 && codePoint <= 0xe01ef)) return "variation selector";
  if ((codePoint >= 0x202a && codePoint <= 0x202e) ||
      (codePoint >= 0x2066 && codePoint <= 0x2069)) return "bidi control";
  return singleCodePoints.get(codePoint);
}

function unicodeAllowlisted(path, line, codePoint, contract) {
  const label = `U+${codePoint.toString(16).toUpperCase().padStart(4, "0")}`;
  return contract.unicode.allowlist.some((entry) =>
    entry.path === path && entry.codePoint.toUpperCase() === label &&
    (entry.line === undefined || entry.line === line));
}

function validActionReference(reference) {
  if (reference.startsWith("./")) return true;
  if (reference.startsWith("docker://")) return /^docker:\/\/[^@]+@sha256:[0-9a-f]{64}$/.test(reference);
  return /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+(?:\/[A-Za-z0-9_.@/-]+)?@[0-9a-f]{40}$/.test(reference);
}

function workflowTriggers(value) {
  if (typeof value === "string") return [value];
  if (Array.isArray(value)) return value.map(String);
  if (value && typeof value === "object") return Object.keys(value);
  return [];
}

function validDefaultPermissions(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const entries = Object.entries(value);
  return entries.length === 0 || (entries.length === 1 && entries[0][0] === "contents" && entries[0][1] === "read");
}

function approvedRunner(runner, contract) {
  if (typeof runner === "string") return contract.workflows.githubHostedRunnerAllowlist.includes(runner);
  if (!Array.isArray(runner) || runner.some((label) => typeof label !== "string")) return false;
  return contract.workflows.selfHostedRunnerLabelAllowlist.some((entry) =>
    JSON.stringify(entry.labels) === JSON.stringify(runner));
}

function finding(path, line, column, message) {
  return { path, line: Math.max(line, 1), column: Math.max(column, 1), message };
}

function annotation(value) {
  const message = value.message.replaceAll("%", "%25").replaceAll("\r", "%0D").replaceAll("\n", "%0A");
  return `::error file=${value.path},line=${value.line},col=${value.column}::${message}`;
}

function lineContaining(content, needle) {
  const index = content.split("\n").findIndex((line) => line.includes(needle));
  return index + 1 || 1;
}

function lineMatching(content, expression) {
  const index = content.split("\n").findIndex((line) => expression.test(line));
  return index + 1 || 1;
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function git(root, ...arguments_) {
  return execFileSync("git", ["-C", root, ...arguments_], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"]
  });
}

function repositoryFiles(root) {
  try {
    return git(root, "ls-files", "-z").split("\0").filter(Boolean);
  } catch {
    const excludedDirectories = new Set([".git", "dist", "node_modules", "supply-chain"]);
    const files = [];
    const visit = (directory) => {
      for (const entry of readdirSync(directory, { withFileTypes: true })) {
        if (entry.isSymbolicLink()) continue;
        if (entry.isDirectory()) {
          if (!excludedDirectories.has(entry.name)) visit(join(directory, entry.name));
        } else if (entry.isFile()) {
          files.push(relative(root, join(directory, entry.name)));
        }
      }
    };
    visit(root);
    return files.sort();
  }
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

if (process.argv[1] && resolve(process.argv[1]) === resolve(new URL(import.meta.url).pathname)) {
  const mode = process.argv[2] ?? "all";
  if (!["all", "unicode", "workflows", "dependencies"].includes(mode)) {
    console.error("Usage: node scripts/supply-chain-security.mjs {all|unicode|workflows|dependencies}");
    process.exit(2);
  }
  const root = resolve(new URL("..", import.meta.url).pathname);
  try {
    const findings = scanRepository(root, mode, process.env.SUPPLY_CHAIN_BASE_REF ?? "");
    for (const value of findings) console.log(annotation(value));
    if (findings.length > 0) throw new Error(`${findings.length} supply-chain finding(s)`);
    console.log(`Supply-chain source security: OK (${mode})`);
  } catch (error) {
    console.error(`ERROR: ${error.message}`);
    process.exitCode = 1;
  }
}
