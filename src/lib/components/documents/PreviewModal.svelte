<script lang="ts">
	// PreviewModal component (Feature 024)
	// Full-screen modal for document preview with download option

	interface Props {
		isOpen?: boolean;
		documentId: string;
		filename: string;
		mimeType?: string;
		fileType?: string; // Legacy support
		previewUrl?: string | null;
		isLoading?: boolean;
		error?: string | null;
		canDownload?: boolean;
		onClose?: () => void;
		onDownload?: () => void;
	}

	let {
		isOpen = false,
		documentId,
		filename,
		mimeType = '',
		fileType = '',
		previewUrl = null,
		isLoading = false,
		error = null,
		canDownload = false,
		onClose = () => {},
		onDownload = () => {}
	}: Props = $props();

	// Determine actual MIME type from either mimeType or legacy fileType
	let actualMimeType = $derived(mimeType || convertFileTypeToMimeType(fileType));

	// Helper to convert legacy FileType to MIME type
	function convertFileTypeToMimeType(type: string): string {
		const mimeMap: Record<string, string> = {
			PDF: 'application/pdf',
			JPEG: 'image/jpeg',
			PNG: 'image/png',
			GIF: 'image/gif',
			TXT: 'text/plain',
			CSV: 'text/csv',
			DOCX: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
			XLSX: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
		};
		return mimeMap[type] || type;
	}

	// Derived state based on MIME type
	let isPDF = $derived(actualMimeType === 'application/pdf');
	let isImage = $derived(actualMimeType.startsWith('image/'));
	let isText = $derived(actualMimeType === 'text/plain' || actualMimeType === 'text/csv');
	let isOfficeDoc = $derived(
		actualMimeType.includes('wordprocessingml') || actualMimeType.includes('spreadsheetml')
	);
	let canPreview = $derived(isPDF || isImage || isText);

	// Get display file type
	let displayFileType = $derived(
		fileType || actualMimeType.split('/').pop()?.toUpperCase() || 'FILE'
	);

	// Handle escape key
	function handleKeydown(event: KeyboardEvent) {
		if (event.key === 'Escape' && isOpen) {
			onClose();
		}
	}

	// Handle backdrop click
	function handleBackdropClick(event: MouseEvent) {
		if (event.target === event.currentTarget) {
			onClose();
		}
	}
</script>

<svelte:window onkeydown={handleKeydown} />

{#if isOpen}
	<div
		class="preview-modal-backdrop"
		role="button"
		tabindex="0"
		onclick={handleBackdropClick}
		onkeydown={(e) => {
			if (e.key === 'Escape' || e.key === 'Enter') {
				handleBackdropClick(e);
			}
		}}
	>
		<div
			class="preview-modal"
			role="dialog"
			tabindex="-1"
			aria-modal="true"
			onclick={(e) => e.stopPropagation()}
			onkeydown={(e) => e.stopPropagation()}
		>
			<!-- Modal header -->
			<div class="modal-header">
				<div class="header-info">
					<h2 class="modal-title">{filename}</h2>
					<span class="file-type-badge">{displayFileType}</span>
				</div>

				<div class="header-actions">
					{#if canDownload}
						<button class="action-button download-button" onclick={onDownload} title="Download">
							⬇️ Download
						</button>
					{/if}
					<button class="action-button close-button" onclick={onClose} title="Close"> ✕ </button>
				</div>
			</div>

			<!-- Modal content -->
			<div class="modal-content">
				{#if isLoading}
					<!-- Loading state -->
					<div class="loading-state">
						<div class="spinner"></div>
						<p>Loading preview...</p>
					</div>
				{:else if error}
					<!-- Error state -->
					<div class="error-state">
						<div class="error-icon">⚠️</div>
						<h3>Preview Error</h3>
						<p>{error}</p>
						{#if canDownload}
							<button class="retry-button" onclick={onDownload}> Download Instead </button>
						{/if}
					</div>
				{:else if !canPreview}
					<!-- Unsupported preview -->
					<div class="unsupported-state">
						<div class="unsupported-icon">📄</div>
						<h3>Preview Not Available</h3>
						<p>This file type ({displayFileType}) cannot be previewed in the browser.</p>
						{#if isOfficeDoc}
							<p class="conversion-note">
								Office documents require conversion to PDF. This may take a few moments.
							</p>
						{/if}
						{#if canDownload}
							<button class="download-instead-button" onclick={onDownload}>
								⬇️ Download File
							</button>
						{/if}
					</div>
				{:else if previewUrl}
					<!-- Preview content -->
					{#if isPDF}
						<iframe src={previewUrl} title="PDF Preview: {filename}" class="pdf-preview"></iframe>
					{:else if isImage}
						<div class="image-preview-container">
							<img src={previewUrl} alt={filename} class="image-preview" />
						</div>
					{:else if isText}
						<iframe src={previewUrl} title="Text Preview: {filename}" class="text-preview"></iframe>
					{/if}
				{:else}
					<!-- No preview URL -->
					<div class="no-preview-state">
						<div class="no-preview-icon">🔍</div>
						<h3>Generating Preview</h3>
						<p>Please wait while we prepare the preview...</p>
					</div>
				{/if}
			</div>
		</div>
	</div>
{/if}

<style>
	.preview-modal-backdrop {
		position: fixed;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		background: rgba(0, 0, 0, 0.75);
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 1000;
		padding: 1rem;
	}

	.preview-modal {
		width: 100%;
		max-width: 1200px;
		height: 90vh;
		background: white;
		border-radius: 8px;
		display: flex;
		flex-direction: column;
		box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
	}

	.modal-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 1.5rem;
		border-bottom: 1px solid #e2e8f0;
		gap: 1rem;
	}

	.header-info {
		display: flex;
		align-items: center;
		gap: 1rem;
		flex: 1;
		min-width: 0;
	}

	.modal-title {
		font-size: 1.25rem;
		font-weight: 600;
		color: #2d3748;
		margin: 0;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.file-type-badge {
		padding: 0.25rem 0.75rem;
		background: #edf2f7;
		color: #4a5568;
		border-radius: 9999px;
		font-size: 0.75rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		flex-shrink: 0;
	}

	.header-actions {
		display: flex;
		gap: 0.5rem;
		flex-shrink: 0;
	}

	.action-button {
		padding: 0.5rem 1rem;
		border: none;
		border-radius: 4px;
		font-size: 0.875rem;
		font-weight: 500;
		cursor: pointer;
		transition: all 0.2s;
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.download-button {
		background: #48bb78;
		color: white;
	}

	.download-button:hover {
		background: #38a169;
	}

	.close-button {
		background: #e2e8f0;
		color: #2d3748;
		font-size: 1.25rem;
		padding: 0.5rem 0.75rem;
	}

	.close-button:hover {
		background: #cbd5e0;
	}

	.modal-content {
		flex: 1;
		overflow: hidden;
		display: flex;
		align-items: center;
		justify-content: center;
		background: #f7fafc;
	}

	/* Preview states */
	.loading-state,
	.error-state,
	.unsupported-state,
	.no-preview-state {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		padding: 3rem 2rem;
		text-align: center;
	}

	.spinner {
		width: 48px;
		height: 48px;
		border: 4px solid #e2e8f0;
		border-top-color: #4299e1;
		border-radius: 50%;
		animation: spin 0.8s linear infinite;
		margin-bottom: 1rem;
	}

	@keyframes spin {
		to {
			transform: rotate(360deg);
		}
	}

	.loading-state p,
	.no-preview-state p {
		color: #718096;
		font-size: 0.875rem;
		margin: 0;
	}

	.error-icon,
	.unsupported-icon,
	.no-preview-icon {
		font-size: 4rem;
		margin-bottom: 1rem;
	}

	.error-state h3,
	.unsupported-state h3,
	.no-preview-state h3 {
		font-size: 1.25rem;
		font-weight: 600;
		color: #2d3748;
		margin: 0 0 0.5rem 0;
	}

	.error-state p,
	.unsupported-state p {
		color: #718096;
		margin: 0 0 1rem 0;
		max-width: 500px;
	}

	.conversion-note {
		font-size: 0.875rem;
		color: #4a5568;
		font-style: italic;
	}

	.retry-button,
	.download-instead-button {
		margin-top: 1rem;
		padding: 0.75rem 1.5rem;
		background: #4299e1;
		color: white;
		border: none;
		border-radius: 4px;
		font-size: 0.875rem;
		font-weight: 500;
		cursor: pointer;
		transition: background 0.2s;
	}

	.retry-button:hover,
	.download-instead-button:hover {
		background: #3182ce;
	}

	/* Preview displays */
	.pdf-preview,
	.text-preview {
		width: 100%;
		height: 100%;
		border: none;
	}

	.image-preview-container {
		width: 100%;
		height: 100%;
		overflow: auto;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 2rem;
	}

	.image-preview {
		max-width: 100%;
		max-height: 100%;
		object-fit: contain;
		border-radius: 4px;
		box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
	}

	/* Responsive */
	@media (max-width: 768px) {
		.preview-modal {
			height: 95vh;
		}

		.modal-header {
			flex-direction: column;
			align-items: flex-start;
		}

		.header-actions {
			width: 100%;
			justify-content: flex-end;
		}
	}
</style>
