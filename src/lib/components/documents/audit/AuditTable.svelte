<script lang="ts">
	import type { AccessLog } from './types';

	interface Props {
		accessLogs: AccessLog[];
		totalCount: number;
		page: number;
		limit: number;
		onPageChange: (page: number) => void;
	}

	let { accessLogs, totalCount, page, limit, onPageChange }: Props = $props();

	const totalPages = $derived(Math.ceil(totalCount / limit));
	const hasLogs = $derived(accessLogs.length > 0);
</script>

<div class="table-card">
	{#if hasLogs}
		<div class="audit-table">
			<div class="table-header">
				<span class="col-timestamp">Timestamp</span>
				<span class="col-document">Document</span>
				<span class="col-user">User</span>
				<span class="col-action">Action</span>
				<span class="col-ip">IP Address</span>
			</div>

			{#each accessLogs as log}
				<div class="table-row">
					<span class="col-timestamp">
						{new Date(log.accessed_at).toLocaleString()}
					</span>
					<span class="col-document">
						<a href="/dashboard/documents/{log.document_id}" class="document-link">
							{log.document_title || log.document_id}
						</a>
						{#if log.document_type}
							<span class="file-type">.{log.document_type.toLowerCase()}</span>
						{/if}
					</span>
					<span class="col-user">
						{log.user_email || `User ${log.user_id.substring(0, 8)}...`}
					</span>
					<span class="col-action access-type-{log.action}">
						{log.action}
					</span>

					<span class="col-ip">
						{log.ip_address}
					</span>
				</div>
			{/each}
		</div>

		<!-- Pagination -->
		{#if totalPages > 1}
			<div class="pagination">
				<div class="pagination-info">
					Showing {(page - 1) * limit + 1}-{Math.min(page * limit, totalCount)} of {totalCount}
				</div>

				<div class="pagination-controls">
					<button class="page-button" onclick={() => onPageChange(1)} disabled={page === 1}>
						««
					</button>
					<button class="page-button" onclick={() => onPageChange(page - 1)} disabled={page === 1}>
						«
					</button>

					{#each Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
						const startPage = Math.max(1, page - 2);
						return startPage + i;
					}).filter((p) => p <= totalPages) as p}
						<button class="page-button" class:active={p === page} onclick={() => onPageChange(p)}>
							{p}
						</button>
					{/each}

					<button
						class="page-button"
						onclick={() => onPageChange(page + 1)}
						disabled={page === totalPages}
					>
						»
					</button>
					<button
						class="page-button"
						onclick={() => onPageChange(totalPages)}
						disabled={page === totalPages}
					>
						»»
					</button>
				</div>
			</div>
		{/if}
	{:else}
		<div class="empty-state">
			<div class="empty-icon">📋</div>
			<h3>No audit logs found</h3>
			<p>Try adjusting your filters to see more results.</p>
		</div>
	{/if}
</div>

<style>
	.table-card {
		background: hsl(var(--card));
		border: 1px solid hsl(var(--border));
		border-radius: var(--radius);
		padding: 1.5rem;
		box-shadow: 0 1px 3px hsl(var(--foreground) / 0.1);
	}

	.audit-table {
		width: 100%;
		overflow-x: auto;
	}

	.table-header,
	.table-row {
		display: grid;
		grid-template-columns: 1.5fr 2fr 1.5fr 1fr 1fr;
		gap: 1rem;
		padding: 0.75rem 1rem;
		align-items: center;
	}

	.table-header {
		background: hsl(var(--muted));
		border-radius: var(--radius);
		font-weight: 600;
		font-size: 0.75rem;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: hsl(var(--muted-foreground));
		margin-bottom: 0.5rem;
	}

	.table-row {
		font-size: 0.875rem;
		color: hsl(var(--foreground));
		border-bottom: 1px solid hsl(var(--border));
	}

	.table-row:last-child {
		border-bottom: none;
	}

	.document-link {
		color: hsl(var(--primary));
		text-decoration: none;
		font-weight: 500;
	}

	.document-link:hover {
		text-decoration: underline;
	}

	.file-type {
		color: hsl(var(--muted-foreground));
		font-size: 0.75rem;
		font-weight: normal;
		margin-left: 0.25rem;
	}

	.access-type-view {
		color: hsl(var(--primary));
		font-weight: 600;
	}

	.access-type-download {
		color: hsl(142 76% 36%);
		font-weight: 600;
	}

	.access-type-print {
		color: hsl(271 91% 65%);
		font-weight: 600;
	}

	.access-type-share {
		color: hsl(var(--destructive));
		font-weight: 600;
	}

	.empty-state {
		text-align: center;
		padding: 4rem 2rem;
		color: hsl(var(--muted-foreground));
	}

	.empty-icon {
		font-size: 4rem;
		margin-bottom: 1rem;
	}

	.empty-state h3 {
		font-size: 1.25rem;
		font-weight: 600;
		color: hsl(var(--foreground));
		margin: 0 0 0.5rem 0;
	}

	.empty-state p {
		font-size: 0.875rem;
		margin: 0;
	}

	.pagination {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 1rem;
		margin-top: 1rem;
		background: hsl(var(--muted));
		border-radius: var(--radius);
	}

	.pagination-info {
		font-size: 0.875rem;
		color: hsl(var(--foreground));
	}

	.pagination-controls {
		display: flex;
		gap: 0.25rem;
	}

	.page-button {
		min-width: 2.5rem;
		padding: 0.5rem 0.75rem;
		background: hsl(var(--background));
		color: hsl(var(--foreground));
		border: 1px solid hsl(var(--border));
		border-radius: var(--radius);
		font-size: 0.875rem;
		cursor: pointer;
		transition: all 0.2s;
	}

	.page-button:hover:not(:disabled) {
		background: hsl(var(--accent));
		border-color: hsl(var(--primary));
	}

	.page-button.active {
		background: hsl(var(--primary));
		color: hsl(var(--primary-foreground));
		border-color: hsl(var(--primary));
	}

	.page-button:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	@media (max-width: 768px) {
		.table-header,
		.table-row {
			grid-template-columns: 1fr;
			gap: 0.5rem;
		}

		.table-header {
			display: none;
		}
	}
</style>
