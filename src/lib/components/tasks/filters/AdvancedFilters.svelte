<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Label } from '$lib/components/ui/label';
	import * as Popover from '$lib/components/ui/popover';
	import { Checkbox } from '$lib/components/ui/checkbox';
	import { ChevronDown, Filter, GitBranch } from '@lucide/svelte';

	interface Props {
		hasParent: boolean | null;
		hasDependencies: boolean | null;
		showAdvanced: boolean;
		isAdvancedOpen: boolean;
		onUpdateHasParent: (value: boolean | null) => void;
		onUpdateHasDependencies: (value: boolean | null) => void;
	}

	let {
		hasParent,
		hasDependencies,
		showAdvanced,
		isAdvancedOpen = $bindable(),
		onUpdateHasParent,
		onUpdateHasDependencies
	}: Props = $props();
</script>

{#if showAdvanced}
	<Popover.Root bind:open={isAdvancedOpen}>
		<Popover.Trigger class="w-full">
			<Button variant="outline" size="sm" class="w-full">
				<Filter class="mr-2 h-3 w-3" />
				Advanced Filters
				<ChevronDown class="ml-auto h-3 w-3" />
			</Button>
		</Popover.Trigger>
		<Popover.Content class="w-80">
			<div class="space-y-4">
				<h4 class="font-medium">Advanced Options</h4>

				<!-- Hierarchy Filter -->
				<div class="space-y-2">
					<Label>Task Hierarchy</Label>
					<div class="space-y-2">
						<label
							class="flex items-center gap-2 rounded-md border p-2 cursor-pointer hover:bg-accent transition-colors"
							class:bg-accent={hasParent === null}
						>
							<Checkbox
								checked={hasParent === null}
								onCheckedChange={() => onUpdateHasParent(null)}
							/>
							<span class="text-sm">All tasks</span>
						</label>
						<label
							class="flex items-center gap-2 rounded-md border p-2 cursor-pointer hover:bg-accent transition-colors"
							class:bg-accent={hasParent === false}
						>
							<Checkbox
								checked={hasParent === false}
								onCheckedChange={() => onUpdateHasParent(false)}
							/>
							<span class="text-sm">Top-level tasks only</span>
						</label>
						<label
							class="flex items-center gap-2 rounded-md border p-2 cursor-pointer hover:bg-accent transition-colors"
							class:bg-accent={hasParent === true}
						>
							<Checkbox
								checked={hasParent === true}
								onCheckedChange={() => onUpdateHasParent(true)}
							/>
							<span class="text-sm">Subtasks only</span>
						</label>
					</div>
				</div>

				<!-- Dependencies Filter -->
				<div class="space-y-2">
					<Label>Dependencies</Label>
					<div class="space-y-2">
						<label
							class="flex items-center gap-2 rounded-md border p-2 cursor-pointer hover:bg-accent transition-colors"
							class:bg-accent={hasDependencies === null}
						>
							<Checkbox
								checked={hasDependencies === null}
								onCheckedChange={() => onUpdateHasDependencies(null)}
							/>
							<span class="text-sm">All tasks</span>
						</label>
						<label
							class="flex items-center gap-2 rounded-md border p-2 cursor-pointer hover:bg-accent transition-colors"
							class:bg-accent={hasDependencies === true}
						>
							<Checkbox
								checked={hasDependencies === true}
								onCheckedChange={() => onUpdateHasDependencies(true)}
							/>
							<div class="flex items-center gap-1.5">
								<GitBranch class="h-3 w-3" />
								<span class="text-sm">With dependencies</span>
							</div>
						</label>
						<label
							class="flex items-center gap-2 rounded-md border p-2 cursor-pointer hover:bg-accent transition-colors"
							class:bg-accent={hasDependencies === false}
						>
							<Checkbox
								checked={hasDependencies === false}
								onCheckedChange={() => onUpdateHasDependencies(false)}
							/>
							<span class="text-sm">Without dependencies</span>
						</label>
					</div>
				</div>
			</div>
		</Popover.Content>
	</Popover.Root>
{/if}
