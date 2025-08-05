<script lang="ts" module>
	import type { SelectOption, SearchableSelectProps } from "./select-searchable.svelte";
	
	export interface MultiSelectProps extends Omit<SearchableSelectProps, 'multiple' | 'value'> {
		value?: any[];
		maxSelections?: number;
		selectAllEnabled?: boolean;
		showSelectionCount?: boolean;
		tagVariant?: "default" | "secondary" | "outline";
		tagSize?: "sm" | "md";
		collapseTags?: boolean;
		collapseThreshold?: number;
		onSelectAll?: (options: SelectOption[]) => void;
		onClearAll?: () => void;
	}
</script>

<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import { cn } from "$lib/utils.js";
	import SelectSearchable from "./select-searchable.svelte";
	
	let {
		value = $bindable([]),
		maxSelections,
		selectAllEnabled = false,
		showSelectionCount = true,
		tagVariant = "default",
		tagSize = "sm",
		collapseTags = true,
		collapseThreshold = 3,
		onSelectAll,
		onClearAll,
		options = [],
		placeholder = "Select multiple options...",
		...restProps
	}: MultiSelectProps = $props();

	const dispatch = createEventDispatcher();

	let searchableRef: SelectSearchable;
	
	// Handle select all functionality
	function handleSelectAll() {
		const availableOptions = options.filter(opt => !opt.disabled);
		const newValue = availableOptions.map(opt => opt.value);
		value = newValue;
		onSelectAll?.(availableOptions);
		dispatch('selectAll', newValue);
	}

	// Handle clear all functionality  
	function handleClearAll() {
		value = [];
		onClearAll?.();
		dispatch('clearAll');
	}

	// Check if all available options are selected
	let allSelected = $derived(options.filter(opt => !opt.disabled).every(opt => value.includes(opt.value)));
	let someSelected = $derived(value.length > 0);

	// Get tag classes based on variant and size
	let tagClasses = $derived(cn(
		"inline-flex items-center gap-1 rounded font-medium transition-colors",
		// Size variants
		tagSize === "sm" ? "px-2 py-0.5 text-xs" : "px-2.5 py-1 text-sm",
		// Color variants
		tagVariant === "default" && "bg-primary-100 text-primary-800 hover:bg-primary-200",
		tagVariant === "secondary" && "bg-secondary-100 text-secondary-800 hover:bg-secondary-200", 
		tagVariant === "outline" && "border border-secondary-300 bg-transparent text-secondary-700 hover:bg-secondary-50"
	));

	// Custom placeholder that shows selection count
	let customPlaceholder = $derived((() => {
		if (value.length === 0) return placeholder;
		if (showSelectionCount) {
			return `${value.length} option${value.length === 1 ? '' : 's'} selected`;
		}
		return placeholder;
	})());

	// Enhanced options with select all option
	let enhancedOptions = $derived(selectAllEnabled ? [
		{
			value: '__select_all__',
			label: allSelected ? 'Deselect All' : 'Select All',
			group: '_controls'
		},
		...options
	] : options);

	function handleSelectionChange(newValue: any) {
		if (newValue === '__select_all__') {
			if (allSelected) {
				handleClearAll();
			} else {
				handleSelectAll();
			}
			return;
		}
		
		// Handle normal selection
		value = Array.isArray(newValue) ? newValue : [];
		dispatch('change', value);
	}
</script>

<div class="w-full space-y-2">
	<!-- Multi-select with custom trigger content -->
	<SelectSearchable
		bind:this={searchableRef}
		bind:value
		options={enhancedOptions}
		multiple={true}
		placeholder={customPlaceholder}
		onSelectionChange={handleSelectionChange}
		{...restProps}
	>
		<!-- Custom trigger slot with tags -->
		<div class="flex items-center justify-between w-full">
			<div class="flex items-center flex-1 min-w-0">
				{#if value.length === 0}
					<span class="text-secondary-500">{placeholder}</span>
				{:else if collapseTags && value.length > collapseThreshold}
					<div class="flex items-center gap-1">
						{#each value.slice(0, collapseThreshold - 1) as selectedValue}
							{@const option = options.find(opt => opt.value === selectedValue)}
							{#if option}
								<span class={tagClasses}>
									{option.label}
									<button
										type="button"
										class="ml-1 hover:text-current/70"
										onclick={(e) => {
											e.stopPropagation();
											value = value.filter(v => v !== selectedValue);
											dispatch('change', value);
										}}
									>
										<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
											<path d="M18 6L6 18M6 6l12 12"/>
										</svg>
									</button>
								</span>
							{/if}
						{/each}
						<span class={cn(tagClasses, "bg-secondary-200 text-secondary-700")}>
							+{value.length - (collapseThreshold - 1)} more
						</span>
					</div>
				{:else}
					<div class="flex flex-wrap gap-1">
						{#each value as selectedValue}
							{@const option = options.find(opt => opt.value === selectedValue)}
							{#if option}
								<span class={tagClasses}>
									{option.label}
									<button
										type="button"
										class="ml-1 hover:text-current/70"
										onclick={(e) => {
											e.stopPropagation();
											value = value.filter(v => v !== selectedValue);
											dispatch('change', value);
										}}
									>
										<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
											<path d="M18 6L6 18M6 6l12 12"/>
										</svg>
									</button>
								</span>
							{/if}
						{/each}
					</div>
				{/if}
			</div>
		</div>
	</SelectSearchable>

	<!-- Selection summary -->
	{#if showSelectionCount && value.length > 0}
		<div class="flex items-center justify-between text-xs text-secondary-600">
			<span>
				{value.length} of {options.filter(opt => !opt.disabled).length} selected
				{#if maxSelections}
					(max {maxSelections})
				{/if}
			</span>
			
			<div class="flex items-center gap-2">
				{#if selectAllEnabled}
					<button
						type="button"
						class="text-primary-600 hover:text-primary-700 font-medium"
						onclick={allSelected ? handleClearAll : handleSelectAll}
					>
						{allSelected ? 'Deselect All' : 'Select All'}
					</button>
				{/if}
				
				{#if value.length > 0}
					<button
						type="button"
						class="text-secondary-500 hover:text-secondary-700"
						onclick={handleClearAll}
					>
						Clear
					</button>
				{/if}
			</div>
		</div>
	{/if}
</div>

<style>
	/* Custom scrollbar for dropdown */
	:global(.select-dropdown) {
		scrollbar-width: thin;
		scrollbar-color: theme('colors.secondary.300') transparent;
	}
	
	:global(.select-dropdown::-webkit-scrollbar) {
		width: 6px;
	}
	
	:global(.select-dropdown::-webkit-scrollbar-track) {
		background: transparent;
	}
	
	:global(.select-dropdown::-webkit-scrollbar-thumb) {
		background-color: theme('colors.secondary.300');
		border-radius: 3px;
	}
	
	:global(.select-dropdown::-webkit-scrollbar-thumb:hover) {
		background-color: theme('colors.secondary.400');
	}
</style>