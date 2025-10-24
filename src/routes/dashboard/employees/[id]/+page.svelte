<script lang="ts">
	import { goto } from '$app/navigation';
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import { Badge } from '$lib/components/ui/badge';
	import { Separator } from '$lib/components/ui/separator';
	import * as Table from '$lib/components/ui/table';
	import * as Tabs from '$lib/components/ui/tabs';
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

<div class="container mx-auto max-w-7xl px-4 py-8">
	<!-- Back Button and Header -->
	<div class="mb-6 flex items-center justify-between">
		<div class="flex items-center gap-4">
			<Button variant="outline" size="sm" onclick={() => goto('/dashboard/employees')}>
				<ArrowLeft class="mr-2 h-4 w-4" />
				Back to Employees
			</Button>
			<div>
				<h1 class="text-3xl font-bold text-foreground">{employee.displayName}</h1>
				<p class="text-muted-foreground">{formatRole(employee.role)}</p>
			</div>
		</div>
		<div class="flex gap-2">
			{#if permissions.canManageEmployees}
				<Button href="/dashboard/employees/{employee.id}/edit">
					<Edit class="mr-2 h-4 w-4" />
					Edit Employee
				</Button>
			{/if}
			{#if permissions.canCreateReviews}
				<Button href="/dashboard/reviews?employee={employee.id}">
					<FileBarChart class="mr-2 h-4 w-4" />
					Start Review
				</Button>
			{/if}
		</div>
	</div>

	<!-- Status Badge -->
	<div class="mb-6">
		<Badge variant={getStatusBadgeVariant(employee.isActive)}>
			{employee.isActive ? 'Active' : 'Inactive'}
		</Badge>
	</div>

	<!-- Tabs for Different Sections -->
	<Tabs.Root value="overview" class="w-full">
		<Tabs.List class="grid w-full grid-cols-3 lg:grid-cols-8">
			<Tabs.Trigger value="overview">Overview</Tabs.Trigger>
			{#if permissions.canViewContactInfo}
				<Tabs.Trigger value="contact">Contact</Tabs.Trigger>
			{/if}
			{#if permissions.canViewEmergencyContacts}
				<Tabs.Trigger value="emergency">Emergency</Tabs.Trigger>
			{/if}
			{#if permissions.canViewVehicles}
				<Tabs.Trigger value="vehicles">Vehicles</Tabs.Trigger>
			{/if}
			<Tabs.Trigger value="leave">Leave</Tabs.Trigger>
			<Tabs.Trigger value="reviews">Reviews</Tabs.Trigger>
			<Tabs.Trigger value="timeoff">Time Off</Tabs.Trigger>
			{#if permissions.canViewDocuments}
				<Tabs.Trigger value="documents">Documents</Tabs.Trigger>
			{/if}
		</Tabs.List>

		<!-- Overview Tab -->
		<Tabs.Content value="overview" class="mt-6">
			<div class="grid gap-6 md:grid-cols-2">
				<!-- Basic Information Card -->
				<Card.Root>
					<Card.Header>
						<Card.Title class="flex items-center gap-2">
							<User class="h-5 w-5" />
							Basic Information
						</Card.Title>
					</Card.Header>
					<Card.Content class="space-y-4">
						<div class="flex items-start gap-3">
							<Mail class="mt-1 h-4 w-4 text-muted-foreground" />
							<div>
								<p class="text-sm font-medium text-foreground">Email</p>
								<p class="text-sm text-muted-foreground">{employee.email}</p>
							</div>
						</div>
						<div class="flex items-start gap-3">
							<Briefcase class="mt-1 h-4 w-4 text-muted-foreground" />
							<div>
								<p class="text-sm font-medium text-foreground">Role</p>
								<p class="text-sm text-muted-foreground">{formatRole(employee.role)}</p>
							</div>
						</div>
						<div class="flex items-start gap-3">
							<Calendar class="mt-1 h-4 w-4 text-muted-foreground" />
							<div>
								<p class="text-sm font-medium text-foreground">Hire Date</p>
								<p class="text-sm text-muted-foreground">{formatDate(employee.hireDate)}</p>
							</div>
						</div>
						{#if employee.lastLogin}
							<div class="flex items-start gap-3">
								<Clock class="mt-1 h-4 w-4 text-muted-foreground" />
								<div>
									<p class="text-sm font-medium text-foreground">Last Login</p>
									<p class="text-sm text-muted-foreground">{formatDate(employee.lastLogin)}</p>
								</div>
							</div>
						{/if}
					</Card.Content>
				</Card.Root>

				<!-- Department Information Card -->
				{#if employee.department}
					<Card.Root>
						<Card.Header>
							<Card.Title class="flex items-center gap-2">
								<Building2 class="h-5 w-5" />
								Department
							</Card.Title>
						</Card.Header>
						<Card.Content class="space-y-4">
							<div>
								<p class="text-sm font-medium text-foreground">Department Name</p>
								<p class="text-sm text-muted-foreground">{employee.department.name}</p>
							</div>
							{#if employee.department.description}
								<div>
									<p class="text-sm font-medium text-foreground">Description</p>
									<p class="text-sm text-muted-foreground">{employee.department.description}</p>
								</div>
							{/if}
							{#if employee.department.userByManagerId}
								<div>
									<p class="text-sm font-medium text-foreground">Manager</p>
									<p class="text-sm text-muted-foreground">
										{employee.department.userByManagerId.displayName}
									</p>
								</div>
							{/if}
						</Card.Content>
					</Card.Root>
				{/if}
			</div>
		</Tabs.Content>

		<!-- Contact Information Tab -->
		{#if permissions.canViewContactInfo}
			<Tabs.Content value="contact" class="mt-6">
				<Card.Root>
					<Card.Header>
						<Card.Title class="flex items-center gap-2">
							<Phone class="h-5 w-5" />
							Contact Information
						</Card.Title>
					</Card.Header>
					<Card.Content>
						<div class="grid gap-6 md:grid-cols-2">
							<!-- Phone Numbers -->
							<div class="space-y-4">
								<h3 class="text-sm font-semibold text-foreground">Phone Numbers</h3>
								{#if employee.phoneNumber}
									<div>
										<p class="text-sm font-medium text-foreground">Primary Phone</p>
										<p class="text-sm text-muted-foreground">{employee.phoneNumber}</p>
									</div>
								{/if}
								{#if employee.mobileNumber}
									<div>
										<p class="text-sm font-medium text-foreground">Mobile</p>
										<p class="text-sm text-muted-foreground">{employee.mobileNumber}</p>
									</div>
								{/if}
								{#if !employee.phoneNumber && !employee.mobileNumber}
									<p class="text-sm text-muted-foreground">No phone numbers on file</p>
								{/if}
							</div>

							<!-- Address -->
							<div class="space-y-4">
								<h3 class="text-sm font-semibold text-foreground">Address</h3>
								{#if employee.addressLine1}
									<div class="flex items-start gap-2">
										<MapPin class="mt-1 h-4 w-4 text-muted-foreground" />
										<div class="text-sm text-muted-foreground">
											<p>{employee.addressLine1}</p>
											{#if employee.addressLine2}
												<p>{employee.addressLine2}</p>
											{/if}
											<p>
												{employee.city}, {employee.stateProvince} {employee.postalCode}
											</p>
											<p>{employee.country || 'United States'}</p>
										</div>
									</div>
								{:else}
									<p class="text-sm text-muted-foreground">No address on file</p>
								{/if}
							</div>
						</div>
					</Card.Content>
				</Card.Root>
			</Tabs.Content>
		{/if}

		<!-- Emergency Contacts Tab -->
		{#if permissions.canViewEmergencyContacts}
			<Tabs.Content value="emergency" class="mt-6">
				<Card.Root>
					<Card.Header>
						<div class="flex items-center justify-between">
							<Card.Title class="flex items-center gap-2">
								<Shield class="h-5 w-5" />
								Emergency Contacts
							</Card.Title>
							{#if permissions.canManageEmployees || permissions.isViewingSelf}
								<Button onclick={() => (isAddEmergencyContactModalOpen = true)} size="sm">
									<Plus class="mr-2 h-4 w-4" />
									Add Contact
								</Button>
							{/if}
						</div>
					</Card.Header>
					<Card.Content>
						{#if employee.emergencyContacts && employee.emergencyContacts.length > 0}
							<div class="space-y-6">
								{#each employee.emergencyContacts as contact}
									<div class="rounded-lg border border-border p-4">
										<div class="mb-3 flex items-center justify-between">
											<h3 class="text-lg font-semibold text-foreground">{contact.name}</h3>
											{#if contact.isPrimary}
												<Badge variant="default">Primary</Badge>
											{/if}
										</div>
										<div class="grid gap-3 md:grid-cols-2">
											{#if contact.relationship}
												<div>
													<p class="text-sm font-medium text-foreground">Relationship</p>
													<p class="text-sm text-muted-foreground">{contact.relationship}</p>
												</div>
											{/if}
											<div>
												<p class="text-sm font-medium text-foreground">Phone</p>
												<p class="text-sm text-muted-foreground">{contact.phoneNumber}</p>
											</div>
											{#if contact.email}
												<div>
													<p class="text-sm font-medium text-foreground">Email</p>
													<p class="text-sm text-muted-foreground">{contact.email}</p>
												</div>
											{/if}
										</div>
									</div>
								{/each}
							</div>
						{:else}
							<p class="text-center text-sm text-muted-foreground">No emergency contacts on file</p>
						{/if}
					</Card.Content>
				</Card.Root>
			</Tabs.Content>
		{/if}

		<!-- Vehicles Tab -->
		{#if permissions.canViewVehicles}
			<Tabs.Content value="vehicles" class="mt-6">
				<Card.Root>
					<Card.Header>
						<div class="flex items-center justify-between">
							<Card.Title class="flex items-center gap-2">
								<Car class="h-5 w-5" />
								Vehicles
							</Card.Title>
							{#if permissions.canManageEmployees || permissions.isViewingSelf}
								<Button onclick={() => (isAddVehicleModalOpen = true)} size="sm">
									<Plus class="mr-2 h-4 w-4" />
									Add Vehicle
								</Button>
							{/if}
						</div>
					</Card.Header>
					<Card.Content>
						{#if employee.vehicles && employee.vehicles.length > 0}
							<div class="space-y-6">
								{#each employee.vehicles as vehicle}
									<div class="rounded-lg border border-border p-4">
										<h3 class="mb-3 text-lg font-semibold text-foreground">
											{vehicle.year} {vehicle.make} {vehicle.model}
										</h3>
										<div class="grid gap-3 md:grid-cols-2">
											{#if vehicle.color}
												<div>
													<p class="text-sm font-medium text-foreground">Color</p>
													<p class="text-sm text-muted-foreground">{vehicle.color}</p>
												</div>
											{/if}
											<div>
												<p class="text-sm font-medium text-foreground">License Plate</p>
												<p class="text-sm text-muted-foreground">{vehicle.licensePlate}</p>
											</div>
										</div>
									</div>
								{/each}
							</div>
						{:else}
							<p class="text-center text-sm text-muted-foreground">No vehicles on file</p>
						{/if}
					</Card.Content>
				</Card.Root>
			</Tabs.Content>
		{/if}

		<!-- Leave Requests Tab -->
		<Tabs.Content value="leave" class="mt-6">
			<Card.Root>
				<Card.Header>
					<Card.Title class="flex items-center gap-2">
						<Plane class="h-5 w-5" />
						Leave Requests ({employee.leaveRequestCount})
					</Card.Title>
				</Card.Header>
				<Card.Content>
					{#if employee.leaveRequests && employee.leaveRequests.length > 0}
						<Table.Root>
							<Table.Header>
								<Table.Row>
									<Table.Head>Type</Table.Head>
									<Table.Head>Start Date</Table.Head>
									<Table.Head>End Date</Table.Head>
									<Table.Head>Status</Table.Head>
									<Table.Head>Reason</Table.Head>
								</Table.Row>
							</Table.Header>
							<Table.Body>
								{#each employee.leaveRequests as request}
									<Table.Row>
										<Table.Cell class="font-medium">{request.leaveType}</Table.Cell>
										<Table.Cell>{formatDate(request.startDate)}</Table.Cell>
										<Table.Cell>{formatDate(request.endDate)}</Table.Cell>
										<Table.Cell>
											<Badge>{request.status}</Badge>
										</Table.Cell>
										<Table.Cell class="max-w-xs truncate">
											{request.reason || 'N/A'}
										</Table.Cell>
									</Table.Row>
								{/each}
							</Table.Body>
						</Table.Root>
					{:else}
						<p class="text-center text-sm text-muted-foreground">No leave requests</p>
					{/if}
				</Card.Content>
			</Card.Root>
		</Tabs.Content>

		<!-- Performance Reviews Tab -->
		<Tabs.Content value="reviews" class="mt-6">
			<Card.Root>
				<Card.Header>
					<Card.Title class="flex items-center gap-2">
						<Award class="h-5 w-5" />
						Performance Reviews ({employee.performanceReviewCount})
					</Card.Title>
				</Card.Header>
				<Card.Content>
					{#if employee.performanceReviews && employee.performanceReviews.length > 0}
						<Table.Root>
							<Table.Header>
								<Table.Row>
									<Table.Head>Period</Table.Head>
									<Table.Head>Rating</Table.Head>
									<Table.Head>Status</Table.Head>
									<Table.Head>Reviewer</Table.Head>
									<Table.Head>Date</Table.Head>
								</Table.Row>
							</Table.Header>
							<Table.Body>
								{#each employee.performanceReviews as review}
									<Table.Row>
										<Table.Cell class="font-medium">{review.reviewPeriod}</Table.Cell>
										<Table.Cell>
											{review.overallRating ? `${review.overallRating}/5.0` : 'N/A'}
										</Table.Cell>
										<Table.Cell>
											<Badge>{review.status}</Badge>
										</Table.Cell>
										<Table.Cell>
											{review.reviewer?.displayName || 'N/A'}
										</Table.Cell>
										<Table.Cell>{formatDate(review.createdAt)}</Table.Cell>
									</Table.Row>
								{/each}
							</Table.Body>
						</Table.Root>
					{:else}
						<p class="text-center text-sm text-muted-foreground">No performance reviews</p>
					{/if}
				</Card.Content>
			</Card.Root>
		</Tabs.Content>

		<!-- Leave Balances Tab -->
		<Tabs.Content value="timeoff" class="mt-6">
			<Card.Root>
				<Card.Header>
					<Card.Title class="flex items-center gap-2">
						<Calendar class="h-5 w-5" />
						Leave Balances
					</Card.Title>
				</Card.Header>
				<Card.Content>
					{#if employee.leaveBalances && employee.leaveBalances.length > 0}
						<div class="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
							{#each employee.leaveBalances as balance}
								<div class="rounded-lg border border-border p-4">
									<h3 class="mb-2 text-sm font-semibold text-foreground">{balance.leaveTypeName}</h3>
									<div class="space-y-2">
										<div class="flex justify-between">
											<span class="text-sm text-muted-foreground">Year</span>
											<span class="text-sm font-medium text-foreground">{balance.year}</span>
										</div>
										<div class="flex justify-between">
											<span class="text-sm text-muted-foreground">Total Days</span>
											<span class="text-sm font-medium text-foreground">{balance.totalDays}</span>
										</div>
										<div class="flex justify-between">
											<span class="text-sm text-muted-foreground">Used Days</span>
											<span class="text-sm font-medium text-foreground">{balance.usedDays}</span>
										</div>
										<Separator />
										<div class="flex justify-between">
											<span class="text-sm font-medium text-foreground">Remaining</span>
											<span class="text-sm font-bold text-primary">
												{balance.remainingDays} days
											</span>
										</div>
									</div>
								</div>
							{/each}
						</div>
					{:else}
						<p class="text-center text-sm text-muted-foreground">No leave balances</p>
					{/if}
				</Card.Content>
			</Card.Root>
		</Tabs.Content>

		<!-- Documents Tab -->
		{#if permissions.canViewDocuments}
			<Tabs.Content value="documents" class="mt-6">
				<Card.Root>
					<Card.Header>
						<div class="flex items-center justify-between">
							<Card.Title class="flex items-center gap-2">
								<FileText class="h-5 w-5" />
								Assigned Documents ({employee.documentsCount})
							</Card.Title>
							{#if permissions.canAssignDocuments}
								<Button onclick={() => isAssignDocsModalOpen = true} size="sm">
									Assign Documents
								</Button>
							{/if}
						</div>
					</Card.Header>
					<Card.Content>
						{#if employee.assignedDocuments && employee.assignedDocuments.length > 0}
							<div class="border rounded-lg overflow-hidden">
								<Table.Root>
									<Table.Header>
										<Table.Row>
											<Table.Head>Filename</Table.Head>
											<Table.Head>Category</Table.Head>
											<Table.Head>Sensitivity</Table.Head>
											<Table.Head>Assigned Date</Table.Head>
											<Table.Head class="text-right">Actions</Table.Head>
										</Table.Row>
									</Table.Header>
									<Table.Body>
										{#each employee.assignedDocuments as document}
											<Table.Row class="cursor-pointer hover:bg-muted/50" onclick={() => goto(`/dashboard/documents/${document.id}`)}>
												<Table.Cell class="font-medium">
													<div class="flex items-center gap-2">
														<FileText class="h-4 w-4 text-muted-foreground" />
														{document.filename}
													</div>
												</Table.Cell>
												<Table.Cell>
													<span class="text-sm text-muted-foreground">{document.category}</span>
												</Table.Cell>
												<Table.Cell>
													<Badge variant={document.sensitivityLevel === 'Public' ? 'secondary' : 'default'}>
														{document.sensitivityLevel}
													</Badge>
												</Table.Cell>
												<Table.Cell class="text-sm text-muted-foreground">
													{new Date(document.assignedAt).toLocaleDateString()}
												</Table.Cell>
												<Table.Cell class="text-right">
													<Button
														href="/dashboard/documents/{document.id}"
														size="sm"
														variant="outline"
														onclick={(e) => {
															e.stopPropagation();
															goto(`/dashboard/documents/${document.id}`);
														}}
													>
														View
													</Button>
												</Table.Cell>
											</Table.Row>
										{/each}
									</Table.Body>
								</Table.Root>
							</div>
						{:else}
							<div class="text-center py-12">
								<FileText class="mx-auto h-12 w-12 text-muted-foreground/50 mb-4" />
								<h3 class="text-lg font-semibold mb-2">No documents assigned</h3>
								<p class="text-sm text-muted-foreground mb-4">
									This employee hasn't been assigned any documents yet.
								</p>
								{#if permissions.canAssignDocuments}
									<Button onclick={() => isAssignDocsModalOpen = true} size="sm">
										Assign Documents
									</Button>
								{/if}
							</div>
						{/if}
					</Card.Content>
				</Card.Root>
			</Tabs.Content>
		{/if}
	</Tabs.Root>
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
