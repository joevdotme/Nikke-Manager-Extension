const devModeEl = document.getElementById("devMode");
const urlEl = document.getElementById("customManagerUrl");
const statusEl = document.getElementById("status");

function show(cls, text) {
    statusEl.className = cls;
    statusEl.textContent = text;
}

function normalize(url) {
    return url.trim().replace(/\/+$/, "");
}

chrome.storage.local.get(["devMode", "customManagerUrl"], ({ devMode, customManagerUrl }) => {
    devModeEl.checked = devMode === true;
    urlEl.value = customManagerUrl ?? "";
});

document.getElementById("saveBtn").addEventListener("click", async () => {
    const url = normalize(urlEl.value);
    urlEl.value = url;

    if (!devModeEl.checked) {
        await chrome.storage.local.set({ devMode: false, customManagerUrl: url });
        show("done", "Saved. Dev mode is off.");
        return;
    }

    let origin;
    try {
        const parsed = new URL(url);
        if (parsed.protocol !== "https:" && parsed.protocol !== "http:") throw new Error();
        origin = parsed.origin;
    } catch {
        show("error", "Enter an http or https URL before turning dev mode on.");
        return;
    }

    // permissions.request must run inside the click handler, before any other await.
    let granted = false;
    let requestError = null;
    try {
        granted = await chrome.permissions.request({ origins: [`${origin}/*`] });
    } catch (err) {
        requestError = err;
    }
    if (!granted) {
        devModeEl.checked = false;
        await chrome.storage.local.set({ devMode: false, customManagerUrl: url });
        show(
            "error",
            requestError
                ? `Permission request failed: ${requestError.message}`
                : `Access to ${origin} was not granted. Dev mode stays off.`,
        );
        return;
    }

    show("", "Checking the manager ping...");
    let ok = false;
    try {
        const resp = await fetch(`${url}/nikke-manager-ping.json`, { signal: AbortSignal.timeout(5000) });
        const json = resp.ok ? await resp.json() : null;
        ok = json?.app === "nikke-manager";
    } catch {}
    if (!ok) {
        devModeEl.checked = false;
        await chrome.storage.local.set({ devMode: false, customManagerUrl: url });
        show("error", `${url}/nikke-manager-ping.json did not answer as Nikke Manager. Dev mode stays off.`);
        return;
    }

    await chrome.storage.local.set({ devMode: true, customManagerUrl: url });
    show("done", `Saved. Imports go only to ${url}.`);
});
