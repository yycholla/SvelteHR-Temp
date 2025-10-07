<script lang="ts">
	// Document upload page (Feature 024)
	// Upload page with file selection and metadata form

	import { goto } from '$app/navigation';
	import FileUploader from '$lib/components/documents/FileUploader.svelte';
	import DocumentMetadataForm from '$lib/components/documents/DocumentMetadataForm.svelte';
	import type { PageData } from './$types';
	import type { DocumentMetadata, UploadResult } from '$lib/types/document';

	let { data }: { data: PageData } = $props();

	// Svelte 5 state
	let metadata = $state<DocumentMetadata>({
		filename: '',
		category: 'Other',
		sensitivity_level: 'Internal',
		description: ''
	});

	let uploadComplete = $state(false);
	let uploadError = $state<string | null>(null);
	let uploadedDocumentId = $state<string | null>(null);

	// Handle successful upload
	function handleUploadSuccess(result: UploadResult) {
		console.log('Upload successful:', result);
		uploadComplete = true;
		uploadedDocumentId = result.documentId;

		// Show success message and redirect after 2 seconds
		setTimeout(() => {
			goto('/dashboard/documents');
		}, 2000);
	}

	// Handle upload error
	function handleUploadError(error: Error) {
		console.error('Upload failed:', error);
		uploadError = error.message;
	}

	// Handle metadata form submission
	function handleMetadataSubmit(updatedMetadata: DocumentMetadata) {
		metadata = updatedMetadata;
		console.log('Metadata updated:', metadata);
	}

	// Handle cancel
	function handleCancel() {
		goto('/dashboard/documents');
	}
</script>

<svelte:head>
	<title>Upload Document | HR System</title>
</svelte:head>

<div class="upload-page">
	<!-- Page header -->
	<div class="page-header">
		<div class="header-content">
			<h1 class="page-title">Upload Document</h1>
			<p class="page-description">
				Upload a new document with end-to-end encryption. All files are encrypted on your device before upload.
			</p>
		</div>
		<button class="cancel-button" onclick={handleCancel}>
			Cancel
		</button>
	</div>

	<!-- Success message -->
	{#if uploadComplete}
		<div class="success-message">
			<div class="success-icon">✅</div>
			<h3>Upload Successful!</h3>
			<p>Your document has been encrypted and uploaded securely.</p>
			<p class="redirect-notice">Redirecting to documents page...</p>
		</div>
	{:else}
		<!-- Upload form -->
		<div class="upload-container">
			<!-- Step 1: File selection -->
			<div class="upload-step">
				<div class="step-header">
					<div class="step-number">1</div>
					<div class="step-info">
						<h2 class="step-title">Select File</h2>
						<p class="step-description">Choose a file to upload (max 50MB)</p>
					</div>
				</div>

				<div class="step-content">
					<FileUploader
						bind:metadata
						onUpload={handleUploadSuccess}
						onError={handleUploadError}
						maxSizeMB={50}
						allowedTypes={['PDF', 'JPEG', 'PNG', 'GIF', 'DOCX', 'XLSX', 'TXT', 'CSV']}
					/>
				</div>

				{#if uploadError}
					<div class="error-message">
						<div class="error-icon">⚠️</div>
						<p>{uploadError}</p>
					</div>
				{/if}
			</div>

			<!-- Step 2: Metadata form -->
			<div class="upload-step">
				<div class="step-header">
					<div class="step-number">2</div>
					<div class="step-info">
						<h2 class="step-title">Document Information</h2>
						<p class="step-description">Provide metadata for classification and access control</p>
					</div>
				</div>

				<div class="step-content">
					<DocumentMetadataForm
						bind:metadata
						onSubmit={handleMetadataSubmit}
						onCancel={handleCancel}
					/>
				</div>
			</div>

			<!-- Security notice -->
			<div class="security-notice">
				<div class="notice-icon">🔒</div>
				<div class="notice-content">
					<h3 class="notice-title">End-to-End Encryption</h3>
					<p class="notice-text">
						Your document is encrypted using AES-GCM-256 on your device before upload.
						The server never has access to your unencrypted files. Only authorized users
						with the decryption key can access the document content.
					</p>
				</div>
			</div>
		</div>
	{/if}
</div>

<style>
	.upload-page {
		width: 100%;
		max-width: 900px;
		margin: 0 auto;
		padding: 2rem;
	}

	.page-header {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
		margin-bottom: 2rem;
		gap: 2rem;
	}

	.header-content {
		flex: 1;
	}

	.page-title {
		font-size: 2rem;
		font-weight: 700;
		color: hsl(var(--foreground));
		margin: 0 0 0.5rem 0;
	}

	.page-description {
		font-size: 1rem;
		color: hsl(var(--muted-foreground));
		margin: 0;
		line-height: 1.5;
	}

	.cancel-button {
		padding: 0.75rem 1.5rem;
		background: hsl(var(--background));
		color: hsl(var(--foreground));
		border: 1px solid hsl(var(--border));
		border-radius: var(--radius);
		font-weight: 600;
		font-size: 0.875rem;
		cursor: pointer;
		transition: all 0.2s;
	}

	.cancel-button:hover {
		background: hsl(var(--accent));
	}

	.success-message {
		text-align: center;
		padding: 4rem 2rem;
		background: hsl(var(--card));
		border-radius: var(--radius);
		box-shadow: 0 1px 3px hsl(var(--foreground) / 0.1);
	}

	.success-icon {
		font-size: 4rem;
		margin-bottom: 1rem;
	}

	.success-message h3 {
		font-size: 1.5rem;
		font-weight: 700;
		color: hsl(var(--foreground));
		margin: 0 0 0.5rem 0;
	}

	.success-message p {
		color: hsl(var(--muted-foreground));
		margin: 0 0 0.5rem 0;
	}

	.redirect-notice {
		font-size: 0.875rem;
		color: hsl(var(--muted-foreground) / 0.7);
		font-style: italic;
	}

	.upload-container {
		display: flex;
		flex-direction: column;
		gap: 2rem;
	}

	.upload-step {
		background: hsl(var(--card));
		border: 1px solid hsl(var(--border));
		border-radius: var(--radius);
		padding: 2rem;
		box-shadow: 0 1px 3px hsl(var(--foreground) / 0.1);
	}

	.step-header {
		display: flex;
		align-items: flex-start;
		gap: 1rem;
		margin-bottom: 1.5rem;
	}

	.step-number {
		width: 40px;
		height: 40px;
		background: hsl(var(--primary));
		color: hsl(var(--primary-foreground));
		border-radius: 50%;
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 1.25rem;
		font-weight: 700;
		flex-shrink: 0;
	}

	.step-info {
		flex: 1;
	}

	.step-title {
		font-size: 1.25rem;
		font-weight: 700;
		color: hsl(var(--foreground));
		margin: 0 0 0.25rem 0;
	}

	.step-description {
		font-size: 0.875rem;
		color: hsl(var(--muted-foreground));
		margin: 0;
	}

	.step-content {
		padding-left: 56px; /* Align with step header text */
	}

	.error-message {
		margin-top: 1rem;
		padding: 1rem;
		background: hsl(var(--destructive) / 0.1);
		border: 1px solid hsl(var(--destructive) / 0.5);
		border-radius: var(--radius);
		display: flex;
		align-items: center;
		gap: 0.75rem;
	}

	.error-icon {
		font-size: 1.5rem;
	}

	.error-message p {
		color: hsl(var(--destructive));
		margin: 0;
		font-size: 0.875rem;
	}

	.security-notice {
		background: hsl(var(--muted));
		border: 1px solid hsl(var(--border));
		border-radius: var(--radius);
		padding: 1.5rem;
		display: flex;
		gap: 1rem;
	}

	.notice-icon {
		font-size: 2rem;
		flex-shrink: 0;
	}

	.notice-content {
		flex: 1;
	}

	.notice-title {
		font-size: 1rem;
		font-weight: 600;
		color: hsl(var(--foreground));
		margin: 0 0 0.5rem 0;
	}

	.notice-text {
		font-size: 0.875rem;
		color: hsl(var(--muted-foreground));
		margin: 0;
		line-height: 1.6;
	}

	/* Responsive */
	@media (max-width: 768px) {
		.upload-page {
			padding: 1rem;
		}

		.page-header {
			flex-direction: column;
		}

		.cancel-button {
			width: 100%;
		}

		.step-content {
			padding-left: 0;
		}
	}
</style>
