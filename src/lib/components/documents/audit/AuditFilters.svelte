<script lang="ts">
	interface Props {
		filterDocumentId: string;
		filterUserId: string;
		filterAccessType: string | null;
		filterDateFrom: string;
		filterDateTo: string;
		accessTypes: string[];
		onApply: () => void;
		onClear: () => void;
	}

	let {
		filterDocumentId = $bindable(),
		filterUserId = $bindable(),
		filterAccessType = $bindable(),
		filterDateFrom = $bindable(),
		filterDateTo = $bindable(),
		accessTypes,
		onApply,
		onClear
	}: Props = $props();
</script>

<div class="filters-card">
	<div class="filters-grid">
		<div class="filter-group">
			<label for="documentId">Document ID</label>
			<input
				id="documentId"
				type="text"
				placeholder="Filter by document ID..."
				bind:value={filterDocumentId}
			/>
		</div>

		<div class="filter-group">
			<label for="userId">User ID</label>
			<input id="userId" type="text" placeholder="Filter by user ID..." bind:value={filterUserId} />
		</div>

		<div class="filter-group">
			<label for="accessType">Access Type</label>
			<select id="accessType" bind:value={filterAccessType}>
				<option value={null}>All Types</option>
				{#each accessTypes as type}
					<option value={type}>{type}</option>
				{/each}
			</select>
		</div>

		<div class="filter-group">
			<label for="dateFrom">Date From</label>
			<input id="dateFrom" type="date" bind:value={filterDateFrom} />
		</div>

		<div class="filter-group">
			<label for="dateTo">Date To</label>
			<input id="dateTo" type="date" bind:value={filterDateTo} />
		</div>
	</div>

	<div class="filter-actions">
		<button class="clear-button" onclick={onClear}> Clear Filters </button>
		<button class="apply-button" onclick={onApply}> Apply Filters </button>
	</div>
</div>

<style>
	.filters-card {
		background: hsl(var(--card));
		border: 1px solid hsl(var(--border));
		border-radius: var(--radius);
		padding: 1.5rem;
		box-shadow: 0 1px 3px hsl(var(--foreground) / 0.1);
		margin-bottom: 2rem;
	}

	.filters-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
		gap: 1rem;
		margin-bottom: 1rem;
	}

	.filter-group {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.filter-group label {
		font-size: 0.875rem;
		font-weight: 500;
		color: hsl(var(--foreground));
	}

	.filter-group input,
	.filter-group select {
		padding: 0.5rem;
		border: 1px solid hsl(var(--border));
		border-radius: var(--radius);
		font-size: 0.875rem;
		background: hsl(var(--background));
		color: hsl(var(--foreground));
	}

	.filter-group input:focus,
	.filter-group select:focus {
		outline: none;
		border-color: hsl(var(--ring));
		box-shadow: 0 0 0 3px hsl(var(--ring) / 0.1);
	}

	.filter-actions {
		display: flex;
		gap: 1rem;
		justify-content: flex-end;
	}

	.clear-button,
	.apply-button {
		padding: 0.75rem 1.5rem;
		border: none;
		border-radius: 6px;
		font-size: 0.875rem;
		font-weight: 600;
		cursor: pointer;
		transition: all 0.2s;
	}

	.clear-button {
		background: hsl(var(--background));
		color: hsl(var(--foreground));
		border: 1px solid hsl(var(--border));
	}

	.clear-button:hover {
		background: hsl(var(--accent));
	}

	.apply-button {
		background: hsl(var(--primary));
		color: hsl(var(--primary-foreground));
	}

	.apply-button:hover {
		background: hsl(var(--primary) / 0.9);
	}

	@media (max-width: 768px) {
		.filters-grid {
			grid-template-columns: 1fr;
		}
	}
</style>
