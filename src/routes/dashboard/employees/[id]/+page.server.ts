// Server-side data loading for employee detail page
// Follows RBAC patterns with server-side API calls only
// Migrated to use EmployeeService for core employee data

import type { Actions, PageServerLoad } from './$types';
import { error, fail, redirect } from '@sveltejs/kit';
import { logger } from '$lib/utils/logger';
import { getUserPermissions, requireAuth, AccessTier } from '$lib/server/rbac-utils';
import { createEmployeeService } from '$lib/server/services';

// Type definitions for GraphQL responses
interface GraphQLEmergencyContact {
	id: string;
	name: string;
	relationship: string;
	phoneNumber: string;
	email?: string;
	isPrimary: boolean;
	createdAt: string;
	updatedAt: string;
}

interface GraphQLVehicle {
	id: string;
	make: string;
	model: string;
	year: number;
	color?: string;
	licensePlate: string;
	createdAt: string;
	updatedAt: string;
}

interface GraphQLLeaveType {
	id: string;
	name: string;
	color?: string;
	defaultDays?: number;
}

interface GraphQLLeaveRequest {
	id: string;
	leaveType: GraphQLLeaveType;
	startDate: string;
	endDate: string;
	status: string;
	reason?: string;
	createdAt: string;
}

interface GraphQLReviewer {
	id: string;
	displayName: string;
}

interface GraphQLPerformanceReview {
	id: string;
	reviewPeriod?: string;
	overallRating: number;
	status: string;
	createdAt: string;
	reviewer?: GraphQLReviewer;
}

interface GraphQLLeaveBalance {
	id: string;
	year: number;
	totalDays: number;
	usedDays: number;
	remainingDays: number;
	leaveTypeId: string;
	leaveType?: GraphQLLeaveType;
}

interface GraphQLActivityLog {
	id: string;
	action: string;
	resourceType: string;
	details?: string;
	createdAt: string;
}

// Type definitions for database documents
interface AssignedDocument {
	id: string;
	assignment_id: string;
	filename: string;
	file_type: string;
	file_size_bytes: number;
	category?: string;
	sensitivity_level?: string;
	uploaded_at: string;
	uploaded_by?: string;
	uploaded_by_email?: string;
	assigned_at: string;
	assignment_reason?: string;
}

interface AvailableDocument {
	id: string;
	filename: string;
	file_type: string;
	file_size_bytes: number;
	category?: string;
	sensitivity_level?: string;
	uploaded_at: string;
	uploaded_by?: string;
	uploaded_by_email?: string;
}

export const load: PageServerLoad = async (event) => {
	const { params, cookies } = event;
	const employeeId = params.id;

	// RBAC: Check employee write permissions (details view requires write access)
	requireAuth(event, { minTier: AccessTier.SELF });

	// After permission check, re-destructure locals with guaranteed user
	const { locals } = event;

	// Create simple user session object (session-based auth doesn't use JWT)
	const userSession = {
		userId: locals.user.id,
		roles: locals.roles || [],
		permissions: locals.permissions || [],
		isAuthenticated: true,
		expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
		metadata: {
			userEmail: locals.user.email,
			displayName: locals.user.display_name || locals.user.email
		},
		toJSON: () => ({
			userId: locals.user.id,
			roles: locals.roles || [],
			permissions: locals.permissions || [],
			isAuthenticated: true,
			expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
			metadata: {
				userEmail: locals.user.email,
				displayName: locals.user.display_name || locals.user.email
			}
		})
	};

	try {
		// Create EmployeeService with authentication context
		const employeeService = createEmployeeService(event);

		// Load core employee data using service layer
		const employeeResult = await employeeService.getEmployeeById(employeeId);

		// Handle employee not found
		if (employeeResult.isError) {
			if (employeeResult.error.code === 'EMPLOYEE_NOT_FOUND') {
				logger.warn('[Employee Detail] Employee not found', { employeeId });
				error(404, 'Employee not found');
			}
			logger.error(
				'[Employee Detail] Failed to load employee',
				new Error(employeeResult.error.message),
				{
					employeeId,
					errorCode: employeeResult.error.code
				}
			);
			error(500, 'Failed to load employee details');
		}

		const employeeEntity = employeeResult.value;

		logger.info('[Employee Detail] Loaded employee via EmployeeService', {
			employeeId: employeeEntity.id,
			userRoles: locals.roles
		});

		// Determine if user can view detailed employee information
		// Note: Role names from RBAC: "Admin", "HR Manager", "Manager", "Employee"
		const userRoles = (locals.roles || []).map((r: string) => r.toLowerCase().replace(/[\s-]+/g,'_'));
		const isAdmin = userRoles.includes('admin') || userRoles.includes('hr_manager') || userRoles.includes('super_admin');
		const isViewingSelf = locals.user.id === employeeId;

		// Headers for GraphQL requests to fetch related entities
		// Forward session cookies to Rust GraphQL backend
		const { getGraphQLEndpoint } = await import('$lib/server/api-url');
		const graphqlEndpoint = getGraphQLEndpoint();
		const cookieHeader = event.request.headers.get('cookie') || '';
		const headers: Record<string, string> = {
			'Content-Type': 'application/json',
			Cookie: cookieHeader
		};

		// Fetch additional GraphQL data for department and address (not yet in domain model)
		// TODO: Move this to service layer when Department and Address domains are implemented
		const additionalDataResponse = await fetch(graphqlEndpoint, {
			method: 'POST',
			headers,
			body: JSON.stringify({
				query: `
					query GetEmployeeAdditionalData($id: UUID!) {
						user(id: $id) {
							roles {
								id
								name
							}
							alternatePhone
							createdAt
							updatedAt
							department {
								id
								name
								description
							}
							primaryAddress {
								id
								addressLine1
								addressLine2
								city
								stateProvince
								postalCode
								country
							}
						}
					}
				`,
				variables: { id: employeeId }
			})
		});

		const additionalData = await additionalDataResponse.json();
		const additionalEmployeeData = additionalData?.data?.user;

		// Load additional related data separately
		// Emergency contacts - migrated to Rust GraphQL backend
		const emergencyContactsResponse = await fetch(graphqlEndpoint, {
			method: 'POST',
			headers,
			body: JSON.stringify({
				query: `
					query GetEmergencyContacts($employeeId: UUID!, $limit: Int!) {
						emergencyContacts(employeeId: $employeeId, limit: $limit) {
							id
							name
							relationship
							phoneNumber
							email
							isPrimary
							createdAt
							updatedAt
						}
					}
				`,
				variables: { employeeId, limit: 50 }
			})
		});
		const emergencyContactsData = await emergencyContactsResponse.json();
		const emergencyContacts = emergencyContactsData?.data?.emergencyContacts || [];

		// Employee vehicles - migrated to Rust GraphQL backend
		const vehiclesResponse = await fetch(graphqlEndpoint, {
			method: 'POST',
			headers,
			body: JSON.stringify({
				query: `
					query GetEmployeeVehicles($employeeId: UUID!, $limit: Int!) {
						employeeVehicles(employeeId: $employeeId, limit: $limit) {
							id
							make
							model
							year
							color
							licensePlate
							createdAt
							updatedAt
						}
					}
				`,
				variables: { employeeId, limit: 50 }
			})
		});
		const vehiclesData = await vehiclesResponse.json();
		const vehicles = vehiclesData?.data?.employeeVehicles || [];

		// Leave requests - migrated to Rust GraphQL backend
		const leaveRequestsResponse = await fetch(graphqlEndpoint, {
			method: 'POST',
			headers,
			body: JSON.stringify({
				query: `
					query GetLeaveRequests($employeeId: UUID!, $limit: Int!) {
						leaveRequests(employeeId: $employeeId, limit: $limit) {
							id
							leaveType {
								id
								name
								color
							}
							startDate
							endDate
							status
							reason
							createdAt
						}
					}
				`,
				variables: { employeeId, limit: 50 }
			})
		});
		const leaveRequestsData = await leaveRequestsResponse.json();
		const leaveRequests = leaveRequestsData?.data?.leaveRequests || [];

		// Performance reviews - migrated to Rust GraphQL backend
		const reviewsResponse = await fetch(graphqlEndpoint, {
			method: 'POST',
			headers,
			body: JSON.stringify({
				query: `
					query GetPerformanceReviews($employeeId: UUID!, $limit: Int!) {
						performanceReviews(employeeId: $employeeId, limit: $limit) {
							id
							overallRating
							status
							createdAt
							reviewer {
								id
								displayName
							}
						}
					}
				`,
				variables: { employeeId, limit: 50 }
			})
		});
		const reviewsData = await reviewsResponse.json();
		const performanceReviews = reviewsData?.data?.performanceReviews || [];

		// Leave balances - migrated to Rust GraphQL backend
		const balancesResponse = await fetch(graphqlEndpoint, {
			method: 'POST',
			headers,
			body: JSON.stringify({
				query: `
					query GetLeaveBalances($employeeId: UUID!, $limit: Int!) {
						leaveBalances(employeeId: $employeeId, limit: $limit) {
							id
							year
							totalDays
							usedDays
							remainingDays
							leaveTypeId
							leaveType {
								id
								name
								defaultDays
							}
						}
					}
				`,
				variables: { employeeId, limit: 50 }
			})
		});
		const balancesData = await balancesResponse.json();
		const leaveBalances = balancesData?.data?.leaveBalances || [];

		// Activity Logs - Recent activity by this employee
		const activityLogsResponse = await fetch(graphqlEndpoint, {
			method: 'POST',
			headers,
			body: JSON.stringify({
				query: `
					query GetEmployeeActivityLogs($userId: UUID!, $limit: Int!) {
						activityLogs(userId: $userId, limit: $limit) {
							id
							action
							resourceType
							details
							createdAt
						}
					}
				`,
				variables: { userId: employeeId, limit: 10 }
			})
		});
		const activityLogsData = await activityLogsResponse.json();
		const activityLogs = activityLogsData?.data?.activityLogs || [];

		// Check if user is the employee's manager
		const isEmployeeManager = additionalEmployeeData?.department?.managerId === locals.user.id;

		// Determine access permissions
		const canViewContactInfo = isViewingSelf || isEmployeeManager || isAdmin;
		const canViewEmergencyContacts = isViewingSelf || isEmployeeManager || isAdmin;
		const canViewVehicles = isViewingSelf || isEmployeeManager || isAdmin;
		const canViewCompensation = isAdmin; // Only admins and HR managers can view compensation

		// Documents (licenses, contracts, employment docs) - management and above only
		const canViewDocuments = isAdmin || isEmployeeManager;

		// RBAC: Check if user can create reviews for this employee
		// Admins and HR managers can create reviews for anyone
		// Managers can create reviews for their direct reports
		const canCreateReviews = isAdmin || isEmployeeManager;

		// Get standardized user permissions
		const userPermissions = getUserPermissions(locals);

		// Fetch documents assigned to this employee (only if authorized)
		const { transaction, setJWTClaims } = await import('$lib/server/db');
		let assignedDocuments: AssignedDocument[] = [];
		let availableDocuments: AvailableDocument[] = [];

		// Only load documents if user has permission to view them
		if (canViewDocuments) {
			try {
				assignedDocuments = await transaction(async (client) => {
					await setJWTClaims(client, locals.user.id, locals.user.role || 'employee');

					const result = await client.query(
						`SELECT
						d.id,
						da.id as assignment_id,
						d.title as filename,
						d.mime_type as file_type,
						d.file_size as file_size_bytes,
						dc.name as category,
						d.access_level as sensitivity_level,
						d.created_at as uploaded_at,
						d.uploaded_by,
						u.email as uploaded_by_email,
						da.created_at as assigned_at,
						NULL as assignment_reason
					 FROM hr_public.documents d
					 INNER JOIN hr_public.document_assignments da ON d.id = da.document_id
					 LEFT JOIN hr_public.users u ON d.uploaded_by = u.id
					 LEFT JOIN hr_public.document_categories dc ON d.category_id = dc.id
					 WHERE da.user_id = $1 AND d.deleted_at IS NULL
					 ORDER BY da.created_at DESC`,
						[employeeId]
					);

					return result.rows;
				});
				logger.info('[Employee Detail] Loaded assigned documents for employee', {
					count: assignedDocuments.length,
					employeeId
				});
			} catch (err) {
				logger.error('Failed to fetch employee documents:', err as Error);
				assignedDocuments = [];
			}

			// Fetch available documents (not assigned to this employee) for admins
			if (isAdmin) {
				logger.info('[Employee Detail] Fetching available documents for admin', {
					employeeId
				});
				try {
					availableDocuments = await transaction(async (client) => {
						await setJWTClaims(client, locals.user.id, locals.user.role || 'employee');

						// First, get total count of documents
						const countResult = await client.query(
							`SELECT COUNT(*) as total FROM hr_public.documents WHERE deleted_at IS NULL`
						);
						logger.info('[Employee Detail] Total documents in system', {
							total: countResult.rows[0].total
						});

						// Then get documents not assigned to this employee
						const result = await client.query(
							`SELECT
							d.id,
							d.title as filename,
							d.mime_type as file_type,
							d.file_size as file_size_bytes,
							dc.name as category,
							d.access_level as sensitivity_level,
							d.created_at as uploaded_at,
							d.uploaded_by,
							u.email as uploaded_by_email
						 FROM hr_public.documents d
						 LEFT JOIN hr_public.users u ON d.uploaded_by = u.id
						 LEFT JOIN hr_public.document_categories dc ON d.category_id = dc.id
						 WHERE d.deleted_at IS NULL
						   AND NOT EXISTS (
						       SELECT 1 FROM hr_public.document_assignments da
						       WHERE da.document_id = d.id AND da.user_id = $1
						   )
						 ORDER BY d.created_at DESC`,
							[employeeId]
						);

						logger.info('[Employee Detail] Available documents not assigned to employee', {
							employeeId,
							count: result.rows.length
						});
						return result.rows;
					});
				} catch (err) {
					logger.error('Failed to fetch available documents:', err as Error);
					availableDocuments = [];
				}
			} else {
				logger.info(
					'[Employee Detail] User is not admin, skipping available documents for assignment',
					{
						note: 'assigned documents still loaded'
					}
				);
			}
		} else {
			logger.info(
				'[Employee Detail] User does not have permission to view documents for employee',
				{
					employeeId
				}
			);
		}

		// Return server-side loaded data
		return {
			userSession: userSession.toJSON(),
			employee: {
				// Core employee data from domain entity
				id: employeeEntity.id,
				firstName: employeeEntity.name.first,
				lastName: employeeEntity.name.last,
				displayName: employeeEntity.displayName,
				fullName: employeeEntity.fullName,
				email: employeeEntity.email.value,
				jobTitle: employeeEntity.jobTitle,
				status: employeeEntity.status,
				hireDate: employeeEntity.hireDate.value.toISOString(),
				isActive: employeeEntity.isActive,
				departmentId: employeeEntity.departmentId,
				// Additional data from GraphQL (not yet in domain model)
				role:
					additionalEmployeeData?.roles && additionalEmployeeData.roles.length > 0
						? additionalEmployeeData.roles[0].name
						: 'Employee',
				roles: additionalEmployeeData?.roles || [],
				createdAt: additionalEmployeeData?.createdAt,
				updatedAt: additionalEmployeeData?.updatedAt,
				lastLogin: null, // Not in current GraphQL schema
				department: additionalEmployeeData?.department,
				// Contact information - only if authorized
				phoneNumber: canViewContactInfo ? employeeEntity.phone : null,
				mobileNumber: canViewContactInfo ? additionalEmployeeData?.alternatePhone : null,
				addressLine1: canViewContactInfo
					? additionalEmployeeData?.primaryAddress?.addressLine1
					: null,
				addressLine2: canViewContactInfo
					? additionalEmployeeData?.primaryAddress?.addressLine2
					: null,
				city: canViewContactInfo ? additionalEmployeeData?.primaryAddress?.city : null,
				stateProvince: canViewContactInfo
					? additionalEmployeeData?.primaryAddress?.stateProvince
					: null,
				postalCode: canViewContactInfo ? additionalEmployeeData?.primaryAddress?.postalCode : null,
				country: canViewContactInfo ? additionalEmployeeData?.primaryAddress?.country : null,
				// Emergency contacts - only if authorized
				emergencyContacts: canViewEmergencyContacts ? emergencyContacts : [],
				// Vehicles - only if authorized
				vehicles: canViewVehicles ? vehicles : [],
				// Activity Logs
				activityLogs,
				leaveRequests,
				leaveRequestCount: leaveRequests.length,
				performanceReviews: performanceReviews.map((review: GraphQLPerformanceReview) => ({
					id: review.id,
					reviewPeriod: review.reviewPeriod,
					overallRating: review.overallRating,
					status: review.status,
					createdAt: review.createdAt,
					reviewer: review.reviewer
				})),
				performanceReviewCount: performanceReviews.length,
				leaveBalances: leaveBalances.map((balance: GraphQLLeaveBalance) => ({
					id: balance.id,
					year: balance.year,
					totalDays: balance.totalDays,
					usedDays: balance.usedDays,
					remainingDays: balance.remainingDays,
					leaveTypeName: balance.leaveType?.name || 'Unknown Leave Type',
					leaveTypeDefaultDays: balance.leaveType?.defaultDays || balance.totalDays
				})),
				// Assigned documents
				assignedDocuments: assignedDocuments.map((doc: AssignedDocument) => ({
					id: doc.id,
					assignmentId: doc.assignment_id,
					filename: doc.filename,
					fileType: doc.file_type,
					fileSizeBytes: doc.file_size_bytes,
					category: doc.category,
					sensitivityLevel: doc.sensitivity_level,
					uploadedAt: doc.uploaded_at,
					uploadedByEmail: doc.uploaded_by_email,
					assignedAt: doc.assigned_at,
					assignmentReason: doc.assignment_reason
				})),
				documentsCount: assignedDocuments.length
			},
			// Available documents for assignment (admins only)
			availableDocuments: availableDocuments.map((doc: AvailableDocument) => ({
				id: doc.id,
				filename: doc.filename,
				fileType: doc.file_type,
				fileSizeBytes: doc.file_size_bytes,
				category: doc.category,
				sensitivityLevel: doc.sensitivity_level,
				uploadedAt: doc.uploaded_at,
				uploadedByEmail: doc.uploaded_by_email
			})),
			// RBAC: Permission flags for UI
			permissions: {
				canViewContactInfo,
				canViewEmergencyContacts,
				canViewVehicles,
				canViewCompensation,
				canCreateReviews,
				canAssignDocuments: isAdmin,
				isEmployeeManager,
				isViewingSelf,
				// Spread userPermissions last to include all RBAC permissions (includes canViewDocuments)
				...userPermissions,
				// Override canViewDocuments with employee-specific logic (management and above only)
				canViewDocuments
			},
			loadedAt: new Date().toISOString()
		};
	} catch (err) {
		logger.error('[Employee Detail Load Error]', err as Error);

		// If it's already a SvelteKit error, rethrow it
		if (err && typeof err === 'object' && 'status' in err) {
			throw err;
		}

		// Throw SvelteKit error with user-friendly message
		error(500, 'Unable to load employee details');
	}
};

export const actions: Actions = {
	delete: async (event) => {
		const { params, locals } = event;
		const employeeId = params.id;

		// Permission check - require authentication
		if (!locals.user) {
			error(401, 'Unauthorized');
		}

		// Permission check - require Admin or HR Manager role
		const userRoles = (locals.roles || []).map((r: string) => r.toLowerCase().replace(/[\s-]+/g,'_'));
		const canDelete = userRoles.includes('admin') || userRoles.includes('hr_manager') || userRoles.includes('super_admin');
		if (!canDelete) {
			error(403, 'You do not have permission to delete employees');
		}

		// Prevent self-deletion
		if (locals.user.id === employeeId) {
			return fail(400, { error: 'You cannot delete your own account' });
		}

		const employeeService = createEmployeeService(event);
		const result = await employeeService.deleteEmployee(employeeId);

		if (result.isError) {
			if (result.error.code === 'EMPLOYEE_NOT_FOUND') {
				error(404, 'Employee not found');
			}
			logger.error('[Employee Delete] Failed to delete employee', result.error, {
				employeeId,
				errorCode: result.error.code
			});
			return fail(500, { error: result.error.message });
		}

		logger.info('[Employee Delete] Employee deleted successfully', {
			employeeId,
			deletedBy: locals.user.id
		});

		// Redirect to employee list with success message
		redirect(303, '/dashboard/employees?deleted=true');
	}
};
