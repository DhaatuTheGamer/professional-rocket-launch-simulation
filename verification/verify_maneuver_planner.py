from playwright.sync_api import sync_playwright, expect

def run():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        try:
            # 1. Arrange: Go to the game
            print("Navigating to http://localhost:8080")
            page.goto("http://localhost:8080")

            # 2. Start the game (dismiss splash screen)
            print("Clicking Start button")
            page.locator("#start-btn").click()

            # Wait for game to be visible (canvas)
            print("Waiting for canvas")
            expect(page.locator("#canvas")).to_be_visible()

            # 3. Open Maneuver Planner
            print("Pressing 'o'")
            page.keyboard.press("o")

            # Wait for modal to appear
            print("Waiting for modal")
            planner_modal = page.locator("#maneuver-planner-modal")
            expect(planner_modal).to_be_visible()

            # 4. Select Hohmann Transfer
            print("Selecting Hohmann Transfer")
            page.select_option("#maneuver-type-select", "hohmann")

            # 5. Verify the plan text is visible (even if empty or error)
            results = page.locator("#planner-results")
            expect(results).to_be_visible()

            # Wait a bit for calculations
            page.wait_for_timeout(1000)

            # 6. Take screenshot
            print("Taking screenshot")
            page.screenshot(path="/home/jules/verification/maneuver_planner.png")
            print("Screenshot saved")

        except Exception as e:
            print(f"Error: {e}")
            page.screenshot(path="/home/jules/verification/error.png")
            raise e
        finally:
            browser.close()

if __name__ == "__main__":
    run()
