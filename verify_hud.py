from playwright.sync_api import sync_playwright
import time

def test_hud(page):
    print("Navigating to http://localhost:8080")
    page.goto("http://localhost:8080")

    # Click start button if it exists
    print("Looking for start button")
    try:
        start_btn = page.wait_for_selector("#start-btn", timeout=2000)
        if start_btn:
            print("Clicking start button")
            start_btn.click()
            # Wait for game to initialize
            time.sleep(2)
    except Exception as e:
        print(f"Start button not found or error: {e}")

    # Wait for HUD elements to appear
    print("Waiting for #hud-wind-speed")
    page.wait_for_selector("#hud-wind-speed")

    # Check if HUD elements have text content
    wind_speed = page.locator("#hud-wind-speed")
    content = wind_speed.text_content()
    print(f"Wind Speed: {content}")

    if not content or content == "0 m/s":
        print("Wind speed content is 0 or empty, simulation might be paused or wind is 0.")

    # Check color (should be computed style)
    color = wind_speed.evaluate("element => getComputedStyle(element).color")
    print(f"Wind Speed Color: {color}")

    # Take screenshot
    print("Taking screenshot")
    page.screenshot(path="verification_hud_ingame.png")

if __name__ == "__main__":
    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page()
        try:
            test_hud(page)
        except Exception as e:
            print(f"Error: {e}")
        finally:
            browser.close()
