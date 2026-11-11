"use strict";

const variant = new URLSearchParams(location.search).get("variant") === "candidate"
  ? "candidate"
  : "baseline";
const candidate = variant === "candidate";
document.documentElement.dataset.variant = variant;
document.querySelector("#variant").textContent = variant;

const frame = () => new Promise(resolve => requestAnimationFrame(resolve));
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

// The second callback follows a paint opportunity. It cannot prove screen presentation.
async function afterPaintOpportunity() {
  await frame();
  await frame();
  return performance.now();
}

function maxShiftWindow(entries) {
  let peak = 0;
  let start = -Infinity;
  let previous = -Infinity;
  let sum = 0;
  for (const entry of entries) {
    if (entry.hadRecentInput) continue;
    if (entry.startTime - previous >= 1000 || entry.startTime - start >= 5000) {
      start = entry.startTime;
      sum = 0;
    }
    sum += entry.value;
    peak = Math.max(peak, sum);
    previous = entry.startTime;
  }
  return peak;
}

async function measureLayout() {
  if (!PerformanceObserver.supportedEntryTypes.includes("layout-shift")) {
    throw new Error("The browser benchmark requires the Layout Instability API (use Chromium).");
  }
  const late = document.querySelector("#late-content");
  const target = document.querySelector("#shift-target");
  delete late.dataset.loaded;
  late.replaceChildren();
  await afterPaintOpportunity();

  const entries = [];
  const observer = new PerformanceObserver(list => entries.push(...list.getEntries()));
  observer.observe({type: "layout-shift"});
  const before = target.getBoundingClientRect();

  try {
    const announcement = document.createElement("p");
    announcement.textContent = "Delivery is available for this order.";
    late.append(announcement);
    late.dataset.loaded = "";
    await afterPaintOpportunity();
    const after = target.getBoundingClientRect();
    entries.push(...observer.takeRecords());
    entries.sort((left, right) => left.startTime - right.startTime);
    return {
      page_view_cls: [maxShiftWindow(entries)],
      target_drift_px: [Math.hypot(after.x - before.x, after.y - before.y)],
    };
  } finally {
    observer.disconnect();
  }
}

function opticalCentre() {
  const icon = document.querySelector("#play-icon");
  const context = icon.getContext("2d");
  const offset = candidate ? 8 / 3 : 0;
  context.clearRect(0, 0, icon.width, icon.height);
  context.fillStyle = "#274867";
  context.beginPath();
  context.moveTo(8 + offset, 6);
  context.lineTo(24 + offset, 16);
  context.lineTo(8 + offset, 26);
  context.closePath();
  context.fill();

  const {data} = context.getImageData(0, 0, icon.width, icon.height);
  let alphaSum = 0;
  let xSum = 0;
  let ySum = 0;
  for (let y = 0; y < icon.height; y += 1) {
    for (let x = 0; x < icon.width; x += 1) {
      const alpha = data[4 * (y * icon.width + x) + 3];
      alphaSum += alpha;
      xSum += (x + 0.5) * alpha;
      ySum += (y + 0.5) * alpha;
    }
  }
  return {
    ink_centroid_px: [xSum / alphaSum, ySum / alphaSum],
    container_centre_px: [icon.width / 2, icon.height / 2],
    container_short_side_px: Math.min(icon.width, icon.height),
  };
}

function tabularNumbers() {
  const gauge = document.querySelector("#digit-gauge");
  const advances = [];
  for (const digit of "0123456789") {
    gauge.textContent = digit;
    advances.push(gauge.getBoundingClientRect().width);
  }
  return {
    digit_advances_px: advances,
    decimal_positions_px: Array.from(document.querySelectorAll(".decimal"), decimal =>
      decimal.getBoundingClientRect().x
    ),
  };
}

function renderedLines(paragraph) {
  const node = paragraph.firstChild;
  const range = new Range();
  const segmenter = new Intl.Segmenter(document.documentElement.lang, {granularity: "grapheme"});
  const lines = new Map();
  for (const {segment, index} of segmenter.segment(node.textContent)) {
    range.setStart(node, index);
    range.setEnd(node, index + segment.length);
    const rect = range.getClientRects()[0];
    if (!rect || rect.width === 0) continue;
    lines.set(rect.top, (lines.get(rect.top) ?? "") + segment);
  }
  return Array.from(lines, ([top, text]) => ({top, text: text.trim()}));
}

function typography() {
  const labelStyle = getComputedStyle(document.querySelector("#type-label"));
  const context = document.createElement("canvas").getContext("2d");
  context.font = `${labelStyle.fontWeight} ${labelStyle.fontSize} ${labelStyle.fontFamily}`;
  context.fontKerning = "normal";
  const kerned = context.measureText("AV").width;
  context.fontKerning = "none";
  const unkerned = context.measureText("AV").width;

  const paragraphs = Array.from(document.querySelectorAll(".prose p"));
  const lines = paragraphs.map(renderedLines).filter(paragraph => paragraph.length > 1);
  const words = new Intl.Segmenter(document.documentElement.lang, {granularity: "word"});
  const graphemes = new Intl.Segmenter(document.documentElement.lang, {granularity: "grapheme"});
  const oneWordEndings = lines.filter(paragraph => {
    const lastLine = paragraph[paragraph.length - 1];
    return Array.from(words.segment(lastLine.text)).filter(segment => segment.isWordLike).length === 1;
  }).length;

  return {
    kerning: {kerned_px: kerned, unkerned_px: unkerned, font_size_px: parseFloat(labelStyle.fontSize)},
    "optical-centre": opticalCentre(),
    "tabular-numbers": tabularNumbers(),
    tracking: {
      letter_spacing_px: parseFloat(labelStyle.letterSpacing),
      font_size_px: parseFloat(labelStyle.fontSize),
    },
    "x-height": {
      x_height_px: context.measureText("x").actualBoundingBoxAscent,
      font_size_px: parseFloat(labelStyle.fontSize),
    },
    leading: {
      baseline_distance_px: lines[0][1].top - lines[0][0].top,
      font_size_px: parseFloat(getComputedStyle(paragraphs[0]).fontSize),
    },
    widow: {one_word_endings: oneWordEndings, multiline_blocks: lines.length},
    "line-length": {
      full_line_graphemes: lines.flatMap(paragraph =>
        paragraph.slice(0, -1).map(line => Array.from(graphemes.segment(line.text)).length)
      ),
    },
  };
}

async function mutationAttempt(rejected) {
  const button = document.querySelector("#like");
  const status = document.querySelector("#like-status");
  button.setAttribute("aria-pressed", "false");
  status.textContent = "";
  let actionTime;
  let settlementTime;
  let visibleResult;
  let reconciled = false;

  const result = new Promise(resolve => {
    button.addEventListener("click", async () => {
      actionTime = performance.now();
      const server = delay(240);
      if (candidate) {
        button.setAttribute("aria-pressed", "true");
        status.textContent = "Saving";
        visibleResult = afterPaintOpportunity();
      }
      await server;
      settlementTime = performance.now();
      button.setAttribute("aria-pressed", String(!rejected));
      status.textContent = rejected ? "Could not save" : "Saved";
      reconciled = candidate && rejected;
      const paint = await (visibleResult ?? afterPaintOpportunity());
      resolve({actionTime, paint, settlementTime, reconciled});
    }, {once: true});
  });
  button.click();
  return result;
}

async function optimisticUpdate() {
  const accepted = await mutationAttempt(false);
  const rejected = await mutationAttempt(true);
  return {
    action_ms: accepted.actionTime,
    paint_ms: accepted.paint,
    settled_ms: accepted.settlementTime,
    reconciled: Number(accepted.reconciled) + Number(rejected.reconciled),
    settled_mutations: 2,
  };
}

async function stagger() {
  const buttons = Array.from(document.querySelectorAll("#stagger-items button"));
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const contentReady = performance.now();
  if (reduced) {
    for (const button of buttons) button.disabled = false;
    return {
      onsets_ms: buttons.map(() => contentReady),
      content_ready_ms: contentReady,
      all_items_usable_ms: contentReady,
    };
  }

  let allItemsUsable;
  const animations = buttons.map((button, index) => {
    button.disabled = !candidate;
    const startOpacity = candidate ? 0.75 : 0;
    return button.parentElement.animate([{opacity: startOpacity}, {opacity: 1}], {
      delay: index * (candidate ? 20 : 55),
      duration: 120,
      fill: "both",
    });
  });
  if (candidate) allItemsUsable = performance.now();
  const finished = Promise.all(animations.map(animation => animation.finished)).then(() => {
    for (const button of buttons) button.disabled = false;
    allItemsUsable ??= performance.now();
  });

  const onsets = new Array(buttons.length).fill(null);
  while (onsets.includes(null)) {
    const timestamp = await frame();
    buttons.forEach((button, index) => {
      if (onsets[index] === null && Number(getComputedStyle(button.parentElement).opacity) >= 0.05) {
        onsets[index] = timestamp;
      }
    });
  }
  await finished;
  for (const animation of animations) animation.cancel();
  return {
    onsets_ms: onsets,
    content_ready_ms: contentReady,
    all_items_usable_ms: allItemsUsable,
  };
}

async function runMeasurements() {
  // Keep the shift observer ahead of any fixture interactions.
  const layout = await measureLayout();
  await document.fonts.ready;
  return {
    ...typography(),
    "layout-shift": layout,
    "optimistic-update": await optimisticUpdate(),
    stagger: await stagger(),
  };
}

const staggerItems = document.querySelector("#stagger-items");
staggerItems.addEventListener("click", event => {
  const button = event.target.closest("button");
  if (button) document.querySelector("#stagger-status").textContent = button.textContent;
});

document.querySelector("#run").addEventListener("click", async event => {
  const button = event.currentTarget;
  const output = document.querySelector("#result");
  button.disabled = true;
  output.textContent = "";
  try {
    // CLS excludes shifts immediately after input. Give the click exclusion time to expire.
    await delay(550);
    window.scrollTo(0, 0);
    output.textContent = JSON.stringify(await runMeasurements(), null, 2);
  } catch (error) {
    output.textContent = error.message;
  } finally {
    button.disabled = false;
  }
});

window.runMeasurements = runMeasurements;
