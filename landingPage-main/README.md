# Manage landing page

A responsive React 18 landing page built with Vite 6, Tailwind CSS 3, and Framer Motion 11. The navy, orange, illustrations, and existing content remain the visual foundation.

## Develop and verify

Use Node.js 24 or newer and npm.

```sh
npm ci
npm run dev
npm run check
npm run preview
```

The site uses the existing `/landingPage/` deployment base. Vite prints the exact local URL. To change the hosting path, update `base` in `vite.config.js` and the production preview base in `scripts/ui-regression.test.js` together.

`npm run check` runs ESLint, the production build, component edge-case tests, and browser regressions. `npm test` expects a fresh `dist/` build. Tests use Node's built-in test runner and a locally installed Chromium browser through the Chrome DevTools Protocol; no test framework dependency is required.

The browser runner discovers Edge or Chrome on Windows, Chrome/Chromium on Linux, and Chrome on macOS. Set `BROWSER_BIN` to an executable path if needed. It creates a uniquely named temporary profile and removes only that profile on completion.

On Windows, use `npm.cmd` if PowerShell blocks `npm.ps1`. No execution-policy change is needed.

For focused development tests in PowerShell:

```powershell
$env:UI_TEST_DEV = "1"
node --test --test-name-pattern="newsletter|navigation" scripts/ui-regression.test.js
```

Optional screenshots (gitignored) are available through:

```powershell
$env:UI_TEST_SCREENSHOTS = ".artifacts/ui"
npm.cmd test
```

## Structure

- `src/App.jsx`: page composition and active navigation.
- `src/pages/`: hero, features, testimonials, call to action, and footer sections.
- `src/components/`: shared navigation, link-style buttons, email validation, and back-to-top control.
- `src/hooks/`: mobile menu lifecycle, section visibility, carousel measurements, autoplay, and media queries.
- `src/data/`: existing features/testimonials and the supported navigation destinations.
- `src/utils/index.js`: asset exports.
- `src/index.css`: shared styles, focus indicators, local font definitions, and motion preferences.
- `scripts/`: component edge cases and browser regressions.

Menu state belongs to the header. The menu traps keyboard focus, makes background content inert, preserves an existing body scroll lock, restores focus on dismissal, and focuses the selected section after navigation. It closes automatically at the desktop breakpoint.

The carousel keeps mobile autoplay and desktop dragging. It pauses after focus or manual selection, on hover, when the document is hidden, and when reduced motion is requested. Users can explicitly resume rotation. Desktop buttons provide an alternative to dragging; mobile selectors support arrow keys, Home, and End. Timers, media-query listeners, and observers are cleaned up.

## Content and service boundaries

All navigation and calls to action point to existing content. Pricing, careers, and privacy destinations were placeholders without pages; they are no longer rendered as broken links. Social icons remain decorative channel information with explicit unavailable-profile alternatives. Add verified profile URLs before making them links.

There is no newsletter backend. The form only validates the email format. It clearly says subscriptions are unavailable, never submits a network request, and never stores the email. A production subscription flow needs an approved endpoint, privacy policy, consent requirements, error handling, and actual server-side confirmation.

Font files are self-hosted and retain their SIL Open Font License in `src/assets/font/`. No external font service is required. The HTML includes a real favicon, description, and social title/description metadata. Canonical URLs and social images should be configured only after the production origin and sharing asset are confirmed.

## Validation and remaining work

CI runs lint, build, component tests, and browser tests before producing deployment artifacts. Pull requests run the same checks; deployment remains limited to pushes to `main`.

Browser regressions cover menu focus/cleanup, real section links, active navigation, skip/back-to-top behavior, newsletter feedback, carousel rotation/drag/buttons/keyboard/reduced motion, accessible control names, and responsive widths from 320 to 1440 pixels.

The browser checks use Chromium; manual Safari/Firefox, assistive-technology, and real touch-device checks remain useful before launch. The accessibility-tree checks are focused checks, not a full WCAG certification.

Compatible dependency fixes were applied without `--force` or direct dependency major upgrades. See `IMPROVEMENTS.md` for measured results and remaining development-tool advisories.
