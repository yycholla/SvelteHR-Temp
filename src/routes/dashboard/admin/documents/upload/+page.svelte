<script lang="ts">
	// Document upload page (Feature 024)
	// Upload page with file selection and metadata form

	import { goto } from '$app/navigation';
	import { enhance } from '$app/forms';
	import FileUploader from '$lib/components/documents/FileUploader.svelte';
	import DocumentMetadataForm from '$lib/components/documents/DocumentMetadataForm.svelte';
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import * as Alert from '$lib/components/ui/alert';
	import { CheckCircle2, Lock, Upload, X } from '@lucide/svelte';
	import type { ActionData, PageData } from './$types';
	import type { DocumentMetadata, UploadResult } from '$lib/types/document';

	const { data, form }: { data: PageData; form: ActionData } = $props();

	// Component references and reactive state
	let fileUploader = $state<FileUploader>();
	let metadataForm = $state<DocumentMetadataForm>();

	// Svelte 5 state
	let metadata = $state<DocumentMetadata>({
		filename: '',
		category: 'Other',
		sensitivityLevel: 'Internal',
		metadataTags: {},
		assignToEmployees: [],
		assignToDepartments: []
	});

	let uploadComplete = $state(false);
	let uploadError = $state<string | null>(null);
	let uploadedDocumentId = $state<string | null>(null);
	let isUploading = $state(false);

	// Reactive state bound from child components
	let hasFile = $state(false);
	let assignedEmployeeIds = $state<string[]>([]);

	// Derive metadata validation directly from metadata object
	// Note: filename is set automatically when file is selected, so we only check the user-entered fields
	const hasRequiredMetadata = $derived(!!metadata.category && !!metadata.sensitivityLevel);

	// Derived state for upload button
	const canUpload = $derived(hasFile && hasRequiredMetadata && !isUploading && !uploadComplete);

	// Handle form action results
	$effect(() => {
		if (form) {
			handleActionResult(form);
		}
	});

	// Debug logging
	$effect(() => {
		console.log(
			'[Parent] State update - hasFile:',
			hasFile,
			'metadata.filename:',
			metadata.filename,
			'metadata.category:',
			metadata.category,
			'metadata.sensitivityLevel:',
			metadata.sensitivityLevel,
			'hasRequiredMetadata:',
			hasRequiredMetadata,
			'isUploading:',
			isUploading,
			'uploadComplete:',
			uploadComplete,
			'canUpload:',
			canUpload
		);
	});

	// Handle successful upload
	function handleUploadSuccess(result: UploadResult) {
		console.log('Upload successful:', result);
		uploadComplete = true;
		uploadedDocumentId = result.documentId;

		// Show success message and redirect after 2 seconds
		setTimeout(() => {
			goto('/dashboard/admin/documents');
		}, 2000);
	}

	// Handle upload error
	function handleUploadError(error: Error) {
		console.error('Upload failed:', error);
		uploadError = error.message;
		isUploading = false;
	}

	// Handle cancel
	function handleCancel() {
		goto('/dashboard/admin/documents');
	}

	// Handle form submit - now much simpler with server-side encryption
	async function handleSubmit(event: SubmitEvent) {
		uploadError = null;

		// Validate metadata
		if (!metadataForm.validateMetadata()) {
			uploadError = 'Please fill in all required metadata fields';
			event.preventDefault();
			return;
		}

		// Get selected file
		const file = fileUploader.getSelectedFile();
		if (!file) {
			uploadError = 'Please select a file';
			event.preventDefault();
			return;
		}

		isUploading = true;
	}

	// Handle form action response
	function handleActionResult(result: any) {
		if (result.type === 'error') {
			uploadError = result.error.message || 'Upload failed';
			isUploading = false;
		} else if (result.data?.success) {
			handleUploadSuccess(result.data.result);
		} else if (result.data?.error) {
			uploadError = result.data.error;
			isUploading = false;
		}
	}
</script>

<svelte:head>
	<title>Upload Document | HR System</title>
</svelte:head>

<div class="container mx-auto max-w-4xl space-y-6 py-6">
	<!-- Page header -->
	<div class="space-y-1">
		<h1 class="text-3xl font-bold tracking-tight">Upload Document</h1>
		<p class="text-muted-foreground">
			Upload a new document with server-side encryption. Files are encrypted securely before storage
			using AES-256-GCM.
		</p>
	</div>

	<!-- Success message -->
	{#if uploadComplete}
		<Alert.Root class="border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950">
			<CheckCircle2 class="h-5 w-5 text-green-600 dark:text-green-400" />
			<Alert.Title>Upload Successful!</Alert.Title>
			<Alert.Description>
				Your document has been encrypted and uploaded securely.
				<span class="mt-1 block text-sm italic">Redirecting to documents page...</span>
			</Alert.Description>
		</Alert.Root>
	{:else}
		<!-- Upload form with server-side encryption -->
		<form
			method="POST"
			action="?/upload"
			enctype="multipart/form-data"
			onsubmit={handleSubmit}
			use:enhance={({ formData, cancel }) => {
				uploadError = null;

				// Get selected file and add to FormData
				const file = fileUploader.getSelectedFile();
				if (!file) {
					uploadError = 'Please select a file';
					cancel();
					return;
				}

				console.log('[Upload] About to validate metadata, metadataForm:', metadataForm);
				console.log(
					'[Upload] metadataForm.validateMetadata exists?',
					typeof metadataForm?.validateMetadata
				);
				console.log('[Upload] Current metadata:', metadata);

				// Validate metadata before submission
				if (!metadataForm.validateMetadata()) {
					uploadError = 'Please fill in all required metadata fields';
					cancel();
					return;
				}

				// Add file to form data
				formData.set('file', file);

				// Add metadata to form data
				formData.set('category', metadata.category);
				formData.set('sensitivityLevel', metadata.sensitivityLevel);
				if (metadata.expirationDate) {
					// Convert Date object to ISO string with end-of-day time
					// Extract YYYY-MM-DD from Date object and append time
					const dateStr = metadata.expirationDate.toISOString().split('T')[0];
					formData.set('expirationDate', `${dateStr}T23:59:59Z`);
				}
				// Send metadata tags as JSON string
				formData.set('metadataTags', JSON.stringify(metadata.metadataTags || {}));
				// Send employee assignments as JSON string
				formData.set('assignToEmployees', JSON.stringify(assignedEmployeeIds || []));

				console.log('[Upload] Starting upload...', {
					filename: file.name,
					size: file.size,
					type: file.type,
					category: metadata.category,
					sensitivityLevel: metadata.sensitivityLevel
				});

				// Set uploading state
				isUploading = true;

				return async ({ result, update }) => {
					console.log('[Upload] Form submission result:', result);

					if (result.type === 'success' && result.data?.success) {
						handleUploadSuccess(result.data.result);
					} else if (result.type === 'failure') {
						uploadError = result.data?.error || 'Upload failed';
						isUploading = false;
					} else if (result.type === 'error') {
						uploadError = 'Upload failed. Please try again.';
						isUploading = false;
					}

					// Don't call update() to prevent default invalidation
				};
			}}
		>
			<div class="space-y-6">
				<!-- Combined Upload Card -->
				<Card.Root>
					<Card.Header>
						<Card.Title>Upload Document</Card.Title>
						<Card.Description
							>Select a file and provide metadata for classification</Card.Description
						>
					</Card.Header>
					<Card.Content>
						<div class="grid grid-cols-1 gap-8 lg:grid-cols-2">
							<!-- Left: File Upload -->
							<div class="space-y-4">
								<h3 class="text-sm font-semibold text-foreground">File Selection</h3>
								<FileUploader
									bind:this={fileUploader}
									bind:metadata
									bind:hasFile
									onUpload={handleUploadSuccess}
									onError={handleUploadError}
									maxSizeMB={50}
									allowedTypes={['PDF', 'JPEG', 'PNG', 'GIF', 'DOCX', 'XLSX', 'TXT', 'CSV']}
								/>
							</div>

							<!-- Right: Metadata -->
							<div class="space-y-4">
								<h3 class="text-sm font-semibold text-foreground">Document Information</h3>
								<DocumentMetadataForm
									bind:this={metadataForm}
									bind:metadata
									bind:assignedEmployeeIds
									employeeOptions={data.employeeOptions || []}
								/>
							</div>
						</div>

						<!-- Upload Actions -->
						<div class="mt-8 border-t pt-6">
							<div class="flex items-center gap-4">
								<Button
									type="button"
									variant="outline"
									onclick={handleCancel}
									disabled={isUploading}
									class="flex-1"
								>
									<X class="mr-2 h-4 w-4" />
									Cancel
								</Button>
								<Button type="submit" disabled={!canUpload} class="flex-1" size="lg">
									<Upload class="mr-2 h-5 w-5" />
									{isUploading ? 'Uploading...' : 'Upload Document'}
								</Button>
							</div>

							{#if uploadError}
								<Alert.Root variant="destructive" class="mt-4">
									<Alert.Title>Upload Error</Alert.Title>
									<Alert.Description>{uploadError}</Alert.Description>
								</Alert.Root>
							{/if}
						</div>
					</Card.Content>
				</Card.Root>
			</div>
		</form>

		<!-- Security notice -->
		<Alert.Root class="border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950">
			<Lock class="h-5 w-5 text-blue-600 dark:text-blue-400" />
			<Alert.Title>Server-Side Encryption</Alert.Title>
			<Alert.Description>
				Your document is encrypted using AES-256-GCM on the server before storage. Files are
				securely encrypted in memory and never stored unencrypted. Only authorized users with proper
				permissions can decrypt and access the document content.
			</Alert.Description>
		</Alert.Root>
	{/if}
</div>
