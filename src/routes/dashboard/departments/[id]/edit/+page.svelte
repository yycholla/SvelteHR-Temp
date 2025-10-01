<script lang="ts">
	import { goto } from '$app/navigation';
	import { enhance } from '$app/forms';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Textarea } from '$lib/components/ui/textarea';
	import * as Card from '$lib/components/ui/card';
	import { ArrowLeft, Save, X, AlertCircle, Search, ChevronDown, Check } from 'lucide-svelte';

	interface Props {
		data: {
			department: {
				id: string;
				name: string;
				description: string | null;
				managerId: string | null;
				manager: {
					id: string;
					displayName: string;
				} | null;
			};
			users: Array<{
				id: string;
				displayName: string;
				role: string;
			}>;
			canManageDepartments: boolean;
		};
		form?: {
			error?: string;
		};
	}

	let { data, form }: Props = $props();

	// Extract server-loaded data
	const department = $derived(data.department);
	const users = $derived(data.users);

	// Form state - initialize from props
	let name = $state(data.department.name);
	let description = $state(data.department.description || '');
	let managerId = $state(data.department.managerId || '');
	let isSubmitting = $state(false);

	// Manager search state
	let managerSearchTerm = $state('');
	let showManagerDropdown = $state(false);

	// Filtered users based on search
	const filteredUsers = $derived(
		users.filter(
			(user) =>
				user.displayName.toLowerCase().includes(managerSearchTerm.toLowerCase()) ||
				user.role.toLowerCase().includes(managerSearchTerm.toLowerCase())
		)
	);

	// Get selected manager name
	const selectedManagerName = $derived(
		managerId ? users.find((u) => u.id === managerId)?.displayName || 'Unknown' : 'No Manager'
	);

	// Handle manager selection
	function selectManager(userId: string) {
		managerId = userId;
		showManagerDropdown = false;
		managerSearchTerm = '';
	}

	// Clear manager selection
	function clearManager() {
		managerId = '';
		showManagerDropdown = false;
		managerSearchTerm = '';
	}

	// Close dropdown when clicking outside
	function handleClickOutside(event: MouseEvent) {
		const target = event.target as HTMLElement;
		if (!target.closest('[data-manager-dropdown]')) {
			showManagerDropdown = false;
			managerSearchTerm = '';
		}
	}

	// Navigate back to department detail page
	function goBack() {
		goto(`/dashboard/departments/${department.id}`);
	}

	// Form validation
	const formErrors = $derived({
		name: !name ? 'Department name is required' : ''
	});

	const hasErrors = $derived(Object.values(formErrors).some((error) => error !== ''));

	// Add/remove click outside listener
	$effect(() => {
		if (showManagerDropdown) {
			document.addEventListener('click', handleClickOutside);
			return () => document.removeEventListener('click', handleClickOutside);
		}
	});
</script>

<svelte:head>
	<title>Edit {department.name} - SvelteHR</title>
	<meta name="description" content="Edit department information for {department.name}" />
</svelte:head>

<div class="space-y-6">
	<!-- Page Header -->
	<div class="flex items-center justify-between">
		<div class="flex items-center gap-4">
			<Button variant="ghost" size="icon" onclick={goBack}>
				<ArrowLeft class="h-5 w-5" />
			</Button>
			<div>
				<h1 class="text-3xl font-bold tracking-tight">Edit Department</h1>
				<p class="text-muted-foreground">Update information for {department.name}</p>
			</div>
		</div>
	</div>

	<!-- Error Alert -->
	{#if form?.error}
		<div
			class="flex items-center gap-2 rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-destructive"
		>
			<AlertCircle class="h-5 w-5" />
			<p class="font-medium">{form.error}</p>
		</div>
	{/if}

	<!-- Edit Form -->
	<form method="POST" use:enhance={() => {
		isSubmitting = true;
		return async ({ update }) => {
			await update();
			isSubmitting = false;
		};
	}}>
		<div class="grid gap-6 lg:grid-cols-3">
			<!-- Left Column: Department Information -->
			<div class="lg:col-span-2">
				<Card.Root>
					<Card.Header>
						<Card.Title>Department Information</Card.Title>
						<Card.Description>Update the department's basic information</Card.Description>
					</Card.Header>
					<Card.Content class="space-y-4">
						<!-- Department Name -->
						<div class="space-y-2">
							<Label for="name">
								Department Name <span class="text-destructive">*</span>
							</Label>
							<Input
								id="name"
								name="name"
								type="text"
								bind:value={name}
								placeholder="Human Resources"
								required
							/>
							{#if formErrors.name}
								<p class="text-sm text-destructive">{formErrors.name}</p>
							{/if}
						</div>

						<!-- Description -->
						<div class="space-y-2">
							<Label for="description">Description</Label>
							<Textarea
								id="description"
								name="description"
								bind:value={description}
								placeholder="Describe the department's purpose and responsibilities..."
								rows={4}
								class="resize-none"
							/>
							<p class="text-xs text-muted-foreground">
								Provide a brief description of what this department does
							</p>
						</div>
					</Card.Content>
				</Card.Root>
			</div>

			<!-- Right Column: Management -->
			<div class="space-y-6">
				<Card.Root>
					<Card.Header>
						<Card.Title>Department Management</Card.Title>
						<Card.Description>Assign department head</Card.Description>
					</Card.Header>
					<Card.Content class="space-y-4">
						<!-- Manager - Searchable Dropdown -->
						<div class="space-y-2">
							<Label for="managerId">Department Head</Label>

							<!-- Custom Searchable Select -->
							<div class="relative" data-manager-dropdown>
								<!-- Display Button -->
								<button
									type="button"
									onclick={() => (showManagerDropdown = !showManagerDropdown)}
									class="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
								>
									<span class:text-muted-foreground={!managerId}>
										{selectedManagerName}
									</span>
									<ChevronDown class="h-4 w-4 opacity-50" />
								</button>

								<!-- Dropdown Panel -->
								{#if showManagerDropdown}
									<div
										class="absolute z-50 mt-1 max-h-80 w-full overflow-hidden rounded-md border bg-popover shadow-md"
									>
										<!-- Search Input -->
										<div class="border-b p-2">
											<div class="relative">
												<Search
													class="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
												/>
												<Input
													type="text"
													placeholder="Search employees..."
													bind:value={managerSearchTerm}
													class="h-8 pl-8"
													autofocus
												/>
											</div>
										</div>

										<!-- Options List -->
										<div class="max-h-60 overflow-y-auto p-1">
											<!-- Clear Selection Option -->
											<button
												type="button"
												onclick={clearManager}
												class="relative flex w-full cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground"
											>
												{#if !managerId}
													<Check class="mr-2 h-4 w-4" />
												{:else}
													<span class="mr-2 h-4 w-4"></span>
												{/if}
												<span class="text-muted-foreground">No Manager</span>
											</button>

											<!-- User Options -->
											{#each filteredUsers as user (user.id)}
												<button
													type="button"
													onclick={() => selectManager(user.id)}
													class="relative flex w-full cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground"
												>
													{#if managerId === user.id}
														<Check class="mr-2 h-4 w-4" />
													{:else}
														<span class="mr-2 h-4 w-4"></span>
													{/if}
													<div class="flex flex-col items-start">
														<span>{user.displayName}</span>
														<span class="text-xs text-muted-foreground">{user.role}</span>
													</div>
												</button>
											{:else}
												<div class="px-2 py-6 text-center text-sm text-muted-foreground">
													No employees found
												</div>
											{/each}
										</div>
									</div>
								{/if}

								<!-- Hidden input for form submission -->
								<input type="hidden" name="managerId" value={managerId} />
							</div>

							<p class="text-xs text-muted-foreground">
								Search and select a user to be the head of this department
							</p>
						</div>

						{#if department.manager && managerId === department.managerId}
							<div class="rounded-lg border border-muted bg-muted/50 p-3">
								<p class="text-sm font-medium">Current Manager</p>
								<p class="text-sm text-muted-foreground">{department.manager.displayName}</p>
							</div>
						{/if}
					</Card.Content>
				</Card.Root>

				<!-- Action Buttons -->
				<Card.Root>
					<Card.Content class="pt-6">
						<div class="space-y-2">
							<Button type="submit" class="w-full" disabled={hasErrors || isSubmitting}>
								<Save class="mr-2 h-4 w-4" />
								{isSubmitting ? 'Saving...' : 'Save Changes'}
							</Button>
							<Button
								type="button"
								variant="outline"
								class="w-full"
								onclick={goBack}
								disabled={isSubmitting}
							>
								<X class="mr-2 h-4 w-4" />
								Cancel
							</Button>
						</div>
					</Card.Content>
				</Card.Root>
			</div>
		</div>
	</form>
</div>
