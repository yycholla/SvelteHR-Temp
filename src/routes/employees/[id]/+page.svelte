<script lang="ts">
	import {
		ArrowLeft,
		Edit,
		Trash2,
		Mail,
		Phone,
		MapPin,
		Calendar,
		DollarSign,
		User,
		Award,
		Building,
		Shield,
		Clock,
		FileText,
		AlertCircle
	} from 'lucide-svelte';
	import { goto } from '$app/navigation';
	import Button from '$lib/components/ui/button/button.svelte';
	import Badge from '$lib/components/ui/badge/badge.svelte';
	import Avatar from '$lib/components/ui/avatar/avatar.svelte';
	import AvatarImage from '$lib/components/ui/avatar/avatar-image.svelte';
	import AvatarFallback from '$lib/components/ui/avatar/avatar-fallback.svelte';
	import Card from '$lib/components/ui/card/card.svelte';
	import CardHeader from '$lib/components/ui/card/card-header.svelte';
	import CardTitle from '$lib/components/ui/card/card-title.svelte';
	import CardContent from '$lib/components/ui/card/card-content.svelte';
	import Separator from '$lib/components/ui/separator/separator.svelte';
	import { formatHireDate, formatTenure, formatDate } from '$lib/utils/date';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
	const { employee } = data;

	// Debug: Log the actual employee data we receive
	console.log('🔍 View page - Employee data received:', employee);
	console.log('🔍 View page - Sample fields:', {
		middleName: employee.middleName,
		phoneNumber: employee.phoneNumber,
		addressStreet: employee.addressStreet,
		payRate: employee.payRate,
		departmentId: employee.departmentId
	});

	function goBack() {
		goto('/employees');
	}

	function editEmployee() {
		goto(`/employees/${employee.id}/edit`);
	}

	function deleteEmployee() {
		if (confirm(`Are you sure you want to delete ${employee.firstName} ${employee.lastName}?`)) {
			// TODO: Implement delete functionality
			console.log('Delete employee:', employee.id);
		}
	}

	function getStatusColor(status: string) {
		switch (status?.toLowerCase()) {
			case 'active':
				return 'bg-green-500/20 text-green-700 border-green-500/30';
			case 'onboarding':
				return 'bg-blue-500/20 text-blue-700 border-blue-500/30';
			case 'on_leave':
				return 'bg-orange-500/20 text-orange-700 border-orange-500/30';
			case 'terminated':
				return 'bg-red-500/20 text-red-700 border-red-500/30';
			default:
				return 'bg-gray-500/20 text-gray-700 border-gray-500/30';
		}
	}

	function getDepartmentColor(color: string) {
		const colors: Record<string, string> = {
			blue: 'bg-blue-500/20 text-blue-700 border-blue-500/30',
			green: 'bg-green-500/20 text-green-700 border-green-500/30',
			purple: 'bg-purple-500/20 text-purple-700 border-purple-500/30',
			orange: 'bg-orange-500/20 text-orange-700 border-orange-500/30'
		};
		return colors[color] || colors['blue'];
	}
</script>

<div class="container mx-auto max-w-6xl space-y-6 px-6 pt-6 pb-6">
	<!-- Header -->
	<div class="mb-8 flex items-center justify-between">
		<div class="flex items-center space-x-4">
			<Button
				variant="ghost"
				onclick={goBack}
				class="rounded-2xl border-border/40 bg-background/20 backdrop-blur-md transition-all duration-200 hover:bg-background/30"
			>
				<ArrowLeft class="mr-2 h-4 w-4" />
				Back to Employees
			</Button>
		</div>

		<div class="flex items-center space-x-3">
			<Button
				variant="outline"
				onclick={editEmployee}
				class="rounded-2xl border-border/40 bg-background/20 backdrop-blur-md transition-all duration-200 hover:bg-background/30"
			>
				<Edit class="mr-2 h-4 w-4" />
				Edit
			</Button>
			<Button
				variant="destructive"
				onclick={deleteEmployee}
				class="rounded-2xl transition-all duration-200 hover:scale-[1.02]"
			>
				<Trash2 class="mr-2 h-4 w-4" />
				Delete
			</Button>
		</div>
	</div>

	<!-- Employee Profile Header -->
	<Card
		class="mb-8 rounded-2xl border border-border/40 bg-background/20 shadow-lg backdrop-blur-md transition-all duration-200 hover:shadow-xl"
	>
		<CardContent class="p-8">
			<div class="flex items-start justify-between">
				<div class="flex items-center space-x-6">
					<div class="relative">
						<Avatar class="h-24 w-24 shadow-lg ring-4 ring-primary/20">
							<AvatarImage src={employee.avatar} alt="{employee.firstName} {employee.lastName}" />
							<AvatarFallback
								class="bg-gradient-to-br from-primary to-primary/80 text-xl font-bold text-white"
							>
								{employee.firstName[0]}{employee.lastName[0]}
							</AvatarFallback>
						</Avatar>
					</div>

					<div>
						<h1
							class="bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text text-4xl font-bold text-transparent"
						>
							{employee.firstName}
							{employee.lastName}
						</h1>
						<p class="mb-3 text-xl font-medium text-muted-foreground">
							{employee.jobTitle || 'No title set'}
						</p>

						<div class="mb-4 flex flex-wrap items-center gap-3">
							<Badge
								class="{getStatusColor(
									employee.status
								)} rounded-full px-3 py-1 text-xs font-semibold shadow-sm"
							>
								{employee.status}
							</Badge>

							{#if employee.department}
								<Badge
									class="{getDepartmentColor(
										employee.department.color || 'blue'
									)} rounded-full px-3 py-1 text-xs font-semibold shadow-sm"
								>
									<Building class="mr-1 h-3 w-3" />
									{employee.department.name}
								</Badge>
							{/if}

							{#if employee.isManager}
								<Badge
									class="rounded-full border-purple-500/30 bg-purple-500/20 px-3 py-1 text-xs font-semibold text-purple-700 shadow-sm"
								>
									<Shield class="mr-1 h-3 w-3" />
									Manager
								</Badge>
							{/if}
						</div>

						<div class="flex items-center space-x-6 text-sm text-muted-foreground">
							<div class="flex items-center space-x-1">
								<User class="h-4 w-4" />
								<span>ID: {employee.employeeId}</span>
							</div>

							{#if employee.hireDate}
								<div class="flex items-center space-x-1">
									<Calendar class="h-4 w-4" />
									<span>Hired {formatHireDate(employee.hireDate)}</span>
								</div>

								<div class="flex items-center space-x-1">
									<Clock class="h-4 w-4" />
									<span>Tenure: {formatTenure(employee.hireDate)}</span>
								</div>
							{/if}
						</div>
					</div>
				</div>
			</div>
		</CardContent>
	</Card>

	<!-- Details Grid -->
	<div class="grid grid-cols-1 gap-8 lg:grid-cols-2">
		<!-- Contact Information -->
		<Card
			class="rounded-2xl border border-border/40 bg-background/20 shadow-lg backdrop-blur-md transition-all duration-200 hover:shadow-xl"
		>
			<CardHeader class="pb-4">
				<CardTitle
					class="flex items-center bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text text-lg font-semibold text-transparent"
				>
					<div class="mr-3 rounded-full bg-primary/10 p-2">
						<Mail class="h-5 w-5 text-primary" />
					</div>
					Contact Information
				</CardTitle>
			</CardHeader>
			<CardContent class="space-y-5">
				{#if employee.email}
					<div
						class="flex items-center justify-between rounded-xl bg-muted/30 p-3 transition-all duration-200 hover:bg-muted/50"
					>
						<span class="font-medium text-muted-foreground">Email</span>
						<a
							href="mailto:{employee.email}"
							class="font-medium text-primary transition-colors hover:text-primary/80 hover:underline"
						>
							{employee.email}
						</a>
					</div>
				{/if}

				{#if employee.phoneNumber}
					<div
						class="flex items-center justify-between rounded-xl bg-muted/30 p-3 transition-all duration-200 hover:bg-muted/50"
					>
						<span class="font-medium text-muted-foreground">Phone</span>
						<a
							href="tel:{employee.phoneNumber}"
							class="font-medium text-primary transition-colors hover:text-primary/80 hover:underline"
						>
							{employee.phoneNumber}
						</a>
					</div>
				{/if}

				{#if employee.workPhoneNumber}
					<div
						class="flex items-center justify-between rounded-xl bg-muted/30 p-3 transition-all duration-200 hover:bg-muted/50"
					>
						<span class="font-medium text-muted-foreground">Work Phone</span>
						<a
							href="tel:{employee.workPhoneNumber}"
							class="font-medium text-primary transition-colors hover:text-primary/80 hover:underline"
						>
							{employee.workPhoneNumber}
						</a>
					</div>
				{/if}

				{#if employee.addressStreet || employee.addressCity || employee.addressState}
					<div class="rounded-xl bg-muted/30 p-3 transition-all duration-200 hover:bg-muted/50">
						<div class="mb-2 flex items-center font-medium text-muted-foreground">
							<MapPin class="mr-1 h-4 w-4" />
							Address
						</div>
						<div class="text-sm font-medium">
							{#if employee.addressStreet}
								<div>{employee.addressStreet}</div>
							{/if}
							<div>
								{[employee.addressCity, employee.addressState, employee.addressZip]
									.filter(Boolean)
									.join(', ')}
							</div>
						</div>
					</div>
				{/if}

				{#if employee.emergencyContactName}
					<Separator />
					<div
						class="rounded-xl border border-orange-200/50 bg-orange-50/50 p-3 transition-all duration-200 dark:border-orange-800/30 dark:bg-orange-950/20"
					>
						<div class="mb-3 flex items-center font-medium text-muted-foreground">
							<AlertCircle class="mr-2 h-4 w-4 text-orange-500" />
							Emergency Contact
						</div>
						<div class="space-y-2">
							<div class="flex items-center justify-between">
								<span class="text-sm text-muted-foreground">Name:</span>
								<span class="font-medium">{employee.emergencyContactName}</span>
							</div>
							{#if employee.emergencyContactRelationship}
								<div class="flex items-center justify-between">
									<span class="text-sm text-muted-foreground">Relationship:</span>
									<span class="font-medium">{employee.emergencyContactRelationship}</span>
								</div>
							{/if}
							{#if employee.emergencyContactPhone}
								<div class="flex items-center justify-between">
									<span class="text-sm text-muted-foreground">Phone:</span>
									<a
										href="tel:{employee.emergencyContactPhone}"
										class="font-medium text-primary transition-colors hover:text-primary/80 hover:underline"
									>
										{employee.emergencyContactPhone}
									</a>
								</div>
							{/if}
						</div>
					</div>
				{/if}
			</CardContent>
		</Card>

		<!-- Job Details -->
		<Card
			class="rounded-2xl border border-border/40 bg-background/20 shadow-lg backdrop-blur-md transition-all duration-200 hover:shadow-xl"
		>
			<CardHeader class="pb-4">
				<CardTitle
					class="flex items-center bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text text-lg font-semibold text-transparent"
				>
					<div class="mr-3 rounded-full bg-primary/10 p-2">
						<Building class="h-5 w-5 text-primary" />
					</div>
					Job Details
				</CardTitle>
			</CardHeader>
			<CardContent class="space-y-5">
				{#if employee.jobTitle}
					<div
						class="flex items-center justify-between rounded-xl bg-muted/30 p-3 transition-all duration-200 hover:bg-muted/50"
					>
						<span class="font-medium text-muted-foreground">Position</span>
						<span class="font-medium">{employee.jobTitle}</span>
					</div>
				{/if}

				{#if employee.department}
					<div
						class="flex items-center justify-between rounded-xl bg-muted/30 p-3 transition-all duration-200 hover:bg-muted/50"
					>
						<span class="font-medium text-muted-foreground">Department</span>
						<span class="font-medium">{employee.department.name}</span>
					</div>
				{/if}

				{#if employee.role}
					<div
						class="flex items-center justify-between rounded-xl bg-muted/30 p-3 transition-all duration-200 hover:bg-muted/50"
					>
						<span class="font-medium text-muted-foreground">Role</span>
						<span class="font-medium">{employee.role.name}</span>
					</div>
				{/if}

				{#if employee.employmentType}
					<div
						class="flex items-center justify-between rounded-xl bg-muted/30 p-3 transition-all duration-200 hover:bg-muted/50"
					>
						<span class="font-medium text-muted-foreground">Employment Type</span>
						<span class="font-medium">{employee.employmentType}</span>
					</div>
				{/if}

				{#if employee.hireDate}
					<div
						class="flex items-center justify-between rounded-xl bg-muted/30 p-3 transition-all duration-200 hover:bg-muted/50"
					>
						<span class="font-medium text-muted-foreground">Hire Date</span>
						<span class="font-medium">{formatHireDate(employee.hireDate)}</span>
					</div>
				{/if}

				<div
					class="flex items-center justify-between rounded-xl bg-muted/30 p-3 transition-all duration-200 hover:bg-muted/50"
				>
					<span class="font-medium text-muted-foreground">Manager Status</span>
					<span class="font-medium">{employee.isManager ? 'Yes' : 'No'}</span>
				</div>
			</CardContent>
		</Card>

		<!-- Personal Information -->
		{#if employee.middleName || employee.dateOfBirth || employee.gender}
			<Card
				class="rounded-2xl border border-border/40 bg-background/20 shadow-lg backdrop-blur-md transition-all duration-200 hover:shadow-xl"
			>
				<CardHeader class="pb-4">
					<CardTitle
						class="flex items-center bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text text-lg font-semibold text-transparent"
					>
						<div class="mr-3 rounded-full bg-primary/10 p-2">
							<User class="h-5 w-5 text-primary" />
						</div>
						Personal Information
					</CardTitle>
				</CardHeader>
				<CardContent class="space-y-5">
					{#if employee.middleName}
						<div
							class="flex items-center justify-between rounded-xl bg-muted/30 p-3 transition-all duration-200 hover:bg-muted/50"
						>
							<span class="font-medium text-muted-foreground">Middle Name</span>
							<span class="font-medium">{employee.middleName}</span>
						</div>
					{/if}

					{#if employee.dateOfBirth}
						<div
							class="flex items-center justify-between rounded-xl bg-muted/30 p-3 transition-all duration-200 hover:bg-muted/50"
						>
							<span class="font-medium text-muted-foreground">Date of Birth</span>
							<span class="font-medium">{formatDate(employee.dateOfBirth)}</span>
						</div>
					{/if}

					{#if employee.gender}
						<div
							class="flex items-center justify-between rounded-xl bg-muted/30 p-3 transition-all duration-200 hover:bg-muted/50"
						>
							<span class="font-medium text-muted-foreground">Gender</span>
							<span class="font-medium">{employee.gender}</span>
						</div>
					{/if}
				</CardContent>
			</Card>
		{/if}

		<!-- Compensation -->
		{#if employee.payType || employee.payRate || employee.salary}
			<Card
				class="rounded-2xl border border-border/40 bg-background/20 shadow-lg backdrop-blur-md transition-all duration-200 hover:shadow-xl"
			>
				<CardHeader class="pb-4">
					<CardTitle
						class="flex items-center bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text text-lg font-semibold text-transparent"
					>
						<div class="mr-3 rounded-full bg-primary/10 p-2">
							<DollarSign class="h-5 w-5 text-primary" />
						</div>
						Compensation
					</CardTitle>
				</CardHeader>
				<CardContent class="space-y-5">
					{#if employee.payType}
						<div
							class="flex items-center justify-between rounded-xl bg-muted/30 p-3 transition-all duration-200 hover:bg-muted/50"
						>
							<span class="font-medium text-muted-foreground">Pay Type</span>
							<span class="font-medium">{employee.payType}</span>
						</div>
					{/if}

					{#if employee.payRate || employee.salary}
						<div
							class="flex items-center justify-between rounded-xl bg-muted/30 p-3 transition-all duration-200 hover:bg-muted/50"
						>
							<span class="font-medium text-muted-foreground">Pay Rate</span>
							<span class="font-semibold text-green-600 dark:text-green-400"
								>${(employee.payRate || employee.salary)?.toLocaleString()}</span
							>
						</div>
					{/if}

					{#if employee.bankName}
						<div
							class="flex items-center justify-between rounded-xl bg-muted/30 p-3 transition-all duration-200 hover:bg-muted/50"
						>
							<span class="font-medium text-muted-foreground">Bank</span>
							<span class="font-medium">{employee.bankName}</span>
						</div>
					{/if}

					{#if employee.directDepositEnabled !== undefined}
						<div
							class="flex items-center justify-between rounded-xl bg-muted/30 p-3 transition-all duration-200 hover:bg-muted/50"
						>
							<span class="font-medium text-muted-foreground">Direct Deposit</span>
							<span
								class="font-medium {employee.directDepositEnabled
									? 'text-green-600 dark:text-green-400'
									: 'text-orange-600 dark:text-orange-400'}"
								>{employee.directDepositEnabled ? 'Enabled' : 'Disabled'}</span
							>
						</div>
					{/if}
				</CardContent>
			</Card>
		{/if}
	</div>

	<!-- Additional Information -->
	{#if employee.workAuthorizationStatus || employee.trainingInfo || employee.healthInsuranceInfo}
		<Card
			class="mt-8 rounded-2xl border border-border/40 bg-background/20 shadow-lg backdrop-blur-md transition-all duration-200 hover:shadow-xl"
		>
			<CardHeader class="pb-4">
				<CardTitle
					class="flex items-center bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text text-lg font-semibold text-transparent"
				>
					<div class="mr-3 rounded-full bg-primary/10 p-2">
						<FileText class="h-5 w-5 text-primary" />
					</div>
					Additional Information
				</CardTitle>
			</CardHeader>
			<CardContent class="space-y-5">
				{#if employee.workAuthorizationStatus}
					<div
						class="flex items-center justify-between rounded-xl bg-muted/30 p-3 transition-all duration-200 hover:bg-muted/50"
					>
						<span class="font-medium text-muted-foreground">Work Authorization</span>
						<span class="font-medium">{employee.workAuthorizationStatus}</span>
					</div>
				{/if}

				{#if employee.trainingInfo}
					<div
						class="flex items-center justify-between rounded-xl bg-muted/30 p-3 transition-all duration-200 hover:bg-muted/50"
					>
						<span class="font-medium text-muted-foreground">Training Info</span>
						<span class="font-medium">{employee.trainingInfo}</span>
					</div>
				{/if}

				{#if employee.healthInsuranceInfo}
					<div
						class="flex items-center justify-between rounded-xl bg-muted/30 p-3 transition-all duration-200 hover:bg-muted/50"
					>
						<span class="font-medium text-muted-foreground">Health Insurance</span>
						<span class="font-medium">{employee.healthInsuranceInfo}</span>
					</div>
				{/if}

				{#if employee.retirementPlanInfo}
					<div
						class="flex items-center justify-between rounded-xl bg-muted/30 p-3 transition-all duration-200 hover:bg-muted/50"
					>
						<span class="font-medium text-muted-foreground">Retirement Plan</span>
						<span class="font-medium">{employee.retirementPlanInfo}</span>
					</div>
				{/if}
			</CardContent>
		</Card>
	{/if}

	<!-- Audit Information -->
	<Card
		class="mt-8 rounded-2xl border border-border/40 bg-background/20 shadow-lg backdrop-blur-md transition-all duration-200 hover:shadow-xl"
	>
		<CardHeader class="pb-4">
			<CardTitle
				class="flex items-center bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text text-lg font-semibold text-transparent"
			>
				<div class="mr-3 rounded-full bg-primary/10 p-2">
					<Clock class="h-5 w-5 text-primary" />
				</div>
				System Information
			</CardTitle>
		</CardHeader>
		<CardContent class="space-y-5">
			<div
				class="flex items-center justify-between rounded-xl bg-muted/30 p-3 transition-all duration-200 hover:bg-muted/50"
			>
				<span class="font-medium text-muted-foreground">Username</span>
				<span class="font-mono font-medium">{employee.username}</span>
			</div>

			{#if employee.createdAt}
				<div
					class="flex items-center justify-between rounded-xl bg-muted/30 p-3 transition-all duration-200 hover:bg-muted/50"
				>
					<span class="font-medium text-muted-foreground">Created</span>
					<span class="font-medium"
						>{formatDate(employee.createdAt, {
							year: 'numeric',
							month: 'short',
							day: 'numeric',
							hour: 'numeric',
							minute: 'numeric'
						})}</span
					>
				</div>
			{/if}

			{#if employee.updatedAt}
				<div
					class="flex items-center justify-between rounded-xl bg-muted/30 p-3 transition-all duration-200 hover:bg-muted/50"
				>
					<span class="font-medium text-muted-foreground">Last Updated</span>
					<span class="font-medium"
						>{formatDate(employee.updatedAt, {
							year: 'numeric',
							month: 'short',
							day: 'numeric',
							hour: 'numeric',
							minute: 'numeric'
						})}</span
					>
				</div>
			{/if}
		</CardContent>
	</Card>
</div>
