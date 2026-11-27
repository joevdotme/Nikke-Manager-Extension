// Shared checks for nikke-names.json, the bundled English name map.
// The page loads it through getNikkeList() -> getIngameResourceUrl("/character/en/nikke_list_en_v2.json").
// That path is hashed. This is the public URL it resolved to; it is pinned, not recomputed.
// See docs/playbooks/name-map-automation.md for how to re-pin it.
const NAME_MAP_URL = "https://sg-tools-cdn.blablalink.com/yl-57/hd-03/1bf030193826e243c2e195f951a4be00.json";

function maxNameCode(rows) {
    let max = -Infinity;
    for (const row of rows) {
        const code = Number(row?.name_code);
        if (Number.isFinite(code) && code > max) max = code;
    }
    return max;
}

// Returns a list of error strings. An empty list means the rows can replace `prev`.
function checkNameMap(rows, prev) {
    const errors = [];
    if (!Array.isArray(rows)) return ["body is not a JSON array"];
    if (rows.length === 0) errors.push("array is empty");

    const seen = new Set();
    rows.forEach((row, i) => {
        const label = `row ${i}${row?.name_code != null ? ` (name_code ${row.name_code})` : ""}`;
        if (row === null || typeof row !== "object" || Array.isArray(row)) {
            errors.push(`${label}: not an object`);
            return;
        }
        if (row.name_code === undefined || row.name_code === null || row.name_code === "") {
            errors.push(`${label}: missing name_code`);
        } else if (seen.has(String(row.name_code))) {
            errors.push(`${label}: duplicate name_code`);
        } else {
            seen.add(String(row.name_code));
        }
        if (row.resource_id === undefined || row.resource_id === null || row.resource_id === "") {
            errors.push(`${label}: missing resource_id`);
        }
        const name = row.name_localkey?.name;
        if (typeof name !== "string" || name.trim() === "") {
            errors.push(`${label}: missing name_localkey.name`);
        }
    });

    if (Array.isArray(prev) && prev.length > 0) {
        if (rows.length < prev.length) {
            errors.push(`row count dropped from ${prev.length} to ${rows.length}`);
        }
        const prevMax = maxNameCode(prev);
        const nextMax = maxNameCode(rows);
        if (nextMax < prevMax) errors.push(`highest name_code dropped from ${prevMax} to ${nextMax}`);
    }
    return errors;
}

// Compact JSON, whole rows, so every field buildNameMap reads stays intact.
function serialize(rows) {
    return JSON.stringify(rows);
}

module.exports = { NAME_MAP_URL, checkNameMap, maxNameCode, serialize };
