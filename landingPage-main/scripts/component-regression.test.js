/* eslint-env node */
import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createServer } from "vite";

let server;
let Testimonials;

before(async () => {
  server = await createServer({
    server: { middlewareMode: true },
    appType: "custom",
  });
  ({ default: Testimonials } = await server.ssrLoadModule("/src/pages/Testimonials.jsx"));
});

after(async () => {
  await server?.close();
});

test("empty testimonials render an honest empty state without carousel controls", () => {
  const html = renderToStaticMarkup(createElement(Testimonials, { testimonials: [] }));
  assert.match(html, /No testimonials are available right now/);
  assert.doesNotMatch(html, /aria-roledescription="carousel"|aria-pressed|automatic testimonials/i);
  assert.doesNotMatch(html, /NaN|Infinity/);
});

test("one testimonial is selected without offering automatic rotation", () => {
  const html = renderToStaticMarkup(createElement(Testimonials, {
    testimonials: [{ id: "only", name: "Existing customer", comment: "A sample quote for this test.", avatar: "/test-avatar.png" }],
  }));
  assert.match(html, /aria-label="Show testimonial 1: Existing customer" aria-pressed="true"/);
  assert.match(html, /aria-hidden="false"/);
  assert.doesNotMatch(html, /automatic testimonials|NaN|Infinity/i);
});
