<script lang="ts">
	import { createUrqlClient } from '$lib/graphql/client';
	import {
		EMAIL_DIGEST_LOGS_QUERY,
		CREATE_EMAIL_DIGEST_MUTATION,
		UPDATE_EMAIL_DIGEST_MUTATION,
		DELETE_EMAIL_DIGEST_MUTATION,
		SEND_EMAIL_DIGEST_MUTATION,
		type EmailDigest,
		type EmailDigestLog,
		type CreateEmailDigestInput
	} from '$lib/graphql/digest-operations';
	import { invalidateAll } from '$app/navigation';

	let { data } = $props();

	const client = createUrqlClient(fetch);

	// State
	let showCreateDialog = $state(false);
	let showEditDialog = $state(false);
	let showLogsDialog = $state(false);
	let selectedDigest = $state<EmailDigest | null>(null);
	let digestLogs = $state<EmailDigestLog[]>([]);
	let isLoading = $state(false);
	let error = $state<string | null>(null);

	// Form state
	let formData = $state<CreateEmailDigestInput>({
		name: '',
		scheduleCron: '0 9 * * 1', // Weekly Monday at 9 AM
		recipients: [],
		includeSyncSummary: true,
		includeConflicts: true,
		includeHealthMetrics: true,
		includeNewEmployees: false,
		enabled: true
	});
	let recipientInput = $state('');

	// Preset cron schedules
	const cronPresets = [
		{ label: 'Daily at 9 AM', value: '0 9 * * *' },
		{ label: 'Weekly (Monday 9 AM)', value: '0 9 * * 1' },
		{ label: 'Monthly (1st at 9 AM)', value: '0 9 1 * *' },
		{ label: 'Custom', value: 'custom' }
	];

	// Format date for display
	function formatDate(dateString: string | null): string {
		if (!dateString) return 'Never';
		return new Date(dateString).toLocaleString();
	}

	// Add recipient to list
	function addRecipient() {
		const email = recipientInput.trim();
		if (email && !formData.recipients.includes(email)) {
			formData.recipients = [...formData.recipients, email];
			recipientInput = '';
		}
	}

	// Remove recipient from list
	function removeRecipient(email: string) {
		formData.recipients = formData.recipients.filter((r) => r !== email);
	}

	// Open create dialog
	function openCreateDialog() {
		formData = {
			name: '',
			scheduleCron: '0 9 * * 1',
			recipients: [],
			includeSyncSummary: true,
			includeConflicts: true,
			includeHealthMetrics: true,
			includeNewEmployees: false,
			enabled: true
		};
		recipientInput = '';
		showCreateDialog = true;
		error = null;
	}

	// Open edit dialog
	function openEditDialog(digest: EmailDigest) {
		selectedDigest = digest;
		formData = {
			name: digest.name,
			scheduleCron: digest.scheduleCron,
			recipients: [...digest.recipients],
			includeSyncSummary: digest.includeSyncSummary,
			includeConflicts: digest.includeConflicts,
			includeHealthMetrics: digest.includeHealthMetrics,
			includeNewEmployees: digest.includeNewEmployees,
			enabled: digest.enabled
		};
		recipientInput = '';
		showEditDialog = true;
		error = null;
	}

	// Create digest
	async function createDigest() {
		if (!formData.name || formData.recipients.length === 0) {
			error = 'Name and at least one recipient are required';
			return;
		}

		isLoading = true;
		error = null;

		try {
			const result = await client
				.mutation(CREATE_EMAIL_DIGEST_MUTATION, { input: formData })
				.toPromise();

			if (result.error) {
				error = result.error.message;
			} else {
				showCreateDialog = false;
				await invalidateAll();
			}
		} catch (e) {
			error = e instanceof Error ? e.message : 'Failed to create digest';
		} finally {
			isLoading = false;
		}
	}

	// Update digest
	async function updateDigest() {
		if (!selectedDigest || !formData.name || formData.recipients.length === 0) {
			error = 'Name and at least one recipient are required';
			return;
		}

		isLoading = true;
		error = null;

		try {
			const result = await client
				.mutation(UPDATE_EMAIL_DIGEST_MUTATION, {
					digestId: selectedDigest.id,
					input: formData
				})
				.toPromise();

			if (result.error) {
				error = result.error.message;
			} else {
				showEditDialog = false;
				await invalidateAll();
			}
		} catch (e) {
			error = e instanceof Error ? e.message : 'Failed to update digest';
		} finally {
			isLoading = false;
		}
	}

	// Delete digest
	async function deleteDigest(digestId: string) {
		if (!confirm('Are you sure you want to delete this email digest?')) {
			return;
		}

		isLoading = true;
		error = null;

		try {
			const result = await client.mutation(DELETE_EMAIL_DIGEST_MUTATION, { digestId }).toPromise();

			if (result.error) {
				error = result.error.message;
			} else {
				await invalidateAll();
			}
		} catch (e) {
			error = e instanceof Error ? e.message : 'Failed to delete digest';
		} finally {
			isLoading = false;
		}
	}

	// Send digest manually
	async function sendDigest(digestId: string) {
		if (!confirm('Send this digest now? This will generate and send an email to all recipients.')) {
			return;
		}

		isLoading = true;
		error = null;

		try {
			const result = await client
				.mutation(SEND_EMAIL_DIGEST_MUTATION, {
					digestId,
					input: { periodDays: 7 }
				})
				.toPromise();

			if (result.error) {
				error = result.error.message;
			} else {
				const data = result.data?.sendEmailDigest;
				if (data?.success) {
					alert(`Digest sent successfully to ${data.recipientsCount} recipients!`);
				} else {
					error = data?.errorMessage || 'Failed to send digest';
				}
				await invalidateAll();
			}
		} catch (e) {
			error = e instanceof Error ? e.message : 'Failed to send digest';
		} finally {
			isLoading = false;
		}
	}

	// View digest logs
	async function viewLogs(digest: EmailDigest) {
		selectedDigest = digest;
		isLoading = true;
		error = null;

		try {
			const result = await client
				.query(EMAIL_DIGEST_LOGS_QUERY, { digestId: digest.id, limit: 20 })
				.toPromise();

			if (result.error) {
				error = result.error.message;
			} else {
				digestLogs = result.data?.emailDigestLogs || [];
				showLogsDialog = true;
			}
		} catch (e) {
			error = e instanceof Error ? e.message : 'Failed to load logs';
		} finally {
			isLoading = false;
		}
	}
</script>

<div class="container mx-auto p-6 max-w-7xl">
	<div class="mb-8">
		<h1 class="text-3xl font-bold mb-2">Email Digest Configuration</h1>
		<p class="text-gray-600">
			Configure automated email summaries of sync activity, conflicts, and system health
		</p>
	</div>

	{#if error}
		<div class="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg mb-6">
			<strong>Error:</strong>
			{error}
			<button onclick={() => (error = null)} class="float-right text-red-600 hover:text-red-800">
				×
			</button>
		</div>
	{/if}

	<div class="mb-6">
		<button
			onclick={openCreateDialog}
			class="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
		>
			+ Create New Digest
		</button>
	</div>

	<!-- Digests List -->
	<div class="grid gap-6">
		{#each data.digests as digest}
			<div class="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
				<div class="flex justify-between items-start mb-4">
					<div>
						<h3 class="text-xl font-semibold mb-1">{digest.name}</h3>
						<p class="text-sm text-gray-600">Schedule: {digest.scheduleCron}</p>
					</div>
					<div class="flex items-center gap-2">
						{#if digest.enabled}
							<span class="px-3 py-1 bg-green-100 text-green-800 text-sm rounded-full">
								Enabled
							</span>
						{:else}
							<span class="px-3 py-1 bg-gray-100 text-gray-600 text-sm rounded-full">
								Disabled
							</span>
						{/if}
					</div>
				</div>

				<div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4 text-sm">
					<div>
						<div class="text-gray-600">Recipients</div>
						<div class="font-medium">{digest.recipients.length}</div>
					</div>
					<div>
						<div class="text-gray-600">Last Sent</div>
						<div class="font-medium">{formatDate(digest.lastSentAt)}</div>
					</div>
					<div>
						<div class="text-gray-600">Next Send</div>
						<div class="font-medium">{formatDate(digest.nextSendAt)}</div>
					</div>
					<div>
						<div class="text-gray-600">Content Includes</div>
						<div class="font-medium">
							{[
								digest.includeSyncSummary && 'Syncs',
								digest.includeConflicts && 'Conflicts',
								digest.includeHealthMetrics && 'Health',
								digest.includeNewEmployees && 'Employees'
							]
								.filter(Boolean)
								.join(', ')}
						</div>
					</div>
				</div>

				<div class="flex gap-2">
					<button
						onclick={() => openEditDialog(digest)}
						class="px-3 py-1 bg-gray-100 hover:bg-gray-200 rounded transition text-sm"
					>
						Edit
					</button>
					<button
						onclick={() => viewLogs(digest)}
						class="px-3 py-1 bg-gray-100 hover:bg-gray-200 rounded transition text-sm"
					>
						View Logs
					</button>
					<button
						onclick={() => sendDigest(digest.id)}
						class="px-3 py-1 bg-blue-100 hover:bg-blue-200 text-blue-800 rounded transition text-sm"
					>
						Send Now
					</button>
					<button
						onclick={() => deleteDigest(digest.id)}
						class="px-3 py-1 bg-red-100 hover:bg-red-200 text-red-800 rounded transition text-sm ml-auto"
					>
						Delete
					</button>
				</div>
			</div>
		{:else}
			<div class="bg-gray-50 border border-gray-200 rounded-lg p-12 text-center">
				<p class="text-gray-600 mb-4">No email digests configured yet</p>
				<button
					onclick={openCreateDialog}
					class="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition"
				>
					Create Your First Digest
				</button>
			</div>
		{/each}
	</div>
</div>

<!-- Create/Edit Dialog -->
{#if showCreateDialog || showEditDialog}
	<div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
		<div class="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6">
			<h2 class="text-2xl font-bold mb-4">
				{showCreateDialog ? 'Create' : 'Edit'} Email Digest
			</h2>

			<div class="space-y-4">
				<!-- Name -->
				<div>
					<label for="digest-name" class="block text-sm font-medium mb-1">Name</label>
					<input
						id="digest-name"
						type="text"
						bind:value={formData.name}
						class="w-full border border-gray-300 rounded-lg px-3 py-2"
						placeholder="Weekly Sync Summary"
					/>
				</div>

				<!-- Schedule -->
				<div>
					<label for="digest-schedule" class="block text-sm font-medium mb-1">Schedule</label>
					<select
						id="digest-schedule"
						bind:value={formData.scheduleCron}
						class="w-full border border-gray-300 rounded-lg px-3 py-2"
					>
						{#each cronPresets as preset}
							<option value={preset.value}>{preset.label}</option>
						{/each}
					</select>
					{#if formData.scheduleCron === 'custom'}
						<input
							type="text"
							bind:value={formData.scheduleCron}
							class="w-full border border-gray-300 rounded-lg px-3 py-2 mt-2"
							placeholder="0 9 * * *"
						/>
					{/if}
				</div>

				<!-- Recipients -->
				<div>
					<label for="digest-recipient" class="block text-sm font-medium mb-1">Recipients</label>
					<div class="flex gap-2 mb-2">
						<input
							id="digest-recipient"
							type="email"
							bind:value={recipientInput}
							onkeydown={(e) => e.key === 'Enter' && (e.preventDefault(), addRecipient())}
							class="flex-1 border border-gray-300 rounded-lg px-3 py-2"
							placeholder="email@example.com"
						/>
						<button
							onclick={addRecipient}
							type="button"
							class="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
						>
							Add
						</button>
					</div>
					<div class="flex flex-wrap gap-2">
						{#each formData.recipients as email}
							<span class="bg-gray-100 px-3 py-1 rounded-full text-sm flex items-center gap-2">
								{email}
								<button
									onclick={() => removeRecipient(email)}
									class="text-gray-600 hover:text-gray-800"
								>
									×
								</button>
							</span>
						{/each}
					</div>
				</div>

				<!-- Content Options -->
				<fieldset>
					<legend class="block text-sm font-medium mb-2">Include in Digest</legend>
					<div class="space-y-2">
						<label class="flex items-center gap-2">
							<input type="checkbox" bind:checked={formData.includeSyncSummary} />
							<span>Sync Summary (total syncs, success/fail counts)</span>
						</label>
						<label class="flex items-center gap-2">
							<input type="checkbox" bind:checked={formData.includeConflicts} />
							<span>Conflicts (detected and resolved)</span>
						</label>
						<label class="flex items-center gap-2">
							<input type="checkbox" bind:checked={formData.includeHealthMetrics} />
							<span>Health Metrics (uptime, data quality)</span>
						</label>
						<label class="flex items-center gap-2">
							<input type="checkbox" bind:checked={formData.includeNewEmployees} />
							<span>Employee Changes (new and updated)</span>
						</label>
					</div>
				</fieldset>

				<!-- Enabled -->
				<div>
					<label class="flex items-center gap-2">
						<input type="checkbox" bind:checked={formData.enabled} />
						<span class="text-sm font-medium">Enabled (send automatically on schedule)</span>
					</label>
				</div>
			</div>

			<div class="flex gap-2 mt-6">
				<button
					onclick={showCreateDialog ? createDigest : updateDigest}
					disabled={isLoading}
					class="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
				>
					{isLoading ? 'Saving...' : showCreateDialog ? 'Create' : 'Update'}
				</button>
				<button
					onclick={() => {
						showCreateDialog = false;
						showEditDialog = false;
					}}
					class="bg-gray-100 px-6 py-2 rounded-lg hover:bg-gray-200"
				>
					Cancel
				</button>
			</div>
		</div>
	</div>
{/if}

<!-- Logs Dialog -->
{#if showLogsDialog && selectedDigest}
	<div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
		<div class="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto p-6">
			<h2 class="text-2xl font-bold mb-4">Delivery Logs: {selectedDigest.name}</h2>

			<div class="space-y-4">
				{#each digestLogs as log}
					<div class="border border-gray-200 rounded-lg p-4">
						<div class="flex justify-between items-start mb-2">
							<div>
								<div class="text-sm text-gray-600">Sent: {formatDate(log.sentAt)}</div>
								<div class="text-sm text-gray-600">
									Recipients: {log.recipients.length} ({log.recipients.join(', ')})
								</div>
							</div>
							<div>
								{#if log.success}
									<span class="px-3 py-1 bg-green-100 text-green-800 text-sm rounded-full">
										Success
									</span>
								{:else}
									<span class="px-3 py-1 bg-red-100 text-red-800 text-sm rounded-full">Failed</span>
								{/if}
							</div>
						</div>

						{#if log.errorMessage}
							<div class="bg-red-50 text-red-800 text-sm p-2 rounded mt-2">
								Error: {log.errorMessage}
							</div>
						{/if}

						{#if log.contentSummary}
							<div class="grid grid-cols-4 gap-4 mt-3 text-sm">
								<div>
									<div class="text-gray-600">Total Syncs</div>
									<div class="font-medium">{log.contentSummary.totalSyncs}</div>
								</div>
								<div>
									<div class="text-gray-600">Conflicts</div>
									<div class="font-medium">{log.contentSummary.conflictsDetected}</div>
								</div>
								<div>
									<div class="text-gray-600">New Employees</div>
									<div class="font-medium">{log.contentSummary.newEmployees}</div>
								</div>
								<div>
									<div class="text-gray-600">Quality Score</div>
									<div class="font-medium">
										{log.contentSummary.dataQualityScore.toFixed(1)}%
									</div>
								</div>
							</div>
						{/if}
					</div>
				{:else}
					<div class="text-center text-gray-600 py-8">No delivery logs yet</div>
				{/each}
			</div>

			<div class="mt-6">
				<button
					onclick={() => (showLogsDialog = false)}
					class="bg-gray-100 px-6 py-2 rounded-lg hover:bg-gray-200"
				>
					Close
				</button>
			</div>
		</div>
	</div>
{/if}
