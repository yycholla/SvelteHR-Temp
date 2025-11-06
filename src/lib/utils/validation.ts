// Validation utilities for form validation and data validation

export interface ValidationRule {
	required?: boolean;
	minLength?: number;
	maxLength?: number;
	pattern?: RegExp;
	min?: number;
	max?: number;
	custom?: (value: any) => boolean | string;
}

export interface ValidationResult {
	isValid: boolean;
	errors: Record<string, string>;
}

export interface FormField {
	name: string;
	label: string;
	value?: any;
	error?: string;
	rules?: ValidationRule;
}

/**
 * Validate a single field against its rules
 */
export function validateField(value: any, rules: ValidationRule): string | null {
	if (rules.required && (value === null || value === undefined || value === '')) {
		return 'This field is required';
	}

	// Skip other validations if value is empty and not required
	if (value === null || value === undefined || value === '') {
		return null;
	}

	if (rules.minLength && typeof value === 'string' && value.length < rules.minLength) {
		return `Must be at least ${rules.minLength} characters`;
	}

	if (rules.maxLength && typeof value === 'string' && value.length > rules.maxLength) {
		return `Must be no more than ${rules.maxLength} characters`;
	}

	if (rules.pattern && typeof value === 'string' && !rules.pattern.test(value)) {
		return 'Invalid format';
	}

	if (rules.min !== undefined && typeof value === 'number' && value < rules.min) {
		return `Must be at least ${rules.min}`;
	}

	if (rules.max !== undefined && typeof value === 'number' && value > rules.max) {
		return `Must be no more than ${rules.max}`;
	}

	if (rules.custom) {
		const result = rules.custom(value);
		if (result === false) {
			return 'Invalid value';
		}
		if (typeof result === 'string') {
			return result;
		}
	}

	return null;
}

/**
 * Validate an entire form
 */
export function validateForm(fields: Record<string, FormField>): ValidationResult {
	const errors: Record<string, string> = {};
	let isValid = true;

	for (const [name, field] of Object.entries(fields)) {
		if (field.rules) {
			const error = validateField(field.value, field.rules);
			if (error) {
				errors[name] = error;
				isValid = false;
			}
		}
	}

	return { isValid, errors };
}

/**
 * Common validation rules
 */
export const validationRules = {
	required: { required: true },
	email: {
		required: true,
		pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/
	},
	phone: {
		pattern: /^\+?[\d\s\-\(\)]+$/
	},
	password: {
		required: true,
		minLength: 8,
		pattern: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/
	},
	name: {
		required: true,
		minLength: 2,
		maxLength: 50
	},
	departmentName: {
		required: true,
		minLength: 2,
		maxLength: 100
	}
};

/**
 * Validate email address
 */
export function isValidEmail(email: string): boolean {
	return validationRules.email.pattern!.test(email);
}

/**
 * Validate password strength
 */
export function isValidPassword(password: string): boolean {
	return validationRules.password.pattern!.test(password);
}

/**
 * Validate phone number (basic validation)
 */
export function isValidPhone(phone: string): boolean {
	return validationRules.phone.pattern!.test(phone);
}

/**
 * Sanitize input to prevent XSS
 */
export function sanitizeInput(input: string): string {
	return input
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&#x27;')
		.replace(/\//g, '&#x2F;');
}

/**
 * Validate date string
 */
export function isValidDate(dateString: string): boolean {
	const date = new Date(dateString);
	return !isNaN(date.getTime());
}

/**
 * Validate UUID format
 */
export function isValidUUID(uuid: string): boolean {
	const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
	return uuidRegex.test(uuid);
}
