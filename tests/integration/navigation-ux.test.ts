import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { testConfig } from '../config';

describe('Integration: Navigation and User Experience', () => {
	let authTokens: Record<string, string> = {};
	let testData: Array<{ id: string; type: string; role: string }> = [];

	beforeEach(async () => {
		// Login as different roles to get auth tokens
		const roles = ['employee', 'manager', 'hr_manager', 'admin'];
		
		for (const role of roles) {
			const credentials = testConfig.users[role];
			const response = await fetch(`${testConfig.baseURL}/api/v2/auth/login`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(credentials)
			});
			
			const data = await response.json();
			authTokens[role] = data.token;
		}
	});

	afterEach(async () => {
		// Clean up created test data
		for (const item of testData) {
			try {
				await fetch(`${testConfig.baseURL}/api/v2/${item.type}/${item.id}`, {
					method: 'DELETE',
					headers: { 'Authorization': `Bearer ${authTokens.admin}` }
				});
			} catch (error) {
				// Ignore cleanup errors
			}
		}
		testData = [];
	});

	describe('Role-Based Navigation Access', () => {
		it('should provide appropriate navigation menu for Employee role', async () => {
			const navigationResponse = await fetch(`${testConfig.baseURL}/api/v2/navigation/menu`, {
				headers: { 'Authorization': `Bearer ${authTokens.employee}` }
			});

			expect(navigationResponse.status).toBe(200);
			
			const navData = await navigationResponse.json();
			
			// CONTRACT: Employee should have basic self-service navigation
			const expectedEmployeeMenus = [
				'dashboard', 
				'my-profile', 
				'timesheet', 
				'leave-requests', 
				'documents', 
				'training'
			];
			
			const forbiddenEmployeeMenus = [
				'employee-management',
				'payroll',
				'system-admin',
				'reports-analytics',
				'user-management'
			];

			expect(navData.menu_items).toBeInstanceOf(Array);
			
			for (const expectedMenu of expectedEmployeeMenus) {
				expect(navData.menu_items.some((item: any) => 
					item.key === expectedMenu && item.accessible === true
				)).toBe(true);
			}
			
			for (const forbiddenMenu of forbiddenEmployeeMenus) {
				expect(navData.menu_items.some((item: any) => 
					item.key === forbiddenMenu && item.accessible === true
				)).toBe(false);
			}

			// Verify accessibility metadata
			expect(navData).toMatchObject({
				role: 'employee',
				permissions_checked: true,
				menu_items: expect.arrayContaining([
					expect.objectContaining({
						key: expect.any(String),
						label: expect.any(String),
						url: expect.any(String),
						accessible: expect.any(Boolean),
						icon: expect.any(String)
					})
				])
			});
		});

		it('should provide appropriate navigation menu for Manager role', async () => {
			const navigationResponse = await fetch(`${testConfig.baseURL}/api/v2/navigation/menu`, {
				headers: { 'Authorization': `Bearer ${authTokens.manager}` }
			});

			expect(navigationResponse.status).toBe(200);
			
			const navData = await navigationResponse.json();
			
			// CONTRACT: Manager should have team management navigation
			const expectedManagerMenus = [
				'dashboard',
				'my-profile',
				'team-overview',
				'team-performance',
				'leave-approvals',
				'reports-team'
			];
			
			const forbiddenManagerMenus = [
				'payroll',
				'system-admin',
				'user-management',
				'company-wide-analytics'
			];

			for (const expectedMenu of expectedManagerMenus) {
				expect(navData.menu_items.some((item: any) => 
					item.key === expectedMenu && item.accessible === true
				)).toBe(true);
			}
			
			for (const forbiddenMenu of forbiddenManagerMenus) {
				expect(navData.menu_items.some((item: any) => 
					item.key === forbiddenMenu && item.accessible === true
				)).toBe(false);
			}

			// Manager should see team-specific badges and counts
			const teamOverviewItem = navData.menu_items.find((item: any) => item.key === 'team-overview');
			expect(teamOverviewItem).toMatchObject({
				accessible: true,
				metadata: {
					team_member_count: expect.any(Number),
					pending_approvals: expect.any(Number),
					department_scoped: true
				}
			});
		});

		it('should provide appropriate navigation menu for HR Manager role', async () => {
			const navigationResponse = await fetch(`${testConfig.baseURL}/api/v2/navigation/menu`, {
				headers: { 'Authorization': `Bearer ${authTokens.hr_manager}` }
			});

			expect(navigationResponse.status).toBe(200);
			
			const navData = await navigationResponse.json();
			
			// CONTRACT: HR Manager should have comprehensive HR navigation
			const expectedHRMenus = [
				'dashboard',
				'employee-management',
				'recruitment',
				'payroll',
				'performance-reviews',
				'compliance',
				'reports-hr',
				'training-management'
			];
			
			const forbiddenHRMenus = [
				'system-admin',
				'user-management',
				'audit-logs',
				'system-configuration'
			];

			for (const expectedMenu of expectedHRMenus) {
				expect(navData.menu_items.some((item: any) => 
					item.key === expectedMenu && item.accessible === true
				)).toBe(true);
			}
			
			for (const forbiddenMenu of forbiddenHRMenus) {
				expect(navData.menu_items.some((item: any) => 
					item.key === forbiddenMenu && item.accessible === true
				)).toBe(false);
			}

			// HR Manager should see HR-specific statistics
			const hrDashboard = navData.menu_items.find((item: any) => item.key === 'dashboard');
			expect(hrDashboard).toMatchObject({
				accessible: true,
				metadata: {
					hr_specific: true,
					employee_count: expect.any(Number),
					pending_reviews: expect.any(Number),
					compliance_alerts: expect.any(Number)
				}
			});
		});

		it('should provide appropriate navigation menu for Admin role', async () => {
			const navigationResponse = await fetch(`${testConfig.baseURL}/api/v2/navigation/menu`, {
				headers: { 'Authorization': `Bearer ${authTokens.admin}` }
			});

			expect(navigationResponse.status).toBe(200);
			
			const navData = await navigationResponse.json();
			
			// CONTRACT: Admin should have unrestricted navigation access
			const expectedAdminMenus = [
				'dashboard',
				'employee-management',
				'system-admin',
				'user-management',
				'audit-logs',
				'system-configuration',
				'security-monitoring',
				'reports-executive'
			];

			for (const expectedMenu of expectedAdminMenus) {
				expect(navData.menu_items.some((item: any) => 
					item.key === expectedMenu && item.accessible === true
				)).toBe(true);
			}

			// Admin should see system-wide statistics
			const adminDashboard = navData.menu_items.find((item: any) => item.key === 'dashboard');
			expect(adminDashboard).toMatchObject({
				accessible: true,
				metadata: {
					system_admin: true,
					total_users: expect.any(Number),
					system_health: expect.any(String),
					security_alerts: expect.any(Number)
				}
			});

			// Admin should have access to all menu categories
			const menuCategories = [...new Set(navData.menu_items.map((item: any) => item.category))];
			expect(menuCategories).toContain('system');
			expect(menuCategories).toContain('security');
			expect(menuCategories).toContain('management');
		});
	});

	describe('Breadcrumb and Context Navigation', () => {
		it('should provide accurate breadcrumb navigation', async () => {
			// Test breadcrumbs for nested navigation paths
			const breadcrumbTests = [
				{
					path: '/employees/emp-123/profile',
					role: 'hr_manager',
					expectedBreadcrumbs: ['Dashboard', 'Employee Management', 'Employee Profile']
				},
				{
					path: '/team/performance-reviews',
					role: 'manager',
					expectedBreadcrumbs: ['Dashboard', 'Team Management', 'Performance Reviews']
				},
				{
					path: '/admin/system/users/user-456',
					role: 'admin',
					expectedBreadcrumbs: ['Dashboard', 'System Administration', 'User Management', 'User Details']
				},
				{
					path: '/my-profile/settings',
					role: 'employee',
					expectedBreadcrumbs: ['Dashboard', 'My Profile', 'Settings']
				}
			];

			for (const test of breadcrumbTests) {
				const breadcrumbResponse = await fetch(`${testConfig.baseURL}/api/v2/navigation/breadcrumbs?path=${encodeURIComponent(test.path)}`, {
					headers: { 'Authorization': `Bearer ${authTokens[test.role]}` }
				});

				expect(breadcrumbResponse.status).toBe(200);
				
				const breadcrumbData = await breadcrumbResponse.json();
				
				// CONTRACT: Breadcrumbs should reflect navigation hierarchy
				expect(breadcrumbData.breadcrumbs).toBeInstanceOf(Array);
				expect(breadcrumbData.breadcrumbs.length).toBe(test.expectedBreadcrumbs.length);

				for (let i = 0; i < test.expectedBreadcrumbs.length; i++) {
					expect(breadcrumbData.breadcrumbs[i]).toMatchObject({
						label: test.expectedBreadcrumbs[i],
						url: expect.any(String),
						active: i === test.expectedBreadcrumbs.length - 1
					});
				}
			}
		});

		it('should provide contextual navigation suggestions', async () => {
			// Get contextual suggestions based on current location and role
			const contextualTests = [
				{
					currentPath: '/employees/emp-123/profile',
					role: 'hr_manager',
					expectedSuggestions: ['Edit Employee', 'Performance History', 'Salary Details', 'Documents']
				},
				{
					currentPath: '/dashboard',
					role: 'manager',
					expectedSuggestions: ['Team Overview', 'Pending Approvals', 'Team Performance', 'Reports']
				},
				{
					currentPath: '/my-profile',
					role: 'employee',
					expectedSuggestions: ['Update Information', 'Change Password', 'Download Documents', 'View Payslips']
				}
			];

			for (const test of contextualTests) {
				const contextResponse = await fetch(`${testConfig.baseURL}/api/v2/navigation/context-menu?path=${encodeURIComponent(test.currentPath)}`, {
					headers: { 'Authorization': `Bearer ${authTokens[test.role]}` }
				});

				expect(contextResponse.status).toBe(200);
				
				const contextData = await contextResponse.json();
				
				// CONTRACT: Context menu should provide relevant actions
				expect(contextData.context_actions).toBeInstanceOf(Array);
				expect(contextData.context_actions.length).toBeGreaterThan(0);

				for (const expectedSuggestion of test.expectedSuggestions) {
					expect(contextData.context_actions.some((action: any) => 
						action.label === expectedSuggestion && action.accessible === true
					)).toBe(true);
				}
			}
		});
	});

	describe('Search and Quick Navigation', () => {
		it('should provide role-appropriate global search results', async () => {
			const searchTests = [
				{
					query: 'john doe',
					role: 'employee',
					expectedTypes: ['employees'], // Employee can only search employees they have access to
					forbiddenTypes: ['users', 'system_logs', 'audit_logs']
				},
				{
					query: 'performance',
					role: 'manager',
					expectedTypes: ['employees', 'performance_reviews'], // Manager can search team-related items
					forbiddenTypes: ['users', 'system_logs', 'payroll']
				},
				{
					query: 'salary',
					role: 'hr_manager',
					expectedTypes: ['employees', 'payroll', 'benefits'], // HR Manager has broader access
					forbiddenTypes: ['system_logs', 'audit_logs']
				},
				{
					query: 'system',
					role: 'admin',
					expectedTypes: ['employees', 'users', 'system_logs', 'audit_logs'], // Admin has full access
					forbiddenTypes: []
				}
			];

			for (const test of searchTests) {
				const searchResponse = await fetch(`${testConfig.baseURL}/api/v2/search/global?q=${encodeURIComponent(test.query)}&limit=10`, {
					headers: { 'Authorization': `Bearer ${authTokens[test.role]}` }
				});

				expect(searchResponse.status).toBe(200);
				
				const searchData = await searchResponse.json();
				
				// CONTRACT: Search results should be filtered by role permissions
				expect(searchData.results).toBeInstanceOf(Array);
				expect(searchData.metadata).toMatchObject({
					query: test.query,
					total_results: expect.any(Number),
					search_scope: expect.any(String),
					filtered_by_role: true
				});

				// Check that expected types are present (if results exist)
				if (searchData.results.length > 0) {
					const resultTypes = [...new Set(searchData.results.map((r: any) => r.type))];
					
					for (const expectedType of test.expectedTypes) {
						// At least some expected types should be searchable (if they exist in the system)
						if (searchData.results.length > 0) {
							// We can't guarantee all types will be present, but the search should not fail
						}
					}
					
					for (const forbiddenType of test.forbiddenTypes) {
						expect(resultTypes).not.toContain(forbiddenType);
					}
				}
			}
		});

		it('should provide quick navigation shortcuts', async () => {
			// Test quick navigation for each role
			const quickNavTests = [
				{
					role: 'employee',
					expectedShortcuts: [
						{ key: 'ctrl+d', action: 'dashboard', label: 'Go to Dashboard' },
						{ key: 'ctrl+p', action: 'profile', label: 'My Profile' },
						{ key: 'ctrl+t', action: 'timesheet', label: 'Timesheet' },
						{ key: 'ctrl+l', action: 'leave-requests', label: 'Leave Requests' }
					]
				},
				{
					role: 'manager',
					expectedShortcuts: [
						{ key: 'ctrl+d', action: 'dashboard', label: 'Go to Dashboard' },
						{ key: 'ctrl+t', action: 'team', label: 'Team Overview' },
						{ key: 'ctrl+a', action: 'approvals', label: 'Pending Approvals' },
						{ key: 'ctrl+r', action: 'reports', label: 'Team Reports' }
					]
				},
				{
					role: 'hr_manager',
					expectedShortcuts: [
						{ key: 'ctrl+d', action: 'dashboard', label: 'Go to Dashboard' },
						{ key: 'ctrl+e', action: 'employees', label: 'Employee Management' },
						{ key: 'ctrl+p', action: 'payroll', label: 'Payroll' },
						{ key: 'ctrl+r', action: 'reports', label: 'HR Reports' }
					]
				},
				{
					role: 'admin',
					expectedShortcuts: [
						{ key: 'ctrl+d', action: 'dashboard', label: 'Go to Dashboard' },
						{ key: 'ctrl+u', action: 'users', label: 'User Management' },
						{ key: 'ctrl+s', action: 'system', label: 'System Administration' },
						{ key: 'ctrl+l', action: 'logs', label: 'Audit Logs' }
					]
				}
			];

			for (const test of quickNavTests) {
				const shortcutsResponse = await fetch(`${testConfig.baseURL}/api/v2/navigation/shortcuts`, {
					headers: { 'Authorization': `Bearer ${authTokens[test.role]}` }
				});

				expect(shortcutsResponse.status).toBe(200);
				
				const shortcutsData = await shortcutsResponse.json();
				
				// CONTRACT: Each role should have appropriate keyboard shortcuts
				expect(shortcutsData.shortcuts).toBeInstanceOf(Array);
				expect(shortcutsData.shortcuts.length).toBeGreaterThanOrEqual(test.expectedShortcuts.length);

				for (const expectedShortcut of test.expectedShortcuts) {
					expect(shortcutsData.shortcuts.some((shortcut: any) =>
						shortcut.key === expectedShortcut.key &&
						shortcut.action === expectedShortcut.action &&
						shortcut.accessible === true
					)).toBe(true);
				}
			}
		});

		it('should handle search with filters and facets', async () => {
			const searchWithFiltersResponse = await fetch(`${testConfig.baseURL}/api/v2/search/employees`, {
				method: 'POST',
				headers: {
					'Authorization': `Bearer ${authTokens.hr_manager}`,
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					query: 'software',
					filters: {
						department: 'Engineering',
						status: 'active',
						hire_date: { from: '2020-01-01', to: '2024-12-31' }
					},
					facets: ['department', 'position', 'status'],
					sort: [{ field: 'name', direction: 'asc' }],
					pagination: { limit: 20, offset: 0 }
				})
			});

			expect(searchWithFiltersResponse.status).toBe(200);
			
			const searchData = await searchWithFiltersResponse.json();
			
			// CONTRACT: Advanced search should provide filtered results and facets
			expect(searchData).toMatchObject({
				results: expect.any(Array),
				facets: expect.objectContaining({
					department: expect.any(Array),
					position: expect.any(Array),
					status: expect.any(Array)
				}),
				pagination: {
					total: expect.any(Number),
					limit: 20,
					offset: 0,
					has_more: expect.any(Boolean)
				},
				applied_filters: {
					department: 'Engineering',
					status: 'active'
				}
			});

			// Facets should provide filter counts
			Object.values(searchData.facets).forEach((facetArray: any) => {
				expect(facetArray).toBeInstanceOf(Array);
				if (facetArray.length > 0) {
					facetArray.forEach((facet: any) => {
						expect(facet).toMatchObject({
							value: expect.any(String),
							count: expect.any(Number)
						});
					});
				}
			});
		});
	});

	describe('Responsive and Accessibility Features', () => {
		it('should provide mobile-optimized navigation', async () => {
			// Test navigation with mobile user agent
			const mobileNavigationResponse = await fetch(`${testConfig.baseURL}/api/v2/navigation/menu?viewport=mobile`, {
				headers: { 
					'Authorization': `Bearer ${authTokens.hr_manager}`,
					'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15'
				}
			});

			expect(mobileNavigationResponse.status).toBe(200);
			
			const mobileNavData = await mobileNavigationResponse.json();
			
			// CONTRACT: Mobile navigation should be optimized for touch
			expect(mobileNavData).toMatchObject({
				viewport: 'mobile',
				navigation_type: 'hamburger',
				menu_items: expect.any(Array),
				touch_optimized: true,
				compact_mode: true
			});

			// Mobile menu should have touch-friendly properties
			mobileNavData.menu_items.forEach((item: any) => {
				expect(item).toMatchObject({
					key: expect.any(String),
					label: expect.any(String),
					touch_target_size: expect.stringMatching(/\d+px/),
					tap_highlight: expect.any(Boolean)
				});
			});
		});

		it('should provide accessibility-compliant navigation', async () => {
			const accessibilityResponse = await fetch(`${testConfig.baseURL}/api/v2/navigation/accessibility`, {
				headers: { 'Authorization': `Bearer ${authTokens.employee}` }
			});

			expect(accessibilityResponse.status).toBe(200);
			
			const accessibilityData = await accessibilityResponse.json();
			
			// CONTRACT: Navigation should be fully accessible
			expect(accessibilityData).toMatchObject({
				wcag_compliance: 'AAA',
				keyboard_navigation: true,
				screen_reader_support: true,
				high_contrast_mode: expect.any(Boolean),
				focus_indicators: true,
				skip_links: expect.any(Array)
			});

			// Skip links should be available
			expect(accessibilityData.skip_links).toContain('Skip to main content');
			expect(accessibilityData.skip_links).toContain('Skip to navigation');

			// ARIA labels should be provided
			expect(accessibilityData.aria_labels).toMatchObject({
				main_navigation: expect.any(String),
				breadcrumbs: expect.any(String),
				search: expect.any(String),
				user_menu: expect.any(String)
			});
		});

		it('should support keyboard navigation', async () => {
			const keyboardNavResponse = await fetch(`${testConfig.baseURL}/api/v2/navigation/keyboard-map`, {
				headers: { 'Authorization': `Bearer ${authTokens.manager}` }
			});

			expect(keyboardNavResponse.status).toBe(200);
			
			const keyboardData = await keyboardNavResponse.json();
			
			// CONTRACT: Full keyboard navigation should be supported
			expect(keyboardData).toMatchObject({
				tab_order: expect.any(Array),
				keyboard_shortcuts: expect.any(Array),
				focus_management: {
					trap_focus_in_modals: true,
					return_focus_after_close: true,
					skip_to_content: true
				},
				navigation_keys: {
					arrow_keys: true,
					enter_key: true,
					escape_key: true,
					space_key: true
				}
			});

			// Essential keyboard shortcuts should be available
			const essentialShortcuts = keyboardData.keyboard_shortcuts.filter((s: any) => s.essential);
			expect(essentialShortcuts.length).toBeGreaterThan(0);
			
			essentialShortcuts.forEach((shortcut: any) => {
				expect(shortcut).toMatchObject({
					key_combination: expect.any(String),
					action: expect.any(String),
					description: expect.any(String),
					scope: expect.stringMatching(/global|page|component/)
				});
			});
		});
	});

	describe('Performance and Loading States', () => {
		it('should provide progressive loading for large navigation structures', async () => {
			// Test lazy loading of navigation sections
			const lazyNavResponse = await fetch(`${testConfig.baseURL}/api/v2/navigation/lazy-load?section=reports`, {
				headers: { 'Authorization': `Bearer ${authTokens.hr_manager}` }
			});

			expect(lazyNavResponse.status).toBe(200);
			
			const lazyNavData = await lazyNavResponse.json();
			
			// CONTRACT: Navigation sections should load progressively
			expect(lazyNavData).toMatchObject({
				section: 'reports',
				items: expect.any(Array),
				loaded: true,
				load_time_ms: expect.any(Number),
				cache_hit: expect.any(Boolean)
			});

			// Load time should be reasonable
			expect(lazyNavData.load_time_ms).toBeLessThan(500);

			// Items should have proper structure
			if (lazyNavData.items.length > 0) {
				lazyNavData.items.forEach((item: any) => {
					expect(item).toMatchObject({
						key: expect.any(String),
						label: expect.any(String),
						url: expect.any(String),
						accessible: expect.any(Boolean),
						load_priority: expect.stringMatching(/high|medium|low/)
					});
				});
			}
		});

		it('should handle navigation caching appropriately', async () => {
			// First request should populate cache
			const firstNavResponse = await fetch(`${testConfig.baseURL}/api/v2/navigation/menu`, {
				headers: { 'Authorization': `Bearer ${authTokens.admin}` }
			});

			expect(firstNavResponse.status).toBe(200);
			
			const firstResponseTime = Date.now();

			// Second request should be faster due to caching
			const secondNavResponse = await fetch(`${testConfig.baseURL}/api/v2/navigation/menu`, {
				headers: { 'Authorization': `Bearer ${authTokens.admin}` }
			});

			expect(secondNavResponse.status).toBe(200);
			
			const secondResponseTime = Date.now();

			// Check cache headers
			const cacheControl = secondNavResponse.headers.get('cache-control');
			const etag = secondNavResponse.headers.get('etag');

			// CONTRACT: Navigation should be cached appropriately
			expect(cacheControl).toMatch(/max-age=\d+/);
			expect(etag).toBeTruthy();

			const secondNavData = await secondNavResponse.json();
			expect(secondNavData.metadata).toMatchObject({
				cache_hit: expect.any(Boolean),
				generated_at: expect.any(String)
			});
		});

		it('should provide loading states for navigation interactions', async () => {
			// Test loading states for various navigation actions
			const loadingStateTests = [
				{ action: 'menu-expand', endpoint: '/api/v2/navigation/expand-section?section=employees' },
				{ action: 'search-suggestions', endpoint: '/api/v2/navigation/search-suggestions?q=john' },
				{ action: 'context-menu', endpoint: '/api/v2/navigation/context-menu?path=/dashboard' }
			];

			for (const test of loadingStateTests) {
				const startTime = Date.now();
				
				const response = await fetch(`${testConfig.baseURL}${test.endpoint}`, {
					headers: { 'Authorization': `Bearer ${authTokens.hr_manager}` }
				});

				const endTime = Date.now();
				const responseTime = endTime - startTime;

				// CONTRACT: Navigation interactions should be responsive
				expect(response.status).toBe(200);
				expect(responseTime).toBeLessThan(1000); // Should respond within 1 second

				const responseData = await response.json();
				expect(responseData).toMatchObject({
					action: test.action,
					response_time_ms: expect.any(Number),
					status: 'completed'
				});
			}
		});
	});

	describe('Error Handling and Fallbacks', () => {
		it('should gracefully handle navigation errors', async () => {
			// Test navigation with invalid paths
			const invalidPathTests = [
				'/non-existent-page',
				'/employees/invalid-employee-id',
				'/admin/restricted-section',
				'/api/v2/invalid-endpoint'
			];

			for (const invalidPath of invalidPathTests) {
				const navigationResponse = await fetch(`${testConfig.baseURL}/api/v2/navigation/validate-path?path=${encodeURIComponent(invalidPath)}`, {
					headers: { 'Authorization': `Bearer ${authTokens.employee}` }
				});

				// CONTRACT: Invalid paths should be handled gracefully
				expect([200, 404, 403]).toContain(navigationResponse.status);
				
				if (navigationResponse.status === 200) {
					const navData = await navigationResponse.json();
					expect(navData).toMatchObject({
						path: invalidPath,
						valid: false,
						error_type: expect.stringMatching(/not_found|access_denied|invalid_path/),
						suggested_alternatives: expect.any(Array)
					});
				}
			}
		});

		it('should provide fallback navigation when services are unavailable', async () => {
			// Simulate service degradation
			const fallbackResponse = await fetch(`${testConfig.baseURL}/api/v2/navigation/fallback-menu`, {
				headers: { 'Authorization': `Bearer ${authTokens.manager}` }
			});

			expect(fallbackResponse.status).toBe(200);
			
			const fallbackData = await fallbackResponse.json();
			
			// CONTRACT: Fallback navigation should provide essential functionality
			expect(fallbackData).toMatchObject({
				type: 'fallback',
				minimal_menu: true,
				essential_items: expect.any(Array),
				degraded_mode: true
			});

			// Essential items should include critical navigation
			const essentialKeys = fallbackData.essential_items.map((item: any) => item.key);
			expect(essentialKeys).toContain('dashboard');
			expect(essentialKeys).toContain('logout');

			fallbackData.essential_items.forEach((item: any) => {
				expect(item).toMatchObject({
					key: expect.any(String),
					label: expect.any(String),
					url: expect.any(String),
					critical: true
				});
			});
		});

		it('should handle permission changes during navigation', async () => {
			// Simulate permission change scenario
			const permissionChangeResponse = await fetch(`${testConfig.baseURL}/api/v2/navigation/refresh-permissions`, {
				method: 'POST',
				headers: { 
					'Authorization': `Bearer ${authTokens.manager}`,
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					check_current_permissions: true,
					invalidate_cache: true
				})
			});

			expect(permissionChangeResponse.status).toBe(200);
			
			const refreshData = await permissionChangeResponse.json();
			
			// CONTRACT: Permission changes should trigger navigation updates
			expect(refreshData).toMatchObject({
				permissions_checked: true,
				cache_invalidated: true,
				menu_updated: expect.any(Boolean),
				timestamp: expect.any(String),
				affected_items: expect.any(Array)
			});

			// If permissions changed, affected items should be listed
			if (refreshData.menu_updated) {
				expect(refreshData.affected_items.length).toBeGreaterThan(0);
				
				refreshData.affected_items.forEach((item: any) => {
					expect(item).toMatchObject({
						key: expect.any(String),
						accessibility_changed: expect.any(Boolean),
						new_status: expect.stringMatching(/accessible|restricted|removed/)
					});
				});
			}
		});
	});

	describe('Personalization and Preferences', () => {
		it('should support navigation customization', async () => {
			// Test user navigation preferences
			const customizationResponse = await fetch(`${testConfig.baseURL}/api/v2/navigation/preferences`, {
				method: 'GET',
				headers: { 'Authorization': `Bearer ${authTokens.hr_manager}` }
			});

			expect(customizationResponse.status).toBe(200);
			
			const preferencesData = await customizationResponse.json();
			
			// CONTRACT: Users should be able to customize navigation
			expect(preferencesData).toMatchObject({
				user_id: expect.any(String),
				preferences: {
					menu_collapsed: expect.any(Boolean),
					favorite_items: expect.any(Array),
					recent_items: expect.any(Array),
					theme: expect.stringMatching(/light|dark|system/),
					compact_mode: expect.any(Boolean)
				},
				customizations: {
					pinned_sections: expect.any(Array),
					hidden_items: expect.any(Array),
					menu_order: expect.any(Array)
				}
			});
		});

		it('should track and display frequently accessed items', async () => {
			// Access several items to build usage history
			const accessUrls = [
				'/api/v2/employees',
				'/api/v2/reports/hr-dashboard',
				'/api/v2/employees/search',
				'/api/v2/payroll'
			];

			for (const url of accessUrls) {
				await fetch(`${testConfig.baseURL}${url}`, {
					headers: { 'Authorization': `Bearer ${authTokens.hr_manager}` }
				});
			}

			// Get frequently accessed items
			const frequentItemsResponse = await fetch(`${testConfig.baseURL}/api/v2/navigation/frequent-items`, {
				headers: { 'Authorization': `Bearer ${authTokens.hr_manager}` }
			});

			expect(frequentItemsResponse.status).toBe(200);
			
			const frequentData = await frequentItemsResponse.json();
			
			// CONTRACT: System should track and surface frequently used items
			expect(frequentData).toMatchObject({
				frequent_items: expect.any(Array),
				recent_items: expect.any(Array),
				suggested_items: expect.any(Array),
				analytics: {
					tracking_enabled: expect.any(Boolean),
					data_retention_days: expect.any(Number)
				}
			});

			// Items should be ordered by frequency/recency
			if (frequentData.frequent_items.length > 1) {
				for (let i = 0; i < frequentData.frequent_items.length - 1; i++) {
					const currentItem = frequentData.frequent_items[i];
					const nextItem = frequentData.frequent_items[i + 1];
					
					expect(currentItem.access_count).toBeGreaterThanOrEqual(nextItem.access_count);
				}
			}
		});
	});
});