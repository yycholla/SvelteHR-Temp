// Server-side data loading and form handling for employee edit page
// Follows RBAC patterns with server-side API calls only

import type { PageServerLoad, Actions } from './$types';
import { error, redirect, fail } from '@sveltejs/kit';
import { PermissionChecks, getUserPermissions } from '$lib/server/rbac-utils';

export const load: PageServerLoad = async (event) => {
	const { params, locals, cookies } = event;
	const employeeId = params.id;

	// RBAC: Check employee write permissions
	PermissionChecks.employeeWrite(event);

	// Import required models
	const { createUserSession } = await import('$lib/models/user-session');

	// Ensure user is authenticated
	if (!locals.user) {
		throw error(401, 'Authentication required');
	}

	// Create user session from server locals
	const userSession = createUserSession({
		userId: locals.user.id,
		jwtToken: cookies.get('hr_token') || '',
		roles: [locals.user.role || 'employee'],
		permissions: locals.permissions || [],
		expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
		metadata: {
			userEmail: locals.user.email,
			displayName: locals.user.display_name || locals.user.email
		}
	});

	try {
		// Make direct GraphQL calls to PostGraphile backend
		const { getGraphQLEndpoint } = await import('$lib/server/api-url');
		const graphqlEndpoint = getGraphQLEndpoint();

		// Get JWT token for PostGraphile authentication
		const jwtToken = cookies.get('hr_token') || cookies.get('postgraphile-jwt-token') || '';

		// Decode JWT token to get user context
		let jwtClaims = null;
		if (jwtToken) {
			try {
				const { decodeJWTTokenUnsafe } = await import('$lib/auth/jwt-utils');
				jwtClaims = await decodeJWTTokenUnsafe(jwtToken);
			} catch (error) {
				console.warn('[Employee Edit] Failed to decode JWT:', error);
			}
		}

		// Set up proper headers for PostGraphile with JWT context
		const headers: Record<string, string> = {
			'Content-Type': 'application/json'
		};

		if (jwtClaims) {
			headers['Authorization'] = `Bearer ${jwtToken}`;
			headers['X-JWT-Claims-Role'] = jwtClaims.role || 'employee';
			headers['X-JWT-Claims-User-Id'] = jwtClaims.user_id;
		}

		// Determine if user can edit detailed employee information
		const userRole = locals.user.role?.toLowerCase().replace('-', '_') || 'employee';
		const isAdmin = ['super_admin', 'admin', 'hr_manager'].includes(userRole);
		const isViewingSelf = locals.user.id === employeeId;

		// Load employee data and departments in parallel
		const [employeeResponse, departmentsResponse] = await Promise.all([
			fetch(graphqlEndpoint, {
				method: 'POST',
				headers,
				body: JSON.stringify({
					query: `
						query GetEmployeeById($id: UUID!) {
							employee: userById(id: $id) {
								id
								displayName
								firstName
								lastName
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
								departmentByDepartmentId {
									id
									name
									managerId
								}
								emergencyContactsByEmployeeId {
									nodes {
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
								employeeVehiclesByEmployeeId {
									nodes {
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
							}
						}
					`,
					variables: { id: employeeId }
				})
			}),
			fetch(graphqlEndpoint, {
				method: 'POST',
				headers,
				body: JSON.stringify({
					query: `
						query GetDepartments {
							departments(limit: 100) {
								id
								name
							}
						}
					`
				})
			})
		]);

		const [employeeData, departmentsData] = await Promise.all([
			employeeResponse.json(),
			departmentsResponse.json()
		]);

		// Check if employee exists
		if (!employeeData?.data?.employee) {
			throw error(404, 'Employee not found');
		}

		const employee = employeeData.data.employee;

		// Check if user is the employee's manager
		const isEmployeeManager = employee.departmentByDepartmentId?.managerId === locals.user.id;

		// Determine edit permissions
		const canEditContactInfo = isViewingSelf || isEmployeeManager || isAdmin;
		const canEditEmergencyContacts = isViewingSelf || isEmployeeManager || isAdmin;
		const canEditVehicles = isViewingSelf || isEmployeeManager || isAdmin;
		const canEditCompensation = isAdmin; // Only admins can edit compensation

		// Load compensation data if admin
		let currentCompensation = null;
		if (canEditCompensation) {
			try {
				const compensationResponse = await fetch(graphqlEndpoint, {
					method: 'POST',
					headers,
					body: JSON.stringify({
						query: `
							query GetCurrentCompensation($employeeId: UUID!) {
								allCompensationRecords(
									condition: { employeeId: $employeeId }
									orderBy: EFFECTIVE_DATE_DESC
									first: 1
								) {
									nodes {
										id
										salaryAmount
										salaryCurrency
										payFrequency
										payType
										hourlyRate
										effectiveDate
										endDate
										bankName
										bankAccountType
										bankAccountNumberLast4
										bankRoutingNumber
										paymentMethod
										taxIdLast4
										notes
									}
								}
							}
						`,
						variables: { employeeId }
					})
				});
				const compensationData = await compensationResponse.json();
				if (compensationData?.data?.allCompensationRecords?.nodes?.[0]) {
					currentCompensation = compensationData.data.allCompensationRecords.nodes[0];
				}
			} catch (error) {
				console.warn('[Employee Edit] Failed to load compensation data:', error);
			}
		}

		// Get standardized user permissions
		const userPermissions = getUserPermissions(locals);

		// Return server-side loaded data
		return {
			userSession: userSession.toJSON(),
			employee: {
				id: employee.id,
				displayName: employee.displayName,
				firstName: employee.firstName,
				lastName: employee.lastName,
				email: employee.email,
				role: employee.role,
				hireDate: employee.hireDate,
				isActive: employee.isActive,
				departmentId: employee.departmentId,
				// Contact information - only if authorized
				phoneNumber: canEditContactInfo ? employee.phoneNumber : null,
				mobileNumber: canEditContactInfo ? employee.mobileNumber : null,
				addressLine1: canEditContactInfo ? employee.addressLine1 : null,
				addressLine2: canEditContactInfo ? employee.addressLine2 : null,
				city: canEditContactInfo ? employee.city : null,
				stateProvince: canEditContactInfo ? employee.stateProvince : null,
				postalCode: canEditContactInfo ? employee.postalCode : null,
				country: canEditContactInfo ? employee.country : null,
				department: employee.departmentByDepartmentId,
				// Emergency contacts - only if authorized
				emergencyContacts: canEditEmergencyContacts
					? employee.emergencyContactsByEmployeeId?.nodes || []
					: [],
				// Vehicles - only if authorized
				vehicles: canEditVehicles ? employee.employeeVehiclesByEmployeeId?.nodes || [] : [],
				// Compensation - only if admin
				compensation: canEditCompensation ? currentCompensation : null
			},
			departments: departmentsData?.data?.departments || [],
			// RBAC: Permission flags for UI
			permissions: {
				canEditContactInfo,
				canEditEmergencyContacts,
				canEditVehicles,
				canEditCompensation,
				isEmployeeManager,
				isViewingSelf,
				...userPermissions
			},
			loadedAt: new Date().toISOString()
		};
	} catch (err) {
		console.error('[Employee Edit Load Error]', err);

		// If it's already a SvelteKit error, rethrow it
		if (err && typeof err === 'object' && 'status' in err) {
			throw err;
		}

		// Throw SvelteKit error with user-friendly message
		throw error(500, 'Unable to load employee data');
	}
};

export const actions: Actions = {
	default: async (event) => {
		const { request, params, cookies } = event;
		const employeeId = params.id;

		// RBAC: Check employee write permissions
		PermissionChecks.employeeWrite(event);

		try {
			const formData = await request.formData();
			const firstName = formData.get('firstName')?.toString();
			const lastName = formData.get('lastName')?.toString();
			const email = formData.get('email')?.toString();
			const role = formData.get('role')?.toString();
			const hireDate = formData.get('hireDate')?.toString();
			const departmentId = formData.get('departmentId')?.toString();
			const isActive = formData.get('isActive') === 'true';

			// Contact information fields
			const phoneNumber = formData.get('phoneNumber')?.toString();
			const mobileNumber = formData.get('mobileNumber')?.toString();
			const addressLine1 = formData.get('addressLine1')?.toString();
			const addressLine2 = formData.get('addressLine2')?.toString();
			const city = formData.get('city')?.toString();
			const stateProvince = formData.get('stateProvince')?.toString();
			const postalCode = formData.get('postalCode')?.toString();
			const country = formData.get('country')?.toString();

			// Basic validation
			if (!firstName || !lastName || !email) {
				return fail(400, {
					error: 'First name, last name, and email are required'
				});
			}

			// Make GraphQL update mutation
			const { getGraphQLEndpoint } = await import('$lib/server/api-url');
			const graphqlEndpoint = getGraphQLEndpoint();

			const jwtToken = cookies.get('hr_token') || '';
			let jwtClaims = null;
			if (jwtToken) {
				try {
					const { decodeJWTTokenUnsafe } = await import('$lib/auth/jwt-utils');
					jwtClaims = await decodeJWTTokenUnsafe(jwtToken);
				} catch (error) {
					console.warn('[Employee Update] Failed to decode JWT:', error);
				}
			}

			const headers: Record<string, string> = {
				'Content-Type': 'application/json'
			};

			if (jwtClaims) {
				headers['Authorization'] = `Bearer ${jwtToken}`;
				headers['X-JWT-Claims-Role'] = jwtClaims.role || 'employee';
				headers['X-JWT-Claims-User-Id'] = jwtClaims.user_id;
			}

			const updateResponse = await fetch(graphqlEndpoint, {
				method: 'POST',
				headers,
				body: JSON.stringify({
					query: `
						mutation UpdateEmployee($id: UUID!, $userPatch: UserPatch!) {
							updateUserById(input: { id: $id, userPatch: $userPatch }) {
								user {
									id
									displayName
									firstName
									lastName
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
								}
							}
						}
					`,
					variables: {
						id: employeeId,
						userPatch: {
							firstName,
							lastName,
							email,
							role,
							hireDate: hireDate || null,
							departmentId: departmentId || null,
							isActive,
							phoneNumber: phoneNumber || null,
							mobileNumber: mobileNumber || null,
							addressLine1: addressLine1 || null,
							addressLine2: addressLine2 || null,
							city: city || null,
							stateProvince: stateProvince || null,
							postalCode: postalCode || null,
							country: country || null
						}
					}
				})
			});

			const updateData = await updateResponse.json();

			if (updateData.errors) {
				console.error('[Employee Update Error]', updateData.errors);
				return fail(500, {
					error: 'Failed to update employee'
				});
			}

			// Handle emergency contacts - parse array data from form
			const emergencyContacts: any[] = [];
			for (const [key, value] of formData.entries()) {
				const match = key.match(/emergencyContacts\[(\d+)\]\.(.+)/);
				if (match) {
					const index = parseInt(match[1]);
					const field = match[2];
					if (!emergencyContacts[index]) {
						emergencyContacts[index] = {};
					}
					emergencyContacts[index][field] = value.toString();
				}
			}

			// Process emergency contacts (create/update each)
			for (const contact of emergencyContacts.filter((c) => c)) {
				if (contact.id) {
					// Update existing contact
					const updateContactMutation = `
						mutation UpdateEmergencyContact($id: UUID!, $patch: EmergencyContactPatch!) {
							updateEmergencyContactById(input: { id: $id, emergencyContactPatch: $patch }) {
								emergencyContact { id }
							}
						}
					`;
					await fetch(graphqlEndpoint, {
						method: 'POST',
						headers,
						body: JSON.stringify({
							query: updateContactMutation,
							variables: {
								id: contact.id,
								patch: {
									fullName: contact.fullName,
									relationship: contact.relationship,
									phoneNumber: contact.phoneNumber,
									alternatePhone: contact.alternatePhone || null,
									email: contact.email || null,
									isPrimary: contact.isPrimary === 'true'
								}
							}
						})
					});
				} else if (contact.fullName && contact.phoneNumber) {
					// Create new contact
					const createContactMutation = `
						mutation CreateEmergencyContact($input: CreateEmergencyContactInput!) {
							createEmergencyContact(input: $input) {
								emergencyContact { id }
							}
						}
					`;
					await fetch(graphqlEndpoint, {
						method: 'POST',
						headers,
						body: JSON.stringify({
							query: createContactMutation,
							variables: {
								input: {
									emergencyContact: {
										employeeId: employeeId,
										fullName: contact.fullName,
										relationship: contact.relationship,
										phoneNumber: contact.phoneNumber,
										alternatePhone: contact.alternatePhone || null,
										email: contact.email || null,
										isPrimary: contact.isPrimary === 'true'
									}
								}
							}
						})
					});
				}
			}

			// Handle vehicles - parse array data from form
			const vehicles: any[] = [];
			for (const [key, value] of formData.entries()) {
				const match = key.match(/vehicles\[(\d+)\]\.(.+)/);
				if (match) {
					const index = parseInt(match[1]);
					const field = match[2];
					if (!vehicles[index]) {
						vehicles[index] = {};
					}
					vehicles[index][field] = value.toString();
				}
			}

			// Process vehicles (create/update each)
			for (const vehicle of vehicles.filter((v) => v)) {
				if (vehicle.id) {
					// Update existing vehicle
					const updateVehicleMutation = `
						mutation UpdateVehicle($id: UUID!, $patch: EmployeeVehiclePatch!) {
							updateEmployeeVehicleById(input: { id: $id, employeeVehiclePatch: $patch }) {
								employeeVehicle { id }
							}
						}
					`;
					await fetch(graphqlEndpoint, {
						method: 'POST',
						headers,
						body: JSON.stringify({
							query: updateVehicleMutation,
							variables: {
								id: vehicle.id,
								patch: {
									make: vehicle.make,
									model: vehicle.model,
									year: vehicle.year ? parseInt(vehicle.year) : null,
									color: vehicle.color || null,
									licensePlate: vehicle.licensePlate,
									stateProvince: vehicle.stateProvince || null,
									parkingSpot: vehicle.parkingSpot || null,
									insuranceCompany: vehicle.insuranceCompany || null,
									insurancePolicyNumber: vehicle.insurancePolicyNumber || null,
									insuranceExpiry: vehicle.insuranceExpiry || null,
									isPrimary: vehicle.isPrimary === 'true'
								}
							}
						})
					});
				} else if (vehicle.make && vehicle.model && vehicle.licensePlate) {
					// Create new vehicle
					const createVehicleMutation = `
						mutation CreateVehicle($input: CreateEmployeeVehicleInput!) {
							createEmployeeVehicle(input: $input) {
								employeeVehicle { id }
							}
						}
					`;
					await fetch(graphqlEndpoint, {
						method: 'POST',
						headers,
						body: JSON.stringify({
							query: createVehicleMutation,
							variables: {
								input: {
									employeeVehicle: {
										employeeId: employeeId,
										make: vehicle.make,
										model: vehicle.model,
										year: vehicle.year ? parseInt(vehicle.year) : null,
										color: vehicle.color || null,
										licensePlate: vehicle.licensePlate,
										stateProvince: vehicle.stateProvince || null,
										parkingSpot: vehicle.parkingSpot || null,
										insuranceCompany: vehicle.insuranceCompany || null,
										insurancePolicyNumber: vehicle.insurancePolicyNumber || null,
										insuranceExpiry: vehicle.insuranceExpiry || null,
										isPrimary: vehicle.isPrimary === 'true'
									}
								}
							}
						})
					});
				}
			}

			// Handle compensation (admin only)
			const userRole = event.locals.user.role?.toLowerCase().replace('-', '_') || 'employee';
			const isAdminUser = ['super_admin', 'admin', 'hr_manager'].includes(userRole);

			if (isAdminUser) {
				const compensationId = formData.get('compensationId')?.toString();
				const salaryAmount = formData.get('salaryAmount')?.toString();
				const salaryCurrency = formData.get('salaryCurrency')?.toString() || 'USD';
				const payFrequency = formData.get('payFrequency')?.toString() || 'monthly';
				const payType = formData.get('payType')?.toString() || 'salary';
				const hourlyRate = formData.get('hourlyRate')?.toString();
				const effectiveDate = formData.get('effectiveDate')?.toString();
				const bankName = formData.get('bankName')?.toString();
				const bankAccountType = formData.get('bankAccountType')?.toString();
				const bankAccountNumberLast4 = formData.get('bankAccountNumberLast4')?.toString();
				const bankRoutingNumber = formData.get('bankRoutingNumber')?.toString();
				const paymentMethod = formData.get('paymentMethod')?.toString() || 'direct_deposit';
				const taxIdLast4 = formData.get('taxIdLast4')?.toString();

				if (salaryAmount && parseFloat(salaryAmount) > 0) {
					if (compensationId) {
						// Update existing compensation
						const updateCompensationMutation = `
							mutation UpdateCompensation($id: UUID!, $patch: CompensationRecordPatch!) {
								updateCompensationRecordById(input: { id: $id, compensationRecordPatch: $patch }) {
									compensationRecord { id }
								}
							}
						`;
						await fetch(graphqlEndpoint, {
							method: 'POST',
							headers,
							body: JSON.stringify({
								query: updateCompensationMutation,
								variables: {
									id: compensationId,
									patch: {
										salaryAmount: parseFloat(salaryAmount),
										salaryCurrency,
										payFrequency,
										payType,
										hourlyRate: hourlyRate ? parseFloat(hourlyRate) : null,
										effectiveDate: effectiveDate || new Date().toISOString().split('T')[0],
										bankName: bankName || null,
										bankAccountType: bankAccountType || null,
										bankAccountNumberLast4: bankAccountNumberLast4 || null,
										bankRoutingNumber: bankRoutingNumber || null,
										paymentMethod,
										taxIdLast4: taxIdLast4 || null
									}
								}
							})
						});
					} else {
						// Create new compensation record
						const createCompensationMutation = `
							mutation CreateCompensation($input: CreateCompensationRecordInput!) {
								createCompensationRecord(input: $input) {
									compensationRecord { id }
								}
							}
						`;
						await fetch(graphqlEndpoint, {
							method: 'POST',
							headers,
							body: JSON.stringify({
								query: createCompensationMutation,
								variables: {
									input: {
										compensationRecord: {
											employeeId: employeeId,
											salaryAmount: parseFloat(salaryAmount),
											salaryCurrency,
											payFrequency,
											payType,
											hourlyRate: hourlyRate ? parseFloat(hourlyRate) : null,
											effectiveDate: effectiveDate || new Date().toISOString().split('T')[0],
											bankName: bankName || null,
											bankAccountType: bankAccountType || null,
											bankAccountNumberLast4: bankAccountNumberLast4 || null,
											bankRoutingNumber: bankRoutingNumber || null,
											paymentMethod,
											taxIdLast4: taxIdLast4 || null,
											createdBy: event.locals.user.id
										}
									}
								}
							})
						});
					}
				}
			}

			// Redirect to employee detail page on success
			throw redirect(303, `/dashboard/employees/${employeeId}`);
		} catch (err) {
			// If it's a redirect, rethrow it
			if (err && typeof err === 'object' && 'status' in err && (err as any).status === 303) {
				throw err;
			}

			console.error('[Employee Update Action Error]', err);
			return fail(500, {
				error: 'Failed to update employee'
			});
		}
	}
};
