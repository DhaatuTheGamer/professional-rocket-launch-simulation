## 2024-05-23 - DOM Construction XSS Vulnerability
**Vulnerability:** Constructing DOM nodes using `innerHTML` with string interpolation can lead to Cross-Site Scripting (XSS).
**Learning:** Found string-based DOM construction in `LaunchChecklist.ts` and `FaultInjector.ts` using `.innerHTML = html`.
**Prevention:** Replaced `innerHTML` usage with safer DOM construction utility `createElement` from `src/ui/DOMUtils.ts` to ensure attributes and text content are safely handled.

## 2026-03-02 - ScriptEditor Modal XSS Vulnerability
**Vulnerability:** The `ScriptEditor` modal was being created using a large template literal assigned to `.innerHTML`, which is an XSS vector if any part of that string (e.g., placeholders, default values) is influenced by user-controlled data.
**Learning:** Found string-based DOM construction in `ScriptEditor.ts` for the modal structure.
**Prevention:** Refactored `createModal` to use the `createElement` utility from `src/ui/DOMUtils.ts`. Updated unit tests to use robust ID-based element retrieval and attribute assertions instead of fragile `innerHTML` string matching.
