<script lang="ts">
	import { ArrowLeft, Save, X, User, Mail, Phone, MapPin, Building, DollarSign, Calendar, Shield, AlertCircle } from 'lucide-svelte';
	import { goto } from '$app/navigation';
	import { enhance } from '$app/forms';
	import Button from '$lib/components/ui/button/button.svelte';
	import Input from '$lib/components/ui/input/input.svelte';
	import Label from '$lib/components/ui/label/label.svelte';
	import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '$lib/components/ui/select';
	import Textarea from '$lib/components/ui/textarea/textarea.svelte';
	import Card from '$lib/components/ui/card/card.svelte';
	import CardHeader from '$lib/components/ui/card/card-header.svelte';
	import CardTitle from '$lib/components/ui/card/card-title.svelte';
	import CardContent from '$lib/components/ui/card/card-content.svelte';
	import Separator from '$lib/components/ui/separator/separator.svelte';
	import Switch from '$lib/components/ui/switch/switch.svelte';
	import { formatDateForInput } from '$lib/utils/date';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
	const { employee, departments, roles, managers = [], isUsingMockData } = data;
	
	// Debug: Log the actual employee data we receive
	console.log('🔍 Employee data received:', employee);
	console.log('🔍 Employee schema-transformed data keys:', Object.keys(employee));

	// Form state
	let formData = $state({
		firstName: employee.firstName,
		lastName: employee.lastName,
		middleName: employee.middleName || '',
		email: employee.email,
		phoneNumber: employee.phoneNumber || '',
		workPhoneNumber: employee.workPhoneNumber || '',
		
		// Address
		addressStreet: employee.addressStreet || '',
		addressCity: employee.addressCity || '',
		addressState: employee.addressState || '',
		addressZip: employee.addressZip || '',
		
		// Emergency contact
		emergencyContactName: employee.emergencyContactName || '',
		emergencyContactRelationship: employee.emergencyContactRelationship || '',
		emergencyContactPhone: employee.emergencyContactPhone || '',
		
		// Job details
		jobTitle: employee.jobTitle,
		departmentId: employee.departmentId || '',
		roleId: employee.roleId,
		managerId: employee.managerId || '',
		employmentType: employee.employmentType || '',
		hireDate: formatDateForInput(employee.hireDate),
		isManager: employee.isManager,
		
		// Personal
		dateOfBirth: formatDateForInput(employee.dateOfBirth),
		gender: employee.gender || '',
		
		// Compensation
		payType: employee.payType || '',
		payRate: employee.payRate || 0,
		
		// Other
		workAuthorizationStatus: employee.workAuthorizationStatus || ''
	});

	// Debug: Check which fields are missing from the employee data
	console.log('🔍 Form initialization debug:');
	console.log('middleName:', employee.middleName);
	console.log('phoneNumber:', employee.phoneNumber);
	console.log('addressStreet:', employee.addressStreet);
	console.log('departmentId:', employee.departmentId);
	console.log('payRate:', employee.payRate);
	console.log('payType:', employee.payType);

	let saving = $state(false);
	let errors = $state<Record<string, string>>({});

	// Transform departments and roles for select components
	const departmentOptions = departments.map((dept: any) => ({
		value: dept.id.toString(),
		label: dept.name
	}));

	const roleOptions = roles.map((role: any) => ({
		value: role.ID?.toString() || role.id?.toString(),
		label: role.Name || role.name
	}));

	const managerOptions = [
		{ value: '', label: 'No Manager' },
		...managers.map((manager: any) => ({
			value: manager.id.toString(),
			label: `${manager.firstName} ${manager.lastName} - ${manager.jobTitle}`
		}))
	];

	const employmentTypeOptions = [
		{ value: 'Full-time', label: 'Full-time' },
		{ value: 'Part-time', label: 'Part-time' },
		{ value: 'Contract', label: 'Contract' },
		{ value: 'Intern', label: 'Intern' }
	];

	const payTypeOptions = [
		{ value: 'Salary', label: 'Salary' },
		{ value: 'Hourly', label: 'Hourly' }
	];

	const genderOptions = [
		{ value: '', label: 'Prefer not to say' },
		{ value: 'Male', label: 'Male' },
		{ value: 'Female', label: 'Female' },
		{ value: 'Non-binary', label: 'Non-binary' },
		{ value: 'Other', label: 'Other' }
	];

	const workAuthorizationOptions = [
		{ value: '', label: 'Not specified' },
		{ value: 'US_CITIZEN', label: 'US Citizen' },
		{ value: 'PERMANENT_RESIDENT', label: 'Permanent Resident' },
		{ value: 'H1B', label: 'H1B Visa' },
		{ value: 'F1_OPT', label: 'F1 OPT' },
		{ value: 'OTHER', label: 'Other' }
	];

	function goBack() {
		goto(`/employees/${employee.id}`);
	}

	function validateForm() {
		const newErrors: Record<string, string> = {};
		
		if (!formData.firstName.trim()) {
			newErrors.firstName = 'First name is required';
		}
		
		if (!formData.lastName.trim()) {
			newErrors.lastName = 'Last name is required';
		}
		
		if (!formData.email.trim()) {
			newErrors.email = 'Email is required';
		} else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
			newErrors.email = 'Please enter a valid email address';
		}
		
		if (!formData.jobTitle.trim()) {
			newErrors.jobTitle = 'Job title is required';
		}
		
		if (!formData.roleId) {
			newErrors.roleId = 'Role is required';
		}

		errors = newErrors;
		return Object.keys(newErrors).length === 0;
	}

	// Form submission will now be handled by server action
	function handleSubmit() {
		if (!validateForm()) {
			return false; // Prevent form submission
		}
		saving = true;
		return true; // Allow form submission
	}
</script>

<div class="container mx-auto px-6 pb-6 pt-6 space-y-6 max-w-4xl">
	<!-- Header -->
	<div class="flex items-center justify-between mb-8">
		<div class="flex items-center space-x-4">
			<Button variant="ghost" onclick={goBack} class="rounded-2xl bg-background hover:bg-background/90 transition-all duration-200">
				<ArrowLeft class="h-4 w-4 mr-2" />
				Cancel
			</Button>
			<h1 class="text-3xl font-bold bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text text-transparent">Edit Employee</h1>
		</div>
		
		<div class="flex items-center space-x-3">
			<Button variant="outline" onclick={goBack} class="rounded-2xl bg-background hover:bg-background/90 transition-all duration-200">
				<X class="h-4 w-4 mr-2" />
				Cancel
			</Button>
			<Button type="submit" disabled={saving} class="rounded-2xl hover:scale-[1.02] transition-all duration-200">
				<Save class="h-4 w-4 mr-2" />
				{saving ? 'Saving...' : 'Save Changes'}
			</Button>
		</div>
	</div>

	<form method="POST" action="?/save" use:enhance={() => {
		return ({ formData, cancel }) => {
			if (!handleSubmit()) {
				cancel();
				return;
			}
			
			return async ({ result, update }) => {
				console.log('Form submission result:', result);
				saving = false;
				
				// Handle different response types
				if (result.type === 'redirect') {
					console.log('Redirecting to:', result.location);
					// Let SvelteKit handle the redirect
					await update();
				} else if (result.type === 'error') {
					// Handle error case
					console.error('Form submission error:', result.error);
					alert('Failed to save employee. Please try again.');
					await update();
				} else {
					// Handle other cases
					console.log('Other result type:', result.type);
					await update();
				}
			};
		};
	}} class="space-y-6">
		
		<!-- Basic Information -->
		<Card class="bg-background border-border shadow-lg hover:shadow-xl transition-all duration-200 rounded-2xl border">
			<CardHeader class="pb-4">
				<CardTitle class="flex items-center text-lg font-semibold bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text text-transparent">
					<div class="p-2 bg-primary/10 rounded-full mr-3">
						<User class="h-5 w-5 text-primary" />
					</div>
					Basic Information
				</CardTitle>
			</CardHeader>
			<CardContent class="space-y-5">
				<div class="grid grid-cols-1 md:grid-cols-3 gap-6">
					<div class="space-y-3">
						<Label for="firstName" class="font-medium text-foreground">First Name *</Label>
						<Input 
							id="firstName" 
							name="firstName"
							bind:value={formData.firstName} 
							class="rounded-xl bg-background border-border focus:bg-background transition-all duration-200 {errors.firstName ? 'border-red-500' : ''}"
						/>
						{#if errors.firstName}
							<p class="text-sm text-red-500 font-medium">{errors.firstName}</p>
						{/if}
					</div>
					
					<div class="space-y-3">
						<Label for="middleName" class="font-medium text-foreground">Middle Name</Label>
						<Input id="middleName" name="middleName" bind:value={formData.middleName} class="rounded-xl bg-background border-border focus:bg-background transition-all duration-200" />
					</div>
					
					<div class="space-y-3">
						<Label for="lastName" class="font-medium text-foreground">Last Name *</Label>
						<Input 
							id="lastName" 
							name="lastName"
							bind:value={formData.lastName}
							class="rounded-xl bg-background border-border focus:bg-background transition-all duration-200 {errors.lastName ? 'border-red-500' : ''}"
						/>
						{#if errors.lastName}
							<p class="text-sm text-red-500 font-medium">{errors.lastName}</p>
						{/if}
					</div>
				</div>
				
				<div class="grid grid-cols-1 md:grid-cols-2 gap-6">
					<div class="space-y-3">
						<Label for="dateOfBirth" class="font-medium text-foreground">Date of Birth</Label>
						<Input type="date" id="dateOfBirth" name="dateOfBirth" bind:value={formData.dateOfBirth} class="rounded-xl bg-background border-border focus:bg-background transition-all duration-200" />
					</div>
					
					<div class="space-y-3">
						<Label for="gender" class="font-medium text-foreground">Gender</Label>
						<select 
							id="gender" 
							name="gender"
							bind:value={formData.gender}
							class="rounded-xl bg-background border-border focus:bg-background transition-all duration-200 w-full px-3 py-2"
						>
							<option value="">Select gender</option>
							{#each genderOptions as option}
								<option value={option.value}>{option.label}</option>
							{/each}
						</select>
					</div>
				</div>
			</CardContent>
		</Card>

		<!-- Contact Information -->
		<Card class="bg-background border-border shadow-lg hover:shadow-xl transition-all duration-200 rounded-2xl border">
			<CardHeader class="pb-4">
				<CardTitle class="flex items-center text-lg font-semibold bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text text-transparent">
					<div class="p-2 bg-primary/10 rounded-full mr-3">
						<Mail class="h-5 w-5 text-primary" />
					</div>
					Contact Information
				</CardTitle>
			</CardHeader>
			<CardContent class="space-y-5">
				<div class="space-y-3">
					<Label for="email" class="font-medium text-foreground">Email Address *</Label>
					<Input 
						type="email" 
						id="email" 
						name="email"
						bind:value={formData.email}
						class="rounded-xl bg-background border-border focus:bg-background transition-all duration-200 {errors.email ? 'border-red-500' : ''}"
					/>
					{#if errors.email}
						<p class="text-sm text-red-500 font-medium">{errors.email}</p>
					{/if}
				</div>
				
				<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
					<div class="space-y-2">
						<Label for="phoneNumber">Phone Number</Label>
						<Input type="tel" id="phoneNumber" name="phoneNumber" bind:value={formData.phoneNumber} />
					</div>
					
					<div class="space-y-2">
						<Label for="workPhoneNumber">Work Phone</Label>
						<Input type="tel" id="workPhoneNumber" name="workPhoneNumber" bind:value={formData.workPhoneNumber} />
					</div>
				</div>
				
				<Separator />
				
				<div class="space-y-5">
					<div class="flex items-center space-x-2">
						<MapPin class="h-5 w-5 text-primary" />
						<h3 class="text-lg font-medium bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text text-transparent">Address</h3>
					</div>
					
					<div class="space-y-2">
						<Label for="addressStreet">Street Address</Label>
						<Input id="addressStreet" name="addressStreet" bind:value={formData.addressStreet} />
					</div>
					
					<div class="grid grid-cols-1 md:grid-cols-3 gap-4">
						<div class="space-y-2">
							<Label for="addressCity">City</Label>
							<Input id="addressCity" name="addressCity" bind:value={formData.addressCity} />
						</div>
						
						<div class="space-y-2">
							<Label for="addressState">State</Label>
							<Input id="addressState" name="addressState" bind:value={formData.addressState} />
						</div>
						
						<div class="space-y-2">
							<Label for="addressZip">ZIP Code</Label>
							<Input id="addressZip" name="addressZip" bind:value={formData.addressZip} />
						</div>
					</div>
				</div>
				
				<Separator />
				
				<div class="space-y-5">
					<div class="flex items-center space-x-2">
						<AlertCircle class="h-5 w-5 text-orange-500" />
						<h3 class="text-lg font-medium bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text text-transparent">Emergency Contact</h3>
					</div>
					
					<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
						<div class="space-y-2">
							<Label for="emergencyContactName">Contact Name</Label>
							<Input id="emergencyContactName" name="emergencyContactName" bind:value={formData.emergencyContactName} />
						</div>
						
						<div class="space-y-2">
							<Label for="emergencyContactRelationship">Relationship</Label>
							<Input id="emergencyContactRelationship" name="emergencyContactRelationship" bind:value={formData.emergencyContactRelationship} />
						</div>
					</div>
					
					<div class="space-y-2">
						<Label for="emergencyContactPhone">Contact Phone</Label>
						<Input type="tel" id="emergencyContactPhone" name="emergencyContactPhone" bind:value={formData.emergencyContactPhone} />
					</div>
				</div>
			</CardContent>
		</Card>

		<!-- Job Information -->
		<Card class="bg-background border-border shadow-lg hover:shadow-xl transition-all duration-200 rounded-2xl border">
			<CardHeader class="pb-4">
				<CardTitle class="flex items-center text-lg font-semibold bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text text-transparent">
					<div class="p-2 bg-primary/10 rounded-full mr-3">
						<Building class="h-5 w-5 text-primary" />
					</div>
					Job Information
				</CardTitle>
			</CardHeader>
			<CardContent class="space-y-5">
				<div class="space-y-2">
					<Label for="jobTitle">Job Title *</Label>
					<Input 
						id="jobTitle" 
						name="jobTitle"
						bind:value={formData.jobTitle}
						class={errors.jobTitle ? 'border-red-500' : ''}
					/>
					{#if errors.jobTitle}
						<p class="text-sm text-red-500">{errors.jobTitle}</p>
					{/if}
				</div>
				
				<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
					<div class="space-y-2">
						<Label for="departmentId">Department</Label>
						<select 
							id="departmentId" 
							name="departmentId"
							bind:value={formData.departmentId}
							class="rounded-xl bg-background border-border focus:bg-background transition-all duration-200 w-full px-3 py-2"
						>
							<option value="">Select department</option>
							{#each departmentOptions as option}
								<option value={option.value}>{option.label}</option>
							{/each}
						</select>
					</div>
					
					<div class="space-y-2">
						<Label for="roleId">Role *</Label>
						<select 
							id="roleId" 
							name="roleId"
							bind:value={formData.roleId}
							class="rounded-xl bg-background border-border focus:bg-background transition-all duration-200 w-full px-3 py-2 {errors.roleId ? 'border-red-500' : ''}"
						>
							<option value="">Select role</option>
							{#each roleOptions as option}
								<option value={option.value}>{option.label}</option>
							{/each}
						</select>
						{#if errors.roleId}
							<p class="text-sm text-red-500">{errors.roleId}</p>
						{/if}
					</div>
				</div>
				
				<div class="space-y-2">
					<Label for="managerId">Manager</Label>
					<select 
						id="managerId" 
						name="managerId"
						bind:value={formData.managerId}
						class="rounded-xl bg-background border-border focus:bg-background transition-all duration-200 w-full px-3 py-2"
					>
						<option value="">Select manager</option>
						{#each managerOptions as option}
							<option value={option.value}>{option.label}</option>
						{/each}
					</select>
				</div>
				
				<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
					<div class="space-y-2">
						<Label for="employmentType">Employment Type</Label>
						<select 
							id="employmentType" 
							name="employmentType"
							bind:value={formData.employmentType}
							class="rounded-xl bg-background border-border focus:bg-background transition-all duration-200 w-full px-3 py-2"
						>
							<option value="">Select employment type</option>
							{#each employmentTypeOptions as option}
								<option value={option.value}>{option.label}</option>
							{/each}
						</select>
					</div>
					
					<div class="space-y-2">
						<Label for="hireDate">Hire Date</Label>
						<Input type="date" id="hireDate" name="hireDate" bind:value={formData.hireDate} />
					</div>
				</div>
				
				<div class="flex items-center space-x-2">
					<Switch id="isManager" bind:checked={formData.isManager} />
					<Label for="isManager" class="flex items-center cursor-pointer">
						<Shield class="h-4 w-4 mr-1" />
						Manager Position
					</Label>
				</div>
			</CardContent>
		</Card>

		<!-- Compensation -->
		<Card class="bg-background border-border shadow-lg hover:shadow-xl transition-all duration-200 rounded-2xl border">
			<CardHeader class="pb-4">
				<CardTitle class="flex items-center text-lg font-semibold bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text text-transparent">
					<div class="p-2 bg-primary/10 rounded-full mr-3">
						<DollarSign class="h-5 w-5 text-primary" />
					</div>
					Compensation
				</CardTitle>
			</CardHeader>
			<CardContent class="space-y-5">
				<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
					<div class="space-y-2">
						<Label for="payType">Pay Type</Label>
						<select 
							id="payType" 
							name="payType"
							bind:value={formData.payType}
							class="rounded-xl bg-background border-border focus:bg-background transition-all duration-200 w-full px-3 py-2"
						>
							<option value="">Select pay type</option>
							{#each payTypeOptions as option}
								<option value={option.value}>{option.label}</option>
							{/each}
						</select>
					</div>
					
					<div class="space-y-2">
						<Label for="payRate">
							{formData.payType === 'Hourly' ? 'Hourly Rate' : 'Annual Salary'}
						</Label>
						<Input 
							type="number" 
							id="payRate" 
							name="payRate"
							bind:value={formData.payRate}
							step="0.01"
							min="0"
						/>
					</div>
				</div>
			</CardContent>
		</Card>

		<!-- Additional Information -->
		<Card class="bg-background border-border shadow-lg hover:shadow-xl transition-all duration-200 rounded-2xl border">
			<CardHeader class="pb-4">
				<CardTitle class="text-lg font-semibold bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text text-transparent">Additional Information</CardTitle>
			</CardHeader>
			<CardContent class="space-y-5">
				<div class="space-y-2">
					<Label for="workAuthorizationStatus">Work Authorization Status</Label>
					<select 
						id="workAuthorizationStatus" 
						name="workAuthorizationStatus"
						bind:value={formData.workAuthorizationStatus}
						class="rounded-xl bg-background border-border focus:bg-background transition-all duration-200 w-full px-3 py-2"
					>
						<option value="">Select work authorization status</option>
						{#each workAuthorizationOptions as option}
							<option value={option.value}>{option.label}</option>
						{/each}
					</select>
				</div>
			</CardContent>
		</Card>

		<!-- Form Actions -->
		<div class="flex items-center justify-end space-x-4 pt-8">
			<Button type="button" variant="outline" onclick={goBack} class="rounded-2xl bg-background hover:bg-background/90 transition-all duration-200">
				Cancel
			</Button>
			<Button type="submit" disabled={saving} class="rounded-2xl hover:scale-[1.02] transition-all duration-200">
				<Save class="h-4 w-4 mr-2" />
				{saving ? 'Saving...' : 'Save Changes'}
			</Button>
		</div>
	</form>
</div>