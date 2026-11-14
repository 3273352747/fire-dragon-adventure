import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import vm from "node:vm";

const source = await readFile(new URL("../web/boot.js", import.meta.url), "utf8");
for (const scenario of ["success", "config-http", "config-json", "loader", "engine"]) {
  const elements = new Map();
  for (const id of ["unity-canvas", "unity-loading-bar", "unity-progress-bar-full",
    "unity-fullscreen-button", "unity-warning"]) {
    elements.set("#" + id, {
      style: {}, children: [], focus() { this.focused = true; },
      appendChild(child) { this.children.push(child); },
    });
  }
  let fullscreen = 0;
  const context = {
    document: {
      querySelector: (selector) => elements.get(selector),
      createElement: () => ({ style: {}, remove() {} }),
      body: { appendChild: (script) => queueMicrotask(() =>
        scenario === "loader" ? script.onerror() : script.onload()) },
    },
    fetch: async () => ({
      ok: scenario !== "config-http", status: 404,
      json: async () => {
        if (scenario === "config-json") throw new Error("Bad JSON");
        return { loaderUrl: "Build/example.loader.js", productName: "Test" };
      },
    }),
    createUnityInstance: async (canvas, config, progress) => {
      assert.equal(config.productName, "Test");
      assert.equal(typeof config.showBanner, "function");
      if (scenario === "engine") throw new Error("Engine failed");
      progress(0.5);
      progress(1);
      return { SetFullscreen: (value) => { fullscreen = value; } };
    },
    setTimeout: () => 0,
    console: { error() {} },
  };
  vm.runInNewContext(source, context);
  await new Promise(setImmediate);
  assert.equal(elements.get("#unity-loading-bar").style.display, "none");
  if (scenario === "success") {
    assert.equal(elements.get("#unity-canvas").focused, true);
    assert.equal(elements.get("#unity-progress-bar-full").style.width, "100%");
    assert.equal(elements.get("#unity-warning").children.length, 0);
    elements.get("#unity-fullscreen-button").onclick();
    assert.equal(fullscreen, 1);
  } else {
    const warnings = elements.get("#unity-warning");
    assert.equal(warnings.style.display, "block");
    assert.equal(warnings.children.length, 1);
    assert(warnings.children[0].textContent.length > 0);
  }
  console.log("PASS: " + scenario);
}
