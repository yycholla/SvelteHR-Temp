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

	// Ensure user is authenticated
	if (!locals.user) {
		error(401, 'Authentication required');
	}

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
		// Make direct GraphQL calls to Rust GraphQL backend
		const { getGraphQLEndpoint } = await import('$lib/server/api-url');
		const graphqlEndpoint = getGraphQLEndpoint();

		// Headers for session-based authentication
		// Forward session cookies to Rust GraphQL backend
		const cookieHeader = event.request.headers.get('cookie') || '';
		const headers: Record<string, string> = {
			'Content-Type': 'application/json',
			'Cookie': cookieHeader
		};

		console.log(
			'[Employee Edit] Using Rust GraphQL backend with session-based auth, user roles:',
			locals.roles
		);

		// Determine if user can edit detailed employee information
		const userRoles = locals.roles || [];
		const isAdmin = userRoles.includes('Admin') || userRoles.includes('HR Manager');
		const isViewingSelf = locals.user.id === employeeId;

		// Load employee data, departments, and roles in parallel
		// NOTE: Using Rust GraphQL schema (filter pattern, direct arrays)
		const [employeeResponse, departmentsResponse, rolesResponse] = await Promise.all([
			fetch(graphqlEndpoint, {
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
								department {
									id
									name
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
			}),
			fetch(graphqlEndpoint, {
				method: 'POST',
				headers,
				body: JSON.stringify({
					query: `
						query GetRoles {
							roles(limit: 100) {
								id
								name
								description
								level
							}
						}
					`
				})
			})
		]);

		const [employeeData, departmentsData, rolesData] = await Promise.all([
			employeeResponse.json(),
			departmentsResponse.json(),
			rolesResponse.json()
		]);

		// Check if employee exists
		const employee = employeeData?.data?.user;
		if (!employee) {
			error(404, 'Employee not found');
		}

		// Load related data separately (emergency contacts and vehicles) - migrated to Rust GraphQL
		const [emergencyContactsResponse, vehiclesResponse] = await Promise.all([
			fetch(graphqlEndpoint, {
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
			}),
			fetch(graphqlEndpoint, {
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
			})
		]);

		const [emergencyContactsData, vehiclesData] = await Promise.all([
			emergencyContactsResponse.json(),
			vehiclesResponse.json()
		]);

		const emergencyContacts = emergencyContactsData?.data?.emergencyContacts || [];
		const vehicles = vehiclesData?.data?.employeeVehicles || [];

		// Check if user is the employee's manager
		const isEmployeeManager = employee.department?.managerId === locals.user.id;

		// Determine edit permissions
		const canEditContactInfo = isViewingSelf || isEmployeeManager || isAdmin;
		const canEditEmergencyContacts = isViewingSelf || isEmployeeManager || isAdmin;
		const canEditVehicles = isViewingSelf || isEmployeeManager || isAdmin;
		const canEditCompensation = isAdmin; // Only admins can edit compensation

		// Load compensation data if admin
		// TODO: Compensation queries not yet implemented in GraphQL schema
		let currentCompensation = null;

		// Get standardized user permissions
		const userPermissions = getUserPermissions(locals);

		// Return server-side loaded data
		return {
			userSession: userSession.toJSON(),
			roles: rolesData?.data?.roles || [],
			employee: {
				id: employee.id,
				firstName: employee.firstName,
				lastName: employee.lastName,
				displayName: employee.displayName,
				fullName: employee.fullName,
				email: employee.email,
				role: employee.roles && employee.roles.length > 0 ? employee.roles[0].name : 'Employee',
				roles: employee.roles || [],
				jobTitle: employee.jobTitle,
				status: employee.status,
				hireDate: employee.hireDate,
				isActive: employee.isActive,
				departmentId: employee.departmentId,
				// Contact information - only if authorized
				phoneNumber: canEditContactInfo ? employee.phone : null,
				mobileNumber: canEditContactInfo ? employee.alternatePhone : null,
				addressLine1: canEditContactInfo ? employee.primaryAddress?.addressLine1 : null,
				addressLine2: canEditContactInfo ? employee.primaryAddress?.addressLine2 : null,
				city: canEditContactInfo ? employee.primaryAddress?.city : null,
				stateProvince: canEditContactInfo ? employee.primaryAddress?.stateProvince : null,
				postalCode: canEditContactInfo ? employee.primaryAddress?.postalCode : null,
				country: canEditContactInfo ? employee.primaryAddress?.country : null,
				department: employee.department,
				// Emergency contacts - only if authorized
				emergencyContacts: canEditEmergencyContacts ? emergencyContacts : [],
				// Vehicles - only if authorized
				vehicles: canEditVehicles ? vehicles : [],
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
		error(500, 'Unable to load employee data');
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

			// Make GraphQL update mutation with session-based authentication
			const { getGraphQLEndpoint } = await import('$lib/server/api-url');
			const graphqlEndpoint = getGraphQLEndpoint();

			// Headers for session-based authentication
			const cookieHeader = request.headers.get('cookie') || '';
			const headers: Record<string, string> = {
				'Content-Type': 'application/json',
				'Cookie': cookieHeader
			};

			console.log('[Employee Update] Using session-based auth for mutation');

			// Build update input - only include fields that have values
			const updateInput: any = {};

			if (firstName) updateInput.firstName = firstName;
			if (lastName) updateInput.lastName = lastName;
			if (email) updateInput.email = email;
			if (phoneNumber) updateInput.phone = phoneNumber;
			if (mobileNumber) updateInput.alternatePhone = mobileNumber;
			if (departmentId) updateInput.departmentId = departmentId;
			if (hireDate) updateInput.hireDate = new Date(hireDate).toISOString();

			// Update user via GraphQL mutation (namespaced under 'users')
			const updateResponse = await fetch(graphqlEndpoint, {
				method: 'POST',
				headers,
				body: JSON.stringify({
					query: `
						mutation UpdateEmployee($id: UUID!, $input: UpdateUserInput!) {
							users {
								updateUser(id: $id, input: $input) {
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
								}
							}
						}
					`,
					variables: {
						id: employeeId,
						input: updateInput
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

			console.log('[Employee Update] User profile updated successfully');

			// Handle role assignment if role changed
			if (role) {
				console.log('[Employee Update] Updating role to:', role);

				const updatedEmployee = updateData?.data?.users?.updateUser;
				const currentRoles = updatedEmployee?.roles || [];
				const currentRoleName = currentRoles[0]?.name;

				// Only update if role actually changed
				if (currentRoleName !== role) {
					// Get all roles to find the new role ID
					const allRolesResponse = await fetch(graphqlEndpoint, {
						method: 'POST',
						headers,
						body: JSON.stringify({
							query: `
								query GetAllRoles {
									roles(limit: 100) {
										id
										name
									}
								}
							`
						})
					});

					const allRolesData = await allRolesResponse.json();
					const newRole = allRolesData?.data?.roles?.find((r: any) => r.name === role);

					if (newRole) {
						// Remove all existing role assignments
						for (const currentRole of currentRoles) {
							await fetch(graphqlEndpoint, {
								method: 'POST',
								headers,
								body: JSON.stringify({
									query: `
										mutation RemoveRoleFromUser($userId: UUID!, $roleId: UUID!) {
											removeRoleFromUser(userId: $userId, roleId: $roleId)
										}
									`,
									variables: {
										userId: employeeId,
										roleId: currentRole.id
									}
								})
							});
							console.log(`[Employee Update] Removed role: ${currentRole.name}`);
						}

						// Assign new role
						const assignResponse = await fetch(graphqlEndpoint, {
							method: 'POST',
							headers,
							body: JSON.stringify({
								query: `
									mutation AssignRoleToUser($userId: UUID!, $roleId: UUID!) {
										assignRoleToUser(userId: $userId, roleId: $roleId) {
											id
											userId
											roleId
											assignedAt
										}
									}
								`,
								variables: {
									userId: employeeId,
									roleId: newRole.id
								}
							})
						});

						const assignData = await assignResponse.json();

						if (assignData.errors) {
							console.error('[Employee Update] Role assignment errors:', assignData.errors);
						} else {
							console.log(`[Employee Update] Assigned new role: ${role}`);
						}
					} else {
						console.warn(`[Employee Update] Role "${role}" not found in database`);
					}
				} else {
					console.log('[Employee Update] Role unchanged, skipping role assignment');
				}
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

			// Process emergency contacts (create/update each) - migrated to Rust GraphQL
			for (const contact of emergencyContacts.filter((c) => c)) {
				if (contact.id) {
					// Update existing contact
					const updateContactMutation = `
						mutation UpdateEmergencyContact($id: UUID!, $input: UpdateEmergencyContactInput!) {
							updateEmergencyContact(id: $id, input: $input) {
								id
								name
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
								input: {
									name: contact.name || contact.fullName,
									relationship: contact.relationship || null,
									phoneNumber: contact.phoneNumber,
									email: contact.email || null,
									isPrimary: contact.isPrimary === 'true'
								}
							}
						})
					});
				} else if ((contact.name || contact.fullName) && contact.phoneNumber) {
					// Create new contact
					const createContactMutation = `
						mutation CreateEmergencyContact($input: CreateEmergencyContactInput!) {
							createEmergencyContact(input: $input) {
								id
								name
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
									employeeId: employeeId,
									name: contact.name || contact.fullName,
									relationship: contact.relationship || null,
									phoneNumber: contact.phoneNumber,
									email: contact.email || null,
									isPrimary: contact.isPrimary === 'true'
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

			// Process vehicles (create/update each) - migrated to Rust GraphQL
			for (const vehicle of vehicles.filter((v) => v)) {
				if (vehicle.id) {
					// Update existing vehicle
					const updateVehicleMutation = `
						mutation UpdateVehicle($id: UUID!, $input: UpdateEmployeeVehicleInput!) {
							updateEmployeeVehicle(id: $id, input: $input) {
								id
								make
								model
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
								input: {
									make: vehicle.make || null,
									model: vehicle.model || null,
									year: vehicle.year ? parseInt(vehicle.year) : null,
									color: vehicle.color || null,
									licensePlate: vehicle.licensePlate || null
								}
							}
						})
					});
				} else if (vehicle.make && vehicle.model && vehicle.licensePlate) {
					// Create new vehicle
					const createVehicleMutation = `
						mutation CreateVehicle($input: CreateEmployeeVehicleInput!) {
							createEmployeeVehicle(input: $input) {
								id
								make
								model
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
									employeeId: employeeId,
									make: vehicle.make,
									model: vehicle.model,
									year: vehicle.year ? parseInt(vehicle.year) : 0,
									licensePlate: vehicle.licensePlate,
									color: vehicle.color || null
								}
							}
						})
					});
				}
			}

			// Handle compensation (admin only)
			// TODO: Compensation mutations not yet implemented in GraphQL schema
			console.warn('[Employee Update] Compensation mutations not yet implemented - skipping compensation update');

			// Redirect to employee detail page on success
			redirect(303, `/dashboard/employees/${employeeId}`);
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
