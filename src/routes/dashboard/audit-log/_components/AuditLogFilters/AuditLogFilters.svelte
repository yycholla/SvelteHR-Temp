<script lang="ts">
	import type { FilterValues, AuditLogFiltersProps } from './filters.types';

	let {
		initialFilters = {},
		resourceTypes,
		onFilterChange,
		onClear
	}: AuditLogFiltersProps = $props();

	let filters = $state<FilterValues>(initialFilters);
</script>

<div class="audit-log-filters">
	<!-- Will add filter controls in next step -->
</div>
