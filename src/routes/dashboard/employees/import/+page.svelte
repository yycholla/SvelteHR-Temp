<script lang="ts">
	import { enhance } from '$app/forms';
	import { logger } from '$lib/utils/logger';
	import { fade } from 'svelte/transition';
	import { toast } from 'svelte-sonner';
	import type { ActionData, PageData } from './$types';

	const { data, form }: { data: PageData; form: any } = $props();

	// State
	let currentStep = $state<'upload' | 'mapping' | 'preview' | 'complete'>('upload');
	let csvFile = $state<File | null>(null);
	let csvContent = $state('');
	const mapping = $state({
		full_name_column: '',
		first_name_column: '',
		last_name_column: '',
		email_column: '',
		hire_date_column: '',
		role_column: '',
		birth_date_column: '',
		home_phone_column: '',
		work_phone_column: '',
		mobile_phone_column: '',
		nickname_column: '',
		social_media_release_column: '',
		address_column: ''
	});
	let headers = $state<string[]>([]);
	let jobId = $state<string>('');
	let temporaryPassword = $state('');
	let isSubmitting = $state(false);

	// Sync step from server response
	$effect(() => {
		if (form?.step) {
			currentStep = form.step;
			if (form.job) {
				jobId = form.job.id;
				if (form.step === 'mapping' && form.job.importRows?.length > 0) {
					try {
						const firstRow = JSON.parse(form.job.importRows[0].rawData);
						const newHeaders = Object.keys(firstRow);
						headers = newHeaders;
						// Auto-guess mapping with new headers
						guessMapping(newHeaders);
					} catch (e) {
						logger.error('Failed to parse headers', e as Error);
						toast.error('Failed to parse CSV headers');
					}
				}
			}
		}
	});

	function handleFileChange(e: Event) {
		const target = e.target as HTMLInputElement;
		if (target.files?.length) {
			csvFile = target.files[0];
			const reader = new FileReader();
			reader.onload = (ev) => {
				const raw = ev.target?.result as string;
				csvContent = cleanCsvContent(raw);
			};
			reader.readAsText(csvFile);
		}
	}

	function cleanCsvContent(raw: string): string {
		if (!raw) return '';
		const lines = raw.split(/\r?\n/);
		let bestHeaderIndex = 0;
		let maxScore = 0;

		// Scan first 20 lines to find the best header candidate
		for (let i = 0; i < Math.min(lines.length, 20); i++) {
			const line = lines[i];
			if (!line.trim()) continue;

			// Count non-empty columns
			const cols = line.split(',').filter((c) => c.trim().length > 0).length;
			const lower = line.toLowerCase();

			// Check for common header keywords
			let keywordMatches = 0;
			const keywords = [
				'name',
				'email',
				'role',
				'phone',
				'date',
				'hire',
				'active',
				'id',
				'department',
				'location',
				'address'
			];
			keywords.forEach((k) => {
				if (lower.includes(k)) keywordMatches++;
			});

			// Heuristic scoring:
			// - Base score = column count
			// - Boost = keyword matches * 3 (keywords strongly indicate a header row)
			const currentScore = cols + keywordMatches * 3;

			// We strictly want the *first* row that has the highest score (header usually comes before data)
			// Using > (not >=) ensures we stick with the first occurrence if scores are equal (e.g. header vs data with same cols/keywords)
			if (currentScore > maxScore) {
				maxScore = currentScore;
				bestHeaderIndex = i;
			}
		}

		// If we found a header row deeper in the file (and it has a reasonable score indicating it's not just noise)
		// Score > 3 implies at least 1 keyword match or > 3 columns
		if (bestHeaderIndex > 0 && maxScore > 3) {
			logger.info(
				`[CSV Cleaner] Skipping ${bestHeaderIndex} rows. Found header at line ${bestHeaderIndex + 1} (Score: ${maxScore})`
			);
			toast.info(`Detected metadata rows. Skipping to line ${bestHeaderIndex + 1}.`);
			return lines.slice(bestHeaderIndex).join('\n');
		}

		return raw;
	}

	function guessMapping(headersInput?: string[]) {
		const sourceHeaders = headersInput || headers;
		const lowerHeaders = sourceHeaders.map((h) => ({ key: h, lower: h.toLowerCase() }));
		const find = (keywords: string[]) =>
			lowerHeaders.find((h) => keywords.some((k) => h.lower.includes(k)))?.key || '';

		mapping.first_name_column = find(['first', 'given']);
		mapping.last_name_column = find(['last', 'surname', 'family']);

		// If no specific first/last found, try generic "name" for full name
		if (!mapping.first_name_column && !mapping.last_name_column) {
			mapping.full_name_column = find(['name', 'employee name', 'full name']);
		}

		mapping.email_column = find(['email', 'mail']);
		mapping.hire_date_column = find(['hire', 'join']);
		mapping.role_column = find(['role', 'job', 'position']);
		mapping.birth_date_column = find(['birth', 'dob']);

		mapping.home_phone_column = find(['home phone', 'home']);
		mapping.work_phone_column = find(['work phone', 'work', 'office']);
		mapping.mobile_phone_column = find(['mobile', 'cell']);

		mapping.nickname_column = find(['nickname', 'preferred']);
		mapping.social_media_release_column = find(['social', 'release', 'photo']);

		// Fallback: if just "phone" exists, put it in Home Phone if empty
		if (!mapping.home_phone_column && !mapping.work_phone_column && !mapping.mobile_phone_column) {
			mapping.home_phone_column = find(['phone']);
		}

		mapping.address_column = find(['address', 'location']);
	}

	function getMappingJson() {
		// Create camelCase mapping object for GraphQL
		const camelMapping: any = {
			jobId,
			fullNameColumn: mapping.full_name_column || null,
			firstNameColumn: mapping.first_name_column || null,
			lastNameColumn: mapping.last_name_column || null,
			emailColumn: mapping.email_column || null,
			hireDateColumn: mapping.hire_date_column || null,
			roleColumn: mapping.role_column || null,
			birthDateColumn: mapping.birth_date_column || null,
			homePhoneColumn: mapping.home_phone_column || null,
			workPhoneColumn: mapping.work_phone_column || null,
			mobilePhoneColumn: mapping.mobile_phone_column || null,
			nicknameColumn: mapping.nickname_column || null,
			socialMediaReleaseColumn: mapping.social_media_release_column || null,
			addressColumn: mapping.address_column || null
		};

		// Remove null/empty fields
		for (const key in camelMapping) {
			if (!camelMapping[key]) {
				delete camelMapping[key];
			}
		}
		return JSON.stringify(camelMapping);
	}

	// Robust form submission handler
	function handleFormSubmit() {
		isSubmitting = true;
		return async ({ result, update }: { result: any; update: any }) => {
			isSubmitting = false;
			if (result.type === 'failure') {
				toast.error('Error', {
					description: result.data?.error || 'An unexpected error occurred'
				});
			} else if (result.type === 'success') {
				// Success toast handled by next step transition usually, but can add specific messages
				if (currentStep === 'upload') toast.success('CSV uploaded successfully');
				if (currentStep === 'mapping') toast.success('Mapping validated');
				if (currentStep === 'preview') toast.success('Import committed');
			}
			await update();
		};
	}

	// Derived state for validation
	const isNameMapped = $derived(
		!!mapping.full_name_column || (!!mapping.first_name_column && !!mapping.last_name_column)
	);
</script>

<svelte:head>
	<title>Import Employees | SvelteHR</title>
</svelte:head>

<div class="container mx-auto max-w-5xl py-10">
	<h1 class="mb-2 text-3xl font-bold">Employee Import Wizard</h1>
	<p class="mb-8 text-muted-foreground">Follow the steps to bulk import employees.</p>

	<!-- Stepper -->
	<div class="mb-8 flex items-center justify-between">
		{#each ['upload', 'mapping', 'preview', 'complete'] as step, i}
			<div class="flex flex-col items-center">
				<div
					class={`flex h-10 w-10 items-center justify-center rounded-full border-2 ${currentStep === step ? 'border-primary bg-primary text-white' : 'border-muted-foreground bg-background text-muted-foreground'}`}
				>
					{i + 1}
				</div>
				<span class="mt-2 text-sm capitalize">{step}</span>
			</div>
			{#if i < 3}
				<div class="mx-4 h-1 flex-1 bg-muted"></div>
			{/if}
		{/each}
	</div>

	<!-- Step 1: Upload -->
	{#if currentStep === 'upload'}
		<div in:fade class="card rounded-lg border bg-card p-6 shadow-sm">
			<h2 class="mb-4 text-xl font-semibold">Upload CSV File</h2>
			<form method="POST" action="?/upload" use:enhance={handleFormSubmit}>
				<div class="mb-4">
					<input
						type="file"
						accept=".csv"
						onchange={handleFileChange}
						class="block w-full text-sm text-muted-foreground file:mr-4 file:rounded-full file:border-0 file:bg-primary file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:bg-primary/90"
						required
					/>
					<input type="hidden" name="csvContent" value={csvContent} />
				</div>
				<button
					class="rounded bg-blue-600 px-4 py-2 font-medium text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
					disabled={!csvContent || isSubmitting}
				>
					{isSubmitting ? 'Uploading...' : 'Next: Map Columns'}
				</button>
			</form>
		</div>
	{/if}

	<!-- Step 2: Mapping -->
	{#if currentStep === 'mapping'}
		<div in:fade class="card rounded-lg border bg-card p-6 shadow-sm">
			<h2 class="mb-4 text-xl font-semibold">Map CSV Columns</h2>
			<p class="mb-4 text-sm text-muted-foreground">Match your CSV headers to the system fields.</p>

			<form method="POST" action="?/validate" use:enhance={handleFormSubmit}>
				<div class="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2">
					<div class="space-y-4">
						<h3 class="font-medium">Name Fields</h3>
						<div class="rounded border border-border/50 bg-muted/30 p-3">
							<label class="mb-3 block">
								<span class="text-sm font-medium">Full Name Column</span>
								<span class="ml-2 text-xs text-muted-foreground">(e.g. "Last, First")</span>
								<select
									bind:value={mapping.full_name_column}
									class="select mt-1 w-full rounded border p-2"
								>
									<option value="">-- Select if single column --</option>
									{#each headers as h}<option value={h}>{h}</option>{/each}
								</select>
							</label>

							<div class="relative my-3">
								<div class="absolute inset-0 flex items-center">
									<span class="w-full border-t"></span>
								</div>
								<div class="relative flex justify-center text-xs uppercase">
									<span class="bg-background px-2 text-muted-foreground">OR Split Columns</span>
								</div>
							</div>

							<div class="grid grid-cols-2 gap-2">
								<label class="block">
									<span class="text-sm">First Name</span>
									<select
										bind:value={mapping.first_name_column}
										class="select mt-1 w-full rounded border p-2"
										disabled={!!mapping.full_name_column}
									>
										<option value="">Select</option>
										{#each headers as h}<option value={h}>{h}</option>{/each}
									</select>
								</label>
								<label class="block">
									<span class="text-sm">Last Name</span>
									<select
										bind:value={mapping.last_name_column}
										class="select mt-1 w-full rounded border p-2"
										disabled={!!mapping.full_name_column}
									>
										<option value="">Select</option>
										{#each headers as h}<option value={h}>{h}</option>{/each}
									</select>
								</label>
							</div>
						</div>
					</div>
					<div class="space-y-4">
						<h3 class="font-medium">Optional Fields</h3>
						<label class="block">
							<span class="text-sm">Email</span>
							<select
								bind:value={mapping.email_column}
								class="select mt-1 w-full rounded border p-2"
							>
								<option value="">Auto-generate if empty</option>
								{#each headers as h}<option value={h}>{h}</option>{/each}
							</select>
						</label>
						<label class="block">
							<span class="text-sm">Role</span>
							<select
								bind:value={mapping.role_column}
								class="select mt-1 w-full rounded border p-2"
							>
								<option value="">Default (Employee)</option>
								{#each headers as h}<option value={h}>{h}</option>{/each}
							</select>
						</label>
						<label class="block">
							<span class="text-sm">Hire Date</span>
							<select
								bind:value={mapping.hire_date_column}
								class="select mt-1 w-full rounded border p-2"
							>
								<option value="">None</option>
								{#each headers as h}<option value={h}>{h}</option>{/each}
							</select>
						</label>
						<label class="block">
							<span class="text-sm">Birth Date</span>
							<select
								bind:value={mapping.birth_date_column}
								class="select mt-1 w-full rounded border p-2"
							>
								<option value="">None</option>
								{#each headers as h}<option value={h}>{h}</option>{/each}
							</select>
						</label>
						<label class="block">
							<span class="text-sm">Home Phone</span>
							<select
								bind:value={mapping.home_phone_column}
								class="select mt-1 w-full rounded border p-2"
							>
								<option value="">None</option>
								{#each headers as h}<option value={h}>{h}</option>{/each}
							</select>
						</label>
						<label class="block">
							<span class="text-sm">Work Phone</span>
							<select
								bind:value={mapping.work_phone_column}
								class="select mt-1 w-full rounded border p-2"
							>
								<option value="">None</option>
								{#each headers as h}<option value={h}>{h}</option>{/each}
							</select>
						</label>
						<label class="block">
							<span class="text-sm">Mobile Phone</span>
							<select
								bind:value={mapping.mobile_phone_column}
								class="select mt-1 w-full rounded border p-2"
							>
								<option value="">None</option>
								{#each headers as h}<option value={h}>{h}</option>{/each}
							</select>
						</label>
						<label class="block">
							<span class="text-sm">Nickname</span>
							<select
								bind:value={mapping.nickname_column}
								class="select mt-1 w-full rounded border p-2"
							>
								<option value="">None</option>
								{#each headers as h}<option value={h}>{h}</option>{/each}
							</select>
						</label>
						<label class="block">
							<span class="text-sm">Social Media Release</span>
							<select
								bind:value={mapping.social_media_release_column}
								class="select mt-1 w-full rounded border p-2"
							>
								<option value="">None</option>
								{#each headers as h}<option value={h}>{h}</option>{/each}
							</select>
						</label>
					</div>
				</div>

				<input type="hidden" name="mapping" value={getMappingJson()} />
				<button
					class="rounded bg-blue-600 px-4 py-2 font-medium text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
					disabled={!isNameMapped || isSubmitting}
				>
					{isSubmitting ? 'Validating...' : 'Next: Validate & Preview'}
				</button>
			</form>
		</div>
	{/if}

	<!-- Step 3: Preview -->
	{#if currentStep === 'preview' && form?.job}
		<div in:fade class="card rounded-lg border bg-card p-6 shadow-sm">
			<h2 class="mb-4 text-xl font-semibold">Validation Results</h2>

			<div class="mb-6 grid grid-cols-3 gap-4 text-center">
				<div class="rounded bg-muted p-4">
					<div class="text-2xl font-bold">{form.job?.totalRows}</div>
					<div class="text-sm">Total Rows</div>
				</div>
				<div class="rounded bg-green-100 p-4 text-green-700 dark:bg-green-900 dark:text-green-100">
					<div class="text-2xl font-bold">{form.job?.validRows}</div>
					<div class="text-sm">Valid</div>
				</div>
				<div class="rounded bg-red-100 p-4 text-red-700 dark:bg-red-900 dark:text-red-100">
					<div class="text-2xl font-bold">{form.job?.errorRows}</div>
					<div class="text-sm">Errors</div>
				</div>
			</div>

			<!-- Errors List -->
			{#if (form.job?.errorRows || 0) > 0}
				<div class="mb-6 overflow-hidden rounded-lg border">
					<div class="border-b bg-red-50 p-3 font-medium text-red-700 dark:bg-red-950">
						Rows with Errors
					</div>
					<div class="max-h-60 overflow-y-auto bg-background p-4">
						{#each form.job?.importRows?.filter((r: any) => r.status === 'ERROR') || [] as row}
							<div class="mb-2 border-b pb-2 last:border-0">
								<span class="font-bold text-red-500">Row {row.rowNumber}:</span>
								<span class="ml-2 text-sm"
									>{row.validationErrors
										? JSON.parse(row.validationErrors).join(', ')
										: 'Unknown Error'}</span
								>
							</div>
						{/each}
					</div>
				</div>
			{/if}

			<form method="POST" action="?/commit" use:enhance={handleFormSubmit}>
				<input type="hidden" name="jobId" value={jobId} />

				<div class="mb-4 max-w-md">
					<label class="mb-2 block text-sm font-medium">
						Temporary Password for New Users
						<input
							type="text"
							name="temporaryPassword"
							bind:value={temporaryPassword}
							class="input mt-1 w-full rounded border p-2"
							minlength="8"
							required
							placeholder="At least 8 chars"
						/>
					</label>
				</div>

				<div class="flex gap-4">
					<button
						class="rounded bg-blue-600 px-4 py-2 font-medium text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
						disabled={form.job?.validRows === 0 || !temporaryPassword || isSubmitting}
					>
						{isSubmitting ? 'Importing...' : `Import ${form.job?.validRows} Users`}
					</button>
					<button
						type="button"
						class="rounded border border-gray-300 px-4 py-2 font-medium transition-colors hover:bg-gray-50"
						onclick={() => (currentStep = 'mapping')}>Back</button
					>
				</div>
			</form>
		</div>
	{/if}

	<!-- Step 4: Complete -->
	{#if currentStep === 'complete'}
		<div in:fade class="card rounded-lg border bg-card p-10 text-center shadow-sm">
			<div class="mb-4 text-5xl">🎉</div>
			<h2 class="mb-2 text-2xl font-bold">Import Completed!</h2>
			<p class="mb-6 text-muted-foreground">The employee data has been successfully imported.</p>
			<a
				href="/dashboard/employees"
				class="rounded bg-blue-600 px-4 py-2 font-medium text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
				>View Employees</a
			>
			<button
				class="ml-4 rounded px-4 py-2 font-medium text-blue-600 transition-colors hover:underline"
				onclick={() => window.location.reload()}>Import Another File</button
			>
		</div>
	{/if}

	{#if form?.error}
		<div class="mt-6 rounded border border-red-200 bg-red-100 p-4 text-red-700">
			<strong>Error:</strong>
			{form.error}
		</div>
	{/if}
</div>
