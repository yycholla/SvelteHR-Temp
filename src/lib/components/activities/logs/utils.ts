// Get badge variant for action type (matching Rust backend action types)
export function getActionBadge(action: string): { variant: string; class: string } {
	switch (action) {
		case 'CREATE':
			return {
				variant: 'default',
				class: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'
			};
		case 'UPDATE':
			return {
				variant: 'default',
				class: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
			};
		case 'DELETE':
			return {
				variant: 'default',
				class: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'
			};
		case 'UPLOAD':
			return {
				variant: 'default',
				class: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300'
			};
		case 'ASSIGN':
			return {
				variant: 'default',
				class: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-300'
			};
		case 'UNASSIGN':
			return {
				variant: 'default',
				class: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300'
			};
		case 'APPROVE':
			return {
				variant: 'default',
				class: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'
			};
		case 'REJECT':
			return {
				variant: 'default',
				class: 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300'
			};
		default:
			return {
				variant: 'outline',
				class: ''
			};
	}
}

// Format JSON data for display
export function formatJSON(data: any): string {
	if (!data) return '—';
	if (typeof data === 'string') {
		try {
			data = JSON.parse(data);
		} catch {
			return data;
		}
	}
	return JSON.stringify(data, null, 2).substring(0, 100) + '...';
}

// Export logs to CSV
export async function exportLogs(logs: any[]) {
	const headers = ['Timestamp', 'User', 'Action', 'Resource Type', 'Resource ID', 'IP Address'];
	const rows = logs.map((log) => [
		new Date(log.createdAt).toLocaleString(),
		log.user?.displayName || log.user?.email || 'Unknown',
		log.action,
		log.resourceType,
		log.resourceId || 'N/A',
		log.ipAddress || 'N/A'
	]);

	const csv = [headers, ...rows].map((row) => row.join(',')).join('\n');

	const blob = new Blob([csv], { type: 'text/csv' });
	const url = window.URL.createObjectURL(blob);
	const a = document.createElement('a');
	a.href = url;
	a.download = `audit-logs-${new Date().toISOString().split('T')[0]}.csv`;
	a.click();
	window.URL.revokeObjectURL(url);
}
