<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Download, FileText, Table2 } from '@lucide/svelte';

	const {
		data = [],
		filename = 'export',
		format = 'csv'
	} = $props<{
		data?: any[];
		filename?: string;
		format?: 'csv' | 'json' | 'xlsx';
	}>();

	function exportData() {
		// Placeholder export functionality
		const dataToExport = data;

		if (format === 'csv') {
			// Convert to CSV
			if (dataToExport.length > 0) {
				const headers = Object.keys(dataToExport[0]);
				const csvContent = [
					headers.join(','),
					...dataToExport.map((row) => headers.map((header) => row[header]).join(','))
				].join('\n');

				const blob = new Blob([csvContent], { type: 'text/csv' });
				const url = URL.createObjectURL(blob);
				const a = document.createElement('a');
				a.href = url;
				a.download = `${filename}.csv`;
				a.click();
				URL.revokeObjectURL(url);
			}
		} else if (format === 'json') {
			// Export as JSON
			const jsonContent = JSON.stringify(dataToExport, null, 2);
			const blob = new Blob([jsonContent], { type: 'application/json' });
			const url = URL.createObjectURL(blob);
			const a = document.createElement('a');
			a.href = url;
			a.download = `${filename}.json`;
			a.click();
			URL.revokeObjectURL(url);
		}
	}

	const getIcon = () => {
		switch (format) {
			case 'csv':
				return Table2;
			case 'json':
				return FileText;
			case 'xlsx':
				return Table2;
			default:
				return Download;
		}
	};
</script>

{@const ExportIcon = getIcon()}
<Button variant="outline" onclick={exportData} class="gap-2">
	<ExportIcon class="h-4 w-4" />
	Export {format.toUpperCase()}
</Button>
