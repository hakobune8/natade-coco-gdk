#!/usr/bin/env node
import { access, readFile, readdir, rename, unlink, writeFile } from "node:fs/promises";
import { basename, dirname, extname, join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import process from "node:process";
import { fileURLToPath } from "node:url";

const markerName = ".natadecoco-template.json";
const excludedDirectories = new Set([".git", "node_modules", "vendor", "dist", "coverage", "tmp", "test-results"]);
const textNames = new Set(["Dockerfile", "Makefile", ".dockerignore", ".gitignore"]);
const textExtensions = new Set([".example", ".go", ".html", ".js", ".json", ".md", ".mjs", ".mod", ".ts", ".yaml", ".yml"]);
const requiredIdentityFiles = ["game.yaml", "package.json", "vite.config.ts", "Dockerfile", "src/contract.ts", "server/go.mod", "deploy/chart/Chart.yaml", "deploy/fleet.yaml.example"];

export async function initializeGame(options, root = process.cwd()) {
  const repositoryRoot = resolve(root);
  const markerPath = join(repositoryRoot, markerName);
  const marker = parseMarker(await readFile(markerPath, "utf8"));
  if (!marker.referenceTemplate || marker.initialized) throw new Error("this repository is not an uninitialized natadeCOCO reference template");

  const next = {
    gameId: validateGameID(options.gameID),
    displayName: boundedText(options.displayName ?? titleCase(options.gameID), "display name", 60),
    description: boundedText(options.description ?? `${options.displayName ?? titleCase(options.gameID)} multiplayer web game`, "description", 200),
    repository: validateRepository(options.repository)
  };
  if (next.gameId === marker.identity.gameId) throw new Error("new game ID must differ from the reference identity");
  if (Object.values(next).some((value) => Object.values(marker.identity).some((current) => value.includes(current)))) throw new Error("new identity must not retain the reference identity");
  await assertCleanGit(repositoryRoot);

  const paths = await listTextFiles(repositoryRoot);
  const originals = new Map();
  const replacements = new Map();
  for (const path of paths) {
    const original = await readFile(path, "utf8");
    const replaced = replaceIdentity(original, marker.identity, next);
    originals.set(path, original);
    if (replaced !== original) replacements.set(path, replaced);
  }
  for (const relative of requiredIdentityFiles) {
    const path = join(repositoryRoot, relative);
    if (!replacements.has(path)) throw new Error(`identity preflight failed for ${relative}`);
  }

  const lockPath = join(repositoryRoot, "pnpm-lock.yaml");
  const originalLock = await optionalRead(lockPath);
  try {
    for (const [path, value] of replacements) await atomicWrite(path, value);
    run("pnpm", ["install", "--lockfile-only"], repositoryRoot);
    const remaining = await findIdentity(repositoryRoot, marker.identity, await listTextFiles(repositoryRoot));
    if (remaining.length > 0) throw new Error(`old template identity remains in ${remaining.map((path) => path.slice(repositoryRoot.length + 1)).join(", ")}`);
    await atomicWrite(markerPath, `${JSON.stringify({ ...marker, initialized: true, identity: next }, null, 2)}\n`);
  } catch (error) {
    for (const [path, value] of originals) await atomicWrite(path, value);
    if (originalLock === null) await unlink(lockPath).catch((value) => { if (value?.code !== "ENOENT") throw value; });
    else await atomicWrite(lockPath, originalLock);
    throw error;
  }
  return next;
}

function parseArguments(argv) {
  if (argv.includes("--help") || argv.includes("-h")) return { help: true };
  const options = {};
  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index];
    if (!value.startsWith("-") && !options.gameID) options.gameID = value;
    else if (["--display-name", "--description", "--repository"].includes(value)) {
      const next = argv[index + 1];
      if (!next || next.startsWith("--")) throw new Error(`${value} requires a value`);
      options[value.slice(2).replace(/-([a-z])/g, (_, letter) => letter.toUpperCase())] = next;
      index += 1;
    } else throw new Error(`unknown argument: ${value}`);
  }
  if (!options.gameID) throw new Error("game ID is required");
  if (!options.repository) throw new Error("--repository is required");
  return options;
}

function usage() {
  return "Usage: node scripts/init-game.mjs <game-id> --repository <https-url> [--display-name <name>] [--description <text>]";
}

function parseMarker(raw) {
  const value = JSON.parse(raw);
  if (value?.schemaVersion !== 1 || typeof value.referenceTemplate !== "boolean" || typeof value.initialized !== "boolean") throw new Error("invalid template marker");
  const identity = value.identity;
  if (!identity || !validateGameID(identity.gameId) || !boundedText(identity.displayName, "display name", 60) || !boundedText(identity.description, "description", 200) || !validateRepository(identity.repository)) throw new Error("invalid template identity");
  return value;
}

async function assertCleanGit(root) {
  try { await access(join(root, ".git")); } catch { return; }
  const result = spawnSync("git", ["status", "--porcelain", "--untracked-files=all"], { cwd: root, encoding: "utf8" });
  if (result.status !== 0) throw new Error("git status failed");
  if (result.stdout.trim()) throw new Error("working tree must be clean before template initialization");
}

async function listTextFiles(root, directory = root) {
  const paths = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if (entry.name === markerName || (entry.isDirectory() && excludedDirectories.has(entry.name))) continue;
    const path = join(directory, entry.name);
    if (entry.isDirectory()) paths.push(...await listTextFiles(root, path));
    else if (textNames.has(entry.name) || textExtensions.has(extname(entry.name))) paths.push(path);
  }
  return paths;
}

function replaceIdentity(value, current, next) {
  return value
    .split(current.repository).join(next.repository)
    .split(current.description).join(next.description)
    .split(current.displayName).join(next.displayName)
    .split(current.gameId).join(next.gameId);
}

async function findIdentity(root, identity, paths) {
  const needles = Object.values(identity);
  const found = [];
  for (const path of paths) {
    const value = await readFile(path, "utf8");
    if (needles.some((needle) => value.includes(needle))) found.push(path);
  }
  return found;
}

async function atomicWrite(path, value) {
  const temporary = join(dirname(path), `.${basename(path)}.natadecoco-tmp-${process.pid}`);
  await writeFile(temporary, value, "utf8");
  await rename(temporary, path);
}

async function optionalRead(path) { try { return await readFile(path, "utf8"); } catch (error) { if (error?.code === "ENOENT") return null; throw error; } }
function validateGameID(value) { if (typeof value !== "string" || value.length > 63 || !/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/.test(value)) throw new Error("game ID must be a lower-case DNS label up to 63 characters"); return value; }
function boundedText(value, label, maximum) { const normalized = String(value).trim(); if (!normalized || normalized.length > maximum || /[\u0000-\u001f]/.test(normalized)) throw new Error(`${label} must contain 1-${maximum} printable characters`); return normalized; }
function validateRepository(value) { try { const parsed = new URL(value); if (parsed.protocol !== "https:" || parsed.username || parsed.password || parsed.search || parsed.hash) throw new Error(); return parsed.toString().replace(/\/$/, ""); } catch { throw new Error("repository must be a credential-free HTTPS URL"); } }
function titleCase(value) { return String(value).split("-").map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(" "); }
function run(command, args, cwd) { const result = spawnSync(command, args, { cwd, encoding: "utf8", stdio: "inherit" }); if (result.error?.code === "ENOENT") throw new Error(`${command} is required`); if (result.status !== 0) throw new Error(`${command} ${args.join(" ")} failed`); }

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const options = parseArguments(process.argv.slice(2));
    if (options.help) console.log(usage());
    else console.log(`Initialized ${JSON.stringify(await initializeGame(options))}`);
  } catch (error) { console.error(`ERROR: ${error.message}\n\n${usage()}`); process.exitCode = 1; }
}
