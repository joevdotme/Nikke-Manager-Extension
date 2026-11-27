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

`scripts/open-name-pr.sh` pushes the data branch, opens the pull request, and enables auto-merge with `EXTENSION_GITHUB_TOKEN`, never `GITHUB_TOKEN`. A pull request opened with the default token does not start `names-validate`, so auto-merge would wait forever. Using the PAT is what makes the required check run.

On `joevdotme/Nikke-Manager-Extension` the token is named `Nikke extension names`. Write its expiry date here when you create or rotate it: `____-__-__`.

### Scope and permissions

It is a **fine-grained** personal access token, not a classic token. A classic `repo` token works, but it can reach every repository the account can, so don't use one.

| Setting | Value | Why |
| --- | --- | --- |
| Token type | Fine-grained personal access token | Can be limited to one repository |
| Token name | `Nikke extension names` | Easy to find under Settings → Developer settings → Fine-grained tokens |
| Resource owner | The account or org that owns the repository | A fork owned by you uses your user account |
| Expiration | 365 days (custom date one year out if the form rejects it) | GitHub's maximum for fine-grained tokens. 366 is rejected |
| Repository access | **Only select repositories** → this repository only | Nothing else should be writable |
| Contents | **Read and write** | `git push` of the `names/data-*` branch |
| Pull requests | **Read and write** | `gh pr create` and `gh pr merge --squash --auto` |
| Metadata | Read-only | GitHub adds this automatically. It cannot be removed |
| Workflows | No access | The job only touches `nikke-names.json` |
| Every other repository or account permission | No access | — |

The PR author is the token owner. The data commit itself is authored as `github-actions[bot]`. That split is expected.

### Create it

Create it in a browser, signed in as the account that should own the data pull requests. Another token cannot mint it.

1. Open https://github.com/settings/personal-access-tokens/new?name=Nikke+extension+names&description=Push+name+map+branches+and+open+chore+pull+requests.&expires_in=365&contents=write&pull_requests=write . The link pre-fills the name, description, expiry, Contents and Pull requests. It cannot pre-select the repository.
2. Set the resource owner. Pick **Only select repositories**, then choose the repository.
3. Under **Repository permissions**, confirm Contents and Pull requests are **Read and write**, and Metadata is Read-only. Leave everything else at No access. **Account permissions** stay empty.
4. **Generate token**. Finish any password or 2FA prompt. Copy the `github_pat_…` value. GitHub shows it once.

Do not paste the value into chat, a commit, an issue, or a log. It goes only into the secret below.

## Secret

A **repository Actions secret**. Not an environment, Codespaces, or Dependabot secret, and not a variable.

1. Open `https://github.com/OWNER/REPO/settings/secrets/actions/new` (for this repo: https://github.com/joevdotme/Nikke-Manager-Extension/settings/secrets/actions/new).
2. Name: `EXTENSION_GITHUB_TOKEN`. Secret: the token value. **Add secret**.
3. Confirm the name is listed under Repository secrets. The value stays hidden.

Or, from a shell where the value is never echoed: `gh secret set EXTENSION_GITHUB_TOKEN --repo OWNER/REPO` and paste at the prompt.

## Forks and reprovisioning

A fork does nothing until it opts in. To run the job on another repository:

1. Replace `joevdotme/Nikke-Manager-Extension` with your `owner/repo` in:
   - `.github/workflows/names-update.yml` (the `if:` pin)
   - `.github/workflows/names-validate.yml` (the `if:` pin)
   - `scripts/open-name-pr.sh` (`repo=`, which covers the guard, push URL and both `gh` calls)
2. Keep the guard with your repository name. Deleting it lets any mirror push.
3. Create your own token with the table above, scoped to your fork only. Never reuse another owner's token.
4. Add it as the `EXTENSION_GITHUB_TOKEN` Actions secret on your fork.
5. Apply the repository settings below on your fork.
6. Do the first run.

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

Regenerate the token before it expires. On the token page use **Regenerate token**, which keeps the same scope and permissions, or create a new one from the table above. Then update the `EXTENSION_GITHUB_TOKEN` secret and the expiry date under Token. After expiry the job still refreshes, then fails when the push is rejected, and no pull request is opened.
