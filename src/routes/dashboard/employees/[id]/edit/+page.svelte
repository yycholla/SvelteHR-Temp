<script lang="ts">
	import { goto } from '$app/navigation';
	import { enhance } from '$app/forms';
	import { Button } from '$lib/components/ui/button';
	import { AlertCircle, ArrowLeft, Save, X } from '@lucide/svelte';

	// Import decomposed components
	import EditPersonalInfo from './components/EditPersonalInfo.svelte';
	import EditContactInfo from './components/EditContactInfo.svelte';
	import EditEmergencyContacts from './components/EditEmergencyContacts.svelte';
	import EditVehicles from './components/EditVehicles.svelte';
	import EditCompensation from './components/EditCompensation.svelte';

	interface EmergencyContact {
		id?: string;
		fullName: string;
		relationship: string;
		phoneNumber: string;
		alternatePhone?: string;
		email?: string;
		isPrimary: boolean;
	}

	interface Vehicle {
		id?: string;
		make: string;
		model: string;
		year?: number;
		color?: string;
		licensePlate: string;
		isPrimary: boolean;
	}

	interface Compensation {
		id?: string;
		salaryAmount: number;
		salaryCurrency: string;
		payFrequency: string;
		payType: string;
		hourlyRate?: number;
		effectiveDate: string;
		bankName?: string;
		bankAccountType?: string;
		bankAccountNumberLast4?: string;
		bankRoutingNumber?: string;
		paymentMethod: string;
		taxIdLast4?: string;
	}

	interface Props {
		data: {
			employee: {
				id: string;
				displayName: string;
				firstName: string;
				lastName: string;
				email: string;
				role: string;
				hireDate: string | null;
				isActive: boolean;
				departmentId: string | null;
				phoneNumber: string | null;
				mobileNumber: string | null;
				addressLine1: string | null;
				addressLine2: string | null;
				city: string | null;
				stateProvince: string | null;
				postalCode: string | null;
				country: string | null;
				department: {
					id: string;
					name: string;
				} | null;
				emergencyContacts: EmergencyContact[];
				vehicles: Vehicle[];
				compensation: Compensation | null;
			};
			departments: Array<{
				id: string;
				name: string;
			}>;
			permissions: {
				canEditContactInfo: boolean;
				canEditEmergencyContacts: boolean;
				canEditVehicles: boolean;
				canEditCompensation: boolean;
				canManageEmployees: boolean;
			};
		};
		form?: {
			error?: string;
		};
	}

	const { data, form }: Props = $props();

	// Extract server-loaded data
	const employee = $derived(data.employee);
	const departments = $derived(data.departments);
	const roles = $derived((data as any).roles || []);
	const permissions = $derived(data.permissions);

	// Helper function to format date for HTML5 date input (yyyy-MM-dd)
	function formatDateForInput(dateString: string | null): string {
		if (!dateString) return '';
		try {
			// Extract just the date part if it's a full timestamp
			return dateString.split('T')[0];
		} catch {
			return '';
		}
	}

	// Form state
	let firstName = $state(data.employee.firstName);
	let lastName = $state(data.employee.lastName);
	let email = $state(data.employee.email);
	let role = $state(data.employee.role);
	let hireDate = $state(formatDateForInput(data.employee.hireDate));
	let departmentId = $state(data.employee.departmentId || '');
	let isActive = $state(data.employee.isActive);
	let isSubmitting = $state(false);

	// Contact information
	let phoneNumber = $state(data.employee.phoneNumber || '');
	let mobileNumber = $state(data.employee.mobileNumber || '');
	let addressLine1 = $state(data.employee.addressLine1 || '');
	let addressLine2 = $state(data.employee.addressLine2 || '');
	let city = $state(data.employee.city || '');
	let stateProvince = $state(data.employee.stateProvince || '');
	let postalCode = $state(data.employee.postalCode || '');
	let country = $state(data.employee.country || '');

	// Emergency contacts
	let emergencyContacts = $state<EmergencyContact[]>(
		data.employee.emergencyContacts?.length > 0
			? data.employee.emergencyContacts
			: [{ fullName: '', relationship: '', phoneNumber: '', isPrimary: true }]
	);

	// Vehicles
	let vehicles = $state<Vehicle[]>(
		data.employee.vehicles?.length > 0 ? data.employee.vehicles : []
	);

	// Compensation
	let salaryAmount = $state(data.employee.compensation?.salaryAmount || 0);
	let salaryCurrency = $state(data.employee.compensation?.salaryCurrency || 'USD');
	let payFrequency = $state(data.employee.compensation?.payFrequency || 'monthly');
	let payType = $state(data.employee.compensation?.payType || 'salary');
	let hourlyRate = $state(data.employee.compensation?.hourlyRate || 0);
	let effectiveDate = $state(formatDateForInput(data.employee.compensation?.effectiveDate || ''));
	let bankName = $state(data.employee.compensation?.bankName || '');
	let bankAccountType = $state(data.employee.compensation?.bankAccountType || 'checking');
	let bankAccountNumberLast4 = $state(data.employee.compensation?.bankAccountNumberLast4 || '');
	let bankRoutingNumber = $state(data.employee.compensation?.bankRoutingNumber || '');
	let paymentMethod = $state(data.employee.compensation?.paymentMethod || 'direct_deposit');
	let taxIdLast4 = $state(data.employee.compensation?.taxIdLast4 || '');

	// Map roles from database to dropdown options
	const roleOptions = $derived(
		roles.map((r: { name: string }) => ({
			value: r.name,
			label: r.name
		}))
	);

	// Form validation
	const formErrors = $derived({
		firstName: !firstName ? 'First name is required' : '',
		lastName: !lastName ? 'Last name is required' : '',
		email: !email
			? 'Email is required'
			: !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
				? 'Invalid email format'
				: ''
	});

	const isFormValid = $derived(!formErrors.firstName && !formErrors.lastName && !formErrors.email);

	function goBack() {
		goto(`/dashboard/employees/${employee.id}`);
	}
</script>

<svelte:head>
	<title>Edit {employee.displayName} - MountainHR</title>
</svelte:head>

<div class="container mx-auto max-w-6xl space-y-4 px-4 py-4">
	<!-- Header -->
	<div class="flex items-center justify-between">
		<div class="flex items-center gap-3">
			<Button variant="outline" size="sm" onclick={goBack}>
				<ArrowLeft class="h-4 w-4" />
			</Button>
			<div>
				<h1 class="text-xl font-bold">Edit Employee</h1>
				<p class="text-sm text-muted-foreground">{employee.displayName}</p>
			</div>
		</div>
	</div>

	<!-- Error Alert -->
	{#if form?.error}
		<div
			class="flex items-center gap-2 rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-destructive"
		>
			<AlertCircle class="h-4 w-4" />
			<p class="text-sm font-medium">{form.error}</p>
		</div>
	{/if}

	<!-- Edit Form -->
	<form
		method="POST"
		use:enhance={() => {
			isSubmitting = true;
			return async ({ update }) => {
				await update();
				isSubmitting = false;
			};
		}}
		class="space-y-4"
	>
		<div class="grid gap-4 lg:grid-cols-2">
			<!-- Basic Information -->
			<EditPersonalInfo
				bind:firstName
				bind:lastName
				bind:email
				bind:role
				bind:hireDate
				bind:departmentId
				bind:isActive
				{roleOptions}
				{departments}
				{formErrors}
			/>

			<!-- Contact Information -->
			{#if permissions.canEditContactInfo}
				<EditContactInfo
					bind:phoneNumber
					bind:mobileNumber
					bind:addressLine1
					bind:addressLine2
					bind:city
					bind:stateProvince
					bind:postalCode
					bind:country
				/>
			{/if}
		</div>

		<!-- Emergency Contacts -->
		{#if permissions.canEditEmergencyContacts}
			<EditEmergencyContacts bind:emergencyContacts />
		{/if}

		<!-- Vehicles -->
		{#if permissions.canEditVehicles && vehicles.length > 0}
			<EditVehicles bind:vehicles />
		{/if}

		<!-- Compensation (Admin Only) -->
		{#if permissions.canEditCompensation}
			<EditCompensation
				compensationId={data.employee.compensation?.id || ''}
				bind:salaryAmount
				bind:salaryCurrency
				bind:payFrequency
				bind:payType
				bind:hourlyRate
				bind:effectiveDate
				bind:bankName
				bind:bankAccountType
				bind:bankAccountNumberLast4
				bind:bankRoutingNumber
				bind:paymentMethod
				bind:taxIdLast4
			/>
		{/if}

		<!-- Action Buttons -->
		<div class="flex justify-end gap-2">
			<Button type="button" variant="outline" onclick={goBack} disabled={isSubmitting}>
				<X class="mr-2 h-4 w-4" />
				Cancel
			</Button>
			<Button type="submit" disabled={isSubmitting || !isFormValid}>
				<Save class="mr-2 h-4 w-4" />
				{isSubmitting ? 'Saving...' : 'Save Changes'}
			</Button>
		</div>
	</form>
</div>