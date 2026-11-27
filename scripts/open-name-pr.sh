#!/usr/bin/env bash
# Open a chore(data) pull request when the name map refresh changed nikke-names.json.
# Does not open a pull request when EXTENSION_GITHUB_TOKEN is missing.
# Enables squash auto-merge. A failing names-validate check leaves the PR open.
set -euo pipefail

repo="joevdotme/Nikke-Manager-Extension"
title="chore(data): updated nikke name map"

if [ "${GITHUB_REPOSITORY:-}" != "$repo" ]; then
    echo "Name map pull requests run only on $repo."
    exit 0
fi

if [ -z "$(git status --porcelain -- nikke-names.json)" ]; then
    echo "nikke-names.json did not change. Not opening a pull request."
    exit 0
fi

if [ -z "${EXTENSION_GITHUB_TOKEN:-}" ]; then
    echo "EXTENSION_GITHUB_TOKEN is not set. Not opening a pull request."
    exit 1
fi

branch="names/data-${GITHUB_RUN_ID:-local}-${GITHUB_RUN_ATTEMPT:-1}"
git config user.name "github-actions[bot]"
git config user.email "41898282+github-actions[bot]@users.noreply.github.com"
git checkout -B "$branch"
# actions/checkout stores GITHUB_TOKEN in http.extraheader, and Git prefers that over the PAT in the push URL.
git config --unset-all http.https://github.com/.extraheader || true
git add -- nikke-names.json
git commit -m "$title"
git push "https://x-access-token:${EXTENSION_GITHUB_TOKEN}@github.com/${repo}.git" "HEAD:refs/heads/${branch}"

export GH_TOKEN="$EXTENSION_GITHUB_TOKEN"
summary="$(node -e 'const r=require("./nikke-names.json");console.log(`${r.length} rows, highest name_code ${Math.max(...r.map(x=>Number(x.name_code)))}`)')"
body="$(mktemp)"
{
    echo "## Changelog"
    echo
    echo "Refreshed \`nikke-names.json\` from the pinned CDN name map: ${summary}."
    echo
    echo "## How to test"
    echo
    echo "1. \`names-validate\` passes on this pull request. A failing check leaves it open."
    echo "2. After squash merge, reload an unpacked copy of this checkout. The store extension keeps its old map until a store publish."
    echo
    echo "## Screenshots"
    echo
    echo "No UI change."
} > "$body"
# Title stays exact so data updates group as chores.
pr_url="$(gh pr create --repo "$repo" --base main --head "$branch" --title "$title" --body-file "$body")"
rm -f "$body"
echo "$pr_url"
gh pr merge --repo "$repo" "$pr_url" --squash --auto
