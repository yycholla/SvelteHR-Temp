/**
 * Date utility functions for safe date handling and formatting
 */

/**
 * Safely parse and format a date string
 * @param dateString - The date string from the API
 * @param options - Intl.DateTimeFormat options
 * @returns Formatted date string or fallback text
 */
export function formatDate(
	dateString: string | null | undefined,
	options: Intl.DateTimeFormatOptions = {
		year: 'numeric',
		month: 'short',
		day: 'numeric'
	}
): string {
	if (!dateString) {
		return 'Not provided';
	}

	try {
		const date = new Date(dateString);
		
		// Check if date is valid
		if (isNaN(date.getTime())) {
			return 'Invalid date';
		}
		
		return date.toLocaleDateString('en-US', options);
	} catch (error) {
		console.warn('Failed to format date:', dateString, error);
		return 'Invalid date';
	}
}

/**
 * Format date for display with fallback
 * @param dateString - The date string from the API
 * @param fallback - Fallback text if date is invalid
 * @returns Formatted date string or fallback
 */
export function formatDateWithFallback(
	dateString: string | null | undefined,
	fallback: string = 'Not provided'
): string {
	if (!dateString) {
		return fallback;
	}

	try {
		const date = new Date(dateString);
		if (isNaN(date.getTime())) {
			return fallback;
		}
		return date.toLocaleDateString('en-US', {
			year: 'numeric',
			month: 'short',
			day: 'numeric'
		});
	} catch {
		return fallback;
	}
}

/**
 * Format hire date specifically
 * @param hireDate - The hire date from employee data
 * @returns Formatted hire date or appropriate fallback
 */
export function formatHireDate(hireDate: string | null | undefined): string {
	return formatDateWithFallback(hireDate, 'Hire date not set');
}

/**
 * Calculate tenure in years
 * @param hireDate - The hire date from employee data
 * @returns Tenure in years or 0 if invalid
 */
export function calculateTenure(hireDate: string | null | undefined): number {
	if (!hireDate) return 0;
	
	try {
		const hire = new Date(hireDate);
		if (isNaN(hire.getTime())) return 0;
		
		const now = new Date();
		const diffInMs = now.getTime() - hire.getTime();
		const years = diffInMs / (365.25 * 24 * 60 * 60 * 1000);
		
		return Math.floor(Math.max(0, years));
	} catch {
		return 0;
	}
}

/**
 * Format tenure for display
 * @param hireDate - The hire date from employee data
 * @returns Formatted tenure string
 */
export function formatTenure(hireDate: string | null | undefined): string {
	const years = calculateTenure(hireDate);
	if (years === 0) return 'New hire';
	if (years === 1) return '1 year';
	return `${years} years`;
}

/**
 * Format relative time (e.g., "2 days ago")
 * @param dateString - The date string from the API
 * @returns Relative time string
 */
export function formatRelativeTime(dateString: string | null | undefined): string {
	if (!dateString) return 'Unknown';

	try {
		const date = new Date(dateString);
		if (isNaN(date.getTime())) return 'Invalid date';

		const now = new Date();
		const diffInMs = now.getTime() - date.getTime();
		const diffInDays = Math.floor(diffInMs / (24 * 60 * 60 * 1000));
		const diffInHours = Math.floor(diffInMs / (60 * 60 * 1000));
		const diffInMinutes = Math.floor(diffInMs / (60 * 1000));

		if (diffInDays > 7) {
			return formatDate(dateString);
		} else if (diffInDays > 0) {
			return `${diffInDays} day${diffInDays === 1 ? '' : 's'} ago`;
		} else if (diffInHours > 0) {
			return `${diffInHours} hour${diffInHours === 1 ? '' : 's'} ago`;
		} else if (diffInMinutes > 0) {
			return `${diffInMinutes} minute${diffInMinutes === 1 ? '' : 's'} ago`;
		} else {
			return 'Just now';
		}
	} catch {
		return 'Unknown';
	}
}

/**
 * Check if a date string is valid
 * @param dateString - The date string to check
 * @returns True if valid date
 */
export function isValidDate(dateString: string | null | undefined): boolean {
	if (!dateString) return false;
	
	try {
		const date = new Date(dateString);
		return !isNaN(date.getTime());
	} catch {
		return false;
	}
}

/**
 * Format date for input fields (YYYY-MM-DD)
 * @param dateString - The date string from the API
 * @returns Date string in YYYY-MM-DD format
 */
export function formatDateForInput(dateString: string | null | undefined): string {
	if (!dateString) return '';
	
	try {
		const date = new Date(dateString);
		if (isNaN(date.getTime())) return '';
		
		return date.toISOString().split('T')[0];
	} catch {
		return '';
	}
}

/**
 * Format datetime for display
 * @param dateString - The datetime string from the API
 * @returns Formatted datetime string
 */
export function formatDateTime(dateString: string | null | undefined): string {
	return formatDate(dateString, {
		year: 'numeric',
		month: 'short',
		day: 'numeric',
		hour: 'numeric',
		minute: 'numeric'
	});
}

/**
 * Get age from birth date
 * @param birthDate - The birth date string
 * @returns Age in years or null if invalid
 */
export function calculateAge(birthDate: string | null | undefined): number | null {
	if (!birthDate) return null;
	
	try {
		const birth = new Date(birthDate);
		if (isNaN(birth.getTime())) return null;
		
		const now = new Date();
		let age = now.getFullYear() - birth.getFullYear();
		const monthDiff = now.getMonth() - birth.getMonth();
		
		if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < birth.getDate())) {
			age--;
		}
		
		return Math.max(0, age);
	} catch {
		return null;
	}
}