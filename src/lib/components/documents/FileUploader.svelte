<script lang="ts">
	// FileUploader component (Feature 024)
	// Simple drag-and-drop file selection for server-side encryption
	// Encryption happens on SvelteKit server, not in browser

	import { validateFileType, validateFileSize, MIME_TYPE_MAP } from '$lib/schemas/documentSchemas';
	import type { DocumentMetadata } from '$lib/types/document';

	interface Props {
		maxSizeMB?: number;
		allowedTypes?: string[];
		metadata: DocumentMetadata;
		hasFile?: boolean;
		fileName?: string | null;
	}

	let {
		maxSizeMB = 50,
		allowedTypes = ['PDF', 'JPEG', 'PNG', 'GIF', 'DOCX', 'XLSX', 'TXT', 'CSV'],
		metadata = $bindable(),
		hasFile = $bindable(false),
		fileName = $bindable(null)
	}: Props = $props();

	// Svelte 5 runes state
	let selectedFile = $state<File | null>(null);
	let isDragging = $state(false);
	let errorMessage = $state<string | null>(null);

	// Update bindable props when file changes
	$effect(() => {
		hasFile = selectedFile !== null;
		fileName = selectedFile?.name || null;
		console.log('[FileUploader] hasFile updated:', hasFile, 'selectedFile:', selectedFile?.name);
	});

	// Handle file selection from input
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
		console.log('[FileUploader] validateAndSetFile called with:', file.name, 'size:', file.size);
		errorMessage = null;

		// Validate file size
		if (!validateFileSize(file.size)) {
			errorMessage = `File size exceeds ${maxSizeMB}MB limit`;
			console.log('[FileUploader] File size validation failed');
			return;
		}

		// Validate file type
		if (!validateFileType(file.name)) {
			errorMessage = `Invalid file type. Allowed: ${allowedTypes.join(', ')}`;
			console.log('[FileUploader] File type validation failed');
			return;
		}

		console.log('[FileUploader] Validation passed, setting selectedFile');
		selectedFile = file;

		// Update metadata with filename immediately
		metadata.filename = file.name;
		console.log('[FileUploader] metadata.filename set to:', metadata.filename);
	}

	// Expose function to get selected file for parent form submission
	export function getSelectedFile(): File | null {
		return selectedFile;
	}

	// Clear selected file
	export function clearFile() {
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
				<button class="clear-button" onclick={clearFile} type="button"> ✕ </button>
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
						accept={allowedTypes.map((t) => MIME_TYPE_MAP[t] || '').join(',')}
						onchange={handleFileSelect}
					/>
				</label>
				<p class="file-constraints">
					Max size: {maxSizeMB}MB | Allowed: {allowedTypes.join(', ')}
				</p>
			</div>
		{/if}
	</div>

	<!-- Error message display -->
	{#if errorMessage}
		<div class="error-message">
			<span class="error-icon">⚠️</span>
			<span>{errorMessage}</span>
		</div>
	{/if}
</div>

<style>
	.file-uploader {
		width: 100%;
	}

	.drop-zone {
		border: 2px dashed #cbd5e0;
		border-radius: 0.5rem;
		padding: 2rem;
		transition: all 0.2s;
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
	}

	.file-icon {
		font-size: 2rem;
	}

	.file-details {
		flex: 1;
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
		background: #f56565;
		color: white;
		border: none;
		border-radius: 50%;
		width: 2rem;
		height: 2rem;
		cursor: pointer;
		font-size: 1.25rem;
		display: flex;
		align-items: center;
		justify-content: center;
		transition: background 0.2s;
	}

	.clear-button:hover {
		background: #e53e3e;
	}

	.drop-placeholder {
		text-align: center;
		padding: 1rem;
	}

	.upload-icon {
		font-size: 3rem;
		margin-bottom: 1rem;
	}

	.drop-text {
		font-size: 1.125rem;
		font-weight: 500;
		color: #2d3748;
		margin-bottom: 0.5rem;
	}

	.or-text {
		color: #718096;
		margin: 0.5rem 0;
	}

	.file-select-button {
		display: inline-block;
		background: #4299e1;
		color: white;
		padding: 0.75rem 1.5rem;
		border-radius: 0.375rem;
		cursor: pointer;
		font-weight: 500;
		transition: background 0.2s;
	}

	.file-select-button:hover {
		background: #3182ce;
	}

	.file-select-button input {
		display: none;
	}

	.file-constraints {
		margin-top: 1rem;
		font-size: 0.875rem;
		color: #718096;
	}

	.error-message {
		margin-top: 0.75rem;
		padding: 0.75rem;
		background: #fff5f5;
		border: 1px solid #fc8181;
		border-radius: 0.375rem;
		color: #c53030;
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.error-icon {
		font-size: 1.25rem;
	}
</style>
