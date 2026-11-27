.DEFAULT_GOAL := help

.PHONY: help dev live

help: ## List targets and what they do
	@awk 'BEGIN {FS = ":.*##"} /^[a-zA-Z0-9_-]+:.*##/ {printf "  %-18s %s\n", $$1, $$2}' $(MAKEFILE_LIST)

dev: ## Point the unpacked extension at https://joevdotme.github.io/Nikke-Manager (writes mode.json) and print the reload steps
	@node scripts/set-extension-mode.js dev

live: ## Turn dev mode off for the unpacked extension (writes mode.json) and print the steps back to the store copy
	@node scripts/set-extension-mode.js live
