/**
 * Carbon Components Accessibility Tests
 *
 * Comprehensive accessibility tests for Carbon Design System components.
 * Tests WCAG 2.1 AA compliance, keyboard navigation, and screen reader compatibility.
 */

import { test, expect, accessibilityConfig, a11yHelpers } from './setup';

test.describe('Carbon Components Accessibility', () => {
	test.beforeEach(async ({ page }) => {
		// Ensure page loads completely before accessibility testing
		await page.goto('/');
		await page.waitForLoadState('networkidle');
	});

	test('Dashboard page meets WCAG 2.1 AA standards', async ({ page, a11y }) => {
		await page.goto('/dashboard');
		await page.waitForLoadState('networkidle');

		// Run comprehensive accessibility audit
		const results = await a11y.assertNoViolations({
			tags: accessibilityConfig.wcagTags,
			exclude: ['.bx--loading-overlay'], // Exclude loading overlays during testing
			disableRules: accessibilityConfig.disableRules.development
		});

		// Verify critical accessibility features
		expect(results.passes.length).toBeGreaterThan(0);
		expect(results.violations.length).toBe(0);

		// Additional checks for common issues
		await a11y.checkRequirements({
			colorContrast: true,
			keyboardNavigation: true,
			screenReader: true,
			focusManagement: true,
			semanticStructure: true
		});
	});

	test('Login page accessibility compliance', async ({ page, a11y }) => {
		await page.goto('/login');
		await page.waitForLoadState('networkidle');

		// Test form accessibility specifically
		const results = await a11y.assertNoViolations({
			include: ['form', '[role="form"]', 'input', 'button', 'label'],
			tags: [...accessibilityConfig.wcagTags, 'cat.forms']
		});

		// Verify form has proper labels and structure
		const formElements = await page.locator('input, select, textarea').all();
		for (const element of formElements) {
			const hasLabel = await element.evaluate((el) => {
				const id = el.id;
				const ariaLabel = el.getAttribute('aria-label');
				const ariaLabelledBy = el.getAttribute('aria-labelledby');
				const label = id ? document.querySelector(`label[for="${id}"]`) : null;

				return !!(ariaLabel || ariaLabelledBy || label);
			});

			expect(hasLabel).toBe(true);
		}
	});

	test('Admin page data table accessibility', async ({ page, a11y }) => {
		await page.goto('/admin');
		await page.waitForLoadState('networkidle');

		// Test data table accessibility
		const results = await a11y.assertNoViolations({
			include: ['table', '[role="table"]', '[role="grid"]'],
			tags: [...accessibilityConfig.wcagTags, 'cat.tables']
		});

		// Verify table has proper structure
		const tables = await page.locator('table, [role="table"], [role="grid"]').all();
		for (const table of tables) {
			// Check for table caption or aria-label
			const hasCaption = await table.evaluate((el) => {
				return !!(
					el.querySelector('caption') ||
					el.getAttribute('aria-label') ||
					el.getAttribute('aria-labelledby')
				);
			});
			expect(hasCaption).toBe(true);

			// Check for proper header structure
			const hasHeaders = await table.evaluate((el) => {
				return el.querySelectorAll('th, [role="columnheader"]').length > 0;
			});
			expect(hasHeaders).toBe(true);
		}
	});

	test('Navigation accessibility and keyboard support', async ({ page, a11y }) => {
		await page.goto('/dashboard');
		await page.waitForLoadState('networkidle');

		// Test skip links
		const skipLinkResult = await a11y.testSkipLinks();
		expect(skipLinkResult.hasSkipLink).toBe(true);
		expect(skipLinkResult.skipLinkWorks).toBe(true);

		// Test keyboard navigation
		const navResult = await a11y.testKeyboardNavigation();
		expect(navResult.isValidOrder).toBe(true);
		expect(navResult.focusOrder.length).toBeGreaterThan(0);

		// Test navigation menu accessibility
		const navigationElements = await page.locator('[role="navigation"], nav').all();
		for (const nav of navigationElements) {
			const hasLabel = await nav.evaluate((el) => {
				return !!(el.getAttribute('aria-label') || el.getAttribute('aria-labelledby'));
			});
			expect(hasLabel).toBe(true);
		}
	});

	test('Button and interactive element accessibility', async ({ page, a11y }) => {
		await page.goto('/dashboard');
		await page.waitForLoadState('networkidle');

		// Test all buttons have accessible names
		const buttons = await page.locator('button, [role="button"]').all();
		for (const button of buttons) {
			const accessibleName = await button.evaluate((el) => {
				return (
					el.getAttribute('aria-label') ||
					el.getAttribute('aria-labelledby') ||
					el.textContent?.trim() ||
					el.getAttribute('title')
				);
			});
			expect(accessibleName).toBeTruthy();
		}

		// Test interactive elements have proper roles
		const interactiveElements = await page
			.locator('a, button, input, select, textarea, [tabindex="0"], [role="button"], [role="link"]')
			.all();

		for (const element of interactiveElements) {
			const isAccessible = await element.evaluate((el) => {
				const role = el.getAttribute('role') || el.tagName.toLowerCase();
				const isDisabled =
					el.hasAttribute('disabled') || el.getAttribute('aria-disabled') === 'true';
				const hasTabIndex = el.hasAttribute('tabindex');

				// Interactive elements should be keyboard accessible
				return (
					isDisabled ||
					hasTabIndex ||
					['a', 'button', 'input', 'select', 'textarea'].includes(el.tagName.toLowerCase())
				);
			});
			expect(isAccessible).toBe(true);
		}
	});

	test('Color contrast compliance', async ({ page, a11y }) => {
		await page.goto('/dashboard');
		await page.waitForLoadState('networkidle');

		// Test color contrast for text elements
		const contrastResults = await a11yHelpers.checkColorContrast(page, [
			'h1',
			'h2',
			'h3',
			'p',
			'span',
			'a',
			'button',
			'label',
			'.bx--label'
		]);

		for (const result of contrastResults) {
			expect(result.contrast.passes).toBe(true);
		}

		// Run axe color contrast checks
		await a11y.assertNoViolations({
			tags: ['cat.color'],
			rules: {
				'color-contrast': { enabled: true },
				'color-contrast-enhanced': { enabled: true }
			}
		});
	});

	test('Form validation and error handling accessibility', async ({ page, a11y }) => {
		await page.goto('/login');
		await page.waitForLoadState('networkidle');

		// Test form submission with empty fields to trigger validation
		const submitButton = page.locator('button[type="submit"]').first();
		await submitButton.click();

		// Wait for validation messages
		await page.waitForTimeout(1000);

		// Test that error messages are properly associated
		const errorMessages = await page.locator('[role="alert"], .bx--form-requirement').all();

		if (errorMessages.length > 0) {
			for (const error of errorMessages) {
				// Check that error message is associated with form field
				const isAssociated = await error.evaluate((el) => {
					const id = el.id;
					const associatedField = id ? document.querySelector(`[aria-describedby*="${id}"]`) : null;

					return !!associatedField || !!el.closest('.bx--form-item');
				});
				expect(isAssociated).toBe(true);
			}

			// Test live region announcements for errors
			const liveRegionResult = await a11y.testLiveRegions(async () => {
				await submitButton.click();
			}, 'error');
			expect(liveRegionResult.hasLiveRegions).toBe(true);
		}
	});

	test('Modal and overlay accessibility', async ({ page, a11y }) => {
		await page.goto('/dashboard');
		await page.waitForLoadState('networkidle');

		// Look for modal triggers
		const modalTriggers = await page
			.locator(
				'[data-modal-target], [aria-haspopup="dialog"], button:has-text("Add"), button:has-text("Edit")'
			)
			.all();

		if (modalTriggers.length > 0) {
			// Open modal
			await modalTriggers[0].click();
			await page.waitForTimeout(500);

			// Test modal accessibility
			const modal = page.locator('[role="dialog"], .bx--modal').first();

			if (await modal.isVisible()) {
				// Check modal has proper labeling
				const hasLabel = await modal.evaluate((el) => {
					return !!(el.getAttribute('aria-label') || el.getAttribute('aria-labelledby'));
				});
				expect(hasLabel).toBe(true);

				// Check focus management
				const focusedElement = await page.evaluate(() => document.activeElement?.tagName);
				expect(focusedElement).toBeTruthy();

				// Test keyboard navigation within modal
				await page.keyboard.press('Tab');
				const focusStaysInModal = await modal.evaluate((el) => {
					return el.contains(document.activeElement);
				});
				expect(focusStaysInModal).toBe(true);

				// Test escape key
				await page.keyboard.press('Escape');
				await page.waitForTimeout(500);

				const modalClosed = await modal.isVisible();
				expect(modalClosed).toBe(false);
			}
		}
	});

	test('Responsive design accessibility', async ({ page, a11y }) => {
		// Test mobile viewport
		await page.setViewportSize({ width: 375, height: 667 });
		await page.goto('/dashboard');
		await page.waitForLoadState('networkidle');

		// Run accessibility audit on mobile
		await a11y.assertNoViolations({
			tags: accessibilityConfig.wcagTags
		});

		// Test tablet viewport
		await page.setViewportSize({ width: 768, height: 1024 });
		await page.reload();
		await page.waitForLoadState('networkidle');

		await a11y.assertNoViolations({
			tags: accessibilityConfig.wcagTags
		});

		// Test desktop viewport
		await page.setViewportSize({ width: 1440, height: 900 });
		await page.reload();
		await page.waitForLoadState('networkidle');

		await a11y.assertNoViolations({
			tags: accessibilityConfig.wcagTags
		});
	});

	test('Loading states and dynamic content accessibility', async ({ page, a11y }) => {
		await page.goto('/admin');

		// Test loading state accessibility
		const loadingElements = await page.locator('.bx--loading, [aria-busy="true"]').all();

		for (const loading of loadingElements) {
			const hasLoadingLabel = await loading.evaluate((el) => {
				return !!(
					el.getAttribute('aria-label') ||
					el.getAttribute('aria-labelledby') ||
					el.textContent?.includes('loading') ||
					el.textContent?.includes('Loading')
				);
			});
			expect(hasLoadingLabel).toBe(true);
		}

		await page.waitForLoadState('networkidle');

		// Test dynamic content updates
		const searchInput = page.locator('input[type="search"], .bx--search-input').first();

		if (await searchInput.isVisible()) {
			// Test search functionality with live regions
			const liveRegionResult = await a11y.testLiveRegions(async () => {
				await searchInput.fill('test');
				await page.waitForTimeout(1000);
			}, 'result');

			// Should have some form of live region or announcement
			expect(liveRegionResult.hasLiveRegions || liveRegionResult.hasUpdates).toBe(true);
		}
	});

	test('High contrast mode support', async ({ page, a11y }) => {
		// Simulate high contrast mode
		await page.emulateMedia({ media: 'screen', colorScheme: 'light', reducedMotion: 'reduce' });
		await page.addStyleTag({
			content: `
        @media (prefers-contrast: high) {
          :root {
            --cds-text-primary: #000000 !important;
            --cds-background: #ffffff !important;
            --cds-border-subtle: #000000 !important;
            --cds-border-strong: #000000 !important;
          }
        }
      `
		});

		await page.goto('/dashboard');
		await page.waitForLoadState('networkidle');

		// Run accessibility audit with high contrast
		await a11y.assertNoViolations({
			tags: ['cat.color'],
			rules: {
				'color-contrast': { enabled: true },
				'color-contrast-enhanced': { enabled: true }
			}
		});
	});

	test('Reduced motion support', async ({ page, a11y }) => {
		// Test with reduced motion preference
		await page.emulateMedia({ media: 'screen', reducedMotion: 'reduce' });

		await page.goto('/dashboard');
		await page.waitForLoadState('networkidle');

		// Verify animations are reduced or disabled
		const animationElements = await page
			.locator('.bx--loading, .bx--toast, [class*="animate"], [class*="transition"]')
			.all();

		for (const element of animationElements) {
			const respectsReducedMotion = await element.evaluate((el) => {
				const styles = window.getComputedStyle(el);
				const animationDuration = styles.animationDuration;
				const transitionDuration = styles.transitionDuration;

				// Check if animations are disabled or very short
				return (
					animationDuration === '0s' ||
					animationDuration === '0.01ms' ||
					transitionDuration === '0s' ||
					transitionDuration === '0.01ms'
				);
			});

			// Not all elements need to respect reduced motion, but critical ones should
			if (await element.getAttribute('class')?.includes('loading')) {
				expect(respectsReducedMotion).toBe(true);
			}
		}
	});
});
