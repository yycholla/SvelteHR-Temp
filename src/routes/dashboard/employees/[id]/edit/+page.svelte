<script lang="ts">
	import { goto } from '$app/navigation';
	import { enhance } from '$app/forms';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import * as Card from '$lib/components/ui/card';
	import { Checkbox } from '$lib/components/ui/checkbox';
	import {
		AlertCircle,
		ArrowLeft,
		Car,
		DollarSign,
		Phone,
		Plus,
		Save,
		Shield,
		Trash2,
		User,
		X
	} from '@lucide/svelte';

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
	const salaryCurrency = $state(data.employee.compensation?.salaryCurrency || 'USD');
	let payFrequency = $state(data.employee.compensation?.payFrequency || 'monthly');
	let payType = $state(data.employee.compensation?.payType || 'salary');
	const hourlyRate = $state(data.employee.compensation?.hourlyRate || 0);
	const effectiveDate = $state(formatDateForInput(data.employee.compensation?.effectiveDate || ''));
	let bankName = $state(data.employee.compensation?.bankName || '');
	let bankAccountType = $state(data.employee.compensation?.bankAccountType || 'checking');
	let bankAccountNumberLast4 = $state(data.employee.compensation?.bankAccountNumberLast4 || '');
	let bankRoutingNumber = $state(data.employee.compensation?.bankRoutingNumber || '');
	const paymentMethod = $state(data.employee.compensation?.paymentMethod || 'direct_deposit');
	const taxIdLast4 = $state(data.employee.compensation?.taxIdLast4 || '');

	// Map roles from database to dropdown options
	const roleOptions = $derived(
		roles.map((r) => ({
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

	function addEmergencyContact() {
		emergencyContacts = [
			...emergencyContacts,
			{ fullName: '', relationship: '', phoneNumber: '', isPrimary: false }
		];
	}

	function removeEmergencyContact(index: number) {
		emergencyContacts = emergencyContacts.filter((_, i) => i !== index);
	}

	function addVehicle() {
		vehicles = [...vehicles, { make: '', model: '', licensePlate: '', isPrimary: false }];
	}

	function removeVehicle(index: number) {
		vehicles = vehicles.filter((_, i) => i !== index);
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
			<Card.Root>
				<Card.Header class="pb-3">
					<div class="flex items-center gap-2">
						<User class="h-4 w-4" />
						<Card.Title class="text-base">Personal Information</Card.Title>
					</div>
				</Card.Header>
				<Card.Content class="space-y-3">
					<div class="grid gap-3 sm:grid-cols-2">
						<div class="space-y-1.5">
							<Label for="firstName" class="text-sm"
								>First Name <span class="text-destructive">*</span></Label
							>
							<Input
								id="firstName"
								name="firstName"
								type="text"
								bind:value={firstName}
								placeholder="John"
								required
								class="h-9"
							/>
							{#if formErrors.firstName}
								<p class="text-xs text-destructive">{formErrors.firstName}</p>
							{/if}
						</div>

						<div class="space-y-1.5">
							<Label for="lastName" class="text-sm"
								>Last Name <span class="text-destructive">*</span></Label
							>
							<Input
								id="lastName"
								name="lastName"
								type="text"
								bind:value={lastName}
								placeholder="Doe"
								required
								class="h-9"
							/>
							{#if formErrors.lastName}
								<p class="text-xs text-destructive">{formErrors.lastName}</p>
							{/if}
						</div>
					</div>

					<div class="space-y-1.5">
						<Label for="email" class="text-sm">Email <span class="text-destructive">*</span></Label>
						<Input
							id="email"
							name="email"
							type="email"
							bind:value={email}
							placeholder="john.doe@company.com"
							required
							class="h-9"
						/>
						{#if formErrors.email}
							<p class="text-xs text-destructive">{formErrors.email}</p>
						{/if}
					</div>

					<div class="grid gap-3 sm:grid-cols-2">
						<div class="space-y-1.5">
							<Label for="role" class="text-sm">Role</Label>
							<select
								id="role"
								name="role"
								bind:value={role}
								class="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
							>
								{#each roleOptions as roleOption}
									<option value={roleOption.value}>{roleOption.label}</option>
								{/each}
							</select>
						</div>

						<div class="space-y-1.5">
							<Label for="hireDate" class="text-sm">Hire Date</Label>
							<Input id="hireDate" name="hireDate" type="date" bind:value={hireDate} class="h-9" />
						</div>
					</div>

					<div class="grid gap-3 sm:grid-cols-2">
						<div class="space-y-1.5">
							<Label for="departmentId" class="text-sm">Department</Label>
							<select
								id="departmentId"
								name="departmentId"
								bind:value={departmentId}
								class="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
							>
								<option value="">Select Department</option>
								{#each departments as dept}
									<option value={dept.id}>{dept.name}</option>
								{/each}
							</select>
						</div>

						<div class="flex items-center gap-2 pt-6">
							<input type="hidden" name="isActive" value={isActive ? 'true' : 'false'} />
							<Checkbox id="isActive" bind:checked={isActive} />
							<Label for="isActive" class="text-sm font-normal">Active Employee</Label>
						</div>
					</div>
				</Card.Content>
			</Card.Root>

			<!-- Contact Information -->
			{#if permissions.canEditContactInfo}
				<Card.Root>
					<Card.Header class="pb-3">
						<div class="flex items-center gap-2">
							<Phone class="h-4 w-4" />
							<Card.Title class="text-base">Contact Information</Card.Title>
						</div>
					</Card.Header>
					<Card.Content class="space-y-3">
						<div class="grid gap-3 sm:grid-cols-2">
							<div class="space-y-1.5">
								<Label for="phoneNumber" class="text-sm">Phone Number</Label>
								<Input
									id="phoneNumber"
									name="phoneNumber"
									type="tel"
									bind:value={phoneNumber}
									placeholder="(555) 123-4567"
									class="h-9"
								/>
							</div>

							<div class="space-y-1.5">
								<Label for="mobileNumber" class="text-sm">Mobile Number</Label>
								<Input
									id="mobileNumber"
									name="mobileNumber"
									type="tel"
									bind:value={mobileNumber}
									placeholder="(555) 987-6543"
									class="h-9"
								/>
							</div>
						</div>

						<div class="space-y-1.5">
							<Label for="addressLine1" class="text-sm">Address Line 1</Label>
							<Input
								id="addressLine1"
								name="addressLine1"
								type="text"
								bind:value={addressLine1}
								placeholder="123 Main Street"
								class="h-9"
							/>
						</div>

						<div class="space-y-1.5">
							<Label for="addressLine2" class="text-sm">Address Line 2</Label>
							<Input
								id="addressLine2"
								name="addressLine2"
								type="text"
								bind:value={addressLine2}
								placeholder="Apt 4B"
								class="h-9"
							/>
						</div>

						<div class="grid gap-3 sm:grid-cols-3">
							<div class="space-y-1.5">
								<Label for="city" class="text-sm">City</Label>
								<Input
									id="city"
									name="city"
									type="text"
									bind:value={city}
									placeholder="San Francisco"
									class="h-9"
								/>
							</div>

							<div class="space-y-1.5">
								<Label for="stateProvince" class="text-sm">State</Label>
								<Input
									id="stateProvince"
									name="stateProvince"
									type="text"
									bind:value={stateProvince}
									placeholder="CA"
									class="h-9"
								/>
							</div>

							<div class="space-y-1.5">
								<Label for="postalCode" class="text-sm">Postal Code</Label>
								<Input
									id="postalCode"
									name="postalCode"
									type="text"
									bind:value={postalCode}
									placeholder="94102"
									class="h-9"
								/>
							</div>
						</div>

						<div class="space-y-1.5">
							<Label for="country" class="text-sm">Country</Label>
							<Input
								id="country"
								name="country"
								type="text"
								bind:value={country}
								placeholder="United States"
								class="h-9"
							/>
						</div>
					</Card.Content>
				</Card.Root>
			{/if}
		</div>

		<!-- Emergency Contacts -->
		{#if permissions.canEditEmergencyContacts}
			<Card.Root>
				<Card.Header class="pb-3">
					<div class="flex items-center justify-between">
						<div class="flex items-center gap-2">
							<Shield class="h-4 w-4" />
							<Card.Title class="text-base">Emergency Contacts</Card.Title>
						</div>
						<Button type="button" variant="outline" size="sm" onclick={addEmergencyContact}>
							<Plus class="mr-1 h-3 w-3" />
							Add Contact
						</Button>
					</div>
				</Card.Header>
				<Card.Content class="space-y-3">
					{#each emergencyContacts as contact, index}
						<div class="rounded-lg border p-3 space-y-3">
							<div class="flex items-center justify-between">
								<span class="text-sm font-medium">Contact #{index + 1}</span>
								{#if emergencyContacts.length > 1}
									<Button
										type="button"
										variant="ghost"
										size="sm"
										onclick={() => removeEmergencyContact(index)}
									>
										<Trash2 class="h-3 w-3 text-destructive" />
									</Button>
								{/if}
							</div>

							<input type="hidden" name="emergencyContacts[{index}].id" value={contact.id || ''} />

							<div class="grid gap-3 sm:grid-cols-2">
								<div class="space-y-1.5">
									<Label for="emergencyContacts[{index}].fullName" class="text-sm">Full Name</Label>
									<Input
										id="emergencyContacts[{index}].fullName"
										name="emergencyContacts[{index}].fullName"
										type="text"
										bind:value={contact.fullName}
										placeholder="John Doe"
										class="h-9"
									/>
								</div>

								<div class="space-y-1.5">
									<Label for="emergencyContacts[{index}].relationship" class="text-sm"
										>Relationship</Label
									>
									<Input
										id="emergencyContacts[{index}].relationship"
										name="emergencyContacts[{index}].relationship"
										type="text"
										bind:value={contact.relationship}
										placeholder="Spouse"
										class="h-9"
									/>
								</div>
							</div>

							<div class="grid gap-3 sm:grid-cols-2">
								<div class="space-y-1.5">
									<Label for="emergencyContacts[{index}].phoneNumber" class="text-sm"
										>Phone Number</Label
									>
									<Input
										id="emergencyContacts[{index}].phoneNumber"
										name="emergencyContacts[{index}].phoneNumber"
										type="tel"
										bind:value={contact.phoneNumber}
										placeholder="(555) 123-4567"
										class="h-9"
									/>
								</div>

								<div class="space-y-1.5">
									<Label for="emergencyContacts[{index}].email" class="text-sm">Email</Label>
									<Input
										id="emergencyContacts[{index}].email"
										name="emergencyContacts[{index}].email"
										type="email"
										bind:value={contact.email}
										placeholder="john@example.com"
										class="h-9"
									/>
								</div>
							</div>

							<div class="flex items-center gap-2">
								<input
									type="hidden"
									name="emergencyContacts[{index}].isPrimary"
									value={contact.isPrimary ? 'true' : 'false'}
								/>
								<Checkbox
									id="emergencyContacts[{index}].isPrimary"
									bind:checked={contact.isPrimary}
								/>
								<Label for="emergencyContacts[{index}].isPrimary" class="text-sm font-normal"
									>Primary Contact</Label
								>
							</div>
						</div>
					{/each}
				</Card.Content>
			</Card.Root>
		{/if}

		<!-- Vehicles -->
		{#if permissions.canEditVehicles && vehicles.length > 0}
			<Card.Root>
				<Card.Header class="pb-3">
					<div class="flex items-center justify-between">
						<div class="flex items-center gap-2">
							<Car class="h-4 w-4" />
							<Card.Title class="text-base">Vehicles</Card.Title>
						</div>
						<Button type="button" variant="outline" size="sm" onclick={addVehicle}>
							<Plus class="mr-1 h-3 w-3" />
							Add Vehicle
						</Button>
					</div>
				</Card.Header>
				<Card.Content class="space-y-3">
					{#each vehicles as vehicle, index}
						<div class="rounded-lg border p-3 space-y-3">
							<div class="flex items-center justify-between">
								<span class="text-sm font-medium">Vehicle #{index + 1}</span>
								<Button
									type="button"
									variant="ghost"
									size="sm"
									onclick={() => removeVehicle(index)}
								>
									<Trash2 class="h-3 w-3 text-destructive" />
								</Button>
							</div>

							<input type="hidden" name="vehicles[{index}].id" value={vehicle.id || ''} />

							<div class="grid gap-3 sm:grid-cols-3">
								<div class="space-y-1.5">
									<Label for="vehicles[{index}].make" class="text-sm">Make</Label>
									<Input
										id="vehicles[{index}].make"
										name="vehicles[{index}].make"
										type="text"
										bind:value={vehicle.make}
										placeholder="Toyota"
										class="h-9"
									/>
								</div>

								<div class="space-y-1.5">
									<Label for="vehicles[{index}].model" class="text-sm">Model</Label>
									<Input
										id="vehicles[{index}].model"
										name="vehicles[{index}].model"
										type="text"
										bind:value={vehicle.model}
										placeholder="Camry"
										class="h-9"
									/>
								</div>

								<div class="space-y-1.5">
									<Label for="vehicles[{index}].year" class="text-sm">Year</Label>
									<Input
										id="vehicles[{index}].year"
										name="vehicles[{index}].year"
										type="number"
										bind:value={vehicle.year}
										placeholder="2024"
										min="1900"
										max="2099"
										class="h-9"
									/>
								</div>
							</div>

							<div class="grid gap-3 sm:grid-cols-2">
								<div class="space-y-1.5">
									<Label for="vehicles[{index}].color" class="text-sm">Color</Label>
									<Input
										id="vehicles[{index}].color"
										name="vehicles[{index}].color"
										type="text"
										bind:value={vehicle.color}
										placeholder="Silver"
										class="h-9"
									/>
								</div>

								<div class="space-y-1.5">
									<Label for="vehicles[{index}].licensePlate" class="text-sm">License Plate</Label>
									<Input
										id="vehicles[{index}].licensePlate"
										name="vehicles[{index}].licensePlate"
										type="text"
										bind:value={vehicle.licensePlate}
										placeholder="ABC-1234"
										class="h-9"
									/>
								</div>
							</div>
						</div>
					{/each}
				</Card.Content>
			</Card.Root>
		{/if}

		<!-- Compensation (Admin Only) -->
		{#if permissions.canEditCompensation}
			<Card.Root>
				<Card.Header class="pb-3">
					<div class="flex items-center gap-2">
						<DollarSign class="h-4 w-4" />
						<Card.Title class="text-base">Compensation</Card.Title>
					</div>
					<Card.Description class="text-xs">Sensitive information - Admin only</Card.Description>
				</Card.Header>
				<Card.Content class="space-y-3">
					<input type="hidden" name="compensationId" value={data.employee.compensation?.id || ''} />

					<div class="grid gap-3 sm:grid-cols-3">
						<div class="space-y-1.5">
							<Label for="salaryAmount" class="text-sm">Salary Amount</Label>
							<Input
								id="salaryAmount"
								name="salaryAmount"
								type="number"
								step="0.01"
								bind:value={salaryAmount}
								placeholder="75000.00"
								class="h-9"
							/>
						</div>

						<div class="space-y-1.5">
							<Label for="payType" class="text-sm">Pay Type</Label>
							<select
								id="payType"
								name="payType"
								bind:value={payType}
								class="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
							>
								<option value="salary">Salary</option>
								<option value="hourly">Hourly</option>
							</select>
						</div>

						<div class="space-y-1.5">
							<Label for="payFrequency" class="text-sm">Pay Frequency</Label>
							<select
								id="payFrequency"
								name="payFrequency"
								bind:value={payFrequency}
								class="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
							>
								<option value="weekly">Weekly</option>
								<option value="biweekly">Bi-weekly</option>
								<option value="monthly">Monthly</option>
							</select>
						</div>
					</div>

					<div class="grid gap-3 sm:grid-cols-2">
						<div class="space-y-1.5">
							<Label for="bankName" class="text-sm">Bank Name</Label>
							<Input
								id="bankName"
								name="bankName"
								type="text"
								bind:value={bankName}
								placeholder="Chase Bank"
								class="h-9"
							/>
						</div>

						<div class="space-y-1.5">
							<Label for="bankAccountType" class="text-sm">Account Type</Label>
							<select
								id="bankAccountType"
								name="bankAccountType"
								bind:value={bankAccountType}
								class="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
							>
								<option value="checking">Checking</option>
								<option value="savings">Savings</option>
							</select>
						</div>
					</div>

					<div class="grid gap-3 sm:grid-cols-2">
						<div class="space-y-1.5">
							<Label for="bankRoutingNumber" class="text-sm">Routing Number</Label>
							<Input
								id="bankRoutingNumber"
								name="bankRoutingNumber"
								type="text"
								bind:value={bankRoutingNumber}
								placeholder="123456789"
								maxlength="9"
								class="h-9"
							/>
						</div>

						<div class="space-y-1.5">
							<Label for="bankAccountNumberLast4" class="text-sm">Account Last 4</Label>
							<Input
								id="bankAccountNumberLast4"
								name="bankAccountNumberLast4"
								type="text"
								bind:value={bankAccountNumberLast4}
								placeholder="1234"
								maxlength="4"
								class="h-9"
							/>
						</div>
					</div>
				</Card.Content>
			</Card.Root>
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
