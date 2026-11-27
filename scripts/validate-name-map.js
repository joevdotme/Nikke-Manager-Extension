#!/usr/bin/env node
// Check nikke-names.json in the working tree against the copy on a base ref.
// Usage: node scripts/validate-name-map.js [--base origin/main] [--file path]
const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");
const { checkNameMap, maxNameCode } = require("./lib/name-map");

const args = process.argv.slice(2);
function arg(name, fallback) {
    const i = args.indexOf(name);
    return i >= 0 && args[i + 1] ? args[i + 1] : fallback;
}
const base = arg("--base", "origin/main");
const file = path.resolve(arg("--file", path.resolve(__dirname, "..", "nikke-names.json")));

let rows;
try {
    rows = JSON.parse(fs.readFileSync(file, "utf8"));
} catch (err) {
    console.error(`validate-name-map: cannot read ${file} as JSON: ${err.message}`);
    process.exit(1);
}

let prev = null;
try {
    const text = execFileSync("git", ["show", `${base}:nikke-names.json`], {
        cwd: path.resolve(__dirname, ".."),
        encoding: "utf8",
        maxBuffer: 64 * 1024 * 1024,
        stdio: ["ignore", "pipe", "ignore"],
    });
    prev = JSON.parse(text);
} catch {
    console.log(`No nikke-names.json on ${base}; checking shape only.`);
}

const errors = checkNameMap(rows, prev);
if (errors.length) {
    console.error(`nikke-names.json fails names-validate:\n  ${errors.join("\n  ")}`);
    process.exit(1);
}
const before = Array.isArray(prev) ? `${prev.length} rows, max ${maxNameCode(prev)}` : "none";
console.log(`nikke-names.json OK: ${before} on ${base} -> ${rows.length} rows, max ${maxNameCode(rows)}.`);
