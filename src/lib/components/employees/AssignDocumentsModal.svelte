<script lang="ts">
	// AssignDocumentsModal component
	// Modal for assigning documents to an employee

	interface Document {
		id: string;
		filename: string;
		category: string;
		sensitivityLevel: string;
		uploadedAt: string;
		uploadedByEmail: string;
	}

	interface Props {
		isOpen?: boolean;
		employeeId: string;
		employeeName: string;
		availableDocuments?: Document[];
		onAssign?: (documentIds: string[]) => void;
		onClose?: () => void;
		isSubmitting?: boolean;
	}

	const {
		isOpen = false,
		employeeId,
		employeeName,
		availableDocuments = [],
		onAssign = () => {},
		onClose = () => {},
		isSubmitting = false
	}: Props = $props();

	// Svelte 5 state
	let selectedDocuments = $state<string[]>([]);
	let searchQuery = $state('');

	// Derived state
	const filteredDocuments = $derived(
		availableDocuments.filter(
			(doc) =>
				doc.filename.toLowerCase().includes(searchQuery.toLowerCase()) ||
				doc.category.toLowerCase().includes(searchQuery.toLowerCase())
		)
	);

	const hasSelections = $derived(selectedDocuments.length > 0);
	const canSubmit = $derived(hasSelections && !isSubmitting);

	// Handle selection toggle
	function toggleSelection(documentId: string) {
		if (selectedDocuments.includes(documentId)) {
			selectedDocuments = selectedDocuments.filter((id) => id !== documentId);
		} else {
			selectedDocuments = [...selectedDocuments, documentId];
		}
	}

	// Handle submit
	function handleSubmit() {
		onAssign(selectedDocuments);
	}

	// Reset selections when modal closes
	function handleClose() {
		selectedDocuments = [];
		searchQuery = '';
		onClose();
	}

	// Handle escape key
	function handleKeydown(event: KeyboardEvent) {
		if (event.key === 'Escape' && isOpen) {
			handleClose();
		}
	}

	// Sensitivity badge colors
	function getSensitivityClass(level: string): string {
		const classes: Record<string, string> = {
			Public: 'bg-green-100 text-green-800',
			Internal: 'bg-blue-100 text-blue-800',
			Confidential: 'bg-yellow-100 text-yellow-800',
			'Sensitive-PII': 'bg-red-100 text-red-800'
		};
		return classes[level] || 'bg-gray-100 text-gray-800';
	}
</script>

<svelte:window onkeydown={handleKeydown} />

{#if isOpen}
	<div class="modal-backdrop">
		<div class="modal">
			<!-- Modal header -->
			<div class="modal-header">
				<div class="header-content">
					<h2 class="modal-title">Assign Documents to Employee</h2>
					<p class="employee-name">{employeeName}</p>
				</div>
				<button class="close-button" onclick={handleClose} title="Close"> ✕ </button>
			</div>

			<!-- Search -->
			<div class="search-bar">
				<input
					type="text"
					placeholder="Search documents by filename or category..."
					bind:value={searchQuery}
					class="search-input"
				/>
			</div>

			<!-- Selection list -->
			<div class="selection-list">
				{#each filteredDocuments as document (document.id)}
					{@const isSelected = selectedDocuments.includes(document.id)}
					<label class="selection-item">
						<input
							type="checkbox"
							checked={isSelected}
							onchange={() => toggleSelection(document.id)}
						/>
						<div class="item-content">
							<div class="item-header">
								<span class="item-name">{document.filename}</span>
								<span class="sensitivity-badge {getSensitivityClass(document.sensitivityLevel)}">
									{document.sensitivityLevel}
								</span>
							</div>
							<div class="item-details">
								<span class="item-detail">Category: {document.category}</span>
								<span class="item-separator">•</span>
								<span class="item-detail"
									>Uploaded: {new Date(document.uploadedAt).toLocaleDateString()}</span
								>
								{#if document.uploadedByEmail}
									<span class="item-separator">•</span>
									<span class="item-detail">By: {document.uploadedByEmail}</span>
								{/if}
							</div>
						</div>
					</label>
				{/each}

				{#if filteredDocuments.length === 0}
					<div class="empty-state">
						<p>No available documents found</p>
					</div>
				{/if}
			</div>

			<!-- Modal footer -->
			<div class="modal-footer">
				<div class="selection-summary">
					{#if hasSelections}
						<span class="summary-text">
							{selectedDocuments.length} document{selectedDocuments.length !== 1 ? 's' : ''} selected
						</span>
					{:else}
						<span class="summary-text">No documents selected</span>
					{/if}
				</div>

				<div class="footer-actions">
					<button class="cancel-button" onclick={handleClose} disabled={isSubmitting}>
						Cancel
					</button>
					<button class="assign-button" onclick={handleSubmit} disabled={!canSubmit}>
						{isSubmitting ? 'Assigning...' : 'Assign Documents'}
					</button>
				</div>
			</div>
		</div>
	</div>
{/if}

<style>
	.modal-backdrop {
		position: fixed;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		background: rgba(0, 0, 0, 0.5);
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 1000;
		padding: 1rem;
	}

	.modal {
		width: 100%;
		max-width: 700px;
		max-height: 90vh;
		background: white;
		border-radius: 8px;
		display: flex;
		flex-direction: column;
		box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
	}

	.modal-header {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
		padding: 1.5rem;
		border-bottom: 1px solid #e2e8f0;
	}

	.header-content {
		flex: 1;
	}

	.modal-title {
		font-size: 1.25rem;
		font-weight: 600;
		color: #2d3748;
		margin: 0 0 0.25rem 0;
	}

	.employee-name {
		font-size: 0.875rem;
		color: #718096;
		margin: 0;
	}

	.close-button {
		background: none;
		border: none;
		font-size: 1.5rem;
		color: #718096;
		cursor: pointer;
		padding: 0.25rem;
		line-height: 1;
	}

	.close-button:hover {
		color: #2d3748;
	}

	.search-bar {
		padding: 1rem 1.5rem;
		border-bottom: 1px solid #e2e8f0;
	}

	.search-input {
		width: 100%;
		padding: 0.75rem;
		border: 1px solid #cbd5e0;
		border-radius: 4px;
		font-size: 0.875rem;
	}

	.search-input:focus {
		outline: none;
		border-color: #4299e1;
		box-shadow: 0 0 0 3px rgba(66, 153, 225, 0.1);
	}

	.selection-list {
		flex: 1;
		overflow-y: auto;
		padding: 1rem 1.5rem;
		max-height: 400px;
	}

	.selection-item {
		display: flex;
		align-items: flex-start;
		gap: 0.75rem;
		padding: 1rem;
		border: 1px solid #e2e8f0;
		border-radius: 4px;
		margin-bottom: 0.75rem;
		cursor: pointer;
		transition: all 0.2s;
	}

	.selection-item:hover {
		background: #f7fafc;
		border-color: #cbd5e0;
	}

	.selection-item input[type='checkbox'] {
		cursor: pointer;
		margin-top: 0.25rem;
	}

	.item-content {
		flex: 1;
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.item-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.75rem;
	}

	.item-name {
		font-weight: 600;
		color: #2d3748;
		font-size: 0.875rem;
		flex: 1;
		word-break: break-word;
	}

	.sensitivity-badge {
		padding: 0.25rem 0.75rem;
		border-radius: 9999px;
		font-size: 0.75rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		white-space: nowrap;
	}

	.item-details {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		flex-wrap: wrap;
		font-size: 0.75rem;
		color: #718096;
	}

	.item-detail {
		white-space: nowrap;
	}

	.item-separator {
		color: #cbd5e0;
	}

	.empty-state {
		text-align: center;
		padding: 3rem 1rem;
		color: #a0aec0;
	}

	.empty-state p {
		margin: 0;
		font-size: 0.875rem;
	}

	.modal-footer {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 1rem 1.5rem;
		border-top: 1px solid #e2e8f0;
	}

	.selection-summary {
		font-size: 0.875rem;
		color: #4a5568;
	}

	.footer-actions {
		display: flex;
		gap: 0.75rem;
	}

	.cancel-button,
	.assign-button {
		padding: 0.75rem 1.5rem;
		border: none;
		border-radius: 4px;
		font-size: 0.875rem;
		font-weight: 600;
		cursor: pointer;
		transition: all 0.2s;
	}

	.cancel-button {
		background: white;
		color: #4a5568;
		border: 1px solid #cbd5e0;
	}

	.cancel-button:hover:not(:disabled) {
		background: #f7fafc;
	}

	.assign-button {
		background: #4299e1;
		color: white;
	}

	.assign-button:hover:not(:disabled) {
		background: #3182ce;
	}

	.cancel-button:disabled,
	.assign-button:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}
</style>
