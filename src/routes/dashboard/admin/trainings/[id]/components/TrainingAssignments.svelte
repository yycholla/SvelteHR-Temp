<script lang="ts">
	import {
		Building,
		CalendarIcon,
		Loader2,
		Search,
		UserMinus,
		UserPlus,
		Users
	} from '@lucide/svelte';
	import { Button } from '$lib/components/ui/button';
	import { Label } from '$lib/components/ui/label';
	import * as Card from '$lib/components/ui/card';
	import { Badge } from '$lib/components/ui/badge';
	import { Popover, PopoverContent, PopoverTrigger } from '$lib/components/ui/popover';
	import { Calendar } from '$lib/components/ui/calendar';
	import MultiSearchInput from '$lib/components/ui/tag-input/MultiSearchInput.svelte';
	import { DateFormatter, getLocalTimeZone, parseDate } from '@internationalized/date';
	import { cn } from '$lib/utils';

	interface Props {
		assignments: any[];
		userOptions: any[];
		departmentOptions: any[];
		assignmentType: 'user' | 'department' | 'all';
		selectedUsersToAssign: string[];
		selectedDepartmentsToAssign: string[];
		assignmentDueDate: string | undefined;
		searchTerms: string[];
		isAssigning: boolean;
		onAssign: () => void;
		onUnassign: (id: string) => void;
	}

	let {
		assignments,
		userOptions,
		departmentOptions,
		assignmentType = $bindable(),
		selectedUsersToAssign = $bindable(),
		selectedDepartmentsToAssign = $bindable(),
		assignmentDueDate = $bindable(),
		searchTerms = $bindable(),
		isAssigning,
		onAssign,
		onUnassign
	}: Props = $props();

	const df = new DateFormatter('en-US', {
		dateStyle: 'long'
	});

	function formatDueDate(dateStr: string | null | undefined) {
		if (!dateStr) return 'No due date';
		const date = new Date(dateStr);
		return date.toLocaleDateString();
	}

	const filteredAssignments = $derived.by(() => {
		if (searchTerms.length === 0) {
			return assignments;
		}

		const lowerSearchTerms = searchTerms.map((term) => term.toLowerCase());
		return assignments.filter((assignment: any) => {
			const displayName = (assignment.user?.displayName || '').toLowerCase();
			const email = (assignment.user?.email || '').toLowerCase();
			const firstName = (assignment.user?.firstName || '').toLowerCase();
			const lastName = (assignment.user?.lastName || '').toLowerCase();
			const fullName = `${firstName} ${lastName}`.trim().toLowerCase();

			return lowerSearchTerms.some(
				(term) =>
					displayName.includes(term) ||
					email.includes(term) ||
					firstName.includes(term) ||
					lastName.includes(term) ||
					fullName.includes(term)
			);
		});
	});
</script>

<div class="mb-6">
	<Card.Root>
		<Card.Header class="border-b p-6">
			<div class="flex items-center justify-between">
				<div>
					<Card.Title>Assignments</Card.Title>
					<Card.Description>Manage user assignments for this training.</Card.Description>
				</div>
				<Badge variant="secondary" class="text-xs">{assignments.length} Assigned</Badge>
			</div>
		</Card.Header>
		<Card.Content class="p-6">
			<div class="flex flex-col gap-8 lg:flex-row">
				<!-- Assignment Form (Left Side) -->
				<div class="w-full space-y-6 lg:w-1/3 lg:border-r lg:border-border lg:pr-8">
					<div class="space-y-4">
						<h4 class="flex items-center gap-2 text-sm font-semibold">
							<UserPlus class="h-4 w-4" /> Assign Training
						</h4>

						<!-- Assignment Type Tabs -->
						<div class="grid grid-cols-3 gap-1 rounded-lg bg-muted p-1 text-xs font-medium">
							<button
								type="button"
								class="rounded-md px-2 py-1.5 transition-all {assignmentType === 'user'
									? 'bg-background text-foreground shadow-sm'
									: 'text-muted-foreground hover:text-foreground'}"
								onclick={() => (assignmentType = 'user')}
							>
								Individual
							</button>
							<button
								type="button"
								class="rounded-md px-2 py-1.5 transition-all {assignmentType === 'department'
									? 'bg-background text-foreground shadow-sm'
									: 'text-muted-foreground hover:text-foreground'}"
								onclick={() => (assignmentType = 'department')}
							>
								Department
							</button>
							<button
								type="button"
								class="rounded-md px-2 py-1.5 transition-all {assignmentType === 'all'
									? 'bg-background text-foreground shadow-sm'
									: 'text-muted-foreground hover:text-foreground'}"
								onclick={() => (assignmentType = 'all')}
							>
								Everyone
							</button>
						</div>

						{#if assignmentType === 'user'}
							<div class="space-y-2">
								<Label for="userToAssign">Select Users</Label>
								<MultiSearchInput
									bind:searchTerms={selectedUsersToAssign}
									placeholder="Search and select users..."
									options={userOptions}
									allowCustomTerms={false}
								/>
								{#if selectedUsersToAssign.length > 0}
									<p class="text-xs text-muted-foreground">
										{selectedUsersToAssign.length} user(s) selected
									</p>
								{/if}
							</div>
						{:else if assignmentType === 'department'}
							<div class="space-y-2">
								<Label for="departmentToAssign">Select Departments</Label>
								<MultiSearchInput
									bind:searchTerms={selectedDepartmentsToAssign}
									placeholder="Search and select departments..."
									options={departmentOptions}
									allowCustomTerms={false}
								/>
								{#if selectedDepartmentsToAssign.length > 0}
									<p class="text-xs text-muted-foreground">
										{selectedDepartmentsToAssign.length} department(s) selected
									</p>
								{/if}
							</div>
						{:else}
							<div
								class="rounded-md border border-accent/50 bg-accent/20 p-3 text-sm text-muted-foreground"
							>
								This will assign the training to <strong>all active employees</strong> in the organization.
							</div>
						{/if}

						<div class="space-y-2">
							<Label>Due Date (Optional)</Label>
							<Popover>
								<PopoverTrigger>
									{#snippet child({ props })}
										<Button
											variant="outline"
											class={cn(
												'w-full justify-start text-left font-normal',
												!assignmentDueDate && 'text-muted-foreground'
											)}
											{...props}
										>
											<CalendarIcon class="mr-2 h-4 w-4" />
											{assignmentDueDate ? df.format(new Date(assignmentDueDate)) : 'Pick a date'}
										</Button>
									{/snippet}
								</PopoverTrigger>
								<PopoverContent class="w-auto p-0">
									<Calendar
										type="single"
										value={assignmentDueDate ? parseDate(assignmentDueDate.split('T')[0]) : undefined}
										onValueChange={(v) => {
											if (v) {
												const dateObj = v.toDate(getLocalTimeZone());
												dateObj.setHours(23, 59, 59, 999);
												assignmentDueDate = dateObj.toISOString();
											} else {
												assignmentDueDate = undefined;
											}
										}}
										initialFocus
									/>
								</PopoverContent>
							</Popover>
						</div>

						<Button
							type="button"
							class="mt-2 w-full"
							onclick={onAssign}
							disabled={isAssigning ||
								(assignmentType === 'user' && selectedUsersToAssign.length === 0) ||
								(assignmentType === 'department' && selectedDepartmentsToAssign.length === 0)}
						>
							{#if isAssigning}
								<Loader2 class="mr-2 h-4 w-4 animate-spin" />
								Assigning...
							{:else if assignmentType === 'user'}
								<UserPlus class="mr-2 h-4 w-4" />
								Assign {selectedUsersToAssign.length > 0
									? `(${selectedUsersToAssign.length})`
									: 'Users'}
							{:else if assignmentType === 'department'}
								<Building class="mr-2 h-4 w-4" />
								Assign {selectedDepartmentsToAssign.length > 0
									? `(${selectedDepartmentsToAssign.length})`
									: 'Departments'}
							{:else}
								<Users class="mr-2 h-4 w-4" /> Assign All
							{/if}
						</Button>
					</div>
				</div>

				<!-- Assignment List (Right Side) -->
				<div class="w-full lg:w-2/3">
					<div class="mb-4 flex flex-col gap-3">
						<h4 class="text-sm font-semibold">Currently Assigned</h4>
						<div class="w-full max-w-md">
							<MultiSearchInput
								bind:searchTerms
								placeholder="Search by name or email..."
								allowCustomTerms={true}
							/>
						</div>
					</div>

					{#if assignments.length === 0}
						<div
							class="flex h-48 flex-col items-center justify-center rounded-lg border-2 border-dashed bg-muted/5 text-muted-foreground"
						>
							<UserPlus class="mb-2 h-8 w-8 opacity-20" />
							<p class="text-sm font-medium">No users assigned yet.</p>
							<p class="text-xs">Use the form on the left to assign users.</p>
						</div>
					{:else if filteredAssignments.length === 0}
						<div
							class="flex h-48 flex-col items-center justify-center rounded-lg border-2 border-dashed bg-muted/5 text-muted-foreground"
						>
							<Search class="mb-2 h-8 w-8 opacity-20" />
							<p class="text-sm font-medium">No users found matching your search.</p>
							<p class="text-xs">Try different search terms.</p>
						</div>
					{:else}
						<div class="space-y-2">
							<p class="text-xs text-muted-foreground">
								Showing {filteredAssignments.length} of {assignments.length} assigned users
							</p>
							<div class="grid max-h-[400px] grid-cols-1 gap-3 overflow-y-auto pr-2 sm:grid-cols-2">
								{#each filteredAssignments as assignment (assignment.id)}
									<div
										class="group flex items-center justify-between rounded-lg border bg-card p-3 transition-colors hover:bg-accent/50"
									>
										<div class="flex min-w-0 flex-col gap-1">
											<div class="flex truncate items-center gap-2 text-sm font-medium">
												<div
													class="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary"
												>
													{(assignment.user?.displayName || assignment.user?.email || 'U')
														.charAt(0)
														.toUpperCase()}
												</div>
												{assignment.user?.displayName || assignment.user?.email || 'Unknown User'}
											</div>
											<div class="pl-8 text-xs text-muted-foreground">
												{#if assignment.dueDate}
													<span class="flex items-center gap-1 text-orange-600/80">
														<CalendarIcon class="h-3 w-3" />
														Due {formatDueDate(assignment.dueDate)}
													</span>
												{:else}
													<span>No due date</span>
												{/if}
											</div>
										</div>
										<Button
											variant="ghost"
											size="icon"
											class="h-8 w-8 text-muted-foreground opacity-0 transition-opacity hover:bg-destructive/10 hover:text-destructive group-hover:opacity-100"
											onclick={() => onUnassign(assignment.id)}
											disabled={isAssigning}
											title="Remove assignment"
										>
											<UserMinus class="h-4 w-4" />
										</Button>
									</div>
								{/each}
							</div>
						</div>
					{/if}
				</div>
			</div>
		</Card.Content>
	</Card.Root>
</div>
