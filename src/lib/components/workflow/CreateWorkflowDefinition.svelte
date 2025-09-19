<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import { workflowActions } from '$lib/stores/workflow';
	import { user } from '$lib/stores/auth';

	const dispatch = createEventDispatcher();

	let isLoading = false;
	let error = '';

	// Form data
	let formData = {
		name: '',
		description: '',
		category: '',
		triggerType: 'manual',
		triggerConditions: '{}',
		definition: '{"steps": []}',
		isTemplate: false,
		timeoutMinutes: 60,
		maxRetries: 3,
		retryDelayMinutes: 5,
		status: 'draft',
		departmentId: null
	};

	const categories = [
		'Onboarding',
		'Offboarding',
		'Performance',
		'Leave',
		'Compliance',
		'Training',
		'Recruitment',
		'Other'
	];

	const triggerTypes = [
		{ value: 'manual', label: 'Manual' },
		{ value: 'scheduled', label: 'Scheduled' },
		{ value: 'event', label: 'Event-driven' },
		{ value: 'webhook', label: 'Webhook' }
	];

	let isValidJson = {
		triggerConditions: true,
		definition: true
	};

	// Validate JSON fields
	function validateJson(field: 'triggerConditions' | 'definition', value: string) {
		try {
			JSON.parse(value);
			isValidJson[field] = true;
		} catch {
			isValidJson[field] = false;
		}
	}

	// Handle form submission
	async function handleSubmit() {
		// Validate required fields
		if (!formData.name.trim()) {
			error = 'Name is required';
			return;
		}

		if (!formData.description.trim()) {
			error = 'Description is required';
			return;
		}

		if (!isValidJson.triggerConditions || !isValidJson.definition) {
			error = 'Invalid JSON in trigger conditions or definition';
			return;
		}

		isLoading = true;
		error = '';

		try {
			// Prepare input data
			const input = {
				workflowDefinition: {
					name: formData.name.trim(),
					description: formData.description.trim(),
					category: formData.category || null,
					triggerType: formData.triggerType,
					triggerConditions: JSON.parse(formData.triggerConditions),
					definition: JSON.parse(formData.definition),
					isTemplate: formData.isTemplate,
					timeoutMinutes: formData.timeoutMinutes,
					maxRetries: formData.maxRetries,
					retryDelayMinutes: formData.retryDelayMinutes,
					status: formData.status,
					createdBy: $user?.id,
					departmentId: formData.departmentId,
					version: 1
				}
			};

			const success = await workflowActions.createDefinition(input);

			if (success) {
				dispatch('success');
			} else {
				error = 'Failed to create workflow definition';
			}
		} catch (err) {
			error = err instanceof Error ? err.message : 'An unexpected error occurred';
		} finally {
			isLoading = false;
		}
	}

	function handleCancel() {
		dispatch('cancel');
	}

	// JSON formatting helpers
	function formatJson(field: 'triggerConditions' | 'definition') {
		try {
			const parsed = JSON.parse(formData[field]);
			formData[field] = JSON.stringify(parsed, null, 2);
			validateJson(field, formData[field]);
		} catch {
			// Keep original if invalid
		}
	}
</script>

<!-- Modal Backdrop -->
<div class="fixed inset-0 z-50 flex items-center justify-center bg-gray-500 bg-opacity-75 p-4">
	<div class="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-lg bg-white shadow-xl">
		<!-- Header -->
		<div class="border-b border-gray-200 px-6 py-4">
			<div class="flex items-center justify-between">
				<h3 class="text-lg font-medium text-gray-900">Create Workflow Definition</h3>
				<button on:click={handleCancel} class="text-gray-400 hover:text-gray-600">
					<svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M6 18L18 6M6 6l12 12"
						/>
					</svg>
				</button>
			</div>
		</div>

		<!-- Form -->
		<form on:submit|preventDefault={handleSubmit} class="space-y-6 px-6 py-4">
			<!-- Error Display -->
			{#if error}
				<div class="rounded-md border border-red-200 bg-red-50 p-4">
					<div class="flex">
						<svg class="mr-2 h-5 w-5 text-red-400" fill="currentColor" viewBox="0 0 20 20">
							<path
								fill-rule="evenodd"
								d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
								clip-rule="evenodd"
							/>
						</svg>
						<div>
							<h3 class="text-sm font-medium text-red-800">Error</h3>
							<p class="mt-1 text-sm text-red-700">{error}</p>
						</div>
					</div>
				</div>
			{/if}

			<!-- Basic Information -->
			<div class="grid grid-cols-1 gap-6 md:grid-cols-2">
				<div class="md:col-span-2">
					<label for="name" class="block text-sm font-medium text-gray-700"> Name * </label>
					<input
						id="name"
						type="text"
						bind:value={formData.name}
						required
						class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
						placeholder="Enter workflow name"
					/>
				</div>

				<div class="md:col-span-2">
					<label for="description" class="block text-sm font-medium text-gray-700">
						Description *
					</label>
					<textarea
						id="description"
						bind:value={formData.description}
						required
						rows="3"
						class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
						placeholder="Describe what this workflow does"
					></textarea>
				</div>

				<div>
					<label for="category" class="block text-sm font-medium text-gray-700"> Category </label>
					<select
						id="category"
						bind:value={formData.category}
						class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
					>
						<option value="">Select category</option>
						{#each categories as category}
							<option value={category}>{category}</option>
						{/each}
					</select>
				</div>

				<div>
					<label for="triggerType" class="block text-sm font-medium text-gray-700">
						Trigger Type *
					</label>
					<select
						id="triggerType"
						bind:value={formData.triggerType}
						required
						class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
					>
						{#each triggerTypes as trigger}
							<option value={trigger.value}>{trigger.label}</option>
						{/each}
					</select>
				</div>

				<div>
					<label for="status" class="block text-sm font-medium text-gray-700"> Status </label>
					<select
						id="status"
						bind:value={formData.status}
						class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
					>
						<option value="draft">Draft</option>
						<option value="active">Active</option>
						<option value="inactive">Inactive</option>
					</select>
				</div>

				<div>
					<label class="flex items-center">
						<input
							type="checkbox"
							bind:checked={formData.isTemplate}
							class="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
						/>
						<span class="ml-2 text-sm text-gray-700">Is Template</span>
					</label>
				</div>
			</div>

			<!-- Configuration -->
			<div>
				<h4 class="mb-4 text-sm font-medium text-gray-900">Configuration</h4>
				<div class="grid grid-cols-1 gap-4 md:grid-cols-3">
					<div>
						<label for="timeoutMinutes" class="block text-sm font-medium text-gray-700">
							Timeout (minutes)
						</label>
						<input
							id="timeoutMinutes"
							type="number"
							bind:value={formData.timeoutMinutes}
							min="1"
							max="10080"
							class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
						/>
					</div>

					<div>
						<label for="maxRetries" class="block text-sm font-medium text-gray-700">
							Max Retries
						</label>
						<input
							id="maxRetries"
							type="number"
							bind:value={formData.maxRetries}
							min="0"
							max="10"
							class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
						/>
					</div>

					<div>
						<label for="retryDelayMinutes" class="block text-sm font-medium text-gray-700">
							Retry Delay (minutes)
						</label>
						<input
							id="retryDelayMinutes"
							type="number"
							bind:value={formData.retryDelayMinutes}
							min="1"
							max="1440"
							class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
						/>
					</div>
				</div>
			</div>

			<!-- Trigger Conditions -->
			<div>
				<div class="mb-2 flex items-center justify-between">
					<label for="triggerConditions" class="block text-sm font-medium text-gray-700">
						Trigger Conditions (JSON)
					</label>
					<button
						type="button"
						on:click={() => formatJson('triggerConditions')}
						class="text-xs text-blue-600 hover:text-blue-800"
					>
						Format JSON
					</button>
				</div>
				<textarea
					id="triggerConditions"
					bind:value={formData.triggerConditions}
					on:input={() => validateJson('triggerConditions', formData.triggerConditions)}
					rows="4"
					class={`mt-1 block w-full rounded-md border font-mono text-sm shadow-sm focus:border-blue-500 focus:ring-blue-500 ${isValidJson.triggerConditions ? 'border-gray-300' : 'border-red-300'}`}
					placeholder={`{"condition": "example"}`}
				></textarea>
				{#if !isValidJson.triggerConditions}
					<p class="mt-1 text-sm text-red-600">Invalid JSON format</p>
				{/if}
			</div>

			<!-- Workflow Definition -->
			<div>
				<div class="mb-2 flex items-center justify-between">
					<label for="definition" class="block text-sm font-medium text-gray-700">
						Workflow Definition (JSON)
					</label>
					<button
						type="button"
						on:click={() => formatJson('definition')}
						class="text-xs text-blue-600 hover:text-blue-800"
					>
						Format JSON
					</button>
				</div>
				<textarea
					id="definition"
					bind:value={formData.definition}
					on:input={() => validateJson('definition', formData.definition)}
					rows="6"
					class={`mt-1 block w-full rounded-md border font-mono text-sm shadow-sm focus:border-blue-500 focus:ring-blue-500 ${isValidJson.definition ? 'border-gray-300' : 'border-red-300'}`}
					placeholder={`{"steps": [{"name": "step1", "type": "action", "config": {}}]}`}
				></textarea>
				{#if !isValidJson.definition}
					<p class="mt-1 text-sm text-red-600">Invalid JSON format</p>
				{/if}
			</div>
		</form>

		<!-- Footer -->
		<div class="flex justify-end space-x-3 border-t border-gray-200 px-6 py-4">
			<button
				type="button"
				on:click={handleCancel}
				class="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
			>
				Cancel
			</button>
			<button
				type="submit"
				on:click={handleSubmit}
				disabled={isLoading || !isValidJson.triggerConditions || !isValidJson.definition}
				class="rounded-md border border-transparent bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
			>
				{#if isLoading}
					<svg
						class="-ml-1 mr-3 inline h-4 w-4 animate-spin text-white"
						fill="none"
						viewBox="0 0 24 24"
					>
						<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"
						></circle>
						<path
							class="opacity-75"
							fill="currentColor"
							d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
						></path>
					</svg>
					Creating...
				{:else}
					Create Workflow
				{/if}
			</button>
		</div>
	</div>
</div>
