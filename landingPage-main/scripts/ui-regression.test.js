/* eslint-env node */
import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { spawn } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
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
const consoleErrors = [];
const failedResources = [];

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
  await evaluate('window.scrollTo({ top: 0, behavior: "instant" })');
  await delay(80);
}

async function click(selector) {
  const point = await evaluate(`(() => {
    const element = document.querySelector(${JSON.stringify(selector)});
    element.scrollIntoView({ block: "center", behavior: "instant" });
    const rect = element.getBoundingClientRect();
    return { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 };
  })()`);
  await send("Input.dispatchMouseEvent", { type: "mouseMoved", ...point });
  await send("Input.dispatchMouseEvent", { type: "mousePressed", button: "left", clickCount: 1, ...point });
  await send("Input.dispatchMouseEvent", { type: "mouseReleased", button: "left", clickCount: 1, ...point });
}

async function key(keyName, modifiers = 0) {
  const codes = { Tab: 9, Enter: 13, Escape: 27, Home: 36, End: 35, ArrowLeft: 37, ArrowRight: 39 };
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
    if (message.method === "Runtime.consoleAPICalled" && message.params.type === "error") {
      consoleErrors.push(message.params.args.map(argument => argument.value ?? argument.description).join(" "));
    }
    if (message.method === "Network.responseReceived" && message.params.response.status >= 400) {
      failedResources.push(message.params.response.status + " " + message.params.response.url);
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
  await send("Network.enable");
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
  await evaluate(track + '.scrollIntoView({ block: "center", behavior: "instant" }); ' + track + ".focus()");
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
  assert.equal(await evaluate('[...document.querySelectorAll("section span")].filter(element => /^0[1-3]$/.test(element.textContent.trim())).length'), 3);
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
  await evaluate('document.body.tabIndex = -1; document.body.focus()');
  await key("Tab");
  await waitFor('document.activeElement === document.querySelector("header > a")');
  await evaluate('document.body.tabIndex = -1; document.body.focus()');
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
    section.scrollIntoView({ block: "center", behavior: "instant" });
    const rect = section.getBoundingClientRect();
    return { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 };
  })()`);
  await send("Input.dispatchMouseEvent", { type: "mouseMoved", ...point });
  await waitFor("window.__rotationTimers.size === 0");
  await evaluate('window.scrollTo({ top: 0, behavior: "instant" })');
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

test("all page links resolve, mobile navigation focuses its destination, and the background is inert", async () => {
  await load(375, true);
  assert.deepEqual(await evaluate(`[...document.querySelectorAll('a[href^="#"]')]
    .filter(link => link.hash.length < 2 || !document.getElementById(link.hash.slice(1)))
    .map(link => link.outerHTML)`), []);
  await click('button[aria-expanded]');
  await waitFor('document.querySelector("main").parentElement.inert');
  assert.equal(await evaluate('document.querySelector(".skip-link").inert'), true);
  await click('#mobile-navigation a[href="#features"]');
  await waitFor('location.hash === "#features" && document.activeElement.id === "features"');
  assert.equal(await evaluate('document.querySelector("main").parentElement.inert'), false);
  await waitFor('document.querySelector("header nav a[aria-current]").hash === "#features"');
});

test("active navigation follows scrolling without changing the URL", async () => {
  await load(1200, true);
  for (const id of ["features", "testimonials", "updates", "overview"]) {
    await evaluate(`document.getElementById(${JSON.stringify(id)}).scrollIntoView({block: "start"})`);
    await waitFor(`document.querySelector("header nav a[aria-current]").hash === "#${id}"`);
    assert.equal(await evaluate('location.hash'), "");
  }
});

test("skip link reaches main content and back-to-top restores keyboard focus", async () => {
  await load(375, true);
  await key("Tab");
  assert.equal(await evaluate('document.activeElement.classList.contains("skip-link")'), true);
  await waitFor('document.activeElement.getBoundingClientRect().top >= 0');
  await key("Enter");
  await waitFor('document.activeElement.id === "main-content"');
  await evaluate('document.getElementById("updates").scrollIntoView({block: "start"})');
  await waitFor('document.querySelector(".back-to-top")');
  await click(".back-to-top");
  await waitFor('document.activeElement.id === "top" && window.scrollY < 10');
  await waitFor('!document.querySelector(".back-to-top")');
});

test("newsletter validates input, clears errors on edit, and reports unavailable subscriptions without navigation", async () => {
  await load(375, true);
  const input = 'document.getElementById("newsletter-email")';
  const url = await evaluate("location.href");
  await click("footer form button");
  await waitFor(input + '.getAttribute("aria-invalid") === "true"');
  assert.equal(await evaluate("document.activeElement.id"), "newsletter-email");
  assert.match(await evaluate('document.getElementById("newsletter-feedback").textContent'), /Enter your email address/);
  await send("Input.insertText", { text: "invalid" });
  await waitFor(input + '.getAttribute("aria-invalid") === null');
  await click("footer form button");
  await waitFor(input + '.getAttribute("aria-invalid") === "true"');
  await evaluate(input + '.value = ""');
  await evaluate(input + ".focus()");
  await send("Input.insertText", { text: "reader@example.com" });
  await click("footer form button");
  await waitFor('document.getElementById("newsletter-feedback").textContent.includes("has not been sent or saved")');
  assert.equal(await evaluate(input + '.getAttribute("aria-invalid")'), null);
  assert.equal(await evaluate('location.href'), url);
});

test("page landmarks, focus indicators, local fonts, and metadata are available", async () => {
  await load(1200, true);
  assert.equal(await evaluate('document.querySelectorAll("h1").length'), 1);
  assert.equal(await evaluate('document.querySelector("main h1") !== null'), true);
  assert.equal(await evaluate('document.querySelector("input[type=email]").labels.length'), 1);
  assert.equal(await evaluate('document.title'), "Manage | Bring your team together");
  assert.ok(await evaluate('document.querySelector("meta[name=description]").content.length') > 40);
  assert.equal(await evaluate('document.querySelector("meta[property=\\"og:title\\"]").content'), "Manage | Bring your team together");
  assert.equal(await evaluate('document.querySelector("link[as=image]").href === document.querySelector("#overview img").src'), true);
  await evaluate('document.fonts.ready');
  assert.equal(await evaluate('document.fonts.check(\'16px "Be Vietnam"\')'), true);
  assert.deepEqual(await evaluate('[...document.querySelectorAll("link[href]")].filter(link => /^https?:/.test(link.href) && new URL(link.href).origin !== location.origin).map(link => link.href)'), []);
  await evaluate('document.querySelector("header nav a").focus()');
  await key("Tab");
  assert.equal(await evaluate('getComputedStyle(document.activeElement).outlineStyle'), "solid");
  assert.equal(await evaluate('getComputedStyle(document.documentElement).scrollBehavior'), "auto");
});

test("mobile, tablet, and desktop layouts fit the viewport", async () => {
  for (const width of [320, 375, 540, 790, 960, 1110, 1440]) {
    await load(width, true);
    assert.ok(await evaluate("document.documentElement.scrollWidth <= innerWidth + 1"), "Horizontal overflow at " + width + ": " + await evaluate('JSON.stringify({width: innerWidth, documentWidth: document.documentElement.scrollWidth, overflow: [...document.querySelectorAll("body *")].filter(el => {const r = el.getBoundingClientRect(); return r.width > 0 && (r.right > innerWidth + 1 || r.left < -1)}).map(el => ({tag: el.tagName, class: el.className, width: el.getBoundingClientRect().width, left: el.getBoundingClientRect().left, right: el.getBoundingClientRect().right})).slice(0, 18)})'));
    const formFits = await evaluate(`(() => {
      const box = document.querySelector("footer form").getBoundingClientRect();
      return box.left >= 0 && box.right <= innerWidth;
    })()`);
    assert.equal(formFits, true, "Newsletter overflow at " + width);
    if (width < 1110) {
      assert.ok(await evaluate('(() => { const rect = document.querySelector("footer form").getBoundingClientRect(); return Math.abs((rect.left + rect.right) / 2 - document.documentElement.clientWidth / 2) < 1; })()'), "Newsletter alignment at " + width);
    }
    const visibleHeadingCount = await evaluate('[...document.querySelectorAll("#features h3")].filter(element => element.getClientRects().length).length');
    assert.equal(visibleHeadingCount, 3, "Feature headings at " + width);
  }
});

test("testimonial selectors support arrow keys, Home and End with touch-sized targets", async () => {
  await load(375, true);
  await click('button[aria-label^="Show testimonial 1:"]');
  await key("ArrowRight");
  await waitFor('document.activeElement.getAttribute("aria-label").startsWith("Show testimonial 2:")');
  await key("End");
  await waitFor('document.activeElement.getAttribute("aria-label").startsWith("Show testimonial 4:")');
  await key("ArrowRight");
  await waitFor('document.activeElement.getAttribute("aria-label").startsWith("Show testimonial 1:")');
  await key("ArrowLeft");
  await waitFor('document.activeElement.getAttribute("aria-label").startsWith("Show testimonial 4:")');
  await key("Home");
  await waitFor('document.activeElement.getAttribute("aria-label").startsWith("Show testimonial 1:")');
  assert.equal(await evaluate('document.activeElement.getAttribute("aria-pressed")'), "true");
  assert.equal(await evaluate('document.activeElement.getBoundingClientRect().width >= 44 && document.activeElement.getBoundingClientRect().height >= 44'), true);
});

test("desktop testimonial buttons provide a pointer alternative to dragging and clamp at either end", async () => {
  await load(1200, true);
  const offset = 'new DOMMatrix(getComputedStyle(document.querySelector("ul[tabindex]")).transform).m41';
  await click('section[aria-roledescription] button:nth-child(2)');
  await waitFor(offset + " < -100");
  await click('section[aria-roledescription] button:nth-child(1)');
  await waitFor(offset + " === 0");
  await click('section[aria-roledescription] button:nth-child(1)');
  assert.equal(await evaluate(offset), 0);
  await viewport(3000);
  await waitFor('document.querySelector("section[aria-roledescription] div > button").disabled');
});

test("focusable controls have accessible names and images have explicit alternatives", async () => {
  await load(375, true);
  await send("Accessibility.enable");
  const { nodes } = await send("Accessibility.getFullAXTree");
  const unnamed = nodes.filter(node => !node.ignored && ["button", "link", "textbox"].includes(node.role?.value) && !node.name?.value);
  assert.deepEqual(unnamed.map(node => node.role.value), []);
  assert.equal(await evaluate('document.querySelectorAll("img:not([alt])").length'), 0);
  await send("Accessibility.disable");
});

test("optional responsive screenshots", { skip: !process.env.UI_TEST_SCREENSHOTS }, async () => {
  mkdirSync(process.env.UI_TEST_SCREENSHOTS, { recursive: true });
  for (const width of [375, 790, 1440]) {
    await load(width, true);
    await evaluate('Promise.all([...document.images].map(image => {image.loading = "eager"; return image.decode().catch(() => {});})).then(() => document.fonts.ready).then(() => true)');
    const screenshot = await send("Page.captureScreenshot", { format: "png", captureBeyondViewport: true, clip: { x: 0, y: 0, width, height: await evaluate("document.documentElement.scrollHeight"), scale: 1 } });
    writeFileSync(join(process.env.UI_TEST_SCREENSHOTS, "landing-" + width + ".png"), Buffer.from(screenshot.data, "base64"));
  }
});


test("switching mobile testimonials preserves card height", async () => {
  await load(320, true);
  const initialHeight = await evaluate('document.querySelector("ul[aria-live]").getBoundingClientRect().height');
  for (let index = 0; index < 4; index++) {
    await click('button[aria-label^="Show testimonial ' + (index + 1) + ':"]');
    assert.equal(await evaluate('document.querySelector("ul[aria-live]").getBoundingClientRect().height'), initialHeight);
  }
});
test("browser reports no uncaught application errors", () => {
  assert.deepEqual(exceptions, []);
  assert.deepEqual(consoleErrors, []);
  assert.deepEqual(failedResources, []);
});
