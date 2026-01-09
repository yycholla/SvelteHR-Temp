<script lang="ts">
	import { enhance } from '$app/forms';
	import { FileText, Link2 } from '@lucide/svelte';
	import { Button } from '$lib/components/ui/button';
	import FileUploader from '$lib/components/documents/FileUploader.svelte';
	import { toast } from 'svelte-sonner';
	import type { DocumentMetadata } from '$lib/types/document';

	interface Props {
		linkedResources: any[];
		formatDate: (date: string) => string;
	}

	const { linkedResources, formatDate }: Props = $props();

	let isUploading = $state(false);
	let uploadError = $state<string | null>(null);
	let fileUploader = $state<FileUploader>();
	let metadata = $state<DocumentMetadata>({
		filename: '',
		category: 'Other',
		sensitivityLevel: 'Internal',
		metadataTags: {},
		assignToEmployees: [],
		assignToDepartments: []
	});
	let hasFile = $state(false);
</script>

<div class="rounded-lg border bg-card text-card-foreground shadow-sm">
	<div class="flex flex-col space-y-1.5 p-6">
		<h3 class="text-lg font-semibold leading-none tracking-tight">Attachments</h3>
	</div>
	<div class="space-y-4 p-6 pt-0">
		<!-- File Upload Form -->
		<form
			method="POST"
			action="?/uploadFile"
			enctype="multipart/form-data"
			use:enhance={({ formData }) => {
				isUploading = true;
				uploadError = null;

				const file = fileUploader?.getSelectedFile();
				if (file) {
					formData.set('file', file);
				}

				return async ({ result, update }) => {
					isUploading = false;
					if (result.type === 'success') {
						toast.success('File uploaded successfully');
						fileUploader?.clearFile();
						await update();
					} else if (result.type === 'failure') {
						uploadError = (result.data?.error as string) || 'Upload failed';
						toast.error(uploadError);
					}
				};
			}}
		>
			<FileUploader
				bind:this={fileUploader}
				bind:metadata
				bind:hasFile
				maxSizeMB={50}
				allowedTypes={['PDF', 'JPEG', 'PNG', 'GIF', 'DOCX', 'XLSX', 'TXT', 'CSV']}
			/>
			{#if hasFile}
				<div class="mt-2 flex justify-end">
					<Button type="submit" size="sm" disabled={isUploading}>
						{isUploading ? 'Uploading...' : 'Upload'}
					</Button>
				</div>
			{/if}
		</form>

		<!-- List of linked resources (Documents) -->
		{#if linkedResources && linkedResources.length > 0}
			<div class="space-y-2">
				{#each linkedResources as resource}
					{#if resource.resourceType === 'document'}
						<div
							class="flex items-center gap-3 rounded-md border bg-secondary/20 p-3 transition-colors hover:bg-secondary/40"
						>
							<div
								class="flex h-10 w-10 items-center justify-center rounded bg-blue-100 text-blue-600"
							>
								<FileText class="h-5 w-5" />
							</div>
							<div class="flex min-w-0 flex-1 flex-col">
								<span class="truncate text-sm font-medium">{resource.resourceTitle}</span>
								<span class="text-xs text-muted-foreground"
									>Document • {formatDate(resource.createdAt.toString())}</span
								>
							</div>
							<Button
								variant="ghost"
								size="icon"
								href={`/dashboard/documents/${resource.resourceId}`}
								title="View Document"
							>
								<Link2 class="h-4 w-4" />
							</Button>
						</div>
					{/if}
				{/each}
			</div>
		{/if}
	</div>
</div>
