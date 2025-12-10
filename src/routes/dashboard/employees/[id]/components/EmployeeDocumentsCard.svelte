<script lang="ts">
	import { FileText, Upload, Plus, Download, Trash2 } from '@lucide/svelte';

	interface Props {
		employee: any;
		canViewDocuments: boolean;
		canAssignDocuments: boolean;
		isUnassigningDocument: boolean;
		formatRelativeTime: (date: string) => string;
		onUpload: () => void;
		onAssign: () => void;
		onUnassign: (assignmentId: string) => void;
	}

	const {
		employee,
		canViewDocuments,
		canAssignDocuments,
		isUnassigningDocument,
		formatRelativeTime,
		onUpload,
		onAssign,
		onUnassign
	}: Props = $props();
</script>

{#if canViewDocuments}
	<div class="flex flex-col rounded-xl border bg-card p-5 md:col-span-2">
		<div class="mb-4 flex items-center justify-between">
			<div class="flex items-center gap-2 text-muted-foreground">
				<FileText class="h-4 w-4" />
				<span class="text-xs font-semibold uppercase tracking-wider">Documents</span>
			</div>
			{#if employee.assignedDocuments?.length}
				<span class="rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground"
					>{employee.assignedDocuments.length} Files</span
				>
			{/if}
			{#if canAssignDocuments}
				<div class="flex gap-1">
					<button
						onclick={onUpload}
						class="rounded-md bg-secondary p-1.5 text-xs transition-colors hover:bg-secondary/80"
						title="Upload new document for this employee"
					>
						<Upload class="h-3 w-3" />
					</button>
					<button
						onclick={onAssign}
						class="rounded-md bg-secondary p-1.5 text-xs transition-colors hover:bg-secondary/80"
						title="Assign existing document to this employee"
					>
						<Plus class="h-3 w-3" />
					</button>
				</div>
			{/if}
		</div>

		{#if employee.assignedDocuments && employee.assignedDocuments.length > 0}
			<div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
				{#each employee.assignedDocuments as doc}
					<div
						class="group relative flex items-start gap-3 rounded-lg border border-border/50 bg-muted/20 p-3 transition-all hover:bg-muted/40"
					>
						<div
							class="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded bg-background text-muted-foreground shadow-sm"
						>
							<FileText class="h-4 w-4" />
						</div>
						<div class="flex-1 overflow-hidden">
							<p class="truncate text-sm font-medium" title={doc.filename}>{doc.filename}</p>
							<div class="mt-1 flex items-center gap-2 text-[10px] text-muted-foreground">
								<span class="uppercase">{doc.category || 'General'}</span>
								<span>•</span>
								<span>{formatRelativeTime(doc.uploadedAt)}</span>
							</div>
						</div>

						<div
							class="absolute top-2 right-2 hidden items-center gap-1 rounded-md bg-background/80 p-0.5 shadow-sm backdrop-blur-sm group-hover:flex"
						>
							<a
								href="/api/documents/{doc.id}/download"
								target="_blank"
								class="flex h-7 w-7 items-center justify-center rounded hover:bg-muted hover:text-primary"
								title="Download"
							>
								<Download class="h-3.5 w-3.5" />
							</a>
							{#if canAssignDocuments}
								<button
									onclick={() => onUnassign(doc.assignmentId)}
									class="flex h-7 w-7 items-center justify-center rounded hover:bg-muted hover:text-destructive"
									title="Unassign"
									disabled={isUnassigningDocument}
								>
									<Trash2 class="h-3.5 w-3.5" />
								</button>
							{/if}
						</div>
					</div>
				{/each}
			</div>
		{:else}
			<div
				class="flex h-32 flex-col items-center justify-center rounded-lg border border-dashed border-border/60 bg-muted/5"
			>
				<FileText class="mb-2 h-6 w-6 text-muted-foreground/40" />
				<p class="text-xs text-muted-foreground">No documents assigned</p>
			</div>
		{/if}
	</div>
{/if}
