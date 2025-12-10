<script lang="ts">
	import { createEventDispatcher, onMount } from 'svelte';
	import { userService, currentUser as userServiceCurrentUser } from '$lib/services/userService';
	import { auth } from '$lib/stores/auth.svelte';
	import { Button } from '$lib/components/ui/button';
	import { Badge } from '$lib/components/ui/badge';
	import * as Card from '$lib/components/ui/card';
	import * as Dialog from '$lib/components/ui/dialog';
	import * as Avatar from '$lib/components/ui/avatar';
	import { Textarea } from '$lib/components/ui/textarea';
	import { Label } from '$lib/components/ui/label';
	import { Separator } from '$lib/components/ui/separator';
	import {
		AlertCircle,
		Building,
		Calendar,
		DollarSign,
		Edit,
		Mail,
		MapPin,
		Phone,
		RefreshCw,
		Shield,
		UserCheck,
		User as UserIcon,
		UserX,
		Users
	} from '@lucide/svelte';
	import type { User as UserType } from '$lib/types';

	const dispatch = createEventDispatcher();

	// Props
	const { employeeId, showActions = true }: { employeeId: string; showActions?: boolean } =
		$props();

	// State
	let employee: UserType | null = $state(null);
	let loading = $state(true);
	let error: string | null = $state(null);
	let showDeactivateModal = $state(false);
	let deactivateReason = $state('');
	let deactivating = $state(false);

	// Computed values
	const isOwnProfile = $derived(employee?.id === auth.user?.id);
	const canEdit = $derived(auth.user && (isOwnProfile || auth.hasPermission('user:update')));
	const canDeactivate = $derived(auth.user && auth.hasPermission('user:delete') && !isOwnProfile);
	const statusVariant = $derived(employee?.isActive ? 'default' : 'secondary');
	const statusText = $derived(employee?.isActive ? 'Active' : 'Inactive');

	async function loadEmployee() {
		try {
			loading = true;
			error = null;
			employee = await userService.getUserDetails(employeeId);
		} catch (err: any) {
			error = err.message;
			employee = null;
		} finally {
			loading = false;
		}
	}

	async function handleDeactivate() {
		if (!employee) return;

		try {
			deactivating = true;
			await userService.deactivateUser(employee.id, deactivateReason);
			showDeactivateModal = false;
			deactivateReason = '';
			// Reload employee data
			await loadEmployee();
			dispatch('deactivated', { employee });
		} catch (err: any) {
			error = err.message;
		} finally {
			deactivating = false;
		}
	}

	function handleEdit() {
		if (employee) {
			dispatch('edit', { employee });
		}
	}

	function getEmployeeInitials(employee: UserType): string {
		return `${employee.first_name?.charAt(0) || ''}${employee.last_name?.charAt(0) || ''}`;
	}

	function formatDate(dateString: string | null | undefined): string {
		if (!dateString) return 'N/A';
		return new Date(dateString).toLocaleDateString();
	}

	function formatCurrency(amount: number | null | undefined): string {
		if (!amount) return 'N/A';
		return new Intl.NumberFormat('en-US', {
			style: 'currency',
			currency: 'USD'
		}).format(amount);
	}

	function formatPhoneNumber(phone: string | null | undefined): string {
		if (!phone) return 'N/A';
		// Simple phone formatting - can be enhanced
		const cleaned = phone.replace(/\D/g, '');
		if (cleaned.length === 10) {
			return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
		}
		return phone;
	}

	onMount(() => {
		loadEmployee();
	});
</script>

<div class="space-y-6">
	{#if loading}
		<Card.Root>
			<Card.Content class="flex items-center justify-center py-12">
				<div class="flex flex-col items-center space-y-4">
					<RefreshCw class="h-8 w-8 animate-spin text-muted-foreground" />
					<p class="text-muted-foreground">Loading employee profile...</p>
				</div>
			</Card.Content>
		</Card.Root>
	{:else if error}
		<Card.Root>
			<Card.Content class="py-8">
				<div class="flex items-start space-x-4">
					<AlertCircle class="mt-0.5 h-6 w-6 flex-shrink-0 text-destructive" />
					<div class="flex-1 space-y-4">
						<div>
							<h3 class="text-lg font-semibold">Error Loading Profile</h3>
							<p class="text-muted-foreground">{error}</p>
						</div>
						<Button variant="outline" onclick={loadEmployee}>
							<RefreshCw class="mr-2 h-4 w-4" />
							Try Again
						</Button>
					</div>
				</div>
			</Card.Content>
		</Card.Root>
	{:else if employee}
		<!-- Profile Header -->
		<Card.Root>
			<Card.Content class="p-6">
				<div class="flex flex-col gap-6 lg:flex-row lg:items-start">
					<!-- Avatar -->
					<div class="flex justify-center lg:justify-start">
						<Avatar.Root class="h-24 w-24">
							{#if employee.profileImage}
								<Avatar.Image src={employee.profileImage} alt={employee.display_name} />
							{/if}
							<Avatar.Fallback class="text-lg font-semibold">
								{getEmployeeInitials(employee)}
							</Avatar.Fallback>
						</Avatar.Root>
					</div>

					<!-- Profile Info -->
					<div class="flex-1 space-y-4 text-center lg:text-left">
						<div class="space-y-2">
							<div class="flex flex-col gap-3 lg:flex-row lg:items-center">
								<h1 class="text-3xl font-bold">{employee.display_name}</h1>
								<Badge variant={statusVariant}>
									{statusText}
								</Badge>
							</div>
							<p class="text-lg text-muted-foreground">
								{employee.jobTitle || 'No title assigned'}
							</p>
							<p class="text-muted-foreground">
								{employee.department?.name || 'No department assigned'}
							</p>
						</div>

						<!-- Contact Info -->
						<div class="space-y-2">
							<div class="flex items-center justify-center gap-2 lg:justify-start">
								<Mail class="h-4 w-4 text-muted-foreground" />
								<a href="mailto:{employee.email}" class="text-primary hover:underline">
									{employee.email}
								</a>
							</div>

							{#if employee.phone_number}
								<div class="flex items-center justify-center gap-2 lg:justify-start">
									<Phone class="h-4 w-4 text-muted-foreground" />
									<a href="tel:{employee.phone_number}" class="text-primary hover:underline">
										{formatPhoneNumber(employee.phone_number)}
									</a>
								</div>
							{/if}
						</div>
					</div>

					<!-- Actions -->
					{#if showActions}
						<div class="flex flex-col gap-3 lg:flex-shrink-0 lg:flex-row">
							{#if canEdit}
								<Button onclick={handleEdit}>
									<Edit class="mr-2 h-4 w-4" />
									Edit Profile
								</Button>
							{/if}

							{#if canDeactivate && employee.isActive}
								<Button variant="destructive" onclick={() => (showDeactivateModal = true)}>
									<UserX class="mr-2 h-4 w-4" />
									Deactivate
								</Button>
							{/if}
						</div>
					{/if}
				</div>
			</Card.Content>
		</Card.Root>

		<!-- Profile Details Grid -->
		<div class="grid grid-cols-1 gap-6 lg:grid-cols-2">
			<!-- Employment Information -->
			<Card.Root>
				<Card.Header>
					<Card.Title class="flex items-center gap-2">
						<Building class="h-5 w-5" />
						Employment Information
					</Card.Title>
				</Card.Header>
				<Card.Content class="space-y-6">
					<div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
						<div class="space-y-2">
							<Label class="text-xs font-medium uppercase tracking-wide text-muted-foreground">
								Employee ID
							</Label>
							<p class="text-sm">{employee.id}</p>
						</div>

						<div class="space-y-2">
							<Label class="text-xs font-medium uppercase tracking-wide text-muted-foreground">
								Hire Date
							</Label>
							<div class="flex items-center gap-2">
								<Calendar class="h-4 w-4 text-muted-foreground" />
								<p class="text-sm">{formatDate(employee.job_info?.hireDate)}</p>
							</div>
						</div>

						<div class="space-y-2">
							<Label class="text-xs font-medium uppercase tracking-wide text-muted-foreground">
								Employment Type
							</Label>
							<p class="text-sm">{employee.job_info?.employmentType || 'N/A'}</p>
						</div>

						<div class="space-y-2">
							<Label class="text-xs font-medium uppercase tracking-wide text-muted-foreground">
								Manager
							</Label>
							<div class="flex items-center gap-2">
								<UserIcon class="h-4 w-4 text-muted-foreground" />
								<p class="text-sm">{employee.manager?.display_name || 'No manager assigned'}</p>
							</div>
						</div>

						<div class="space-y-2">
							<Label class="text-xs font-medium uppercase tracking-wide text-muted-foreground">
								Work Location
							</Label>
							<div class="flex items-center gap-2">
								<MapPin class="h-4 w-4 text-muted-foreground" />
								<p class="text-sm">{employee.job_info?.isRemote ? 'Remote' : 'On-site'}</p>
							</div>
						</div>

						{#if employee.job_info?.salary && (isOwnProfile || auth.hasPermission('user:view_salary'))}
							<div class="space-y-2">
								<Label class="text-xs font-medium uppercase tracking-wide text-muted-foreground">
									Salary
								</Label>
								<div class="flex items-center gap-2">
									<DollarSign class="h-4 w-4 text-muted-foreground" />
									<p class="text-sm">
										{formatCurrency(employee.job_info.salary)}
										<span class="ml-1 text-xs text-muted-foreground">
											{employee.job_info.payType?.toLowerCase() || 'annually'}
										</span>
									</p>
								</div>
							</div>
						{/if}
					</div>
				</Card.Content>
			</Card.Root>

			<!-- Personal Information -->
			<Card.Root>
				<Card.Header>
					<Card.Title class="flex items-center gap-2">
						<UserIcon class="h-5 w-5" />
						Personal Information
					</Card.Title>
				</Card.Header>
				<Card.Content class="space-y-6">
					<div class="space-y-4">
						<div class="space-y-2">
							<Label class="text-xs font-medium uppercase tracking-wide text-muted-foreground">
								Full Name
							</Label>
							<p class="text-sm">{employee.first_name} {employee.last_name}</p>
						</div>

						{#if employee.addresses && employee.addresses.length > 0}
							{@const address = employee.addresses[0]}
							<div class="space-y-2">
								<Label class="text-xs font-medium uppercase tracking-wide text-muted-foreground">
									Address
								</Label>
								<div class="flex items-start gap-2">
									<MapPin class="mt-0.5 h-4 w-4 flex-shrink-0 text-muted-foreground" />
									<div class="text-sm">
										{#if address.address_line_1}
											<div>{address.address_line_1}</div>
										{/if}
										<div>
											{address.city || ''}{address.city && address.state_province
												? ', '
												: ''}{address.state_province || ''}
											{address.postal_code || ''}
										</div>
									</div>
								</div>
							</div>
						{/if}
					</div>
				</Card.Content>
			</Card.Root>

			<!-- Emergency Contact -->
			{#if employee.emergency_contact}
				<Card.Root>
					<Card.Header>
						<Card.Title class="flex items-center gap-2">
							<Phone class="h-5 w-5" />
							Emergency Contact
						</Card.Title>
					</Card.Header>
					<Card.Content class="space-y-4">
						<div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
							<div class="space-y-2">
								<Label class="text-xs font-medium uppercase tracking-wide text-muted-foreground">
									Name
								</Label>
								<p class="text-sm">{employee.emergency_contact.name || 'N/A'}</p>
							</div>

							<div class="space-y-2">
								<Label class="text-xs font-medium uppercase tracking-wide text-muted-foreground">
									Phone
								</Label>
								<p class="text-sm">{formatPhoneNumber(employee.emergency_contact.phone)}</p>
							</div>

							<div class="space-y-2 sm:col-span-2">
								<Label class="text-xs font-medium uppercase tracking-wide text-muted-foreground">
									Relationship
								</Label>
								<p class="text-sm">{employee.emergency_contact.relationship || 'N/A'}</p>
							</div>
						</div>
					</Card.Content>
				</Card.Root>
			{/if}

			<!-- Roles and Permissions -->
			<Card.Root>
				<Card.Header>
					<Card.Title class="flex items-center gap-2">
						<Shield class="h-5 w-5" />
						Roles & Permissions
					</Card.Title>
				</Card.Header>
				<Card.Content>
					<div class="space-y-2">
						<Label class="text-xs font-medium uppercase tracking-wide text-muted-foreground">
							Assigned Roles
						</Label>
						<div class="flex flex-wrap gap-2">
							{#if employee.role}
								<Badge variant="outline">
									{employee.role}
								</Badge>
							{:else}
								<p class="text-sm text-muted-foreground">No roles assigned</p>
							{/if}
						</div>
					</div>
				</Card.Content>
			</Card.Root>
		</div>
	{/if}
</div>

<!-- Deactivate Modal -->
<Dialog.Root bind:open={showDeactivateModal}>
	<Dialog.Content class="sm:max-w-md">
		<Dialog.Header>
			<Dialog.Title>Deactivate Employee</Dialog.Title>
			<Dialog.Description>
				Are you sure you want to deactivate <strong>{employee?.display_name}</strong>? This will
				prevent them from accessing the system.
			</Dialog.Description>
		</Dialog.Header>

		<div class="space-y-4 py-4">
			<div class="space-y-2">
				<Label for="deactivate-reason">Reason for deactivation (optional)</Label>
				<Textarea
					id="deactivate-reason"
					bind:value={deactivateReason}
					placeholder="Enter reason for deactivation..."
					rows={3}
				/>
			</div>
		</div>

		<Dialog.Footer>
			<Button
				variant="outline"
				onclick={() => (showDeactivateModal = false)}
				disabled={deactivating}
			>
				Cancel
			</Button>
			<Button variant="destructive" onclick={handleDeactivate} disabled={deactivating}>
				{#if deactivating}
					<RefreshCw class="mr-2 h-4 w-4 animate-spin" />
				{/if}
				Deactivate Employee
			</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>
