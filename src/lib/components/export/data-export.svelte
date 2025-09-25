<!--
@fileoverview Data export component for SvelteHR management system
@component DataExport
@description Export functionality component for CSV/PDF/Excel export with configurable options
-->

<script lang="ts" module>
	import type { Snippet } from 'svelte';

	/**
	 * Export format configuration
	 */
	export type ExportFormat = 'csv' | 'excel' | 'pdf';

	/**
	 * Column configuration for export
	 */
	export interface ExportColumn {
		/** Column key */
		key: string;
		/** Display label */
		label: string;
		/** Include in export by default */
		defaultInclude?: boolean;
		/** Custom formatter for export value */
		formatter?: (value: any) => string;
		/** Column width for PDF export */
		width?: number;
	}

	/**
	 * Export options configuration
	 */
	export interface ExportOptions {
		/** Export format */
		format: ExportFormat;
		/** Filename (without extension) */
		filename?: string;
		/** Columns to include */
		columns?: string[];
		/** Date range filter */
		dateRange?: {
			start?: Date;
			end?: Date;
			field?: string;
		};
		/** Additional filters */
		filters?: Record<string, any>;
		/** Include header row */
		includeHeader?: boolean;
		/** Page size for batched export */
		batchSize?: number;
		/** PDF specific options */
		pdfOptions?: {
			orientation?: 'portrait' | 'landscape';
			pageSize?: 'A4' | 'A3' | 'letter';
			margin?: number;
			title?: string;
			subtitle?: string;
		};
		/** Excel specific options */
		excelOptions?: {
			sheetName?: string;
			includeFormulas?: boolean;
			autoWidth?: boolean;
		};
	}

	/**
	 * Export template configuration
	 */
	export interface ExportTemplate {
		/** Unique identifier */
		id: string;
		/** Display name */
		name: string;
		/** Description */
		description?: string;
		/** Pre-configured options */
		options: ExportOptions;
		/** Icon for template */
		icon?: any;
	}

	/**
	 * Export progress information
	 */
	export interface ExportProgress {
		/** Current progress percentage (0-100) */
		progress: number;
		/** Current status message */
		status: string;
		/** Total items to export */
		total?: number;
		/** Items processed so far */
		processed?: number;
		/** Estimated time remaining (seconds) */
		estimatedTimeRemaining?: number;
	}

	/**
	 * Main component props
	 */
	export interface DataExportProps<T = any> {
		/** Data to export */
		data: T[];
		/** Available columns for export */
		columns: ExportColumn[];
		/** Export templates */
		templates?: ExportTemplate[];
		/** Default export options */
		defaultOptions?: Partial<ExportOptions>;
		/** Export handler function */
		onExport?: (data: T[], options: ExportOptions) => Promise<Blob | string>;
		/** Custom export handlers by format */
		exportHandlers?: Partial<Record<ExportFormat, (data: T[], options: ExportOptions) => Promise<Blob | string>>>;
		/** Show advanced options */
		showAdvancedOptions?: boolean;
		/** Allowed export formats */
		allowedFormats?: ExportFormat[];
		/** Maximum export size */
		maxExportSize?: number;
		/** Loading state */
		loading?: boolean;
		/** Disabled state */
		disabled?: boolean;
		/** Button variant */
		variant?: 'default' | 'outline' | 'ghost';
		/** Button size */
		size?: 'default' | 'sm' | 'lg';
		/** Custom CSS classes */
		className?: string;
		/** Show as dropdown menu */
		dropdown?: boolean;
		/** Trigger button text */
		triggerText?: string;
		/** Show progress dialog */
		showProgress?: boolean;
	}
</script>

<script lang="ts">
	import { cn } from '$lib/utils.js';
	import { Button } from '$lib/components/ui/button';
	import { Badge } from '$lib/components/ui/badge';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Textarea } from '$lib/components/ui/textarea';
	import { Checkbox } from '$lib/components/ui/checkbox';
	import { Progress } from '$lib/components/ui/progress';
	import * as Select from '$lib/components/ui/select';
	import * as Dialog from '$lib/components/ui/dialog';
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu';
	import * as Tabs from '$lib/components/ui/tabs';
	import {
		Download,
		FileText,
		FileSpreadsheet,
		File,
		Calendar,
		Filter,
		Settings,
		Play,
		X,
		Check,
		AlertTriangle,
		Clock,
		ChevronDown
	} from 'lucide-svelte';

	let {
		data = [],
		columns = [],
		templates = [],
		defaultOptions = {},
		onExport,
		exportHandlers = {},
		showAdvancedOptions = true,
		allowedFormats = ['csv', 'excel', 'pdf'],
		maxExportSize = 10000,
		loading = false,
		disabled = false,
		variant = 'default',
		size = 'default',
		className = '',
		dropdown = false,
		triggerText = 'Export',
		showProgress = true,
		...restProps
	}: DataExportProps = $props();

	// Internal state
	let showDialog = $state(false);
	let showProgressDialog = $state(false);
	let selectedFormat = $state<ExportFormat>('csv');
	let selectedTemplate = $state<ExportTemplate | null>(null);
	let exportOptions = $state<ExportOptions>({
		format: 'csv',
		filename: '',
		columns: [],
		includeHeader: true,
		batchSize: 1000,
		...defaultOptions
	});
	let selectedColumns = $state<string[]>([]);
	let exportProgress = $state<ExportProgress | null>(null);
	let exportError = $state<string | null>(null);
	let activeTab = $state('basic');

	// Format configuration
	const formatConfig = {
		csv: {
			icon: FileText,
			label: 'CSV',
			description: 'Comma-separated values file',
			extension: 'csv'
		},
		excel: {
			icon: FileSpreadsheet,
			label: 'Excel',
			description: 'Microsoft Excel file',
			extension: 'xlsx'
		},
		pdf: {
			icon: File,
			label: 'PDF',
			description: 'Portable document format',
			extension: 'pdf'
		}
	} as const;

	// Initialize selected columns
	$effect(() => {
		if (selectedColumns.length === 0) {
			selectedColumns = columns
				.filter(col => col.defaultInclude !== false)
				.map(col => col.key);
		}
	});

	// Update options when format changes
	$effect(() => {
		exportOptions.format = selectedFormat;
		if (!exportOptions.filename) {
			const timestamp = new Date().toISOString().slice(0, 10);
			exportOptions.filename = `export_${timestamp}`;
		}
	});

	// Apply template when selected
	$effect(() => {
		if (selectedTemplate) {
			exportOptions = { ...exportOptions, ...selectedTemplate.options };
			selectedFormat = selectedTemplate.options.format;
			if (selectedTemplate.options.columns) {
				selectedColumns = [...selectedTemplate.options.columns];
			}
		}
	});

	// Validate export size
	const canExport = $derived(() => {
		if (data.length === 0) return false;
		if (maxExportSize && data.length > maxExportSize) return false;
		if (selectedColumns.length === 0) return false;
		return true;
	});

	const filteredData = $derived(() => {
		let result = [...data];

		// Apply date range filter
		if (exportOptions.dateRange?.start || exportOptions.dateRange?.end) {
			const field = exportOptions.dateRange.field;
			if (field) {
				result = result.filter(item => {
					const date = new Date(item[field]);
					if (exportOptions.dateRange?.start && date < exportOptions.dateRange.start) return false;
					if (exportOptions.dateRange?.end && date > exportOptions.dateRange.end) return false;
					return true;
				});
			}
		}

		// Apply additional filters
		if (exportOptions.filters) {
			Object.entries(exportOptions.filters).forEach(([key, value]) => {
				if (value != null && value !== '') {
					result = result.filter(item => {
						const itemValue = item[key];
						if (typeof value === 'string') {
							return String(itemValue).toLowerCase().includes(value.toLowerCase());
						}
						return itemValue === value;
					});
				}
			});
		}

		return result;
	});

	// Default export handlers
	const defaultExportHandlers: Record<ExportFormat, (data: any[], options: ExportOptions) => Promise<Blob>> = {
		csv: async (data, options) => {
			const selectedCols = columns.filter(col => selectedColumns.includes(col.key));
			let csvContent = '';

			// Add header row
			if (options.includeHeader) {
				csvContent += selectedCols.map(col => `"${col.label}"`).join(',') + '\n';
			}

			// Add data rows
			data.forEach(row => {
				const rowData = selectedCols.map(col => {
					let value = row[col.key];
					if (col.formatter) {
						value = col.formatter(value);
					}
					// Escape quotes and wrap in quotes if contains comma, quote, or newline
					if (typeof value === 'string' && (value.includes(',') || value.includes('"') || value.includes('\n'))) {
						value = `"${value.replace(/"/g, '""')}"`;
					}
					return value ?? '';
				});
				csvContent += rowData.join(',') + '\n';
			});

			return new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
		},

		excel: async (data, options) => {
			// Note: In a real implementation, you'd use a library like xlsx or exceljs
			// For now, we'll create a CSV that can be opened in Excel
			const csvBlob = await defaultExportHandlers.csv(data, options);
			return new Blob([await csvBlob.text()], {
				type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
			});
		},

		pdf: async (data, options) => {
			// Note: In a real implementation, you'd use a library like jsPDF or pdfkit
			// For now, we'll create a simple text-based PDF content
			const selectedCols = columns.filter(col => selectedColumns.includes(col.key));

			let content = `${options.pdfOptions?.title || 'Export Report'}\n\n`;
			if (options.pdfOptions?.subtitle) {
				content += `${options.pdfOptions.subtitle}\n\n`;
			}
			content += `Generated on: ${new Date().toLocaleString()}\n\n`;

			// Add header
			content += selectedCols.map(col => col.label).join('\t') + '\n';
			content += '-'.repeat(80) + '\n';

			// Add data
			data.forEach(row => {
				const rowData = selectedCols.map(col => {
					let value = row[col.key];
					if (col.formatter) {
						value = col.formatter(value);
					}
					return String(value ?? '').replace(/\t/g, ' ');
				});
				content += rowData.join('\t') + '\n';
			});

			return new Blob([content], { type: 'application/pdf' });
		}
	};

	// Export functions
	async function handleExport() {
		if (!canExport || loading) return;

		exportError = null;
		showProgressDialog = showProgress;

		try {
			exportProgress = {
				progress: 0,
				status: 'Preparing export...',
				total: filteredData.length,
				processed: 0
			};

			// Use custom handler if provided, otherwise use default
			const handler = exportHandlers[selectedFormat] || onExport || defaultExportHandlers[selectedFormat];

			if (!handler) {
				throw new Error(`No export handler found for format: ${selectedFormat}`);
			}

			exportProgress = {
				...exportProgress,
				progress: 25,
				status: 'Processing data...'
			};

			const finalOptions: ExportOptions = {
				...exportOptions,
				columns: selectedColumns
			};

			const result = await handler(filteredData, finalOptions);

			exportProgress = {
				...exportProgress,
				progress: 75,
				status: 'Generating file...'
			};

			// Download the file
			let blob: Blob;
			if (result instanceof Blob) {
				blob = result;
			} else {
				blob = new Blob([result], { type: 'text/plain' });
			}

			const url = URL.createObjectURL(blob);
			const link = document.createElement('a');
			link.href = url;
			link.download = `${finalOptions.filename}.${formatConfig[selectedFormat].extension}`;
			document.body.appendChild(link);
			link.click();
			document.body.removeChild(link);
			URL.revokeObjectURL(url);

			exportProgress = {
				...exportProgress,
				progress: 100,
				status: 'Export completed!'
			};

			// Close dialogs after short delay
			setTimeout(() => {
				showProgressDialog = false;
				showDialog = false;
				exportProgress = null;
			}, 1000);

		} catch (error) {
			console.error('Export error:', error);
			exportError = error instanceof Error ? error.message : 'Export failed';
			exportProgress = null;
		}
	}

	function handleQuickExport(format: ExportFormat) {
		selectedFormat = format;
		exportOptions.format = format;
		selectedColumns = columns
			.filter(col => col.defaultInclude !== false)
			.map(col => col.key);
		handleExport();
	}

	function toggleColumn(columnKey: string) {
		if (selectedColumns.includes(columnKey)) {
			selectedColumns = selectedColumns.filter(key => key !== columnKey);
		} else {
			selectedColumns = [...selectedColumns, columnKey];
		}
	}

	function selectAllColumns() {
		selectedColumns = columns.map(col => col.key);
	}

	function clearAllColumns() {
		selectedColumns = [];
	}

	function resetToDefaults() {
		selectedColumns = columns
			.filter(col => col.defaultInclude !== false)
			.map(col => col.key);
		exportOptions = {
			format: 'csv',
			filename: '',
			includeHeader: true,
			batchSize: 1000,
			...defaultOptions
		};
		selectedFormat = 'csv';
		selectedTemplate = null;
	}
</script>

{#if dropdown}
	<!-- Dropdown Menu Version -->
	<DropdownMenu.Root>
		<DropdownMenu.Trigger asChild let:builder>
			<Button
				builders={[builder]}
				{variant}
				{size}
				{disabled}
				class={cn('', className)}
				data-testid="export-dropdown-trigger"
				{...restProps}
			>
				<Download class="h-4 w-4" />
				{triggerText}
				<ChevronDown class="h-4 w-4" />
			</Button>
		</DropdownMenu.Trigger>
		<DropdownMenu.Content align="end" class="w-48">
			{#each allowedFormats as format}
				{@const config = formatConfig[format]}
				<DropdownMenu.Item
					onclick={() => handleQuickExport(format)}
					disabled={!canExport || loading}
				>
					<svelte:component this={config.icon} class="mr-2 h-4 w-4" />
					Export as {config.label}
				</DropdownMenu.Item>
			{/each}
			<DropdownMenu.Separator />
			<DropdownMenu.Item onclick={() => showDialog = true}>
				<Settings class="mr-2 h-4 w-4" />
				Advanced Options
			</DropdownMenu.Item>
		</DropdownMenu.Content>
	</DropdownMenu.Root>
{:else}
	<!-- Button Version -->
	<Button
		{variant}
		{size}
		{disabled}
		class={cn('', className)}
		onclick={() => showDialog = true}
		data-testid="export-button"
		{...restProps}
	>
		<Download class="h-4 w-4" />
		{triggerText}
	</Button>
{/if}

<!-- Export Configuration Dialog -->
<Dialog.Root bind:open={showDialog}>
	<Dialog.Content class="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
		<Dialog.Header>
			<Dialog.Title>Export Data</Dialog.Title>
			<Dialog.Description>
				Configure your export settings and download your data in the desired format.
			</Dialog.Description>
		</Dialog.Header>

		<div class="flex-1 overflow-auto">
			<Tabs.Root bind:value={activeTab} class="w-full">
				<Tabs.List class="grid w-full grid-cols-4">
					<Tabs.Trigger value="basic">Basic</Tabs.Trigger>
					<Tabs.Trigger value="columns">Columns</Tabs.Trigger>
					<Tabs.Trigger value="filters">Filters</Tabs.Trigger>
					<Tabs.Trigger value="advanced">Advanced</Tabs.Trigger>
				</Tabs.List>

				<!-- Basic Tab -->
				<Tabs.Content value="basic" class="space-y-4">
					{#if templates.length > 0}
						<div class="space-y-2">
							<Label>Export Templates</Label>
							<div class="grid grid-cols-1 md:grid-cols-2 gap-2">
								{#each templates as template}
									<Button
										variant="outline"
										class="justify-start h-auto p-4"
										onclick={() => selectedTemplate = template}
									>
										{#if template.icon}
											<svelte:component this={template.icon} class="mr-3 h-5 w-5" />
										{/if}
										<div class="text-left">
											<div class="font-medium">{template.name}</div>
											{#if template.description}
												<div class="text-sm text-muted-foreground">
													{template.description}
												</div>
											{/if}
										</div>
									</Button>
								{/each}
							</div>
						</div>
					{/if}

					<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
						<div class="space-y-2">
							<Label for="export-format">Format</Label>
							<Select.Root bind:value={selectedFormat}>
								<Select.Trigger>
									<Select.Value />
								</Select.Trigger>
								<Select.Content>
									{#each allowedFormats as format}
										{@const config = formatConfig[format]}
										<Select.Item value={format}>
											<div class="flex items-center">
												<svelte:component this={config.icon} class="mr-2 h-4 w-4" />
												{config.label} - {config.description}
											</div>
										</Select.Item>
									{/each}
								</Select.Content>
							</Select.Root>
						</div>

						<div class="space-y-2">
							<Label for="export-filename">Filename</Label>
							<Input
								id="export-filename"
								bind:value={exportOptions.filename}
								placeholder="Enter filename..."
							/>
						</div>
					</div>

					<div class="flex items-center space-x-2">
						<Checkbox
							id="include-header"
							bind:checked={exportOptions.includeHeader}
						/>
						<Label for="include-header">Include header row</Label>
					</div>
				</Tabs.Content>

				<!-- Columns Tab -->
				<Tabs.Content value="columns" class="space-y-4">
					<div class="flex items-center justify-between">
						<Label>Select Columns to Export</Label>
						<div class="space-x-2">
							<Button variant="ghost" size="sm" onclick={selectAllColumns}>
								Select All
							</Button>
							<Button variant="ghost" size="sm" onclick={clearAllColumns}>
								Clear All
							</Button>
						</div>
					</div>

					<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 max-h-64 overflow-auto">
						{#each columns as column}
							<div class="flex items-center space-x-2">
								<Checkbox
									id="col-{column.key}"
									checked={selectedColumns.includes(column.key)}
									onCheckedChange={() => toggleColumn(column.key)}
								/>
								<Label for="col-{column.key}" class="flex-1">
									{column.label}
								</Label>
							</div>
						{/each}
					</div>

					<div class="text-sm text-muted-foreground">
						{selectedColumns.length} of {columns.length} columns selected
					</div>
				</Tabs.Content>

				<!-- Filters Tab -->
				<Tabs.Content value="filters" class="space-y-4">
					<div class="space-y-4">
						<div>
							<Label>Date Range Filter</Label>
							<div class="grid grid-cols-3 gap-4 mt-2">
								<div class="space-y-2">
									<Label for="date-field">Date Field</Label>
									<Select.Root bind:value={exportOptions.dateRange?.field}>
										<Select.Trigger>
											<Select.Value placeholder="Select field..." />
										</Select.Trigger>
										<Select.Content>
											{#each columns.filter(col => col.key.toLowerCase().includes('date') || col.key.toLowerCase().includes('time')) as column}
												<Select.Item value={column.key}>
													{column.label}
												</Select.Item>
											{/each}
										</Select.Content>
									</Select.Root>
								</div>
								<div class="space-y-2">
									<Label for="start-date">Start Date</Label>
									<Input
										id="start-date"
										type="date"
										bind:value={exportOptions.dateRange?.start}
									/>
								</div>
								<div class="space-y-2">
									<Label for="end-date">End Date</Label>
									<Input
										id="end-date"
										type="date"
										bind:value={exportOptions.dateRange?.end}
									/>
								</div>
							</div>
						</div>

						<div class="text-sm text-muted-foreground">
							{filteredData.length} of {data.length} records will be exported
						</div>
					</div>
				</Tabs.Content>

				<!-- Advanced Tab -->
				<Tabs.Content value="advanced" class="space-y-4">
					{#if selectedFormat === 'pdf'}
						<div class="space-y-4">
							<Label>PDF Options</Label>
							<div class="grid grid-cols-2 gap-4">
								<div class="space-y-2">
									<Label>Orientation</Label>
									<Select.Root bind:value={exportOptions.pdfOptions?.orientation}>
										<Select.Trigger>
											<Select.Value placeholder="Portrait" />
										</Select.Trigger>
										<Select.Content>
											<Select.Item value="portrait">Portrait</Select.Item>
											<Select.Item value="landscape">Landscape</Select.Item>
										</Select.Content>
									</Select.Root>
								</div>
								<div class="space-y-2">
									<Label>Page Size</Label>
									<Select.Root bind:value={exportOptions.pdfOptions?.pageSize}>
										<Select.Trigger>
											<Select.Value placeholder="A4" />
										</Select.Trigger>
										<Select.Content>
											<Select.Item value="A4">A4</Select.Item>
											<Select.Item value="A3">A3</Select.Item>
											<Select.Item value="letter">Letter</Select.Item>
										</Select.Content>
									</Select.Root>
								</div>
							</div>
							<div class="space-y-2">
								<Label for="pdf-title">Document Title</Label>
								<Input
									id="pdf-title"
									bind:value={exportOptions.pdfOptions?.title}
									placeholder="Export Report"
								/>
							</div>
						</div>
					{/if}

					{#if selectedFormat === 'excel'}
						<div class="space-y-4">
							<Label>Excel Options</Label>
							<div class="space-y-2">
								<Label for="sheet-name">Sheet Name</Label>
								<Input
									id="sheet-name"
									bind:value={exportOptions.excelOptions?.sheetName}
									placeholder="Sheet1"
								/>
							</div>
							<div class="flex items-center space-x-2">
								<Checkbox
									id="auto-width"
									bind:checked={exportOptions.excelOptions?.autoWidth}
								/>
								<Label for="auto-width">Auto-adjust column widths</Label>
							</div>
						</div>
					{/if}

					<div class="space-y-2">
						<Label for="batch-size">Batch Size</Label>
						<Input
							id="batch-size"
							type="number"
							min="100"
							max="10000"
							step="100"
							bind:value={exportOptions.batchSize}
						/>
						<p class="text-sm text-muted-foreground">
							Number of records to process at once. Larger values may improve speed but use more memory.
						</p>
					</div>
				</Tabs.Content>
			</Tabs.Root>
		</div>

		<Dialog.Footer class="flex justify-between">
			<div class="flex space-x-2">
				<Button variant="ghost" onclick={resetToDefaults}>
					Reset to Defaults
				</Button>
			</div>
			<div class="flex space-x-2">
				<Dialog.Close asChild let:builder>
					<Button builders={[builder]} variant="outline">Cancel</Button>
				</Dialog.Close>
				<Button
					onclick={handleExport}
					disabled={!canExport || loading}
				>
					{#if loading}
						<Clock class="mr-2 h-4 w-4 animate-spin" />
					{:else}
						<Download class="mr-2 h-4 w-4" />
					{/if}
					Export {formatConfig[selectedFormat].label}
				</Button>
			</div>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>

<!-- Progress Dialog -->
<Dialog.Root bind:open={showProgressDialog}>
	<Dialog.Content class="max-w-md">
		<Dialog.Header>
			<Dialog.Title>Exporting Data</Dialog.Title>
		</Dialog.Header>

		<div class="space-y-4">
			{#if exportProgress}
				<div class="space-y-2">
					<div class="flex items-center justify-between text-sm">
						<span>{exportProgress.status}</span>
						<span>{exportProgress.progress}%</span>
					</div>
					<Progress value={exportProgress.progress} class="w-full" />
					{#if exportProgress.processed && exportProgress.total}
						<div class="text-sm text-muted-foreground text-center">
							{exportProgress.processed} of {exportProgress.total} records processed
						</div>
					{/if}
				</div>
			{/if}

			{#if exportError}
				<div class="flex items-center space-x-2 text-destructive">
					<AlertTriangle class="h-4 w-4" />
					<span class="text-sm">{exportError}</span>
				</div>
			{/if}
		</div>

		<Dialog.Footer>
			{#if exportProgress?.progress === 100}
				<Button onclick={() => showProgressDialog = false}>
					<Check class="mr-2 h-4 w-4" />
					Done
				</Button>
			{:else}
				<Button variant="outline" onclick={() => showProgressDialog = false}>
					Close
				</Button>
			{/if}
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>