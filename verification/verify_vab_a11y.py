from playwright.sync_api import sync_playwright, expect

def run():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        page.goto("http://localhost:8080")

        # Click Open VAB button in splash screen
        # Use a locator that finds the button
        vab_btn = page.get_by_text("VEHICLE ASSEMBLY (VAB)")
        vab_btn.click()

        # Wait for VAB editor
        page.wait_for_selector(".vab-editor")

        # Get part items
        parts = page.locator(".vab-part-item")

        # Select first part via click
        first_part = parts.nth(0)
        first_part.click()

        expect(first_part).to_have_class("vab-part-item selected")
        expect(first_part).to_have_attribute("aria-selected", "true")

        # Now use keyboard to select second part
        # Focus first part
        first_part.focus()

        # Press Tab to move to next part (since all are focusable)
        page.keyboard.press("Tab")

        second_part = parts.nth(1)
        expect(second_part).to_be_focused()

        # Press Enter to select
        page.keyboard.press("Enter")

        # Verify selection
        expect(second_part).to_have_class("vab-part-item selected")
        expect(second_part).to_have_attribute("aria-selected", "true")

        # Verify first part deselected
        expect(first_part).not_to_have_class("selected")
        expect(first_part).to_have_attribute("aria-selected", "false")

        # Take screenshot
        page.screenshot(path="verification/vab_accessibility.png")

        browser.close()

if __name__ == "__main__":
    run()
