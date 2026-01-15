<script lang="ts">
	import RoleGuard from '$lib/components/auth/RoleGuard.svelte';

	interface Props {
		totalCount: number;
		selectedCount: number;
		viewMode: 'grid' | 'list';
		showAddButton: boolean;
		loading: boolean;
		onClearSelection: () => void;
		onRefresh: () => void;
	}

	let {
		totalCount,
		selectedCount,
		viewMode = $bindable(),
		showAddButton,
		loading,
		onClearSelection,
		onRefresh
	}: Props = $props();
</script>

<div class="header">
	<div class="title-section">
		<h2 class="title">
			Employees
			{#if totalCount > 0}
				<span class="count">({totalCount})</span>
			{/if}
		</h2>

		{#if selectedCount > 0}
			<div class="selection-info">
				<span>{selectedCount} selected</span>
				<button class="clear-selection" onclick={onClearSelection}> Clear </button>
			</div>
		{/if}
	</div>

	<div class="actions">
		<!-- View mode toggle -->
		<div class="view-toggle">
			<button
				class="view-btn"
				class:active={viewMode === 'grid'}
				onclick={() => (viewMode = 'grid')}
				title="Grid view"
				aria-label="Switch to grid view"
			>
				<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
					<path
						d="M1 2.5A1.5 1.5 0 0 1 2.5 1h3A1.5 1.5 0 0 1 7 2.5v3A1.5 1.5 0 0 1 5.5 7h-3A1.5 1.5 0 0 1 1 5.5v-3zM2.5 2a.5.5 0 0 0-.5.5v3a.5.5 0 0 0 .5.5h3a.5.5 0 0 0 .5-.5v-3a.5.5 0 0 0-.5-.5h-3zm6.5.5A1.5 1.5 0 0 1 10.5 1h3A1.5 1.5 0 0 1 15 2.5v3A1.5 1.5 0 0 1 13.5 7h-3A1.5 1.5 0 0 1 9 5.5v-3zm1.5-.5a.5.5 0 0 0-.5.5v3a.5.5 0 0 0 .5.5h3a.5.5 0 0 0 .5-.5v-3a.5.5 0 0 0-.5-.5h-3zM1 10.5A1.5 1.5 0 0 1 2.5 9h3A1.5 1.5 0 0 1 7 10.5v3A1.5 1.5 0 0 1 5.5 15h-3A1.5 1.5 0 0 1 1 13.5v-3zm1.5-.5a.5.5 0 0 0-.5.5v3a.5.5 0 0 0 .5.5h3a.5.5 0 0 0 .5-.5v-3a.5.5 0 0 0-.5-.5h-3zm6.5.5A1.5 1.5 0 0 1 10.5 9h3a1.5 1.5 0 0 1 1.5 1.5v3a1.5 1.5 0 0 1-1.5 1.5h-3A1.5 1.5 0 0 1 9 13.5v-3zm1.5-.5a.5.5 0 0 0-.5.5v3a.5.5 0 0 0 .5.5h3a.5.5 0 0 0 .5-.5v-3a.5.5 0 0 0-.5-.5h-3z"
					/>
				</svg>
			</button>
			<button
				class="view-btn"
				class:active={viewMode === 'list'}
				onclick={() => (viewMode = 'list')}
				title="List view"
				aria-label="Switch to list view"
			>
				<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
					<path
						d="M1 2.5A.5.5 0 0 1 1.5 2h13a.5.5 0 0 1 0 1h-13a.5.5 0 0 1-.5-.5zm0 3A.5.5 0 0 1 1.5 5h13a.5.5 0 0 1 0 1h-13a.5.5 0 0 1-.5-.5zm0 3A.5.5 0 0 1 1.5 8h13a.5.5 0 0 1 0 1h-13a.5.5 0 0 1-.5-.5zm0 3a.5.5 0 0 1 .5-.5h13a.5.5 0 0 1 0 1h-13a.5.5 0 0 1-.5-.5z"
					/>
				</svg>
			</button>
		</div>

		<!-- Add employee button -->
		{#if showAddButton}
			<RoleGuard permissions={['hr:manage', 'admin:*']}>
				<button class="btn-primary add-btn">
					<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
						<path
							d="M8 0a.5.5 0 0 1 .5.5v7h7a.5.5 0 0 1 0 1h-7v7a.5.5 0 0 1-1 0v-7h-7a.5.5 0 0 1 0-1h7v-7A.5.5 0 0 1 8 0z"
						/>
					</svg>
					Add Employee
				</button>
			</RoleGuard>
		{/if}

		<!-- Refresh button -->
		<button
			class="btn-secondary refresh-btn"
			onclick={onRefresh}
			disabled={loading}
			title="Refresh data"
			aria-label="Refresh employee data"
		>
			<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" class:spinning={loading}>
				<path
					d="M11.534 7h3.932a.25.25 0 0 1 .192.41l-1.966 2.36a.25.25 0 0 1-.384 0l-1.966-2.36a.25.25 0 0 1 .192-.41zm-11 2h3.932a.25.25 0 0 0 .192-.41L2.692 6.23a.25.25 0 0 0-.384 0L.342 8.59A.25.25 0 0 0 .534 9z"
				/>
				<path
					fill-rule="evenodd"
					d="M8 3c-1.552 0-2.94.707-3.857 1.818a.5.5 0 1 1-.771-.636A6.002 6.002 0 0 1 13.917 7H12.9A5.002 5.002 0 0 0 8 3zM3.1 9a5.002 5.002 0 0 0 8.757 2.182.5.5 0 1 1 .771.636A6.002 6.002 0 0 1 2.083 9H3.1z"
				/>
			</svg>
		</button>
	</div>
</div>

<style>
	.header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 1rem;
		flex-wrap: wrap;
	}

	.title-section {
		display: flex;
		align-items: center;
		gap: 1rem;
	}

	.title {
		margin: 0;
		font-size: var(--cds-productive-heading-03-font-size);
		font-weight: var(--cds-productive-heading-03-font-weight);
		line-height: var(--cds-productive-heading-03-line-height);
		letter-spacing: var(--cds-productive-heading-03-letter-spacing);
		color: var(--cds-text-primary);
	}

	.count {
		font-size: var(--cds-body-compact-01-font-size);
		font-weight: var(--cds-body-compact-01-font-weight);
		line-height: var(--cds-body-compact-01-line-height);
		letter-spacing: var(--cds-body-compact-01-letter-spacing);
		color: var(--cds-text-secondary);
	}

	.actions {
		display: flex;
		align-items: center;
		gap: 0.75rem;
	}

	.view-toggle {
		display: flex;
		background-color: #f3f4f6;
		border-radius: 0.375rem;
		padding: var(--cds-spacing-02);
	}

	.view-btn {
		padding: var(--cds-spacing-04);
		background: none;
		border: none;
		border-radius: 0.25rem;
		cursor: pointer;
		color: #6b7280;
		transition: all 0.15s;
	}

	.view-btn:hover {
		color: #111827;
	}

	.view-btn.active {
		background-color: white;
		color: #111827;
		box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
	}

	.btn-primary,
	.btn-secondary {
		display: inline-flex;
		align-items: center;
		gap: 0.5rem;
		padding: var(--cds-spacing-05) var(--cds-spacing-06);
		border-radius: 0.375rem;
		font-size: var(--cds-body-compact-01-font-size);
		font-weight: var(--cds-body-compact-01-font-weight);
		line-height: var(--cds-body-compact-01-line-height);
		letter-spacing: var(--cds-body-compact-01-letter-spacing);
		border: 1px solid transparent;
		cursor: pointer;
		transition: all 0.15s;
	}

	.btn-primary {
		background-color: #3b82f6;
		color: white;
	}

	.btn-primary:hover {
		background-color: #2563eb;
	}

	.btn-secondary {
		background-color: white;
		color: #374151;
		border-color: #d1d5db;
	}

	.btn-secondary:hover {
		background-color: #f9fafb;
	}

	.btn-secondary:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}

	.spinning {
		animation: spin 1s linear infinite;
	}

	@keyframes spin {
		from {
			transform: rotate(0deg);
		}
		to {
			transform: rotate(360deg);
		}
	}

	@media (max-width: 768px) {
		.header {
			flex-direction: column;
			align-items: stretch;
		}

		.actions {
			justify-content: space-between;
		}
	}
</style>
