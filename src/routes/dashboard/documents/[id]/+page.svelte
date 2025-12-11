<script lang="ts">
	// Document detail page (Feature 024)
	import { logger } from '$lib/utils/logger';
	// Individual document view with metadata, preview, assignments, and access log

	import { goto } from '$app/navigation';
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import PreviewModal from '$lib/components/documents/PreviewModal.svelte';
	import DocumentAssignmentModal from '$lib/components/documents/DocumentAssignmentModal.svelte';
	import { ArrowLeft, Download, Eye, Trash2, Users } from '@lucide/svelte';
	import type { PageData } from './$types';
	import type { DocumentAssignment } from '$lib/types/document';

	const { data }: { data: PageData } = $props();

	// Svelte 5 state
	let isPreviewOpen = $state(false);
	let isAssignmentModalOpen = $state(false);
	let previewUrl = $state<string | null>(null);
	let previewLoading = $state(false);
	let previewError = $state<string | null>(null);

	// Sensitivity badge colors with dark mode support
	const sensitivityColors: Record<string, string> = {
		Public: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
		Internal: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
		Confidential: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
		'Sensitive-PII': 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300'
	};

	// Derived state
	const sensitivityClass = $derived(
		sensitivityColors[data.document.sensitivity_level] || 'bg-muted text-muted-foreground'
	);

	const uploadDate = $derived(new Date(data.document.uploaded_at).toLocaleString());

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
			logger.error('Preview error:', error as Error);
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
			logger.error('Download error:', error as Error);
			alert('Failed to download document. Please try again.');
		}
	}

	// Handle assignment
	async function handleAssignment(assignments: Partial<DocumentAssignment>[]) {
		try {
			// TODO: Call assignment API endpoint
			logger.info('Assigning document:'.replace(/['`]$/, `: ${assignments}'`/));

			// Close modal and show success
			isAssignmentModalOpen = false;
			alert('Document assigned successfully!');

			// Refresh page data
			window.location.reload();
		} catch (error) {
			logger.error('Assignment error:', error as Error);
			alert('Failed to assign document. Please try again.');
		}
	}

	// Handle delete
	async function handleDelete() {
		if (
			!confirm(
				'Are you sure you want to delete this document? This action can be undone by administrators.'
			)
		) {
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
			logger.error('Delete error:', error as Error);
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

<div class="container mx-auto py-6 space-y-6">
	<!-- Page header -->
	<div class="mb-6">
		<Button variant="outline" onclick={() => goto('/dashboard/documents')} class="gap-2">
			<ArrowLeft class="h-4 w-4" />
			Back to Documents
		</Button>
	</div>

	<!-- Document info card -->
	<Card.Root>
		<Card.Header class="border-b pb-6">
			<div class="flex gap-6">
				<div class="text-6xl">📄</div>
				<div class="flex-1">
					<h1 class="text-3xl font-bold text-foreground mb-2 break-words">
						{data.document.filename}
					</h1>
					<div class="flex items-center gap-2 flex-wrap text-sm text-muted-foreground">
						<span>{data.document.file_type}</span>
						<span class="text-border">•</span>
						<span>{formatFileSize(data.document.file_size_bytes)}</span>
						<span class="text-border">•</span>
						<span>Uploaded {uploadDate}</span>
					</div>
				</div>
			</div>
		</Card.Header>

		<Card.Content class="pt-6">
			<!-- Metadata -->
			<div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
				<div class="flex flex-col gap-2">
					<span class="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
						Category
					</span>
					<span class="text-base font-medium text-foreground">
						{data.document.category}
					</span>
				</div>

				<div class="flex flex-col gap-2">
					<span class="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
						Sensitivity
					</span>
					<span
						class="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wide w-fit {sensitivityClass}"
					>
						{data.document.sensitivity_level}
					</span>
				</div>

				<div class="flex flex-col gap-2">
					<span class="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
						Uploaded By
					</span>
					<span class="text-base font-medium text-foreground">
						{data.document.uploaded_by_email ||
							`User ${data.document.uploaded_by.substring(0, 8)}...`}
					</span>
				</div>

				{#if data.document.description}
					<div class="flex flex-col gap-2 md:col-span-3">
						<span class="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
							Description
						</span>
						<p class="text-sm text-muted-foreground leading-relaxed">
							{data.document.description}
						</p>
					</div>
				{/if}
			</div>

			<!-- Actions -->
			<div class="flex gap-3 flex-wrap">
				<Button onclick={handlePreview} class="gap-2">
					<Eye class="h-4 w-4" />
					Preview
				</Button>
				<Button variant="secondary" onclick={handleDownload} class="gap-2">
					<Download class="h-4 w-4" />
					Download
				</Button>
				{#if data.canAssign}
					<Button variant="outline" onclick={() => (isAssignmentModalOpen = true)} class="gap-2">
						<Users class="h-4 w-4" />
						Assign
					</Button>
				{/if}
				{#if data.canDelete}
					<Button variant="destructive" onclick={handleDelete} class="gap-2">
						<Trash2 class="h-4 w-4" />
						Delete
					</Button>
				{/if}
			</div>
		</Card.Content>
	</Card.Root>

	<!-- Assignments section -->
	{#if data.assignments && data.assignments.length > 0}
		<Card.Root>
			<Card.Header>
				<Card.Title>Assignments</Card.Title>
			</Card.Header>
			<Card.Content>
				<div class="space-y-3">
					{#each data.assignments as assignment}
						<div class="flex items-center gap-4 p-4 bg-muted rounded-lg">
							<div class="text-sm font-semibold text-muted-foreground">
								{#if assignment.employee_id}
									👤 Employee
								{:else if assignment.department_id}
									🏢 Department
								{/if}
							</div>
							<div class="flex-1 flex flex-col gap-1">
								<span class="text-sm font-medium text-foreground">
									{#if assignment.employee_id}
										{assignment.employee_email ||
											`User ${assignment.employee_id.substring(0, 8)}...`}
									{:else if assignment.department_id}
										Department #{assignment.department_id.substring(0, 8)}
									{/if}
								</span>
								<span class="text-xs text-muted-foreground">
									Assigned {new Date(assignment.assigned_at).toLocaleDateString()}
									{#if assignment.assigned_by_email}
										by {assignment.assigned_by_email}
									{/if}
								</span>
								{#if assignment.assignment_reason}
									<span class="text-xs text-muted-foreground italic mt-1">
										{assignment.assignment_reason}
									</span>
								{/if}
							</div>
						</div>
					{/each}
				</div>
			</Card.Content>
		</Card.Root>
	{/if}

	<!-- Access log section (admin/hr only) -->
	{#if data.accessLogs && data.accessLogs.length > 0}
		<Card.Root>
			<Card.Header>
				<Card.Title>Access Log</Card.Title>
			</Card.Header>
			<Card.Content>
				<div class="space-y-2">
					<div
						class="grid grid-cols-4 gap-4 p-3 bg-muted rounded-lg font-semibold text-xs uppercase tracking-wide text-muted-foreground"
					>
						<span>User</span>
						<span>Action</span>
						<span>Outcome</span>
						<span>Timestamp</span>
					</div>
					{#each data.accessLogs as log}
						<div
							class="grid grid-cols-4 gap-4 p-3 text-sm text-foreground border-b last:border-b-0"
						>
							<span>{log.user_email || `User ${log.user_id.substring(0, 8)}...`}</span>
							<span>{log.access_type}</span>
							<span
								class="font-semibold {log.access_outcome === 'success'
									? 'text-green-600 dark:text-green-400'
									: 'text-red-600 dark:text-red-400'}"
							>
								{log.access_outcome}
							</span>
							<span>{new Date(log.access_timestamp).toLocaleString()}</span>
						</div>
					{/each}
				</div>
			</Card.Content>
		</Card.Root>
	{/if}

	<!-- Preview modal -->
	<PreviewModal
		isOpen={isPreviewOpen}
		documentId={data.document.id}
		filename={data.document.filename}
		mimeType={data.document.mime_type}
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
		onClose={() => (isAssignmentModalOpen = false)}
	/>
</div>
