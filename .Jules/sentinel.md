## 2024-05-22 - Unsafe Error Rendering
**Vulnerability:** DOM-based XSS via `innerHTML` injection in error handling blocks (e.g., `ManeuverPlanner.ts`).
**Learning:** The UI codebase relies on manual DOM manipulation. Error messages from deep in the stack (e.g., physics calculations) were being rendered directly into `innerHTML` inside a template string, assuming they were safe. This creates a risk if error message can be tainted by user input.
**Prevention:** Always use `textContent` or `innerText` when displaying error messages or any dynamic content that doesn't strictly require HTML formatting. If HTML is needed, use `document.createElement` to build the structure safely.

## 2024-05-23 - Unsafe Blueprint Rendering
**Vulnerability:** DOM-based XSS via `innerHTML` injection in `VABEditor` (specifically `instanceId` and `part.id` attributes).
**Learning:** `localStorage` is not a trusted source. Blueprints loaded from storage were rendered directly into HTML attributes using template literals without escaping. Even seemingly internal IDs can be tainted if an attacker modifies storage or if blueprints are shared.
**Prevention:** Always escape any dynamic string inserted into HTML attributes or content, even if it looks like an ID or internal value. Use `escapeHTML` utility or, better yet, `textContent` and `setAttribute`.

## 2024-05-24 - Duplicate DOM Injection and XSS Risk in ScriptEditor
**Vulnerability:** Duplicate rendering and potential XSS in `ScriptEditor`.
**Learning:** The `ScriptEditor` was rendering preset scripts twice: once via unsafe `innerHTML` interpolation (risk of XSS if presets were tainted) and again via safe `appendChild` DOM creation (causing duplicate UI elements). This happened because of mixing template literals for initial structure and imperative DOM logic for population.
**Prevention:** Avoid mixing `innerHTML` templates with dynamic data if subsequent DOM manipulation is also used. Prefer creating dynamic lists solely via `document.createElement` and `appendChild` to ensure safety and correctness.

## 2026-02-20 - Server Security Headers Regression
**Vulnerability:** Missing automated verification for server-side security headers (CSP).
**Learning:** While the backend (`server.js`) implemented a robust Content Security Policy, there was no automated test to verify its presence on HTTP responses. This created a risk of regression if `SECURITY_HEADERS` were accidentally removed or modified.
**Prevention:** Implemented `tests/ServerSecurityHeaders.test.ts` to spin up the server and assert the presence of critical headers (CSP, HSTS, X-Content-Type-Options) on all responses (200, 404, etc.).
