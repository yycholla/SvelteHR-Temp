<!-- src/routes/dashboard/audit-log/_components/AuditLogFilters/AuditLogFilters.svelte -->
<script lang="ts">
	import type { FilterValues, AuditLogFiltersProps } from './filters.types';
	import * as Select from '$lib/components/ui/select';

	let {
		initialFilters = {},
		resourceTypes,
		onFilterChange,
		onClear
	}: AuditLogFiltersProps = $props();

	let filters = $state<FilterValues>(initialFilters);

	function isValidAction(value: string): value is 'CREATE' | 'READ' | 'UPDATE' | 'DELETE' {
		return ['CREATE', 'READ', 'UPDATE', 'DELETE'].includes(value);
	}

	function handleActionChange(value: string) {
		filters = {
			...filters,
			action: value === 'ALL' ? null : isValidAction(value) ? value : null
		};
		onFilterChange(filters);
	}
</script>

<div class="audit-log-filters space-y-4 p-4">
	<div class="filter-group">
		<label for="action-filter" class="block text-sm font-medium mb-2">Action Type</label>
		<Select.Root value={filters.action ?? 'ALL'} onValueChange={handleActionChange}>
			<Select.Trigger id="action-filter" class="w-full">
				<Select.Value placeholder="ALL" />
			</Select.Trigger>
			<Select.Content>
				<Select.Item value="ALL">ALL</Select.Item>
				<Select.Item value="CREATE">CREATE</Select.Item>
				<Select.Item value="READ">READ</Select.Item>
				<Select.Item value="UPDATE">UPDATE</Select.Item>
				<Select.Item value="DELETE">DELETE</Select.Item>
			</Select.Content>
		</Select.Root>
	</div>
</div>
