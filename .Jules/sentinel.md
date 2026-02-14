## 2024-05-22 - Unsafe Error Rendering
**Vulnerability:** DOM-based XSS via `innerHTML` injection in error handling blocks (e.g., `ManeuverPlanner.ts`).
**Learning:** The UI codebase relies on manual DOM manipulation. Error messages from deep in the stack (e.g., physics calculations) were being rendered directly into `innerHTML` inside a template string, assuming they were safe. This creates a risk if any error message can be tainted by user input.
**Prevention:** Always use `textContent` or `innerText` when displaying error messages or any dynamic content that doesn't strictly require HTML formatting. If HTML is needed, use `document.createElement` to build the structure safely.
