from playwright.sync_api import sync_playwright

def main():
    with sync_playwright() as p:
        browser = p.chromium.launch()
        
        # 1. Desktop Test (1440x900)
        page = browser.new_page(viewport={'width': 1440, 'height': 900})
        page.goto('http://127.0.0.1:5173')
        page.wait_for_timeout(2000)
        
        video = page.locator('video.auth-video-element')
        count = video.count()
        print(f"Desktop video count: {count}")
        assert count == 1, "Video element not found"
        
        # Check video properties
        is_paused = page.evaluate("() => document.querySelector('video.auth-video-element').paused")
        current_time = page.evaluate("() => document.querySelector('video.auth-video-element').currentTime")
        src = page.evaluate("() => document.querySelector('video.auth-video-element').currentSrc")
        has_autoplay = page.evaluate("() => document.querySelector('video.auth-video-element').autoplay")
        has_muted = page.evaluate("() => document.querySelector('video.auth-video-element').muted")
        has_loop = page.evaluate("() => document.querySelector('video.auth-video-element').loop")
        has_playsinline = page.evaluate("() => document.querySelector('video.auth-video-element').playsInline")
        overlay_count = page.locator('.auth-video-overlay').count()
        
        print(f"Video paused: {is_paused}, currentTime: {current_time:.2f}s, src: {src}")
        print(f"Attributes - autoPlay: {has_autoplay}, muted: {has_muted}, loop: {has_loop}, playsInline: {has_playsinline}")
        print(f"Overlay count: {overlay_count}")
        
        assert not is_paused, "Video should be playing"
        assert current_time > 0, "Video currentTime should be progressing"
        assert has_muted, "Video must be muted"
        assert has_loop, "Video must loop"
        assert has_playsinline, "Video must playsInline"
        assert overlay_count == 1, "Overlay must exist"
        
        page.screenshot(path='login_after_desktop.png')
        page.close()
        
        # 2. Tablet Test (768x1024)
        page_tablet = browser.new_page(viewport={'width': 768, 'height': 1024})
        page_tablet.goto('http://127.0.0.1:5173')
        page_tablet.wait_for_timeout(2000)
        page_tablet.screenshot(path='login_after_tablet.png')
        page_tablet.close()
        
        # 3. Mobile Test (375x812)
        page_mobile = browser.new_page(viewport={'width': 375, 'height': 812})
        page_mobile.goto('http://127.0.0.1:5173')
        page_mobile.wait_for_timeout(2000)
        page_mobile.screenshot(path='login_after_mobile.png')
        page_mobile.close()
        
        # 4. Reduced Motion Test
        page_reduced = browser.new_page(viewport={'width': 1440, 'height': 900}, reduced_motion='reduce')
        page_reduced.goto('http://127.0.0.1:5173')
        page_reduced.wait_for_timeout(2000)
        
        video_reduced = page_reduced.locator('video.auth-video-element')
        video_visible = video_reduced.is_visible()
        is_paused_reduced = page_reduced.evaluate("() => document.querySelector('video.auth-video-element')?.paused")
        print(f"Reduced motion - video visible: {video_visible}, paused: {is_paused_reduced}")
        
        page_reduced.screenshot(path='login_after_reduced_motion.png')
        page_reduced.close()

        # 5. Auth functionality test: fill synthetic demo credentials and sign in
        page_auth = browser.new_page(viewport={'width': 1440, 'height': 900})
        page_auth.goto('http://127.0.0.1:5173')
        page_auth.wait_for_timeout(1500)
        page_auth.locator('button.demo-account-pill-btn').click()
        page_auth.wait_for_timeout(500)
        assert page_auth.locator('#auth-username').input_value() == 'Bharat'
        page_auth.locator('button.auth-submit-btn').click()
        page_auth.wait_for_timeout(2500)
        assert page_auth.locator('.app-frame').count() > 0, "Sign in failed to load workspace"
        assert page_auth.locator('.side-rail').count() > 0, "Sidebar navigation not found"
        print("Sign-in authentication test passed successfully!")
        page_auth.close()
        
        browser.close()
        print("All login video checks passed successfully!")

if __name__ == '__main__':
    main()
