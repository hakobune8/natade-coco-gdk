import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { cp, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, join, resolve } from "node:path";
import test from "node:test";
import { initializeGame } from "./init-game.mjs";

test("initializes a descendant without rewriting its GDK provenance checks", async () => {
  const fixture = await mkdtemp(join(tmpdir(), "gdk-init-provenance-"));
  const ignored = new Set([".git", "node_modules", "dist", "coverage", "tmp", "test-results"]);
  try {
    await cp(resolve("."), fixture, {
      recursive: true,
      filter: (path) => !ignored.has(basename(path))
    });
    const validator = await readFile(join(fixture, "scripts/validate-release.mjs"));
    const release = await readFile(join(fixture, "vendor/gdk-release.json"));
    const platform = await readFile(join(fixture, "vendor/platform-set.json"));
    const dependabot = await readFile(join(fixture, ".github/dependabot.yml"));
    // The same tests run in reference templates and initialized game repositories.
    const originalMarker = JSON.parse(await readFile(join(fixture, ".natadecoco-template.json"), "utf8"));
    await writeFile(join(fixture, ".natadecoco-template.json"), JSON.stringify({
      ...originalMarker, referenceTemplate: true, initialized: false
    }));
    const gameID = `provenance-${originalMarker.identity.gameId.slice(0, 20)}-child`;
    const next = {
      gameID,
      repository: `https://github.com/example/${gameID}`
    };
    await initializeGame(next, fixture);
    const marker = JSON.parse(await readFile(join(fixture, ".natadecoco-template.json"), "utf8"));
    assert.equal(marker.initialized, true);
    assert.equal(marker.identity.repository, next.repository);
    assert.ok((await readFile(join(fixture, "game.yaml"), "utf8")).includes(gameID));
    assert.deepEqual(await readFile(join(fixture, "scripts/validate-release.mjs")), validator);
    assert.deepEqual(await readFile(join(fixture, "vendor/gdk-release.json")), release);
    assert.deepEqual(await readFile(join(fixture, "vendor/platform-set.json")), platform);
    assert.deepEqual(await readFile(join(fixture, ".github/dependabot.yml")), dependabot);
    const result = spawnSync(process.execPath, ["scripts/validate-release.mjs"], {
      cwd: fixture, encoding: "utf8"
    });
    assert.equal(result.status, 0, result.stdout + result.stderr);
    await assert.rejects(initializeGame(next, fixture), /not an uninitialized/);
  } finally {
    await rm(fixture, { recursive: true, force: true });
  }
});
