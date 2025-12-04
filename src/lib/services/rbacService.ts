// RBAC (Role-Based Access Control) service (Feature 024)
// 4-tier hierarchy: Admin (100), HR (80), Manager (60), Employee (20)
// Enforces direct report hierarchy for managers

export type Role = 'super_admin' | 'admin' | 'manager' | 'employee';

export interface RBACContext {
	userId: string;
	role: Role;
	departmentId?: string;
	managerId?: string;
}

// Check if user can access a specific document
export async function canAccessDocument(userId: string, documentId: string): Promise<boolean> {
	try {
		const response = await fetch(`/api/rbac/can-access-document`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json'
			},
			body: JSON.stringify({ userId, documentId })
		});

		if (!response.ok) {
			return false;
		}

		const result = await response.json();
		return result.canAccess;
	} catch (error) {
		console.error('RBAC check failed:', error);
		return false;
	}
}

// Check if user can upload documents in a specific category
export async function canUploadDocument(userId: string, category: string): Promise<boolean> {
	try {
		const response = await fetch(`/api/rbac/can-upload`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json'
			},
			body: JSON.stringify({ userId, category })
		});

		if (!response.ok) {
			return false;
		}

		const result = await response.json();
		return result.canUpload;
	} catch (error) {
		console.error('RBAC upload check failed:', error);
		return false;
	}
}

// Get all direct reports for a manager (recursive)
export async function getDirectReports(managerId: string): Promise<string[]> {
	try {
		const response = await fetch(`/api/rbac/direct-reports/${managerId}`, {
			method: 'GET'
		});

		if (!response.ok) {
			throw new Error('Failed to retrieve direct reports');
		}

		const result = await response.json();
		return result.directReports;
	} catch (error) {
		console.error('Failed to get direct reports:', error);
		return [];
	}
}

// Client-side RBAC role level check
export function getRoleLevel(role: Role): number {
	const roleLevels: Record<Role, number> = {
		super_admin: 100,
		admin: 80,
		manager: 60,
		employee: 20
	};

	return roleLevels[role] || 0;
}

// Check if user role has sufficient privileges
export function hasMinimumRole(userRole: Role, requiredRole: Role): boolean {
	return getRoleLevel(userRole) >= getRoleLevel(requiredRole);
}

// Check if user can assign documents
export function canAssignDocuments(role: Role): boolean {
	return hasMinimumRole(role, 'admin');
}

// Check if user can delete documents
export function canDeleteDocuments(role: Role): boolean {
	return hasMinimumRole(role, 'admin');
}

// Check if user can view audit logs
export function canViewAuditLogs(role: Role): boolean {
	return hasMinimumRole(role, 'admin');
}

// Check if user can manage encryption keys
export function canManageKeys(role: Role): boolean {
	// All authenticated users can manage their own keys
	return true;
}

// Check if user can view all documents
export function canViewAllDocuments(role: Role): boolean {
	return hasMinimumRole(role, 'admin');
}

// Check if user can restore deleted documents
export function canRestoreDocuments(role: Role): boolean {
	return hasMinimumRole(role, 'super_admin');
}

// Check document category restrictions
export async function canAccessCategory(userId: string, category: string): Promise<boolean> {
	try {
		const response = await fetch(`/api/rbac/can-access-category`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json'
			},
			body: JSON.stringify({ userId, category })
		});

		if (!response.ok) {
			return false;
		}

		const result = await response.json();
		return result.canAccess;
	} catch (error) {
		console.error('Category access check failed:', error);
		return false;
	}
}

// Get user permissions summary
export async function getUserPermissions(userId: string): Promise<{
	canUpload: boolean;
	canAssign: boolean;
	canDelete: boolean;
	canViewAuditLogs: boolean;
	canViewAllDocuments: boolean;
	canRestoreDeleted: boolean;
	role: Role;
	roleLevel: number;
}> {
	try {
		const response = await fetch(`/api/rbac/permissions/${userId}`, {
			method: 'GET'
		});

		if (!response.ok) {
			throw new Error('Failed to retrieve user permissions');
		}

		return await response.json();
	} catch (error) {
		console.error('Failed to get user permissions:', error);
		return {
			canUpload: false,
			canAssign: false,
			canDelete: false,
			canViewAuditLogs: false,
			canViewAllDocuments: false,
			canRestoreDeleted: false,
			role: 'employee',
			roleLevel: 20
		};
	}
}

// Check if user is in the management chain for an employee
export async function isInManagementChain(managerId: string, employeeId: string): Promise<boolean> {
	const directReports = await getDirectReports(managerId);
	return directReports.includes(employeeId);
}

// Get accessible employees for a user (based on role and hierarchy)
export async function getAccessibleEmployees(userId: string): Promise<string[]> {
	try {
		const response = await fetch(`/api/rbac/accessible-employees/${userId}`, {
			method: 'GET'
		});

		if (!response.ok) {
			throw new Error('Failed to retrieve accessible employees');
		}

		const result = await response.json();
		return result.employeeIds;
	} catch (error) {
		console.error('Failed to get accessible employees:', error);
		return [];
	}
}

// Validate assignment permissions
export async function canAssignToEmployee(
	assignerId: string,
	targetEmployeeId: string
): Promise<boolean> {
	try {
		const response = await fetch(`/api/rbac/can-assign-to`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json'
			},
			body: JSON.stringify({ assignerId, targetEmployeeId })
		});

		if (!response.ok) {
			return false;
		}

		const result = await response.json();
		return result.canAssign;
	} catch (error) {
		console.error('Assignment permission check failed:', error);
		return false;
	}
}

// Server-side RBAC helpers (for use in +page.server.ts and API routes)
export function requireRole(userRole: Role | undefined, requiredRole: Role): void {
	if (!userRole || !hasMinimumRole(userRole, requiredRole)) {
		throw new Error(`Insufficient permissions. Required role: ${requiredRole}`);
	}
}

export function requireAuthentication(user: any): void {
	if (!user) {
		throw new Error('Authentication required');
	}
}
