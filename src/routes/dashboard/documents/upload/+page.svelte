<script lang="ts">
	// Document upload page (Feature 024)
	// Upload page with file selection and metadata form

	import { goto } from '$app/navigation';
	import FileUploader from '$lib/components/documents/FileUploader.svelte';
	import DocumentMetadataForm from '$lib/components/documents/DocumentMetadataForm.svelte';
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import * as Alert from '$lib/components/ui/alert';
	import { X, CheckCircle2, Lock } from 'lucide-svelte';
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

<div class="container mx-auto max-w-4xl py-6 space-y-6">
	<!-- Page header -->
	<div class="flex justify-between items-start gap-4">
		<div class="space-y-1">
			<h1 class="text-3xl font-bold tracking-tight">Upload Document</h1>
			<p class="text-muted-foreground">
				Upload a new document with end-to-end encryption. All files are encrypted on your device before upload.
			</p>
		</div>
		<Button variant="outline" onclick={handleCancel}>
			<X class="h-4 w-4 mr-2" />
			Cancel
		</Button>
	</div>

	<!-- Success message -->
	{#if uploadComplete}
		<Alert.Root class="border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950">
			<CheckCircle2 class="h-5 w-5 text-green-600 dark:text-green-400" />
			<Alert.Title>Upload Successful!</Alert.Title>
			<Alert.Description>
				Your document has been encrypted and uploaded securely.
				<span class="block mt-1 text-sm italic">Redirecting to documents page...</span>
			</Alert.Description>
		</Alert.Root>
	{:else}
		<!-- Upload form -->
		<div class="space-y-6">
			<!-- Step 1: File selection -->
			<Card.Root>
				<Card.Header>
					<div class="flex items-start gap-3">
						<div class="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold">
							1
						</div>
						<div class="flex-1">
							<Card.Title>Select File</Card.Title>
							<Card.Description>Choose a file to upload (max 50MB)</Card.Description>
						</div>
					</div>
				</Card.Header>
				<Card.Content>
					<FileUploader
						bind:metadata
						onUpload={handleUploadSuccess}
						onError={handleUploadError}
						maxSizeMB={50}
						allowedTypes={['PDF', 'JPEG', 'PNG', 'GIF', 'DOCX', 'XLSX', 'TXT', 'CSV']}
					/>

					{#if uploadError}
						<Alert.Root variant="destructive" class="mt-4">
							<Alert.Title>Upload Error</Alert.Title>
							<Alert.Description>{uploadError}</Alert.Description>
						</Alert.Root>
					{/if}
				</Card.Content>
			</Card.Root>

			<!-- Step 2: Metadata form -->
			<Card.Root>
				<Card.Header>
					<div class="flex items-start gap-3">
						<div class="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold">
							2
						</div>
						<div class="flex-1">
							<Card.Title>Document Information</Card.Title>
							<Card.Description>Provide metadata for classification and access control</Card.Description>
						</div>
					</div>
				</Card.Header>
				<Card.Content>
					<DocumentMetadataForm
						bind:metadata
						onSubmit={handleMetadataSubmit}
						onCancel={handleCancel}
					/>
				</Card.Content>
			</Card.Root>

			<!-- Security notice -->
			<Alert.Root class="border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950">
				<Lock class="h-5 w-5 text-blue-600 dark:text-blue-400" />
				<Alert.Title>End-to-End Encryption</Alert.Title>
				<Alert.Description>
					Your document is encrypted using AES-GCM-256 on your device before upload.
					The server never has access to your unencrypted files. Only authorized users
					with the decryption key can access the document content.
				</Alert.Description>
			</Alert.Root>
		</div>
	{/if}
</div>
