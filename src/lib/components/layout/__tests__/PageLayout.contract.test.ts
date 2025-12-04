/**
 * PageLayout Component Contract Tests
 * Validates the PageLayout component implementation against its interface contract
 */

import { expect, test } from '@playwright/test';
import type {
	BreadcrumbItem,
	HeaderAction,
	NotificationItem,
	PageLayoutProps,
	UserInfo
} from '../../../../contracts/component-interface';

// Test data fixtures
const mockUser: UserInfo = {
	name: 'John Doe',
	email: 'john.doe@example.com',
	role: 'admin'
};

const mockBreadcrumbs: BreadcrumbItem[] = [
	{ text: 'Home', href: '/' },
	{ text: 'Admin', href: '/admin' },
	{ text: 'Users' }
];

const mockNotifications: NotificationItem[] = [
	{
		id: '1',
		title: 'New Leave Request',
		message: 'Jane Smith submitted a new leave request',
		type: 'info',
		timestamp: new Date().toISOString(),
		href: '/leave/requests/123'
	},
	{
		id: '2',
		title: 'System Maintenance',
		message: 'Scheduled maintenance tonight at 2 AM',
		type: 'warning',
		timestamp: new Date().toISOString()
	}
];

const mockHeaderActions: HeaderAction[] = [
	{
		text: 'Quick Actions',
		icon: 'menu',
		panel: [
			{ text: 'New Employee', href: '/admin/users/new' },
			{ divider: true },
			{ text: 'Export Data', onClick: () => {} }
		]
	}
];

test.describe('PageLayout Component Contract', () => {
	test.beforeEach(async ({ page }) => {
		// Create a test page with PageLayout
		await page.setContent(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>PageLayout Test</title>
          <script type="module">
            import { PageLayout } from '/src/lib/components/layout/PageLayout.svelte';

            // Test component
            const testLayout = new PageLayout({
              target: document.getElementById('layout-container'),
              props: {
                title: 'Test Page',
                subtitle: 'Testing PageLayout component'
              }
            });

            window.testLayout = testLayout;
          </script>
        </head>
        <body>
          <div id="layout-container"></div>
        </body>
      </html>
    `);
	});

	test('should implement required PageLayout interface', async ({ page }) => {
		// Test that component accepts all required props
		const props: PageLayoutProps = {
			title: 'Dashboard',
			subtitle: 'Welcome to the HR system',
			breadcrumbs: mockBreadcrumbs,
			showHeader: true,
			showSidebar: true,
			sidebarExpanded: false,
			headerActions: mockHeaderActions,
			user: mockUser,
			notifications: mockNotifications,
			maxWidth: '1200px',
			padding: 'md',
			headerTheme: 'g100',
			sidebarTheme: 'g10'
		};

		await page.evaluate((testProps) => {
			// Update component props
			window.testLayout.$set(testProps);
		}, props);

		// Verify component renders without errors
		await expect(page.locator('.page-layout')).toBeVisible();
	});

	test('should render header when showHeader is true', async ({ page }) => {
		await page.evaluate(() => {
			window.testLayout.$set({
				title: 'Test Page',
				showHeader: true
			});
		});

		await expect(page.locator('[data-carbon-theme="g100"]')).toBeVisible();
		await expect(page.locator('.bx--header')).toBeVisible();
	});

	test('should hide header when showHeader is false', async ({ page }) => {
		await page.evaluate(() => {
			window.testLayout.$set({
				title: 'Test Page',
				showHeader: false
			});
		});

		await expect(page.locator('.bx--header')).not.toBeVisible();
	});

	test('should render sidebar when showSidebar is true', async ({ page }) => {
		await page.evaluate(
			() => {
				window.testLayout.$set({
					showSidebar: true,
					user: mockUser
				});
			},
			{ mockUser }
		);

		await expect(page.locator('.bx--side-nav')).toBeVisible();
	});

	test('should hide sidebar when showSidebar is false', async ({ page }) => {
		await page.evaluate(() => {
			window.testLayout.$set({
				showSidebar: false
			});
		});

		await expect(page.locator('.bx--side-nav')).not.toBeVisible();
	});

	test('should render page title and subtitle', async ({ page }) => {
		await page.evaluate(() => {
			window.testLayout.$set({
				title: 'User Management',
				subtitle: 'Manage system users and permissions'
			});
		});

		await expect(page.locator('.page-title')).toContainText('User Management');
		await expect(page.locator('.page-subtitle')).toContainText(
			'Manage system users and permissions'
		);
	});

	test('should render breadcrumbs when provided', async ({ page }) => {
		await page.evaluate((breadcrumbs) => {
			window.testLayout.$set({
				breadcrumbs
			});
		}, mockBreadcrumbs);

		await expect(page.locator('.breadcrumb-nav')).toBeVisible();
		await expect(page.locator('.breadcrumb-link')).toHaveCount(2); // First two are links
		await expect(page.locator('.breadcrumb-current')).toHaveCount(1); // Last one is current
	});

	test('should render user menu when user is provided', async ({ page }) => {
		await page.evaluate((user) => {
			window.testLayout.$set({
				showHeader: true,
				user
			});
		}, mockUser);

		// Click user menu button
		await page.click('[aria-label*="User menu"]');

		await expect(page.locator('.user-info .user-name')).toContainText('John Doe');
		await expect(page.locator('.user-info .user-email')).toContainText('john.doe@example.com');
		await expect(page.locator('.user-info .user-role')).toContainText('admin');
	});

	test('should render notifications when provided', async ({ page }) => {
		await page.evaluate((notifications) => {
			window.testLayout.$set({
				showHeader: true,
				notifications
			});
		}, mockNotifications);

		// Click notifications button
		await page.click('[aria-label*="Notifications"]');

		await expect(page.locator('.notification-item')).toHaveCount(2);
		await expect(page.locator('.notification-title').first()).toContainText('New Leave Request');
	});

	test('should handle navigation correctly', async ({ page }) => {
		await page.evaluate((user) => {
			window.testLayout.$set({
				showHeader: true,
				showSidebar: true,
				user
			});
		}, mockUser);

		// Test header navigation
		await expect(page.locator('[href="/dashboard"]')).toBeVisible();
		await expect(page.locator('[href="/leave"]')).toBeVisible();

		// Admin-specific navigation should be visible for admin user
		await expect(page.locator('[href="/admin"]')).toBeVisible();
	});

	test('should handle keyboard navigation', async ({ page }) => {
		await page.evaluate(() => {
			window.testLayout.$set({
				showHeader: true,
				showSidebar: true,
				sidebarExpanded: true
			});
		});

		// Press Escape key
		await page.keyboard.press('Escape');

		// Sidebar should be closed
		await expect(page.locator('.bx--side-nav--expanded')).not.toBeVisible();
	});

	test('should apply correct themes', async ({ page }) => {
		await page.evaluate(() => {
			window.testLayout.$set({
				showHeader: true,
				showSidebar: true,
				headerTheme: 'g100',
				sidebarTheme: 'g10'
			});
		});

		await expect(page.locator('[data-carbon-theme="g100"]')).toBeVisible();
	});

	test('should handle responsive behavior', async ({ page }) => {
		// Set mobile viewport
		await page.setViewportSize({ width: 320, height: 568 });

		await page.evaluate(() => {
			window.testLayout.$set({
				showHeader: true,
				showSidebar: true,
				padding: 'sm'
			});
		});

		// Check responsive classes are applied
		await expect(page.locator('.main-content')).toHaveClass(/carbon-spacing-sm/);
	});

	test('should maintain accessibility standards', async ({ page }) => {
		await page.evaluate((user) => {
			window.testLayout.$set({
				title: 'Accessible Page',
				showHeader: true,
				showSidebar: true,
				user
			});
		}, mockUser);

		// Check skip to content link
		await expect(page.locator('.bx--skip-to-content')).toBeVisible();

		// Check ARIA labels
		await expect(page.locator('[aria-label="Primary navigation"]')).toBeVisible();
		await expect(page.locator('[aria-label="Side navigation"]')).toBeVisible();
		await expect(page.locator('[role="main"]')).toBeVisible();
	});

	test('should handle custom header actions', async ({ page }) => {
		await page.evaluate((headerActions) => {
			window.testLayout.$set({
				showHeader: true,
				headerActions
			});
		}, mockHeaderActions);

		// Click header action
		await page.click('[aria-label="Quick Actions"]');

		// Check panel items
		await expect(page.locator('[href="/admin/users/new"]')).toContainText('New Employee');
	});

	test('should announce page changes for screen readers', async ({ page }) => {
		await page.evaluate(() => {
			window.testLayout.$set({
				title: 'Initial Page'
			});
		});

		// Change title
		await page.evaluate(() => {
			window.testLayout.$set({
				title: 'Updated Page'
			});
		});

		// Check that announcement was created
		await expect(page.locator('[aria-live="polite"]')).toBeVisible();
	});

	test('should handle logout functionality', async ({ page }) => {
		await page.evaluate((user) => {
			window.testLayout.$set({
				showHeader: true,
				user
			});
		}, mockUser);

		// Listen for logout event
		const logoutEventPromise = page.evaluate(() => {
			return new Promise((resolve) => {
				document.addEventListener('logout', resolve, { once: true });
			});
		});

		// Click user menu and logout
		await page.click('[aria-label*="User menu"]');
		await page.click('text=Sign Out');

		// Verify logout event was dispatched
		await logoutEventPromise;
	});
});
