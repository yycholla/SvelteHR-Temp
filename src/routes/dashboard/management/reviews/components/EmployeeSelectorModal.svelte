<script lang="ts">
	import { Search, User } from '@lucide/svelte';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Badge } from '$lib/components/ui/badge';
	import * as Dialog from '$lib/components/ui/dialog';

	interface Props {
		open: boolean;
		searchQuery: string;
		filteredEmployees: any[];
		onSelect: (employee: any) => void;
		onCancel: () => void;
	}

	let {
		open = $bindable(),
		searchQuery = $bindable(),
		filteredEmployees,
		onSelect,
		onCancel
	}: Props = $props();
</script>

<Dialog.Root bind:open>
	<Dialog.Portal>
		<Dialog.Overlay />
		<Dialog.Content class="max-h-[80vh] max-w-2xl">
			<Dialog.Header>
				<Dialog.Title>Select Employee for Review</Dialog.Title>
				<Dialog.Description>
					Choose an employee to create a performance review for
				</Dialog.Description>
			</Dialog.Header>

			<div class="space-y-4 py-4">
				<!-- Search Input -->
				<div class="relative">
					<Search class="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
					<Input
						type="text"
						placeholder="Search employees by name or email..."
						bind:value={searchQuery}
						class="pl-9"
					/>
				</div>

				<!-- Employee List -->
				<div class="max-h-96 overflow-y-auto rounded-md border">
					{#if filteredEmployees.length === 0}
						<div class="p-8 text-center text-muted-foreground">
							<User class="mx-auto mb-2 h-12 w-12 opacity-50" />
							<p>No employees found</p>
							{#if searchQuery}
								<p class="mt-1 text-sm">Try adjusting your search</p>
							{/if}
						</div>
					{:else}
						<div class="divide-y">
							{#each filteredEmployees as employee (employee.id)}
								<button
									type="button"
									class="flex w-full items-center gap-3 p-4 text-left transition-colors hover:bg-accent"
									onclick={() => onSelect(employee)}
								>
									<div class="flex-1">
										<div class="font-medium">{employee.displayName}</div>
										<div class="text-sm text-muted-foreground">{employee.email}</div>
									</div>
									<Badge variant="outline">
										{employee.firstName}
										{employee.lastName}
									</Badge>
								</button>
							{/each}
						</div>
					{/if}
				</div>
			</div>

			<Dialog.Footer>
				<Button variant="outline" onclick={onCancel}>Cancel</Button>
			</Dialog.Footer>
		</Dialog.Content>
	</Dialog.Portal>
</Dialog.Root>
