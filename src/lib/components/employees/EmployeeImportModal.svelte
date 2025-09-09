<!--
	Employee Import Modal Component
	
	Handles bulk employee import via CSV/Excel files with
	validation, error reporting, and progress tracking.
-->
<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import { 
		Upload, 
		X, 
		FileText, 
		AlertCircle, 
		CheckCircle, 
		Download,
		RefreshCw,
		Users,
		FileSpreadsheet
	} from 'lucide-svelte';

	// GraphQL and Auth
	import { createBrowserGraphQLClient } from '$lib/graphql/client.js';
	import { queries } from '$lib/graphql/queries.js';
	import { authStore } from '$lib/auth/store.js';

	// UI Components
	import Button from '$lib/components/ui/button/button.svelte';
	import {
		Dialog,
		DialogContent,
		DialogHeader,
		DialogTitle,
		DialogDescription,
		DialogFooter
	} from '$lib/components/ui/dialog/index.js';
	import {
		Card,
		CardContent,
		CardHeader,
		CardTitle
	} from '$lib/components/ui/card/index.js';
	import Badge from '$lib/components/ui/badge/badge.svelte';
	import { Progress } from '$lib/components/ui/progress/index.js';

	// Props
	interface Props {
		onClose: () => void;
		onImportComplete: () => void;
	}

	let { onClose, onImportComplete }: Props = $props();

	// Events
	const dispatch = createEventDispatcher<{
		close: void;
		importComplete: void;
	}>();

	// GraphQL client
	let graphqlClient: ReturnType<typeof createBrowserGraphQLClient> | null = null;

	// State
	let dragOver = $state(false);
	let selectedFile = $state<File | null>(null);
	let importing = $state(false);
	let importProgress = $state(0);
	let importStatus = $state<'idle' | 'parsing' | 'validating' | 'importing' | 'complete' | 'error'>('idle');
	let importResults = $state<{
		total: number;
		successful: number;
		failed: number;
		errors: Array<{ row: number; field: string; message: string; value: string }>;
		warnings: Array<{ row: number; field: string; message: string; value: string }>;
	} | null>(null);

	// File validation
	const allowedTypes = ['text/csv', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'];
	const maxFileSize = 10 * 1024 * 1024; // 10MB

	// Sample data for download
	const sampleData = [
		{
			'First Name': 'John',
			'Last Name': 'Doe',
			'Email': 'john.doe@company.com',
			'Employee ID': 'EMP001',
			'Position': 'Software Engineer',
			'Department': 'Engineering',
			'Hire Date': '2024-01-15',
			'Status': 'active',
			'Location': 'remote',
			'Employment Type': 'full_time',
			'Phone': '+1-555-0123'
		},
		{
			'First Name': 'Jane',
			'Last Name': 'Smith',
			'Email': 'jane.smith@company.com',
			'Employee ID': 'EMP002',
			'Position': 'Product Manager',
			'Department': 'Product',
			'Hire Date': '2024-02-01',
			'Status': 'active',
			'Location': 'office',
			'Employment Type': 'full_time',
			'Phone': '+1-555-0124'
		}
	];

	// Initialize component
	function initializeComponent() {
		if (!graphqlClient) {
			graphqlClient = createBrowserGraphQLClient();
			
			if (authStore.token) {
				graphqlClient.setToken(authStore.token);
			}
		}
	}

	// Handle drag events
	function handleDragOver(event: DragEvent) {
		event.preventDefault();
		dragOver = true;
	}

	function handleDragLeave() {
		dragOver = false;
	}

	function handleDrop(event: DragEvent) {
		event.preventDefault();
		dragOver = false;
		
		const files = event.dataTransfer?.files;
		if (files && files.length > 0) {
			handleFileSelection(files[0]);
		}
	}

	// Handle file input
	function handleFileInput(event: Event) {
		const target = event.target as HTMLInputElement;
		const files = target.files;
		if (files && files.length > 0) {
			handleFileSelection(files[0]);
		}
	}

	// Validate and select file
	function handleFileSelection(file: File) {
		// Validate file type
		if (!allowedTypes.includes(file.type) && !file.name.toLowerCase().endsWith('.csv')) {
			alert('Please select a CSV or Excel file (.csv, .xls, .xlsx)');
			return;
		}

		// Validate file size
		if (file.size > maxFileSize) {
			alert('File size must be less than 10MB');
			return;
		}

		selectedFile = file;
		importResults = null;
		importStatus = 'idle';
	}

	// Remove selected file
	function removeFile() {
		selectedFile = null;
		importResults = null;
		importStatus = 'idle';
	}

	// Parse CSV file
	async function parseCSVFile(file: File): Promise<any[]> {
		return new Promise((resolve, reject) => {
			const reader = new FileReader();
			
			reader.onload = (e) => {
				try {
					const csv = e.target?.result as string;
					const lines = csv.split('\n');
					const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
					
					const data = lines.slice(1)
						.filter(line => line.trim()) // Remove empty lines
						.map((line, index) => {
							const values = line.split(',').map(v => v.trim().replace(/"/g, ''));
							const row: any = {};
							
							headers.forEach((header, i) => {
								row[header] = values[i] || '';
							});
							
							row._rowNumber = index + 2; // +2 for header and 0-based index
							return row;
						});
					
					resolve(data);
				} catch (error) {
					reject(error);
				}
			};
			
			reader.onerror = () => reject(new Error('Failed to read file'));
			reader.readAsText(file);
		});
	}

	// Validate employee data
	function validateEmployeeData(data: any[]): {
		valid: any[];
		errors: Array<{ row: number; field: string; message: string; value: string }>;
		warnings: Array<{ row: number; field: string; message: string; value: string }>;
	} {
		const valid: any[] = [];
		const errors: Array<{ row: number; field: string; message: string; value: string }> = [];
		const warnings: Array<{ row: number; field: string; message: string; value: string }> = [];

		const requiredFields = ['First Name', 'Last Name', 'Email', 'Position'];
		const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

		data.forEach((row) => {
			let hasErrors = false;

			// Check required fields
			requiredFields.forEach((field) => {
				if (!row[field] || row[field].trim() === '') {
					errors.push({
						row: row._rowNumber,
						field,
						message: 'Required field is missing',
						value: row[field] || ''
					});
					hasErrors = true;
				}
			});

			// Validate email format
			if (row.Email && !emailRegex.test(row.Email)) {
				errors.push({
					row: row._rowNumber,
					field: 'Email',
					message: 'Invalid email format',
					value: row.Email
				});
				hasErrors = true;
			}

			// Validate hire date
			if (row['Hire Date'] && !Date.parse(row['Hire Date'])) {
				errors.push({
					row: row._rowNumber,
					field: 'Hire Date',
					message: 'Invalid date format (use YYYY-MM-DD)',
					value: row['Hire Date']
				});
				hasErrors = true;
			}

			// Validate status
			if (row.Status && !['active', 'inactive', 'on_leave', 'terminated'].includes(row.Status.toLowerCase())) {
				warnings.push({
					row: row._rowNumber,
					field: 'Status',
					message: 'Status will default to "active"',
					value: row.Status
				});
			}

			// Add to valid list if no errors
			if (!hasErrors) {
				valid.push({
					first_name: row['First Name'],
					last_name: row['Last Name'],
					email: row.Email,
					employee_id: row['Employee ID'] || null,
					position: row.Position,
					department_name: row.Department || null,
					hire_date: row['Hire Date'] ? new Date(row['Hire Date']).toISOString().split('T')[0] : null,
					status: row.Status?.toLowerCase() || 'active',
					location: row.Location || 'office',
					employment_type: row['Employment Type']?.toLowerCase() || 'full_time',
					phone: row.Phone || null
				});
			}
		});

		return { valid, errors, warnings };
	}

	// Import employees
	async function importEmployees() {
		if (!selectedFile || !graphqlClient) return;

		try {
			importing = true;
			importStatus = 'parsing';
			importProgress = 10;

			// Parse file
			const rawData = await parseCSVFile(selectedFile);
			importProgress = 30;

			// Validate data
			importStatus = 'validating';
			const { valid, errors, warnings } = validateEmployeeData(rawData);
			importProgress = 50;

			if (errors.length > 0 && valid.length === 0) {
				// All rows have errors
				importResults = {
					total: rawData.length,
					successful: 0,
					failed: rawData.length,
					errors,
					warnings
				};
				importStatus = 'error';
				return;
			}

			// Import valid employees
			importStatus = 'importing';
			let successful = 0;
			let failed = 0;

			for (let i = 0; i < valid.length; i++) {
				try {
					await graphqlClient.mutate(
						queries.employees.create,
						{ employee: valid[i] }
					);
					successful++;
				} catch (err) {
					failed++;
					errors.push({
						row: rawData[i]._rowNumber,
						field: 'general',
						message: 'Failed to create employee',
						value: JSON.stringify(valid[i])
					});
				}

				importProgress = 50 + (i / valid.length) * 45;
			}

			// Complete
			importProgress = 100;
			importStatus = 'complete';
			importResults = {
				total: rawData.length,
				successful,
				failed: failed + errors.length,
				errors,
				warnings
			};

			if (successful > 0) {
				// Trigger refresh in parent component
				setTimeout(() => {
					onImportComplete();
				}, 1000);
			}

		} catch (error) {
			console.error('Import failed:', error);
			importStatus = 'error';
			importResults = {
				total: 0,
				successful: 0,
				failed: 0,
				errors: [{
					row: 0,
					field: 'general',
					message: error instanceof Error ? error.message : 'Unknown error occurred',
					value: ''
				}],
				warnings: []
			};
		} finally {
			importing = false;
		}
	}

	// Download sample CSV
	function downloadSampleCSV() {
		const headers = Object.keys(sampleData[0]);
		const csvContent = [
			headers.join(','),
			...sampleData.map(row => 
				headers.map(header => `"${row[header as keyof typeof row]}"`).join(',')
			)
		].join('\n');

		const blob = new Blob([csvContent], { type: 'text/csv' });
		const url = URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.href = url;
		a.download = 'employee_import_template.csv';
		a.click();
		URL.revokeObjectURL(url);
	}

	// Close modal
	function handleClose() {
		onClose();
	}

	// Initialize when component mounts
	initializeComponent();
</script>

<Dialog open={true} onOpenChange={handleClose}>
	<DialogContent class="max-w-4xl max-h-[80vh] overflow-y-auto">
		<DialogHeader>
			<DialogTitle class="flex items-center gap-2">
				<Upload class="h-5 w-5" />
				Import Employees
			</DialogTitle>
			<DialogDescription>
				Upload a CSV or Excel file to bulk import employees into the system
			</DialogDescription>
		</DialogHeader>

		<!-- Import Status -->
		{#if importStatus !== 'idle'}
			<Card class="mb-4">
				<CardHeader class="pb-3">
					<CardTitle class="flex items-center gap-2 text-base">
						{#if importStatus === 'parsing'}
							<RefreshCw class="h-4 w-4 animate-spin text-blue-600" />
							Parsing file...
						{:else if importStatus === 'validating'}
							<RefreshCw class="h-4 w-4 animate-spin text-orange-600" />
							Validating data...
						{:else if importStatus === 'importing'}
							<RefreshCw class="h-4 w-4 animate-spin text-green-600" />
							Importing employees...
						{:else if importStatus === 'complete'}
							<CheckCircle class="h-4 w-4 text-green-600" />
							Import completed
						{:else if importStatus === 'error'}
							<AlertCircle class="h-4 w-4 text-red-600" />
							Import failed
						{/if}
					</CardTitle>
				</CardHeader>
				<CardContent class="space-y-3">
					<!-- Progress Bar -->
					{#if importing}
						<Progress value={importProgress} class="w-full" />
						<p class="text-sm text-gray-600 text-center">
							{Math.round(importProgress)}% complete
						</p>
					{/if}

					<!-- Results -->
					{#if importResults}
						<div class="grid grid-cols-1 gap-3 md:grid-cols-3">
							<div class="flex items-center gap-2 rounded-lg bg-gray-50 p-3">
								<FileText class="h-4 w-4 text-gray-600" />
								<div>
									<p class="text-sm font-medium">Total Rows</p>
									<p class="text-lg font-bold">{importResults.total}</p>
								</div>
							</div>
							
							<div class="flex items-center gap-2 rounded-lg bg-green-50 p-3">
								<CheckCircle class="h-4 w-4 text-green-600" />
								<div>
									<p class="text-sm font-medium text-green-800">Successful</p>
									<p class="text-lg font-bold text-green-800">{importResults.successful}</p>
								</div>
							</div>
							
							<div class="flex items-center gap-2 rounded-lg bg-red-50 p-3">
								<AlertCircle class="h-4 w-4 text-red-600" />
								<div>
									<p class="text-sm font-medium text-red-800">Failed</p>
									<p class="text-lg font-bold text-red-800">{importResults.failed}</p>
								</div>
							</div>
						</div>

						<!-- Errors -->
						{#if importResults.errors.length > 0}
							<div class="rounded-lg bg-red-50 p-4">
								<h4 class="mb-2 font-medium text-red-900">Errors ({importResults.errors.length})</h4>
								<div class="max-h-32 space-y-1 overflow-y-auto">
									{#each importResults.errors as error}
										<p class="text-sm text-red-800">
											Row {error.row}, {error.field}: {error.message}
										</p>
									{/each}
								</div>
							</div>
						{/if}

						<!-- Warnings -->
						{#if importResults.warnings.length > 0}
							<div class="rounded-lg bg-orange-50 p-4">
								<h4 class="mb-2 font-medium text-orange-900">Warnings ({importResults.warnings.length})</h4>
								<div class="max-h-32 space-y-1 overflow-y-auto">
									{#each importResults.warnings as warning}
										<p class="text-sm text-orange-800">
											Row {warning.row}, {warning.field}: {warning.message}
										</p>
									{/each}
								</div>
							</div>
						{/if}
					{/if}
				</CardContent>
			</Card>
		{/if}

		<!-- File Upload Area -->
		{#if !selectedFile}
			<div
				class="rounded-lg border-2 border-dashed border-gray-300 p-8 text-center transition-colors {dragOver ? 'border-blue-500 bg-blue-50' : 'hover:border-gray-400'}"
				ondragover={handleDragOver}
				ondragleave={handleDragLeave}
				ondrop={handleDrop}
			>
				<div class="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-gray-100">
					<Upload class="h-6 w-6 text-gray-600" />
				</div>
				<p class="mb-2 text-lg font-medium text-gray-900">Drop your file here</p>
				<p class="mb-4 text-sm text-gray-500">or click to browse for a CSV or Excel file</p>
				
				<input
					type="file"
					accept=".csv,.xls,.xlsx"
					onchange={handleFileInput}
					class="hidden"
					id="file-upload"
				/>
				<label for="file-upload">
					<Button as="div" class="cursor-pointer">
						Select File
					</Button>
				</label>
			</div>
		{:else}
			<!-- Selected File -->
			<Card>
				<CardContent class="p-4">
					<div class="flex items-center justify-between">
						<div class="flex items-center gap-3">
							<div class="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100">
								<FileSpreadsheet class="h-5 w-5 text-blue-600" />
							</div>
							<div>
								<p class="font-medium">{selectedFile.name}</p>
								<p class="text-sm text-gray-500">
									{(selectedFile.size / 1024 / 1024).toFixed(2)} MB
								</p>
							</div>
						</div>
						
						{#if !importing}
							<Button
								variant="ghost"
								size="sm"
								onclick={removeFile}
								class="text-red-600 hover:text-red-700"
							>
								<X class="h-4 w-4" />
							</Button>
						{/if}
					</div>
				</CardContent>
			</Card>
		{/if}

		<!-- Instructions -->
		<Card>
			<CardHeader class="pb-3">
				<CardTitle class="text-base">Import Instructions</CardTitle>
			</CardHeader>
			<CardContent class="space-y-3 text-sm text-gray-600">
				<div class="flex items-start gap-2">
					<Badge variant="secondary" class="mt-0.5 shrink-0">1</Badge>
					<p>Download the sample template to see the required format</p>
				</div>
				<div class="flex items-start gap-2">
					<Badge variant="secondary" class="mt-0.5 shrink-0">2</Badge>
					<p>Fill in your employee data. Required fields: First Name, Last Name, Email, Position</p>
				</div>
				<div class="flex items-start gap-2">
					<Badge variant="secondary" class="mt-0.5 shrink-0">3</Badge>
					<p>Save as CSV format and upload the file</p>
				</div>
				<div class="flex items-start gap-2">
					<Badge variant="secondary" class="mt-0.5 shrink-0">4</Badge>
					<p>Review any errors and fix them in your file before re-importing</p>
				</div>
			</CardContent>
		</Card>

		<DialogFooter class="flex flex-col gap-3 sm:flex-row sm:justify-between">
			<Button
				variant="outline"
				onclick={downloadSampleCSV}
				class="flex items-center gap-2"
			>
				<Download class="h-4 w-4" />
				Download Template
			</Button>

			<div class="flex gap-2">
				<Button variant="outline" onclick={handleClose} disabled={importing}>
					{importStatus === 'complete' ? 'Close' : 'Cancel'}
				</Button>
				
				{#if selectedFile && importStatus !== 'complete'}
					<Button
						onclick={importEmployees}
						disabled={importing}
						class="flex items-center gap-2"
					>
						{#if importing}
							<RefreshCw class="h-4 w-4 animate-spin" />
							Importing...
						{:else}
							<Users class="h-4 w-4" />
							Import Employees
						{/if}
					</Button>
				{/if}
			</div>
		</DialogFooter>
	</DialogContent>
</Dialog>