/* eslint-env node */
import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { spawn } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, dirname, join, resolve } from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import { createServer, preview } from "vite";

const development = process.env.UI_TEST_DEV === "1";

const browserPath = process.env.BROWSER_BIN || [
  "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
  "C:/Program Files/Google/Chrome/Application/chrome.exe",
  "/usr/bin/google-chrome",
  "/usr/bin/chromium",
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
].find(existsSync);

let server, browser, socket, profile, baseUrl;
let commandId = 0;
const pending = new Map();
const exceptions = [];

function send(method, params = {}) {
  return new Promise((resolveCommand, reject) => {
    const id = ++commandId;
    const timeout = setTimeout(() => {
      pending.delete(id);
      reject(new Error("Browser command timed out: " + method));
    }, 10000);
    pending.set(id, { resolveCommand, reject, timeout });
    socket.send(JSON.stringify({ id, method, params }));
  });
}

async function evaluate(expression) {
  const result = await send("Runtime.evaluate", {
    expression, returnByValue: true, awaitPromise: true,
  });
  if (result.exceptionDetails) throw new Error(result.exceptionDetails.text);
  return result.result.value;
}

async function waitFor(expression, timeout = 5000) {
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) {
    if (await evaluate("Boolean(" + expression + ")")) return;
    await delay(30);
  }
  const state = await evaluate('JSON.stringify({focus: document.activeElement?.outerHTML.slice(0,300), focused: document.hasFocus(), timers: window.__rotationTimers?.size, viewport: innerWidth, track: (() => {const el = document.querySelector("ul[tabindex]"); return el && {width: el.clientWidth, scroll: el.scrollWidth, transform: getComputedStyle(el).transform, display: getComputedStyle(el).display}})()})');
  throw new Error("Browser condition timed out: " + expression + "\n" + state);
}

async function viewport(width) {
  await send("Emulation.setDeviceMetricsOverride", {
    width, height: 900, deviceScaleFactor: 1, mobile: false,
  });
}

async function load(width = 375, reducedMotion = false) {
  await viewport(width);
  await send("Emulation.setEmulatedMedia", {
    features: [{ name: "prefers-reduced-motion", value: reducedMotion ? "reduce" : "no-preference" }],
  });
  await send("Input.dispatchMouseEvent", { type: "mouseMoved", x: 0, y: 0 });
  await send("Page.navigate", { url: baseUrl });
  await waitFor('document.querySelector("button[aria-expanded]") && window.__rotationTimers');
  await delay(80);
}

async function click(selector) {
  const point = await evaluate(`(() => {
    const element = document.querySelector(${JSON.stringify(selector)});
    element.scrollIntoView({ block: "center" });
    const rect = element.getBoundingClientRect();
    return { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 };
  })()`);
  await send("Input.dispatchMouseEvent", { type: "mouseMoved", ...point });
  await send("Input.dispatchMouseEvent", { type: "mousePressed", button: "left", clickCount: 1, ...point });
  await send("Input.dispatchMouseEvent", { type: "mouseReleased", button: "left", clickCount: 1, ...point });
}

async function key(keyName, modifiers = 0) {
  const codes = { Tab: 9, Escape: 27, ArrowLeft: 37, ArrowRight: 39 };
  const params = { key: keyName, code: keyName, windowsVirtualKeyCode: codes[keyName], modifiers };
  await send("Input.dispatchKeyEvent", { type: "keyDown", ...params });
  await send("Input.dispatchKeyEvent", { type: "keyUp", ...params });
}

before(async () => {
  assert.ok(browserPath, "Install Chrome/Edge or set BROWSER_BIN to a Chromium browser.");
  if (!development) assert.ok(existsSync("dist/index.html"), "Run npm run build before npm test.");
  server = development ? await createServer({
    server: { host: "127.0.0.1", port: 0, strictPort: true, open: false },
  }) : await preview({
    configFile: false,
    base: "/landingPage/",
    preview: { host: "127.0.0.1", port: 0, strictPort: true, open: false },
  });
  if (development) await server.listen();
  baseUrl = server.resolvedUrls.local[0];
  profile = mkdtempSync(join(tmpdir(), "landing-ui-tests-"));
  browser = spawn(browserPath, [
    "--headless=new", "--disable-gpu", "--no-first-run",
    "--no-default-browser-check", "--remote-debugging-port=0",
    "--user-data-dir=" + profile, "about:blank",
  ], { windowsHide: true, stdio: "ignore" });
  const activePort = join(profile, "DevToolsActivePort");
  const deadline = Date.now() + 15000;
  while (!existsSync(activePort) && Date.now() < deadline) await delay(50);
  assert.ok(existsSync(activePort), "Browser did not start its debugging endpoint.");
  const port = readFileSync(activePort, "utf8").split("\n")[0].trim();
  const pages = await (await fetch("http://127.0.0.1:" + port + "/json/list")).json();
  socket = new globalThis.WebSocket(pages.find(page => page.type === "page").webSocketDebuggerUrl);
  socket.addEventListener("message", event => {
    const message = JSON.parse(event.data);
    if (message.method === "Runtime.exceptionThrown") {
      exceptions.push(message.params.exceptionDetails.exception?.description || message.params.exceptionDetails.text);
    }
    const command = pending.get(message.id);
    if (!command) return;
    clearTimeout(command.timeout);
    pending.delete(message.id);
    if (message.error) command.reject(new Error(message.error.message));
    else command.resolveCommand(message.result);
  });
  await new Promise((resolveOpen, reject) => {
    socket.addEventListener("open", resolveOpen, { once: true });
    socket.addEventListener("error", reject, { once: true });
  });
  await send("Page.enable");
  await send("Runtime.enable");
  await send("Emulation.setFocusEmulationEnabled", { enabled: true });
  // Control only the carousel clock; keep animations and browser timers real.
  await send("Page.addScriptToEvaluateOnNewDocument", {
    source: `(() => {
      const originalSetInterval = window.setInterval.bind(window);
      const originalClearInterval = window.clearInterval.bind(window);
      window.__rotationTimers = new Map();
      window.setInterval = (callback, milliseconds, ...args) => {
        if (milliseconds !== 3500) return originalSetInterval(callback, milliseconds, ...args);
        const id = originalSetInterval(() => {}, 2147483647);
        window.__rotationTimers.set(id, () => callback(...args));
        return id;
      };
      window.clearInterval = id => {
        window.__rotationTimers.delete(id);
        originalClearInterval(id);
      };
      window.__advanceCarousel = () => [...window.__rotationTimers.values()].forEach(callback => callback());
    })();`,
  });
}, { timeout: 25000 });

after(async () => {
  if (socket?.readyState === 1) {
    await send("Browser.close").catch(() => {});
    socket.close();
  }
  if (browser) {
    const deadline = Date.now() + 3000;
    while (browser.exitCode === null && Date.now() < deadline) await delay(50);
    if (browser.exitCode === null) browser.kill();
  }
  if (server) {
    if (development) await server.close();
    else await new Promise(resolveClose => server.httpServer.close(resolveClose));
  }
  if (profile) {
    // Remove only the temporary profile created by this test run.
    assert.equal(dirname(resolve(profile)), resolve(tmpdir()));
    assert.ok(basename(profile).startsWith("landing-ui-tests-"));
    rmSync(profile, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 });
  }
});

test("menu traps keyboard focus, closes with Escape, and restores scrolling", async () => {
  await load();
  await click('button[aria-label="Open navigation"]');
  await waitFor('document.body.classList.contains("overflow-hidden") && document.activeElement.closest("#mobile-navigation")');
  assert.equal(await evaluate('document.querySelector("[role=dialog]").getAttribute("aria-modal")'), "true");
  await evaluate('document.querySelector("button[aria-expanded]").focus()');
  await key("Tab");
  assert.equal(await evaluate('document.activeElement === document.querySelector("header > a")'), true);
  await key("Tab", 8);
  assert.equal(await evaluate('document.activeElement.getAttribute("aria-label")'), "Close navigation");
  await key("Escape");
  await waitFor('!document.body.classList.contains("overflow-hidden") && !document.querySelector("#mobile-navigation")');
  assert.equal(await evaluate('document.activeElement.getAttribute("aria-label")'), "Open navigation");
});

test("menu closes on link/backdrop clicks and desktop resize", async () => {
  await load();
  await click('button[aria-expanded]');
  await click('#mobile-navigation a');
  await waitFor('!document.body.classList.contains("overflow-hidden")');
  await click('button[aria-expanded]');
  await send("Input.dispatchMouseEvent", { type: "mousePressed", button: "left", clickCount: 1, x: 15, y: 850 });
  await send("Input.dispatchMouseEvent", { type: "mouseReleased", button: "left", clickCount: 1, x: 15, y: 850 });
  await waitFor('!document.querySelector("#mobile-navigation")');
  await click('button[aria-expanded]');
  await viewport(1200);
  await waitFor('!document.body.classList.contains("overflow-hidden") && !document.querySelector("#mobile-navigation")');
  assert.equal(await evaluate('getComputedStyle(document.querySelector("button[aria-expanded]")).display'), "none");
  await viewport(375);
  assert.equal(await evaluate('document.querySelector("button[aria-expanded]").getAttribute("aria-expanded")'), "false");
});

test("carousel rotates and wraps, pauses on focus, and hides inactive slides from accessibility APIs", async () => {
  await load();
  const selected = 'document.querySelector("button[aria-pressed=true]")';
  await waitFor('window.__rotationTimers.size === 1');
  assert.match(await evaluate(selected + '.getAttribute("aria-label")'), /Show testimonial 1:/);
  await evaluate("window.__advanceCarousel()");
  await waitFor(selected + '.getAttribute("aria-label").startsWith("Show testimonial 2:")');
  await evaluate("window.__advanceCarousel(); window.__advanceCarousel(); window.__advanceCarousel()");
  await waitFor(selected + '.getAttribute("aria-label").startsWith("Show testimonial 1:")');
  await evaluate('document.querySelectorAll("button[aria-pressed]")[2].focus(); document.querySelectorAll("button[aria-pressed]")[2].click()');
  await waitFor('window.__rotationTimers.size === 0');
  assert.equal(await evaluate('document.querySelector("ul[aria-live]").getAttribute("aria-live")'), "polite");
  assert.match(await evaluate(selected + '.getAttribute("aria-label")'), /Show testimonial 3:/);
  assert.equal(await evaluate('document.querySelectorAll("li[aria-hidden=false]").length'), 1);
  assert.equal(await evaluate('document.querySelectorAll("li[aria-hidden=true]").length'), 3);
  await evaluate('document.querySelector("section[aria-roledescription=carousel] > button").click()');
  await waitFor('window.__rotationTimers.size === 1');
});

test("carousel respects reduced motion", async () => {
  await load(375, true);
  assert.equal(await evaluate("window.__rotationTimers.size"), 0);
  assert.equal(await evaluate('document.querySelector("button[aria-pressed=true]").getAttribute("aria-label").startsWith("Show testimonial 1:")'), true);
});

test("carousel drag and keyboard bounds update after mobile-to-desktop and wide viewport changes", async () => {
  await load();
  await viewport(1200);
  const track = 'document.querySelector("ul[tabindex]")';
  const offset = `new DOMMatrix(getComputedStyle(${track}).transform).m41`;
  await evaluate(track + '.scrollIntoView({ block: "center" }); ' + track + ".focus()");
  await waitFor(track + ".clientWidth > 900 && " + track + ".scrollWidth > " + track + ".clientWidth");
  await delay(100);
  await key("ArrowRight");
  await waitFor(offset + " < -100");
  await key("ArrowLeft");
  await waitFor(offset + " === 0");
  const point = await evaluate(`(() => {
    const rect = ${track}.getBoundingClientRect();
    return { x: 900, y: rect.y + rect.height / 2 };
  })()`);
  await send("Input.dispatchMouseEvent", { type: "mouseMoved", ...point });
  await send("Input.dispatchMouseEvent", { type: "mousePressed", button: "left", clickCount: 1, ...point });
  for (let step = 1; step <= 8; step++) {
    await send("Input.dispatchMouseEvent", { type: "mouseMoved", button: "left", buttons: 1, x: point.x - step * 70, y: point.y });
    await delay(20);
  }
  await send("Input.dispatchMouseEvent", { type: "mouseReleased", button: "left", clickCount: 1, x: 340, y: point.y });
  await waitFor(offset + " < -100");
  await delay(500);
  await viewport(3000);
  await waitFor("Math.abs(" + offset + ") < 1");
  await key("ArrowRight");
  assert.ok(Math.abs(await evaluate(offset)) < 1);
});

test("carousel timers follow the responsive layout and page visibility", async () => {
  await load(1200);
  assert.equal(await evaluate("window.__rotationTimers.size"), 0);
  await viewport(375);
  await waitFor("window.__rotationTimers.size === 1");
  await evaluate('Object.defineProperty(document, "visibilityState", { configurable: true, value: "hidden" }); document.dispatchEvent(new Event("visibilitychange"))');
  await waitFor("window.__rotationTimers.size === 0");
  await evaluate('Object.defineProperty(document, "visibilityState", { configurable: true, value: "visible" }); document.dispatchEvent(new Event("visibilitychange"))');
  await waitFor("window.__rotationTimers.size === 1");
});

test("feature numbers are static text and the newsletter keeps its submit button", async () => {
  await load();
  assert.equal(await evaluate('[...document.querySelectorAll("section button")].filter(element => /^0[1-3]$/.test(element.textContent.trim())).length'), 0);
  assert.equal(await evaluate('[...document.querySelectorAll("section span")].filter(element => /^0[1-3]$/.test(element.textContent.trim())).length'), 6);
  assert.equal(await evaluate('document.querySelector("footer form button").type'), "submit");
  assert.equal(await evaluate('getComputedStyle(document.querySelector("header nav")).display'), "none");
});

test("menu cleanup preserves a pre-existing scroll lock", async () => {
  await load();
  await evaluate('document.body.classList.add("overflow-hidden")');
  await click('button[aria-expanded]');
  await waitFor('document.querySelector("#mobile-navigation")');
  await key("Escape");
  await waitFor('!document.querySelector("#mobile-navigation")');
  assert.equal(await evaluate('document.body.classList.contains("overflow-hidden")'), true);
});

test("menu recovers keyboard focus if it moves outside the open dialog", async () => {
  await load();
  await click('button[aria-expanded]');
  await waitFor('document.activeElement.closest("#mobile-navigation")');
  await evaluate('document.querySelector("main button").focus()');
  await key("Tab");
  await waitFor('document.activeElement === document.querySelector("header > a")');
  await evaluate('document.querySelector("main button").focus()');
  await key("Tab", 8);
  await waitFor('document.activeElement.getAttribute("aria-label") === "Close navigation"');
  await key("Escape");
  await waitFor('!document.querySelector("#mobile-navigation")');
});

test("carousel pauses on hover and reacts to reduced-motion preference changes", async () => {
  await load();
  await waitFor("window.__rotationTimers.size === 1");
  const point = await evaluate(`(() => {
    const section = document.querySelector("section[aria-roledescription=carousel]");
    section.scrollIntoView({ block: "center" });
    const rect = section.getBoundingClientRect();
    return { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 };
  })()`);
  await send("Input.dispatchMouseEvent", { type: "mouseMoved", ...point });
  await waitFor("window.__rotationTimers.size === 0");
  await evaluate('document.querySelector("header").scrollIntoView({ block: "start" })');
  await send("Input.dispatchMouseEvent", { type: "mouseMoved", x: 0, y: 0 });
  await waitFor("window.__rotationTimers.size === 1");

  await send("Emulation.setEmulatedMedia", {
    features: [{ name: "prefers-reduced-motion", value: "reduce" }],
  });
  await waitFor("window.__rotationTimers.size === 0");
  assert.equal(await evaluate('document.querySelector("section[aria-roledescription=carousel] > button").disabled'), true);
  await send("Emulation.setEmulatedMedia", {
    features: [{ name: "prefers-reduced-motion", value: "no-preference" }],
  });
  await waitFor("window.__rotationTimers.size === 1");
  assert.equal(await evaluate('document.querySelector("section[aria-roledescription=carousel] > button").disabled'), false);
});

test("browser reports no uncaught application errors", () => {
  assert.deepEqual(exceptions, []);
});
