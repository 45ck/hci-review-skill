"""Browser acceptance for the actual tarball consumer, separate from the gallery."""

import argparse
import asyncio
import base64
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
AGENT_ACTION_SCRIPT = """async ({kind, label, action, args}) => {
  const found = await window.consumerAgent.query({kind, text: label});
  if (!Array.isArray(found)) throw new Error(JSON.stringify(found));
  const matches = found.filter(entry => entry.component === kind && entry.label === label && !entry.offPage);
  if (matches.length !== 1) throw new Error('Expected one ' + label + ': ' + JSON.stringify(found));
  return await window.consumerAgent.act({steps: [{ref: matches[0].ref, action, args}]});
}"""
BFCACHE_STATE_SCRIPT = """(() => {
  const state = window.__consumerTransport;
  const input = [...document.querySelectorAll('input')].find(element => {
    const label = element.getAttribute('aria-label') || (element.getAttribute('aria-labelledby') || '')
      .split(/\\s+/).map(id => document.getElementById(id)?.textContent || '').join(' ').trim();
    return label === 'Workspace name';
  });
  let snapshot;
  try { snapshot = window.consumerAgent?.snapshot(); }
  catch (error) { snapshot = {error: String(error)}; }
  return {
    url: location.href, title: document.title, readyState: document.readyState,
    visitId: window.__consumerVisitId, pageShows: window.__consumerPageShows || [],
    inputValue: input?.value, source: document.querySelector('[data-testid=source]')?.textContent,
    transport: state ? {...state, active: Object.keys(state.active)} : null,
    agentSnapshot: snapshot,
    navigation: performance.getEntriesByType('navigation').map(entry => ({
      type: entry.type, notRestoredReasons: entry.notRestoredReasons?.toJSON?.() ?? null
    }))
  };
})()"""


class BrowserEvidence:
    def __init__(self):
        self.output = ROOT / "test-results"
        self.output.mkdir(parents=True, exist_ok=True)
        self.started = time.monotonic()
        self.stage = "startup"
        self.events = []
        self.responses = {}

    def record(self, event, **details):
        self.events.append({"seconds": round(time.monotonic() - self.started, 3), "stage": self.stage,
                            "event": event, **details})
        self.events = self.events[-500:]

    def watch(self, page, label):
        page.on("console", lambda message: self.record("console", page=label, kind=message.type,
                                                       text=message.text[:6000], location=message.location))
        page.on("pageerror", lambda error: self.record("pageerror", page=label, error=str(error),
                                                       stack=getattr(error, "stack", None)))
        page.on("requestfailed", lambda request: self.record("requestfailed", page=label, url=request.url,
                                                             resource=request.resource_type, failure=request.failure))
        page.on("crash", lambda: self.record("crash", page=label))

        def response_received(response):
            self.record("response", page=label, url=response.url, status=response.status,
                        resource=response.request.resource_type)
            if response.request.is_navigation_request() and response.frame == page.main_frame:
                self.responses[page] = response

        page.on("response", response_received)
        return page

    def save_events(self):
        (self.output / "consumer-browser-events.json").write_text(json.dumps(self.events, indent=2) + "\n")

    async def check(self, stage, page, operation):
        self.stage = stage
        self.record("stage-start", url=page.url)
        try:
            result = await operation()
            self.record("stage-passed", url=page.url)
            return result
        except Exception as error:
            await self.failure(page, error)
            raise
        finally:
            self.save_events()

    async def failure(self, page, error):
        prefix = self.output / f"consumer-failure-{self.stage}"
        details = {"stage": self.stage, "url": page.url, "error": str(error), "events": self.events}
        response = self.responses.get(page)
        if response:
            details["documentResponse"] = {"url": response.url, "status": response.status,
                                           "statusText": response.status_text}
            try:
                prefix.with_suffix(".response.html").write_text(await asyncio.wait_for(response.text(), timeout=3))
            except Exception as capture_error:
                details["responseCaptureError"] = str(capture_error)
        try:
            prefix.with_suffix(".html").write_text(await asyncio.wait_for(page.content(), timeout=3))
            details["dom"] = await asyncio.wait_for(page.evaluate("""() => {
              const state = window.__consumerTransport;
              let snapshot;
              try { snapshot = window.consumerAgent?.snapshot(); }
              catch (error) { snapshot = {error: String(error)}; }
              return {
                title: document.title, readyState: document.readyState,
                bodyText: document.body?.innerText.slice(0, 16000),
                rootHtml: document.getElementById('root')?.innerHTML.slice(0, 16000),
                headings: [...document.querySelectorAll('h1,h2,h3,[role=heading]')].map(element => ({
                  text: element.textContent, display: getComputedStyle(element).display,
                  visibility: getComputedStyle(element).visibility, rect: element.getBoundingClientRect().toJSON()
                })),
                scripts: [...document.scripts].map(script => script.src),
                lifecycle: {visitId: window.__consumerVisitId, pageShows: window.__consumerPageShows},
                navigation: performance.getEntriesByType('navigation').map(entry => ({
                  type: entry.type, notRestoredReasons: entry.notRestoredReasons?.toJSON?.() ?? null
                })),
                transport: state ? {...state, active: Object.keys(state.active)} : null,
                agentSnapshot: snapshot
              };
            }"""), timeout=3)
        except Exception as capture_error:
            details["domCaptureError"] = str(capture_error)
        try:
            await page.screenshot(path=str(prefix.with_suffix(".png")), full_page=True, timeout=5000)
        except Exception as capture_error:
            details["screenshotCaptureError"] = str(capture_error)
        prefix.with_suffix(".json").write_text(json.dumps(details, indent=2) + "\n")
        failures = [event for event in self.events if event["event"] in ("pageerror", "requestfailed", "crash")
                    or event["event"] == "response" and event["status"] >= 400]
        print(json.dumps({"consumerFailure": self.stage, "url": page.url, "diagnostics": str(prefix.with_suffix(".json")),
                          "browserErrors": failures}, indent=2), flush=True)


def transport_script(enabled):
    return """(() => {
      window.__consumerVisitId = crypto.randomUUID();
      window.__consumerPageShows = [];
      addEventListener('pageshow', event => window.__consumerPageShows.push(event.persisted));
      const state = {active: {}, registered: [], unregistered: [], duplicates: []};
      window.__consumerTransport = state;
      Object.defineProperty(document, 'modelContext', {configurable: true, value: ENABLED ? {
        async registerTool(tool, {signal} = {}) {
          if (signal?.aborted) throw new DOMException('Registration aborted', 'AbortError');
          if (state.active[tool.name]) { state.duplicates.push(tool.name); throw new Error('Duplicate tool registration: ' + tool.name); }
          state.active[tool.name] = tool;
          state.registered.push(tool.name);
          signal?.addEventListener('abort', () => {
            if (state.active[tool.name] !== tool) return;
            delete state.active[tool.name];
            state.unregistered.push(tool.name);
          }, {once: true});
        }
      } : undefined});
    })();""".replace("ENABLED", "true" if enabled else "false")


async def act(page, kind, label, action, arguments):
    return await page.evaluate(AGENT_ACTION_SCRIPT,
                               {"kind": kind, "label": label, "action": action, "args": arguments})


async def transport(page, count):
    await page.wait_for_function("count => Object.keys(window.__consumerTransport.active).length === count", arg=count)
    state = await page.evaluate("() => ({...window.__consumerTransport, active: Object.keys(window.__consumerTransport.active)})")
    assert not state["duplicates"], state
    return state


async def page_fit(page):
    await page.evaluate("() => document.fonts.ready")
    geometry = await page.evaluate("""() => {
      const shell = document.querySelector('.consumer-shell');
      const workarea = shell.querySelector('.qg-application-workarea');
      const content = shell.querySelector('.consumer-content');
      const measure = element => ({
        rect: element.getBoundingClientRect().toJSON(),
        clientWidth: element.clientWidth, scrollWidth: element.scrollWidth
      });
      return {
        viewportWidth: document.documentElement.clientWidth,
        documentWidth: document.documentElement.scrollWidth,
        shell: measure(shell), workarea: measure(workarea), content: measure(content)
      };
    }""")
    assert geometry["documentWidth"] <= geometry["viewportWidth"] + 1, f"Page overflows horizontally: {geometry}"
    shell = geometry["shell"]["rect"]
    workarea = geometry["workarea"]["rect"]
    assert abs(shell["left"] - workarea["left"]) <= 1 and abs(shell["width"] - workarea["width"]) <= 1, \
        f"The rail-free work area must fill its shell: {geometry}"
    for region in ("shell", "workarea", "content"):
        area = geometry[region]
        assert area["rect"]["left"] >= -1 and area["rect"]["right"] <= geometry["viewportWidth"] + 1, \
            f"{region} extends outside the viewport: {geometry}"
        assert area["scrollWidth"] <= area["clientWidth"] + 1, f"{region} needs horizontal scrolling: {geometry}"
    return geometry


async def workspace(page, url, with_transport):
    errors = []
    page.on("pageerror", lambda error: errors.append(str(error)))
    await page.goto(url, wait_until="networkidle")
    await expect(page.get_by_role("heading", name="Installed package workspace")).to_be_visible()
    geometry = await page_fit(page)
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
            "keyboard": True, "unmountAndRemount": True, "pageFit": geometry}


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


async def cdp_send(session, method, parameters=None):
    return await asyncio.wait_for(session.send(method, parameters or {}), timeout=5)


async def cdp_evaluate(session, expression):
    response = await cdp_send(session, "Runtime.evaluate", {
        "expression": expression, "awaitPromise": True, "returnByValue": True,
        "allowUnsafeEvalBlockedByCSP": False,
    })
    assert "exceptionDetails" not in response, response.get("exceptionDetails")
    return response["result"].get("value")


async def cdp_wait_state(session, predicate, description):
    deadline = time.monotonic() + 5
    last = None
    while time.monotonic() < deadline:
        try:
            last = await cdp_evaluate(session, BFCACHE_STATE_SCRIPT)
        except Exception as error:
            if not any(text in str(error).lower() for text in (
                "execution context was destroyed", "cannot find context", "cannot find default execution context",
            )):
                raise
            last = {"contextTransition": str(error)}
        else:
            if predicate(last):
                return last
        await asyncio.sleep(0.05)
    raise AssertionError(f"Timed out waiting for {description}: {last}")


async def bfcache(browser, url, evidence):
    # Playwright cannot synchronize a restored Page; this disposable context uses CDP only.
    # https://playwright.dev/python/docs/navigations#backforward-cache-bfcache
    context = await browser.new_context(viewport={"width": 1280, "height": 960})
    session = None
    evidence.stage = "bfcache"
    evidence.record("stage-start", url=url, driver="CDP Page/Runtime")
    details = {"stage": "bfcache", "driver": "CDP Page/Runtime", "url": url, "cdpEvents": []}

    def record_cdp(name, event):
        item = {"event": name, "details": event}
        details["cdpEvents"].append(item)
        details["cdpEvents"] = details["cdpEvents"][-100:]
        evidence.record("cdp", page="bfcache", method=name, details=event)

    def ready(state, expected_url):
        snapshot = state.get("agentSnapshot")
        return state.get("url") == expected_url and state.get("readyState") == "complete" and \
            state.get("inputValue") is not None and state.get("transport") and \
            len(state["transport"]["active"]) == 3 and isinstance(snapshot, list) and \
            any(entry.get("component") == "input" and entry.get("label") == "Workspace name" and
                not entry.get("offPage") for entry in snapshot)

    def registered(state):
        transport_state = state["transport"]
        assert sorted(transport_state["active"]) == ["act", "query", "snapshot"], transport_state
        assert not transport_state["duplicates"], transport_state

    async def set_name(value):
        arguments = {"kind": "input", "label": "Workspace name", "action": "setValue", "args": [value]}
        result = await cdp_evaluate(session, f"({AGENT_ACTION_SCRIPT})({json.dumps(arguments)})")
        assert result["ok"], result
        state = await cdp_wait_state(session, lambda current: ready(current, url) and current.get("inputValue") == value,
                                     f"the SDK to accept Workspace name {value!r}")
        assert state["source"] == "agent", state
        registered(state)
        return state

    try:
        page = await context.new_page()
        session = await context.new_cdp_session(page)
        for name in ("Page.frameNavigated", "Page.loadEventFired", "Page.backForwardCacheNotUsed",
                     "Runtime.exceptionThrown"):
            session.on(name, lambda event, name=name: record_cdp(name, event))
        session.on("Runtime.consoleAPICalled", lambda event: record_cdp("Runtime.consoleAPICalled", {
            "type": event["type"], "text": " ".join(str(argument.get("value", argument.get("description", "")))
                                                       for argument in event.get("args", []))[:6000],
        }))
        await cdp_send(session, "Page.enable")
        await cdp_send(session, "Runtime.enable")
        await cdp_send(session, "Page.addScriptToEvaluateOnNewDocument", {"source": transport_script(True)})
        navigation = await cdp_send(session, "Page.navigate", {"url": url})
        assert not navigation.get("errorText"), navigation
        await cdp_wait_state(session, lambda state: ready(state, url), "the installed consumer to become ready")
        details["before"] = before = await set_name("Return preserved")

        away_url = url + "away.html"
        navigation = await cdp_send(session, "Page.navigate", {"url": away_url})
        assert not navigation.get("errorText"), navigation
        await cdp_wait_state(session, lambda state: state.get("url") == away_url and state.get("readyState") == "complete",
                             "the separate document to load")
        history = await cdp_send(session, "Page.getNavigationHistory")
        current = history["currentIndex"]
        assert current > 0 and history["entries"][current]["url"] == away_url, history
        previous = history["entries"][current - 1]
        assert previous["url"] == url, history
        details["history"] = history
        await cdp_send(session, "Page.navigateToHistoryEntry", {"entryId": previous["id"]})
        details["restored"] = restored = await cdp_wait_state(session,
            lambda state: ready(state, url) and state.get("visitId") == before["visitId"] and
                          True in state.get("pageShows", []),
            "the same document's persisted pageshow after browser history return")
        assert restored["visitId"] == before["visitId"] and True in restored["pageShows"], \
            f"Browser did not restore this document from BFCache: {restored}"
        assert restored["inputValue"] == "Return preserved", restored
        registered(restored)
        details["afterAction"] = await set_name("After browser return")
        assert not [event for event in details["cdpEvents"] if event["event"] == "Runtime.exceptionThrown"], details["cdpEvents"]
        details["status"] = "passed"
        (evidence.output / "consumer-bfcache.json").write_text(json.dumps(details, indent=2) + "\n")
        evidence.record("stage-passed", url=url, driver=details["driver"])
        return {"driver": details["driver"], "actualPersistedPageshow": True, "sameVisitIdentity": True,
                "statePreserved": True, "bridgeOperational": True, "evidence": "consumer-bfcache.json"}
    except Exception as error:
        details.update({"status": "failed", "error": str(error), "errorType": type(error).__name__})
        prefix = evidence.output / "consumer-failure-bfcache"
        if session is not None:
            try:
                details["dom"] = await cdp_evaluate(session, BFCACHE_STATE_SCRIPT)
                prefix.with_suffix(".html").write_text(await cdp_evaluate(session, "document.documentElement.outerHTML"))
            except Exception as capture_error:
                details["domCaptureError"] = str(capture_error)
            try:
                screenshot = await cdp_send(session, "Page.captureScreenshot", {"format": "png", "captureBeyondViewport": True})
                prefix.with_suffix(".png").write_bytes(base64.b64decode(screenshot["data"]))
            except Exception as capture_error:
                details["screenshotCaptureError"] = str(capture_error)
        prefix.with_suffix(".json").write_text(json.dumps(details, indent=2) + "\n")
        evidence.record("stage-failed", url=details.get("dom", {}).get("url", url), error=str(error))
        print(json.dumps({"consumerFailure": "bfcache", "diagnostics": str(prefix.with_suffix(".json")),
                          "error": str(error), "driver": details["driver"]}, indent=2), flush=True)
        raise
    finally:
        evidence.save_events()
        await context.close()


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
    log = ROOT / f"test-results/consumer-{mode}-server.log"
    log.parent.mkdir(parents=True, exist_ok=True)
    with log.open("w") as stream:
        process = subprocess.Popen(["npm", "run", mode, "--", "--port", str(port)], cwd=directory,
                                   stdout=stream, stderr=subprocess.STDOUT, start_new_session=True)
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


async def run(args, directory, processes, browser_info):
    from playwright.async_api import async_playwright, expect as playwright_expect

    global expect
    expect = playwright_expect
    results = {}
    evidence = BrowserEvidence()
    async with async_playwright() as playwright:
        # Match the gallery's regular Chromium headless mode. The default
        # headless shell disables BFCache independently of this default flag.
        channel = "chromium"
        browser = await playwright.chromium.launch(headless=True, channel=channel,
                                                   ignore_default_args=["--disable-back-forward-cache"])
        browser_info.update({"browser": browser.version, "browserChannel": channel})
        evidence.record("browser-launched", **browser_info)
        try:
            if not args.only_hmr:
                base = (args.base_url or start_server(directory, "preview", processes)).rstrip("/") + "/"
                context = await browser.new_context(viewport={"width": 1280, "height": 960})
                await context.add_init_script(transport_script(True))
                page = evidence.watch(await context.new_page(), "production")
                results["workspace"] = await evidence.check("workspace", page, lambda: workspace(page, base, True))
                results["documentation"] = await evidence.check("documentation", page, lambda: documentation(page, base))
                await page.screenshot(path=str(ROOT / "test-results/consumer-desktop.png"), full_page=True)
                results["copiedStarter"] = await evidence.check("copied-starter", page, lambda: starter(page, base))
                await context.close()
                results["bfcache"] = await bfcache(browser, base, evidence)
                context = await browser.new_context(viewport={"width": 390, "height": 844})
                await context.add_init_script(transport_script(False))
                page = evidence.watch(await context.new_page(), "without-webmcp")
                results["withoutWebMcp"] = await evidence.check("without-webmcp", page, lambda: workspace(page, base, False))
                await page.screenshot(path=str(ROOT / "test-results/consumer-mobile.png"), full_page=True)
                await context.close()
            if not args.skip_hmr:
                dev = (args.dev_url or start_server(directory, "dev", processes)).rstrip("/") + "/"
                context = await browser.new_context(viewport={"width": 1280, "height": 960})
                await context.add_init_script(transport_script(True))
                page = evidence.watch(await context.new_page(), "development")
                results["hmr"] = await evidence.check("hmr", page, lambda: hmr(page, dev, directory))
                await context.close()
        finally:
            evidence.save_events()
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
    browser_info = {}
    output = ROOT / ("test-results/consumer-hmr.json" if args.only_hmr else "test-results/consumer-browser.json")
    output.parent.mkdir(parents=True, exist_ok=True)
    try:
        results = asyncio.run(run(args, directory, processes, browser_info))
        output.write_text(json.dumps({"status": "passed", "directory": str(directory), **browser_info, "results": results}, indent=2) + "\n")
        print(json.dumps(results, indent=2))
        print(f"Consumer browser acceptance passed; evidence: {output}")
    except Exception as error:
        output.write_text(json.dumps({"status": "failed", "directory": str(directory), **browser_info,
                                      "error": str(error), "errorType": type(error).__name__}, indent=2) + "\n")
        raise
    finally:
        for process in processes:
            if process.poll() is None:
                os.killpg(process.pid, signal.SIGTERM)
                process.wait(timeout=10)


if __name__ == "__main__":
    main()
