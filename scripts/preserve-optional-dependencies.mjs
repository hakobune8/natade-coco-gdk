/** Preserve exact, unchanged lockfile graphs when pnpm's offline metadata omits foreign architectures. */
export function preserveOptionalDependencies(baselineText, updatedText, parse) {
  const baseline = parse(baselineText), updated = parse(updatedText);
  if (!baseline?.snapshots || !baseline?.packages || !updated?.snapshots || !updated?.packages) throw new Error("Unsupported pnpm lockfile format");
  const packages = new Set(), snapshots = new Set(), parents = new Set();
  const equal = (left = {}, right = {}) => JSON.stringify(Object.entries(left).sort()) === JSON.stringify(Object.entries(right).sort());
  const include = key => {
    if (updated.snapshots[key] || snapshots.has(key)) return;
    const entry = baseline.snapshots[key], packageKey = key.split("(")[0];
    if (!entry || !baseline.packages[packageKey]) throw new Error(`Missing locked optional dependency: ${key}`);
    if (updated.packages[packageKey] && !equal(updated.packages[packageKey],baseline.packages[packageKey])) throw new Error(`Locked optional package metadata changed: ${packageKey}`);
    snapshots.add(key);
    if (!updated.packages[packageKey]) packages.add(packageKey);
    for (const [name, version] of Object.entries({...entry.dependencies,...entry.optionalDependencies})) include(`${name}@${version}`);
  };
  for (const [key, entry] of Object.entries(updated.snapshots)) {
    const previous = baseline.snapshots[key];
    if (!previous || !Object.keys(previous.optionalDependencies ?? {}).some(name => !Object.hasOwn(entry.optionalDependencies ?? {},name))) continue;
    if (!equal(entry.dependencies,previous.dependencies) || Object.entries(entry.optionalDependencies ?? {}).some(([name,version]) => previous.optionalDependencies?.[name] !== version)) throw new Error(`Optional dependency graph changed; review ${key}`);
    parents.add(key);
    for (const [name,version] of Object.entries(previous.optionalDependencies)) include(`${name}@${version}`);
  }
  if (parents.size === 0) return updatedText;
  const before = sections(baselineText,parse), after = sections(updatedText,parse);
  for (const key of packages) after.packages.set(key,before.packages.get(key));
  for (const key of [...snapshots,...parents]) after.snapshots.set(key,before.snapshots.get(key));
  const render = blocks => [...blocks.keys()].sort().map(key => {
    const block = blocks.get(key);
    if (!block) throw new Error(`Missing raw lockfile block: ${key}`);
    return block;
  }).join("\n\n");
  const result = `${after.header}\npackages:\n\n${render(after.packages)}\n\nsnapshots:\n\n${render(after.snapshots)}\n`;
  const checked = parse(result);
  for (const key of parents) if (!equal(checked.snapshots[key].optionalDependencies,baseline.snapshots[key].optionalDependencies)) throw new Error(`Optional dependency preservation failed: ${key}`);
  return result;
}
function sections(text,parse) {
  const packageIndex = text.indexOf("\npackages:\n"), snapshotIndex = text.indexOf("\nsnapshots:\n");
  if (packageIndex < 0 || snapshotIndex < packageIndex) throw new Error("Unsupported pinned pnpm lockfile layout");
  const blocks = source => {
    const result = new Map();
    for (const block of source.split(/\n(?=  \S)/)) {
      if (!block.trim()) continue;
      const match = /^  (.*):(?: \{\})?$/.exec(block.split("\n")[0]);
      if (!match) throw new Error("Unsupported pnpm lockfile block");
      result.set(parse(match[1]),block.trimEnd());
    }
    return result;
  };
  return {header:text.slice(0,packageIndex),packages:blocks(text.slice(packageIndex+11,snapshotIndex)),snapshots:blocks(text.slice(snapshotIndex+12))};
}
