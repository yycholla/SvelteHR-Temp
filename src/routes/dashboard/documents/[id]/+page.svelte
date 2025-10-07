<script lang="ts">
	// Document detail page (Feature 024)
	// Individual document view with metadata, preview, assignments, and access log

	import { goto } from '$app/navigation';
	import PreviewModal from '$lib/components/documents/PreviewModal.svelte';
	import DocumentAssignmentModal from '$lib/components/documents/DocumentAssignmentModal.svelte';
	import type { PageData } from './$types';
	import type { DocumentAssignment } from '$lib/types/document';

	let { data }: { data: PageData } = $props();

	// Svelte 5 state
	let isPreviewOpen = $state(false);
	let isAssignmentModalOpen = $state(false);
	let previewUrl = $state<string | null>(null);
	let previewLoading = $state(false);
	let previewError = $state<string | null>(null);

	// Sensitivity badge colors
	const sensitivityColors: Record<string, string> = {
		Public: 'bg-green-100 text-green-800',
		Internal: 'bg-blue-100 text-blue-800',
		Confidential: 'bg-yellow-100 text-yellow-800',
		'Sensitive-PII': 'bg-red-100 text-red-800'
	};

	// Derived state
	let sensitivityClass = $derived(
		sensitivityColors[data.document.sensitivity_level] || 'bg-gray-100 text-gray-800'
	);

	let uploadDate = $derived(new Date(data.document.uploaded_at).toLocaleString());

	// Handle preview
	async function handlePreview() {
		isPreviewOpen = true;
		previewLoading = true;
		previewError = null;

		try {
			const response = await fetch(`/api/documents/${data.document.id}/preview`);

			if (!response.ok) {
				throw new Error('Failed to generate preview');
			}

			const result = await response.json();
			previewUrl = result.previewUrl;
		} catch (error) {
			console.error('Preview error:', error);
			previewError = error instanceof Error ? error.message : 'Failed to load preview';
		} finally {
			previewLoading = false;
		}
	}

	// Handle download
	async function handleDownload() {
		try {
			window.open(`/api/documents/${data.document.id}/download`, '_blank');
		} catch (error) {
			console.error('Download error:', error);
			alert('Failed to download document. Please try again.');
		}
	}

	// Handle assignment
	async function handleAssignment(assignments: Partial<DocumentAssignment>[]) {
		try {
			// TODO: Call assignment API endpoint
			console.log('Assigning document:', assignments);

			// Close modal and show success
			isAssignmentModalOpen = false;
			alert('Document assigned successfully!');

			// Refresh page data
			window.location.reload();
		} catch (error) {
			console.error('Assignment error:', error);
			alert('Failed to assign document. Please try again.');
		}
	}

	// Handle delete
	async function handleDelete() {
		if (!confirm('Are you sure you want to delete this document? This action can be undone by administrators.')) {
			return;
		}

		try {
			// TODO: Call delete API endpoint
			const response = await fetch(`/api/documents/${data.document.id}`, {
				method: 'DELETE'
			});

			if (!response.ok) {
				throw new Error('Failed to delete document');
			}

			alert('Document deleted successfully!');
			goto('/dashboard/documents');
		} catch (error) {
			console.error('Delete error:', error);
			alert('Failed to delete document. Please try again.');
		}
	}

	// Close preview modal
	function closePreview() {
		isPreviewOpen = false;
		previewUrl = null;
		previewError = null;
	}

	// Format file size
	function formatFileSize(bytes: number): string {
		if (bytes < 1024) return `${bytes} B`;
		if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
		return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
	}
</script>

<svelte:head>
	<title>{data.document.filename} | HR System</title>
</svelte:head>

<div class="document-detail-page">
	<!-- Page header -->
	<div class="page-header">
		<button class="back-button" onclick={() => goto('/dashboard/documents')}>
			← Back to Documents
		</button>
	</div>

	<!-- Document info card -->
	<div class="document-card">
		<div class="card-header">
			<div class="document-icon">📄</div>
			<div class="document-info">
				<h1 class="document-title">{data.document.filename}</h1>
				<div class="document-meta">
					<span class="meta-item">{data.document.file_type}</span>
					<span class="separator">•</span>
					<span class="meta-item">{formatFileSize(data.document.file_size_bytes)}</span>
					<span class="separator">•</span>
					<span class="meta-item">Uploaded {uploadDate}</span>
				</div>
			</div>
		</div>

		<!-- Metadata -->
		<div class="metadata-grid">
			<div class="metadata-item">
				<span class="metadata-label">Category</span>
				<span class="metadata-value">{data.document.category}</span>
			</div>

			<div class="metadata-item">
				<span class="metadata-label">Sensitivity</span>
				<span class="sensitivity-badge {sensitivityClass}">
					{data.document.sensitivity_level}
				</span>
			</div>

			<div class="metadata-item">
				<span class="metadata-label">Uploaded By</span>
				<span class="metadata-value">User #{data.document.uploaded_by}</span>
			</div>

			{#if data.document.description}
				<div class="metadata-item full-width">
					<span class="metadata-label">Description</span>
					<p class="metadata-description">{data.document.description}</p>
				</div>
			{/if}
		</div>

		<!-- Actions -->
		<div class="action-buttons">
			<button class="action-button preview-button" onclick={handlePreview}>
				👁️ Preview
			</button>
			<button class="action-button download-button" onclick={handleDownload}>
				⬇️ Download
			</button>
			{#if data.canAssign}
				<button class="action-button assign-button" onclick={() => isAssignmentModalOpen = true}>
					👥 Assign
				</button>
			{/if}
			{#if data.canDelete}
				<button class="action-button delete-button" onclick={handleDelete}>
					🗑️ Delete
				</button>
			{/if}
		</div>
	</div>

	<!-- Assignments section -->
	{#if data.assignments && data.assignments.length > 0}
		<div class="assignments-section">
			<h2 class="section-title">Assignments</h2>
			<div class="assignments-list">
				{#each data.assignments as assignment}
					<div class="assignment-item">
						<div class="assignment-type">
							{#if assignment.assignment_type === 'employee'}
								👤 Employee
							{:else if assignment.assignment_type === 'department'}
								🏢 Department
							{:else if assignment.assignment_type === 'team'}
								👥 Team
							{/if}
						</div>
						<div class="assignment-info">
							<span class="assignment-target">
								{assignment.employee_id || assignment.department_id || assignment.team_id}
							</span>
							<span class="assignment-date">
								Assigned {new Date(assignment.assigned_at).toLocaleDateString()}
							</span>
						</div>
						<span class="assignment-status status-{assignment.assignment_status}">
							{assignment.assignment_status}
						</span>
					</div>
				{/each}
			</div>
		</div>
	{/if}

	<!-- Access log section (admin/hr only) -->
	{#if data.accessLogs && data.accessLogs.length > 0}
		<div class="access-log-section">
			<h2 class="section-title">Access Log</h2>
			<div class="access-log-table">
				<div class="log-header">
					<span class="log-col">User</span>
					<span class="log-col">Action</span>
					<span class="log-col">Outcome</span>
					<span class="log-col">Timestamp</span>
				</div>
				{#each data.accessLogs as log}
					<div class="log-row">
						<span class="log-col">User #{log.user_id}</span>
						<span class="log-col">{log.access_type}</span>
						<span class="log-col outcome-{log.access_outcome}">{log.access_outcome}</span>
						<span class="log-col">{new Date(log.access_timestamp).toLocaleString()}</span>
					</div>
				{/each}
			</div>
		</div>
	{/if}

	<!-- Preview modal -->
	<PreviewModal
		isOpen={isPreviewOpen}
		documentId={data.document.id}
		filename={data.document.filename}
		fileType={data.document.file_type}
		{previewUrl}
		isLoading={previewLoading}
		error={previewError}
		canDownload={true}
		onClose={closePreview}
		onDownload={handleDownload}
	/>

	<!-- Assignment modal -->
	<DocumentAssignmentModal
		isOpen={isAssignmentModalOpen}
		documentId={data.document.id}
		documentName={data.document.filename}
		employees={data.employees || []}
		departments={data.departments || []}
		teams={data.teams || []}
		existingAssignments={data.assignments || []}
		onAssign={handleAssignment}
		onClose={() => isAssignmentModalOpen = false}
	/>
</div>

<style>
	.document-detail-page {
		width: 100%;
		max-width: 1200px;
		margin: 0 auto;
		padding: 2rem;
	}

	.page-header {
		margin-bottom: 1.5rem;
	}

	.back-button {
		padding: 0.5rem 1rem;
		background: white;
		border: 1px solid #cbd5e0;
		border-radius: 4px;
		font-size: 0.875rem;
		color: #4a5568;
		cursor: pointer;
		transition: all 0.2s;
	}

	.back-button:hover {
		background: #f7fafc;
	}

	.document-card {
		background: white;
		border-radius: 8px;
		padding: 2rem;
		box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
		margin-bottom: 2rem;
	}

	.card-header {
		display: flex;
		gap: 1.5rem;
		margin-bottom: 2rem;
		padding-bottom: 2rem;
		border-bottom: 1px solid #e2e8f0;
	}

	.document-icon {
		font-size: 4rem;
		line-height: 1;
	}

	.document-info {
		flex: 1;
	}

	.document-title {
		font-size: 1.75rem;
		font-weight: 700;
		color: #2d3748;
		margin: 0 0 0.5rem 0;
		word-break: break-word;
	}

	.document-meta {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		flex-wrap: wrap;
		font-size: 0.875rem;
		color: #718096;
	}

	.separator {
		color: #cbd5e0;
	}

	.metadata-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
		gap: 1.5rem;
		margin-bottom: 2rem;
	}

	.metadata-item {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.metadata-item.full-width {
		grid-column: 1 / -1;
	}

	.metadata-label {
		font-size: 0.75rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: #a0aec0;
	}

	.metadata-value {
		font-size: 1rem;
		color: #2d3748;
		font-weight: 500;
	}

	.metadata-description {
		font-size: 0.875rem;
		color: #4a5568;
		line-height: 1.6;
		margin: 0;
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

	.action-buttons {
		display: flex;
		gap: 1rem;
		flex-wrap: wrap;
	}

	.action-button {
		padding: 0.75rem 1.5rem;
		border: none;
		border-radius: 6px;
		font-size: 0.875rem;
		font-weight: 600;
		cursor: pointer;
		transition: all 0.2s;
		display: flex;
		align-items: center;
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

	.assign-button {
		background: #9f7aea;
		color: white;
	}

	.assign-button:hover {
		background: #805ad5;
	}

	.delete-button {
		background: #f56565;
		color: white;
	}

	.delete-button:hover {
		background: #e53e3e;
	}

	.assignments-section,
	.access-log-section {
		background: white;
		border-radius: 8px;
		padding: 2rem;
		box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
		margin-bottom: 2rem;
	}

	.section-title {
		font-size: 1.25rem;
		font-weight: 700;
		color: #2d3748;
		margin: 0 0 1.5rem 0;
	}

	.assignments-list {
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.assignment-item {
		display: flex;
		align-items: center;
		gap: 1rem;
		padding: 1rem;
		background: #f7fafc;
		border-radius: 6px;
	}

	.assignment-type {
		font-size: 0.875rem;
		font-weight: 600;
		color: #4a5568;
	}

	.assignment-info {
		flex: 1;
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
	}

	.assignment-target {
		font-size: 0.875rem;
		color: #2d3748;
		font-weight: 500;
	}

	.assignment-date {
		font-size: 0.75rem;
		color: #a0aec0;
	}

	.assignment-status {
		padding: 0.25rem 0.75rem;
		border-radius: 9999px;
		font-size: 0.75rem;
		font-weight: 600;
		text-transform: uppercase;
	}

	.status-active {
		background: #c6f6d5;
		color: #22543d;
	}

	.status-revoked {
		background: #fed7d7;
		color: #742a2a;
	}

	.access-log-table {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.log-header,
	.log-row {
		display: grid;
		grid-template-columns: 1fr 1fr 1fr 1.5fr;
		gap: 1rem;
		padding: 0.75rem 1rem;
	}

	.log-header {
		background: #f7fafc;
		border-radius: 6px;
		font-weight: 600;
		font-size: 0.75rem;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: #718096;
	}

	.log-row {
		font-size: 0.875rem;
		color: #4a5568;
		border-bottom: 1px solid #e2e8f0;
	}

	.log-row:last-child {
		border-bottom: none;
	}

	.outcome-success {
		color: #38a169;
		font-weight: 600;
	}

	.outcome-denied {
		color: #e53e3e;
		font-weight: 600;
	}

	/* Responsive */
	@media (max-width: 768px) {
		.document-detail-page {
			padding: 1rem;
		}

		.metadata-grid {
			grid-template-columns: 1fr;
		}

		.action-buttons {
			flex-direction: column;
		}

		.action-button {
			width: 100%;
			justify-content: center;
		}

		.log-header,
		.log-row {
			grid-template-columns: 1fr;
			gap: 0.5rem;
		}

		.log-header {
			display: none;
		}

		.log-col::before {
			content: attr(data-label);
			font-weight: 600;
			margin-right: 0.5rem;
		}
	}
</style>
