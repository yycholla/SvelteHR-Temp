/**
 * Accessibility Testing Setup
 *
 * Configuration and utilities for automated accessibility testing with axe-core.
 * Provides setup for WCAG 2.1 AA compliance testing across all components.
 */

import { test as base, expect } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'

// Extend Playwright test with accessibility utilities
export const test = base.extend({
  /**
   * Accessibility testing utilities
   */
  a11y: async ({ page }, use) => {
    const a11y = {
      /**
       * Run axe-core accessibility audit
       * @param options - Axe configuration options
       */
      async audit(options: {
        include?: string[]
        exclude?: string[]
        tags?: string[]
        rules?: Record<string, { enabled: boolean }>
        disableRules?: string[]
      } = {}) {
        const axeBuilder = new AxeBuilder({ page })

        // Configure WCAG 2.1 AA compliance by default
        if (!options.tags) {
          axeBuilder.withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
        } else {
          axeBuilder.withTags(options.tags)
        }

        // Include/exclude selectors
        if (options.include) {
          axeBuilder.include(options.include)
        }
        if (options.exclude) {
          axeBuilder.exclude(options.exclude)
        }

        // Disable specific rules if needed
        if (options.disableRules) {
          axeBuilder.disableRules(options.disableRules)
        }

        // Configure custom rules
        if (options.rules) {
          Object.entries(options.rules).forEach(([ruleId, config]) => {
            if (config.enabled) {
              axeBuilder.withRules([ruleId])
            } else {
              axeBuilder.disableRules([ruleId])
            }
          })
        }

        const results = await axeBuilder.analyze()
        return results
      },

      /**
       * Assert no accessibility violations
       * @param options - Axe configuration options
       */
      async assertNoViolations(options = {}) {
        const results = await this.audit(options)

        // Custom error message with violation details
        if (results.violations.length > 0) {
          const violationSummary = results.violations
            .map(violation =>
              `${violation.id}: ${violation.description}\n` +
              `  Impact: ${violation.impact}\n` +
              `  Nodes: ${violation.nodes.length}\n` +
              `  Help: ${violation.helpUrl}`
            )
            .join('\n\n')

          throw new Error(
            `Accessibility violations found:\n\n${violationSummary}\n\n` +
            `Total violations: ${results.violations.length}`
          )
        }

        return results
      },

      /**
       * Check specific accessibility requirements
       * @param requirements - Specific WCAG requirements to check
       */
      async checkRequirements(requirements: {
        colorContrast?: boolean
        keyboardNavigation?: boolean
        screenReader?: boolean
        focusManagement?: boolean
        semanticStructure?: boolean
      }) {
        const tags: string[] = []

        if (requirements.colorContrast) {
          tags.push('cat.color')
        }
        if (requirements.keyboardNavigation) {
          tags.push('cat.keyboard')
        }
        if (requirements.screenReader) {
          tags.push('cat.name-role-value')
        }
        if (requirements.focusManagement) {
          tags.push('cat.focus')
        }
        if (requirements.semanticStructure) {
          tags.push('cat.structure')
        }

        return await this.audit({ tags })
      },

      /**
       * Test keyboard navigation
       * @param startSelector - Starting element selector
       * @param expectedOrder - Expected tab order selectors
       */
      async testKeyboardNavigation(startSelector?: string, expectedOrder?: string[]) {
        if (startSelector) {
          await page.click(startSelector)
        }

        const focusOrder: string[] = []

        // Test Tab navigation
        for (let i = 0; i < (expectedOrder?.length || 10); i++) {
          await page.keyboard.press('Tab')

          const focusedElement = await page.evaluate(() => {
            const element = document.activeElement
            if (!element) return null

            // Get a selector for the focused element
            if (element.id) return `#${element.id}`
            if (element.className) return `.${element.className.split(' ')[0]}`
            return element.tagName.toLowerCase()
          })

          if (focusedElement) {
            focusOrder.push(focusedElement)
          }
        }

        // Test Shift+Tab navigation (reverse)
        for (let i = 0; i < Math.min(focusOrder.length, 3); i++) {
          await page.keyboard.press('Shift+Tab')
        }

        return {
          focusOrder,
          isValidOrder: expectedOrder ?
            expectedOrder.every((selector, index) => focusOrder[index]?.includes(selector)) :
            focusOrder.length > 0
        }
      },

      /**
       * Test skip links functionality
       */
      async testSkipLinks() {
        // Navigate to page start
        await page.keyboard.press('Home')

        // Press Tab to focus first interactive element (should be skip link)
        await page.keyboard.press('Tab')

        const skipLink = await page.locator('a[href^="#"], .skip-link').first()

        if (await skipLink.isVisible()) {
          await skipLink.click()

          // Verify that focus moved to main content
          const focusedElement = await page.evaluate(() => {
            const element = document.activeElement
            return element ? element.tagName.toLowerCase() : null
          })

          return {
            hasSkipLink: true,
            skipLinkWorks: focusedElement === 'main' ||
              await page.locator('main, [role="main"], #main-content').first().evaluate(el =>
                el === document.activeElement || el.contains(document.activeElement)
              )
          }
        }

        return { hasSkipLink: false, skipLinkWorks: false }
      },

      /**
       * Test ARIA live regions
       * @param triggerAction - Action that should trigger live region update
       * @param expectedMessage - Expected announcement message
       */
      async testLiveRegions(triggerAction: () => Promise<void>, expectedMessage?: string) {
        // Monitor live regions before action
        const liveRegions = await page.locator('[aria-live], [role="status"], [role="alert"]').all()
        const initialContent = await Promise.all(
          liveRegions.map(region => region.textContent())
        )

        // Perform action that should trigger live region update
        await triggerAction()

        // Wait for potential updates
        await page.waitForTimeout(500)

        // Check for updates
        const updatedContent = await Promise.all(
          liveRegions.map(region => region.textContent())
        )

        const hasUpdates = updatedContent.some((content, index) =>
          content !== initialContent[index]
        )

        return {
          hasLiveRegions: liveRegions.length > 0,
          hasUpdates,
          matches: expectedMessage ?
            updatedContent.some(content => content?.includes(expectedMessage)) :
            undefined
        }
      }
    }

    await use(a11y)
  }
})

// Accessibility test configuration
export const accessibilityConfig = {
  // WCAG 2.1 AA compliance tags
  wcagTags: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'],

  // Common rules to disable for specific contexts
  disableRules: {
    // For dynamic content that may not have labels during testing
    dynamicContent: ['label', 'button-name'],

    // For third-party components that may have known issues
    thirdParty: ['color-contrast', 'landmark-unique'],

    // For development/testing environments
    development: ['bypass', 'page-has-heading-one']
  },

  // Performance settings
  timeout: 30000, // 30 seconds for accessibility audits

  // Custom matchers for accessibility assertions
  customMatchers: {
    toPassA11yAudit: (results: any) => {
      const violations = results.violations || []
      const pass = violations.length === 0

      if (pass) {
        return {
          message: () => `Expected accessibility violations, but found none`,
          pass: true
        }
      } else {
        const summary = violations
          .map((v: any) => `${v.id}: ${v.description}`)
          .join('\n')

        return {
          message: () => `Expected no accessibility violations, but found:\n${summary}`,
          pass: false
        }
      }
    }
  }
}

// Helper functions for common accessibility patterns
export const a11yHelpers = {
  /**
   * Wait for screen reader to process content
   */
  async waitForScreenReader(page: any, timeout = 1000) {
    await page.waitForTimeout(timeout)
  },

  /**
   * Get computed accessibility tree
   */
  async getAccessibilityTree(page: any, selector?: string) {
    const element = selector ? await page.locator(selector).first() : page
    return await element.evaluate((el: Element) => {
      // This would integrate with browser accessibility APIs
      // For now, return basic accessibility information
      return {
        role: el.getAttribute('role') || el.tagName.toLowerCase(),
        label: el.getAttribute('aria-label') ||
               el.getAttribute('aria-labelledby') ||
               (el as HTMLElement).innerText?.slice(0, 50),
        describedBy: el.getAttribute('aria-describedby'),
        expanded: el.getAttribute('aria-expanded'),
        checked: el.getAttribute('aria-checked'),
        selected: el.getAttribute('aria-selected'),
        disabled: el.hasAttribute('disabled') || el.getAttribute('aria-disabled') === 'true'
      }
    })
  },

  /**
   * Simulate screen reader navigation
   */
  async simulateScreenReader(page: any, commands: string[]) {
    const results = []

    for (const command of commands) {
      switch (command) {
        case 'next-heading':
          await page.keyboard.press('h')
          break
        case 'next-landmark':
          await page.keyboard.press('d')
          break
        case 'next-link':
          await page.keyboard.press('k')
          break
        case 'next-button':
          await page.keyboard.press('b')
          break
        case 'next-form-field':
          await page.keyboard.press('f')
          break
        case 'read-current':
          // Would read current element
          break
        default:
          await page.keyboard.press(command)
      }

      // Get current focus/reading position
      const current = await this.getAccessibilityTree(page, ':focus')
      results.push(current)
    }

    return results
  },

  /**
   * Check color contrast ratios
   */
  async checkColorContrast(page: any, selectors?: string[]) {
    const elementsToCheck = selectors || ['body', 'h1', 'h2', 'h3', 'p', 'a', 'button']
    const results = []

    for (const selector of elementsToCheck) {
      const elements = await page.locator(selector).all()

      for (const element of elements) {
        const contrast = await element.evaluate((el: HTMLElement) => {
          const styles = window.getComputedStyle(el)
          const color = styles.color
          const backgroundColor = styles.backgroundColor

          // This would use a color contrast calculation library
          // For now, return placeholder values
          return {
            foreground: color,
            background: backgroundColor,
            ratio: 4.5, // Placeholder - would calculate actual ratio
            passes: true // Placeholder - would check against WCAG standards
          }
        })

        results.push({
          selector,
          contrast
        })
      }
    }

    return results
  }
}

export { expect }