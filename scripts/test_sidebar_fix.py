from playwright.sync_api import sync_playwright

def main():
    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page(viewport={'width': 1440, 'height': 900})
        page.goto('http://127.0.0.1:5173')
        page.wait_for_timeout(1000)
        page.locator('button.demo-account-pill-btn').click()
        page.wait_for_timeout(300)
        page.locator('button.auth-submit-btn').click()
        page.wait_for_timeout(2000)
        
        # 1. Expanded state assertions
        btn = page.locator('button.sidebar-toggle-btn')
        assert btn.count() == 1, "Sidebar toggle button not found"
        
        btn_info = page.evaluate("""() => {
            const button = document.querySelector('.sidebar-toggle-btn');
            const svg = button ? button.querySelector('svg') : null;
            const brandRow = document.querySelector('.brand-row');
            const rail = document.querySelector('.side-rail');
            return {
                railWidth: rail ? rail.getBoundingClientRect().width : null,
                btnBg: button ? window.getComputedStyle(button).backgroundColor : null,
                btnWidth: button ? button.getBoundingClientRect().width : null,
                btnHeight: button ? button.getBoundingClientRect().height : null,
                svgWidth: svg ? svg.getBoundingClientRect().width : null,
                svgHeight: svg ? svg.getBoundingClientRect().height : null,
                brandRowWrap: brandRow ? window.getComputedStyle(brandRow).flexWrap : null
            };
        }""")
        print("Expanded state:", btn_info)
        assert btn_info['svgWidth'] == 18, f"SVG width should be 18px, got {btn_info['svgWidth']}"
        assert btn_info['svgHeight'] == 18, f"SVG height should be 18px, got {btn_info['svgHeight']}"
        assert btn_info['brandRowWrap'] == 'nowrap', "Brand row must have flex-wrap: nowrap"
        
        page.screenshot(path='sidebar_fixed_expanded.png')
        
        # 2. Toggle to collapsed
        btn.click()
        page.wait_for_timeout(500)
        
        collapsed_info = page.evaluate("""() => {
            const button = document.querySelector('.sidebar-toggle-btn');
            const svg = button ? button.querySelector('svg') : null;
            const rail = document.querySelector('.side-rail');
            return {
                railWidth: rail ? rail.getBoundingClientRect().width : null,
                svgWidth: svg ? svg.getBoundingClientRect().width : null,
                svgHeight: svg ? svg.getBoundingClientRect().height : null,
                hasOpenIcon: svg ? svg.classList.contains('is-open-icon') : false
            };
        }""")
        print("Collapsed state:", collapsed_info)
        assert collapsed_info['railWidth'] == 72, f"Collapsed rail width should be 72px, got {collapsed_info['railWidth']}"
        assert collapsed_info['svgWidth'] == 18, f"Collapsed SVG width should be 18px, got {collapsed_info['svgWidth']}"
        assert collapsed_info['svgHeight'] == 18, f"Collapsed SVG height should be 18px, got {collapsed_info['svgHeight']}"
        assert collapsed_info['hasOpenIcon'] == True, "Collapsed state should display PanelLeftOpen (is-open-icon)"
        
        page.screenshot(path='sidebar_fixed_collapsed.png')
        
        # 3. Toggle back to expanded
        btn.click()
        page.wait_for_timeout(500)
        reexpanded_width = page.evaluate("() => document.querySelector('.side-rail').getBoundingClientRect().width")
        print(f"Re-expanded rail width: {reexpanded_width}")
        assert reexpanded_width >= 248, f"Re-expanded width should be ~250px, got {reexpanded_width}"
        
        browser.close()
        print("All sidebar tests passed successfully!")

if __name__ == '__main__':
    main()
