---
name: extension-mode
description: Switch this Nikke-Manager-Extension checkout between dev mode (imports go only to a custom manager URL, default https://joevdotme.github.io/Nikke-Manager) and live mode (localhost and PilgrimWorks). Use when asked to point the extension at the fork, test a dev host, or go back to the store extension.
---

# Extension mode

This checkout is loaded unpacked in the browser. `mode.json` (gitignored) in the repo root holds `devMode` and `customManagerUrl`. The extension copies it into storage when it reloads.

## Switch

- Dev mode: run `make dev`. For a different host, run `node scripts/set-extension-mode.js dev <url>`.
- Live mode: run `make live`.

Then give the user the browser steps that the command printed. You cannot do these yourself: `chrome://extensions` cannot be driven by the browser tools, and the host permission needs a real click.

- After `make dev`: turn off the store extension (leave it installed), load this folder unpacked if it is not loaded, and reload it. The first time only, open Options and click Save so the browser grants the host.
- After `make live`: reload the unpacked copy, then remove or turn it off and turn the store extension back on.

## Do not

- Do not publish or upload anything to the Chrome Web Store or Firefox Add-ons.
- Do not tell the user to leave both the store copy and the unpacked copy enabled. Only one should answer Import Data.
- Do not edit the Nikke-Manager repository.
