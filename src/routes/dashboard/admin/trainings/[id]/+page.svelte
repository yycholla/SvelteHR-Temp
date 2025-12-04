<script lang="ts">
	import { enhance } from '$app/forms';
	import {
		AlertCircle,
		Building,
		CalendarIcon,
		CheckCircle2,
		ChevronLeft,
		GraduationCap,
		Loader2,
		Search,
		UserMinus,
		UserPlus,
		Users
	} from '@lucide/svelte';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Textarea } from '$lib/components/ui/textarea';
	import { Switch } from '$lib/components/ui/switch';
	import * as Card from '$lib/components/ui/card';
	import * as Alert from '$lib/components/ui/alert';
	import * as Select from '$lib/components/ui/select'; // For assigning users
	import MultiSearchInput from '$lib/components/ui/tag-input/MultiSearchInput.svelte';
	import { Badge } from '$lib/components/ui/badge';
	import { Popover, PopoverContent, PopoverTrigger } from '$lib/components/ui/popover';
	import { Calendar } from '$lib/components/ui/calendar';
	import { DateFormatter, getLocalTimeZone } from '@internationalized/date';
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { cn } from '$lib/utils';
	import RecurrencePatternInput from '$lib/components/ui/recurrence-pattern-input.svelte';

	const { data, form } = $props();
	const { training, allUsers, departments, assignments } = data;

	let submitting = $state(false);
	let isActive = $state(training.isActive);
	let tags = $state<string[]>(training.tags || []);
	let selectedUsersToAssign = $state<string[]>([]);
	let selectedDepartmentsToAssign = $state<string[]>([]);
	let assignmentType = $state<'user' | 'department' | 'all'>('user');
	let assignmentDueDate = $state<string | undefined>(undefined);
	let isAssigning = $state(false);
	let searchTerms = $state<string[]>([]);
	let recurrencePattern = $state(
		training.rrule
			? {
					frequency: 'weekly',
					interval: 1,
					endDate: training.recurrenceEndDate ? new Date(training.recurrenceEndDate) : null,
					rruleString: training.rrule
				}
			: null
	);

	const df = new DateFormatter('en-US', {
		dateStyle: 'long'
	});

	// Helper to format datetime-local input value (YYYY-MM-DDThh:mm)
	function toDatetimeLocal(isoString: string | null) {
		if (!isoString) return '';
		const date = new Date(isoString);
		const offset = date.getTimezoneOffset() * 60000;
		const localISOTime = new Date(date.getTime() - offset).toISOString().slice(0, 16);
		return localISOTime;
	}

	function formatDueDate(dateStr: string | null | undefined) {
		if (!dateStr) return 'No due date';
		const date = new Date(dateStr);
		return date.toLocaleDateString();
	}

	// Transform allUsers for MultiSearchInput options
	const userOptions = allUsers.map((user: any) => {
		const displayName = user.displayName || '';
		const firstName = user.firstName || '';
		const lastName = user.lastName || '';
		const email = user.email || '';

		// Primary display name
		const primaryName = displayName || `${firstName} ${lastName}`.trim() || email;

		// Include email in label for searchability (MultiSearchInput only searches label field)
		// Format: "Display Name (email@example.com)" or just "email@example.com" if no name
		const label =
			displayName || `${firstName} ${lastName}`.trim() ? `${primaryName} (${email})` : email;

		return {
			value: user.id,
			label
		};
	});

	// Transform departments for Select options
	const departmentOptions = departments.map((dept: any) => ({
		value: dept.id,
		label: dept.name
	}));

	// Filtered assignments based on search terms
	const filteredAssignments = $derived(() => {
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

	async function handleAssign() {
		if (isAssigning) return;
		isAssigning = true;

		try {
			let successCount = 0;
			let failCount = 0;

			if (assignmentType === 'user') {
				// Assign to multiple users
				for (const userId of selectedUsersToAssign) {
					const formData = new FormData();
					formData.append('userId', userId);
					if (assignmentDueDate) {
						formData.append('dueDate', new Date(assignmentDueDate).toISOString());
					}

					const response = await fetch('?/assign', {
						method: 'POST',
						body: formData
					});

					if (response.ok) {
						const result = await response.json();
						if (result.type === 'success') {
							successCount++;
						} else {
							failCount++;
						}
					} else {
						failCount++;
					}
				}
			} else if (assignmentType === 'department') {
				// Assign to multiple departments
				for (const departmentId of selectedDepartmentsToAssign) {
					const formData = new FormData();
					formData.append('departmentId', departmentId);
					if (assignmentDueDate) {
						formData.append('dueDate', new Date(assignmentDueDate).toISOString());
					}

					const response = await fetch('?/assignToDepartment', {
						method: 'POST',
						body: formData
					});

					if (response.ok) {
						const result = await response.json();
						if (result.type === 'success') {
							successCount++;
						} else {
							failCount++;
						}
					} else {
						failCount++;
					}
				}
			} else if (assignmentType === 'all') {
				// Assign to all employees
				const formData = new FormData();
				if (assignmentDueDate) {
					formData.append('dueDate', new Date(assignmentDueDate).toISOString());
				}

				const response = await fetch('?/assignToAllEmployees', {
					method: 'POST',
					body: formData
				});

				if (response.ok) {
					const result = await response.json();
					if (result.type === 'success' && result.data?.message) {
						alert(result.data.message);
					}
				}
			}

			if (assignmentType !== 'all') {
				if (successCount > 0) {
					alert(
						`Successfully assigned to ${successCount} ${assignmentType === 'user' ? 'user(s)' : 'department(s)'}`
					);
				}
				if (failCount > 0) {
					alert(
						`Failed to assign ${failCount} ${assignmentType === 'user' ? 'user(s)' : 'department(s)'}`
					);
				}
			}

			goto($page.url.pathname, { invalidateAll: true });
		} catch (error) {
			alert('An error occurred during assignment');
			console.error(error);
		} finally {
			isAssigning = false;
			selectedUsersToAssign = [];
			selectedDepartmentsToAssign = [];
			assignmentDueDate = undefined;
		}
	}

	async function handleUnassignUser(assignmentId: string) {
		isAssigning = true;
		const formData = new FormData();
		formData.append('assignmentId', assignmentId);

		try {
			const response = await fetch(`?/unassign`, {
				method: 'POST',
				body: formData
			});
			if (response.ok) {
				goto($page.url.pathname, { invalidateAll: true });
			} else {
				const result = await response.json();
				alert(`Failed to unassign user: ${result.error}`);
			}
		} catch (error) {
			alert('An error occurred during unassignment');
		} finally {
			isAssigning = false;
		}
	}
</script>

<svelte:head>
	<title>Edit Training - {training.title}</title>
</svelte:head>

<div class="container mx-auto py-10 max-w-5xl px-4">
	<!-- Header -->
	<div class="mb-8 flex items-center justify-between">
		<div class="flex items-center gap-4">
			<Button variant="outline" size="icon" href="/dashboard/admin/trainings">
				<ChevronLeft class="h-4 w-4" />
			</Button>
			<div>
				<h1 class="text-2xl font-bold tracking-tight">Edit Training</h1>
				<p class="text-muted-foreground text-sm">Update training module details and settings.</p>
			</div>
		</div>
		<Button href={`/dashboard/admin/trainings/${training.id}/content`} variant="secondary">
			<GraduationCap class="mr-2 h-4 w-4" />
			Manage Content
		</Button>
	</div>

	{#if form?.error}
		<Alert.Root variant="destructive" class="mb-6">
			<AlertCircle class="h-4 w-4" />
			<Alert.Title>Error</Alert.Title>
			<Alert.Description>{form.error}</Alert.Description>
		</Alert.Root>
	{/if}

	{#if form?.success}
		<Alert.Root
			variant="default"
			class="mb-6 border-green-500 text-green-700 bg-green-50 dark:bg-green-900/20 dark:text-green-400"
		>
			<CheckCircle2 class="h-4 w-4" />
			<Alert.Title>Success</Alert.Title>
			<Alert.Description>Training updated successfully!</Alert.Description>
		</Alert.Root>
	{/if}

	<form
		method="POST"
		action="?/update"
		use:enhance={() => {
			submitting = true;
			return async ({ update }) => {
				submitting = false;
				await update();
			};
		}}
	>
		<!-- Hidden inputs for complex bindings -->
		<input type="hidden" name="isActive" value={isActive ? 'on' : 'off'} />
		<input type="hidden" name="tags" value={JSON.stringify(tags)} />
		<input type="hidden" name="recurrencePattern" value={JSON.stringify(recurrencePattern)} />
		<!-- <input type="hidden" name="authorId" value={selectedAuthor} /> -->

		<div class="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
			<!-- Left Column: Main Info -->
			<div class="lg:col-span-2 space-y-6">
				<!-- Basic Details Card -->
				<Card.Root>
					<Card.Content class="p-6 space-y-6">
						<div class="space-y-2">
							<Label for="title">Title <span class="text-destructive">*</span></Label>
							<Input id="title" name="title" value={training.title} required />
						</div>

						<div class="space-y-2">
							<Label for="description">Description</Label>
							<Textarea
								id="description"
								name="description"
								rows={4}
								value={training.description || ''}
							/>
						</div>
					</Card.Content>
				</Card.Root>

				<!-- SEO & Metadata Card -->
				<Card.Root>
					<Card.Header class="border-b p-6">
						<Card.Title>SEO & Metadata</Card.Title>
					</Card.Header>
					<Card.Content class="p-6 space-y-6">
						<div class="space-y-2">
							<Label for="metaTitle">Meta Title</Label>
							<Input id="metaTitle" name="metaTitle" value={training.metaTitle || ''} />
							<p class="text-[0.8rem] text-muted-foreground">
								Recommended length: 50-60 characters.
							</p>
						</div>

						<div class="space-y-2">
							<Label for="metaDescription">Meta Description</Label>
							<Textarea
								id="metaDescription"
								name="metaDescription"
								rows={3}
								value={training.metaDescription || ''}
							/>
							<p class="text-[0.8rem] text-muted-foreground">
								Recommended length: 150-160 characters.
							</p>
						</div>
					</Card.Content>
				</Card.Root>
			</div>

			<!-- Right Column: Settings & Organization -->
			<div class="space-y-6">
				<!-- Organization Card -->
				<Card.Root>
					<Card.Header class="border-b p-6">
						<Card.Title>Organization</Card.Title>
					</Card.Header>
					<Card.Content class="p-6 space-y-6">
						<!-- Status -->
						<div class="flex items-center justify-between">
							<div class="space-y-0.5">
								<Label class="text-base">Active Status</Label>
								<p class="text-xs text-muted-foreground">Visible to employees</p>
							</div>
							<Switch bind:checked={isActive} />
						</div>

						<div class="h-px bg-border" />

						<!-- Tags -->
						<div class="space-y-2">
							<Label>Tags</Label>
							<MultiSearchInput
								bind:searchTerms={tags}
								placeholder="Add tag..."
								allowCustomTerms={true}
							/>
						</div>
					</Card.Content>
				</Card.Root>

				<!-- Scheduling Card -->
				<Card.Root>
					<Card.Header class="border-b p-6">
						<Card.Title>Availability</Card.Title>
					</Card.Header>
					<Card.Content class="p-6 space-y-4">
						<div class="space-y-2">
							<Label for="startDate">Start Date</Label>
							<Input
								id="startDate"
								name="startDate"
								type="datetime-local"
								value={toDatetimeLocal(training.startDate)}
							/>
						</div>
						<div class="space-y-2">
							<Label for="endDate">End Date</Label>
							<Input
								id="endDate"
								name="endDate"
								type="datetime-local"
								value={toDatetimeLocal(training.endDate)}
							/>
						</div>

						<div class="h-px bg-border my-2" />

						<RecurrencePatternInput
							bind:pattern={recurrencePattern}
							startDate={training.startDate ? new Date(training.startDate) : new Date()}
						/>
					</Card.Content>
				</Card.Root>
			</div>
		</div>

		<!-- Assignments Section (Full Width) -->
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
					<div class="flex flex-col lg:flex-row gap-8">
						<!-- Assignment Form (Left Side) -->
						<div class="w-full lg:w-1/3 space-y-6 lg:border-r lg:border-border lg:pr-8">
							<div class="space-y-4">
								<h4 class="font-semibold text-sm flex items-center gap-2">
									<UserPlus class="h-4 w-4" /> Assign Training
								</h4>

								<!-- Assignment Type Tabs -->
								<div class="grid grid-cols-3 gap-1 p-1 bg-muted rounded-lg text-xs font-medium">
									<button
										type="button"
										class="px-2 py-1.5 rounded-md transition-all {assignmentType === 'user'
											? 'bg-background shadow-sm text-foreground'
											: 'text-muted-foreground hover:text-foreground'}"
										onclick={() => (assignmentType = 'user')}
									>
										Individual
									</button>
									<button
										type="button"
										class="px-2 py-1.5 rounded-md transition-all {assignmentType === 'department'
											? 'bg-background shadow-sm text-foreground'
											: 'text-muted-foreground hover:text-foreground'}"
										onclick={() => (assignmentType = 'department')}
									>
										Department
									</button>
									<button
										type="button"
										class="px-2 py-1.5 rounded-md transition-all {assignmentType === 'all'
											? 'bg-background shadow-sm text-foreground'
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
										class="p-3 bg-accent/20 rounded-md border border-accent/50 text-sm text-muted-foreground"
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
													{assignmentDueDate
														? df.format(new Date(assignmentDueDate))
														: 'Pick a date'}
												</Button>
											{/snippet}
										</PopoverTrigger>
										<PopoverContent class="w-auto p-0">
											<Calendar
												type="single"
												value={assignmentDueDate ? new Date(assignmentDueDate) : undefined}
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
									class="w-full mt-2"
									onclick={handleAssign}
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
							<div class="flex flex-col gap-3 mb-4">
								<h4 class="font-semibold text-sm">Currently Assigned</h4>
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
									class="flex flex-col items-center justify-center h-48 text-muted-foreground border-2 border-dashed rounded-lg bg-muted/5"
								>
									<UserPlus class="h-8 w-8 mb-2 opacity-20" />
									<p class="text-sm font-medium">No users assigned yet.</p>
									<p class="text-xs">Use the form on the left to assign users.</p>
								</div>
							{:else if filteredAssignments().length === 0}
								<div
									class="flex flex-col items-center justify-center h-48 text-muted-foreground border-2 border-dashed rounded-lg bg-muted/5"
								>
									<Search class="h-8 w-8 mb-2 opacity-20" />
									<p class="text-sm font-medium">No users found matching your search.</p>
									<p class="text-xs">Try different search terms.</p>
								</div>
							{:else}
								<div class="space-y-2">
									<p class="text-xs text-muted-foreground">
										Showing {filteredAssignments().length} of {assignments.length} assigned users
									</p>
									<div
										class="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[400px] overflow-y-auto pr-2"
									>
										{#each filteredAssignments() as assignment (assignment.id)}
											<div
												class="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors group"
											>
												<div class="flex flex-col min-w-0 gap-1">
													<div class="font-medium text-sm truncate flex items-center gap-2">
														<div
															class="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center text-xs text-primary font-bold"
														>
															{(assignment.user?.displayName || assignment.user?.email || 'U')
																.charAt(0)
																.toUpperCase()}
														</div>
														{assignment.user?.displayName ||
															assignment.user?.email ||
															'Unknown User'}
													</div>
													<div class="text-xs text-muted-foreground pl-8">
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
													class="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10 opacity-0 group-hover:opacity-100 transition-opacity"
													onclick={() => handleUnassignUser(assignment.id)}
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

		<div class="flex justify-end gap-2 pb-10">
			<Button variant="ghost" href="/dashboard/admin/trainings" disabled={submitting}>Back</Button>
			<Button type="submit" disabled={submitting}>
				{#if submitting}
					<Loader2 class="mr-2 h-4 w-4 animate-spin" />
					Saving...
				{:else}
					Save Changes
				{/if}
			</Button>
		</div>
	</form>
</div>
