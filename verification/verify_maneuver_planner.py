from playwright.sync_api import sync_playwright

def verify_maneuver_planner():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        # Navigate to the game
        print("Navigating to http://localhost:8080")
        page.goto("http://localhost:8080")

        # Wait for splash screen start button
        print("Waiting for start button...")
        try:
            start_btn = page.locator("#start-btn")
            start_btn.wait_for(state="visible", timeout=5000)
            start_btn.click()
            print("Clicked start button.")
        except Exception as e:
            print(f"Could not click start button: {e}")
            # Take a screenshot to debug
            page.screenshot(path="verification/debug_start.png")

        # Wait for game to initialize
        page.wait_for_timeout(2000)

        # Press 'o' to open Maneuver Planner
        print("Pressing 'o'...")
        page.keyboard.press("o")

        # Wait for modal to appear
        print("Waiting for Maneuver Planner modal...")
        try:
            modal = page.locator("#maneuver-planner-modal")
            modal.wait_for(state="visible", timeout=3000)
            print("Maneuver Planner Modal appeared.")

            # Verify the class is applied
            content_div = page.locator(".maneuver-planner-content")
            if content_div.count() > 0:
                print("Found element with class .maneuver-planner-content")
                # verify max-width style is applied (computed style)
                box = content_div.bounding_box()
                if box:
                    print(f"Bounding box width: {box['width']}")
                    if box['width'] <= 500:
                        print("Width is within limit.")
                    else:
                        print(f"Width {box['width']} exceeds 500px limit!")
            else:
                print("Element with class .maneuver-planner-content NOT found!")

        except Exception as e:
            print(f"Maneuver Planner Modal did not appear: {e}")

        # Take screenshot
        screenshot_path = "verification/maneuver_planner.png"
        page.screenshot(path=screenshot_path)
        print(f"Screenshot taken at {screenshot_path}")

        browser.close()

if __name__ == "__main__":
    verify_maneuver_planner()
