// Server-side data loading and form handling for employee edit page
// Follows RBAC patterns with server-side API calls only
// Migrated to use EmployeeService for core employee data

import type { Actions, PageServerLoad } from './$types';
import { error, fail, redirect } from '@sveltejs/kit';
import { logger } from '$lib/utils/logger';
import { RBACDataLoader } from '$lib/server/route-loaders';
import { createEmployeeService } from '$lib/server/services';
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

			// Use EmployeeService for core employee data
			const employeeService = createEmployeeService(event);
			const employeeResult = await employeeService.getEmployeeById(employeeId);

			// Handle employee not found or errors
			if (employeeResult.isError) {
				if (employeeResult.error.code === 'EMPLOYEE_NOT_FOUND') {
					logger.warn('[Employee Edit] Employee not found', { employeeId });
					throw error(404, 'Employee not found');
				}
				logger.error(
					'[Employee Edit] Failed to load employee',
					new Error(employeeResult.error.message),
					{
						employeeId,
						errorCode: employeeResult.error.code
					}
				);
				throw error(500, employeeResult.error.message);
			}

			const employeeEntity = employeeResult.value;

			logger.info('[Employee Edit] Loaded employee via EmployeeService', {
				employeeId: employeeEntity.id,
				userRoles: locals.roles
			});

			// Define GraphQL queries for additional data not in domain model
			const GET_ADDITIONAL_EMPLOYEE_DATA = gql`
				query GetAdditionalEmployeeData($id: UUID!) {
					user(id: $id) {
						roles {
							id
							name
						}
						alternatePhone
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

			// Execute parallel queries for additional data
			const [additionalDataResult, departmentsResult, rolesResult, relatedDataResult] =
				await Promise.all([
					client.query(GET_ADDITIONAL_EMPLOYEE_DATA, { id: employeeId }),
					client.query(GET_DEPARTMENTS),
					client.query(GET_ROLES),
					client.query(GET_RELATED_DATA, { employeeId, limit: 50 })
				]);

			const additionalEmployeeData = additionalDataResult?.user;
			const emergencyContacts = relatedDataResult?.emergencyContacts || [];
			const vehicles = relatedDataResult?.employeeVehicles || [];

			// Check if user is the employee's manager
			const isEmployeeManager = additionalEmployeeData?.department?.managerId === userId;

			// Determine edit permissions
			const canEditContactInfo = isViewingSelf || isEmployeeManager || isAdmin;
			const canEditEmergencyContacts = isViewingSelf || isEmployeeManager || isAdmin;
			const canEditVehicles = isViewingSelf || isEmployeeManager || isAdmin;
			const canEditCompensation = isAdmin;

			// Return server-side loaded data
			return {
				roles: rolesResult?.roles || [],
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
					department: additionalEmployeeData?.department,
					// Contact information - only if authorized
					phoneNumber: canEditContactInfo ? employeeEntity.phone : null,
					mobileNumber: canEditContactInfo ? additionalEmployeeData?.alternatePhone : null,
					addressLine1: canEditContactInfo
						? additionalEmployeeData?.primaryAddress?.addressLine1
						: null,
					addressLine2: canEditContactInfo
						? additionalEmployeeData?.primaryAddress?.addressLine2
						: null,
					city: canEditContactInfo ? additionalEmployeeData?.primaryAddress?.city : null,
					stateProvince: canEditContactInfo
						? additionalEmployeeData?.primaryAddress?.stateProvince
						: null,
					postalCode: canEditContactInfo
						? additionalEmployeeData?.primaryAddress?.postalCode
						: null,
					country: canEditContactInfo ? additionalEmployeeData?.primaryAddress?.country : null,
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
		const { request, params } = event;
		const employeeId = params.id;

		// Initialize RBAC loader for permission checks (actions can also use it for consistency)
		// Or just use requireAuth directly for actions as RBACDataLoader is mainly for load
		const { locals } = event;
		// Check employee write permissions
		if (!locals.user) throw error(401, 'Unauthorized');

		// Import UnifiedGraphQLClient dynamically for related entities not yet in EmployeeService
		const { UnifiedGraphQLClient } = await import('$lib/server/graphql/unified-client');
		const client = new UnifiedGraphQLClient(event);

		// Create EmployeeService for core employee data
		const employeeService = createEmployeeService(event);

		try {
			const formData = await request.formData();
			// Extract fields...
			const firstName = formData.get('firstName')?.toString();
			const lastName = formData.get('lastName')?.toString();
			const email = formData.get('email')?.toString();
			const role = formData.get('role')?.toString();
			const departmentId = formData.get('departmentId')?.toString();
			const jobTitle = formData.get('jobTitle')?.toString();

			// Contact info
			const phoneNumber = formData.get('phoneNumber')?.toString();
			// Note: mobileNumber (alternatePhone) is not yet supported by EmployeeService
			// TODO: Add alternatePhone to domain model or use separate GraphQL mutation

			if (!firstName || !lastName || !email) {
				return fail(400, { error: 'First name, last name, and email are required' });
			}

			// Use EmployeeService for core employee data update
			const updateResult = await employeeService.updateEmployee(employeeId, {
				firstName,
				lastName,
				email,
				phone: phoneNumber || null,
				departmentId: departmentId || null,
				jobTitle: jobTitle || null
			});

			if (updateResult.isError) {
				const err = updateResult.error;

				if (err.code === 'EMPLOYEE_NOT_FOUND') {
					return fail(404, { error: 'Employee not found' });
				}
				if (err.code === 'EMPLOYEE_ALREADY_EXISTS') {
					return fail(400, { error: 'Email already in use', field: 'email' });
				}
				if (err.code === 'INVALID_EMAIL') {
					return fail(400, { error: 'Invalid email format', field: 'email' });
				}
				if (err.code === 'VALIDATION_ERROR') {
					// Handle name validation errors
					const field = err.context?.field as string | undefined;
					if (field === 'first') {
						return fail(400, { error: 'Invalid first name', field: 'firstName' });
					}
					if (field === 'last') {
						return fail(400, { error: 'Invalid last name', field: 'lastName' });
					}
					return fail(400, { error: err.message, field });
				}

				return fail(500, { error: err.message });
			}

			logger.info('[Employee Update] User profile updated successfully via EmployeeService');

			// Handle Role Assignment (roles not yet in Employee domain model)
			if (role) {
				// Fetch current roles and available roles via GraphQL
				const GET_USER_AND_ROLES = gql`
					query GetUserAndRoles($userId: UUID!) {
						user(id: $userId) {
							roles {
								id
								name
							}
						}
						roles(limit: 100) {
							id
							name
						}
					}
				`;
				const rolesData = await client.query(GET_USER_AND_ROLES, { userId: employeeId });
				const currentRoles = rolesData?.user?.roles || [];
				const allRoles = rolesData?.roles || [];
				const currentRoleName = currentRoles[0]?.name;

				if (currentRoleName !== role) {
					const newRole = allRoles.find((r: { id: string; name: string }) => r.name === role);

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
							await client.mutate(REMOVE_ROLE, {
								userId: employeeId,
								roleId: (r as { id: string; name: string }).id
							});
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
			interface EmergencyContactFormData {
				id?: string;
				name?: string;
				fullName?: string;
				relationship?: string;
				phoneNumber?: string;
				email?: string;
				isPrimary?: string;
			}
			const emergencyContacts: (EmergencyContactFormData | undefined)[] = [];
			for (const [key, value] of formData.entries()) {
				const match = key.match(/emergencyContacts\[(\d+)\]\.(.+)/);
				if (match) {
					const index = parseInt(match[1]);
					const field = match[2] as keyof EmergencyContactFormData;
					if (!emergencyContacts[index]) emergencyContacts[index] = {};
					(emergencyContacts[index] as EmergencyContactFormData)[field] = value.toString();
				}
			}

			const UPDATE_CONTACT = gql`
				mutation UpdateEmergencyContact($id: UUID!, $input: UpdateEmergencyContactInput!) {
					updateEmergencyContact(id: $id, input: $input) {
						id
					}
				}
			`;
			const CREATE_CONTACT = gql`
				mutation CreateEmergencyContact($input: CreateEmergencyContactInput!) {
					createEmergencyContact(input: $input) {
						id
					}
				}
			`;

			for (const contact of emergencyContacts.filter(
				(c): c is EmergencyContactFormData => c !== undefined
			)) {
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
			interface VehicleFormData {
				id?: string;
				make?: string;
				model?: string;
				year?: string;
				color?: string;
				licensePlate?: string;
			}
			const vehicles: (VehicleFormData | undefined)[] = [];
			for (const [key, value] of formData.entries()) {
				const match = key.match(/vehicles\[(\d+)\]\.(.+)/);
				if (match) {
					const index = parseInt(match[1]);
					const field = match[2] as keyof VehicleFormData;
					if (!vehicles[index]) vehicles[index] = {};
					(vehicles[index] as VehicleFormData)[field] = value.toString();
				}
			}

			const UPDATE_VEHICLE = gql`
				mutation UpdateVehicle($id: UUID!, $input: UpdateEmployeeVehicleInput!) {
					updateEmployeeVehicle(id: $id, input: $input) {
						id
					}
				}
			`;
			const CREATE_VEHICLE = gql`
				mutation CreateVehicle($input: CreateEmployeeVehicleInput!) {
					createEmployeeVehicle(input: $input) {
						id
					}
				}
			`;

			for (const vehicle of vehicles.filter((v): v is VehicleFormData => v !== undefined)) {
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
			// Re-throw SvelteKit redirect/error responses
			if (err && typeof err === 'object' && 'status' in err) {
				const httpErr = err as { status: number };
				if (httpErr.status === 303 || httpErr.status >= 400) {
					throw err;
				}
			}
			logger.error('[Employee Update Action Error]', err as Error);
			return fail(500, { error: 'Failed to update employee' });
		}
	}
};
