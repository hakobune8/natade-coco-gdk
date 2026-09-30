import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

test("production Controller delegates to Platform without reading participant credentials", async () => {
  const main = await readFile(new URL("./main.ts", import.meta.url), "utf8");
  const preview = await readFile(new URL("./controller.ts", import.meta.url), "utf8");
  const contract = await readFile(new URL("./contract.ts", import.meta.url), "utf8");
  assert.match(main, /location\.replace\("\/controller\/"\)/u);
  assert.match(preview, /createLocalPreviewController/u);
  assert.match(preview, /mountControllerProfileUI/u);
  assert.doesNotMatch(`${main}\n${preview}\n${contract}`, /createControllerClient|mountControllerShell|consumeControllerHandoff|controllerUrl|sessionStorage|control\/(?:heartbeat|restart|end)/u);
});
