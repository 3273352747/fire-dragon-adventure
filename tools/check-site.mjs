import assert from "node:assert/strict";
import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (name) => readFile(path.join(root, name), "utf8");
let checked = 0;

async function checkFile(name) {
  const target = path.resolve(root, name);
  assert(target.startsWith(root + path.sep), "Path escapes repository: " + name);
  const info = await stat(target);
  assert(info.isFile(), "Not a file: " + name);
  assert(info.size > 0 || name === ".nojekyll", "Empty file: " + name);
  checked++;
}

const config = JSON.parse(await read("web/build-config.json"));
for (const key of ["loaderUrl", "dataUrl", "frameworkUrl", "codeUrl"]) {
  assert.equal(typeof config[key], "string", "Missing config key: " + key);
  await checkFile(config[key]);
}
assert(config.loaderUrl.endsWith(".loader.js"), "Expected Unity loader");
const html = await read("index.html");
assert(/<title>[^<]+<\/title>/.test(html), "Missing page title");
assert(html.includes('src="web/boot.js"'), "Bootstrap not referenced");
assert(html.includes('href="TemplateData/style.css"'), "Stylesheet not referenced");
for (const id of ["unity-canvas", "unity-loading-bar", "unity-progress-bar-full",
  "unity-fullscreen-button", "unity-warning"]) {
  assert(html.includes('id="' + id + '"'), "Missing element: " + id);
}
for (const name of ["web/boot.js", "TemplateData/style.css", "TemplateData/favicon.ico",
  "licenses/FONT-LICENSE-NotoSansSC.txt", ".nojekyll"]) {
  await checkFile(name);
}

const css = await read("TemplateData/style.css");
for (const match of css.matchAll(/url\(\s*['"]?([^)'"]+)['"]?\s*\)/g)) {
  const reference = match[1].trim();
  if (!/^(data:|https?:)/.test(reference)) {
    await checkFile(path.posix.join("TemplateData", reference));
  }
}

for (const doc of ["README.md", "docs/DEVELOPMENT.md", "docs/TESTING.md"]) {
  const markdown = await read(doc);
  for (const match of markdown.matchAll(/\]\(([^)]+)\)/g)) {
    const reference = match[1].split("#")[0];
    if (reference && !/^(https?:|mailto:)/.test(reference)) {
      await checkFile(path.posix.join(path.posix.dirname(doc), reference));
    }
  }
}
console.log("PASS: " + checked + " local references and required files checked.");
console.log("Browser gameplay testing is still required; see docs/TESTING.md.");
