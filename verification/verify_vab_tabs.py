from playwright.sync_api import sync_playwright, expect

def run():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        page.goto("http://localhost:8080")

        # Click VAB button
        # Use a more robust selector or wait for it
        page.wait_for_selector("#open-vab-btn")
        page.click("#open-vab-btn")

        # Wait for VAB to load
        vab = page.locator(".vab-editor")
        expect(vab).to_be_visible()

        # Verify tabs have roles and icons
        tabs = page.locator(".vab-cat-tab")
        expect(tabs.first).to_be_visible()

        # Check ARIA role
        role = tabs.first.get_attribute("role")
        print(f"Tab role: {role}")
        assert role == "tab"

        # Check icon presence (text content should contain emoji)
        # Note: Depending on rendering, text might be split.
        text = tabs.first.text_content()
        print(f"Tab text: {text}")
        # Assuming the first tab is Engines which has 🔥
        assert "🔥" in text

        # Check tablist role
        tablist = page.locator(".vab-category-tabs")
        expect(tablist).to_have_attribute("role", "tablist")

        # Check tabpanel role
        tabpanel = page.locator("#vab-parts-list")
        expect(tabpanel).to_have_attribute("role", "tabpanel")

        # Take screenshot
        page.screenshot(path="verification/vab_tabs.png")
        print("Verification successful!")

        browser.close()

if __name__ == "__main__":
    run()
