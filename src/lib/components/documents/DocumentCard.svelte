<script lang="ts">
	// DocumentCard component (Feature 024)
	// Individual document card display with RBAC-aware actions

	import { goto } from '$app/navigation';
	import type { Document } from '$lib/types/document';

	interface Props {
		document: Document;
		canPreview?: boolean;
		canDownload?: boolean;
		onPreview?: (documentId: string) => void;
		onDownload?: (documentId: string) => void;
	}

	const {
		document,
		canPreview = false,
		canDownload = false,
		onPreview = () => {},
		onDownload = () => {}
	}: Props = $props();

	// Navigate to document detail page
	function handleCardClick() {
		goto(`/dashboard/documents/${document.id}`);
	}

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
	const fileIcon = $derived(fileIcons[document.file_type] || '📎');
	const sensitivityClass = $derived(
		sensitivityColors[document.sensitivity_level] || 'bg-gray-100 text-gray-800'
	);
	const uploadDate = $derived(new Date(document.uploaded_at).toLocaleDateString());
	const fileSize = $derived(formatFileSize(document.file_size_bytes));

	// Format file size
	function formatFileSize(bytes: number): string {
		if (bytes < 1024) return `${bytes} B`;
		if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
		return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
	}

	// Handle preview click
	function handlePreview(event: MouseEvent) {
		event.stopPropagation(); // Prevent card click
		if (canPreview) {
			onPreview(document.id);
		}
	}

	// Handle download click
	function handleDownload(event: MouseEvent) {
		event.stopPropagation(); // Prevent card click
		if (canDownload) {
			onDownload(document.id);
		}
	}
</script>

<div
	class="document-card"
	onclick={handleCardClick}
	role="button"
	tabindex="0"
	onkeydown={(e) => e.key === 'Enter' && handleCardClick()}
>
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

	<!-- Sensitivity badge and assigned users -->
	<div class="badges-container">
		<div class="sensitivity-badge {sensitivityClass}">
			{document.sensitivity_level}
		</div>

		{#if document.assigned_users && Array.isArray(document.assigned_users) && document.assigned_users.length > 0}
			{#each document.assigned_users as assignedUser}
				<div class="assigned-user-badge" title="Assigned to {assignedUser.email}">
					👤 {assignedUser.email}
				</div>
			{/each}
		{/if}
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
		cursor: pointer;
	}

	.document-card:hover {
		border-color: #cbd5e0;
		box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);
		transform: translateY(-2px);
	}

	.document-card:focus {
		outline: 2px solid #4299e1;
		outline-offset: 2px;
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

	.badges-container {
		display: flex;
		gap: 0.5rem;
		flex-wrap: wrap;
		align-items: center;
	}

	.sensitivity-badge {
		padding: 0.25rem 0.75rem;
		border-radius: 9999px;
		font-size: 0.75rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	.assigned-user-badge {
		padding: 0.25rem 0.75rem;
		border-radius: 9999px;
		font-size: 0.75rem;
		font-weight: 500;
		background: #edf2f7;
		color: #4a5568;
		display: flex;
		align-items: center;
		gap: 0.25rem;
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
