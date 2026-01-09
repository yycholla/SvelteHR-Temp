import type {
	ContactInfoGraphQL,
	ContactInfoClient,
	PersonalInfoGraphQL,
	PersonalInfoClient,
	EmergencyContactGraphQL,
	EmergencyContactClient,
	UserAddressGraphQL,
	UserAddressClient
} from './types';

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
