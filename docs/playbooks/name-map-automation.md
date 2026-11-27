# Name map automation

`names-update` refreshes the bundled `nikke-names.json` once a day, and on demand. When the map changed, it opens a pull request titled `chore(data): updated nikke name map`. Squash auto-merge runs only after `names-validate` passes. A red check leaves the pull request open.

The jobs are pinned to `joevdotme/Nikke-Manager-Extension` with `if: github.repository == ...`, as the catalog jobs in Nikke-Manager are. A fork or upstream copy does nothing until it changes that pin and creates its own token. Do not reuse someone else's token.

## Pin

The page loads the English table through `getNikkeList()` → `getIngameResourceUrl("/character/en/nikke_list_en_v2.json")`. That path is hashed. `scripts/lib/name-map.js` pins the public URL it resolved to, which needs no blablalink login:

`https://sg-tools-cdn.blablalink.com/yl-57/hd-03/1bf030193826e243c2e195f951a4be00.json`

The script does not recompute the hash. When the game moves the table, the URL starts returning 404 or a stale body and `names-update` fails without opening a pull request. To re-pin: open https://www.blablalink.com/shiftyspad/nikke-list signed in, find the `sg-tools-cdn.blablalink.com` JSON request whose body is an array of rows with `name_code` and `name_localkey`, and replace `NAME_MAP_URL` with that URL in a normal feature pull request.

## Checks

`scripts/refresh-name-map.js` and `scripts/validate-name-map.js` share `checkNameMap` in `scripts/lib/name-map.js`. A new map is refused when:

- the body is not an array
- a row is missing `name_code`, `resource_id`, or a non-empty `name_localkey.name`
- a `name_code` is duplicated
- the row count is lower than the previous file
- the highest `name_code` is lower than the previous file

A non-200 response or non-JSON body also exits 1, and nothing is written. An unchanged map exits 0 and is not rewritten. Rows are written whole as compact JSON, so the fields `buildNameMap` reads stay intact.

Run locally:

```bash
node scripts/refresh-name-map.js
node scripts/validate-name-map.js --base origin/main
git checkout -- nikke-names.json
```

## Token

`scripts/open-name-pr.sh` pushes and opens the pull request with `EXTENSION_GITHUB_TOKEN`, never `GITHUB_TOKEN`. A pull request opened with the default token does not start `names-validate`, and auto-merge would wait forever.

Create the token in a browser, signed in as the account that should own the data pull requests:

https://github.com/settings/personal-access-tokens/new?name=Nikke+extension+names&description=Push+name+map+branches+and+open+chore+pull+requests.&expires_in=365&contents=write&pull_requests=write

- Repository access: **Only select repositories**, then `joevdotme/Nikke-Manager-Extension`
- Contents: Read and write
- Pull requests: Read and write
- Metadata: Read-only (added automatically)
- Everything else: No access
- Expiration: 365 days. GitHub rejects 366.

Put the value only in the Actions secret. Do not paste it into chat, a commit, or a log.

## Secret

Repository **Actions** secret, named `EXTENSION_GITHUB_TOKEN`:

https://github.com/joevdotme/Nikke-Manager-Extension/settings/secrets/actions

## Repository settings

- Allow auto-merge.
- Branch protection on `main`: require the status check `names-validate`. No required reviewer. Administrators can bypass, so a feature pull request can still be merged by hand.

With admin rights these can be applied from the CLI:

```bash
gh api -X PATCH repos/joevdotme/Nikke-Manager-Extension -F allow_auto_merge=true
```

```bash
gh api -X PUT repos/joevdotme/Nikke-Manager-Extension/branches/main/protection --input - <<'JSON'
{"required_status_checks":{"strict":false,"contexts":["names-validate"]},"enforce_admins":false,"required_pull_request_reviews":null,"restrictions":null}
JSON
```

If the API returns 403, click instead:

1. Settings → General → Pull Requests → check **Allow auto-merge**.
2. Settings → Branches → Add branch protection rule for `main` → **Require status checks to pass before merging** → add `names-validate`. Leave **Require a pull request before merging** reviews at zero, and leave **Do not allow bypassing the above settings** unchecked.

`names-validate` appears in the check search only after it has run once on a pull request.

## First run

After the workflow files are on `main`, open Actions → `names-update` → Run workflow. Confirm:

- The run does not stop with "Name map pull requests run only on joevdotme/Nikke-Manager-Extension."
- When the map changed, the pull request author is the token owner and `names-validate` starts.
- A green check squash-merges. A red check stays open.

## After merge

An unpacked load of this checkout picks up the new map on reload. The installed store extension keeps its old bundled map until a separate store publish, and in practice it prefers the live CDN map it reads from the page anyway. Short-name fixes such as `Ada` vs `Ada Wong` stay in Nikke-Manager `NAME_OVERRIDES`, not here.

## Rotation

Regenerate the token before it expires and update the secret. After expiry the job still refreshes, then stops before opening a pull request.
