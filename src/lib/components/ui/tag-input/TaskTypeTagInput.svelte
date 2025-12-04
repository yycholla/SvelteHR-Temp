<!--
  TaskTypeTagInput Component
  Multi-select input for task types with ability to create new ones on the fly

  Features:
  - Type to search and filter existing task types
  - Create new task types inline when no match is found
  - Selected items shown as colored badges
  - Keyboard navigation (Arrow keys, Enter, Backspace)
  - Single selection mode (maxSelections=1)
-->

<script lang="ts">
	import { Plus, X } from '@lucide/svelte';
	import { Badge } from '$lib/components/ui/badge';
	import { createUrqlClient } from '$lib/graphql/client';
	import { CREATE_TASK_TYPE } from '$lib/graphql/tasks-operations';
	import type { TaskType } from '$lib/types/task';

	interface Props {
		taskTypes: TaskType[]; // Available task types
		selected?: string; // Selected task type ID (single selection)
		placeholder?: string;
		disabled?: boolean;
		onSelectedChange?: (selected: string) => void;
		onCreate?: (newTaskType: TaskType) => void;
	}

	let {
		taskTypes = [],
		selected = $bindable(''),
		placeholder = 'Select or create task type...',
		disabled = false,
		onSelectedChange,
		onCreate
	}: Props = $props();

	// Internal state
	let searchTerm = $state('');
	let isOpen = $state(false);
	let highlightedIndex = $state(0);
	let inputElement = $state<HTMLInputElement>();
	let dropdownElement = $state<HTMLDivElement>();
	let isCreating = $state(false);
	let createError = $state('');

	// Filtered task types based on search
	const filteredTaskTypes = $derived.by(() => {
		const searchLower = searchTerm.toLowerCase();
		const filtered = taskTypes.filter((tt) => {
			// Exclude already selected
			if (selected === tt.id) return false;

			// Filter by search term
			if (!searchTerm) return true;
			return tt.name.toLowerCase().includes(searchLower);
		});

		// Debug logging
		console.log('[TaskTypeTagInput] Filtering:', {
			totalTaskTypes: taskTypes.length,
			taskTypesArray: taskTypes,
			selected,
			selectedType: typeof selected,
			searchTerm,
			filteredCount: filtered.length,
			filteredItems: filtered,
			isOpen
		});

		return filtered;
	});

	// Selected task type for display
	const selectedTaskType = $derived(taskTypes.find((tt) => tt.id === selected));

	// Check if search term could be a new task type name
	const canCreateNew = $derived.by(() => {
		if (!searchTerm || searchTerm.trim().length < 2) return false;

		// Check if exact match exists
		const exactMatch = taskTypes.some((tt) => tt.name.toLowerCase() === searchTerm.toLowerCase());

		return !exactMatch;
	});

	// Handle task type selection
	function selectTaskType(taskType: TaskType) {
		selected = taskType.id;
		searchTerm = '';
		highlightedIndex = 0;
		isOpen = false;
		createError = '';

		// Call callback
		onSelectedChange?.(selected);

		// Focus back on input
		inputElement?.focus();
	}

	// Handle creating a new task type
	async function createNewTaskType() {
		const name = searchTerm.trim();

		if (name.length < 2) {
			createError = 'Name must be at least 2 characters';
			return;
		}

		isCreating = true;
		createError = '';

		try {
			const client = createUrqlClient();

			const result = await client.mutation(CREATE_TASK_TYPE, {
				input: {
					name,
					description: `Task type created from task form`,
					defaultPriority: 'Medium',
					colorCode: '#3B82F6'
				}
			});

			const newTaskType = result.data?.createTaskType;

			if (newTaskType) {
				// Add to task types list
				taskTypes = [...taskTypes, newTaskType];

				// Select the newly created task type
				selected = newTaskType.id;
				searchTerm = '';
				isOpen = false;

				// Call callbacks
				onSelectedChange?.(selected);
				onCreate?.(newTaskType);
			}
		} catch (error) {
			console.error('Failed to create task type:', error);
			createError = 'Failed to create task type';
		} finally {
			isCreating = false;
		}
	}

	// Handle removing selection
	function removeSelected() {
		selected = '';
		onSelectedChange?.('');
		inputElement?.focus();
	}

	// Handle keyboard navigation
	function handleKeyDown(e: KeyboardEvent) {
		if (disabled || isCreating) return;

		const filtered = filteredTaskTypes;
		const totalOptions = filtered.length + (canCreateNew ? 1 : 0);

		switch (e.key) {
			case 'ArrowDown':
				e.preventDefault();
				if (isOpen && totalOptions > 0) {
					highlightedIndex = Math.min(highlightedIndex + 1, totalOptions - 1);
					scrollToHighlighted();
				} else {
					isOpen = true;
				}
				break;

			case 'ArrowUp':
				e.preventDefault();
				if (isOpen && totalOptions > 0) {
					highlightedIndex = Math.max(highlightedIndex - 1, 0);
					scrollToHighlighted();
				}
				break;

			case 'Enter':
				e.preventDefault();
				if (isOpen && totalOptions > 0) {
					if (highlightedIndex < filtered.length) {
						// Select existing task type
						selectTaskType(filtered[highlightedIndex]);
					} else if (canCreateNew) {
						// Create new task type
						createNewTaskType();
					}
				}
				break;

			case 'Escape':
				e.preventDefault();
				isOpen = false;
				searchTerm = '';
				createError = '';
				break;

			case 'Backspace':
				if (searchTerm === '' && selected) {
					// Remove selected item
					removeSelected();
				}
				break;
		}
	}

	// Scroll highlighted item into view
	function scrollToHighlighted() {
		const items = dropdownElement?.querySelectorAll('[data-option]');
		const highlightedItem = items?.[highlightedIndex];
		if (highlightedItem) {
			highlightedItem.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
		}
	}

	// Handle input focus
	function handleFocus() {
		if (!disabled) {
			console.log('[TaskTypeTagInput] Focus - opening dropdown', {
				taskTypesCount: taskTypes.length,
				selected,
				disabled
			});
			isOpen = true;
		}
	}

	// Handle input blur (with delay to allow clicking dropdown)
	function handleBlur() {
		setTimeout(() => {
			isOpen = false;
			searchTerm = '';
			createError = '';
		}, 200);
	}

	// Handle search input
	function handleInput() {
		isOpen = true;
		highlightedIndex = 0;
		createError = '';
	}

	// Click outside handler
	function handleClickOutside(e: MouseEvent) {
		const target = e.target as HTMLElement;
		if (!target.closest('.task-type-tag-input-container')) {
			isOpen = false;
			searchTerm = '';
			createError = '';
		}
	}

	// Debug: Track taskTypes prop changes
	$effect(() => {
		console.log('[TaskTypeTagInput] taskTypes prop changed:', {
			count: taskTypes.length,
			taskTypes,
			selected
		});
	});

	// Mount/unmount click outside listener
	$effect(() => {
		if (isOpen) {
			document.addEventListener('click', handleClickOutside);
			return () => document.removeEventListener('click', handleClickOutside);
		}
	});
</script>

<div class="task-type-tag-input-container relative">
	<!-- Input container with selected badge -->
	<div
		class="flex min-h-10 w-full flex-wrap gap-1 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 {disabled
			? 'cursor-not-allowed opacity-50'
			: ''}"
		role="button"
		tabindex="0"
		onclick={() => {
			console.log('[TaskTypeTagInput] Outer div clicked, focusing input');
			inputElement?.focus();
		}}
		onkeydown={(e) => {
			if (e.key === 'Enter' || e.key === ' ') {
				e.preventDefault();
				inputElement?.focus();
			}
		}}
	>
		<!-- Selected task type badge -->
		{#if selectedTaskType}
			<Badge
				variant="secondary"
				class="flex items-center gap-1 pl-2 pr-1"
				style="background-color: {selectedTaskType.colorCode}20; color: {selectedTaskType.colorCode};"
			>
				<span>{selectedTaskType.name}</span>
				<button
					type="button"
					class="ml-1 rounded-sm hover:bg-secondary-foreground/20"
					onclick={(e) => {
						e.stopPropagation();
						removeSelected();
					}}
					{disabled}
				>
					<X class="h-3 w-3" />
				</button>
			</Badge>
		{/if}

		<!-- Search input -->
		<input
			bind:this={inputElement}
			bind:value={searchTerm}
			type="text"
			class="flex-1 bg-transparent outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed min-w-[120px]"
			placeholder={!selected ? placeholder : ''}
			{disabled}
			onfocus={handleFocus}
			onblur={handleBlur}
			oninput={handleInput}
			onkeydown={handleKeyDown}
		/>

		{#if isCreating}
			<span class="text-xs text-muted-foreground self-center">Creating...</span>
		{/if}
	</div>

	<!-- Error message -->
	{#if createError}
		<div class="mt-1 text-xs text-destructive">{createError}</div>
	{/if}

	<!-- Dropdown with filtered options -->
	{#if isOpen && (filteredTaskTypes.length > 0 || canCreateNew)}
		{console.log('[TaskTypeTagInput] Rendering dropdown:', {
			isOpen,
			filteredCount: filteredTaskTypes.length,
			canCreateNew,
			filteredTaskTypes
		})}
		<div
			bind:this={dropdownElement}
			class="absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-md border bg-popover p-1 shadow-md"
		>
			<!-- Existing task types -->
			{#each filteredTaskTypes as taskType, index (taskType.id)}
				{console.log('[TaskTypeTagInput] Rendering option:', taskType.name)}
				<button
					type="button"
					data-option
					class="flex w-full items-center gap-2 rounded-sm px-2 py-2 text-sm outline-none hover:bg-accent hover:text-accent-foreground {index ===
					highlightedIndex
						? 'bg-accent text-accent-foreground'
						: ''}"
					onclick={() => selectTaskType(taskType)}
					onmouseenter={() => (highlightedIndex = index)}
				>
					<div
						class="h-3 w-3 rounded-full border"
						style="background-color: {taskType.colorCode}"
					></div>
					<span class="flex-1 text-left">{taskType.name}</span>
					{#if taskType.defaultPriority}
						<span class="text-xs text-muted-foreground">{taskType.defaultPriority}</span>
					{/if}
				</button>
			{/each}

			<!-- Create new option -->
			{#if canCreateNew}
				<button
					type="button"
					data-option
					class="flex w-full items-center gap-2 rounded-sm px-2 py-2 text-sm outline-none hover:bg-accent hover:text-accent-foreground border-t {filteredTaskTypes.length +
						0 ===
					highlightedIndex
						? 'bg-accent text-accent-foreground'
						: ''}"
					onclick={createNewTaskType}
					onmouseenter={() => (highlightedIndex = filteredTaskTypes.length)}
					disabled={isCreating}
				>
					<Plus class="h-4 w-4 text-primary" />
					<span class="flex-1 text-left font-medium text-primary">
						Create "{searchTerm}"
					</span>
				</button>
			{/if}
		</div>
	{:else}
		{console.log('[TaskTypeTagInput] Dropdown NOT rendering:', {
			isOpen,
			filteredCount: filteredTaskTypes.length,
			canCreateNew,
			condition: `isOpen: ${isOpen}, filteredCount: ${filteredTaskTypes.length}, canCreateNew: ${canCreateNew}`
		})}
	{/if}

	<!-- Helper text when dropdown is open but no matches and can't create -->
	{#if isOpen && searchTerm && filteredTaskTypes.length === 0 && !canCreateNew}
		<div
			class="absolute z-50 mt-1 w-full rounded-md border bg-popover p-4 text-center text-sm text-muted-foreground shadow-md"
		>
			Type at least 2 characters to create a new task type
		</div>
	{/if}
</div>

<style>
	/* Custom scrollbar for dropdown */
	.task-type-tag-input-container [data-option] {
		scroll-margin: 8px;
	}
</style>
