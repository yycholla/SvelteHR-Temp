<script lang="ts">
	import { onMount } from 'svelte';
	import { createFormStore } from '$lib/stores/hr/forms';
	import { documentSchema } from '../utils/validation';
	import { documentApi, employeeApi } from '../utils/api-helpers';
	import { notifications } from '../utils/notifications';
	import type { Employee } from '$lib/stores/hr/employees';

	interface Document {
		id?: string;
		title: string;
		description?: string;
		category: string;
		employee_id?: string;
		is_public: boolean;
		file_url?: string;
		file_size?: number;
		file_type?: string;
		created_at?: string;
		updated_at?: string;
	}

	let {
		document = null,
		mode = 'create',
		onCancel,
		onSuccess
	}: {
		document: Document | null;
		mode: 'create' | 'edit' | 'view';
		onCancel: () => void;
		onSuccess: (document: Document) => void;
	} = $props();

	const isReadonly = $derived(mode === 'view');
	const isEditing = $derived(mode === 'edit');

	const initialData = {
		title: document?.title || '',
		description: document?.description || '',
		category: document?.category || '',
		employee_id: document?.employee_id || '',
		is_public: document?.is_public ?? false
	};

	const form = createFormStore(initialData);

	let employees: Employee[] = [];
	let loadingEmployees = false;
	let selectedFile: File | null = null;
	let dragOver = false;
	let uploadProgress = 0;

	const documentCategories = [
		'HR Policies',
		'Employee Handbook',
		'Job Descriptions',
		'Training Materials',
		'Forms and Templates',
		'Compliance Documents',
		'Benefits Information',
		'Performance Reviews',
		'Contracts',
		'Certificates',
		'Legal Documents',
		'Other'
	];

	const allowedFileTypes = [
		'.pdf',
		'.doc',
		'.docx',
		'.txt',
		'.jpg',
		'.jpeg',
		'.png',
		'.gif',
		'.xlsx',
		'.xls',
		'.ppt',
		'.pptx'
	];

	const maxFileSize = 10 * 1024 * 1024; // 10MB

	onMount(async () => {
		await loadEmployees();
	});

	async function loadEmployees() {
		loadingEmployees = true;
		try {
			const response = await employeeApi.getAll({ status: 'active', limit: 100 });
			employees = response.data.data;
		} catch (error) {
			notifications.apiError('Failed to load employees');
		} finally {
			loadingEmployees = false;
		}
	}

	function handleFileSelect(event: Event) {
		const target = event.target as HTMLInputElement;
		const file = target.files?.[0];
		if (file) {
			validateAndSetFile(file);
		}
	}

	function handleFileDrop(event: DragEvent) {
		event.preventDefault();
		dragOver = false;
		
		const file = event.dataTransfer?.files[0];
		if (file) {
			validateAndSetFile(file);
		}
	}

	function validateAndSetFile(file: File) {
		// Check file size
		if (file.size > maxFileSize) {
			notifications.error('File size must be less than 10MB');
			return;
		}

		// Check file type
		const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();
		if (!allowedFileTypes.includes(fileExtension)) {
			notifications.error('File type not allowed. Please select a valid document file.');
			return;
		}

		selectedFile = file;
		
		// Auto-fill title if empty
		if (!$form.data.title) {
			const nameWithoutExtension = file.name.replace(/\.[^/.]+$/, '');
			form.updateField('title', nameWithoutExtension);
		}
	}

	function removeFile() {
		selectedFile = null;
		// Reset file input
		const fileInput = document.getElementById('file') as HTMLInputElement;
		if (fileInput) fileInput.value = '';
	}

	function formatFileSize(bytes: number): string {
		if (bytes === 0) return '0 Bytes';
		const k = 1024;
		const sizes = ['Bytes', 'KB', 'MB', 'GB'];
		const i = Math.floor(Math.log(bytes) / Math.log(k));
		return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
	}

	async function handleSubmit() {
		if (isReadonly) return;

		if (!form.validate()) {
			notifications.validationError('Please fix the errors and try again');
			return;
		}

		if (!isEditing && !selectedFile) {
			notifications.error('Please select a file to upload');
			return;
		}

		form.setSubmitting(true);
		uploadProgress = 0;

		try {
			let savedDocument: Document;

			if (isEditing && document) {
				// For editing, we might only update metadata
				savedDocument = {
					...document,
					...$form.data,
					updated_at: new Date().toISOString()
				};
				notifications.success('Document updated successfully');
			} else if (selectedFile) {
				// Simulate upload progress
				const progressInterval = setInterval(() => {
					uploadProgress += 10;
					if (uploadProgress >= 90) {
						clearInterval(progressInterval);
					}
				}, 200);

				const response = await documentApi.upload(selectedFile, $form.data);
				clearInterval(progressInterval);
				uploadProgress = 100;
				
				savedDocument = response.data;
				notifications.documentUploaded(selectedFile.name);
			} else {
				throw new Error('No file selected');
			}

			onSuccess(savedDocument);
		} catch (error) {
			uploadProgress = 0;
			notifications.apiError(error instanceof Error ? error.message : 'Failed to save document');
		} finally {
			form.setSubmitting(false);
		}
	}

	function getEmployeeName(employeeId: string): string {
		const employee = employees.find(emp => emp.id === employeeId);
		return employee ? `${employee.first_name} ${employee.last_name}` : 'Unknown Employee';
	}

	const formState = $derived($form);
</script>

<form on:submit|preventDefault={handleSubmit} class="space-y-6">
	<!-- File Upload (Create mode only) -->
	{#if !isEditing && !isReadonly}
		<div class="space-y-4">
			<label class="label">
				<span>File Upload *</span>
			</label>
			
			<!-- File Drop Zone -->
			<div 
				class="border-2 border-dashed rounded-lg p-8 text-center transition-colors"
				class:border-primary-500={dragOver}
				class:bg-primary-50={dragOver}
				class:border-surface-300={!dragOver}
				on:dragover|preventDefault={() => dragOver = true}
				on:dragleave={() => dragOver = false}
				on:drop={handleFileDrop}
			>
				{#if selectedFile}
					<div class="space-y-4">
						<div class="flex items-center justify-center gap-3">
							<div class="text-4xl">📄</div>
							<div>
								<div class="font-semibold">{selectedFile.name}</div>
								<div class="text-sm text-surface-600-300-token">
									{formatFileSize(selectedFile.size)}
								</div>
							</div>
						</div>
						<button
							type="button"
							class="btn variant-ghost-error btn-sm"
							on:click={removeFile}
						>
							Remove File
						</button>
					</div>
				{:else}
					<div class="space-y-4">
						<div class="text-6xl text-surface-400">📁</div>
						<div>
							<div class="text-lg font-semibold">Drop your file here</div>
							<div class="text-surface-600-300-token">or</div>
						</div>
						<label class="btn variant-filled-primary cursor-pointer">
							Choose File
							<input
								id="file"
								type="file"
								class="hidden"
								accept={allowedFileTypes.join(',')}
								on:change={handleFileSelect}
							/>
						</label>
						<div class="text-sm text-surface-600-300-token">
							Supported: {allowedFileTypes.join(', ')} • Max size: 10MB
						</div>
					</div>
				{/if}
			</div>

			<!-- Upload Progress -->
			{#if uploadProgress > 0 && uploadProgress < 100}
				<div class="space-y-2">
					<div class="flex justify-between text-sm">
						<span>Uploading...</span>
						<span>{uploadProgress}%</span>
					</div>
					<div class="progress">
						<div class="progress-bar" style="width: {uploadProgress}%"></div>
					</div>
				</div>
			{/if}
		</div>
	{/if}

	<!-- Document Title -->
	<div>
		<label class="label" for="title">
			<span>Title *</span>
		</label>
		<input
			id="title"
			type="text"
			class="input"
			class:input-error={formState.errors.title && formState.touched.title}
			bind:value={formState.data.title}
			on:input={(e) => form.updateField('title', e.currentTarget.value)}
			on:blur={() => form.touchField('title')}
			disabled={isReadonly}
			placeholder="Enter document title"
		/>
		{#if formState.errors.title && formState.touched.title}
			<div class="text-error-500 text-sm mt-1">
				{formState.errors.title[0]}
			</div>
		{/if}
	</div>

	<!-- Description -->
	<div>
		<label class="label" for="description">
			<span>Description</span>
		</label>
		<textarea
			id="description"
			class="textarea"
			bind:value={formState.data.description}
			on:input={(e) => form.updateField('description', e.currentTarget.value)}
			disabled={isReadonly}
			placeholder="Enter document description (optional)"
			rows="3"
		></textarea>
	</div>

	<div class="grid grid-cols-1 md:grid-cols-2 gap-6">
		<!-- Category -->
		<div>
			<label class="label" for="category">
				<span>Category *</span>
			</label>
			<select
				id="category"
				class="select"
				class:input-error={formState.errors.category && formState.touched.category}
				bind:value={formState.data.category}
				on:change={(e) => form.updateField('category', e.currentTarget.value)}
				on:blur={() => form.touchField('category')}
				disabled={isReadonly}
			>
				<option value="">Select category</option>
				{#each documentCategories as category}
					<option value={category}>{category}</option>
				{/each}
			</select>
			{#if formState.errors.category && formState.touched.category}
				<div class="text-error-500 text-sm mt-1">
					{formState.errors.category[0]}
				</div>
			{/if}
		</div>

		<!-- Employee (Optional) -->
		<div>
			<label class="label" for="employee_id">
				<span>Assign to Employee (Optional)</span>
			</label>
			{#if loadingEmployees}
				<div class="placeholder animate-pulse h-12 rounded"></div>
			{:else}
				<select
					id="employee_id"
					class="select"
					bind:value={formState.data.employee_id}
					on:change={(e) => form.updateField('employee_id', e.currentTarget.value)}
					disabled={isReadonly}
				>
					<option value="">No specific employee</option>
					{#each employees as employee}
						<option value={employee.id}>
							{employee.first_name} {employee.last_name} - {employee.department}
						</option>
					{/each}
				</select>
			{/if}
		</div>
	</div>

	<!-- Public Access -->
	<div class="flex items-center gap-3">
		<input
			id="is_public"
			type="checkbox"
			class="checkbox"
			bind:checked={formState.data.is_public}
			on:change={(e) => form.updateField('is_public', e.currentTarget.checked)}
			disabled={isReadonly}
		/>
		<label class="label" for="is_public">
			<span>Make this document publicly accessible to all employees</span>
		</label>
	</div>

	<!-- Document Info (View mode) -->
	{#if isReadonly && document}
		<div class="card p-4 bg-surface-100-800-token">
			<h4 class="h4 mb-2">Document Information</h4>
			<div class="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
				<div>
					<span class="font-semibold">File Size:</span>
					{document.file_size ? formatFileSize(document.file_size) : 'Unknown'}
				</div>
				<div>
					<span class="font-semibold">File Type:</span>
					{document.file_type || 'Unknown'}
				</div>
				<div>
					<span class="font-semibold">Uploaded:</span>
					{new Date(document.created_at!).toLocaleDateString()}
				</div>
				<div>
					<span class="font-semibold">Access:</span>
					<span class="badge variant-filled-{document.is_public ? 'success' : 'warning'} capitalize">
						{document.is_public ? 'Public' : 'Private'}
					</span>
				</div>
				{#if document.employee_id}
					<div>
						<span class="font-semibold">Assigned to:</span>
						{getEmployeeName(document.employee_id)}
					</div>
				{/if}
			</div>
			
			{#if document.file_url}
				<div class="mt-4">
					<a 
						href={document.file_url} 
						target="_blank" 
						class="btn variant-filled-primary btn-sm"
					>
						Download Document
					</a>
				</div>
			{/if}
		</div>
	{/if}

	<!-- Form Actions -->
	{#if !isReadonly}
		<div class="flex justify-end gap-4 pt-6 border-t">
			<button
				type="button"
				class="btn variant-ghost-surface"
				on:click={onCancel}
				disabled={formState.isSubmitting}
			>
				Cancel
			</button>
			<button
				type="submit"
				class="btn variant-filled-primary"
				disabled={formState.isSubmitting || !formState.isValid || (!selectedFile && !isEditing)}
			>
				{#if formState.isSubmitting}
					<span class="animate-pulse">
						{isEditing ? 'Updating...' : 'Uploading...'}
					</span>
				{:else}
					{isEditing ? 'Update Document' : 'Upload Document'}
				{/if}
			</button>
		</div>
	{:else}
		<div class="flex justify-end pt-6 border-t">
			<button
				type="button"
				class="btn variant-ghost-surface"
				on:click={onCancel}
			>
				Close
			</button>
		</div>
	{/if}
</form>

<style>
	.input-error {
		@apply !border-error-500 !bg-error-50 dark:!bg-error-900/20;
	}

	.progress {
		@apply w-full bg-surface-200-700-token rounded-full h-2;
	}

	.progress-bar {
		@apply bg-primary-500 h-2 rounded-full transition-all duration-300;
	}
</style>