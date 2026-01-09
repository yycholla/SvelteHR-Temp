<script lang="ts">
	import { Label } from '$lib/components/ui/label';
	import * as NativeSelect from '$lib/components/ui/native-select';

	interface Props {
		assigneeId: string | null;
		taskTypeId: string | null;
		availableAssignees: Array<{ id: string; displayName: string }>;
		availableTaskTypes: Array<{ id: string; name: string }>;
		onUpdateAssignee: (id: string | null) => void;
		onUpdateTaskType: (id: string | null) => void;
	}

	let {
		assigneeId,
		taskTypeId,
		availableAssignees,
		availableTaskTypes,
		onUpdateAssignee,
		onUpdateTaskType
	}: Props = $props();
</script>

<div class="grid gap-4 md:grid-cols-2">
	<!-- Assignee Filter -->
	<div class="space-y-2">
		<Label for="assignee">Assignee</Label>
		<NativeSelect.Root
			value={assigneeId || ''}
			onchange={(e) => onUpdateAssignee(e.currentTarget.value || null)}
		>
			<NativeSelect.Option value="">All assignees</NativeSelect.Option>
			{#each availableAssignees as assignee}
				<NativeSelect.Option value={assignee.id}>{assignee.displayName}</NativeSelect.Option>
			{/each}
		</NativeSelect.Root>
	</div>

	<!-- Task Type Filter -->
	<div class="space-y-2">
		<Label for="taskType">Task Type</Label>
		<NativeSelect.Root
			value={taskTypeId || ''}
			onchange={(e) => onUpdateTaskType(e.currentTarget.value || null)}
		>
			<NativeSelect.Option value="">All types</NativeSelect.Option>
			{#each availableTaskTypes as type}
				<NativeSelect.Option value={type.id}>{type.name}</NativeSelect.Option>
			{/each}
		</NativeSelect.Root>
	</div>
</div>
