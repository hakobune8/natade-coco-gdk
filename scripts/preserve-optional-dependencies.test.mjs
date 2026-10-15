import assert from "node:assert/strict";
import test from "node:test";
import { parse } from "yaml";
import { preserveOptionalDependencies } from "./preserve-optional-dependencies.mjs";
const baseline = `lockfileVersion: '9.0'

importers:
  .:
    dependencies:
      sdk: {specifier: 'file:old.tgz', version: 'file:old.tgz'}

packages:

  arm@1:
    resolution: {integrity: old-arm}

  bundler@1:
    resolution: {integrity: old-bundler}

  leaf@1:
    resolution: {integrity: old-leaf}

  linux@1:
    resolution: {integrity: old-linux}

snapshots:

  arm@1: {}

  bundler@1:
    optionalDependencies:
      arm: '1'
      linux: '1'

  leaf@1: {}

  linux@1:
    dependencies:
      leaf: '1'
`;
const candidate = baseline.replaceAll('old.tgz','new.tgz').replace(/  leaf@1:\n    resolution: \{integrity: old-leaf\}\n\n/,'').replace(/  linux@1:\n    resolution: \{integrity: old-linux\}\n\n/,'').replace("      linux: '1'\n",'').replace(/\n  leaf@1: \{\}\n/,'').replace(/\n  linux@1:\n    dependencies:\n      leaf: '1'\n/,'');
test("an offline SDK update keeps foreign native dependencies and their locked dependency closure",()=>{
  const result = preserveOptionalDependencies(baseline,candidate,parse), restored = parse(result), old = parse(baseline);
  assert.deepEqual(restored.packages,old.packages);
  assert.deepEqual(restored.snapshots,old.snapshots);
  assert.equal(restored.importers['.'].dependencies.sdk.version,'file:new.tgz');
  assert.equal(preserveOptionalDependencies(baseline,result,parse),result);
});
test("an unchanged complete lockfile needs no rewrite",()=>{
  assert.equal(preserveOptionalDependencies(baseline,baseline,parse),baseline);
});
test("changed dependency versions are rejected instead of being replaced with an old graph",()=>{
  assert.throws(()=>preserveOptionalDependencies(baseline,candidate.replace("arm: '1'","arm: '2'"),parse),/graph changed/);
  assert.throws(()=>preserveOptionalDependencies(baseline,candidate.replace('    optionalDependencies:','    dependencies: {new: 2}\n    optionalDependencies:'),parse),/graph changed/);
});
test("missing baseline package metadata fails closed",()=>{
  assert.throws(()=>preserveOptionalDependencies(baseline.replace(/  leaf@1:\n    resolution: \{integrity: old-leaf\}\n\n/,''),candidate,parse),/Missing locked optional dependency/);
});
