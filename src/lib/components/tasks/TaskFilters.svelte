<!--
  TaskFilters Component
  Feature: 028-task-system-expansion - Task T034
  
  Advanced filtering UI component for task lists
  Refactored: Moved to src/lib/components/tasks/filters/
-->

<script module lang="ts">
	// eslint-disable-next-line no-import-assign
	export type { TaskFilterState } from './filters/types';
</script>

<script lang="ts">
	import TaskFilters from './filters/TaskFilters.svelte';
	import type { TaskFilterState } from './filters/types';

	interface Props {
		filters: TaskFilterState;
		onFiltersChange: (filters: TaskFilterState) => void;
		availableAssignees?: Array<{ id: string; displayName: string }>;
		availableTaskTypes?: Array<{ id: string; name: string }>;
		compact?: boolean;
		showAdvanced?: boolean;
	}

	const props: Props = $props();
</script>

<TaskFilters {...props} />
