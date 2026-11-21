"""Bounded, test-only CPU and long-task evidence for an existing Chromium page."""

from __future__ import annotations

import asyncio
from collections import defaultdict
from datetime import datetime, timezone
import json
from pathlib import Path
import re
from time import monotonic
from typing import Any


_START_OBSERVER = """key => {
    window[key]?.observer?.disconnect();
    const state = {
        startedAt: performance.now(), timeOrigin: performance.timeOrigin,
        supported: PerformanceObserver.supportedEntryTypes?.includes('longtask') ?? false,
        count: 0, totalDuration: 0, maxDuration: 0, entries: []
    };
    let observer;
    if (state.supported) {
        observer = new PerformanceObserver(list => {
            for (const entry of list.getEntries()) {
                state.count++;
                state.totalDuration += entry.duration;
                state.maxDuration = Math.max(state.maxDuration, entry.duration);
                state.entries.push({name: entry.name, startTime: entry.startTime,
                    duration: entry.duration, attribution: [...(entry.attribution ?? [])]
                        .slice(0, 4).map(item => ({name: item.name,
                            containerType: item.containerType, containerName: item.containerName,
                            containerId: item.containerId, containerSrc: item.containerSrc}))});
                if (state.entries.length > 16) state.entries.shift();
            }
        });
        observer.observe({type: 'longtask'});
    }
    window[key] = {state, observer};
    return {supported: state.supported, startedAt: state.startedAt};
}"""

_STOP_OBSERVER = """key => {
    const probe = window[key];
    if (!probe) return {available: false, reason: 'Document changed or observer was unavailable'};
    probe.observer?.disconnect();
    const result = {...probe.state, endedAt: performance.now(),
        visibility: document.visibilityState,
        renderer: Object.fromEntries([...document.documentElement.attributes]
            .filter(attribute => attribute.name.startsWith('data-liquid-'))
            .map(attribute => [attribute.name, attribute.value]))};
    delete window[key];
    return result;
}"""

_METRICS = {
    "TaskDuration", "ScriptDuration", "LayoutDuration", "RecalcStyleDuration",
    "LayoutCount", "RecalcStyleCount", "JSHeapUsedSize", "JSHeapTotalSize",
    "Nodes", "Documents", "Frames", "JSEventListeners",
}


def _metrics(result: dict[str, Any]) -> dict[str, float]:
    return {item["name"]: item["value"] for item in result.get("metrics", [])
            if item.get("name") in _METRICS}


def _summary(profile: dict[str, Any]) -> dict[str, Any]:
    nodes = {node["id"]: node for node in profile.get("nodes", [])}
    parents = {child: node["id"] for node in nodes.values()
               for child in node.get("children", [])}
    durations: dict[int, float] = defaultdict(float)
    samples = profile.get("samples", [])
    deltas = profile.get("timeDeltas", [])
    for index, node_id in enumerate(samples):
        durations[node_id] += deltas[index] if index < len(deltas) else 1000

    def frame(node_id: int) -> dict[str, Any]:
        call = nodes.get(node_id, {}).get("callFrame", {})
        return {"function": call.get("functionName") or "(anonymous)",
                "url": call.get("url", ""),
                "line": call.get("lineNumber", -1) + 1,
                "column": call.get("columnNumber", -1) + 1}

    top = []
    for node_id, duration in sorted(durations.items(), key=lambda item: item[1], reverse=True)[:16]:
        stack = []
        ancestor = parents.get(node_id)
        while ancestor is not None and len(stack) < 6:
            stack.append(frame(ancestor))
            ancestor = parents.get(ancestor)
        top.append({**frame(node_id), "selfMilliseconds": round(duration / 1000, 3),
                    "callers": stack})
    return {"durationMilliseconds": round((profile.get("endTime", 0) - profile.get("startTime", 0)) / 1000, 3),
            "sampleCount": len(samples), "nodeCount": len(nodes), "topFrames": top}


class BrowserProfile:
    def __init__(self, page: Any, output_dir: Path, name: str):
        self.page = page
        self.output_dir = output_dir
        self.name = re.sub(r"[^a-zA-Z0-9_-]+", "-", name).strip("-")[:64] or "browser"
        self.key = f"__glassBrowserProfile_{self.name}"
        self.session: Any = None
        self.started = False
        self.finished = False
        self.begin = monotonic()
        self.before: dict[str, float] = {}
        self.metadata: dict[str, Any] = {
            "name": self.name,
            "createdAt": datetime.now(timezone.utc).isoformat(),
            "samplingIntervalMicroseconds": 1000,
            "stopTimeoutSeconds": 2,
            "status": "not-started",
            "errors": [],
        }

    def error(self, phase: str, error: Exception) -> None:
        self.metadata["errors"].append({"phase": phase, "type": type(error).__name__,
                                        "message": str(error)[:1000]})
        self.metadata["errors"] = self.metadata["errors"][-8:]

    async def start(self) -> None:
        async def connect() -> None:
            self.session = await self.page.context.new_cdp_session(self.page)
            await self.session.send("Profiler.enable")
            await self.session.send("Profiler.setSamplingInterval", {"interval": 1000})
            await self.session.send("Profiler.start")
            self.started = True

        try:
            await asyncio.wait_for(connect(), timeout=3)
            self.metadata["status"] = "recording"
        except Exception as error:
            self.error("profile-start", error)
            self.metadata["status"] = "unavailable"
        if self.session is not None:
            try:
                await asyncio.wait_for(self.session.send("Performance.enable"), timeout=0.5)
                self.before = _metrics(await asyncio.wait_for(
                    self.session.send("Performance.getMetrics"), timeout=0.5))
            except Exception as error:
                self.error("metrics-start", error)
        try:
            self.metadata["longTaskObserver"] = await asyncio.wait_for(
                self.page.evaluate(_START_OBSERVER, self.key), timeout=0.75)
        except Exception as error:
            self.error("longtask-start", error)

    async def finish(self) -> dict[str, Any]:
        """Save diagnostics; diagnostic failures do not replace the check's error."""
        if self.finished:
            return self.metadata
        self.finished = True
        try:
            if self.session is not None and self.started:
                try:
                    result = await asyncio.wait_for(self.session.send("Profiler.stop"), timeout=2)
                    profile = result.get("profile")
                    if not isinstance(profile, dict):
                        raise ValueError("Chromium did not return a CPU profile")
                    self.output_dir.mkdir(parents=True, exist_ok=True)
                    path = self.output_dir / f"{self.name}.cpuprofile"
                    path.write_text(json.dumps(profile, separators=(",", ":")) + "\n", encoding="utf-8")
                    self.metadata.update({"status": "saved", "profile": path.name,
                                          "cpu": _summary(profile)})
                except Exception as error:
                    self.error("profile-stop", error)
                    self.metadata["status"] = "incomplete"
            if self.session is not None:
                try:
                    after = _metrics(await asyncio.wait_for(
                        self.session.send("Performance.getMetrics"), timeout=0.5))
                    self.metadata["performanceMetrics"] = {
                        "before": self.before, "after": after,
                        "delta": {name: round(value - self.before[name], 6)
                                  for name, value in after.items() if name in self.before},
                    }
                except Exception as error:
                    self.error("metrics-stop", error)
            try:
                self.metadata["longTasks"] = await asyncio.wait_for(
                    self.page.evaluate(_STOP_OBSERVER, self.key), timeout=0.75)
            except Exception as error:
                self.error("longtask-stop", error)
        finally:
            if self.session is not None:
                try:
                    await asyncio.wait_for(self.session.detach(), timeout=0.5)
                except Exception as error:
                    self.error("profile-detach", error)
            self.metadata["wallDurationSeconds"] = round(monotonic() - self.begin, 3)
            try:
                self.output_dir.mkdir(parents=True, exist_ok=True)
                path = self.output_dir / f"{self.name}-profile.json"
                self.metadata["metadata"] = path.name
                path.write_text(json.dumps(self.metadata, indent=2) + "\n", encoding="utf-8")
            except Exception as error:
                self.error("metadata-save", error)
        return self.metadata


async def start_browser_profile(page: Any, *, output_dir: str | Path, name: str) -> BrowserProfile:
    profile = BrowserProfile(page, Path(output_dir), name)
    await profile.start()
    return profile
