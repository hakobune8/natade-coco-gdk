#!/usr/bin/env node
import { createHash } from "node:crypto";
import { cp, mkdir, mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, dirname, join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import process from "node:process";
import { fileURLToPath } from "node:url";

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const packageNames = ["protocol", "controller-sdk", "display-sdk", "game-schema"];

try {
  const source = resolve(process.argv[2] ?? "");
  if (!process.argv[2]) throw new Error("usage: node scripts/update-platform.mjs <natade-coco-games-path>");
  assertClean(repositoryRoot, "game repository");
  assertClean(source, "platform source");
  const revision = output("git", ["rev-parse", "HEAD"], source).trim();
  const repository = normalizeRemote(output("git", ["config", "--get", "remote.origin.url"], source).trim());
  if (!/^[a-f0-9]{40}$/.test(revision)) throw new Error("platform source revision is not a full Git SHA");

  const temporaryRoot = await mkdtemp(join(tmpdir(), "natadecoco-platform-update-"));
  const candidate = join(temporaryRoot, "candidate");
  const packed = join(temporaryRoot, "packed");
  try {
    await cp(repositoryRoot, candidate, {
      recursive: true,
      filter: (path) => ![".git", "node_modules", "dist", "supply-chain", "vendor"].includes(basename(path))
    });
    await mkdir(packed, { recursive: true });

    for (const name of packageNames) {
      run("pnpm", ["--filter", `@natadecoco/${name}`, "build"], source);
      run("pnpm", ["--filter", `@natadecoco/${name}`, "pack", "--pack-destination", packed], source);
    }
    const archives = await readdir(packed);
    const records = {};
    for (const name of packageNames) {
      const file = oneArchive(archives, `natadecoco-${name}-`);
      const metadata = JSON.parse(await readFile(join(source, "packages", name, "package.json"), "utf8"));
      if (metadata.name !== `@natadecoco/${name}` || typeof metadata.version !== "string") throw new Error(`invalid package metadata for ${name}`);
      records[metadata.name] = {
        version: metadata.version,
        archive: file,
        sha256: createHash("sha256").update(await readFile(join(packed, file))).digest("hex")
      };
    }

    await cp(packed, join(candidate, "vendor"), { recursive: true });
    const packagePath = join(candidate, "package.json");
    const packageJSON = JSON.parse(await readFile(packagePath, "utf8"));
    for (const [name, record] of Object.entries(records)) packageJSON.dependencies[name] = `file:vendor/${record.archive}`;
    packageJSON.pnpm ??= {};
    packageJSON.pnpm.overrides ??= {};
    packageJSON.pnpm.overrides["@natadecoco/protocol"] = `file:vendor/${records["@natadecoco/protocol"].archive}`;
    await writeFile(packagePath, `${JSON.stringify(packageJSON, null, 2)}\n`, "utf8");
    await writeFile(join(candidate, "vendor", "platform-set.json"), `${JSON.stringify({
      schemaVersion: 1,
      source: { repository, revision },
      packages: records
    }, null, 2)}\n`, "utf8");

    run("pnpm", ["install", "--lockfile-only", "--offline"], candidate);
    run("pnpm", ["install", "--offline", "--frozen-lockfile"], candidate);
    for (const target of ["validate", "test", "lint", "build"]) run("make", [target], candidate);

    await rm(join(repositoryRoot, "vendor"), { recursive: true, force: true });
    await cp(join(candidate, "vendor"), join(repositoryRoot, "vendor"), { recursive: true });
    await cp(packagePath, join(repositoryRoot, "package.json"));
    await cp(join(candidate, "pnpm-lock.yaml"), join(repositoryRoot, "pnpm-lock.yaml"));
    console.log(`Updated platform set to ${repository}@${revision}`);
  } finally {
    await rm(temporaryRoot, { recursive: true, force: true });
  }
} catch (error) {
  console.error(`ERROR: ${error.message}`);
  process.exitCode = 1;
}

function assertClean(path, label) {
  const status = output("git", ["status", "--porcelain", "--untracked-files=all"], path);
  if (status.trim()) throw new Error(`${label} working tree must be clean`);
}

function normalizeRemote(value) {
  const ssh = /^git@github\.com:([^/]+\/[^/]+?)(?:\.git)?$/.exec(value);
  if (ssh) return `https://github.com/${ssh[1]}`;
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" || url.hostname !== "github.com" || url.username || url.password) throw new Error();
    return url.toString().replace(/\.git\/?$/, "").replace(/\/$/, "");
  } catch {
    throw new Error("platform source must have a credential-free GitHub origin");
  }
}

function oneArchive(values, prefix) {
  const matches = values.filter((value) => value.startsWith(prefix) && value.endsWith(".tgz"));
  if (matches.length !== 1) throw new Error(`expected one packed archive with prefix ${prefix}`);
  return matches[0];
}

function output(command, args, cwd) {
  const result = spawnSync(command, args, { cwd, encoding: "utf8", stdio: "pipe" });
  if (result.error?.code === "ENOENT") throw new Error(`${command} is required`);
  if (result.status !== 0) throw new Error(`${command} ${args.join(" ")} failed`);
  return result.stdout;
}

function run(command, args, cwd) {
  const result = spawnSync(command, args, { cwd, encoding: "utf8", stdio: "inherit", env: { ...process.env, GOWORK: "off" } });
  if (result.error?.code === "ENOENT") throw new Error(`${command} is required`);
  if (result.status !== 0) throw new Error(`${command} ${args.join(" ")} failed`);
}
