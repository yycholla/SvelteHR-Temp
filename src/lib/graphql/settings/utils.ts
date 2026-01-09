// Utility constants
export const profileVisibilityOptions = [
	{ value: 'public', label: 'Everyone', description: 'Visible to all users in the organization' },
	{ value: 'team', label: 'Team Members Only', description: 'Visible to your direct team members' },
	{ value: 'managers', label: 'Managers Only', description: 'Visible only to managers and HR' },
	{ value: 'private', label: 'Private', description: 'Visible only to HR administrators' }
];

export const languageOptions = [
	{ value: 'en', label: 'English', flag: '🇺🇸' },
	{ value: 'es', label: 'Español', flag: '🇪🇸' },
	{ value: 'fr', label: 'Français', flag: '🇫🇷' },
	{ value: 'de', label: 'Deutsch', flag: '🇩🇪' },
	{ value: 'it', label: 'Italiano', flag: '🇮🇹' },
	{ value: 'pt', label: 'Português', flag: '🇵🇹' },
	{ value: 'ja', label: '日本語', flag: '🇯🇵' },
	{ value: 'ko', label: '한국어', flag: '🇰🇷' }
];

export const timezoneOptions = [
	{ value: 'America/New_York', label: 'Eastern Time (ET)', offset: '-05:00' },
	{ value: 'America/Chicago', label: 'Central Time (CT)', offset: '-06:00' },
	{ value: 'America/Denver', label: 'Mountain Time (MT)', offset: '-07:00' },
	{ value: 'America/Los_Angeles', label: 'Pacific Time (PT)', offset: '-08:00' },
	{ value: 'Europe/London', label: 'Greenwich Mean Time (GMT)', offset: '+00:00' },
	{ value: 'Europe/Paris', label: 'Central European Time (CET)', offset: '+01:00' },
	{ value: 'Asia/Tokyo', label: 'Japan Standard Time (JST)', offset: '+09:00' },
	{ value: 'Asia/Shanghai', label: 'China Standard Time (CST)', offset: '+08:00' },
	{ value: 'Australia/Sydney', label: 'Australian Eastern Time (AET)', offset: '+10:00' }
];

export const colorSchemeOptions = [
	{
		value: 'blue',
		label: 'Ocean Blue',
		color: '#3B82F6',
		description: 'Classic professional blue'
	},
	{
		value: 'green',
		label: 'Forest Green',
		color: '#10B981',
		description: 'Calm and natural green'
	},
	{
		value: 'purple',
		label: 'Royal Purple',
		color: '#8B5CF6',
		description: 'Creative and modern purple'
	},
	{
		value: 'orange',
		label: 'Sunset Orange',
		color: '#F59E0B',
		description: 'Energetic and warm orange'
	}
];

export const fontSizeOptions = [
	{ value: 'small', label: 'Small', description: '14px - Compact text for more content' },
	{ value: 'medium', label: 'Medium', description: '16px - Standard comfortable reading' },
	{ value: 'large', label: 'Large', description: '18px - Larger text for better readability' }
];

/**
 * Helper function to validate password strength
 */
export function validatePasswordStrength(password: string): {
	score: number;
	feedback: string[];
	isValid: boolean;
} {
	const feedback: string[] = [];
	let score = 0;

	if (password.length >= 8) score++;
	else feedback.push('Password must be at least 8 characters long');

	if (/[a-z]/.test(password)) score++;
	else feedback.push('Include at least one lowercase letter');

	if (/[A-Z]/.test(password)) score++;
	else feedback.push('Include at least one uppercase letter');

	if (/\d/.test(password)) score++;
	else feedback.push('Include at least one number');

	if (/[^A-Za-z0-9]/.test(password)) score++;
	else feedback.push('Include at least one special character');

	return {
		score,
		feedback,
		isValid: score >= 4
	};
}
