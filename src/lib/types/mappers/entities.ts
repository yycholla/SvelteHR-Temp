import type { UserGraphQL, UserClient, DepartmentGraphQL, DepartmentClient } from './types';
import { mapJobInfoFromGraphQL, mapJobInfoToGraphQL } from './job-info';
import {
	mapContactInfoFromGraphQL,
	mapContactInfoToGraphQL,
	mapPersonalInfoFromGraphQL,
	mapPersonalInfoToGraphQL,
	mapEmergencyContactFromGraphQL,
	mapEmergencyContactToGraphQL,
	mapUserAddressFromGraphQL,
	mapUserAddressToGraphQL
} from './contact-info';

/**
 * Maps a GraphQL User (snake_case) to a Client User (camelCase)
 */
export function mapUserFromGraphQL(user: UserGraphQL): UserClient {
	return {
		id: user.id,
		email: user.email,
		passwordHash: user.password_hash,
		firstName: user.first_name,
		lastName: user.last_name,
		displayName: user.display_name,
		fullName: user.full_name,
		name: user.display_name || user.full_name,
		role: user.role,
		roles: user.role_assignments?.map((ra) => ({
			id: ra.role.id,
			name: ra.role.name,
			displayName: ra.role.display_name
		})),
		phoneNumber: user.phone_number,
		alternatePhone: user.alternate_phone,
		jobTitle: user.job_title,
		status: user.status,
		departmentId: user.department_id,
		managerId: user.manager_id,
		hireDate: user.hire_date,
		terminationDate: user.termination_date,
		isActive: user.is_active,
		failedLoginAttempts: user.failed_login_attempts,
		lockedUntil: user.locked_until,
		lastLogin: user.last_login,
		createdAt: user.created_at,
		updatedAt: user.updated_at,
		deletedAt: user.deleted_at,
		profileImage: user.profile_image,
		onboardingStatus: user.onboarding_status,

		// Map nested objects
		jobInfo: user.job_info ? mapJobInfoFromGraphQL(user.job_info) : undefined,
		contactInfo: user.contact_info ? mapContactInfoFromGraphQL(user.contact_info) : undefined,
		personalInfo: user.personal_info ? mapPersonalInfoFromGraphQL(user.personal_info) : undefined,
		emergencyContacts: user.emergency_contacts?.map(mapEmergencyContactFromGraphQL),
		emergencyContact: user.emergency_contacts?.[0]
			? mapEmergencyContactFromGraphQL(user.emergency_contacts[0])
			: undefined,
		addresses: user.addresses?.map(mapUserAddressFromGraphQL),
		address: user.addresses?.[0]
			? {
					street: user.addresses[0].address_line_1,
					city: user.addresses[0].city,
					state: user.addresses[0].state_province,
					zipCode: user.addresses[0].postal_code,
					country: user.addresses[0].country
				}
			: undefined,

		// Map related entities
		department: user.department ? mapDepartmentFromGraphQL(user.department) : undefined,
		manager: user.manager ? mapUserFromGraphQL(user.manager) : undefined,
		roleAssignments: user.role_assignments?.map((ra) => ({
			role: {
				id: ra.role.id,
				name: ra.role.name
			}
		})),

		// Job information convenience access
		job_information: user.job_info
			? {
					title: user.job_info.title,
					department: user.department
						? {
								id: user.department.id,
								name: user.department.name
							}
						: undefined,
					hire_date: user.job_info.hire_date,
					employment_type: user.job_info.employment_type
				}
			: undefined
	};
}

/**
 * Maps Department from GraphQL (snake_case) to Client (camelCase)
 */
export function mapDepartmentFromGraphQL(department: DepartmentGraphQL): DepartmentClient {
	return {
		id: department.id,
		name: department.name,
		code: department.code,
		description: department.description,
		managerId: department.manager_id,
		parentDepartmentId: department.parent_department_id,
		createdAt: department.created_at,
		updatedAt: department.updated_at,
		isActive: department.is_active,
		manager: department.manager ? mapUserFromGraphQL(department.manager) : undefined,
		parentDepartment: department.parent_department
			? mapDepartmentFromGraphQL(department.parent_department)
			: undefined
	};
}

/**
 * Maps a Client User (camelCase) back to GraphQL User (snake_case)
 */
export function mapUserToGraphQL(user: UserClient): UserGraphQL {
	return {
		id: user.id,
		email: user.email,
		password_hash: user.passwordHash,
		first_name: user.firstName,
		last_name: user.lastName,
		display_name: user.displayName,
		full_name: user.fullName,
		role: user.role,
		phone_number: user.phoneNumber,
		alternate_phone: user.alternatePhone,
		job_title: user.jobTitle,
		status: user.status,
		department_id: user.departmentId,
		manager_id: user.managerId,
		hire_date: user.hireDate,
		termination_date: user.terminationDate,
		is_active: user.isActive,
		failed_login_attempts: user.failedLoginAttempts,
		locked_until: user.lockedUntil,
		last_login: user.lastLogin,
		created_at: user.createdAt,
		updated_at: user.updatedAt,
		deleted_at: user.deletedAt,
		profile_image: user.profileImage,
		onboarding_status: user.onboardingStatus,

		// Map nested objects back to snake_case
		job_info: user.jobInfo ? mapJobInfoToGraphQL(user.jobInfo) : undefined,
		contact_info: user.contactInfo ? mapContactInfoToGraphQL(user.contactInfo) : undefined,
		personal_info: user.personalInfo ? mapPersonalInfoToGraphQL(user.personalInfo) : undefined,
		emergency_contacts: user.emergencyContacts?.map(mapEmergencyContactToGraphQL),
		addresses: user.addresses?.map(mapUserAddressToGraphQL),

		department: user.department ? mapDepartmentToGraphQL(user.department) : undefined,
		manager: user.manager ? mapUserToGraphQL(user.manager) : undefined,
		role_assignments: user.roleAssignments?.map((ra) => ({
			role: {
				id: ra.role.id,
				name: ra.role.name
			}
		}))
	};
}

/**
 * Maps Department from Client (camelCase) to GraphQL (snake_case)
 */
export function mapDepartmentToGraphQL(department: DepartmentClient): DepartmentGraphQL {
	return {
		id: department.id,
		name: department.name,
		code: department.code,
		description: department.description,
		manager_id: department.managerId,
		parent_department_id: department.parentDepartmentId,
		created_at: department.createdAt,
		updated_at: department.updatedAt,
		is_active: department.isActive,
		manager: department.manager ? mapUserToGraphQL(department.manager) : undefined,
		parent_department: department.parentDepartment
			? mapDepartmentToGraphQL(department.parentDepartment)
			: undefined
	};
}

/**
 * Utility function to map an array of GraphQL users to Client users
 */
export function mapUsersFromGraphQL(users: UserGraphQL[]): UserClient[] {
	return users.map(mapUserFromGraphQL);
}

/**
 * Utility function to map an array of Client users to GraphQL users
 */
export function mapUsersToGraphQL(users: UserClient[]): UserGraphQL[] {
	return users.map(mapUserToGraphQL);
}
