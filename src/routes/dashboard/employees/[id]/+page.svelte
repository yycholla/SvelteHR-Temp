<script lang="ts">
	import { goto } from '$app/navigation';
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import { Badge } from '$lib/components/ui/badge';
	import { Separator } from '$lib/components/ui/separator';
	import * as Table from '$lib/components/ui/table';
	import * as Accordion from '$lib/components/ui/accordion';
	import AssignDocumentsModal from '$lib/components/employees/AssignDocumentsModal.svelte';
	import AddEmergencyContactModal, {
		type EmergencyContactInput
	} from '$lib/components/employees/AddEmergencyContactModal.svelte';
	import AddVehicleModal, {
		type VehicleInput
	} from '$lib/components/employees/AddVehicleModal.svelte';
	import {
		User,
		ArrowLeft,
		Edit,
		Mail,
		Phone,
		MapPin,
		Calendar,
		Briefcase,
		Building2,
		Clock,
		CheckCircle,
		XCircle,
		AlertCircle,
		Award,
		Plane,
		Car,
		Shield,
		DollarSign,
		FileBarChart,
		FileText,
		Plus
	} from '@lucide/svelte';

	interface Props {
		data: any;
	}

	let { data }: Props = $props();

	// Extract data
	const employee = $derived(data.employee);
	const permissions = $derived(data.permissions);

	// Debug: Log permissions to console
	$effect(() => {
		console.log('[Employee Detail Page] Permissions:', permissions);
		console.log('[Employee Detail Page] canViewContactInfo:', permissions?.canViewContactInfo);
		console.log('[Employee Detail Page] canViewEmergencyContacts:', permissions?.canViewEmergencyContacts);
		console.log('[Employee Detail Page] canViewVehicles:', permissions?.canViewVehicles);
		console.log('[Employee Detail Page] canViewDocuments:', permissions?.canViewDocuments);
	});

	// Modal state
	let isAssignDocsModalOpen = $state(false);
	let isAssigningDocs = $state(false);
	let isAddEmergencyContactModalOpen = $state(false);
	let isAddingEmergencyContact = $state(false);
	let isAddVehicleModalOpen = $state(false);
	let isAddingVehicle = $state(false);

	// Handle document assignment
	async function handleAssignDocuments(documentIds: string[]) {
		isAssigningDocs = true;
		try {
			const response = await fetch(`/api/employees/${employee.id}/assign-documents`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ documentIds })
			});

			if (!response.ok) {
				throw new Error('Failed to assign documents');
			}

			const result = await response.json();
			alert(`${result.message}\n\nAssigned: ${result.assignedCount}\nSkipped (already assigned): ${result.skippedCount}`);

			// Close modal and reload page
			isAssignDocsModalOpen = false;
			window.location.reload();
		} catch (error) {
			console.error('Assignment error:', error);
			alert('Failed to assign documents. Please try again.');
		} finally {
			isAssigningDocs = false;
		}
	}

	// Handle emergency contact creation
	async function handleAddEmergencyContact(contact: EmergencyContactInput) {
		isAddingEmergencyContact = true;
		try {
			const response = await fetch(`/api/graphql`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					query: `
						mutation CreateEmergencyContact($input: CreateEmergencyContactInput!) {
							createEmergencyContact(input: $input) {
								id
								name
								relationship
								phoneNumber
								email
								isPrimary
								createdAt
								updatedAt
							}
						}
					`,
					variables: {
						input: contact
					}
				})
			});

			const result = await response.json();

			if (result.errors) {
				throw new Error(result.errors[0].message);
			}

			alert('Emergency contact added successfully!');
			isAddEmergencyContactModalOpen = false;
			window.location.reload();
		} catch (error) {
			console.error('Failed to add emergency contact:', error);
			alert('Failed to add emergency contact. Please try again.');
		} finally {
			isAddingEmergencyContact = false;
		}
	}

	// Handle vehicle creation
	async function handleAddVehicle(vehicle: VehicleInput) {
		isAddingVehicle = true;
		try {
			const response = await fetch(`/api/graphql`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					query: `
						mutation CreateEmployeeVehicle($input: CreateEmployeeVehicleInput!) {
							createEmployeeVehicle(input: $input) {
								id
								make
								model
								year
								licensePlate
								color
								createdAt
								updatedAt
							}
						}
					`,
					variables: {
						input: vehicle
					}
				})
			});

			const result = await response.json();

			if (result.errors) {
				throw new Error(result.errors[0].message);
			}

			alert('Vehicle added successfully!');
			isAddVehicleModalOpen = false;
			window.location.reload();
		} catch (error) {
			console.error('Failed to add vehicle:', error);
			alert('Failed to add vehicle. Please try again.');
		} finally {
			isAddingVehicle = false;
		}
	}

	// Format date helper
	function formatDate(dateString: string | null): string {
		if (!dateString) return 'N/A';
		return new Date(dateString).toLocaleDateString('en-US', {
			year: 'numeric',
			month: 'long',
			day: 'numeric'
		});
	}

	// Format role for display
	function formatRole(role: string): string {
		return role.replace('_', ' ').replace(/\b\w/g, (l) => l.toUpperCase());
	}

	// Get status badge variant
	function getStatusBadgeVariant(isActive: boolean): 'default' | 'secondary' {
		return isActive ? 'default' : 'secondary';
	}
</script>

<svelte:head>
	<title>{employee.displayName} - Employee Profile - SvelteHR</title>
	<meta name="description" content="Employee profile for {employee.displayName}" />
</svelte:head>

<div class="container mx-auto max-w-7xl px-4 py-6">
	<!-- Back Button and Header -->
	<div class="mb-4 flex items-center justify-between">
		<div class="flex items-center gap-4">
			<Button variant="outline" size="sm" onclick={() => goto('/dashboard/employees')}>
				<ArrowLeft class="mr-2 h-4 w-4" />
				Back
			</Button>
			<div>
				<h1 class="text-2xl font-bold text-foreground">{employee.displayName}</h1>
				<p class="text-sm text-muted-foreground">{formatRole(employee.role)}</p>
			</div>
		</div>
		<div class="flex gap-2">
			{#if permissions.canManageEmployees}
				<Button href="/dashboard/employees/{employee.id}/edit" size="sm">
					<Edit class="mr-2 h-4 w-4" />
					Edit
				</Button>
			{/if}
			{#if permissions.canCreateReviews}
				<Button href="/dashboard/reviews?employee={employee.id}" size="sm" variant="outline">
					<FileBarChart class="mr-2 h-4 w-4" />
					Review
				</Button>
			{/if}
		</div>
	</div>

	<!-- Compact Single Card Dashboard -->
	<Card.Root class="w-full">
		<!-- Header with Status and Quick Stats -->
		<Card.Header class="pb-3">
			<div class="flex flex-col gap-3">
				<div class="flex items-center justify-between">
					<div class="flex items-center gap-3">
						<Badge variant={getStatusBadgeVariant(employee.isActive)} class="text-xs px-2 py-0.5">
							{employee.isActive ? 'Active' : 'Inactive'}
						</Badge>
						{#if employee.department}
							<span class="text-xs text-muted-foreground flex items-center gap-1">
								<Building2 class="h-3 w-3" />
								{employee.department.name}
							</span>
						{/if}
					</div>
					<div class="flex gap-4 text-xs text-muted-foreground">
						<span class="flex items-center gap-1">
							<Plane class="h-3 w-3" />
							{employee.leaveRequestCount}
						</span>
						<span class="flex items-center gap-1">
							<Award class="h-3 w-3" />
							{employee.performanceReviewCount}
						</span>
						{#if permissions.canViewDocuments}
							<span class="flex items-center gap-1">
								<FileText class="h-3 w-3" />
								{employee.documentsCount}
							</span>
						{/if}
					</div>
				</div>

				<!-- Quick Overview - 4 Column Dense Grid -->
				<div class="grid grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-2 pt-2 pb-1 border-t text-xs">
					<div class="flex items-center gap-1.5 min-w-0">
						<Mail class="h-3 w-3 text-muted-foreground shrink-0" />
						<div class="min-w-0 flex-1">
							<p class="text-[10px] text-muted-foreground uppercase tracking-wide">Email</p>
							<p class="font-medium truncate">{employee.email}</p>
						</div>
					</div>
					<div class="flex items-center gap-1.5 min-w-0">
						<Briefcase class="h-3 w-3 text-muted-foreground shrink-0" />
						<div class="min-w-0 flex-1">
							<p class="text-[10px] text-muted-foreground uppercase tracking-wide">Role</p>
							<p class="font-medium truncate">{formatRole(employee.role)}</p>
						</div>
					</div>
					<div class="flex items-center gap-1.5 min-w-0">
						<Calendar class="h-3 w-3 text-muted-foreground shrink-0" />
						<div class="min-w-0 flex-1">
							<p class="text-[10px] text-muted-foreground uppercase tracking-wide">Hired</p>
							<p class="font-medium truncate">{formatDate(employee.hireDate)}</p>
						</div>
					</div>
					{#if employee.department?.userByManagerId}
						<div class="flex items-center gap-1.5 min-w-0">
							<User class="h-3 w-3 text-muted-foreground shrink-0" />
							<div class="min-w-0 flex-1">
								<p class="text-[10px] text-muted-foreground uppercase tracking-wide">Manager</p>
								<p class="font-medium truncate">{employee.department.userByManagerId.displayName}</p>
							</div>
						</div>
					{:else if employee.lastLogin}
						<div class="flex items-center gap-1.5 min-w-0">
							<Clock class="h-3 w-3 text-muted-foreground shrink-0" />
							<div class="min-w-0 flex-1">
								<p class="text-[10px] text-muted-foreground uppercase tracking-wide">Last Login</p>
								<p class="font-medium truncate">{formatDate(employee.lastLogin)}</p>
							</div>
						</div>
					{/if}
				</div>
			</div>
		</Card.Header>

		<Separator />

		<!-- Compact Accordions -->
		<Card.Content class="p-0">
			<Accordion.Root type="multiple" class="w-full">
				<!-- Contact Information -->
				{#if permissions.canViewContactInfo}
					<Accordion.Item value="contact" class="border-b last:border-b-0">
						<Accordion.Trigger class="px-4 py-3 hover:bg-muted/50 text-sm font-medium">
							<div class="flex items-center gap-2">
								<Phone class="h-4 w-4" />
								<span>Contact</span>
							</div>
						</Accordion.Trigger>
						<Accordion.Content class="px-4 pb-4">
							<div class="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
								<!-- Phone Numbers -->
								<div class="space-y-2">
									<h4 class="font-semibold text-foreground flex items-center gap-1.5">
										<Phone class="h-3 w-3" />
										Phone Numbers
									</h4>
									{#if employee.phoneNumber || employee.mobileNumber}
										<div class="grid gap-1.5">
											{#if employee.phoneNumber}
												<div class="flex justify-between">
													<span class="text-muted-foreground">Primary</span>
													<span class="font-medium">{employee.phoneNumber}</span>
												</div>
											{/if}
											{#if employee.mobileNumber}
												<div class="flex justify-between">
													<span class="text-muted-foreground">Mobile</span>
													<span class="font-medium">{employee.mobileNumber}</span>
												</div>
											{/if}
										</div>
									{:else}
										<p class="text-muted-foreground">No phone numbers</p>
									{/if}
								</div>

								<!-- Address -->
								<div class="space-y-2">
									<h4 class="font-semibold text-foreground flex items-center gap-1.5">
										<MapPin class="h-3 w-3" />
										Address
									</h4>
									{#if employee.addressLine1}
										<div class="text-muted-foreground leading-relaxed">
											<p>{employee.addressLine1}</p>
											{#if employee.addressLine2}
												<p>{employee.addressLine2}</p>
											{/if}
											<p>{employee.city}, {employee.stateProvince} {employee.postalCode}</p>
											<p>{employee.country || 'United States'}</p>
										</div>
									{:else}
										<p class="text-muted-foreground">No address</p>
									{/if}
								</div>
							</div>
						</Accordion.Content>
					</Accordion.Item>
				{/if}

				<!-- Emergency Contacts -->
				{#if permissions.canViewEmergencyContacts}
					<Accordion.Item value="emergency" class="border-b last:border-b-0">
						<Accordion.Trigger class="px-4 py-3 hover:bg-muted/50 text-sm font-medium">
							<div class="flex items-center gap-2">
								<Shield class="h-4 w-4" />
								<span>Emergency Contacts</span>
								{#if employee.emergencyContacts?.length}
									<Badge variant="secondary" class="ml-1 text-[10px] px-1.5 py-0">
										{employee.emergencyContacts.length}
									</Badge>
								{/if}
							</div>
						</Accordion.Trigger>
						<Accordion.Content class="px-4 pb-4">
							{#if permissions.canManageEmployees || permissions.isViewingSelf}
								<Button onclick={() => (isAddEmergencyContactModalOpen = true)} size="sm" variant="outline" class="mb-3 h-7 text-xs">
									<Plus class="mr-1 h-3 w-3" />
									Add Contact
								</Button>
							{/if}
							{#if employee.emergencyContacts && employee.emergencyContacts.length > 0}
								<div class="grid gap-2">
									{#each employee.emergencyContacts as contact}
										<div class="rounded border p-2.5 text-xs">
											<div class="flex items-center justify-between mb-2">
												<h4 class="font-semibold">{contact.name}</h4>
												{#if contact.isPrimary}
													<Badge variant="default" class="text-[10px] px-1.5 py-0">Primary</Badge>
												{/if}
											</div>
											<div class="grid grid-cols-2 gap-x-3 gap-y-1 text-[11px]">
												{#if contact.relationship}
													<div class="flex justify-between col-span-2 md:col-span-1">
														<span class="text-muted-foreground">Relationship</span>
														<span class="font-medium">{contact.relationship}</span>
													</div>
												{/if}
												<div class="flex justify-between col-span-2 md:col-span-1">
													<span class="text-muted-foreground">Phone</span>
													<span class="font-medium">{contact.phoneNumber}</span>
												</div>
												{#if contact.email}
													<div class="flex justify-between col-span-2">
														<span class="text-muted-foreground">Email</span>
														<span class="font-medium truncate ml-2">{contact.email}</span>
													</div>
												{/if}
											</div>
										</div>
									{/each}
								</div>
							{:else}
								<p class="text-xs text-muted-foreground text-center py-4">No emergency contacts</p>
							{/if}
						</Accordion.Content>
					</Accordion.Item>
				{/if}

				<!-- Vehicles -->
				{#if permissions.canViewVehicles}
					<Accordion.Item value="vehicles" class="border-b last:border-b-0">
						<Accordion.Trigger class="px-4 py-3 hover:bg-muted/50 text-sm font-medium">
							<div class="flex items-center gap-2">
								<Car class="h-4 w-4" />
								<span>Vehicles</span>
								{#if employee.vehicles?.length}
									<Badge variant="secondary" class="ml-1 text-[10px] px-1.5 py-0">
										{employee.vehicles.length}
									</Badge>
								{/if}
							</div>
						</Accordion.Trigger>
						<Accordion.Content class="px-4 pb-4">
							{#if permissions.canManageEmployees || permissions.isViewingSelf}
								<Button onclick={() => (isAddVehicleModalOpen = true)} size="sm" variant="outline" class="mb-3 h-7 text-xs">
									<Plus class="mr-1 h-3 w-3" />
									Add Vehicle
								</Button>
							{/if}
							{#if employee.vehicles && employee.vehicles.length > 0}
								<div class="grid md:grid-cols-2 gap-2">
									{#each employee.vehicles as vehicle}
										<div class="rounded border p-2.5 text-xs">
											<h4 class="font-semibold mb-1.5">
												{vehicle.year} {vehicle.make} {vehicle.model}
											</h4>
											<div class="grid grid-cols-2 gap-x-3 gap-y-1 text-[11px]">
												{#if vehicle.color}
													<div class="flex justify-between">
														<span class="text-muted-foreground">Color</span>
														<span class="font-medium">{vehicle.color}</span>
													</div>
												{/if}
												<div class="flex justify-between">
													<span class="text-muted-foreground">Plate</span>
													<span class="font-medium">{vehicle.licensePlate}</span>
												</div>
											</div>
										</div>
									{/each}
								</div>
							{:else}
								<p class="text-xs text-muted-foreground text-center py-4">No vehicles</p>
							{/if}
						</Accordion.Content>
					</Accordion.Item>
				{/if}

				<!-- Leave Requests -->
				<Accordion.Item value="leave" class="border-b last:border-b-0">
					<Accordion.Trigger class="px-4 py-3 hover:bg-muted/50 text-sm font-medium">
						<div class="flex items-center gap-2">
							<Plane class="h-4 w-4" />
							<span>Leave Requests</span>
							<Badge variant="secondary" class="ml-1 text-[10px] px-1.5 py-0">
								{employee.leaveRequestCount}
							</Badge>
						</div>
					</Accordion.Trigger>
					<Accordion.Content class="px-4 pb-4">
						{#if employee.leaveRequests && employee.leaveRequests.length > 0}
							<div class="rounded border overflow-hidden">
								<div class="overflow-x-auto">
									<table class="w-full text-xs">
										<thead class="bg-muted/50">
											<tr class="border-b">
												<th class="px-2 py-1.5 text-left font-medium">Type</th>
												<th class="px-2 py-1.5 text-left font-medium">Start</th>
												<th class="px-2 py-1.5 text-left font-medium">End</th>
												<th class="px-2 py-1.5 text-left font-medium">Status</th>
												<th class="px-2 py-1.5 text-left font-medium">Reason</th>
											</tr>
										</thead>
										<tbody>
											{#each employee.leaveRequests as request}
												<tr class="border-b last:border-b-0">
													<td class="px-2 py-1.5 font-medium">{request.leaveType}</td>
													<td class="px-2 py-1.5 text-muted-foreground">{formatDate(request.startDate)}</td>
													<td class="px-2 py-1.5 text-muted-foreground">{formatDate(request.endDate)}</td>
													<td class="px-2 py-1.5">
														<Badge class="text-[10px] px-1.5 py-0">{request.status}</Badge>
													</td>
													<td class="px-2 py-1.5 text-muted-foreground truncate max-w-xs">
														{request.reason || 'N/A'}
													</td>
												</tr>
											{/each}
										</tbody>
									</table>
								</div>
							</div>
						{:else}
							<p class="text-xs text-muted-foreground text-center py-4">No leave requests</p>
						{/if}
					</Accordion.Content>
				</Accordion.Item>

				<!-- Performance Reviews -->
				<Accordion.Item value="reviews" class="border-b last:border-b-0">
					<Accordion.Trigger class="px-4 py-3 hover:bg-muted/50 text-sm font-medium">
						<div class="flex items-center gap-2">
							<Award class="h-4 w-4" />
							<span>Performance Reviews</span>
							<Badge variant="secondary" class="ml-1 text-[10px] px-1.5 py-0">
								{employee.performanceReviewCount}
							</Badge>
						</div>
					</Accordion.Trigger>
					<Accordion.Content class="px-4 pb-4">
						{#if employee.performanceReviews && employee.performanceReviews.length > 0}
							<div class="rounded border overflow-hidden">
								<div class="overflow-x-auto">
									<table class="w-full text-xs">
										<thead class="bg-muted/50">
											<tr class="border-b">
												<th class="px-2 py-1.5 text-left font-medium">Period</th>
												<th class="px-2 py-1.5 text-left font-medium">Rating</th>
												<th class="px-2 py-1.5 text-left font-medium">Status</th>
												<th class="px-2 py-1.5 text-left font-medium">Reviewer</th>
												<th class="px-2 py-1.5 text-left font-medium">Date</th>
											</tr>
										</thead>
										<tbody>
											{#each employee.performanceReviews as review}
												<tr class="border-b last:border-b-0">
													<td class="px-2 py-1.5 font-medium">{review.reviewPeriod}</td>
													<td class="px-2 py-1.5">
														{review.overallRating ? `${review.overallRating}/5.0` : 'N/A'}
													</td>
													<td class="px-2 py-1.5">
														<Badge class="text-[10px] px-1.5 py-0">{review.status}</Badge>
													</td>
													<td class="px-2 py-1.5 text-muted-foreground">
														{review.reviewer?.displayName || 'N/A'}
													</td>
													<td class="px-2 py-1.5 text-muted-foreground">{formatDate(review.createdAt)}</td>
												</tr>
											{/each}
										</tbody>
									</table>
								</div>
							</div>
						{:else}
							<p class="text-xs text-muted-foreground text-center py-4">No performance reviews</p>
						{/if}
					</Accordion.Content>
				</Accordion.Item>

				<!-- Leave Balances -->
				<Accordion.Item value="timeoff" class="border-b last:border-b-0">
					<Accordion.Trigger class="px-4 py-3 hover:bg-muted/50 text-sm font-medium">
						<div class="flex items-center gap-2">
							<Calendar class="h-4 w-4" />
							<span>Leave Balances</span>
						</div>
					</Accordion.Trigger>
					<Accordion.Content class="px-4 pb-4">
						{#if employee.leaveBalances && employee.leaveBalances.length > 0}
							<div class="grid md:grid-cols-3 gap-2">
								{#each employee.leaveBalances as balance}
									<div class="rounded border p-2.5 text-xs">
										<h4 class="font-semibold mb-1.5 text-foreground">{balance.leaveTypeName}</h4>
										<div class="space-y-1 text-[11px]">
											<div class="flex justify-between">
												<span class="text-muted-foreground">Year</span>
												<span class="font-medium">{balance.year}</span>
											</div>
											<div class="flex justify-between">
												<span class="text-muted-foreground">Total</span>
												<span class="font-medium">{balance.totalDays}</span>
											</div>
											<div class="flex justify-between">
												<span class="text-muted-foreground">Used</span>
												<span class="font-medium">{balance.usedDays}</span>
											</div>
											<Separator class="my-1" />
											<div class="flex justify-between">
												<span class="font-medium text-foreground">Remaining</span>
												<span class="font-bold text-primary">{balance.remainingDays}</span>
											</div>
										</div>
									</div>
								{/each}
							</div>
						{:else}
							<p class="text-xs text-muted-foreground text-center py-4">No leave balances</p>
						{/if}
					</Accordion.Content>
				</Accordion.Item>

				<!-- Documents -->
				{#if permissions.canViewDocuments}
					<Accordion.Item value="documents" class="border-b-0">
						<Accordion.Trigger class="px-4 py-3 hover:bg-muted/50 text-sm font-medium">
							<div class="flex items-center gap-2">
								<FileText class="h-4 w-4" />
								<span>Documents</span>
								<Badge variant="secondary" class="ml-1 text-[10px] px-1.5 py-0">
									{employee.documentsCount}
								</Badge>
							</div>
						</Accordion.Trigger>
						<Accordion.Content class="px-4 pb-4">
							{#if permissions.canAssignDocuments}
								<Button onclick={() => isAssignDocsModalOpen = true} size="sm" variant="outline" class="mb-3 h-7 text-xs">
									<Plus class="mr-1 h-3 w-3" />
									Assign
								</Button>
							{/if}
							{#if employee.assignedDocuments && employee.assignedDocuments.length > 0}
								<div class="rounded border overflow-hidden">
									<div class="overflow-x-auto">
										<table class="w-full text-xs">
											<thead class="bg-muted/50">
												<tr class="border-b">
													<th class="px-2 py-1.5 text-left font-medium">Filename</th>
													<th class="px-2 py-1.5 text-left font-medium">Category</th>
													<th class="px-2 py-1.5 text-left font-medium">Sensitivity</th>
													<th class="px-2 py-1.5 text-left font-medium">Assigned</th>
													<th class="px-2 py-1.5 text-right font-medium">Actions</th>
												</tr>
											</thead>
											<tbody>
												{#each employee.assignedDocuments as document}
													<tr class="border-b last:border-b-0 hover:bg-muted/30 cursor-pointer" onclick={() => goto(`/dashboard/documents/${document.id}`)}>
														<td class="px-2 py-1.5 font-medium">
															<div class="flex items-center gap-1.5">
																<FileText class="h-3 w-3 text-muted-foreground" />
																<span class="truncate">{document.filename}</span>
															</div>
														</td>
														<td class="px-2 py-1.5 text-muted-foreground">{document.category}</td>
														<td class="px-2 py-1.5">
															<Badge variant={document.sensitivityLevel === 'Public' ? 'secondary' : 'default'} class="text-[10px] px-1.5 py-0">
																{document.sensitivityLevel}
															</Badge>
														</td>
														<td class="px-2 py-1.5 text-muted-foreground">
															{new Date(document.assignedAt).toLocaleDateString()}
														</td>
														<td class="px-2 py-1.5 text-right">
															<Button
																href="/dashboard/documents/{document.id}"
																size="sm"
																variant="ghost"
																class="h-6 px-2 text-[11px]"
																onclick={(e) => {
																	e.stopPropagation();
																	goto(`/dashboard/documents/${document.id}`);
																}}
															>
																View
															</Button>
														</td>
													</tr>
												{/each}
											</tbody>
										</table>
									</div>
								</div>
							{:else}
								<div class="text-center py-6">
									<FileText class="mx-auto h-8 w-8 text-muted-foreground/30 mb-2" />
									<p class="text-xs font-medium mb-1">No documents assigned</p>
									<p class="text-[11px] text-muted-foreground mb-3">
										This employee hasn't been assigned any documents.
									</p>
									{#if permissions.canAssignDocuments}
										<Button onclick={() => isAssignDocsModalOpen = true} size="sm" class="h-7 text-xs">
											<Plus class="mr-1 h-3 w-3" />
											Assign Documents
										</Button>
									{/if}
								</div>
							{/if}
						</Accordion.Content>
					</Accordion.Item>
				{/if}
			</Accordion.Root>
		</Card.Content>
	</Card.Root>
</div>

<!-- Assign Documents Modal -->
{#if permissions.canAssignDocuments}
	<AssignDocumentsModal
		isOpen={isAssignDocsModalOpen}
		employeeId={employee.id}
		employeeName={employee.displayName}
		availableDocuments={data.availableDocuments || []}
		onAssign={handleAssignDocuments}
		onClose={() => (isAssignDocsModalOpen = false)}
		isSubmitting={isAssigningDocs}
	/>
{/if}

<!-- Add Emergency Contact Modal -->
{#if permissions.canViewEmergencyContacts && (permissions.canManageEmployees || permissions.isViewingSelf)}
	<AddEmergencyContactModal
		isOpen={isAddEmergencyContactModalOpen}
		employeeId={employee.id}
		employeeName={employee.displayName}
		onSave={handleAddEmergencyContact}
		onClose={() => (isAddEmergencyContactModalOpen = false)}
		isSubmitting={isAddingEmergencyContact}
	/>
{/if}

<!-- Add Vehicle Modal -->
{#if permissions.canViewVehicles && (permissions.canManageEmployees || permissions.isViewingSelf)}
	<AddVehicleModal
		isOpen={isAddVehicleModalOpen}
		employeeId={employee.id}
		employeeName={employee.displayName}
		onSave={handleAddVehicle}
		onClose={() => (isAddVehicleModalOpen = false)}
		isSubmitting={isAddingVehicle}
	/>
{/if}
