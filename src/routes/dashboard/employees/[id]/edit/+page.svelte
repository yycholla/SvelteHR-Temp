<script lang="ts">
	import { goto } from '$app/navigation';
	import { enhance } from '$app/forms';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import * as Card from '$lib/components/ui/card';
	import * as Tabs from '$lib/components/ui/tabs';
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
		addressLine1?: string;
		addressLine2?: string;
		city?: string;
		stateProvince?: string;
		postalCode?: string;
		country?: string;
		isPrimary: boolean;
		notes?: string;
	}

	interface Vehicle {
		id?: string;
		make: string;
		model: string;
		year?: number;
		color?: string;
		licensePlate: string;
		stateProvince?: string;
		parkingSpot?: string;
		insuranceCompany?: string;
		insurancePolicyNumber?: string;
		insuranceExpiry?: string;
		isPrimary: boolean;
		notes?: string;
	}

	interface Compensation {
		id?: string;
		salaryAmount: number;
		salaryCurrency: string;
		payFrequency: string;
		payType: string;
		hourlyRate?: number;
		effectiveDate: string;
		endDate?: string;
		bankName?: string;
		bankAccountType?: string;
		bankAccountNumberLast4?: string;
		bankRoutingNumber?: string;
		paymentMethod: string;
		taxIdLast4?: string;
		notes?: string;
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
	const permissions = $derived(data.permissions);

	// Form state - initialize from props
	let firstName = $state(data.employee.firstName);
	let lastName = $state(data.employee.lastName);
	let email = $state(data.employee.email);
	let role = $state(data.employee.role);
	let hireDate = $state(data.employee.hireDate || '');
	let departmentId = $state(data.employee.departmentId || '');
	let isActive = $state(data.employee.isActive);
	let isSubmitting = $state(false);

	// Contact information state
	let phoneNumber = $state(data.employee.phoneNumber || '');
	let mobileNumber = $state(data.employee.mobileNumber || '');
	let addressLine1 = $state(data.employee.addressLine1 || '');
	let addressLine2 = $state(data.employee.addressLine2 || '');
	let city = $state(data.employee.city || '');
	let stateProvince = $state(data.employee.stateProvince || '');
	let postalCode = $state(data.employee.postalCode || '');
	let country = $state(data.employee.country || '');

	// Emergency contacts state
	let emergencyContacts = $state<EmergencyContact[]>(data.employee.emergencyContacts || []);

	// Vehicles state
	let vehicles = $state<Vehicle[]>(data.employee.vehicles || []);

	// Compensation state (admin only)
	const compensationId = $state(data.employee.compensation?.id || '');
	let salaryAmount = $state(data.employee.compensation?.salaryAmount?.toString() || '');
	let salaryCurrency = $state(data.employee.compensation?.salaryCurrency || 'USD');
	let payFrequency = $state(data.employee.compensation?.payFrequency || 'monthly');
	let payType = $state(data.employee.compensation?.payType || 'salary');
	let hourlyRate = $state(data.employee.compensation?.hourlyRate?.toString() || '');
	let effectiveDate = $state(
		data.employee.compensation?.effectiveDate || new Date().toISOString().split('T')[0]
	);
	let bankName = $state(data.employee.compensation?.bankName || '');
	let bankAccountType = $state(data.employee.compensation?.bankAccountType || '');
	let bankAccountNumberLast4 = $state(data.employee.compensation?.bankAccountNumberLast4 || '');
	let bankRoutingNumber = $state(data.employee.compensation?.bankRoutingNumber || '');
	let paymentMethod = $state(data.employee.compensation?.paymentMethod || 'direct_deposit');
	let taxIdLast4 = $state(data.employee.compensation?.taxIdLast4 || '');

	// Functions to manage emergency contacts
	function addEmergencyContact() {
		emergencyContacts = [
			...emergencyContacts,
			{
				fullName: '',
				relationship: '',
				phoneNumber: '',
				isPrimary: false
			}
		];
	}

	function removeEmergencyContact(index: number) {
		emergencyContacts = emergencyContacts.filter((_, i) => i !== index);
	}

	// Functions to manage vehicles
	function addVehicle() {
		vehicles = [
			...vehicles,
			{
				make: '',
				model: '',
				licensePlate: '',
				isPrimary: false
			}
		];
	}

	function removeVehicle(index: number) {
		vehicles = vehicles.filter((_, i) => i !== index);
	}

	// Role options
	const roleOptions = [
		{ value: 'admin', label: 'Admin' },
		{ value: 'hr_manager', label: 'HR Manager' },
		{ value: 'manager', label: 'Manager' },
		{ value: 'employee', label: 'Employee' }
	];

	// Navigate back to employee detail page
	function goBack() {
		goto(`/dashboard/employees/${employee.id}`);
	}

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

	const hasErrors = $derived(Object.values(formErrors).some((error) => error !== ''));
</script>

<svelte:head>
	<title>Edit {employee.displayName} - MountainHR</title>
	<meta name="description" content="Edit employee information for {employee.displayName}" />
</svelte:head>

<div class="space-y-6">
	<!-- Page Header -->
	<div class="flex items-center justify-between">
		<div class="flex items-center gap-4">
			<Button variant="ghost" size="icon" onclick={goBack}>
				<ArrowLeft class="h-5 w-5" />
			</Button>
			<div>
				<h1 class="text-3xl font-bold tracking-tight">Edit Employee</h1>
				<p class="text-muted-foreground">Update information for {employee.displayName}</p>
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
	<form
		method="POST"
		use:enhance={() => {
			isSubmitting = true;
			return async ({ update }) => {
				await update();
				isSubmitting = false;
			};
		}}
	>
		<Tabs.Root value="basic" class="w-full">
			<Tabs.List class="grid w-full grid-cols-2 lg:grid-cols-5">
				<Tabs.Trigger value="basic">
					<User class="mr-2 h-4 w-4" />
					Basic Info
				</Tabs.Trigger>
				{#if permissions.canEditContactInfo}
					<Tabs.Trigger value="contact">
						<Phone class="mr-2 h-4 w-4" />
						Contact
					</Tabs.Trigger>
				{/if}
				{#if permissions.canEditEmergencyContacts}
					<Tabs.Trigger value="emergency">
						<Shield class="mr-2 h-4 w-4" />
						Emergency
					</Tabs.Trigger>
				{/if}
				{#if permissions.canEditVehicles}
					<Tabs.Trigger value="vehicles">
						<Car class="mr-2 h-4 w-4" />
						Vehicles
					</Tabs.Trigger>
				{/if}
				{#if permissions.canEditCompensation}
					<Tabs.Trigger value="compensation">
						<DollarSign class="mr-2 h-4 w-4" />
						Compensation
					</Tabs.Trigger>
				{/if}
			</Tabs.List>

			<!-- Basic Information Tab -->
			<Tabs.Content value="basic" class="mt-6">
				<div class="grid gap-6 lg:grid-cols-3">
					<!-- Left Column: Personal Information -->
					<div class="lg:col-span-2">
						<Card.Root>
							<Card.Header>
								<Card.Title>Personal Information</Card.Title>
								<Card.Description>Update the employee's basic information</Card.Description>
							</Card.Header>
							<Card.Content class="space-y-4">
								<div class="grid gap-4 md:grid-cols-2">
									<!-- First Name -->
									<div class="space-y-2">
										<Label for="firstName">
											First Name <span class="text-destructive">*</span>
										</Label>
										<Input
											id="firstName"
											name="firstName"
											type="text"
											bind:value={firstName}
											placeholder="John"
											required
										/>
										{#if formErrors.firstName}
											<p class="text-sm text-destructive">{formErrors.firstName}</p>
										{/if}
									</div>

									<!-- Last Name -->
									<div class="space-y-2">
										<Label for="lastName">
											Last Name <span class="text-destructive">*</span>
										</Label>
										<Input
											id="lastName"
											name="lastName"
											type="text"
											bind:value={lastName}
											placeholder="Doe"
											required
										/>
										{#if formErrors.lastName}
											<p class="text-sm text-destructive">{formErrors.lastName}</p>
										{/if}
									</div>
								</div>

								<!-- Email -->
								<div class="space-y-2">
									<Label for="email">
										Email <span class="text-destructive">*</span>
									</Label>
									<Input
										id="email"
										name="email"
										type="email"
										bind:value={email}
										placeholder="john.doe@company.com"
										required
									/>
									{#if formErrors.email}
										<p class="text-sm text-destructive">{formErrors.email}</p>
									{/if}
								</div>

								<!-- Role -->
								<div class="space-y-2">
									<Label for="role">Role</Label>
									<select
										id="role"
										name="role"
										bind:value={role}
										class="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none"
									>
										{#each roleOptions as roleOption}
											<option value={roleOption.value}>{roleOption.label}</option>
										{/each}
									</select>
								</div>

								<!-- Hire Date -->
								<div class="space-y-2">
									<Label for="hireDate">Hire Date</Label>
									<Input id="hireDate" name="hireDate" type="date" bind:value={hireDate} />
								</div>
							</Card.Content>
						</Card.Root>
					</div>

					<!-- Right Column: Employment Details -->
					<div class="space-y-6">
						<Card.Root>
							<Card.Header>
								<Card.Title>Employment Details</Card.Title>
								<Card.Description>Department and status information</Card.Description>
							</Card.Header>
							<Card.Content class="space-y-4">
								<!-- Department -->
								<div class="space-y-2">
									<Label for="departmentId">Department</Label>
									<select
										id="departmentId"
										name="departmentId"
										bind:value={departmentId}
										class="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none"
									>
										<option value="">No Department</option>
										{#each departments as dept}
											<option value={dept.id}>{dept.name}</option>
										{/each}
									</select>
								</div>

								<!-- Active Status -->
								<div class="flex items-center space-x-2">
									<Checkbox
										id="isActive"
										name="isActive"
										checked={isActive}
										onCheckedChange={(checked) => {
											isActive = checked === true;
										}}
									/>
									<Label
										for="isActive"
										class="text-sm leading-none font-medium peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
									>
										Active Employee
									</Label>
									<input type="hidden" name="isActive" value={isActive.toString()} />
								</div>
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
			</Tabs.Content>

			<!-- Contact Information Tab -->
			{#if permissions.canEditContactInfo}
				<Tabs.Content value="contact" class="mt-6">
					<div class="grid gap-6 lg:grid-cols-3">
						<div class="lg:col-span-2">
							<Card.Root>
								<Card.Header>
									<Card.Title>Contact Information</Card.Title>
									<Card.Description>Update contact details and address</Card.Description>
								</Card.Header>
								<Card.Content class="space-y-4">
									<!-- Phone Numbers -->
									<div class="grid gap-4 md:grid-cols-2">
										<div class="space-y-2">
											<Label for="phoneNumber">Phone Number</Label>
											<Input
												id="phoneNumber"
												name="phoneNumber"
												type="tel"
												bind:value={phoneNumber}
												placeholder="(555) 123-4567"
											/>
										</div>
										<div class="space-y-2">
											<Label for="mobileNumber">Mobile Number</Label>
											<Input
												id="mobileNumber"
												name="mobileNumber"
												type="tel"
												bind:value={mobileNumber}
												placeholder="(555) 987-6543"
											/>
										</div>
									</div>

									<!-- Address -->
									<div class="space-y-2">
										<Label for="addressLine1">Address Line 1</Label>
										<Input
											id="addressLine1"
											name="addressLine1"
											type="text"
											bind:value={addressLine1}
											placeholder="123 Main Street"
										/>
									</div>

									<div class="space-y-2">
										<Label for="addressLine2">Address Line 2</Label>
										<Input
											id="addressLine2"
											name="addressLine2"
											type="text"
											bind:value={addressLine2}
											placeholder="Apt 4B"
										/>
									</div>

									<div class="grid gap-4 md:grid-cols-2">
										<div class="space-y-2">
											<Label for="city">City</Label>
											<Input
												id="city"
												name="city"
												type="text"
												bind:value={city}
												placeholder="San Francisco"
											/>
										</div>
										<div class="space-y-2">
											<Label for="stateProvince">State/Province</Label>
											<Input
												id="stateProvince"
												name="stateProvince"
												type="text"
												bind:value={stateProvince}
												placeholder="CA"
											/>
										</div>
									</div>

									<div class="grid gap-4 md:grid-cols-2">
										<div class="space-y-2">
											<Label for="postalCode">Postal Code</Label>
											<Input
												id="postalCode"
												name="postalCode"
												type="text"
												bind:value={postalCode}
												placeholder="94103"
											/>
										</div>
										<div class="space-y-2">
											<Label for="country">Country</Label>
											<Input
												id="country"
												name="country"
												type="text"
												bind:value={country}
												placeholder="United States"
											/>
										</div>
									</div>
								</Card.Content>
							</Card.Root>
						</div>

						<!-- Right Column: Action Buttons -->
						<div class="space-y-6">
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
				</Tabs.Content>
			{/if}

			<!-- Emergency Contacts Tab -->
			{#if permissions.canEditEmergencyContacts}
				<Tabs.Content value="emergency" class="mt-6">
					<Card.Root>
						<Card.Header>
							<div class="flex items-center justify-between">
								<div>
									<Card.Title class="flex items-center gap-2">
										<Shield class="h-5 w-5" />
										Emergency Contacts
									</Card.Title>
									<Card.Description>Manage emergency contact information</Card.Description>
								</div>
								<Button type="button" size="sm" onclick={addEmergencyContact}>
									<Plus class="mr-2 h-4 w-4" />
									Add Contact
								</Button>
							</div>
						</Card.Header>
						<Card.Content class="space-y-6">
							{#if emergencyContacts.length === 0}
								<p class="py-8 text-center text-sm text-muted-foreground">
									No emergency contacts added yet. Click "Add Contact" to get started.
								</p>
							{:else}
								{#each emergencyContacts as contact, index}
									<div class="space-y-4 rounded-lg border border-border p-4">
										<div class="flex items-center justify-between">
											<h3 class="font-semibold text-foreground">Contact {index + 1}</h3>
											<Button
												type="button"
												variant="ghost"
												size="sm"
												onclick={() => removeEmergencyContact(index)}
											>
												<Trash2 class="h-4 w-4 text-destructive" />
											</Button>
										</div>

										<input
											type="hidden"
											name="emergencyContacts[{index}].id"
											value={contact.id || ''}
										/>

										<div class="grid gap-4 md:grid-cols-2">
											<div class="space-y-2">
												<Label for="emergencyContacts[{index}].fullName">Full Name *</Label>
												<Input
													id="emergencyContacts[{index}].fullName"
													name="emergencyContacts[{index}].fullName"
													type="text"
													bind:value={contact.fullName}
													placeholder="John Doe"
													required
												/>
											</div>
											<div class="space-y-2">
												<Label for="emergencyContacts[{index}].relationship">Relationship *</Label>
												<Input
													id="emergencyContacts[{index}].relationship"
													name="emergencyContacts[{index}].relationship"
													type="text"
													bind:value={contact.relationship}
													placeholder="Spouse, Parent, etc."
													required
												/>
											</div>
										</div>

										<div class="grid gap-4 md:grid-cols-2">
											<div class="space-y-2">
												<Label for="emergencyContacts[{index}].phoneNumber">Phone Number *</Label>
												<Input
													id="emergencyContacts[{index}].phoneNumber"
													name="emergencyContacts[{index}].phoneNumber"
													type="tel"
													bind:value={contact.phoneNumber}
													placeholder="(555) 123-4567"
													required
												/>
											</div>
											<div class="space-y-2">
												<Label for="emergencyContacts[{index}].alternatePhone"
													>Alternate Phone</Label
												>
												<Input
													id="emergencyContacts[{index}].alternatePhone"
													name="emergencyContacts[{index}].alternatePhone"
													type="tel"
													bind:value={contact.alternatePhone}
													placeholder="(555) 987-6543"
												/>
											</div>
										</div>

										<div class="space-y-2">
											<Label for="emergencyContacts[{index}].email">Email</Label>
											<Input
												id="emergencyContacts[{index}].email"
												name="emergencyContacts[{index}].email"
												type="email"
												bind:value={contact.email}
												placeholder="contact@example.com"
											/>
										</div>

										<div class="flex items-center space-x-2">
											<Checkbox
												id="emergencyContacts[{index}].isPrimary"
												name="emergencyContacts[{index}].isPrimary"
												checked={contact.isPrimary}
												onCheckedChange={(checked) => {
													contact.isPrimary = checked === true;
												}}
											/>
											<Label for="emergencyContacts[{index}].isPrimary">Primary Contact</Label>
											<input
												type="hidden"
												name="emergencyContacts[{index}].isPrimary"
												value={contact.isPrimary.toString()}
											/>
										</div>
									</div>
								{/each}
							{/if}

							<div class="flex justify-end gap-2 pt-4">
								<Button type="submit" disabled={hasErrors || isSubmitting}>
									<Save class="mr-2 h-4 w-4" />
									{isSubmitting ? 'Saving...' : 'Save Changes'}
								</Button>
								<Button type="button" variant="outline" onclick={goBack} disabled={isSubmitting}>
									<X class="mr-2 h-4 w-4" />
									Cancel
								</Button>
							</div>
						</Card.Content>
					</Card.Root>
				</Tabs.Content>
			{/if}

			<!-- Vehicles Tab -->
			{#if permissions.canEditVehicles}
				<Tabs.Content value="vehicles" class="mt-6">
					<Card.Root>
						<Card.Header>
							<div class="flex items-center justify-between">
								<div>
									<Card.Title class="flex items-center gap-2">
										<Car class="h-5 w-5" />
										Vehicles
									</Card.Title>
									<Card.Description>Manage employee vehicle information</Card.Description>
								</div>
								<Button type="button" size="sm" onclick={addVehicle}>
									<Plus class="mr-2 h-4 w-4" />
									Add Vehicle
								</Button>
							</div>
						</Card.Header>
						<Card.Content class="space-y-6">
							{#if vehicles.length === 0}
								<p class="py-8 text-center text-sm text-muted-foreground">
									No vehicles added yet. Click "Add Vehicle" to get started.
								</p>
							{:else}
								{#each vehicles as vehicle, index}
									<div class="space-y-4 rounded-lg border border-border p-4">
										<div class="flex items-center justify-between">
											<h3 class="font-semibold text-foreground">Vehicle {index + 1}</h3>
											<Button
												type="button"
												variant="ghost"
												size="sm"
												onclick={() => removeVehicle(index)}
											>
												<Trash2 class="h-4 w-4 text-destructive" />
											</Button>
										</div>

										<input type="hidden" name="vehicles[{index}].id" value={vehicle.id || ''} />

										<div class="grid gap-4 md:grid-cols-3">
											<div class="space-y-2">
												<Label for="vehicles[{index}].make">Make *</Label>
												<Input
													id="vehicles[{index}].make"
													name="vehicles[{index}].make"
													type="text"
													bind:value={vehicle.make}
													placeholder="Toyota"
													required
												/>
											</div>
											<div class="space-y-2">
												<Label for="vehicles[{index}].model">Model *</Label>
												<Input
													id="vehicles[{index}].model"
													name="vehicles[{index}].model"
													type="text"
													bind:value={vehicle.model}
													placeholder="Camry"
													required
												/>
											</div>
											<div class="space-y-2">
												<Label for="vehicles[{index}].year">Year</Label>
												<Input
													id="vehicles[{index}].year"
													name="vehicles[{index}].year"
													type="number"
													bind:value={vehicle.year}
													placeholder="2024"
													min="1900"
													max="2099"
												/>
											</div>
										</div>

										<div class="grid gap-4 md:grid-cols-2">
											<div class="space-y-2">
												<Label for="vehicles[{index}].color">Color</Label>
												<Input
													id="vehicles[{index}].color"
													name="vehicles[{index}].color"
													type="text"
													bind:value={vehicle.color}
													placeholder="Silver"
												/>
											</div>
											<div class="space-y-2">
												<Label for="vehicles[{index}].licensePlate">License Plate *</Label>
												<Input
													id="vehicles[{index}].licensePlate"
													name="vehicles[{index}].licensePlate"
													type="text"
													bind:value={vehicle.licensePlate}
													placeholder="ABC-1234"
													required
												/>
											</div>
										</div>

										<div class="grid gap-4 md:grid-cols-2">
											<div class="space-y-2">
												<Label for="vehicles[{index}].stateProvince">State/Province</Label>
												<Input
													id="vehicles[{index}].stateProvince"
													name="vehicles[{index}].stateProvince"
													type="text"
													bind:value={vehicle.stateProvince}
													placeholder="CA"
												/>
											</div>
											<div class="space-y-2">
												<Label for="vehicles[{index}].parkingSpot">Parking Spot</Label>
												<Input
													id="vehicles[{index}].parkingSpot"
													name="vehicles[{index}].parkingSpot"
													type="text"
													bind:value={vehicle.parkingSpot}
													placeholder="A-12"
												/>
											</div>
										</div>

										<div class="grid gap-4 md:grid-cols-2">
											<div class="space-y-2">
												<Label for="vehicles[{index}].insuranceCompany">Insurance Company</Label>
												<Input
													id="vehicles[{index}].insuranceCompany"
													name="vehicles[{index}].insuranceCompany"
													type="text"
													bind:value={vehicle.insuranceCompany}
													placeholder="State Farm"
												/>
											</div>
											<div class="space-y-2">
												<Label for="vehicles[{index}].insurancePolicyNumber">Policy Number</Label>
												<Input
													id="vehicles[{index}].insurancePolicyNumber"
													name="vehicles[{index}].insurancePolicyNumber"
													type="text"
													bind:value={vehicle.insurancePolicyNumber}
													placeholder="POL-123456"
												/>
											</div>
										</div>

										<div class="space-y-2">
											<Label for="vehicles[{index}].insuranceExpiry">Insurance Expiry</Label>
											<Input
												id="vehicles[{index}].insuranceExpiry"
												name="vehicles[{index}].insuranceExpiry"
												type="date"
												bind:value={vehicle.insuranceExpiry}
											/>
										</div>

										<div class="flex items-center space-x-2">
											<Checkbox
												id="vehicles[{index}].isPrimary"
												name="vehicles[{index}].isPrimary"
												checked={vehicle.isPrimary}
												onCheckedChange={(checked) => {
													vehicle.isPrimary = checked === true;
												}}
											/>
											<Label for="vehicles[{index}].isPrimary">Primary Vehicle</Label>
											<input
												type="hidden"
												name="vehicles[{index}].isPrimary"
												value={vehicle.isPrimary.toString()}
											/>
										</div>
									</div>
								{/each}
							{/if}

							<div class="flex justify-end gap-2 pt-4">
								<Button type="submit" disabled={hasErrors || isSubmitting}>
									<Save class="mr-2 h-4 w-4" />
									{isSubmitting ? 'Saving...' : 'Save Changes'}
								</Button>
								<Button type="button" variant="outline" onclick={goBack} disabled={isSubmitting}>
									<X class="mr-2 h-4 w-4" />
									Cancel
								</Button>
							</div>
						</Card.Content>
					</Card.Root>
				</Tabs.Content>
			{/if}

			<!-- Compensation Tab (Admin Only) -->
			{#if permissions.canEditCompensation}
				<Tabs.Content value="compensation" class="mt-6">
					<Card.Root class="border-amber-500/20 bg-amber-500/5">
						<Card.Header>
							<div class="flex items-center gap-2 text-amber-600">
								<AlertCircle class="h-5 w-5" />
								<div>
									<Card.Title class="text-amber-900">Sensitive Information - Admin Only</Card.Title>
									<Card.Description class="text-amber-700">
										This section contains confidential compensation and banking information. Only
										store last 4 digits of sensitive numbers.
									</Card.Description>
								</div>
							</div>
						</Card.Header>
						<Card.Content class="space-y-6">
							<input type="hidden" name="compensationId" value={compensationId} />

							<!-- Salary Information -->
							<div class="space-y-4 rounded-lg border border-border bg-card p-4">
								<h3 class="font-semibold text-foreground">Salary Information</h3>

								<div class="grid gap-4 md:grid-cols-2">
									<div class="space-y-2">
										<Label for="salaryAmount">Annual Salary *</Label>
										<Input
											id="salaryAmount"
											name="salaryAmount"
											type="number"
											step="0.01"
											bind:value={salaryAmount}
											placeholder="75000.00"
											required={permissions.canEditCompensation}
										/>
									</div>
									<div class="space-y-2">
										<Label for="salaryCurrency">Currency</Label>
										<select
											id="salaryCurrency"
											name="salaryCurrency"
											bind:value={salaryCurrency}
											class="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
										>
											<option value="USD">USD</option>
											<option value="CAD">CAD</option>
											<option value="EUR">EUR</option>
											<option value="GBP">GBP</option>
										</select>
									</div>
								</div>

								<div class="grid gap-4 md:grid-cols-3">
									<div class="space-y-2">
										<Label for="payType">Pay Type</Label>
										<select
											id="payType"
											name="payType"
											bind:value={payType}
											class="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
										>
											<option value="salary">Salary</option>
											<option value="hourly">Hourly</option>
											<option value="contract">Contract</option>
										</select>
									</div>
									<div class="space-y-2">
										<Label for="payFrequency">Pay Frequency</Label>
										<select
											id="payFrequency"
											name="payFrequency"
											bind:value={payFrequency}
											class="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
										>
											<option value="weekly">Weekly</option>
											<option value="bi-weekly">Bi-Weekly</option>
											<option value="semi-monthly">Semi-Monthly</option>
											<option value="monthly">Monthly</option>
											<option value="annually">Annually</option>
										</select>
									</div>
									<div class="space-y-2">
										<Label for="hourlyRate">Hourly Rate (if applicable)</Label>
										<Input
											id="hourlyRate"
											name="hourlyRate"
											type="number"
											step="0.01"
											bind:value={hourlyRate}
											placeholder="35.00"
										/>
									</div>
								</div>

								<div class="space-y-2">
									<Label for="effectiveDate">Effective Date</Label>
									<Input
										id="effectiveDate"
										name="effectiveDate"
										type="date"
										bind:value={effectiveDate}
									/>
								</div>
							</div>

							<!-- Banking Information -->
							<div class="space-y-4 rounded-lg border border-border bg-card p-4">
								<h3 class="font-semibold text-foreground">Banking & Payment Information</h3>

								<div class="grid gap-4 md:grid-cols-2">
									<div class="space-y-2">
										<Label for="paymentMethod">Payment Method</Label>
										<select
											id="paymentMethod"
											name="paymentMethod"
											bind:value={paymentMethod}
											class="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
										>
											<option value="direct_deposit">Direct Deposit</option>
											<option value="check">Check</option>
											<option value="wire">Wire Transfer</option>
										</select>
									</div>
									<div class="space-y-2">
										<Label for="bankName">Bank Name</Label>
										<Input
											id="bankName"
											name="bankName"
											type="text"
											bind:value={bankName}
											placeholder="Chase Bank"
										/>
									</div>
								</div>

								<div class="grid gap-4 md:grid-cols-2">
									<div class="space-y-2">
										<Label for="bankAccountType">Account Type</Label>
										<select
											id="bankAccountType"
											name="bankAccountType"
											bind:value={bankAccountType}
											class="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
										>
											<option value="">Select type...</option>
											<option value="checking">Checking</option>
											<option value="savings">Savings</option>
										</select>
									</div>
									<div class="space-y-2">
										<Label for="bankRoutingNumber">Routing Number</Label>
										<Input
											id="bankRoutingNumber"
											name="bankRoutingNumber"
											type="text"
											bind:value={bankRoutingNumber}
											placeholder="123456789"
											maxlength="20"
										/>
									</div>
								</div>

								<div class="grid gap-4 md:grid-cols-2">
									<div class="space-y-2">
										<Label for="bankAccountNumberLast4">Account Last 4 Digits</Label>
										<Input
											id="bankAccountNumberLast4"
											name="bankAccountNumberLast4"
											type="text"
											bind:value={bankAccountNumberLast4}
											placeholder="1234"
											maxlength="4"
											pattern="[0-9]{4}"
										/>
										<p class="text-xs text-muted-foreground">
											Only store last 4 digits for security
										</p>
									</div>
									<div class="space-y-2">
										<Label for="taxIdLast4">Tax ID Last 4 Digits</Label>
										<Input
											id="taxIdLast4"
											name="taxIdLast4"
											type="text"
											bind:value={taxIdLast4}
											placeholder="5678"
											maxlength="4"
											pattern="[0-9]{4}"
										/>
										<p class="text-xs text-muted-foreground">SSN/Tax ID last 4 digits only</p>
									</div>
								</div>
							</div>

							<div class="flex justify-end gap-2 pt-4">
								<Button type="submit" disabled={hasErrors || isSubmitting}>
									<Save class="mr-2 h-4 w-4" />
									{isSubmitting ? 'Saving...' : 'Save Changes'}
								</Button>
								<Button type="button" variant="outline" onclick={goBack} disabled={isSubmitting}>
									<X class="mr-2 h-4 w-4" />
									Cancel
								</Button>
							</div>
						</Card.Content>
					</Card.Root>
				</Tabs.Content>
			{/if}
		</Tabs.Root>
	</form>
</div>
