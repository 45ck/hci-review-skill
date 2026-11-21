"""Browser acceptance for the actual tarball consumer, separate from the gallery."""

import argparse
import asyncio
import hashlib
import json
import os
from pathlib import Path
import signal
import socket
import subprocess
import time
from urllib.request import urlopen

ROOT = Path(__file__).resolve().parents[1]
REPORT = ROOT / "test-results/package-consumer.json"


def transport_script(enabled):
    return """(() => {
      window.__consumerVisitId = crypto.randomUUID();
      window.__consumerPageShows = [];
      addEventListener('pageshow', event => window.__consumerPageShows.push(event.persisted));
      const state = {active: {}, registered: [], unregistered: [], duplicates: []};
      window.__consumerTransport = state;
      Object.defineProperty(document, 'modelContext', {configurable: true, value: ENABLED ? {
        registerTool(tool) {
          if (state.active[tool.name]) { state.duplicates.push(tool.name); throw new Error('Duplicate tool registration: ' + tool.name); }
          state.active[tool.name] = tool;
          state.registered.push(tool.name);
        },
        unregisterTool(name) { delete state.active[name]; state.unregistered.push(name); }
      } : undefined});
    })();""".replace("ENABLED", "true" if enabled else "false")


async def act(page, kind, label, action, arguments):
    return await page.evaluate("""async ({kind, label, action, args}) => {
      const found = await window.consumerAgent.query({kind, text: label});
      if (!Array.isArray(found)) throw new Error(JSON.stringify(found));
      const matches = found.filter(entry => entry.component === kind && entry.label === label && !entry.offPage);
      if (matches.length !== 1) throw new Error('Expected one ' + label + ': ' + JSON.stringify(found));
      return await window.consumerAgent.act({steps: [{ref: matches[0].ref, action, args}]});
    }""", {"kind": kind, "label": label, "action": action, "args": arguments})


async def transport(page, count):
    await page.wait_for_function("count => Object.keys(window.__consumerTransport.active).length === count", arg=count)
    state = await page.evaluate("() => ({...window.__consumerTransport, active: Object.keys(window.__consumerTransport.active)})")
    assert not state["duplicates"], state
    return state


async def workspace(page, url, with_transport):
    errors = []
    page.on("pageerror", lambda error: errors.append(str(error)))
    await page.goto(url, wait_until="networkidle")
    await expect(page.get_by_role("heading", name="Installed package workspace")).to_be_visible()
    if with_transport:
        await transport(page, 3)
    result = await act(page, "input", "Workspace name", "setValue", ["Orion"])
    assert result["ok"], result
    await expect(page.get_by_label("Workspace name", exact=True)).to_have_value("Orion")
    await expect(page.get_by_test_id("source")).to_have_text("agent")
    result = await act(page, "button", "Save workspace", "press", [])
    assert result["ok"], result
    await expect(page.get_by_test_id("saved")).to_have_text("Saved Orion")
    await act(page, "input", "Workspace name", "setValue", ["locked project"])
    await expect(page.get_by_label("Workspace name", exact=True)).to_have_value("Orion")
    await expect(page.get_by_test_id("notice")).to_contain_text("name was kept")
    refused = await act(page, "button", "Remove example record", "press", [])
    assert not refused["ok"], refused
    await expect(page.get_by_test_id("removed")).to_have_text("Record retained")
    await act(page, "input", "Find installed examples", "setValue", ["viewport"])
    await expect(page.get_by_test_id("query")).to_have_text("viewport")
    value = {"x": 20, "y": 10, "zoom": 1.5}
    result = await act(page, "liquid-viewport", "Installed package canvas viewport", "setViewport", [value])
    assert result["ok"], result
    await page.wait_for_function("() => JSON.parse(document.querySelector('[data-testid=viewport]').textContent).zoom === 1.5")
    await act(page, "liquid-viewport", "Installed package canvas viewport", "setViewport", [{**value, "zoom": 3}])
    assert json.loads(await page.get_by_test_id("viewport").inner_text()) == value
    await expect(page.get_by_test_id("notice")).to_contain_text("200%")
    await page.get_by_label("Workspace name", exact=True).fill("Keyboard workspace")
    await page.get_by_role("button", name="Save workspace", exact=True).focus()
    await page.keyboard.press("Enter")
    await expect(page.get_by_test_id("saved")).to_have_text("Saved Keyboard workspace")
    await page.get_by_role("button", name="Unmount application", exact=True).click()
    await expect(page.get_by_label("Workspace name", exact=True)).to_have_count(0)
    if with_transport:
        await transport(page, 0)
    await page.get_by_role("button", name="Mount application", exact=True).click()
    await expect(page.get_by_label("Workspace name", exact=True)).to_have_value("Atlas")
    if with_transport:
        state = await transport(page, 3)
        assert state["unregistered"], state
    assert not errors, errors
    return {"transport": "instrumented WebMCP" if with_transport else "unavailable", "acceptedState": True,
            "hostCancellation": True, "confirmationRefusal": True, "viewportAcceptance": True,
            "keyboard": True, "unmountAndRemount": True}


async def starter(page, url):
    await page.goto(url + "?view=starter", wait_until="networkidle")
    await expect(page.get_by_role("heading", name="Your workspace")).to_be_visible()
    await transport(page, 3)
    result = await act(page, "input", "Project name", "setValue", ["Installed starter"])
    assert result["ok"], result
    await act(page, "button", "Save project", "press", [])
    await expect(page.get_by_text("Saved Installed starter", exact=True)).to_be_visible()
    await page.get_by_role("button", name="Unmount application", exact=True).click()
    await transport(page, 0)
    await page.get_by_role("button", name="Mount application", exact=True).click()
    await expect(page.get_by_label("Project name", exact=True)).to_have_value("My project")
    await transport(page, 3)
    return {"exactCopiedSource": True, "acceptedSave": True, "registrationCleanup": True}


async def documentation(page, url):
    release_response = await page.request.get(url + "agent-release.json")
    assert release_response.status == 200
    release = await release_response.json()
    index_response = await page.request.get(url + "agent-index.json")
    assert index_response.status == 200
    index = await index_response.json()
    assert release["resources"]["index"] == "/studio/agent-index.json"
    meta = await page.locator('meta[name="quantive-agent-contract-set"]').get_attribute("content")
    assert meta == release["release"]["contractSet"] == index["release"]["contractSet"]
    entry = next(entry for entry in index["entries"] if entry["id"] == "model-document")
    contract_response = await page.request.get(url + entry["contract"].removeprefix("/studio/"))
    content = await contract_response.body()
    assert len(content) == entry["bytes"]
    assert "sha256:" + hashlib.sha256(content).hexdigest() == entry["sha256"]
    contract = json.loads(content)
    assert contract["$schema"] == "/studio/agent-contract.schema.json"
    schema_response = await page.request.get(url + "agent-contract.schema.json")
    assert schema_response.status == 200
    await page.evaluate("() => document.fonts.ready")
    fonts = await page.evaluate("() => performance.getEntriesByType('resource').map(entry => entry.name).filter(name => name.includes('.woff2'))")
    assert fonts, "Bundled fonts should load from the installed package's emitted assets."
    return {"basePath": "/studio/", "releaseMatchesPage": True, "contractFingerprint": True, "bundledFonts": len(fonts)}


async def bfcache(page, url):
    await page.goto(url, wait_until="networkidle")
    await act(page, "input", "Workspace name", "setValue", ["Return preserved"])
    await expect(page.get_by_label("Workspace name", exact=True)).to_have_value("Return preserved")
    visit = await page.evaluate("window.__consumerVisitId")
    await page.goto(url + "away.html", wait_until="load")
    await page.go_back(wait_until="load")
    await expect(page.get_by_label("Workspace name", exact=True)).to_have_value("Return preserved")
    state = await page.evaluate("() => ({visit: window.__consumerVisitId, shows: window.__consumerPageShows})")
    assert state["visit"] == visit and True in state["shows"], f"Browser did not restore this document from BFCache: {state}"
    await transport(page, 3)
    await act(page, "input", "Workspace name", "setValue", ["After browser return"])
    await expect(page.get_by_label("Workspace name", exact=True)).to_have_value("After browser return")
    return {"actualPersistedPageshow": True, "statePreserved": True, "bridgeOperational": True}


async def hmr(page, url, directory):
    await page.goto(url, wait_until="networkidle")
    await expect(page.get_by_label("Workspace name", exact=True)).to_have_value("Atlas")
    state = await transport(page, 3)
    assert len(state["registered"]) >= 6 and len(state["unregistered"]) >= 3, "Development StrictMode did not replay bridge setup/cleanup."
    await page.evaluate("() => { window.__agentBeforeHmr = window.consumerAgent.snapshot; }")
    source = directory / "src/main.tsx"
    original = source.read_text()
    assert 'const hmrRevision = "initial"' in original
    try:
        source.write_text(original.replace('const hmrRevision = "initial"', 'const hmrRevision = "updated"'))
        await expect(page.get_by_test_id("hmr-revision")).to_have_text("updated", timeout=15000)
        await transport(page, 3)
        assert await page.evaluate("window.consumerAgent.snapshot === window.__agentBeforeHmr"), "HMR created a competing agent bridge."
        await act(page, "input", "Workspace name", "setValue", ["After hot update"])
        await expect(page.get_by_label("Workspace name", exact=True)).to_have_value("After hot update")
    finally:
        source.write_text(original)
    return {"strictModeReplay": True, "sameBridgeAfterHmr": True, "noDuplicateTools": True, "acceptedAfterHmr": True}


def free_port():
    with socket.socket() as connection:
        connection.bind(("127.0.0.1", 0))
        return connection.getsockname()[1]


def start_server(directory, mode, processes):
    if os.environ.get("SITES_MANAGED_LINUX_CONTAINER") == "1":
        raise RuntimeError("Use the Sites preview daemon and pass --base-url/--dev-url in this environment.")
    port = free_port()
    process = subprocess.Popen(["npm", "run", mode, "--", "--port", str(port)], cwd=directory,
                               stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, start_new_session=True)
    processes.append(process)
    url = f"http://127.0.0.1:{port}/studio/"
    deadline = time.monotonic() + 20
    while time.monotonic() < deadline:
        if process.poll() is not None:
            raise RuntimeError(f"Consumer {mode} server exited {process.returncode}")
        try:
            with urlopen(url, timeout=1) as response:
                if response.status == 200:
                    return url
        except OSError:
            time.sleep(0.1)
    raise RuntimeError(f"Consumer {mode} server did not become ready")


async def run(args, directory, processes):
    from playwright.async_api import async_playwright, expect as playwright_expect

    global expect
    expect = playwright_expect
    results = {}
    async with async_playwright() as playwright:
        browser = await playwright.chromium.launch(headless=True, ignore_default_args=["--disable-back-forward-cache"])
        try:
            if not args.only_hmr:
                base = (args.base_url or start_server(directory, "preview", processes)).rstrip("/") + "/"
                context = await browser.new_context(viewport={"width": 1280, "height": 960})
                await context.add_init_script(transport_script(True))
                page = await context.new_page()
                results["workspace"] = await workspace(page, base, True)
                results["documentation"] = await documentation(page, base)
                await page.screenshot(path=str(ROOT / "test-results/consumer-desktop.png"), full_page=True)
                results["copiedStarter"] = await starter(page, base)
                results["bfcache"] = await bfcache(page, base)
                await context.close()
                context = await browser.new_context(viewport={"width": 390, "height": 844})
                await context.add_init_script(transport_script(False))
                page = await context.new_page()
                results["withoutWebMcp"] = await workspace(page, base, False)
                await context.close()
            if not args.skip_hmr:
                dev = (args.dev_url or start_server(directory, "dev", processes)).rstrip("/") + "/"
                context = await browser.new_context(viewport={"width": 1280, "height": 960})
                await context.add_init_script(transport_script(True))
                results["hmr"] = await hmr(await context.new_page(), dev, directory)
                await context.close()
        finally:
            await browser.close()
    return results


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--directory", type=Path)
    parser.add_argument("--base-url", help="Existing production preview, including /studio/")
    parser.add_argument("--dev-url", help="Existing Vite development preview, including /studio/")
    parser.add_argument("--skip-hmr", action="store_true")
    parser.add_argument("--only-hmr", action="store_true")
    args = parser.parse_args()
    if args.skip_hmr and args.only_hmr:
        parser.error("--skip-hmr and --only-hmr are mutually exclusive")
    report = json.loads(REPORT.read_text()) if REPORT.exists() else {}
    directory = (args.directory or Path(report.get("directory", ""))).resolve()
    if not (directory / "dist/agent-release.json").exists():
        parser.error("Run npm run glass:consumer first, or pass its completed --directory.")
    if os.environ.get("SITES_MANAGED_LINUX_CONTAINER") == "1":
        if not args.only_hmr and not args.base_url:
            parser.error("Start the production preview through the Sites daemon and pass --base-url.")
        if not args.skip_hmr and not args.dev_url:
            parser.error("Pass a daemon-backed --dev-url, or use --skip-hmr and run --only-hmr separately.")
    processes = []
    try:
        results = asyncio.run(run(args, directory, processes))
        output = ROOT / ("test-results/consumer-hmr.json" if args.only_hmr else "test-results/consumer-browser.json")
        output.parent.mkdir(parents=True, exist_ok=True)
        output.write_text(json.dumps({"directory": str(directory), "browser": "Chromium", "results": results}, indent=2) + "\n")
        print(json.dumps(results, indent=2))
        print(f"Consumer browser acceptance passed; evidence: {output}")
    finally:
        for process in processes:
            if process.poll() is None:
                os.killpg(process.pid, signal.SIGTERM)
                process.wait(timeout=10)


if __name__ == "__main__":
    main()
