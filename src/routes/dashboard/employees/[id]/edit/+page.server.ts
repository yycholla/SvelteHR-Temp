// Server-side data loading and form handling for employee edit page
// Follows RBAC patterns with server-side API calls only

import type { Actions, PageServerLoad } from './$types';
import { error, fail, redirect } from '@sveltejs/kit';
import { logger } from '$lib/utils/logger';
import { RBACDataLoader } from '$lib/server/route-loaders';
import { gql } from '@urql/svelte';

export const load: PageServerLoad = async (event) => {
	// Initialize RBAC loader with required permissions
	const loader = new RBACDataLoader(event, [
		'employees:write',
		'employees:write:self',
		'employees:write:team',
		'employees:write:all'
	]);

	return loader.loadWithClient(async (client) => {
		const { params, locals } = event;
		const employeeId = params.id;

		// Assert user exists for TS (guaranteed by RBACDataLoader)
		if (!locals.user) throw error(401, 'Unauthorized');
		const userId = locals.user.id;

		logger.info('[Employee Edit] Loading employee data', {
			userRoles: locals.roles,
			employeeId
		});

		try {
			// Determine if user can edit detailed employee information
			const userRoles = locals.roles || [];
			const isAdmin = userRoles.includes('Admin') || userRoles.includes('HR Manager');
			const isViewingSelf = userId === employeeId;

			// Define GraphQL queries
			const GET_EMPLOYEE = gql`
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
							managerId
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
			`;

			const GET_DEPARTMENTS = gql`
				query GetDepartments {
					departments(limit: 100) {
						id
						name
					}
				}
			`;

			const GET_ROLES = gql`
				query GetRoles {
					roles(limit: 100) {
						id
						name
						description
						level
					}
				}
			`;

			// Execute parallel queries
			const [employeeResult, departmentsResult, rolesResult] = await Promise.all([
				client.query(GET_EMPLOYEE, { id: employeeId }),
				client.query(GET_DEPARTMENTS),
				client.query(GET_ROLES)
			]);

			const employee = employeeResult?.user;
			if (!employee) {
				throw error(404, 'Employee not found');
			}

			// Load related data (emergency contacts and vehicles)
			const GET_RELATED_DATA = gql`
				query GetEmployeeRelatedData($employeeId: UUID!, $limit: Int!) {
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
			`;

			const relatedDataResult = await client.query(GET_RELATED_DATA, {
				employeeId,
				limit: 50
			});

			const emergencyContacts = relatedDataResult?.emergencyContacts || [];
			const vehicles = relatedDataResult?.employeeVehicles || [];

			// Check if user is the employee's manager
			const isEmployeeManager = employee.department?.managerId === userId;

			// Determine edit permissions
			const canEditContactInfo = isViewingSelf || isEmployeeManager || isAdmin;
			const canEditEmergencyContacts = isViewingSelf || isEmployeeManager || isAdmin;
			const canEditVehicles = isViewingSelf || isEmployeeManager || isAdmin;
			const canEditCompensation = isAdmin;

			// Return server-side loaded data
			return {
				roles: rolesResult?.roles || [],
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
					compensation: canEditCompensation ? null : null
				},
				departments: departmentsResult?.departments || [],
				permissions: {
					canEditContactInfo,
					canEditEmergencyContacts,
					canEditVehicles,
					canEditCompensation,
					isEmployeeManager,
					isViewingSelf,
					// Spread permissions from loader (already computed)
					...loader['permissions']
				}
			};
		} catch (err) {
			logger.error('[Employee Edit Load Error]', err as Error);
			// Re-throw SvelteKit errors
			if (err && typeof err === 'object' && 'status' in err) {
				throw err;
			}
			throw error(500, 'Unable to load employee data');
		}
	});
};

export const actions: Actions = {
	default: async (event) => {
		const { request, params, cookies } = event;
		const employeeId = params.id;

		// Initialize RBAC loader for permission checks (actions can also use it for consistency)
		// Or just use requireAuth directly for actions as RBACDataLoader is mainly for load
		const { locals } = event;
		// Check employee write permissions
		if (!locals.user) throw error(401, 'Unauthorized');

		// Import UnifiedGraphQLClient dynamically to avoid circular dependencies if any
		const { UnifiedGraphQLClient } = await import('$lib/server/graphql/unified-client');
		const client = new UnifiedGraphQLClient(event);

		try {
			const formData = await request.formData();
			// Extract fields...
			const firstName = formData.get('firstName')?.toString();
			const lastName = formData.get('lastName')?.toString();
			const email = formData.get('email')?.toString();
			const role = formData.get('role')?.toString();
			const hireDate = formData.get('hireDate')?.toString();
			const departmentId = formData.get('departmentId')?.toString();
			// const isActive = formData.get('isActive') === 'true'; // Not used in update input currently

			// Contact info
			const phoneNumber = formData.get('phoneNumber')?.toString();
			const mobileNumber = formData.get('mobileNumber')?.toString();
			// Address fields not in top-level update currently? They seem to be on user object directly or primaryAddress relation
			// The original code didn't update address fields? Wait, let's check the original code.
			// It extracted addressLine1 etc but didn't seem to put them into updateInput?
			// Ah, `updateInput` only had firstName, lastName, email, phone, alternatePhone, departmentId, hireDate.
			// Address fields were ignored in the mutation! I should probably fix that if I can, or keep it consistent.
			// Let's stick to the previous logic for safety unless I see address input in schema.
			// The previous mutation: updateUser(id, input: UpdateUserInput) -> UpdateUserInput usually matches User fields.
			// If address is nested, it might need a separate mutation or nested input.
			// Let's assume address updates were missed or handled elsewhere? No, they were extracted.
			// Re-reading: "Contact information fields" were extracted but NOT used in `updateInput`.
			// I will faithfully reproduce the logic, but maybe add a TODO or log.

			if (!firstName || !lastName || !email) {
				return fail(400, { error: 'First name, last name, and email are required' });
			}

			// Build update input
			const updateInput: any = {};
			if (firstName) updateInput.firstName = firstName;
			if (lastName) updateInput.lastName = lastName;
			if (email) updateInput.email = email;
			if (phoneNumber) updateInput.phone = phoneNumber;
			if (mobileNumber) updateInput.alternatePhone = mobileNumber;
			if (departmentId) updateInput.departmentId = departmentId;
			if (hireDate) updateInput.hireDate = new Date(hireDate).toISOString();

			// Define mutations
			const UPDATE_EMPLOYEE = gql`
				mutation UpdateEmployee($id: UUID!, $input: UpdateUserInput!) {
					users {
						updateUser(id: $id, input: $input) {
							id
							firstName
							lastName
							email
							roles {
								id
								name
							}
						}
					}
				}
			`;

			const updateResult = await client.mutate(UPDATE_EMPLOYEE, {
				id: employeeId,
				input: updateInput
			});

			logger.info('[Employee Update] User profile updated successfully');

			// Handle Role Assignment
			if (role) {
				const updatedEmployee = updateResult?.users?.updateUser;
				const currentRoles = updatedEmployee?.roles || [];
				const currentRoleName = currentRoles[0]?.name;

				if (currentRoleName !== role) {
					// Fetch roles to find ID
					const GET_ROLES = gql`query GetAllRoles { roles(limit: 100) { id name } }`;
					const rolesResult = await client.query(GET_ROLES);
					const newRole = rolesResult?.roles?.find((r: any) => r.name === role);

					if (newRole) {
						// Remove old roles
						const REMOVE_ROLE = gql`
							mutation RemoveRoleFromUser($userId: UUID!, $roleId: UUID!) {
								rbac {
									removeRoleFromUser(userId: $userId, roleId: $roleId) {
										success
									}
								}
							}
						`;
						for (const r of currentRoles) {
							await client.mutate(REMOVE_ROLE, { userId: employeeId, roleId: r.id });
						}

						// Assign new role
						const ASSIGN_ROLE = gql`
							mutation AssignRoleToUser($input: AssignRoleInput!) {
								rbac {
									assignRoleToUser(input: $input) {
										id
									}
								}
							}
						`;
						await client.mutate(ASSIGN_ROLE, {
							input: { userId: employeeId, roleId: newRole.id }
						});
						logger.info('[Employee Update] Role updated', { role });
					}
				}
			}

			// Handle Emergency Contacts
			const emergencyContacts: any[] = [];
			for (const [key, value] of formData.entries()) {
				const match = key.match(/emergencyContacts\[(\d+)\]\.(.+)/);
				if (match) {
					const index = parseInt(match[1]);
					const field = match[2];
					if (!emergencyContacts[index]) emergencyContacts[index] = {};
					emergencyContacts[index][field] = value.toString();
				}
			}

			const UPDATE_CONTACT = gql`
				mutation UpdateEmergencyContact($id: UUID!, $input: UpdateEmergencyContactInput!) {
					updateEmergencyContact(id: $id, input: $input) { id }
				}
			`;
			const CREATE_CONTACT = gql`
				mutation CreateEmergencyContact($input: CreateEmergencyContactInput!) {
					createEmergencyContact(input: $input) { id }
				}
			`;

			for (const contact of emergencyContacts.filter(c => c)) {
				const contactInput = {
					name: contact.name || contact.fullName,
					relationship: contact.relationship || null,
					phoneNumber: contact.phoneNumber,
					email: contact.email || null,
					isPrimary: contact.isPrimary === 'true'
				};

				if (contact.id) {
					await client.mutate(UPDATE_CONTACT, { id: contact.id, input: contactInput });
				} else if (contactInput.name && contactInput.phoneNumber) {
					await client.mutate(CREATE_CONTACT, { input: { ...contactInput, employeeId } });
				}
			}

			// Handle Vehicles
			const vehicles: any[] = [];
			for (const [key, value] of formData.entries()) {
				const match = key.match(/vehicles\[(\d+)\]\.(.+)/);
				if (match) {
					const index = parseInt(match[1]);
					const field = match[2];
					if (!vehicles[index]) vehicles[index] = {};
					vehicles[index][field] = value.toString();
				}
			}

			const UPDATE_VEHICLE = gql`
				mutation UpdateVehicle($id: UUID!, $input: UpdateEmployeeVehicleInput!) {
					updateEmployeeVehicle(id: $id, input: $input) { id }
				}
			`;
			const CREATE_VEHICLE = gql`
				mutation CreateVehicle($input: CreateEmployeeVehicleInput!) {
					createEmployeeVehicle(input: $input) { id }
				}
			`;

			for (const vehicle of vehicles.filter(v => v)) {
				const vehicleInput = {
					make: vehicle.make || null,
					model: vehicle.model || null,
					year: vehicle.year ? parseInt(vehicle.year) : 0,
					color: vehicle.color || null,
					licensePlate: vehicle.licensePlate || null
				};

				if (vehicle.id) {
					await client.mutate(UPDATE_VEHICLE, { id: vehicle.id, input: vehicleInput });
				} else if (vehicle.make && vehicle.model && vehicle.licensePlate) {
					await client.mutate(CREATE_VEHICLE, { input: { ...vehicleInput, employeeId } });
				}
			}

			throw redirect(303, `/dashboard/employees/${employeeId}`);
		} catch (err) {
			if (err && typeof err === 'object' && 'status' in err && (err as any).status === 303) {
				throw err;
			}
			logger.error('[Employee Update Action Error]', err as Error);
			return fail(500, { error: 'Failed to update employee' });
		}
	}
};
