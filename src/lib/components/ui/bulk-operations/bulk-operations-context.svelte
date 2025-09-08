<script lang="ts" context="module">
	import { getContext, setContext } from 'svelte';

	export interface BulkOperationsState {
		selectedItems: Set<string>;
		isProcessing: boolean;
		progress: number;
		progressMessage: string;
		totalItems: number;
	}

	export interface BulkOperationsActions {
		selectItem: (id: string) => void;
		deselectItem: (id: string) => void;
		selectAll: () => void;
		clearSelection: () => void;
		toggleItem: (id: string) => void;
		isSelected: (id: string) => boolean;
		setProcessing: (processing: boolean, progress?: number, message?: string) => void;
		setTotalItems: (total: number) => void;
	}

	export type BulkOperationsContextType = BulkOperationsState & BulkOperationsActions;

	const BULK_OPERATIONS_KEY = Symbol('bulk-operations');

	export function getBulkOperationsContext(): BulkOperationsContextType {
		const context = getContext<BulkOperationsContextType>(BULK_OPERATIONS_KEY);
		if (!context) {
			throw new Error('useBulkOperations must be used within a BulkOperationsProvider');
		}
		return context;
	}

	export function setBulkOperationsContext(context: BulkOperationsContextType) {
		setContext(BULK_OPERATIONS_KEY, context);
	}
</script>

<script lang="ts">
	interface BulkOperationsProviderProps {
		onSelectionChange?: (selectedItems: string[]) => void;
		children: any;
	}

	let { onSelectionChange, children }: BulkOperationsProviderProps = $props();

	// State
	let selectedItems = $state(new Set<string>());
	let isProcessing = $state(false);
	let progress = $state(0);
	let progressMessage = $state('');
	let totalItems = $state(0);

	// Actions
	function selectItem(id: string) {
		selectedItems.add(id);
		selectedItems = new Set(selectedItems); // Trigger reactivity
		onSelectionChange?.(Array.from(selectedItems));
	}

	function deselectItem(id: string) {
		selectedItems.delete(id);
		selectedItems = new Set(selectedItems); // Trigger reactivity
		onSelectionChange?.(Array.from(selectedItems));
	}

	function selectAll() {
		// This would typically be called with all available item IDs
		// For now, we'll leave it as a placeholder that should be implemented by the parent
		console.warn('selectAll should be implemented by the parent component');
	}

	function clearSelection() {
		selectedItems.clear();
		selectedItems = new Set(selectedItems); // Trigger reactivity
		onSelectionChange?.(Array.from(selectedItems));
	}

	function toggleItem(id: string) {
		if (selectedItems.has(id)) {
			deselectItem(id);
		} else {
			selectItem(id);
		}
	}

	function isSelected(id: string): boolean {
		return selectedItems.has(id);
	}

	function setProcessing(processing: boolean, newProgress = 0, message = '') {
		isProcessing = processing;
		progress = newProgress;
		progressMessage = message;
	}

	function setTotalItems(total: number) {
		totalItems = total;
	}

	// Create context value
	const contextValue: BulkOperationsContextType = {
		// State
		selectedItems,
		isProcessing,
		progress,
		progressMessage,
		totalItems,

		// Actions
		selectItem,
		deselectItem,
		selectAll,
		clearSelection,
		toggleItem,
		isSelected,
		setProcessing,
		setTotalItems
	};

	// Set context
	setBulkOperationsContext(contextValue);
</script>

{@render children()}

<style>
	/* Any global styles for bulk operations can go here */
</style>
