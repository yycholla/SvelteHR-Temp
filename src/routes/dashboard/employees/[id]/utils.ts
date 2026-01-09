// Helper functions for employee profile page

export function formatDate(dateString: string | null): string {
	if (!dateString) return 'N/A';
	return new Date(dateString).toLocaleDateString('en-US', {
		year: 'numeric',
		month: 'long',
		day: 'numeric'
	});
}

export function formatRelativeTime(dateString: string): string {
	const date = new Date(dateString);
	const now = new Date();
	const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

	if (diffInSeconds < 60) return 'Just now';
	if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} mins ago`;
	if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} hours ago`;
	if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)} days ago`;
	return formatDate(dateString);
}

export function formatRole(role: string): string {
	return role.replace('_', ' ').replace(/\b\w/g, (l) => l.toUpperCase());
}

export function calculateTenure(hireDateString: string): string {
	if (!hireDateString) return 'N/A';
	const hireDate = new Date(hireDateString);
	const now = new Date();
	const diffTime = Math.abs(now.getTime() - hireDate.getTime());
	const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
	const years = Math.floor(diffDays / 365);
	const months = Math.floor((diffDays % 365) / 30);

	if (years > 0) return `${years} Yr${years > 1 ? 's' : ''}, ${months} Mo${months > 1 ? 's' : ''}`;
	return `${months} Month${months !== 1 ? 's' : ''}`;
}

export function getInitials(name: string): string {
	return name
		.split(' ')
		.map((n) => n[0])
		.join('')
		.toUpperCase()
		.slice(0, 2);
}
