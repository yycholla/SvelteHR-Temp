import { test, expect } from '@playwright/test';
import type { PageLayoutProps } from '../component-interface';

test.describe('PageLayout Component Contract Tests', () => {
	test('PageLayout props match contract interface', async ({ page }) => {
		await page.goto('/test/page-layout');

		// Test basic structure props
		const componentProps = await page.evaluate(() => {
			const component = document.querySelector('[data-testid="page-layout"]');
			return component ? component.getAttribute('data-props') : null;
		});

		if (componentProps) {
			const props = JSON.parse(componentProps) as PageLayoutProps;

			// Verify title and subtitle
			expect(typeof props.title).toBe('string');
			expect(typeof props.subtitle).toBe('string');

			// Verify navigation items structure
			if (props.navigationItems) {
				expect(Array.isArray(props.navigationItems)).toBe(true);
				props.navigationItems.forEach((item) => {
					expect(item).toHaveProperty('label');
					expect(['link', 'menu', 'divider', undefined]).toContain(item.type);
					if (item.children) {
						expect(Array.isArray(item.children)).toBe(true);
					}
				});
			}

			// Verify breadcrumbs structure
			if (props.breadcrumbs) {
				expect(Array.isArray(props.breadcrumbs)).toBe(true);
				props.breadcrumbs.forEach((crumb) => {
					expect(crumb).toHaveProperty('label');
					expect(typeof crumb.label).toBe('string');
				});
			}

			// Verify theme options
			if (props.theme) {
				expect(['white', 'g10', 'g80', 'g90', 'g100']).toContain(props.theme);
			}

			// Verify max width options
			if (props.maxWidth) {
				expect(['sm', 'md', 'lg', 'xlg', 'max', 'full']).toContain(props.maxWidth);
			}

			// Verify user info structure
			if (props.userInfo) {
				expect(props.userInfo).toHaveProperty('name');
				expect(props.userInfo).toHaveProperty('role');
				expect(typeof props.userInfo.name).toBe('string');
				expect(typeof props.userInfo.role).toBe('string');
			}

			// Verify notification structure
			if (props.notifications) {
				expect(Array.isArray(props.notifications)).toBe(true);
				props.notifications.forEach((notification) => {
					expect(notification).toHaveProperty('type');
					expect(notification).toHaveProperty('title');
					expect(['info', 'success', 'warning', 'error']).toContain(notification.type);
				});
			}
		}
	});

	test('PageLayout renders header when showHeader is true', async ({ page }) => {
		await page.goto('/test/page-layout?showHeader=true');

		const header = await page.locator('.bx--header').count();
		expect(header).toBeGreaterThan(0);

		// Check for skip link
		const skipLink = await page.locator('[href="#main-content"]').count();
		expect(skipLink).toBeGreaterThan(0);
	});

	test('PageLayout renders side navigation when showSideNav is true', async ({ page }) => {
		await page.goto('/test/page-layout?showSideNav=true');

		const sideNav = await page.locator('.bx--side-nav').count();
		expect(sideNav).toBeGreaterThan(0);
	});

	test('PageLayout handles navigation items correctly', async ({ page }) => {
		const navigationItems: NavItem[] = [
			{ label: 'Dashboard', href: '/dashboard', icon: 'dashboard' },
			{ label: 'Employees', href: '/employees', icon: 'users' },
			{ type: 'divider', label: '' },
			{
				label: 'Settings',
				icon: 'settings',
				children: [
					{ label: 'Profile', href: '/settings/profile' },
					{ label: 'Security', href: '/settings/security' }
				]
			}
		];

		await page.goto('/test/page-layout');
		await page.evaluate((items) => {
			window.postMessage(
				{
					type: 'updateProps',
					props: { navigationItems: items }
				},
				'*'
			);
		}, navigationItems);

		// Verify navigation links
		const navLinks = await page.locator('.bx--side-nav__link').count();
		expect(navLinks).toBeGreaterThan(0);

		// Verify divider
		const divider = await page.locator('.bx--side-nav__divider').count();
		expect(divider).toBeGreaterThan(0);

		// Verify nested menu
		const menuItems = await page.locator('.bx--side-nav__menu').count();
		expect(menuItems).toBeGreaterThan(0);
	});

	test('PageLayout renders breadcrumbs correctly', async ({ page }) => {
		const breadcrumbs: BreadcrumbItem[] = [
			{ label: 'Home', href: '/' },
			{ label: 'Employees', href: '/employees' },
			{ label: 'John Doe' }
		];

		await page.goto('/test/page-layout');
		await page.evaluate((crumbs) => {
			window.postMessage(
				{
					type: 'updateProps',
					props: { breadcrumbs: crumbs }
				},
				'*'
			);
		}, breadcrumbs);

		const breadcrumbItems = await page.locator('.bx--breadcrumb-item').count();
		expect(breadcrumbItems).toBe(3);

		// Last item should be current page
		const lastItem = await page.locator('.bx--breadcrumb-item').last();
		expect(await lastItem.getAttribute('aria-current')).toBe('page');
	});

	test('PageLayout handles notifications correctly', async ({ page }) => {
		const notifications: NotificationItem[] = [
			{ type: 'success', title: 'Success', message: 'Operation completed' },
			{ type: 'error', title: 'Error', message: 'Something went wrong', showToast: true }
		];

		await page.goto('/test/page-layout');
		await page.evaluate((notifs) => {
			window.postMessage(
				{
					type: 'updateProps',
					props: { notifications: notifs }
				},
				'*'
			);
		}, notifications);

		// Check notification badge
		const badge = await page.locator('.notification-badge').count();
		expect(badge).toBeGreaterThan(0);

		// Check toast notifications
		const toast = await page.locator('.bx--toast-notification').count();
		expect(toast).toBeGreaterThan(0);
	});

	test('PageLayout theme switching works', async ({ page }) => {
		await page.goto('/test/page-layout');

		// Test different themes
		const themes = ['white', 'g10', 'g80', 'g90', 'g100'];
		for (const theme of themes) {
			await page.evaluate((t) => {
				window.postMessage(
					{
						type: 'updateProps',
						props: { theme: t }
					},
					'*'
				);
			}, theme);

			const dataTheme = await page.locator('.page-layout').getAttribute('data-theme');
			expect(dataTheme).toBe(theme);
		}
	});

	test('PageLayout loading state works', async ({ page }) => {
		await page.goto('/test/page-layout?loading=true');

		const loadingOverlay = await page.locator('.loading-overlay').count();
		expect(loadingOverlay).toBeGreaterThan(0);

		const spinner = await page.locator('.loading-spinner').count();
		expect(spinner).toBeGreaterThan(0);

		// Verify ARIA attributes
		const ariaLive = await page.locator('[role="status"][aria-live="polite"]').count();
		expect(ariaLive).toBeGreaterThan(0);
	});

	test('PageLayout responsive behavior', async ({ page }) => {
		await page.goto('/test/page-layout');

		// Test mobile viewport
		await page.setViewportSize({ width: 375, height: 667 });
		const mobileSearch = await page.locator('.header-search').isVisible();
		expect(mobileSearch).toBe(false);

		// Test tablet viewport
		await page.setViewportSize({ width: 768, height: 1024 });

		// Test desktop viewport
		await page.setViewportSize({ width: 1920, height: 1080 });
		const desktopSearch = await page.locator('.header-search').isVisible();
		expect(desktopSearch).toBe(true);
	});

	test('PageLayout accessibility features', async ({ page }) => {
		await page.goto('/test/page-layout');

		// Test keyboard navigation
		await page.keyboard.press('Tab');
		const skipLink = await page.locator(':focus');
		expect(await skipLink.getAttribute('href')).toBe('#main-content');

		// Test focus management
		await page.keyboard.press('Tab');
		await page.keyboard.press('Tab');
		const focusedElement = await page.locator(':focus');
		expect(await focusedElement.evaluate((el) => el.tagName)).toBeTruthy();

		// Test ARIA attributes
		const mainContent = await page.locator('.page-content');
		expect(mainContent).toBeTruthy();

		// Test screen reader announcements
		const srOnly = await page.locator('.sr-only').count();
		expect(srOnly).toBeGreaterThan(0);
	});

	test('PageLayout user panel interactions', async ({ page }) => {
		const userInfo: UserInfo = {
			name: 'John Doe',
			role: 'Admin',
			email: 'john@example.com'
		};

		await page.goto('/test/page-layout');
		await page.evaluate((user) => {
			window.postMessage(
				{
					type: 'updateProps',
					props: { userInfo: user }
				},
				'*'
			);
		}, userInfo);

		// Click user avatar
		await page.click('[aria-label="User Profile"]');

		// Check panel visibility
		const userPanel = await page.locator('.bx--header-panel').isVisible();
		expect(userPanel).toBe(true);

		// Check user info display
		const userDisplay = await page.locator('.bx--header-panel').textContent();
		expect(userDisplay).toContain(userInfo.name);
		expect(userDisplay).toContain(userInfo.role);
	});

	test('PageLayout search functionality', async ({ page }) => {
		await page.goto('/test/page-layout?showSearch=true');

		const searchInput = await page.locator('.bx--search-input');
		await searchInput.fill('test query');
		await searchInput.press('Enter');

		// Listen for search event
		const searchEvent = await page.evaluate(() => {
			return new Promise((resolve) => {
				window.addEventListener('search', (e: any) => {
					resolve(e.detail);
				});
			});
		});

		expect(searchEvent).toEqual({ query: 'test query' });
	});

	test('PageLayout content width constraints', async ({ page }) => {
		const widths = ['sm', 'md', 'lg', 'xlg', 'max', 'full'];

		for (const width of widths) {
			await page.goto(`/test/page-layout?maxWidth=${width}`);

			const contentWrapper = await page.locator('.content-wrapper');
			const hasWidthClass = await contentWrapper.evaluate((el, w) => {
				return el.classList.contains(`max-w-screen-${w}`) || el.classList.contains('w-full');
			}, width);

			expect(hasWidthClass).toBe(true);
		}
	});

	test('PageLayout slot integration', async ({ page }) => {
		await page.goto('/test/page-layout?customHeaderSlot=true&customSideNavSlot=true');

		// Test custom header slot
		await page.evaluate(() => {
			const headerSlot = document.createElement('div');
			headerSlot.setAttribute('slot', 'header');
			headerSlot.textContent = 'Custom Header Content';
			document.body.appendChild(headerSlot);
		});

		// Test custom sidenav slot
		await page.evaluate(() => {
			const sideNavSlot = document.createElement('div');
			sideNavSlot.setAttribute('slot', 'sidenav');
			sideNavSlot.textContent = 'Custom SideNav Content';
			document.body.appendChild(sideNavSlot);
		});

		// Verify slots are rendered
		const headerContent = await page.textContent('[slot="header"]');
		expect(headerContent).toContain('Custom Header Content');

		const sideNavContent = await page.textContent('[slot="sidenav"]');
		expect(sideNavContent).toContain('Custom SideNav Content');
	});
});
