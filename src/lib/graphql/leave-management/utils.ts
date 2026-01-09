/**
 * Helper: Format leave date range
 */
export function formatLeaveDateRange(startDate: string, endDate: string): string {
	const start = new Date(startDate);
	const end = new Date(endDate);

	const formatOptions: Intl.DateTimeFormatOptions = {
		month: 'short',
		day: 'numeric',
		year: 'numeric'
	};

	if (start.getFullYear() === end.getFullYear()) {
		if (start.getMonth() === end.getMonth()) {
			// Same month: "Jan 15-20, 2025"
			return `${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}-${end.getDate()}, ${end.getFullYear()}`;
		}
		// Same year: "Jan 15 - Feb 20, 2025"
		return `${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${end.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}, ${end.getFullYear()}`;
	}

	// Different years: "Dec 15, 2024 - Jan 5, 2025"
	return `${start.toLocaleDateString('en-US', formatOptions)} - ${end.toLocaleDateString('en-US', formatOptions)}`;
}

/**
 * Helper: Get status badge color
 */
export function getStatusBadgeColor(
	status: 'pending' | 'approved' | 'rejected' | 'cancelled'
): string {
	const statusColors: Record<string, string> = {
		pending: 'yellow',
		approved: 'green',
		rejected: 'red',
		cancelled: 'gray'
	};

	return statusColors[status.toLowerCase()] || 'gray';
}

/**
 * Helper: Validate rejection reason
 */
export function validateRejectionReason(reason?: string): { valid: boolean; error?: string } {
	if (!reason || reason.trim().length === 0) {
		return {
			valid: false,
			error: 'Rejection reason is required when rejecting a leave request'
		};
	}

	if (reason.length > 1000) {
		return {
			valid: false,
			error: 'Rejection reason must be less than 1000 characters'
		};
	}

	return { valid: true };
}
