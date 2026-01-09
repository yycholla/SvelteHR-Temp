<script lang="ts">
	import { enhance } from '$app/forms';
	import type { ActionData, PageData } from './$types';

	const { data, form }: { data: PageData; form: ActionData } = $props();

	// CSV upload state
	let csvContent = $state('');
	let temporaryPassword = $state('');
	let fileName = $state<string | null>(null);
	let isSubmitting = $state(false);
	let showPassword = $state(false);

	// Validation errors
	let errors = $state<Record<string, string>>({});

	// File input handling
	function handleFileUpload(event: Event) {
		const target = event.target as HTMLInputElement;
		const file = target.files?.[0];

		if (!file) {
			return;
		}

		fileName = file.name;

		// Validate file type
		if (!file.name.endsWith('.csv')) {
			errors.csvFile = 'Please upload a CSV file';
			csvContent = '';
			return;
		}

		// Read file content
		const reader = new FileReader();
		reader.onload = (e) => {
			csvContent = e.target?.result as string;
			errors = {}; // Clear errors on successful load
		};
		reader.onerror = () => {
			errors.csvFile = 'Failed to read file';
			csvContent = '';
		};
		reader.readAsText(file);
	}

	// Client-side validation
	function validateForm(): boolean {
		errors = {};

		if (!csvContent.trim()) {
			errors.csvFile = 'CSV file is required';
		}

		if (!temporaryPassword.trim()) {
			errors.temporaryPassword = 'Temporary password is required';
		} else if (temporaryPassword.length < 8) {
			errors.temporaryPassword = 'Password must be at least 8 characters';
		}

		return Object.keys(errors).length === 0;
	}

	// Reset form
	function resetForm() {
		csvContent = '';
		temporaryPassword = '';
		fileName = null;
		errors = {};
		// Reset file input
		const fileInput = document.getElementById('csvFile') as HTMLInputElement;
		if (fileInput) {
			fileInput.value = '';
		}
	}
</script>

<svelte:head>
	<title>Import Employees - MountainHR</title>
	<meta name="description" content="Bulk import employees from CSV file" />
</svelte:head>

<div class="container mx-auto max-w-4xl px-4 py-8">
	<!-- Page Header -->
	<div class="mb-8">
		<h1 class="text-3xl font-bold text-foreground">Import Employees</h1>
		<p class="mt-2 text-muted-foreground">
			Bulk import employees from a CSV file with Name, Hire Date, and Role columns
		</p>
	</div>

	<!-- Instructions Card -->
	<div class="mb-6 rounded-lg border border-border bg-card p-6 shadow-sm">
		<h2 class="mb-3 text-lg font-semibold text-foreground">CSV Format Requirements</h2>
		<div class="space-y-2 text-sm text-muted-foreground">
			<p><strong>Required Columns:</strong> Name, Hire Date, Role</p>
			<p>
				<strong>Name Format:</strong> "LAST, FIRST" or "LAST, FIRST M" (middle names will be dropped)
			</p>
			<p><strong>Date Format:</strong> YYYY-MM-DD, MM/DD/YYYY, or YYYY/MM/DD</p>
			<p><strong>Supported Roles:</strong> Admin, HR Manager, Manager, Employee</p>
		</div>

		<div class="mt-4 rounded-md bg-muted p-3">
			<p class="mb-1 text-xs font-medium text-foreground">Example CSV:</p>
			<pre class="text-xs text-muted-foreground">Name,Hire Date,Role
DOE, JOHN,2024-01-15,Employee
SMITH, JANE M,2024-02-01,Manager
JOHNSON, ROBERT,2024-03-10,HR Manager</pre>
		</div>

		<div class="mt-4 rounded-md border border-warning bg-warning/10 p-3">
			<p class="text-sm text-warning-foreground">
				<strong>Note:</strong> All imported employees will be required to change their password on first
				login. Email addresses will be auto-generated as first.last@mountainhr.dev.
			</p>
		</div>
	</div>

	<!-- Success Message -->
	{#if form?.success}
		<div class="mb-6 rounded-lg border border-success/50 bg-success/10 p-6">
			<h3 class="mb-2 text-lg font-semibold text-success-foreground">Import Completed</h3>
			<div class="text-sm text-success-foreground">
				{#if 'totalRows' in form}
					<p>Total rows processed: {form.totalRows}</p>
				{/if}
				{#if 'successful' in form}
					<p>Successful: {form.successful}</p>
				{/if}
				{#if 'failed' in form}
					<p>Failed: {form.failed}</p>
				{/if}
				{#if !('totalRows' in form) && form.job}
					<p>Import job created: {form.job.id}</p>
					<p>Step: {form.step}</p>
				{/if}
			</div>

			{#if 'results' in form && Array.isArray(form.results) && form.results.length > 0}
				<div class="mt-4 max-h-96 overflow-auto">
					<table class="w-full text-sm">
						<thead class="sticky top-0 bg-card">
							<tr class="border-b border-border">
								<th class="px-2 py-2 text-left">Row</th>
								<th class="px-2 py-2 text-left">Name</th>
								<th class="px-2 py-2 text-left">Email</th>
								<th class="px-2 py-2 text-left">Status</th>
							</tr>
						</thead>
						<tbody>
							{#each form.results as result}
								<tr class="border-b border-border/50">
									<td class="px-2 py-2">{result.rowNumber}</td>
									<td class="px-2 py-2">{result.name}</td>
									<td class="px-2 py-2 text-xs">{result.email || 'N/A'}</td>
									<td class="px-2 py-2">
										{#if result.success}
											<span class="text-success-foreground">✓ Success</span>
										{:else}
											<span class="text-destructive">✗ {result.error || 'Failed'}</span>
										{/if}
									</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
			{/if}

			<button
				type="button"
				onclick={resetForm}
				class="mt-4 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
			>
				Import More Employees
			</button>
		</div>
	{/if}

	<!-- Error Message -->
	{#if form?.error}
		<div class="mb-6 rounded-lg border border-destructive/50 bg-destructive/10 p-4">
			<p class="font-medium text-destructive">Import Failed</p>
			<p class="text-sm text-destructive">{form.error}</p>
		</div>
	{/if}

	<!-- Import Form -->
	{#if !form?.success}
		<form
			method="POST"
			action="?/importEmployees"
			use:enhance={() => {
				if (!validateForm()) {
					return async () => {
						// Cancel submission
					};
				}

				isSubmitting = true;
				return async ({ update }) => {
					isSubmitting = false;
					await update();
				};
			}}
			class="rounded-lg border border-border bg-card p-6 shadow-sm"
		>
			<div class="space-y-6">
				<!-- CSV File Upload -->
				<div>
					<label for="csvFile" class="mb-2 block text-sm font-medium text-foreground">
						CSV File <span class="text-destructive">*</span>
					</label>
					<input
						type="file"
						id="csvFile"
						accept=".csv"
						onchange={handleFileUpload}
						required
						class="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground file:mr-4 file:rounded-md file:border-0 file:bg-primary file:px-4 file:py-2 file:text-sm file:font-medium file:text-primary-foreground hover:file:bg-primary/90"
					/>
					{#if fileName}
						<p class="mt-1 text-xs text-muted-foreground">Selected: {fileName}</p>
					{/if}
					{#if errors.csvFile}
						<p class="mt-1 text-sm text-destructive">{errors.csvFile}</p>
					{/if}
					<input type="hidden" name="csvContent" value={csvContent} />
				</div>

				<!-- Temporary Password -->
				<div>
					<label for="temporaryPassword" class="mb-2 block text-sm font-medium text-foreground">
						Temporary Password <span class="text-destructive">*</span>
					</label>
					<p class="mb-2 text-xs text-muted-foreground">
						This password will be set for all imported employees. They will be required to change it
						on first login.
					</p>
					<div class="relative">
						<input
							type={showPassword ? 'text' : 'password'}
							id="temporaryPassword"
							name="temporaryPassword"
							bind:value={temporaryPassword}
							required
							minlength="8"
							class="w-full rounded-md border border-input bg-background px-3 py-2 pr-10 text-sm text-foreground placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring"
							placeholder="Enter temporary password (min 8 characters)"
						/>
						<button
							type="button"
							onclick={() => (showPassword = !showPassword)}
							class="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
						>
							{#if showPassword}
								<svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path
										stroke-linecap="round"
										stroke-linejoin="round"
										stroke-width="2"
										d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"
									/>
								</svg>
							{:else}
								<svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path
										stroke-linecap="round"
										stroke-linejoin="round"
										stroke-width="2"
										d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
									/>
									<path
										stroke-linecap="round"
										stroke-linejoin="round"
										stroke-width="2"
										d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
									/>
								</svg>
							{/if}
						</button>
					</div>
					{#if errors.temporaryPassword}
						<p class="mt-1 text-sm text-destructive">{errors.temporaryPassword}</p>
					{/if}
				</div>

				<!-- Submit Buttons -->
				<div class="flex gap-3 pt-4">
					<button
						type="submit"
						disabled={isSubmitting}
						class="rounded-md bg-primary px-6 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
					>
						{isSubmitting ? 'Importing...' : 'Import Employees'}
					</button>
					<a
						href="/dashboard/employees"
						class="rounded-md border border-border bg-background px-6 py-2 text-sm font-medium text-foreground hover:bg-muted"
					>
						Cancel
					</a>
				</div>
			</div>
		</form>
	{/if}
</div>
