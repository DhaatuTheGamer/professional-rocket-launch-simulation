
from playwright.sync_api import sync_playwright

def run(playwright):
    browser = playwright.chromium.launch()
    page = browser.new_page()

    # Verify analysis.html
    print("Verifying analysis.html...")
    page.goto("http://localhost:8080/analysis.html")
    page.wait_for_load_state("networkidle")

    # Check for CSP meta tag in DOM
    csp = page.evaluate("document.querySelector('meta[http-equiv=\"Content-Security-Policy\"]').content")
    print(f"Analysis CSP: {csp}")
    assert "default-src 'self'" in csp
    assert "script-src 'self'" in csp

    page.screenshot(path="verification/analysis.png")
    print("Screenshot saved to verification/analysis.png")

    # Verify telemetry.html
    print("Verifying telemetry.html...")
    page.goto("http://localhost:8080/telemetry.html")
    page.wait_for_load_state("networkidle")

    # Check for CSP meta tag in DOM
    csp = page.evaluate("document.querySelector('meta[http-equiv=\"Content-Security-Policy\"]').content")
    print(f"Telemetry CSP: {csp}")
    assert "default-src 'self'" in csp
    assert "script-src 'self'" in csp

    page.screenshot(path="verification/telemetry.png")
    print("Screenshot saved to verification/telemetry.png")

    browser.close()

with sync_playwright() as playwright:
    run(playwright)
