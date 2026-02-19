from playwright.sync_api import sync_playwright

def run(playwright):
    browser = playwright.chromium.launch(headless=True)
    page = browser.new_page()

    # Capture logs
    page.on("console", lambda msg: print(f"Browser Console: {msg.text}"))
    page.on("pageerror", lambda err: print(f"Browser Error: {err}"))

    try:
        page.goto("http://localhost:8080")

        # Wait for button to be interactive
        start_btn = page.locator("#start-btn")
        start_btn.wait_for(state="visible")

        print("Clicking Start Button...")
        start_btn.click()

        # Check if splash is hidden
        print("Waiting for splash to hide...")
        try:
            page.locator("#splash-screen").wait_for(state="hidden", timeout=5000)
            print("Splash hidden.")
        except:
            print("Splash did NOT hide.")
            page.screenshot(path="verification/splash_stuck.png")

        # Try to open Script Editor anyway (F key)
        page.keyboard.press("F")

        # Check for modal
        try:
            modal = page.locator("#script-editor-modal")
            modal.wait_for(state="visible", timeout=2000)
            print("Modal visible.")

            # Get options
            options = page.evaluate("""
                () => {
                    const select = document.getElementById('script-preset-select');
                    return select ? Array.from(select.options).map(o => o.text) : [];
                }
            """)
            print("Options found:", options)

            # Screenshot
            page.screenshot(path="verification/script_editor.png")

        except Exception as e:
            print(f"Modal not found: {e}")
            page.screenshot(path="verification/no_modal.png")

    except Exception as e:
        print(f"Error: {e}")
    finally:
        browser.close()

with sync_playwright() as playwright:
    run(playwright)
