<script lang="ts">
	import { Download, RotateCcw, X } from '@lucide/svelte';

	interface Props {
		open: boolean;
		selectedReport: any;
		canRunReports: boolean;
		canEditReports: boolean;
		onClose: () => void;
		onDownload: (report: any) => void;
		onRun: (report: any) => void;
	}

	let {
		open = $bindable(),
		selectedReport,
		canRunReports,
		canEditReports,
		onClose,
		onDownload,
		onRun
	}: Props = $props();

	function formatDate(dateString: string | null) {
		if (!dateString) return 'Never';
		return new Date(dateString).toLocaleDateString('en-US', {
			month: 'short',
			day: 'numeric',
			year: 'numeric',
			hour: '2-digit',
			minute: '2-digit'
		});
	}

	function getStatusBadge(status: string) {
		const statusMap = {
			active: { label: 'Active', color: 'bg-green-100 text-green-800' },
			draft: { label: 'Draft', color: 'bg-gray-100 text-foreground' },
			scheduled: { label: 'Scheduled', color: 'bg-blue-100 text-blue-800' },
			archived: { label: 'Archived', color: 'bg-red-100 text-red-800' }
		};
		return (
			statusMap[status as keyof typeof statusMap] || {
				label: status,
				color: 'bg-gray-100 text-foreground'
			}
		);
	}
</script>

{#if open && selectedReport}
	{@const viewStatusBadge = getStatusBadge(selectedReport.status)}
	<div class="fixed inset-0 z-50 overflow-y-auto">
		<div
			class="flex min-h-screen items-center justify-center px-4 pt-4 pb-20 text-center sm:block sm:p-0"
		>
			<div
				class="dark:bg-muted0 bg-opacity-75 fixed inset-0 bg-muted transition-opacity"
				role="button"
				tabindex="0"
				onclick={onClose}
				onkeydown={(e) => {
					if (e.key === 'Escape' || e.key === 'Enter') {
						onClose();
					}
				}}
			></div>

			<div
				class="inline-block transform overflow-hidden rounded-lg bg-card text-left align-bottom shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-2xl sm:align-middle"
			>
				<div class="bg-card px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
					<div class="mb-4 flex items-center justify-between">
						<h3 class="text-lg font-medium text-foreground">{selectedReport.title}</h3>
						<button onclick={onClose} class="text-muted-foreground hover:text-muted-foreground">
							<X class="h-6 w-6" />
						</button>
					</div>

					<div class="space-y-4">
						<div class="grid grid-cols-2 gap-4">
							<div>
								<dt class="text-sm font-medium text-muted-foreground">Type</dt>
								<dd class="mt-1 text-sm text-foreground capitalize">{selectedReport.reportType}</dd>
							</div>
							<div>
								<dt class="text-sm font-medium text-muted-foreground">Category</dt>
								<dd class="mt-1 text-sm text-foreground capitalize">{selectedReport.category}</dd>
							</div>
							<div>
								<dt class="text-sm font-medium text-muted-foreground">Status</dt>
								<dd class="mt-1">
									<span
										class="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium {viewStatusBadge.color}"
									>
										{viewStatusBadge.label}
									</span>
								</dd>
							</div>
							<div>
								<dt class="text-sm font-medium text-muted-foreground">Generated Count</dt>
								<dd class="mt-1 text-sm text-foreground">{selectedReport.generatedCount ?? 0}</dd>
							</div>
						</div>

						{#if selectedReport.description}
							<div>
								<dt class="text-sm font-medium text-muted-foreground">Description</dt>
								<dd class="mt-1 text-sm text-foreground">{selectedReport.description}</dd>
							</div>
						{/if}

						<div class="grid grid-cols-2 gap-4">
							<div>
								<dt class="text-sm font-medium text-muted-foreground">Created</dt>
								<dd class="mt-1 text-sm text-foreground">{formatDate(selectedReport.createdAt)}</dd>
							</div>
							<div>
								<dt class="text-sm font-medium text-muted-foreground">Last Run</dt>
								<dd class="mt-1 text-sm text-foreground">
									{formatDate(selectedReport.lastRunAt ?? null)}
								</dd>
							</div>
						</div>

						<div>
							<dt class="text-sm font-medium text-muted-foreground">Created By</dt>
							<dd class="mt-1 text-sm text-foreground">
								{selectedReport.creator ? selectedReport.creator.displayName : 'Unknown'}
							</dd>
						</div>
					</div>
				</div>

				<div class="bg-muted px-4 py-3 sm:flex sm:flex-row-reverse sm:px-6 dark:bg-muted">
					<button
						onclick={() => onDownload(selectedReport)}
						class="inline-flex w-full justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 focus:outline-none sm:ml-3 sm:w-auto"
					>
						<Download class="mr-2 h-4 w-4" />
						Download
					</button>
					{#if canRunReports}
						<button
							onclick={() => onRun(selectedReport)}
							class="mt-3 inline-flex w-full justify-center rounded-md border px-4 py-2 text-sm font-medium hover:bg-accent focus:outline-none sm:mt-0 sm:ml-3 sm:w-auto"
						>
							<RotateCcw class="mr-2 h-4 w-4" />
							Run Report
						</button>
					{/if}
				</div>
			</div>
		</div>
	</div>
{/if}
