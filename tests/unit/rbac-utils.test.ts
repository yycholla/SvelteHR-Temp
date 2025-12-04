/**
 * Unit tests for RBAC utilities
 * T035: Write unit tests for RBAC utilities
 *
 * These tests verify role-based access control functions including:
 * - Role precedence logic (admin > manager > employee > guest)
 * - Department edit permissions
 * - Manager department assignment verification
 * - Permission hierarchy checks
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { hasPermission, hasRole, canEditDepartment, canEditEmployee } from '$lib/server/rbac-utils';

describe('RBAC Utilities', () => {
	describe('hasPermission', () => {
		it('should return true if user has wildcard permission', () => {
			const userPermissions = ['*'];
			const requiredPermissions = ['employees:read', 'departments:write'];

			expect(hasPermission(userPermissions, requiredPermissions)).toBe(true);
		});

		it('should return true if user has ANY required permission (requireAll=false)', () => {
			const userPermissions = ['employees:read', 'teams:read'];
			const requiredPermissions = ['employees:read', 'departments:write'];

			expect(hasPermission(userPermissions, requiredPermissions, false)).toBe(true);
		});

		it('should return false if user has none of the required permissions', () => {
			const userPermissions = ['teams:read'];
			const requiredPermissions = ['employees:read', 'departments:write'];

			expect(hasPermission(userPermissions, requiredPermissions)).toBe(false);
		});

		it('should return true if user has ALL required permissions (requireAll=true)', () => {
			const userPermissions = ['employees:read', 'departments:write', 'teams:read'];
			const requiredPermissions = ['employees:read', 'departments:write'];

			expect(hasPermission(userPermissions, requiredPermissions, true)).toBe(true);
		});

		it('should return false if user missing one required permission (requireAll=true)', () => {
			const userPermissions = ['employees:read'];
			const requiredPermissions = ['employees:read', 'departments:write'];

			expect(hasPermission(userPermissions, requiredPermissions, true)).toBe(false);
		});

		it('should return true if no permissions required', () => {
			const userPermissions = ['employees:read'];
			const requiredPermissions: string[] = [];

			expect(hasPermission(userPermissions, requiredPermissions)).toBe(true);
		});

		it('should return false if user has no permissions', () => {
			const userPermissions: string[] = [];
			const requiredPermissions = ['employees:read'];

			expect(hasPermission(userPermissions, requiredPermissions)).toBe(false);
		});
	});

	describe('hasRole', () => {
		it('should return true if user has ANY required role (requireAll=false)', () => {
			const userRoles = ['manager', 'employee'];
			const requiredRoles = ['admin', 'manager'];

			expect(hasRole(userRoles, requiredRoles, false)).toBe(true);
		});

		it('should return false if user has none of the required roles', () => {
			const userRoles = ['employee'];
			const requiredRoles = ['admin', 'manager'];

			expect(hasRole(userRoles, requiredRoles)).toBe(false);
		});

		it('should return true if user has ALL required roles (requireAll=true)', () => {
			const userRoles = ['admin', 'manager', 'employee'];
			const requiredRoles = ['admin', 'manager'];

			expect(hasRole(userRoles, requiredRoles, true)).toBe(true);
		});

		it('should return false if user missing one required role (requireAll=true)', () => {
			const userRoles = ['manager'];
			const requiredRoles = ['admin', 'manager'];

			expect(hasRole(userRoles, requiredRoles, true)).toBe(false);
		});

		it('should return true if no roles required', () => {
			const userRoles = ['employee'];
			const requiredRoles: string[] = [];

			expect(hasRole(userRoles, requiredRoles)).toBe(true);
		});

		it('should return false if user has no roles', () => {
			const userRoles: string[] = [];
			const requiredRoles = ['employee'];

			expect(hasRole(userRoles, requiredRoles)).toBe(false);
		});
	});

	describe('canEditDepartment', () => {
		const mockFetch = vi.fn();

		beforeEach(() => {
			vi.clearAllMocks();
			global.fetch = mockFetch;
		});

		it('should return true for admin user (any department)', async () => {
			const result = await canEditDepartment('admin-user-id', 'dept-123', 'admin');
			expect(result).toBe(true);
			expect(mockFetch).not.toHaveBeenCalled(); // Admin bypass, no query needed
		});

		it('should return true for manager of the department', async () => {
			mockFetch.mockResolvedValueOnce({
				json: async () => ({
					data: {
						departmentById: {
							id: 'dept-123',
							managerId: 'manager-user-id'
						}
					}
				})
			});

			const result = await canEditDepartment('manager-user-id', 'dept-123', 'manager');
			expect(result).toBe(true);
			expect(mockFetch).toHaveBeenCalledTimes(1);
		});

		it('should return false for manager of different department', async () => {
			mockFetch.mockResolvedValueOnce({
				json: async () => ({
					data: {
						departmentById: {
							id: 'dept-123',
							managerId: 'other-manager-id'
						}
					}
				})
			});

			const result = await canEditDepartment('manager-user-id', 'dept-123', 'manager');
			expect(result).toBe(false);
		});

		it('should return false for employee role', async () => {
			const result = await canEditDepartment('employee-user-id', 'dept-123', 'employee');
			expect(result).toBe(false);
			expect(mockFetch).not.toHaveBeenCalled(); // Employee bypass, no query needed
		});

		it('should return false on GraphQL error', async () => {
			mockFetch.mockRejectedValueOnce(new Error('Network error'));

			const result = await canEditDepartment('manager-user-id', 'dept-123', 'manager');
			expect(result).toBe(false);
		});
	});

	describe('canEditEmployee', () => {
		const mockFetch = vi.fn();

		beforeEach(() => {
			vi.clearAllMocks();
			global.fetch = mockFetch;
		});

		it('should return true for admin user (any employee)', async () => {
			const result = await canEditEmployee('admin-user-id', 'employee-123', 'admin');
			expect(result).toBe(true);
			expect(mockFetch).not.toHaveBeenCalled();
		});

		it('should return true for employee editing themselves', async () => {
			const result = await canEditEmployee('employee-123', 'employee-123', 'employee');
			expect(result).toBe(true);
			expect(mockFetch).not.toHaveBeenCalled();
		});

		it('should return false for employee editing someone else', async () => {
			const result = await canEditEmployee('employee-123', 'employee-456', 'employee');
			expect(result).toBe(false);
		});

		it('should return true for manager editing employee in their department', async () => {
			mockFetch.mockResolvedValueOnce({
				json: async () => ({
					data: {
						managerUser: {
							id: 'manager-user-id',
							departmentByDepartmentId: {
								id: 'dept-123',
								managerId: 'manager-user-id'
							}
						},
						targetUser: {
							id: 'employee-456',
							departmentId: 'dept-123'
						}
					}
				})
			});

			const result = await canEditEmployee('manager-user-id', 'employee-456', 'manager');
			expect(result).toBe(true);
		});

		it('should return false for manager editing employee in different department', async () => {
			mockFetch.mockResolvedValueOnce({
				json: async () => ({
					data: {
						managerUser: {
							id: 'manager-user-id',
							departmentByDepartmentId: {
								id: 'dept-123',
								managerId: 'manager-user-id'
							}
						},
						targetUser: {
							id: 'employee-456',
							departmentId: 'dept-456'
						}
					}
				})
			});

			const result = await canEditEmployee('manager-user-id', 'employee-456', 'manager');
			expect(result).toBe(false);
		});
	});

	describe('Role Precedence (T036)', () => {
		it('should return highest priority role from roles array', async () => {
			const { getRolePrecedence } = await import('$lib/server/rbac-utils');
			const result = getRolePrecedence(['employee', 'admin', 'manager']);
			expect(result).toBe('admin');
		});

		it('should return admin when both admin and manager roles present', async () => {
			const { getRolePrecedence } = await import('$lib/server/rbac-utils');
			const result = getRolePrecedence(['admin', 'manager']);
			expect(result).toBe('admin');
		});

		it('should return manager when only manager and employee roles present', async () => {
			const { getRolePrecedence } = await import('$lib/server/rbac-utils');
			const result = getRolePrecedence(['manager', 'employee']);
			expect(result).toBe('manager');
		});

		it('should return employee when only employee role present', async () => {
			const { getRolePrecedence } = await import('$lib/server/rbac-utils');
			const result = getRolePrecedence(['employee']);
			expect(result).toBe('employee');
		});

		it('should return guest for empty roles array', async () => {
			const { getRolePrecedence } = await import('$lib/server/rbac-utils');
			const result = getRolePrecedence([]);
			expect(result).toBe('guest');
		});
	});

	describe('isManagerOfDepartment (T036)', () => {
		const mockFetch = vi.fn();

		beforeEach(() => {
			vi.clearAllMocks();
			global.fetch = mockFetch;
		});

		it('should return true when user is manager of department', async () => {
			const { isManagerOfDepartment } = await import('$lib/server/rbac-utils');

			mockFetch.mockResolvedValueOnce({
				json: async () => ({
					data: {
						departmentById: {
							id: 'dept-123',
							managerId: 'manager-user-id'
						}
					}
				})
			});

			const result = await isManagerOfDepartment('manager-user-id', 'dept-123');
			expect(result).toBe(true);
		});

		it('should return false when user is not manager of department', async () => {
			const { isManagerOfDepartment } = await import('$lib/server/rbac-utils');

			mockFetch.mockResolvedValueOnce({
				json: async () => ({
					data: {
						departmentById: {
							id: 'dept-123',
							managerId: 'other-manager-id'
						}
					}
				})
			});

			const result = await isManagerOfDepartment('manager-user-id', 'dept-123');
			expect(result).toBe(false);
		});

		it('should return false on GraphQL error', async () => {
			const { isManagerOfDepartment } = await import('$lib/server/rbac-utils');

			mockFetch.mockRejectedValueOnce(new Error('Network error'));

			const result = await isManagerOfDepartment('manager-user-id', 'dept-123');
			expect(result).toBe(false);
		});
	});
});
