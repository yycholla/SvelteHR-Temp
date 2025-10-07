<script lang="ts">
	// FileUploader component (Feature 024)
	// Drag-and-drop file upload with client-side encryption

	import { uploadDocument } from '$lib/services/documentService';
	import { validateFileType, validateFileSize, MIME_TYPE_MAP } from '$lib/schemas/documentSchemas';
	import type { DocumentMetadata, UploadProgress, UploadResult } from '$lib/types/document';

	interface Props {
		onUpload?: (result: UploadResult) => void;
		onError?: (error: Error) => void;
		maxSizeMB?: number;
		allowedTypes?: string[];
		metadata: DocumentMetadata;
	}

	let {
		onUpload = () => {},
		onError = () => {},
		maxSizeMB = 50,
		allowedTypes = ['PDF', 'JPEG', 'PNG', 'GIF', 'DOCX', 'XLSX', 'TXT', 'CSV'],
		metadata = $bindable()
	}: Props = $props();

	// Svelte 5 runes state
	let selectedFile = $state<File | null>(null);
	let uploadProgress = $state<UploadProgress>({
		stage: 'encrypting',
		progress: 0
	});
	let isUploading = $state(false);
	let isEncrypting = $state(false);
	let isDragging = $state(false);
	let errorMessage = $state<string | null>(null);

	// Derived state
	let canUpload = $derived(selectedFile !== null && !isUploading && metadata.category !== '');
	let progressPercent = $derived(uploadProgress.progress);
	let progressMessage = $derived(() => {
		switch (uploadProgress.stage) {
			case 'encrypting':
				return 'Encrypting file...';
			case 'uploading':
				return 'Uploading encrypted file...';
			case 'processing':
				return 'Processing document...';
			case 'complete':
				return 'Upload complete!';
			default:
				return '';
		}
	});

	// Handle file selection
	function handleFileSelect(event: Event) {
		const input = event.target as HTMLInputElement;
		const file = input.files?.[0];

		if (file) {
			validateAndSetFile(file);
		}
	}

	// Handle drag and drop
	function handleDrop(event: DragEvent) {
		event.preventDefault();
		isDragging = false;

		const file = event.dataTransfer?.files[0];
		if (file) {
			validateAndSetFile(file);
		}
	}

	function handleDragOver(event: DragEvent) {
		event.preventDefault();
		isDragging = true;
	}

	function handleDragLeave() {
		isDragging = false;
	}

	// Validate and set selected file
	function validateAndSetFile(file: File) {
		errorMessage = null;

		// Validate file size
		if (!validateFileSize(file.size)) {
			errorMessage = `File size exceeds ${maxSizeMB}MB limit`;
			return;
		}

		// Validate file type
		if (!validateFileType(file.name)) {
			errorMessage = `Invalid file type. Allowed: ${allowedTypes.join(', ')}`;
			return;
		}

		selectedFile = file;
	}

	// Upload file with encryption
	async function handleUpload() {
		if (!selectedFile || !canUpload) return;

		try {
			isUploading = true;
			errorMessage = null;

			// Update metadata with filename
			metadata.filename = selectedFile.name;

			// Upload with progress tracking
			const result = await uploadDocument(
				selectedFile,
				metadata,
				(progress) => {
					uploadProgress = progress;
					isEncrypting = progress.stage === 'encrypting';
				}
			);

			// Success
			onUpload(result);

			// Reset
			selectedFile = null;
			uploadProgress = { stage: 'encrypting', progress: 0 };

		} catch (error) {
			console.error('Upload error:', error);
			errorMessage = error instanceof Error ? error.message : 'Upload failed';
			onError(error instanceof Error ? error : new Error('Upload failed'));
		} finally {
			isUploading = false;
			isEncrypting = false;
		}
	}

	// Clear selected file
	function clearFile() {
		selectedFile = null;
		errorMessage = null;
	}

	// Format file size for display
	function formatFileSize(bytes: number): string {
		if (bytes < 1024) return `${bytes} B`;
		if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
		return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
	}
</script>

<div class="file-uploader">
	<!-- Drag and drop zone -->
	<div
		class="drop-zone"
		class:dragging={isDragging}
		class:has-file={selectedFile !== null}
		ondrop={handleDrop}
		ondragover={handleDragOver}
		ondragleave={handleDragLeave}
	>
		{#if selectedFile}
			<!-- Selected file display -->
			<div class="file-info">
				<div class="file-icon">📄</div>
				<div class="file-details">
					<div class="file-name">{selectedFile.name}</div>
					<div class="file-size">{formatFileSize(selectedFile.size)}</div>
				</div>
				<button class="clear-button" onclick={clearFile} disabled={isUploading}>
					✕
				</button>
			</div>
		{:else}
			<!-- Drop zone placeholder -->
			<div class="drop-placeholder">
				<div class="upload-icon">⬆️</div>
				<p class="drop-text">Drag and drop your file here</p>
				<p class="or-text">or</p>
				<label class="file-select-button">
					Choose File
					<input
						type="file"
						accept={allowedTypes.map(t => MIME_TYPE_MAP[t] || '').join(',')}
						onchange={handleFileSelect}
						disabled={isUploading}
					/>
				</label>
				<p class="file-constraints">
					Max size: {maxSizeMB}MB | Allowed: {allowedTypes.join(', ')}
				</p>
			</div>
		{/if}
	</div>

	<!-- Upload progress -->
	{#if isUploading}
		<div class="upload-progress">
			<div class="progress-bar">
				<div class="progress-fill" style="width: {progressPercent}%"></div>
			</div>
			<div class="progress-text">
				{progressMessage()} {progressPercent}%
			</div>
			{#if isEncrypting}
				<div class="encryption-indicator">
					🔒 Encrypting with AES-GCM-256...
				</div>
			{/if}
		</div>
	{/if}

	<!-- Error message -->
	{#if errorMessage}
		<div class="error-message">
			⚠️ {errorMessage}
		</div>
	{/if}

	<!-- Upload button -->
	<button
		class="upload-button"
		onclick={handleUpload}
		disabled={!canUpload || isUploading}
	>
		{isUploading ? 'Uploading...' : 'Upload Document'}
	</button>
</div>

<style>
	.file-uploader {
		width: 100%;
		max-width: 600px;
	}

	.drop-zone {
		border: 2px dashed #cbd5e0;
		border-radius: 8px;
		padding: 2rem;
		text-align: center;
		transition: all 0.2s ease;
		background: #f7fafc;
	}

	.drop-zone.dragging {
		border-color: #4299e1;
		background: #ebf8ff;
	}

	.drop-zone.has-file {
		border-color: #48bb78;
		background: #f0fff4;
	}

	.file-info {
		display: flex;
		align-items: center;
		gap: 1rem;
		padding: 1rem;
		background: white;
		border-radius: 4px;
	}

	.file-icon {
		font-size: 2rem;
	}

	.file-details {
		flex: 1;
		text-align: left;
	}

	.file-name {
		font-weight: 600;
		color: #2d3748;
	}

	.file-size {
		font-size: 0.875rem;
		color: #718096;
	}

	.clear-button {
		background: #fc8181;
		color: white;
		border: none;
		border-radius: 50%;
		width: 28px;
		height: 28px;
		cursor: pointer;
		font-size: 1rem;
	}

	.clear-button:hover:not(:disabled) {
		background: #f56565;
	}

	.drop-placeholder {
		padding: 1rem;
	}

	.upload-icon {
		font-size: 3rem;
		margin-bottom: 1rem;
	}

	.drop-text {
		font-size: 1.125rem;
		color: #2d3748;
		margin-bottom: 0.5rem;
	}

	.or-text {
		color: #a0aec0;
		margin: 1rem 0;
	}

	.file-select-button {
		display: inline-block;
		padding: 0.75rem 1.5rem;
		background: #4299e1;
		color: white;
		border-radius: 4px;
		cursor: pointer;
		font-weight: 500;
		transition: background 0.2s;
	}

	.file-select-button:hover {
		background: #3182ce;
	}

	.file-select-button input[type="file"] {
		display: none;
	}

	.file-constraints {
		font-size: 0.75rem;
		color: #718096;
		margin-top: 1rem;
	}

	.upload-progress {
		margin-top: 1rem;
	}

	.progress-bar {
		width: 100%;
		height: 8px;
		background: #e2e8f0;
		border-radius: 4px;
		overflow: hidden;
	}

	.progress-fill {
		height: 100%;
		background: linear-gradient(90deg, #4299e1, #48bb78);
		transition: width 0.3s ease;
	}

	.progress-text {
		margin-top: 0.5rem;
		font-size: 0.875rem;
		color: #4a5568;
		text-align: center;
	}

	.encryption-indicator {
		margin-top: 0.5rem;
		padding: 0.5rem;
		background: #edf2f7;
		border-radius: 4px;
		font-size: 0.875rem;
		color: #2d3748;
		text-align: center;
	}

	.error-message {
		margin-top: 1rem;
		padding: 0.75rem;
		background: #fff5f5;
		border: 1px solid #fc8181;
		border-radius: 4px;
		color: #c53030;
		font-size: 0.875rem;
	}

	.upload-button {
		width: 100%;
		margin-top: 1rem;
		padding: 0.75rem 1.5rem;
		background: #48bb78;
		color: white;
		border: none;
		border-radius: 4px;
		font-size: 1rem;
		font-weight: 600;
		cursor: pointer;
		transition: background 0.2s;
	}

	.upload-button:hover:not(:disabled) {
		background: #38a169;
	}

	.upload-button:disabled {
		background: #cbd5e0;
		cursor: not-allowed;
	}
</style>
