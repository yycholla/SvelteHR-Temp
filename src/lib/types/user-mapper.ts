/**
 * User Type Mapper
 *
 * Handles conversion between GraphQL API snake_case properties and client-side camelCase properties.
 * This mapper resolves the ~100+ errors caused by property naming mismatches.
 */

/**
 * UserGraphQL - Matches GraphQL API snake_case response structure
 * This represents the raw data returned from GraphQL queries
 */
export interface UserGraphQL {
	id: string;
	email: string;
	password_hash?: string;
	first_name?: string;
	last_name?: string;
	display_name?: string;
	full_name?: string;
	role?: string;
	phone_number?: string;
	alternate_phone?: string;
	job_title?: string;
	status?: string;
	department_id?: string;
	manager_id?: string;
	hire_date?: string;
	termination_date?: string;
	is_active?: boolean;
	failed_login_attempts?: number;
	locked_until?: string;
	last_login?: string;
	created_at?: string;
	updated_at?: string;
	deleted_at?: string;
	profile_image?: string;
	onboarding_status?: string;

	// Nested objects (also snake_case)
	job_info?: JobInfoGraphQL;
	contact_info?: ContactInfoGraphQL;
	personal_info?: PersonalInfoGraphQL;
	emergency_contacts?: EmergencyContactGraphQL[];
	addresses?: UserAddressGraphQL[];

	// Related entities
	department?: DepartmentGraphQL;
	manager?: UserGraphQL;
	role_assignments?: RoleAssignmentGraphQL[];
}

/**
 * JobInfoGraphQL - Job information from GraphQL (snake_case)
 */
export interface JobInfoGraphQL {
	title?: string;
	department?: string;
	manager?: string;
	hire_date?: string;
	employment_type?: string;
	salary?: number;
	currency?: string;
	is_remote?: boolean;
	pay_type?: string;
	start_date?: string;
	end_date?: string;
	job_title?: string;
	department_id?: string;
	manager_id?: string;
	employee_id?: string;
	reports_to?: string;
}

/**
 * ContactInfoGraphQL - Contact information from GraphQL (snake_case)
 */
export interface ContactInfoGraphQL {
	phone_number?: string;
	address?: string;
	emergency_contact_name?: string;
	emergency_contact_phone?: string;
	address_line_1?: string;
	address_line_2?: string;
	city?: string;
	state_province?: string;
	postal_code?: string;
	country?: string;
	employee_id?: string;
}

/**
 * PersonalInfoGraphQL - Personal information from GraphQL (snake_case)
 */
export interface PersonalInfoGraphQL {
	date_of_birth?: string;
	gender?: string;
	nationality?: string;
	marital_status?: string;
	social_security_number?: string;
	dependents?: number;
	pronouns?: string;
}

/**
 * EmergencyContactGraphQL - Emergency contact from GraphQL (snake_case)
 */
export interface EmergencyContactGraphQL {
	id: string;
	employee_id?: string;
	name: string;
	relationship: string;
	phone_number: string;
	email?: string;
	is_primary?: boolean;
}

/**
 * UserAddressGraphQL - User address from GraphQL (snake_case)
 */
export interface UserAddressGraphQL {
	id?: string;
	address_type?: string;
	is_primary?: boolean;
	address_line_1?: string;
	address_line_2?: string;
	city?: string;
	state_province?: string;
	postal_code?: string;
	country?: string;
	latitude?: number;
	longitude?: number;
}

/**
 * DepartmentGraphQL - Department from GraphQL (snake_case)
 */
export interface DepartmentGraphQL {
	id: string;
	name: string;
	code?: string;
	description?: string;
	manager_id?: string;
	parent_department_id?: string;
	created_at?: string;
	updated_at?: string;
	is_active?: boolean;
	manager?: UserGraphQL;
	parent_department?: DepartmentGraphQL;
}

/**
 * RoleAssignmentGraphQL - Role assignment from GraphQL (snake_case)
 */
export interface RoleAssignmentGraphQL {
	role: {
		id: string;
		name: string;
		level?: number;
		description?: string;
		display_name?: string;
	};
}

/**
 * UserClient - Client-side camelCase interface used by components
 * This is what Svelte components expect to work with
 */
export interface UserClient {
	id: string;
	email: string;
	passwordHash?: string;
	firstName?: string;
	lastName?: string;
	displayName?: string;
	fullName?: string;
	name?: string; // Alias for displayName or fullName
	username?: string; // Login username
	role?: string;
	roles?: Array<{ id: string; name: string; displayName?: string }>;
	phoneNumber?: string;
	alternatePhone?: string;
	jobTitle?: string;
	status?: string;
	departmentId?: string;
	managerId?: string;
	hireDate?: string;
	terminationDate?: string;
	isActive?: boolean;
	failedLoginAttempts?: number;
	lockedUntil?: string;
	lastLogin?: string;
	createdAt?: string;
	updatedAt?: string;
	deletedAt?: string;
	profileImage?: string;
	onboardingStatus?: string;

	// Nested objects (camelCase)
	jobInfo?: JobInfoClient;
	contactInfo?: ContactInfoClient;
	personalInfo?: PersonalInfoClient;
	emergencyContact?: EmergencyContactClient;
	emergencyContacts?: EmergencyContactClient[];
	addresses?: UserAddressClient[];
	address?: {
		street?: string;
		city?: string;
		state?: string;
		zipCode?: string;
		country?: string;
	};

	// Related entities
	department?: DepartmentClient;
	manager?: UserClient;
	roleAssignments?: Array<{
		role: {
			id: string;
			name: string;
		};
	}>;

	// Job information convenience access
	job_information?: {
		title?: string;
		department?: {
			id: string;
			name: string;
		};
		hire_date?: string;
		employment_type?: string;
	};
}

/**
 * JobInfoClient - Job information for client-side (camelCase)
 */
export interface JobInfoClient {
	title?: string;
	department?: string;
	manager?: string;
	hireDate?: string;
	employmentType?: string;
	salary?: number;
	currency?: string;
	isRemote?: boolean;
	payType?: string;
	startDate?: string;
	endDate?: string;
	jobTitle?: string;
	departmentId?: string;
	managerId?: string;
	employeeId?: string;
	reportsTo?: string;
}

/**
 * ContactInfoClient - Contact information for client-side (camelCase)
 */
export interface ContactInfoClient {
	phoneNumber?: string;
	address?: string;
	emergencyContactName?: string;
	emergencyContactPhone?: string;
	addressLine1?: string;
	addressLine2?: string;
	city?: string;
	stateProvince?: string;
	postalCode?: string;
	country?: string;
	employeeId?: string;
}

/**
 * PersonalInfoClient - Personal information for client-side (camelCase)
 */
export interface PersonalInfoClient {
	dateOfBirth?: string;
	gender?: string;
	nationality?: string;
	maritalStatus?: string;
	socialSecurityNumber?: string;
	dependents?: number;
	pronouns?: string;
}

/**
 * EmergencyContactClient - Emergency contact for client-side (camelCase)
 */
export interface EmergencyContactClient {
	id: string;
	employeeId?: string;
	name: string;
	relationship: string;
	phoneNumber: string;
	phone?: string; // Alias for phoneNumber
	email?: string;
	isPrimary?: boolean;
}

/**
 * UserAddressClient - User address for client-side (camelCase)
 */
export interface UserAddressClient {
	id?: string;
	addressType?: string;
	isPrimary?: boolean;
	addressLine1?: string;
	street?: string; // Alias for addressLine1
	addressLine2?: string;
	city?: string;
	stateProvince?: string;
	state?: string; // Alias for stateProvince
	postalCode?: string;
	zipCode?: string; // Alias for postalCode
	country?: string;
	latitude?: number;
	longitude?: number;
}

/**
 * DepartmentClient - Department for client-side (camelCase)
 */
export interface DepartmentClient {
	id: string;
	name: string;
	code?: string;
	description?: string;
	managerId?: string;
	parentDepartmentId?: string;
	createdAt?: string;
	updatedAt?: string;
	isActive?: boolean;
	manager?: UserClient;
	parentDepartment?: DepartmentClient;
	employeeCount?: number;
	budgetLimit?: number;
	costCenter?: string;
	location?: string;
	isRemoteEnabled?: boolean;
}

/**
 * Maps a GraphQL User (snake_case) to a Client User (camelCase)
 *
 * @param user - User data from GraphQL API with snake_case properties
 * @returns User data with camelCase properties for client-side use
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
 * Maps JobInfo from GraphQL (snake_case) to Client (camelCase)
 */
export function mapJobInfoFromGraphQL(jobInfo: JobInfoGraphQL): JobInfoClient {
	return {
		title: jobInfo.title,
		department: jobInfo.department,
		manager: jobInfo.manager,
		hireDate: jobInfo.hire_date,
		employmentType: jobInfo.employment_type,
		salary: jobInfo.salary,
		currency: jobInfo.currency,
		isRemote: jobInfo.is_remote,
		payType: jobInfo.pay_type,
		startDate: jobInfo.start_date,
		endDate: jobInfo.end_date,
		jobTitle: jobInfo.job_title,
		departmentId: jobInfo.department_id,
		managerId: jobInfo.manager_id,
		employeeId: jobInfo.employee_id,
		reportsTo: jobInfo.reports_to
	};
}

/**
 * Maps ContactInfo from GraphQL (snake_case) to Client (camelCase)
 */
export function mapContactInfoFromGraphQL(contactInfo: ContactInfoGraphQL): ContactInfoClient {
	return {
		phoneNumber: contactInfo.phone_number,
		address: contactInfo.address,
		emergencyContactName: contactInfo.emergency_contact_name,
		emergencyContactPhone: contactInfo.emergency_contact_phone,
		addressLine1: contactInfo.address_line_1,
		addressLine2: contactInfo.address_line_2,
		city: contactInfo.city,
		stateProvince: contactInfo.state_province,
		postalCode: contactInfo.postal_code,
		country: contactInfo.country,
		employeeId: contactInfo.employee_id
	};
}

/**
 * Maps PersonalInfo from GraphQL (snake_case) to Client (camelCase)
 */
export function mapPersonalInfoFromGraphQL(personalInfo: PersonalInfoGraphQL): PersonalInfoClient {
	return {
		dateOfBirth: personalInfo.date_of_birth,
		gender: personalInfo.gender,
		nationality: personalInfo.nationality,
		maritalStatus: personalInfo.marital_status,
		socialSecurityNumber: personalInfo.social_security_number,
		dependents: personalInfo.dependents,
		pronouns: personalInfo.pronouns
	};
}

/**
 * Maps EmergencyContact from GraphQL (snake_case) to Client (camelCase)
 */
export function mapEmergencyContactFromGraphQL(
	contact: EmergencyContactGraphQL
): EmergencyContactClient {
	return {
		id: contact.id,
		employeeId: contact.employee_id,
		name: contact.name,
		relationship: contact.relationship,
		phoneNumber: contact.phone_number,
		phone: contact.phone_number, // Alias
		email: contact.email,
		isPrimary: contact.is_primary
	};
}

/**
 * Maps UserAddress from GraphQL (snake_case) to Client (camelCase)
 */
export function mapUserAddressFromGraphQL(address: UserAddressGraphQL): UserAddressClient {
	return {
		id: address.id,
		addressType: address.address_type,
		isPrimary: address.is_primary,
		addressLine1: address.address_line_1,
		street: address.address_line_1, // Alias
		addressLine2: address.address_line_2,
		city: address.city,
		stateProvince: address.state_province,
		state: address.state_province, // Alias
		postalCode: address.postal_code,
		zipCode: address.postal_code, // Alias
		country: address.country,
		latitude: address.latitude,
		longitude: address.longitude
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
 * Useful for mutations and form submissions
 *
 * @param user - User data with camelCase properties
 * @returns User data with snake_case properties for GraphQL mutations
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
 * Maps JobInfo from Client (camelCase) to GraphQL (snake_case)
 */
export function mapJobInfoToGraphQL(jobInfo: JobInfoClient): JobInfoGraphQL {
	return {
		title: jobInfo.title,
		department: jobInfo.department,
		manager: jobInfo.manager,
		hire_date: jobInfo.hireDate,
		employment_type: jobInfo.employmentType,
		salary: jobInfo.salary,
		currency: jobInfo.currency,
		is_remote: jobInfo.isRemote,
		pay_type: jobInfo.payType,
		start_date: jobInfo.startDate,
		end_date: jobInfo.endDate,
		job_title: jobInfo.jobTitle,
		department_id: jobInfo.departmentId,
		manager_id: jobInfo.managerId,
		employee_id: jobInfo.employeeId,
		reports_to: jobInfo.reportsTo
	};
}

/**
 * Maps ContactInfo from Client (camelCase) to GraphQL (snake_case)
 */
export function mapContactInfoToGraphQL(contactInfo: ContactInfoClient): ContactInfoGraphQL {
	return {
		phone_number: contactInfo.phoneNumber,
		address: contactInfo.address,
		emergency_contact_name: contactInfo.emergencyContactName,
		emergency_contact_phone: contactInfo.emergencyContactPhone,
		address_line_1: contactInfo.addressLine1,
		address_line_2: contactInfo.addressLine2,
		city: contactInfo.city,
		state_province: contactInfo.stateProvince,
		postal_code: contactInfo.postalCode,
		country: contactInfo.country,
		employee_id: contactInfo.employeeId
	};
}

/**
 * Maps PersonalInfo from Client (camelCase) to GraphQL (snake_case)
 */
export function mapPersonalInfoToGraphQL(personalInfo: PersonalInfoClient): PersonalInfoGraphQL {
	return {
		date_of_birth: personalInfo.dateOfBirth,
		gender: personalInfo.gender,
		nationality: personalInfo.nationality,
		marital_status: personalInfo.maritalStatus,
		social_security_number: personalInfo.socialSecurityNumber,
		dependents: personalInfo.dependents,
		pronouns: personalInfo.pronouns
	};
}

/**
 * Maps EmergencyContact from Client (camelCase) to GraphQL (snake_case)
 */
export function mapEmergencyContactToGraphQL(
	contact: EmergencyContactClient
): EmergencyContactGraphQL {
	return {
		id: contact.id,
		employee_id: contact.employeeId,
		name: contact.name,
		relationship: contact.relationship,
		phone_number: contact.phoneNumber,
		email: contact.email,
		is_primary: contact.isPrimary
	};
}

/**
 * Maps UserAddress from Client (camelCase) to GraphQL (snake_case)
 */
export function mapUserAddressToGraphQL(address: UserAddressClient): UserAddressGraphQL {
	return {
		id: address.id,
		address_type: address.addressType,
		is_primary: address.isPrimary,
		address_line_1: address.addressLine1 || address.street,
		address_line_2: address.addressLine2,
		city: address.city,
		state_province: address.stateProvince || address.state,
		postal_code: address.postalCode || address.zipCode,
		country: address.country,
		latitude: address.latitude,
		longitude: address.longitude
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
