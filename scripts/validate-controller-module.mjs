import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

// Import the production entry to catch lost/tree-shaken module exports.
const module = await import(new URL("../dist/controller-ui.js", import.meta.url));
assert.equal(module.controllerUIContractVersion, 2);
assert.equal(typeof module.mountControllerUI, "function");
assert.ok((await readFile("dist/controller-ui.css", "utf8")).length > 0);
console.log("Production Controller UI v2 entry: OK");
