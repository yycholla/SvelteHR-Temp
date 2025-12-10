// Server-side data loading for employee detail page
// Follows RBAC patterns with server-side API calls only

import type { PageServerLoad } from './$types';
import { error } from '@sveltejs/kit';
import { requireAuth, getUserPermissions } from '$lib/server/rbac-utils';

export const load: PageServerLoad = async (event) => {
	const { params } = event;
	const employeeId = params.id;

	// RBAC: Check employee write permissions (details view requires write access)
	requireAuth(event, {
		requiredPermissions: [
			'employees:write',
			'employees:write:self',
			'employees:write:team',
			'employees:write:all'
		]
	});

	// After permission check, re-destructure locals with guaranteed user
	const { locals } = event;

	// Create simple user session object (session-based auth doesn't use JWT)
	const userSession = {
		userId: locals.user.id,
		roles: locals.roles ?? [],
		permissions: locals.permissions ?? [],
		isAuthenticated: true,
		expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
		metadata: {
			userEmail: locals.user.email,
			displayName: locals.user.display_name ?? locals.user.email
		},
		toJSON: () => ({
			userId: locals.user.id,
			roles: locals.roles ?? [],
			permissions: locals.permissions ?? [],
			isAuthenticated: true,
			expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
			metadata: {
				userEmail: locals.user.email,
				displayName: locals.user.display_name ?? locals.user.email
			}
		})
	};

	try {
		// Make direct GraphQL calls to Rust GraphQL backend
		const { getGraphQLEndpoint } = await import('$lib/server/api-url');
		const graphqlEndpoint = getGraphQLEndpoint();

		// Headers for session-based authentication
		// Forward session cookies to Rust GraphQL backend
		const cookieHeader = event.request.headers.get('cookie') ?? '';
		const headers: Record<string, string> = {
			'Content-Type': 'application/json',
			Cookie: cookieHeader
		};

		console.log(
			'[Employee Detail] Using Rust GraphQL backend with session-based auth, user roles:',
			locals.roles
		);

		// Determine if user can view detailed employee information
		// Note: Role names from RBAC: "Admin", "HR Manager", "Manager", "Employee"
		const userRoles = locals.roles ?? [];
		const isAdmin = userRoles.includes('Admin') || userRoles.includes('HR Manager');
		const isViewingSelf = locals.user.id === employeeId;

		// Load employee data with all related information
		// NOTE: Using Rust GraphQL schema (filter pattern, direct arrays)
		const employeeResponse = await fetch(graphqlEndpoint, {
			method: 'POST',
			headers,
			body: JSON.stringify({
				query: `
					query GetEmployeeById($id: UUID!) {
						user(id: $id) {
							id
							firstName
							lastName
							displayName
							fullName
							email
							roles {
								id
								name
							}
							phone
							alternatePhone
							jobTitle
							status
							hireDate
							isActive
							departmentId
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
				variables: {
					id: employeeId
				}
			})
		});

		const employeeData = await employeeResponse.json();

		// Check if employee exists
		const employee = employeeData?.data?.user;
		if (!employee) {
			error(404, 'Employee not found');
		}

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
		const emergencyContacts = emergencyContactsData?.data?.emergencyContacts ?? [];

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
		const vehicles = vehiclesData?.data?.employeeVehicles ?? [];

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
		const leaveRequests = leaveRequestsData?.data?.leaveRequests ?? [];

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
		const performanceReviews = reviewsData?.data?.performanceReviews ?? [];

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
		const leaveBalances = balancesData?.data?.leaveBalances ?? [];

		// Check if user is the employee's manager
		const isEmployeeManager = employee.department?.managerId === locals.user.id;

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
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		let assignedDocuments: any[] = [];
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		let availableDocuments: any[] = [];

		// Only load documents if user has permission to view them
		if (canViewDocuments) {
			try {
				assignedDocuments = await transaction(async (client) => {
					await setJWTClaims(client, locals.user.id, locals.user.role ?? 'employee');

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
				console.log(
					`[Employee Detail] Loaded ${assignedDocuments.length} assigned documents for employee ${employeeId}`
				);
			} catch (err) {
				console.error('Failed to fetch employee documents:', err);
				assignedDocuments = [];
			}

			// Fetch available documents (not assigned to this employee) for admins
			if (isAdmin) {
				console.log(
					`[Employee Detail] Fetching available documents for admin, employee: ${employeeId}`
				);
				try {
					availableDocuments = await transaction(async (client) => {
						await setJWTClaims(client, locals.user.id, locals.user.role ?? 'employee');

						// First, get total count of documents
						const countResult = await client.query(
							`SELECT COUNT(*) as total FROM hr_public.documents WHERE deleted_at IS NULL`
						);
						console.log(
							`[Employee Detail] Total documents in system: ${countResult.rows[0].total}`
						);

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

						console.log(
							`[Employee Detail] Available documents (not assigned to ${employeeId}): ${result.rows.length}`
						);
						return result.rows;
					});
				} catch (err) {
					console.error('Failed to fetch available documents:', err);
					availableDocuments = [];
				}
			} else {
				console.log(
					`[Employee Detail] User is not admin, skipping available documents for assignment (assigned documents still loaded)`
				);
			}
		} else {
			console.log(
				`[Employee Detail] User does not have permission to view documents for employee ${employeeId}`
			);
		}

		// Return server-side loaded data
		return {
			userSession: userSession.toJSON(),
			employee: {
				id: employee.id,
				firstName: employee.firstName,
				lastName: employee.lastName,
				displayName: employee.displayName,
				fullName: employee.fullName,
				email: employee.email,
				role: employee.roles && employee.roles.length > 0 ? employee.roles[0].name : 'Employee',
				roles: employee.roles ?? [],
				jobTitle: employee.jobTitle,
				status: employee.status,
				hireDate: employee.hireDate,
				isActive: employee.isActive,
				departmentId: employee.departmentId,
				// Contact information - only if authorized
				phoneNumber: canViewContactInfo ? employee.phone : null,
				mobileNumber: canViewContactInfo ? employee.alternatePhone : null,
				addressLine1: canViewContactInfo ? employee.primaryAddress?.addressLine1 : null,
				addressLine2: canViewContactInfo ? employee.primaryAddress?.addressLine2 : null,
				city: canViewContactInfo ? employee.primaryAddress?.city : null,
				stateProvince: canViewContactInfo ? employee.primaryAddress?.stateProvince : null,
				postalCode: canViewContactInfo ? employee.primaryAddress?.postalCode : null,
				country: canViewContactInfo ? employee.primaryAddress?.country : null,
				createdAt: employee.createdAt,
				updatedAt: employee.updatedAt,
				lastLogin: null, // Not in current GraphQL schema
				department: employee.department,
				// Emergency contacts - only if authorized
				emergencyContacts: canViewEmergencyContacts ? emergencyContacts : [],
				// Vehicles - only if authorized
				vehicles: canViewVehicles ? vehicles : [],
				leaveRequests,
				leaveRequestCount: leaveRequests.length,
				// eslint-disable-next-line @typescript-eslint/no-explicit-any
				performanceReviews: performanceReviews.map((review: any) => ({
					id: review.id,
					reviewPeriod: review.reviewPeriod,
					overallRating: review.overallRating,
					status: review.status,
					createdAt: review.createdAt,
					reviewer: review.reviewer
				})),
				performanceReviewCount: performanceReviews.length,
				// eslint-disable-next-line @typescript-eslint/no-explicit-any
				leaveBalances: leaveBalances.map((balance: any) => ({
					id: balance.id,
					year: balance.year,
					totalDays: balance.totalDays,
					usedDays: balance.usedDays,
					remainingDays: balance.remainingDays,
					leaveTypeName: balance.leaveType?.name ?? 'Unknown Leave Type',
					leaveTypeDefaultDays: balance.leaveType?.defaultDays ?? balance.totalDays
				})),
				// Assigned documents
				// eslint-disable-next-line @typescript-eslint/no-explicit-any
				assignedDocuments: assignedDocuments.map((doc: any) => ({
					id: doc.id,
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
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			availableDocuments: availableDocuments.map((doc: any) => ({
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
		console.error('[Employee Detail Load Error]', err);

		// If it's already a SvelteKit error, rethrow it
		if (err && typeof err === 'object' && 'status' in err) {
			throw err;
		}

		// Throw SvelteKit error with user-friendly message
		error(500, 'Unable to load employee details');
	}
};
