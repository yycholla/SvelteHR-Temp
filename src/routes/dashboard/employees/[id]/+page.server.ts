// Server-side data loading for employee detail page
// Follows RBAC patterns with server-side API calls only

import type { PageServerLoad } from './$types';
import { error } from '@sveltejs/kit';
import { PermissionChecks, getUserPermissions } from '$lib/server/rbac-utils';

export const load: PageServerLoad = async (event) => {
	const { params, locals, cookies } = event;
	const employeeId = params.id;

	// RBAC: Check employee read permissions
	PermissionChecks.employeeRead(event);

	// Ensure user is authenticated
	if (!locals.user) {
		throw error(401, 'Authentication required');
	}

	// Create simple user session object (session-based auth doesn't use JWT)
	const userSession = {
		userId: locals.user.id,
		roles: [locals.user.role || 'employee'],
		permissions: locals.permissions || [],
		isAuthenticated: true,
		expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
		metadata: {
			userEmail: locals.user.email,
			displayName: locals.user.display_name || locals.user.email
		},
		toJSON: () => ({
			userId: locals.user.id,
			roles: [locals.user.role || 'employee'],
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
		// Make direct GraphQL calls to PostGraphile backend
		const { getGraphQLEndpoint } = await import('$lib/server/api-url');
		const graphqlEndpoint = getGraphQLEndpoint();

		// Headers for session-based authentication
		// Forward session cookies to PostGraphile backend
		const cookieHeader = event.request.headers.get('cookie') || '';
		const headers: Record<string, string> = {
			'Content-Type': 'application/json',
			'Cookie': cookieHeader
		};

		console.log(
			'[Employee Detail] Using PostGraphile with session-based auth, user role:',
			locals.user?.role
		);

		// Determine if user can view detailed employee information
		const userRole = locals.user.role?.toLowerCase().replace('-', '_') || 'employee';
		const isAdmin = ['super_admin', 'admin', 'hr_manager'].includes(userRole);
		const isViewingSelf = locals.user.id === employeeId;

		// Load employee data with all related information
		// NOTE: Using Rust GraphQL schema (filter pattern, direct arrays)
		const employeeResponse = await fetch(graphqlEndpoint, {
			method: 'POST',
			headers,
			body: JSON.stringify({
				query: `
					query GetEmployeeById($id: UUID!) {
						users(limit: 1, filter: { id: { equalTo: $id } }) {
							id
							displayName
							email
							role
							hireDate
							isActive
							departmentId
							phoneNumber
							mobileNumber
							addressLine1
							addressLine2
							city
							stateProvince
							postalCode
							country
							createdAt
							updatedAt
							lastLogin
							department {
								id
								name
								description
								managerId
								manager {
									id
									displayName
									role
								}
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
		const users = employeeData?.data?.users || [];
		if (users.length === 0) {
			throw error(404, 'Employee not found');
		}

		const employee = users[0];

		// Load additional related data separately
		// Emergency contacts
		const emergencyContactsResponse = await fetch(graphqlEndpoint, {
			method: 'POST',
			headers,
			body: JSON.stringify({
				query: `
					query GetEmergencyContacts($employeeId: UUID!, $limit: Int!) {
						emergencyContacts(limit: $limit, filter: { employeeId: { equalTo: $employeeId } }) {
							id
							fullName
							relationship
							phoneNumber
							alternatePhone
							email
							addressLine1
							addressLine2
							city
							stateProvince
							postalCode
							country
							isPrimary
							notes
						}
					}
				`,
				variables: { employeeId, limit: 50 }
			})
		});
		const emergencyContactsData = await emergencyContactsResponse.json();
		const emergencyContacts = emergencyContactsData?.data?.emergencyContacts || [];

		// Employee vehicles
		const vehiclesResponse = await fetch(graphqlEndpoint, {
			method: 'POST',
			headers,
			body: JSON.stringify({
				query: `
					query GetEmployeeVehicles($employeeId: UUID!, $limit: Int!) {
						employeeVehicles(limit: $limit, filter: { employeeId: { equalTo: $employeeId } }) {
							id
							make
							model
							year
							color
							licensePlate
							stateProvince
							parkingSpot
							insuranceCompany
							insurancePolicyNumber
							insuranceExpiry
							isPrimary
							notes
						}
					}
				`,
				variables: { employeeId, limit: 50 }
			})
		});
		const vehiclesData = await vehiclesResponse.json();
		const vehicles = vehiclesData?.data?.employeeVehicles || [];

		// Leave requests
		const leaveRequestsResponse = await fetch(graphqlEndpoint, {
			method: 'POST',
			headers,
			body: JSON.stringify({
				query: `
					query GetLeaveRequests($employeeId: UUID!, $limit: Int!) {
						leaveRequests(limit: $limit, filter: { employeeId: { equalTo: $employeeId } }) {
							id
							leaveType
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

		// Performance reviews
		const reviewsResponse = await fetch(graphqlEndpoint, {
			method: 'POST',
			headers,
			body: JSON.stringify({
				query: `
					query GetPerformanceReviews($employeeId: UUID!, $limit: Int!) {
						performanceReviews(limit: $limit, filter: { employeeId: { equalTo: $employeeId } }) {
							id
							reviewPeriod
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

		// Time off balances
		const balancesResponse = await fetch(graphqlEndpoint, {
			method: 'POST',
			headers,
			body: JSON.stringify({
				query: `
					query GetTimeOffBalances($employeeId: UUID!, $limit: Int!) {
						timeOffBalances(limit: $limit, filter: { employeeId: { equalTo: $employeeId } }) {
							id
							year
							balanceDays
							usedDays
							policyId
							policy {
								id
								name
								daysPerYear
							}
						}
					}
				`,
				variables: { employeeId, limit: 50 }
			})
		});
		const balancesData = await balancesResponse.json();
		const timeOffBalances = balancesData?.data?.timeOffBalances || [];

		// Check if user is the employee's manager
		const isEmployeeManager = employee.department?.managerId === locals.user.id;

		// Determine access permissions
		const canViewContactInfo = isViewingSelf || isEmployeeManager || isAdmin;
		const canViewEmergencyContacts = isViewingSelf || isEmployeeManager || isAdmin;
		const canViewVehicles = isViewingSelf || isEmployeeManager || isAdmin;
		const canViewCompensation = isAdmin; // Only admins and HR managers can view compensation

		// RBAC: Check if user can create reviews for this employee
		// Admins and HR managers can create reviews for anyone
		// Managers can create reviews for their direct reports
		const canCreateReviews = isAdmin || isEmployeeManager;

		// Get standardized user permissions
		const userPermissions = getUserPermissions(locals);

		// Fetch documents assigned to this employee
		const { transaction, setJWTClaims } = await import('$lib/server/db');
		let assignedDocuments: any[] = [];
		let availableDocuments: any[] = [];

		try {
			assignedDocuments = await transaction(async (client) => {
				await setJWTClaims(client, locals.user.id, locals.user.role || 'employee');

				const result = await client.query(
					`SELECT
						d.id,
						d.filename,
						d.file_type,
						d.file_size_bytes,
						d.category,
						d.sensitivity_level,
						d.uploaded_at,
						d.uploaded_by,
						u.email as uploaded_by_email,
						da.assigned_at,
						da.assignment_reason
					 FROM hr_public.documents d
					 INNER JOIN hr_public.document_assignments da ON d.id = da.document_id
					 LEFT JOIN hr_public.users u ON d.uploaded_by = u.id
					 WHERE da.employee_id = $1 AND d.is_deleted = false
					 ORDER BY da.assigned_at DESC`,
					[employeeId]
				);

				return result.rows;
			});
		} catch (err) {
			console.error('Failed to fetch employee documents:', err);
			assignedDocuments = [];
		}

		// Fetch available documents (not assigned to this employee) for admins
		if (isAdmin) {
			console.log(`[Employee Detail] Fetching available documents for admin, employee: ${employeeId}`);
			try {
				availableDocuments = await transaction(async (client) => {
					await setJWTClaims(client, locals.user.id, locals.user.role || 'employee');

					// First, get total count of documents
					const countResult = await client.query(
						`SELECT COUNT(*) as total FROM hr_public.documents WHERE is_deleted = false`
					);
					console.log(`[Employee Detail] Total documents in system: ${countResult.rows[0].total}`);

					// Then get documents not assigned to this employee
					const result = await client.query(
						`SELECT
							d.id,
							d.filename,
							d.file_type,
							d.file_size_bytes,
							d.category,
							d.sensitivity_level,
							d.uploaded_at,
							d.uploaded_by,
							u.email as uploaded_by_email
						 FROM hr_public.documents d
						 LEFT JOIN hr_public.users u ON d.uploaded_by = u.id
						 WHERE d.is_deleted = false
						   AND NOT EXISTS (
						       SELECT 1 FROM hr_public.document_assignments da
						       WHERE da.document_id = d.id AND da.employee_id = $1
						   )
						 ORDER BY d.uploaded_at DESC`,
						[employeeId]
					);

					console.log(`[Employee Detail] Available documents (not assigned to ${employeeId}): ${result.rows.length}`);
					return result.rows;
				});
			} catch (err) {
				console.error('Failed to fetch available documents:', err);
				availableDocuments = [];
			}
		} else {
			console.log(`[Employee Detail] User is not admin, skipping available documents fetch`);
		}

		// Return server-side loaded data
		return {
			userSession: userSession.toJSON(),
			employee: {
				id: employee.id,
				displayName: employee.displayName,
				firstName: employee.displayName?.split(' ')[0] || '',
				lastName: employee.displayName?.split(' ').slice(1).join(' ') || '',
				email: employee.email,
				role: employee.role,
				hireDate: employee.hireDate,
				isActive: employee.isActive,
				departmentId: employee.departmentId,
				// Contact information - only if authorized
				phoneNumber: canViewContactInfo ? employee.phoneNumber : null,
				mobileNumber: canViewContactInfo ? employee.mobileNumber : null,
				addressLine1: canViewContactInfo ? employee.addressLine1 : null,
				addressLine2: canViewContactInfo ? employee.addressLine2 : null,
				city: canViewContactInfo ? employee.city : null,
				stateProvince: canViewContactInfo ? employee.stateProvince : null,
				postalCode: canViewContactInfo ? employee.postalCode : null,
				country: canViewContactInfo ? employee.country : null,
				createdAt: employee.createdAt,
				updatedAt: employee.updatedAt,
				lastLogin: employee.lastLogin,
				department: employee.department,
				// Emergency contacts - only if authorized
				emergencyContacts: canViewEmergencyContacts ? emergencyContacts : [],
				// Vehicles - only if authorized
				vehicles: canViewVehicles ? vehicles : [],
				leaveRequests: leaveRequests,
				leaveRequestCount: leaveRequests.length,
				performanceReviews: performanceReviews.map((review: any) => ({
					id: review.id,
					reviewPeriod: review.reviewPeriod,
					overallRating: review.overallRating,
					status: review.status,
					createdAt: review.createdAt,
					reviewer: review.reviewer
				})),
				performanceReviewCount: performanceReviews.length,
				timeOffBalances: timeOffBalances.map((balance: any) => ({
					id: balance.id,
					year: balance.year,
					balanceDays: balance.balanceDays,
					usedDays: balance.usedDays,
					remainingDays: balance.balanceDays - balance.usedDays,
					policyName: balance.policy?.name || 'Unknown Policy',
					totalDays: balance.policy?.daysPerYear || balance.balanceDays
				})),
				// Assigned documents
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
				canViewDocuments: isViewingSelf || isEmployeeManager || isAdmin,
				canAssignDocuments: isAdmin,
				isEmployeeManager,
				isViewingSelf,
				...userPermissions
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
		throw error(500, 'Unable to load employee details');
	}
};
