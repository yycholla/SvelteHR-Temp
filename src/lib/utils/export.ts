import type { ColumnDefinition } from '$lib/components/ui/spreadsheet';

/**
 * Prepare data for export by extracting values from rows based on column definitions
 */
export function prepareExportData<T>(
	rows: T[],
	columns: ColumnDefinition<T>[],
	includeHidden: boolean = false
): unknown[][] {
	// Filter visible columns (or all if includeHidden is true)
	const exportColumns = includeHidden
		? columns
		: columns.filter(col => col.visible !== false);

	// Create header row
	const headers = exportColumns.map(col => col.label);

	// Create data rows
	const dataRows = rows.map(row =>
		exportColumns.map(col => {
			const value = col.getValue(row);

			// Handle null/undefined
			if (value === null || value === undefined) {
				return '';
			}

			// Handle dates
			if (value instanceof Date) {
				return value.toISOString();
			}

			// Handle objects (like departments)
			if (typeof value === 'object') {
				// Try to get name property
				if ('name' in value && typeof value.name === 'string') {
					return value.name;
				}
				// Otherwise stringify
				return JSON.stringify(value);
			}

			return value;
		})
	);

	return [headers, ...dataRows];
}

/**
 * Escape CSV value by wrapping in quotes if needed and escaping quotes
 */
function escapeCSVValue(value: unknown): string {
	if (value === null || value === undefined) {
		return '';
	}

	const str = String(value);

	// Check if value needs escaping (contains comma, quote, or newline)
	if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
		// Escape quotes by doubling them and wrap in quotes
		return `"${str.replace(/"/g, '""')}"`;
	}

	return str;
}

/**
 * Export data to CSV format
 */
export function exportToCSV<T>(
	data: T[],
	columns: ColumnDefinition<T>[],
	filename: string,
	includeHidden: boolean = false
): void {
	// Prepare data
	const exportData = prepareExportData(data, columns, includeHidden);

	// Convert to CSV string
	const csvContent = exportData
		.map(row => row.map(escapeCSVValue).join(','))
		.join('\n');

	// Create blob and download
	const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
	downloadBlob(blob, `${filename}-${getTimestamp()}.csv`);
}

/**
 * Export data to Excel format using xlsx library
 * Note: xlsx library is lazy-loaded to reduce initial bundle size
 */
export async function exportToExcel<T>(
	data: T[],
	columns: ColumnDefinition<T>[],
	filename: string,
	includeHidden: boolean = false
): Promise<void> {
	try {
		// Lazy load xlsx library
		const XLSX = await import('xlsx');

		// Prepare data
		const exportData = prepareExportData(data, columns, includeHidden);

		// Create worksheet from array of arrays
		const worksheet = XLSX.utils.aoa_to_sheet(exportData);

		// Auto-size columns (approximate)
		const colWidths = exportData[0].map((_, colIndex) => {
			const maxLength = Math.max(
				...exportData.map(row => {
					const value = row[colIndex];
					return value ? String(value).length : 0;
				})
			);
			return { wch: Math.min(maxLength + 2, 50) }; // Max width 50
		});
		worksheet['!cols'] = colWidths;

		// Create workbook
		const workbook = XLSX.utils.book_new();
		XLSX.utils.book_append_sheet(workbook, worksheet, 'Data');

		// Generate Excel file and download
		const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
		const blob = new Blob([excelBuffer], {
			type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
		});
		downloadBlob(blob, `${filename}-${getTimestamp()}.xlsx`);
	} catch (error) {
		console.error('Failed to export to Excel:', error);
		throw new Error('Excel export failed. Please try CSV export instead.');
	}
}

/**
 * Download a blob as a file
 */
function downloadBlob(blob: Blob, filename: string): void {
	// Create temporary link element
	const link = document.createElement('a');
	link.href = URL.createObjectURL(blob);
	link.download = filename;

	// Trigger download
	document.body.appendChild(link);
	link.click();

	// Cleanup
	document.body.removeChild(link);
	URL.revokeObjectURL(link.href);
}

/**
 * Get timestamp for filename (YYYY-MM-DD-HHMMSS)
 */
function getTimestamp(): string {
	const now = new Date();
	const year = now.getFullYear();
	const month = String(now.getMonth() + 1).padStart(2, '0');
	const day = String(now.getDate()).padStart(2, '0');
	const hours = String(now.getHours()).padStart(2, '0');
	const minutes = String(now.getMinutes()).padStart(2, '0');
	const seconds = String(now.getSeconds()).padStart(2, '0');

	return `${year}-${month}-${day}-${hours}${minutes}${seconds}`;
}
