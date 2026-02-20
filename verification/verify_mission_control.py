from playwright.sync_api import sync_playwright

def verify_mission_control():
    with sync_playwright() as p:
        print("Launching browser...")
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        # Navigate
        print("Navigating to game...")
        page.goto("http://localhost:8080")

        # Wait for splash screen
        print("Waiting for splash screen...")
        splash = page.locator("#splash-screen")
        splash.wait_for(state="visible", timeout=10000)

        # Wait for JS to attach listeners
        print("Waiting for JS to load...")
        page.wait_for_timeout(3000)

        # Click Start
        print("Clicking Start...")
        try:
            page.click("#start-btn", timeout=2000)
        except:
            print("Standard click failed/timeout, trying JS click...")
            page.evaluate("document.getElementById('start-btn').click()")

        # Wait for splash screen to disappear
        print("Waiting for splash to hide...")
        splash.wait_for(state="hidden", timeout=10000)

        # Handle Onboarding Overlay
        page.wait_for_timeout(1000)
        print("Checking for onboarding...")
        onboarding = page.locator("#tooltip-overlay")

        # Check if it has class 'visible'
        is_visible = page.evaluate("document.getElementById('tooltip-overlay').classList.contains('visible')")

        if is_visible:
            print("Onboarding visible, dismissing...")
            try:
                page.click("#tooltip-dismiss", timeout=2000)
            except:
                 page.evaluate("document.getElementById('tooltip-dismiss').click()")

            page.wait_for_timeout(500)
            page.evaluate("document.getElementById('tooltip-overlay').classList.remove('visible')")

        # Wait for main UI
        print("Waiting for Mission Control button...")
        mc_btn = page.locator("#mission-control-btn")
        mc_btn.wait_for(state="visible", timeout=5000)

        # Click Mission Control button
        print("Opening Mission Control...")
        try:
            mc_btn.click(timeout=2000)
        except:
             page.evaluate("document.getElementById('mission-control-btn').click()")

        # Wait a bit for map to render (it's immediate on next frame)
        print("Waiting for map render...")
        page.wait_for_timeout(2000)

        # Take screenshot
        print("Taking screenshot...")
        page.screenshot(path="verification/mission_control.png")

        browser.close()
        print("Done!")

if __name__ == "__main__":
    verify_mission_control()
