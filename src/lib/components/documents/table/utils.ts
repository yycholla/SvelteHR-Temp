// File type icons mapping
export function getFileIcon(fileType: string): string {
	const icons: Record<string, string> = {
		PDF: '📄',
		JPEG: '🖼️',
		PNG: '🖼️',
		GIF: '🖼️',
		DOCX: '📝',
		XLSX: '📊',
		TXT: '📃',
		CSV: '📈'
	};
	return icons[fileType] || '📎';
}

// Sensitivity level badge colors with dark mode support
export function getSensitivityClass(
	level: string
): 'default' | 'secondary' | 'destructive' | 'outline' {
	const classes: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
		Public: 'secondary',
		Internal: 'default',
		Confidential: 'outline',
		'Sensitive-PII': 'destructive'
	};
	return classes[level] || 'secondary';
}

// Format file size
export function formatFileSize(bytes: number): string {
	if (bytes < 1024) return `${bytes} B`;
	if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
	return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// Format date
export function formatDate(dateString: string | null | undefined): string {
	if (!dateString) return 'N/A';
	try {
		return new Date(dateString).toLocaleDateString();
	} catch {
		return 'N/A';
	}
}
