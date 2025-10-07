<script lang="ts">
	// DocumentCard component (Feature 024)
	// Individual document card display with RBAC-aware actions

	import type { Document } from '$lib/types/document';

	interface Props {
		document: Document;
		canPreview?: boolean;
		canDownload?: boolean;
		onPreview?: (documentId: string) => void;
		onDownload?: (documentId: string) => void;
	}

	let {
		document,
		canPreview = false,
		canDownload = false,
		onPreview = () => {},
		onDownload = () => {}
	}: Props = $props();

	// File type icons mapping
	const fileIcons: Record<string, string> = {
		PDF: '📄',
		JPEG: '🖼️',
		PNG: '🖼️',
		GIF: '🖼️',
		DOCX: '📝',
		XLSX: '📊',
		TXT: '📃',
		CSV: '📈'
	};

	// Sensitivity level colors
	const sensitivityColors: Record<string, string> = {
		Public: 'bg-green-100 text-green-800',
		Internal: 'bg-blue-100 text-blue-800',
		Confidential: 'bg-yellow-100 text-yellow-800',
		'Sensitive-PII': 'bg-red-100 text-red-800'
	};

	// Derived state
	let fileIcon = $derived(fileIcons[document.file_type] || '📎');
	let sensitivityClass = $derived(
		sensitivityColors[document.sensitivity_level] || 'bg-gray-100 text-gray-800'
	);
	let uploadDate = $derived(new Date(document.uploaded_at).toLocaleDateString());
	let fileSize = $derived(formatFileSize(document.file_size_bytes));

	// Format file size
	function formatFileSize(bytes: number): string {
		if (bytes < 1024) return `${bytes} B`;
		if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
		return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
	}

	// Handle preview click
	function handlePreview() {
		if (canPreview) {
			onPreview(document.id);
		}
	}

	// Handle download click
	function handleDownload() {
		if (canDownload) {
			onDownload(document.id);
		}
	}
</script>

<div class="document-card">
	<!-- File icon and metadata -->
	<div class="card-header">
		<div class="file-icon">{fileIcon}</div>
		<div class="file-info">
			<h3 class="filename">{document.filename}</h3>
			<div class="metadata">
				<span class="category">{document.category}</span>
				<span class="separator">•</span>
				<span class="upload-date">{uploadDate}</span>
				<span class="separator">•</span>
				<span class="file-size">{fileSize}</span>
			</div>
		</div>
	</div>

	<!-- Sensitivity badge -->
	<div class="sensitivity-badge {sensitivityClass}">
		{document.sensitivity_level}
	</div>

	<!-- Actions -->
	<div class="card-actions">
		{#if canPreview}
			<button class="action-button preview-button" onclick={handlePreview} title="Preview document">
				👁️ Preview
			</button>
		{/if}

		{#if canDownload}
			<button
				class="action-button download-button"
				onclick={handleDownload}
				title="Download encrypted document"
			>
				⬇️ Download
			</button>
		{/if}

		{#if !canPreview && !canDownload}
			<p class="no-actions">No actions available</p>
		{/if}
	</div>

	<!-- Additional metadata (optional) -->
	{#if document.description}
		<div class="description">
			<p>{document.description}</p>
		</div>
	{/if}
</div>

<style>
	.document-card {
		display: flex;
		flex-direction: column;
		gap: 1rem;
		padding: 1.5rem;
		background: white;
		border: 1px solid #e2e8f0;
		border-radius: 8px;
		transition: all 0.2s ease;
	}

	.document-card:hover {
		border-color: #cbd5e0;
		box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);
	}

	.card-header {
		display: flex;
		align-items: flex-start;
		gap: 1rem;
	}

	.file-icon {
		font-size: 2.5rem;
		line-height: 1;
	}

	.file-info {
		flex: 1;
	}

	.filename {
		font-size: 1.125rem;
		font-weight: 600;
		color: #2d3748;
		margin: 0 0 0.5rem 0;
		word-break: break-word;
	}

	.metadata {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		flex-wrap: wrap;
		font-size: 0.875rem;
		color: #718096;
	}

	.category {
		font-weight: 500;
		color: #4a5568;
	}

	.separator {
		color: #cbd5e0;
	}

	.sensitivity-badge {
		align-self: flex-start;
		padding: 0.25rem 0.75rem;
		border-radius: 9999px;
		font-size: 0.75rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	.card-actions {
		display: flex;
		gap: 0.75rem;
		flex-wrap: wrap;
	}

	.action-button {
		flex: 1;
		min-width: 120px;
		padding: 0.625rem 1rem;
		border: none;
		border-radius: 4px;
		font-size: 0.875rem;
		font-weight: 500;
		cursor: pointer;
		transition: all 0.2s ease;
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.5rem;
	}

	.preview-button {
		background: #4299e1;
		color: white;
	}

	.preview-button:hover {
		background: #3182ce;
	}

	.download-button {
		background: #48bb78;
		color: white;
	}

	.download-button:hover {
		background: #38a169;
	}

	.action-button:disabled {
		background: #cbd5e0;
		cursor: not-allowed;
	}

	.no-actions {
		color: #a0aec0;
		font-size: 0.875rem;
		font-style: italic;
		margin: 0;
	}

	.description {
		padding-top: 0.75rem;
		border-top: 1px solid #e2e8f0;
	}

	.description p {
		margin: 0;
		font-size: 0.875rem;
		color: #4a5568;
		line-height: 1.5;
	}
</style>
