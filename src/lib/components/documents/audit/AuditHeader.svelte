<script lang="ts">
	interface Props {
		onExport: () => void;
	}

	let { onExport }: Props = $props();
</script>

<div class="page-header">
	<div class="header-content">
		<h1 class="page-title">Document Audit Log</h1>
		<p class="page-description">
			View all document access events with filtering and export capabilities
		</p>
	</div>

	<button class="export-button" onclick={onExport}> 📊 Export CSV </button>
</div>

<style>
	.page-header {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
		margin-bottom: 2rem;
		gap: 2rem;
	}

	.header-content {
		flex: 1;
	}

	.page-title {
		font-size: 2rem;
		font-weight: 700;
		color: hsl(var(--foreground));
		margin: 0 0 0.5rem 0;
	}

	.page-description {
		font-size: 1rem;
		color: hsl(var(--muted-foreground));
		margin: 0;
	}

	.export-button {
		padding: 0.75rem 1.5rem;
		background: hsl(142 76% 36%);
		color: white;
		border: none;
		border-radius: var(--radius);
		font-weight: 600;
		font-size: 0.875rem;
		cursor: pointer;
		transition: all 0.2s;
		white-space: nowrap;
	}

	.export-button:hover {
		background: hsl(142 71% 45%);
	}

	@media (max-width: 768px) {
		.page-header {
			flex-direction: column;
		}

		.export-button {
			width: 100%;
		}
	}
</style>
