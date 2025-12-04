// T005: Unit tests for PermissionGuard Svelte 5 component
import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/svelte';
import PermissionGuardTest from './PermissionGuard.test.svelte';
import type { PermissionContext, PermissionString } from '$lib/types/permissions';
import { RoleHierarchy } from '$lib/types/permissions';

describe('PermissionGuard Component', () => {
	describe('Basic Permission Checks', () => {
		it('should render children when user has required permission', () => {
			const permissions: PermissionString[] = ['employees:read'];

			const { getByTestId, queryByTestId } = render(PermissionGuardTest, {
				props: {
					permissions,
					requires: 'employees:read',
					childrenText: 'Employees Page'
				}
			});

			expect(getByTestId('children')).toBeInTheDocument();
			expect(getByTestId('children')).toHaveTextContent('Employees Page');
			expect(queryByTestId('fallback')).not.toBeInTheDocument();
		});

		it('should not render children when user lacks required permission', () => {
			const permissions: PermissionString[] = ['employees:read'];

			const { queryByTestId } = render(PermissionGuardTest, {
				props: {
					permissions,
					requires: 'employees:write',
					childrenText: 'Edit Button'
				}
			});

			expect(queryByTestId('children')).not.toBeInTheDocument();
		});

		it('should render children when user has admin wildcard', () => {
			const permissions: PermissionString[] = ['*'];

			const { getByTestId } = render(PermissionGuardTest, {
				props: {
					permissions,
					requires: 'employees:write',
					childrenText: 'Admin Access'
				}
			});

			expect(getByTestId('children')).toBeInTheDocument();
			expect(getByTestId('children')).toHaveTextContent('Admin Access');
		});

		it('should render when no requires prop is provided', () => {
			const permissions: PermissionString[] = [];

			const { getByTestId } = render(PermissionGuardTest, {
				props: {
					permissions,
					childrenText: 'Always Visible'
				}
			});

			expect(getByTestId('children')).toBeInTheDocument();
		});
	});

	describe('Multiple Permission Checks', () => {
		it('should render when user has ANY of the required permissions (requireAll=false)', () => {
			const permissions: PermissionString[] = ['employees:read'];

			const { getByTestId } = render(PermissionGuardTest, {
				props: {
					permissions,
					requires: ['employees:read', 'employees:write'],
					requireAll: false,
					childrenText: 'HR Section'
				}
			});

			expect(getByTestId('children')).toBeInTheDocument();
		});

		it('should not render when user has NONE of the required permissions (requireAll=false)', () => {
			const permissions: PermissionString[] = ['teams:read'];

			const { queryByTestId } = render(PermissionGuardTest, {
				props: {
					permissions,
					requires: ['employees:read', 'departments:read'],
					requireAll: false,
					childrenText: 'Admin Panel'
				}
			});

			expect(queryByTestId('children')).not.toBeInTheDocument();
		});

		it('should render when user has ALL required permissions (requireAll=true)', () => {
			const permissions: PermissionString[] = ['employees:read', 'employees:write'];

			const { getByTestId } = render(PermissionGuardTest, {
				props: {
					permissions,
					requires: ['employees:read', 'employees:write'],
					requireAll: true,
					childrenText: 'Full Access'
				}
			});

			expect(getByTestId('children')).toBeInTheDocument();
		});

		it('should not render when user lacks ANY required permission (requireAll=true)', () => {
			const permissions: PermissionString[] = ['employees:read'];

			const { queryByTestId } = render(PermissionGuardTest, {
				props: {
					permissions,
					requires: ['employees:read', 'employees:write'],
					requireAll: true,
					childrenText: 'Full Access Required'
				}
			});

			expect(queryByTestId('children')).not.toBeInTheDocument();
		});
	});

	describe('PermissionContext Support', () => {
		it('should accept PermissionContext object', () => {
			const context: PermissionContext = {
				permissions: ['employees:read'],
				roles: [{ id: '1', name: 'Manager', level: RoleHierarchy.Manager }],
				userId: 'user123'
			};

			const { getByTestId } = render(PermissionGuardTest, {
				props: {
					permissions: context,
					requires: 'employees:read',
					childrenText: 'Context Test'
				}
			});

			expect(getByTestId('children')).toBeInTheDocument();
		});

		it('should work with PermissionContext flags', () => {
			const context: PermissionContext = {
				permissions: ['*'],
				roles: [{ id: '1', name: 'Admin', level: RoleHierarchy.Admin }],
				userId: 'admin123',
				flags: {
					isAdmin: true,
					isHRManager: false,
					isManager: false,
					canReadEmployees: true,
					canWriteEmployees: true,
					canDeleteEmployees: true,
					canReadDepartments: true,
					canWriteDepartments: true,
					canDeleteDepartments: true,
					canAccessAdmin: true,
					canAccessHR: true
				}
			};

			const { getByTestId } = render(PermissionGuardTest, {
				props: {
					permissions: context,
					requires: 'admin:write',
					childrenText: 'Admin Dashboard'
				}
			});

			expect(getByTestId('children')).toBeInTheDocument();
		});
	});

	describe('Inverse Mode', () => {
		it('should render children when permission check FAILS (inverse=true)', () => {
			const permissions: PermissionString[] = ['employees:read'];

			const { getByTestId } = render(PermissionGuardTest, {
				props: {
					permissions,
					requires: 'employees:write',
					inverse: true,
					childrenText: 'No Write Access'
				}
			});

			expect(getByTestId('children')).toBeInTheDocument();
		});

		it('should not render children when permission check PASSES (inverse=true)', () => {
			const permissions: PermissionString[] = ['employees:write'];

			const { queryByTestId } = render(PermissionGuardTest, {
				props: {
					permissions,
					requires: 'employees:write',
					inverse: true,
					childrenText: 'No Write Access'
				}
			});

			expect(queryByTestId('children')).not.toBeInTheDocument();
		});
	});

	describe('Fallback Rendering', () => {
		it('should render fallback when permission check fails', () => {
			const permissions: PermissionString[] = ['employees:read'];

			const { queryByTestId, getByTestId } = render(PermissionGuardTest, {
				props: {
					permissions,
					requires: 'employees:write',
					childrenText: 'Edit Button',
					fallbackText: 'No Permission'
				}
			});

			expect(queryByTestId('children')).not.toBeInTheDocument();
			expect(getByTestId('fallback')).toBeInTheDocument();
			expect(getByTestId('fallback')).toHaveTextContent('No Permission');
		});

		it('should not render fallback when permission check passes', () => {
			const permissions: PermissionString[] = ['employees:write'];

			const { getByTestId, queryByTestId } = render(PermissionGuardTest, {
				props: {
					permissions,
					requires: 'employees:write',
					childrenText: 'Edit Button',
					fallbackText: 'No Permission'
				}
			});

			expect(getByTestId('children')).toBeInTheDocument();
			expect(queryByTestId('fallback')).not.toBeInTheDocument();
		});
	});

	describe('Wrapper Element Customization', () => {
		it('should render with default div wrapper', () => {
			const permissions: PermissionString[] = ['employees:read'];

			const { container } = render(PermissionGuardTest, {
				props: {
					permissions,
					requires: 'employees:read',
					childrenText: 'Content'
				}
			});

			expect(container.querySelector('div')).toBeInTheDocument();
		});

		it('should render with custom element wrapper', () => {
			const permissions: PermissionString[] = ['employees:read'];

			const { container } = render(PermissionGuardTest, {
				props: {
					permissions,
					requires: 'employees:read',
					as: 'section',
					childrenText: 'Content'
				}
			});

			expect(container.querySelector('section')).toBeInTheDocument();
			expect(container.querySelector('div')).not.toBeInTheDocument();
		});

		it('should render without wrapper when as=null', () => {
			const permissions: PermissionString[] = ['employees:read'];

			const { container, getByTestId } = render(PermissionGuardTest, {
				props: {
					permissions,
					requires: 'employees:read',
					as: null,
					childrenText: 'Content'
				}
			});

			// Check that content is rendered directly without wrapper div
			expect(container.querySelector('div')).not.toBeInTheDocument();
			expect(getByTestId('children')).toBeInTheDocument();
		});

		it('should apply CSS class to wrapper', () => {
			const permissions: PermissionString[] = ['employees:read'];

			const { container } = render(PermissionGuardTest, {
				props: {
					permissions,
					requires: 'employees:read',
					class: 'custom-class',
					childrenText: 'Content'
				}
			});

			expect(container.querySelector('.custom-class')).toBeInTheDocument();
		});

		it('should apply additional HTML attributes to wrapper', () => {
			const permissions: PermissionString[] = ['employees:read'];

			const { container } = render(PermissionGuardTest, {
				props: {
					permissions,
					requires: 'employees:read',
					'data-testid': 'permission-wrapper',
					'aria-label': 'Protected content',
					childrenText: 'Content'
				}
			});

			const wrapper = container.querySelector('[data-testid="permission-wrapper"]');
			expect(wrapper).toBeInTheDocument();
			expect(wrapper).toHaveAttribute('aria-label', 'Protected content');
		});
	});

	describe('Scoped Permission Matching', () => {
		it('should match scoped permission to unscoped requirement', () => {
			const permissions: PermissionString[] = ['employees:read:team'];

			const { getByTestId } = render(PermissionGuardTest, {
				props: {
					permissions,
					requires: 'employees:read',
					childrenText: 'Team Employees'
				}
			});

			expect(getByTestId('children')).toBeInTheDocument();
		});

		it('should not match different actions even with same resource', () => {
			const permissions: PermissionString[] = ['employees:read:team'];

			const { queryByTestId } = render(PermissionGuardTest, {
				props: {
					permissions,
					requires: 'employees:write',
					childrenText: 'Edit Employees'
				}
			});

			expect(queryByTestId('children')).not.toBeInTheDocument();
		});
	});

	describe('Edge Cases', () => {
		it('should handle empty permission array', () => {
			const permissions: PermissionString[] = [];

			const { queryByTestId } = render(PermissionGuardTest, {
				props: {
					permissions,
					requires: 'employees:read',
					childrenText: 'Should Not Render'
				}
			});

			expect(queryByTestId('children')).not.toBeInTheDocument();
		});

		it('should handle empty requires array (ANY mode)', () => {
			const permissions: PermissionString[] = ['employees:read'];

			const { getByTestId } = render(PermissionGuardTest, {
				props: {
					permissions,
					requires: [],
					requireAll: false,
					childrenText: 'Should Render'
				}
			});

			expect(getByTestId('children')).toBeInTheDocument();
		});

		it('should handle empty requires array (ALL mode)', () => {
			const permissions: PermissionString[] = ['employees:read'];

			const { getByTestId } = render(PermissionGuardTest, {
				props: {
					permissions,
					requires: [],
					requireAll: true,
					childrenText: 'Should Render'
				}
			});

			// Empty array with requireAll=true should pass (vacuous truth)
			expect(getByTestId('children')).toBeInTheDocument();
		});
	});
});
