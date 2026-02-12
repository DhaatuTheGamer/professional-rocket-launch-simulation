from playwright.sync_api import sync_playwright
import time

def run():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        page.set_viewport_size({"width": 1280, "height": 720})

        # Navigate
        print("Navigating to http://localhost:8080...")
        try:
            page.goto("http://localhost:8080")
        except Exception as e:
            print(f"Navigation failed: {e}")
            return

        # Wait for load
        page.wait_for_timeout(2000)

        # Click START
        print("Clicking START...")
        try:
            page.click("#start-btn", timeout=5000)
            print("Clicked START")
        except Exception as e:
            print(f"Error clicking START: {e}")

        # Wait for onboarding
        page.wait_for_timeout(1000)

        # Click GOT IT
        print("Clicking GOT IT...")
        try:
            page.click("#tooltip-dismiss", timeout=5000)
            print("Clicked GOT IT")
        except Exception as e:
            print(f"Error clicking GOT IT: {e}")

        # Launch via console
        print("Launching...")
        page.evaluate("window.game.launch()")
        page.evaluate("window.game.setThrottle(1.0)")

        # Wait for liftoff
        print("Waiting for liftoff...")
        for i in range(20):
            liftoff = page.evaluate("window.game.missionState.liftoff")
            if liftoff:
                print("Liftoff confirmed!")
                break
            time.sleep(0.5)

        # Wait for ascent
        print("Ascending...")
        page.wait_for_timeout(5000)

        # Time warp
        print("Warping...")
        page.evaluate("window.game.timeScale = 10.0") # Use moderate warp

        # Wait for exhaust trails
        print("Waiting for trails...")
        page.wait_for_timeout(2000)

        # Screenshot
        print("Taking screenshot...")
        page.screenshot(path="exhaust_v3.png")
        print("Screenshot saved to exhaust_v3.png")

        browser.close()

if __name__ == "__main__":
    run()
