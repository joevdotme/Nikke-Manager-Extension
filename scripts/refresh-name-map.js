#!/usr/bin/env node
// Fetch the pinned CDN name map and rewrite nikke-names.json when it changed.
// Exits 1 and writes nothing on a bad response or a body that fails the checks.
const fs = require("fs");
const path = require("path");
const { NAME_MAP_URL, checkNameMap, maxNameCode, serialize } = require("./lib/name-map");

const FILE = path.resolve(__dirname, "..", "nikke-names.json");

function fail(msg) {
    console.error(`refresh-name-map: ${msg}`);
    process.exit(1);
}

async function main() {
    let resp;
    try {
        resp = await fetch(NAME_MAP_URL, { signal: AbortSignal.timeout(30000) });
    } catch (err) {
        fail(`fetch failed: ${err.message}`);
    }
    if (resp.status !== 200) fail(`${NAME_MAP_URL} returned HTTP ${resp.status}`);

    let rows;
    try {
        rows = JSON.parse(await resp.text());
    } catch {
        fail("response body is not JSON");
    }

    let prev = null;
    let prevText = null;
    try {
        prevText = fs.readFileSync(FILE, "utf8");
        prev = JSON.parse(prevText);
    } catch {}

    const errors = checkNameMap(rows, prev);
    if (errors.length) fail(`refusing the new map:\n  ${errors.join("\n  ")}`);

    const next = serialize(rows);
    const summary = `${rows.length} rows, highest name_code ${maxNameCode(rows)}`;
    if (prevText !== null && (prevText === next || serialize(prev) === next)) {
        console.log(`nikke-names.json unchanged (${summary}).`);
        return;
    }
    fs.writeFileSync(FILE, next);
    const before = Array.isArray(prev) ? `${prev.length} rows, highest name_code ${maxNameCode(prev)}` : "none";
    console.log(`nikke-names.json updated: ${before} -> ${summary}.`);
}

main();
