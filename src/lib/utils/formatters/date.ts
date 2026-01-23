/**
 * Format a date to locale string
 */
export function formatDate(
	date: Date | string | null | undefined,
	options?: Intl.DateTimeFormatOptions
): string {
	if (!date) return 'N/A';

	const d = typeof date === 'string' ? new Date(date) : date;

	if (isNaN(d.getTime())) return 'Invalid Date';

	return d.toLocaleDateString(
		'en-US',
		options || {
			month: 'short',
			day: 'numeric',
			year: 'numeric'
		}
	);
}

/**
 * Format a date with time
 */
export function formatDateTime(
	date: Date | string | null | undefined,
	options?: Intl.DateTimeFormatOptions
): string {
	if (!date) return 'N/A';

	const d = typeof date === 'string' ? new Date(date) : date;

	if (isNaN(d.getTime())) return 'Invalid Date';

	return d.toLocaleDateString(
		'en-US',
		options || {
			month: 'short',
			day: 'numeric',
			year: 'numeric',
			hour: 'numeric',
			minute: '2-digit'
		}
	);
}

/**
 * Format date as relative time ("3 hours ago")
 */
export function formatRelativeTime(date: Date | string | null | undefined): string {
	if (!date) return 'Invalid Date';

	const d = typeof date === 'string' ? new Date(date) : date;

	if (isNaN(d.getTime())) return 'Invalid Date';

	const now = new Date();
	const diffMs = now.getTime() - d.getTime();

	// Handle future dates
	if (diffMs < 0) return 'N/A';

	const diffMinutes = Math.floor(diffMs / 60000);

	if (diffMinutes < 1) return 'just now';
	if (diffMinutes < 60) return `${diffMinutes} minute${diffMinutes > 1 ? 's' : ''} ago`;

	const diffHours = Math.floor(diffMinutes / 60);
	if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;

	const diffDays = Math.floor(diffHours / 24);
	return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
}

/**
 * Format date range
 */
export function formatDateRange(
	start: Date | string | null | undefined,
	end: Date | string | null | undefined
): string {
	if (!start || !end) return 'Invalid Date';

	const startDate = typeof start === 'string' ? new Date(start) : start;
	const endDate = typeof end === 'string' ? new Date(end) : end;

	if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) return 'Invalid Date';

	const startMonth = startDate.toLocaleDateString('en-US', { month: 'short' });
	const endMonth = endDate.toLocaleDateString('en-US', { month: 'short' });
	const startDay = startDate.getDate();
	const endDay = endDate.getDate();
	const startYear = startDate.getFullYear();
	const endYear = endDate.getFullYear();

	// Handle cross-year ranges
	if (startYear !== endYear) {
		return `${startMonth} ${startDay}, ${startYear} - ${endMonth} ${endDay}, ${endYear}`;
	}

	// Same year, same month
	if (startMonth === endMonth) {
		return `${startMonth} ${startDay}-${endDay}, ${startYear}`;
	}

	// Same year, different months
	return `${startMonth} ${startDay} - ${endMonth} ${endDay}, ${startYear}`;
}
