<script lang="ts">
	import { goto } from '$app/navigation';
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import { Badge } from '$lib/components/ui/badge';
	import { Separator } from '$lib/components/ui/separator';
	import AssignDocumentsModal from '$lib/components/employees/AssignDocumentsModal.svelte';
	import UploadDocumentModal from '$lib/components/documents/UploadDocumentModal.svelte';
	import AddEmergencyContactModal, {
		type EmergencyContactInput
	} from '$lib/components/employees/AddEmergencyContactModal.svelte';
	import AddVehicleModal, {
		type VehicleInput
	} from '$lib/components/employees/AddVehicleModal.svelte';
	import {
		Activity,
		AlertCircle,
		ArrowLeft,
		Award,
		BarChart2,
		Briefcase,
		Building2,
		Calendar,
		Car,
		CheckCircle,
		ChevronRight,
		Clock,
		Download,
		Edit,
		FileBarChart,
		FileText,
		Mail,
		MapPin,
		Pencil,
		Phone,
		Plane,
		Plus,
		Shield,
		ShieldAlert,
		Trash2,
		User,
		UserPlus,
		Users,
		Upload, // Added Upload icon
		XCircle
	} from '@lucide/svelte';
	import { confirmService } from '$lib/stores/confirm.svelte';
	import { toast } from 'svelte-sonner';

	interface Props {
		data: any;
	}

	const { data }: Props = $props();

	// Extract data
	const employee = $derived(data.employee);
	const permissions = $derived(data.permissions);

	// Debug: Log permissions to console
	$effect(() => {
		console.log('[Employee Detail Page] Permissions:', permissions);
	});

	// Modal state
	let isAssignDocsModalOpen = $state(false);
	let isAssigningDocs = $state(false);
	let isAddEmergencyContactModalOpen = $state(false);
	let isSavingEmergencyContact = $state(false);
	let editingContact = $state<EmergencyContactInput | null>(null);
	let isVehicleModalOpen = $state(false);
	let isSavingVehicle = $state(false);
	let editingVehicle = $state<any>(null);
	let isUnassigningDocument = $state(false);
	let isUploadDocumentModalOpen = $state(false);

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
			toast.success('Documents Assigned', {
				description: `${result.message}\nAssigned: ${result.assignedCount}, Skipped: ${result.skippedCount}`
			});

			// Close modal and reload page
			isAssignDocsModalOpen = false;
			window.location.reload();
		} catch (error) {
			console.error('Assignment error:', error);
			toast.error('Assignment Failed', {
				description: 'Failed to assign documents. Please try again.'
			});
		} finally {
			isAssigningDocs = false;
		}
	}

	// Handle document unassignment
	async function handleUnassignDocument(assignmentId: string) {
		const confirmed = await confirmService.ask({
			title: 'Unassign Document',
			message:
				'Are you sure you want to unassign this document from the employee? The document itself will not be deleted.',
			variant: 'destructive',
			confirmText: 'Unassign'
		});

		if (!confirmed) return;

		isUnassigningDocument = true;
		try {
			// Use the deleteDocumentAssignment mutation
			const response = await fetch(`/api/graphql`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					query: `
						mutation DeleteDocumentAssignment($id: UUID!) {
							deleteDocumentAssignment(id: $id)
						}
					`,
					variables: {
						id: assignmentId
					}
				})
			});

			const result = await response.json();

			if (result.errors) {
				throw new Error(result.errors[0].message);
			}

			toast.success('Document Unassigned', {
				description: 'Document successfully unassigned from employee.'
			});
			window.location.reload();
		} catch (error) {
			console.error('Failed to unassign document:', error);
			toast.error('Action Failed', {
				description: 'Failed to unassign document. Please try again.'
			});
		} finally {
			isUnassigningDocument = false;
		}
	}

	// Handle upload document success
	function handleUploadDocumentSuccess() {
		isUploadDocumentModalOpen = false;
		window.location.reload();
	}

	// Handle emergency contact save (create or update)
	async function handleSaveEmergencyContact(contact: EmergencyContactInput) {
		isSavingEmergencyContact = true;
		try {
			const isUpdate = !!contact.id;
			const mutation = isUpdate
				? `
					mutation UpdateEmergencyContact($id: UUID!, $input: UpdateEmergencyContactInput!) {
						updateEmergencyContact(id: $id, input: $input) {
							id
							name
							relationship
							phoneNumber
							email
							isPrimary
							updatedAt
						}
					}
				`
				: `
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
				`;

			const variables = isUpdate
				? {
						id: contact.id,
						input: {
							name: contact.name,
							relationship: contact.relationship,
							phoneNumber: contact.phoneNumber,
							email: contact.email,
							isPrimary: contact.isPrimary
						}
					}
				: {
						input: {
							employeeId: contact.employeeId,
							name: contact.name,
							relationship: contact.relationship,
							phoneNumber: contact.phoneNumber,
							email: contact.email,
							isPrimary: contact.isPrimary
						}
					};

			const response = await fetch(`/api/graphql`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					query: mutation,
					variables
				})
			});

			const result = await response.json();

			if (result.errors) {
				throw new Error(result.errors[0].message);
			}

			toast.success(isUpdate ? 'Contact Updated' : 'Contact Added', {
				description: `Emergency contact ${isUpdate ? 'updated' : 'added'} successfully!`
			});
			isAddEmergencyContactModalOpen = false;
			editingContact = null;
			window.location.reload();
		} catch (error) {
			console.error('Failed to save emergency contact:', error);
			toast.error('Action Failed', {
				description: `Failed to ${editingContact ? 'update' : 'add'} emergency contact. Please try again.`
			});
		} finally {
			isSavingEmergencyContact = false;
		}
	}

	// Handle emergency contact delete
	async function handleDeleteEmergencyContact(contactId: string) {
		const confirmed = await confirmService.ask({
			title: 'Remove Emergency Contact',
			message:
				'Are you sure you want to remove this emergency contact? This action cannot be undone.',
			variant: 'destructive',
			confirmText: 'Remove'
		});

		if (!confirmed) return;

		try {
			const response = await fetch(`/api/graphql`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					query: `
						mutation DeleteEmergencyContact($id: UUID!) {
							deleteEmergencyContact(id: $id)
						}
					`,
					variables: {
						id: contactId
					}
				})
			});

			const result = await response.json();

			if (result.errors) {
				throw new Error(result.errors[0].message);
			}

			toast.success('Contact Removed', {
				description: 'Emergency contact removed successfully.'
			});
			window.location.reload();
		} catch (error) {
			console.error('Failed to delete emergency contact:', error);
			toast.error('Action Failed', {
				description: 'Failed to delete emergency contact. Please try again.'
			});
		}
	}

	function openAddEmergencyContactModal() {
		editingContact = null;
		isAddEmergencyContactModalOpen = true;
	}

	function openEditEmergencyContactModal(contact: any) {
		editingContact = {
			id: contact.id,
			employeeId: employee.id,
			name: contact.name,
			relationship: contact.relationship,
			phoneNumber: contact.phoneNumber,
			email: contact.email,
			isPrimary: contact.isPrimary
		};
		isAddEmergencyContactModalOpen = true;
	}

	// Handle vehicle save (create or update)
	async function handleSaveVehicle(vehicleData: VehicleInput) {
		isSavingVehicle = true;
		try {
			const isUpdate = !!editingVehicle;
			const mutation = isUpdate
				? `
					mutation UpdateEmployeeVehicle($id: UUID!, $input: UpdateEmployeeVehicleInput!) {
						updateEmployeeVehicle(id: $id, input: $input) {
							id
							make
							model
							year
							licensePlate
							color
							updatedAt
						}
					}
				`
				: `
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
				`;

			const variables = isUpdate
				? {
						id: editingVehicle.id,
						input: {
							make: vehicleData.make,
							model: vehicleData.model,
							year: vehicleData.year,
							licensePlate: vehicleData.licensePlate,
							color: vehicleData.color
						}
					}
				: {
						input: vehicleData
					};

			const response = await fetch(`/api/graphql`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					query: mutation,
					variables
				})
			});

			const result = await response.json();

			if (result.errors) {
				throw new Error(result.errors[0].message);
			}

			toast.success(isUpdate ? 'Vehicle Updated' : 'Vehicle Added', {
				description: `Vehicle ${isUpdate ? 'updated' : 'added'} successfully!`
			});
			isVehicleModalOpen = false;
			editingVehicle = null;
			window.location.reload();
		} catch (error) {
			console.error('Failed to save vehicle:', error);
			toast.error('Action Failed', {
				description: `Failed to ${editingVehicle ? 'update' : 'add'} vehicle. Please try again.`
			});
		} finally {
			isSavingVehicle = false;
		}
	}

	// Handle vehicle delete
	async function handleDeleteVehicle(vehicleId: string) {
		const confirmed = await confirmService.ask({
			title: 'Remove Vehicle',
			message: 'Are you sure you want to remove this vehicle? This action cannot be undone.',
			variant: 'destructive',
			confirmText: 'Remove'
		});

		if (!confirmed) return;

		try {
			const response = await fetch(`/api/graphql`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					query: `
						mutation DeleteEmployeeVehicle($id: UUID!) {
							deleteEmployeeVehicle(id: $id)
						}
					`,
					variables: {
						id: vehicleId
					}
				})
			});

			const result = await response.json();

			if (result.errors) {
				throw new Error(result.errors[0].message);
			}

			toast.success('Vehicle Removed', {
				description: 'Vehicle removed successfully.'
			});
			window.location.reload();
		} catch (error) {
			console.error('Failed to delete vehicle:', error);
			toast.error('Action Failed', {
				description: 'Failed to delete vehicle. Please try again.'
			});
		}
	}

	function openAddVehicleModal() {
		editingVehicle = null;
		isVehicleModalOpen = true;
	}

	function openEditVehicleModal(vehicle: any) {
		editingVehicle = vehicle;
		isVehicleModalOpen = true;
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

	// Format relative time
	function formatRelativeTime(dateString: string): string {
		const date = new Date(dateString);
		const now = new Date();
		const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

		if (diffInSeconds < 60) return 'Just now';
		if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} mins ago`;
		if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} hours ago`;
		if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)} days ago`;
		return formatDate(dateString);
	}

	// Format role for display
	function formatRole(role: string): string {
		return role.replace('_', ' ').replace(/\b\w/g, (l) => l.toUpperCase());
	}

	// Calculate tenure
	function calculateTenure(hireDateString: string): string {
		if (!hireDateString) return 'N/A';
		const hireDate = new Date(hireDateString);
		const now = new Date();
		const diffTime = Math.abs(now.getTime() - hireDate.getTime());
		const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
		const years = Math.floor(diffDays / 365);
		const months = Math.floor((diffDays % 365) / 30);

		if (years > 0)
			return `${years} Yr${years > 1 ? 's' : ''}, ${months} Mo${months > 1 ? 's' : ''}`;
		return `${months} Month${months !== 1 ? 's' : ''}`;
	}

	function getInitials(name: string): string {
		return name
			.split(' ')
			.map((n) => n[0])
			.join('')
			.toUpperCase()
			.slice(0, 2);
	}
</script>

<svelte:head>
	<title>{employee.displayName} - Employee Profile - MountainHR</title>
	<meta name="description" content="Employee profile for {employee.displayName}" />
</svelte:head>

<div class="container mx-auto max-w-7xl p-6 md:p-10">
	{#if !employee}
		<div class="flex h-[50vh] items-center justify-center">
			<div
				class="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"
			></div>
		</div>
	{:else}
		<!-- Top Navigation / Breadcrumbs -->
		<div class="mb-8 flex items-center justify-between">
			<div class="flex items-center gap-2 text-sm text-muted-foreground">
				<a href="/dashboard" class="hover:text-foreground">Dashboard</a>
				<ChevronRight class="h-4 w-4" />
				<a href="/dashboard/employees" class="hover:text-foreground">Employees</a>
				<ChevronRight class="h-4 w-4" />
				<span class="font-medium text-foreground">{employee.displayName}</span>
			</div>
			<div class="flex gap-3">
				<!-- <Button variant="secondary" size="sm" class="gap-2">
				<Download class="h-4 w-4" />
				Export
			</Button> -->
				{#if permissions.canManageEmployees}
					<Button href="/dashboard/employees/{employee.id}/edit" size="sm" class="gap-2">
						<Pencil class="h-4 w-4" />
						Edit Profile
					</Button>
				{/if}
			</div>
		</div>

		<!-- Main Bento Grid Layout -->
		<div
			class="grid auto-rows-[minmax(180px,auto)] grid-cols-1 gap-4 md:grid-cols-3 lg:grid-cols-4"
		>
			<!-- 1. Personal Info Card (Large, Spans 2 columns on large screens) -->
			<div
				class="group relative row-span-2 flex flex-col justify-between overflow-hidden rounded-xl border bg-card p-6 md:col-span-2 lg:col-span-2"
			>
				<div class="absolute top-0 right-0 p-6 opacity-5 transition-opacity group-hover:opacity-10">
					<User class="h-48 w-48" />
				</div>

				<div class="z-10 flex items-start gap-6">
					<div
						class="flex h-24 w-24 shrink-0 items-center justify-center rounded-full border-4 border-background bg-muted text-3xl font-bold shadow-lg"
					>
						{getInitials(employee.displayName)}
					</div>
					<div>
						<div class="mb-1 flex items-center gap-3">
							<h1 class="text-3xl font-bold tracking-tight">{employee.displayName}</h1>
							<Badge
								variant={employee.isActive ? 'default' : 'secondary'}
								class="pointer-events-none"
							>
								{employee.isActive ? 'Active' : 'Inactive'}
							</Badge>
						</div>
						<p class="mb-4 text-lg text-muted-foreground">{employee.jobTitle || 'No Job Title'}</p>

						<div class="flex flex-wrap gap-3 text-sm">
							{#if employee.department}
								<div
									class="flex items-center gap-1.5 rounded-md bg-muted/50 px-3 py-1.5 text-muted-foreground"
								>
									<Building2 class="h-4 w-4" />
									{employee.department.name}
								</div>
							{/if}
							{#if employee.city && employee.stateProvince}
								<div
									class="flex items-center gap-1.5 rounded-md bg-muted/50 px-3 py-1.5 text-muted-foreground"
								>
									<MapPin class="h-4 w-4" />
									{employee.city}, {employee.stateProvince}
								</div>
							{/if}
							<div
								class="flex items-center gap-1.5 rounded-md bg-muted/50 px-3 py-1.5 text-muted-foreground"
							>
								<Clock class="h-4 w-4" />
								{formatRole(employee.role)}
							</div>
						</div>
					</div>
				</div>

				<div class="z-10 mt-8 grid grid-cols-2 gap-4 border-t border-border/50 pt-6 sm:grid-cols-4">
					<div>
						<p class="mb-1 text-xs uppercase tracking-wider text-muted-foreground">Employee ID</p>
						<p class="font-mono font-medium text-sm truncate" title={employee.id}>
							{employee.id.split('-')[0]}...
						</p>
					</div>
					<div>
						<p class="mb-1 text-xs uppercase tracking-wider text-muted-foreground">Join Date</p>
						<p class="font-medium">{formatDate(employee.hireDate)}</p>
					</div>
					<div>
						<p class="mb-1 text-xs uppercase tracking-wider text-muted-foreground">Manager</p>
						{#if employee.department?.userByManagerId}
							<div class="flex items-center gap-2">
								<div
									class="flex h-5 w-5 items-center justify-center rounded-full bg-primary/20 text-[10px] font-bold text-primary"
								>
									{getInitials(employee.department.userByManagerId.displayName)}
								</div>
								<p class="truncate font-medium text-sm">
									{employee.department.userByManagerId.displayName}
								</p>
							</div>
						{:else}
							<p class="text-muted-foreground text-sm">None</p>
						{/if}
					</div>
					<div>
						<p class="mb-1 text-xs uppercase tracking-wider text-muted-foreground">Tenure</p>
						<p class="font-medium">{calculateTenure(employee.hireDate)}</p>
					</div>
				</div>
			</div>

			<!-- 2. Contact Details (Small, 1 col) -->
			<div class="flex flex-col justify-center rounded-xl border bg-card p-5">
				<div class="mb-4 flex items-center gap-2 text-muted-foreground">
					<Mail class="h-4 w-4" />
					<span class="text-xs font-semibold uppercase tracking-wider">Contact</span>
				</div>
				<div class="space-y-4">
					{#if permissions.canViewContactInfo}
						<div>
							<p class="mb-0.5 text-xs text-muted-foreground">Work Email</p>
							<a
								href="mailto:{employee.email}"
								class="block truncate text-sm font-medium hover:text-primary hover:underline"
								>{employee.email}</a
							>
						</div>
						{#if employee.phoneNumber}
							<div>
								<p class="mb-0.5 text-xs text-muted-foreground">Phone</p>
								<p class="text-sm font-medium">{employee.phoneNumber}</p>
							</div>
						{/if}
						{#if employee.mobileNumber}
							<div>
								<p class="mb-0.5 text-xs text-muted-foreground">Mobile</p>
								<p class="text-sm font-medium">{employee.mobileNumber}</p>
							</div>
						{/if}
					{:else}
						<p class="text-sm text-muted-foreground">Contact info hidden</p>
					{/if}
				</div>
			</div>

			<!-- 3. Stats / KPI (Small, 1 col) -->
			<div class="flex flex-col rounded-xl border bg-card p-5">
				<div class="mb-4 flex items-center gap-2 text-muted-foreground">
					<BarChart2 class="h-4 w-4" />
					<span class="text-xs font-semibold uppercase tracking-wider">Performance</span>
				</div>
				<div class="grid flex-1 grid-cols-2 items-center gap-4">
					<div class="rounded-lg bg-muted/30 p-3 text-center">
						<p class="text-2xl font-bold text-primary">
							{#if employee.performanceReviews && employee.performanceReviews.length > 0}
								{employee.performanceReviews[0].overallRating || '-'}
							{:else}
								-
							{/if}
						</p>
						<p class="mt-1 text-[10px] uppercase text-muted-foreground">Rating</p>
					</div>
					<div class="rounded-lg bg-muted/30 p-3 text-center">
						<p class="text-2xl font-bold text-primary">{employee.leaveRequestCount}</p>
						<p class="mt-1 text-[10px] uppercase text-muted-foreground">Leaves</p>
					</div>
				</div>
				<div class="mt-4 border-t border-border/50 pt-3">
					<div class="flex items-center justify-between text-xs">
						<span class="text-muted-foreground">Last Review</span>
						<span class="font-medium">
							{#if employee.performanceReviews && employee.performanceReviews.length > 0}
								{formatDate(employee.performanceReviews[0].createdAt)}
							{:else}
								N/A
							{/if}
						</span>
					</div>
				</div>
			</div>

			<!-- 4. Emergency Contacts (Medium, 1 col, taller) -->
			<div class="flex flex-col rounded-xl border bg-card p-5 md:row-span-2">
				<div class="mb-4 flex items-center justify-between">
					<div class="flex items-center gap-2 text-muted-foreground">
						<ShieldAlert class="h-4 w-4" />
						<span class="text-xs font-semibold uppercase tracking-wider">Emergency</span>
					</div>
					{#if permissions.canManageEmployees || permissions.isViewingSelf}
						<button
							onclick={openAddEmergencyContactModal}
							class="rounded-md bg-secondary p-1.5 text-xs transition-colors hover:bg-secondary/80"
						>
							<Plus class="h-3 w-3" />
						</button>
					{/if}
				</div>

				<div class="custom-scrollbar flex-1 space-y-3 overflow-y-auto pr-1">
					{#if employee.emergencyContacts && employee.emergencyContacts.length > 0}
						{#each employee.emergencyContacts as contact}
							<div
								class="group relative rounded-lg border border-border/60 bg-muted/20 p-3 transition-colors hover:bg-muted/40 min-h-[70px]"
							>
								<div class="mb-1 flex items-start justify-between">
									<p class="text-sm font-medium">{contact.name}</p>
									{#if contact.relationship}
										<span
											class="rounded border border-primary/20 bg-primary/10 px-1.5 py-0.5 text-[10px] text-primary"
										>
											{contact.relationship}
										</span>
									{/if}
								</div>
								<div class="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
									<Phone class="h-3 w-3" />
									<span>{contact.phoneNumber}</span>
								</div>

								{#if permissions.canManageEmployees || permissions.isViewingSelf}
									<div class="absolute bottom-2 right-2 hidden gap-1 group-hover:flex">
										<Button
											variant="ghost"
											size="icon"
											class="h-6 w-6 hover:text-primary"
											onclick={() => openEditEmergencyContactModal(contact)}
										>
											<Pencil class="h-3.5 w-3.5" />
										</Button>
										<Button
											variant="ghost"
											size="icon"
											class="h-6 w-6 hover:text-destructive"
											onclick={() => handleDeleteEmergencyContact(contact.id)}
										>
											<Trash2 class="h-3.5 w-3.5" />
										</Button>
									</div>
								{/if}
							</div>
						{/each}
					{:else}
						<div class="flex h-full items-center justify-center text-center">
							<p class="text-xs text-muted-foreground">No emergency contacts</p>
						</div>
					{/if}
				</div>
			</div>

			<!-- Documents (Wide, 2 cols) -->
			{#if permissions.canViewDocuments}
				<div class="flex flex-col rounded-xl border bg-card p-5 md:col-span-2">
					<div class="mb-4 flex items-center justify-between">
						<div class="flex items-center gap-2 text-muted-foreground">
							<FileText class="h-4 w-4" />
							<span class="text-xs font-semibold uppercase tracking-wider">Documents</span>
						</div>
						{#if employee.assignedDocuments?.length}
							<span class="rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground"
								>{employee.assignedDocuments.length} Files</span
							>
						{/if}
						{#if permissions.canAssignDocuments}
							<div class="flex gap-1">
								<button
									onclick={() => (isUploadDocumentModalOpen = true)}
									class="rounded-md bg-secondary p-1.5 text-xs transition-colors hover:bg-secondary/80"
									title="Upload new document for this employee"
								>
									<Upload class="h-3 w-3" />
								</button>
								<button
									onclick={() => (isAssignDocsModalOpen = true)}
									class="rounded-md bg-secondary p-1.5 text-xs transition-colors hover:bg-secondary/80"
									title="Assign existing document to this employee"
								>
									<Plus class="h-3 w-3" />
								</button>
							</div>
						{/if}
					</div>

					{#if employee.assignedDocuments && employee.assignedDocuments.length > 0}
						<div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
							{#each employee.assignedDocuments as doc}
								<div
									class="group relative flex items-start gap-3 rounded-lg border border-border/50 bg-muted/20 p-3 transition-all hover:bg-muted/40"
								>
									<div
										class="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded bg-background text-muted-foreground shadow-sm"
									>
										<FileText class="h-4 w-4" />
									</div>
									<div class="flex-1 overflow-hidden">
										<p class="truncate text-sm font-medium" title={doc.filename}>{doc.filename}</p>
										<div class="mt-1 flex items-center gap-2 text-[10px] text-muted-foreground">
											<span class="uppercase">{doc.category || 'General'}</span>
											<span>•</span>
											<span>{formatRelativeTime(doc.uploadedAt)}</span>
										</div>
									</div>

									<div
										class="absolute top-2 right-2 hidden items-center gap-1 rounded-md bg-background/80 p-0.5 shadow-sm backdrop-blur-sm group-hover:flex"
									>
										<a
											href="/api/documents/{doc.id}/download"
											target="_blank"
											class="flex h-7 w-7 items-center justify-center rounded hover:bg-muted hover:text-primary"
											title="Download"
										>
											<Download class="h-3.5 w-3.5" />
										</a>
										{#if permissions.canAssignDocuments}
											<button
												onclick={() => handleUnassignDocument(doc.assignmentId)}
												class="flex h-7 w-7 items-center justify-center rounded hover:bg-muted hover:text-destructive"
												title="Unassign"
												disabled={isUnassigningDocument}
											>
												<Trash2 class="h-3.5 w-3.5" />
											</button>
										{/if}
									</div>
								</div>
							{/each}
						</div>
					{:else}
						<div
							class="flex h-32 flex-col items-center justify-center rounded-lg border border-dashed border-border/60 bg-muted/5"
						>
							<FileText class="mb-2 h-6 w-6 text-muted-foreground/40" />
							<p class="text-xs text-muted-foreground">No documents assigned</p>
						</div>
					{/if}
				</div>
			{/if}

			<!-- 5. Employment History / Timeline (Wide, 2 cols) -->
			<div class="rounded-xl border bg-card p-5 md:col-span-2">
				<div class="mb-5 flex items-center gap-2 text-muted-foreground">
					<Briefcase class="h-4 w-4" />
					<span class="text-xs font-semibold uppercase tracking-wider">Role</span>
				</div>

				<div class="relative pl-2">
					<!-- Timeline Line -->
					<div class="absolute top-2 bottom-2 left-[7px] w-[2px] bg-border"></div>

					<!-- Current Role -->
					<div class="relative pb-6 pl-6">
						<div
							class="absolute top-1.5 left-0 z-10 h-4 w-4 rounded-full border-2 border-primary bg-background"
						></div>
						<div class="flex flex-col sm:flex-row sm:items-start sm:justify-between">
							<div>
								<h4 class="text-sm font-semibold">{employee.jobTitle || 'No Title'}</h4>
								<p class="text-xs text-muted-foreground">
									{employee.department?.name || 'No Department'} • {employee.role}
								</p>
							</div>
							<span class="mt-1 text-xs font-mono text-muted-foreground sm:mt-0">
								{new Date(employee.hireDate).getFullYear()} - Present
							</span>
						</div>
					</div>

					<!-- Placeholder for previous roles (could be fetched if history table exists) -->
					<div class="relative pl-6">
						<div
							class="absolute top-1.5 left-0 z-10 h-4 w-4 rounded-full border-2 border-muted-foreground/30 bg-background"
						></div>
						<div class="flex flex-col sm:flex-row sm:items-start sm:justify-between">
							<div>
								<h4 class="text-sm font-semibold text-muted-foreground">Joined Company</h4>
								<p class="text-xs text-muted-foreground">Onboarding</p>
							</div>
							<span class="mt-1 text-xs font-mono text-muted-foreground sm:mt-0">
								{formatDate(employee.hireDate)}
							</span>
						</div>
					</div>
				</div>
			</div>

			<!-- 6. Vehicle Assignments (1 col) -->
			<div class="flex flex-col rounded-xl border bg-card p-5">
				<div class="mb-4 flex items-center justify-between">
					<div class="flex items-center gap-2 text-muted-foreground">
						<Car class="h-4 w-4" />
						<span class="text-xs font-semibold uppercase tracking-wider">Vehicle</span>
					</div>
					{#if employee.vehicles?.length}
						<span class="rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground"
							>{employee.vehicles.length} Active</span
						>
					{/if}
					{#if permissions.canManageEmployees || permissions.isViewingSelf}
						<button
							onclick={openAddVehicleModal}
							class="rounded-md bg-secondary p-1.5 text-xs transition-colors hover:bg-secondary/80"
						>
							<Plus class="h-3 w-3" />
						</button>
					{/if}
				</div>

				{#if employee.vehicles && employee.vehicles.length > 0}
					{#each employee.vehicles as vehicle}
						<div
							class="relative mt-auto overflow-hidden rounded-lg border bg-muted/30 p-4 transition-all hover:bg-muted/50"
						>
							<!-- Decorative Icon -->
							<Car class="absolute -right-4 -bottom-4 h-24 w-24 text-foreground/5" />

							<div class="relative z-10">
								<div class="mb-2 flex items-start justify-between">
									<div>
										<h4 class="text-lg font-bold text-foreground">
											{vehicle.make}
											{vehicle.model}
										</h4>
										<p class="text-xs text-muted-foreground">
											{vehicle.year} • {vehicle.color || 'No Color'}
										</p>
									</div>
									{#if permissions.canManageEmployees || permissions.isViewingSelf}
										<div class="flex gap-1">
											<Button
												variant="ghost"
												size="icon"
												class="h-6 w-6 hover:text-primary"
												onclick={() => openEditVehicleModal(vehicle)}
											>
												<Pencil class="h-3.5 w-3.5" />
											</Button>
											<Button
												variant="ghost"
												size="icon"
												class="h-6 w-6 hover:text-destructive"
												onclick={() => handleDeleteVehicle(vehicle.id)}
											>
												<Trash2 class="h-3.5 w-3.5" />
											</Button>
										</div>
									{/if}
								</div>

								<div class="flex items-center justify-between">
									<Badge variant="outline" class="font-mono text-xs tracking-widest">
										{vehicle.licensePlate}
									</Badge>
								</div>
							</div>
						</div>
					{/each}
				{:else}
					<div
						class="flex h-32 flex-col items-center justify-center rounded-lg border border-dashed border-border/60 bg-muted/5"
					>
						<Car class="mb-2 h-6 w-6 text-muted-foreground/40" />
						<p class="text-xs text-muted-foreground">No vehicle assigned</p>
					</div>
				{/if}
			</div>

			<!-- 7. Dependents (Placeholder, 1 col) -->
			<div class="rounded-xl border bg-card p-5">
				<div class="mb-4 flex items-center justify-between">
					<div class="flex items-center gap-2 text-muted-foreground">
						<Users class="h-4 w-4" />
						<span class="text-xs font-semibold uppercase tracking-wider">Dependents</span>
					</div>
					<!-- Placeholder button -->
					<button
						class="rounded-md bg-secondary p-1.5 text-xs opacity-50 transition-colors hover:bg-secondary/80"
						title="Feature coming soon"
					>
						<Plus class="h-3 w-3" />
					</button>
				</div>

				<div
					class="flex h-32 items-center justify-center rounded-lg border border-dashed border-border/60 bg-muted/5"
				>
					<div class="text-center">
						<UserPlus class="mx-auto mb-2 h-6 w-6 text-muted-foreground/40" />
						<p class="text-xs text-muted-foreground">No dependents listed</p>
					</div>
				</div>
			</div>

			<!-- 8. Activity Log (Wide, 3 cols on lg) -->
			<div class="rounded-xl border bg-card p-5 md:col-span-2 lg:col-span-3">
				<div class="mb-5 flex items-center justify-between">
					<div class="flex items-center gap-2 text-muted-foreground">
						<Activity class="h-4 w-4" />
						<span class="text-xs font-semibold uppercase tracking-wider">Recent Activity</span>
					</div>
					<!-- <button class="text-xs text-primary hover:underline">View All</button> -->
				</div>

				{#if employee.activityLogs && employee.activityLogs.length > 0}
					<div class="grid grid-cols-1 gap-4 md:grid-cols-3">
						{#each employee.activityLogs.slice(0, 3) as log}
							<div
								class="flex items-start gap-3 rounded-lg border border-border/50 bg-muted/20 p-3"
							>
								<div
									class="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-blue-500/20 bg-blue-500/10 text-blue-500"
								>
									{#if log.action === 'CREATE'}
										<Plus class="h-4 w-4" />
									{:else if log.action === 'UPDATE'}
										<Edit class="h-4 w-4" />
									{:else if log.action === 'DELETE'}
										<XCircle class="h-4 w-4" />
									{:else}
										<Activity class="h-4 w-4" />
									{/if}
								</div>
								<div>
									<p class="mb-1.5 text-sm font-medium leading-none">
										{log.action}
										{log.resourceType}
									</p>
									<p class="mb-2 text-xs text-muted-foreground line-clamp-2">
										{log.details ? JSON.stringify(log.details) : 'No details'}
									</p>
									<p class="text-[10px] text-muted-foreground/70">
										{formatRelativeTime(log.createdAt)}
									</p>
								</div>
							</div>
						{/each}
					</div>
				{:else}
					<div class="py-4 text-center text-xs text-muted-foreground">No recent activity</div>
				{/if}
			</div>
		</div>
	{/if}
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
		initialData={editingContact}
		onSave={handleSaveEmergencyContact}
		onClose={() => (isAddEmergencyContactModalOpen = false)}
		isSubmitting={isSavingEmergencyContact}
	/>
{/if}

<!-- Add Vehicle Modal -->
{#if permissions.canViewVehicles && (permissions.canManageEmployees || permissions.isViewingSelf)}
	<AddVehicleModal
		isOpen={isVehicleModalOpen}
		employeeId={employee.id}
		employeeName={employee.displayName}
		initialData={editingVehicle}
		onSave={handleSaveVehicle}
		onClose={() => (isVehicleModalOpen = false)}
		isSubmitting={isSavingVehicle}
	/>
{/if}

<!-- Upload Document Modal -->
{#if permissions.canAssignDocuments}
	<UploadDocumentModal
		isOpen={isUploadDocumentModalOpen}
		onClose={() => (isUploadDocumentModalOpen = false)}
		onSuccess={handleUploadDocumentSuccess}
		assignToEmployees={[employee.id]}
	/>
{/if}
