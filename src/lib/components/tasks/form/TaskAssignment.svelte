<script lang="ts">
	import { User as UserIcon } from '@lucide/svelte';
	import { Label } from '$lib/components/ui/label';
	import { Input } from '$lib/components/ui/input';
	import * as Select from '$lib/components/ui/select';
	import { TagInput, TaskTypeTagInput } from '$lib/components/ui/tag-input';
	import { logger } from '$lib/utils/logger';

	interface Props {
		assignees: string[];
		taskTypeId: string;
		parentTaskId: string;
		combinedAssigneeOptions: any[];
		availableUsers: any[];
		departments: any[];
		taskTypes: any[];
		parentTaskOptions: any[];
		filteredParentTaskOptions: any[];
		selectedParentTask: any;
		parentTaskSearchTerm: string;
		filteredParentTasksCount: number;
		totalParentTasksCount: number;
		loading: boolean;
		fieldErrors: Record<string, string>;
	}

	let {
		assignees = $bindable(),
		taskTypeId = $bindable(),
		parentTaskId = $bindable(),
		combinedAssigneeOptions,
		availableUsers,
		departments,
		taskTypes,
		parentTaskOptions,
		filteredParentTaskOptions,
		selectedParentTask,
		parentTaskSearchTerm = $bindable(),
		filteredParentTasksCount,
		totalParentTasksCount,
		loading,
		fieldErrors
	}: Props = $props();
</script>

<div class="space-y-4 rounded-lg border bg-card p-6">
	<h3 class="flex items-center gap-2 border-b pb-2 text-lg font-semibold">
		<UserIcon class="h-4 w-4" />
		Assignment
	</h3>

	<div class="grid grid-cols-1 gap-4 md:grid-cols-2">
		<!-- Assignees (Multi-select with email-style tag input) -->
		<div class="space-y-2">
			<Label for="assignees">
				Assignees <span class="text-destructive">*</span>
			</Label>
			<TagInput
				options={combinedAssigneeOptions}
				bind:selected={assignees}
				placeholder="Type to search users or departments..."
				onSelectedChange={(selected) => {
					logger.info('[TaskForm] Assignees changed:', { selected });
					assignees = selected;
				}}
			/>
			{#if fieldErrors.assignees}
				<p class="text-sm text-destructive">{fieldErrors.assignees}</p>
			{/if}
			<p class="text-xs text-muted-foreground">
				{combinedAssigneeOptions.length} available ({availableUsers.length} users, {departments.length}
				departments)
			</p>
		</div>

		<!-- Task Type -->
		<div class="space-y-2">
			<Label for="taskType">
				Task Type <span class="text-destructive">*</span>
			</Label>
			<TaskTypeTagInput
				{taskTypes}
				bind:selected={taskTypeId}
				placeholder="Select or create task type..."
				disabled={loading}
				onSelectedChange={(selected) => {
					taskTypeId = selected;
					if (fieldErrors.taskTypeId) {
						// Note: We can't delete from prop, parent handles validation
					}
				}}
				onCreate={(newTaskType) => {
					logger.info('Created new task type:', { newTaskType });
				}}
			/>
			{#if fieldErrors.taskTypeId}
				<p class="text-sm text-destructive">{fieldErrors.taskTypeId}</p>
			{/if}
		</div>
	</div>

	<!-- Parent Task (for subtasks) -->
	<div class="space-y-2">
		<Label for="parentTask">Parent Task (Optional)</Label>
		<Select.Root
			type="single"
			bind:value={parentTaskId}
			onValueChange={() => {
				parentTaskSearchTerm = ''; // Reset search on selection
			}}
		>
			<Select.Trigger id="parentTask">
				{selectedParentTask?.label ?? 'None (Top-level task)'}
			</Select.Trigger>
			<Select.Content class="max-h-[300px]">
				{#if parentTaskOptions.length > 1}
					<!-- Search Input (only show if there are tasks beyond "None") -->
					<div class="sticky top-0 z-10 border-b bg-popover p-2">
						<Input
							type="text"
							placeholder="Search tasks..."
							bind:value={parentTaskSearchTerm}
							class="h-8 text-sm"
							onclick={(e) => e.stopPropagation()}
							onkeydown={(e) => e.stopPropagation()}
						/>
					</div>

					<!-- Scrollable Task List -->
					<div class="max-h-[200px] overflow-y-auto">
						{#if filteredParentTaskOptions.length === 0}
							<div class="p-4 text-center text-sm text-muted-foreground">
								No tasks found matching "{parentTaskSearchTerm}"
							</div>
						{:else}
							{#each filteredParentTaskOptions as parent}
								<Select.Item value={parent.value} label={parent.label}
									>{parent.label}</Select.Item
								>
							{/each}
						{/if}
					</div>
				{:else}
					<!-- No tasks available, just show the "None" option -->
					{#each parentTaskOptions as parent}
						<Select.Item value={parent.value} label={parent.label}>{parent.label}</Select.Item>
					{/each}
				{/if}
			</Select.Content>
		</Select.Root>
		<p class="text-xs text-muted-foreground">
			{#if parentTaskOptions.length > 1}
				{filteredParentTaskOptions.length} of {parentTaskOptions.length} tasks available
				{#if assignees && assignees.length > 0 && filteredParentTasksCount < totalParentTasksCount}
					<span class="text-primary">(filtered by assignees)</span>
				{/if}
			{:else}
				Select a parent task to create a subtask
			{/if}
		</p>
	</div>
</div>
