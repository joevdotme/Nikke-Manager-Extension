#!/usr/bin/env node
// Writes mode.json in the extension root. The unpacked extension copies it into
// chrome.storage.local on the next reload. A script cannot reload the extension or grant a
// host permission, so this prints the browser steps that are left.
const fs = require("fs");
const path = require("path");

const DEFAULT_DEV_URL = "https://joevdotme.github.io/Nikke-Manager";
const [mode, urlArg] = process.argv.slice(2);

if (mode !== "dev" && mode !== "live") {
    console.error("Usage: node scripts/set-extension-mode.js <dev|live> [url]");
    process.exit(1);
}

const root = path.resolve(__dirname, "..");
const file = path.join(root, "mode.json");
let previousUrl = "";
try {
    previousUrl = JSON.parse(fs.readFileSync(file, "utf8")).customManagerUrl ?? "";
} catch {}

const customManagerUrl = (mode === "dev" ? urlArg || DEFAULT_DEV_URL : urlArg || previousUrl || DEFAULT_DEV_URL)
    .trim()
    .replace(/\/+$/, "");
// writtenAt changes on every write. syncModeFile reapplies mode.json only when its text
// changes, so a later `make dev` with the same URL still wins after Options turns dev mode off.
const body = { devMode: mode === "dev", customManagerUrl, writtenAt: Date.now() };
fs.writeFileSync(file, JSON.stringify(body, null, 4) + "\n");

console.log(`Wrote ${path.relative(process.cwd(), file) || file}: ${JSON.stringify(body)}`);
console.log("");
if (mode === "dev") {
    console.log(`Dev mode: imports from the unpacked copy go only to ${customManagerUrl}.`);
    console.log("");
    console.log("Browser steps (chrome://extensions):");
    console.log("  1. Turn off the store Nikke Manager extension. Leave it installed.");
    console.log(`  2. If this folder is not loaded yet: Developer mode on, Load unpacked, pick ${root}`);
    console.log("  3. Click reload on the unpacked Nikke Manager.");
    console.log("  4. First time only: open its Options page and click Save, then allow access to the host.");
    console.log("Later `make dev` runs only need step 3. The permission stays with this unpacked copy.");
} else {
    console.log("Live mode: imports from the unpacked copy go to localhost and PilgrimWorks again.");
    console.log("");
    console.log("Browser steps (chrome://extensions):");
    console.log("  1. Click reload on the unpacked Nikke Manager.");
    console.log("  2. Remove or turn off the unpacked copy, then turn the store extension back on.");
    console.log("Keep only one copy enabled, so only one answers Import Data.");
}
