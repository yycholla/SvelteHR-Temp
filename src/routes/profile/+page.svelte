<script lang="ts">
	import { currentUser } from '$lib/stores/auth';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Textarea } from '$lib/components/ui/textarea';
	import * as Card from '$lib/components/ui/card';
	import { Badge } from '$lib/components/ui/badge';
	import * as Tabs from '$lib/components/ui/tabs';
	import {
		User,
		Mail,
		Phone,
		MapPin,
		Calendar,
		Building2,
		Edit,
		Camera,
		ArrowLeft,
		Trophy,
		Target,
		Clock
	} from 'lucide-svelte';

	// Mock profile data - in real app this would come from GraphQL
	const profileData = {
		personalInfo: {
			firstName: $currentUser?.display_name?.split(' ')[0] || 'John',
			lastName: $currentUser?.display_name?.split(' ')[1] || 'Doe',
			email: $currentUser?.email || 'john.doe@company.com',
			phone: '+1 (555) 123-4567',
			address: '123 Main St, Anytown, ST 12345',
			dateOfBirth: '1990-01-15',
			emergencyContact: 'Jane Doe - (555) 987-6543'
		},
		workInfo: {
			employeeId: 'EMP001',
			department: 'Engineering',
			position: 'Senior Software Developer',
			manager: 'Sarah Johnson',
			startDate: '2022-03-15',
			workLocation: 'Remote',
			employmentType: 'Full-time'
		},
		skills: [
			'JavaScript',
			'TypeScript',
			'React',
			'Svelte',
			'Node.js',
			'PostgreSQL',
			'GraphQL',
			'Docker',
			'AWS'
		],
		achievements: [
			{ title: 'Employee of the Month', date: '2024-10', type: 'recognition' },
			{ title: 'Project Leadership Award', date: '2024-08', type: 'achievement' },
			{ title: '2 Years of Service', date: '2024-03', type: 'milestone' }
		]
	};

	let isEditing = $state(false);
	let editableData = $state({ ...profileData.personalInfo });
</script>

<svelte:head>
	<title>My Profile - SvelteHR</title>
	<meta name="description" content="View and manage your employee profile" />
</svelte:head>

<div class="space-y-6">
	<!-- Header -->
	<div class="flex items-center space-x-4">
		<Button variant="outline" size="sm" href="/dashboard">
			<ArrowLeft class="mr-2 h-4 w-4" />
			Back to Dashboard
		</Button>

		<div class="flex-1">
			<h1 class="flex items-center gap-3 text-3xl font-bold tracking-tight">
				<User class="h-8 w-8" />
				My Profile
			</h1>
			<p class="text-muted-foreground">View and manage your employee information</p>
		</div>

		<Button variant="outline" onclick={() => (isEditing = !isEditing)}>
			<Edit class="mr-2 h-4 w-4" />
			{isEditing ? 'Cancel' : 'Edit Profile'}
		</Button>
	</div>

	<!-- Profile Header Card -->
	<Card.Root>
		<Card.Content class="pt-6">
			<div class="flex items-center space-x-4">
				<div class="relative">
					<div class="flex h-20 w-20 items-center justify-center rounded-full bg-primary/10">
						<User class="h-10 w-10" />
					</div>
					<Button
						size="sm"
						variant="outline"
						class="absolute -bottom-2 -right-2 h-8 w-8 rounded-full p-0"
					>
						<Camera class="h-4 w-4" />
					</Button>
				</div>
				<div class="space-y-1">
					<h2 class="text-2xl font-bold">
						{profileData.personalInfo.firstName}
						{profileData.personalInfo.lastName}
					</h2>
					<p class="text-lg text-muted-foreground">{profileData.workInfo.position}</p>
					<p class="text-sm text-muted-foreground">{profileData.workInfo.department}</p>
					<div class="flex items-center gap-4 pt-2">
						<Badge variant="secondary">Employee ID: {profileData.workInfo.employeeId}</Badge>
						<Badge variant="outline">{profileData.workInfo.employmentType}</Badge>
					</div>
				</div>
			</div>
		</Card.Content>
	</Card.Root>

	<!-- Profile Tabs -->
	<Tabs.Root value="personal" class="w-full">
		<Tabs.List class="grid w-full grid-cols-4">
			<Tabs.Trigger value="personal">Personal Info</Tabs.Trigger>
			<Tabs.Trigger value="work">Work Details</Tabs.Trigger>
			<Tabs.Trigger value="skills">Skills & Goals</Tabs.Trigger>
			<Tabs.Trigger value="achievements">Achievements</Tabs.Trigger>
		</Tabs.List>

		<!-- Personal Information -->
		<Tabs.Content value="personal" class="space-y-6">
			<Card.Root>
				<Card.Header>
					<Card.Title class="flex items-center gap-2">
						<User class="h-5 w-5" />
						Personal Information
					</Card.Title>
					<Card.Description>Your personal details and contact information</Card.Description>
				</Card.Header>
				<Card.Content class="space-y-4">
					<div class="grid grid-cols-2 gap-4">
						<div class="space-y-2">
							<Label for="firstName">First Name</Label>
							<Input id="firstName" bind:value={editableData.firstName} readonly={!isEditing} />
						</div>
						<div class="space-y-2">
							<Label for="lastName">Last Name</Label>
							<Input id="lastName" bind:value={editableData.lastName} readonly={!isEditing} />
						</div>
					</div>
					<div class="space-y-2">
						<Label for="email">Email Address</Label>
						<div class="flex items-center gap-2">
							<Mail class="h-4 w-4 text-muted-foreground" />
							<Input
								id="email"
								type="email"
								bind:value={editableData.email}
								readonly={!isEditing}
							/>
						</div>
					</div>
					<div class="space-y-2">
						<Label for="phone">Phone Number</Label>
						<div class="flex items-center gap-2">
							<Phone class="h-4 w-4 text-muted-foreground" />
							<Input id="phone" bind:value={editableData.phone} readonly={!isEditing} />
						</div>
					</div>
					<div class="space-y-2">
						<Label for="address">Address</Label>
						<div class="flex items-center gap-2">
							<MapPin class="h-4 w-4 text-muted-foreground" />
							<Textarea
								id="address"
								bind:value={editableData.address}
								readonly={!isEditing}
								rows="2"
							/>
						</div>
					</div>
					<div class="grid grid-cols-2 gap-4">
						<div class="space-y-2">
							<Label for="dob">Date of Birth</Label>
							<Input
								id="dob"
								type="date"
								bind:value={editableData.dateOfBirth}
								readonly={!isEditing}
							/>
						</div>
						<div class="space-y-2">
							<Label for="emergency">Emergency Contact</Label>
							<Input
								id="emergency"
								bind:value={editableData.emergencyContact}
								readonly={!isEditing}
							/>
						</div>
					</div>
				</Card.Content>
				{#if isEditing}
					<Card.Footer>
						<Button>Save Changes</Button>
					</Card.Footer>
				{/if}
			</Card.Root>
		</Tabs.Content>

		<!-- Work Details -->
		<Tabs.Content value="work" class="space-y-6">
			<Card.Root>
				<Card.Header>
					<Card.Title class="flex items-center gap-2">
						<Building2 class="h-5 w-5" />
						Work Information
					</Card.Title>
					<Card.Description>Your employment details and organizational information</Card.Description
					>
				</Card.Header>
				<Card.Content class="space-y-4">
					<div class="grid grid-cols-2 gap-4">
						<div class="space-y-2">
							<Label>Employee ID</Label>
							<Input value={profileData.workInfo.employeeId} readonly />
						</div>
						<div class="space-y-2">
							<Label>Department</Label>
							<Input value={profileData.workInfo.department} readonly />
						</div>
					</div>
					<div class="space-y-2">
						<Label>Position</Label>
						<Input value={profileData.workInfo.position} readonly />
					</div>
					<div class="space-y-2">
						<Label>Reporting Manager</Label>
						<Input value={profileData.workInfo.manager} readonly />
					</div>
					<div class="grid grid-cols-2 gap-4">
						<div class="space-y-2">
							<Label>Start Date</Label>
							<div class="flex items-center gap-2">
								<Calendar class="h-4 w-4 text-muted-foreground" />
								<Input value={profileData.workInfo.startDate} readonly />
							</div>
						</div>
						<div class="space-y-2">
							<Label>Work Location</Label>
							<Input value={profileData.workInfo.workLocation} readonly />
						</div>
					</div>
					<div class="space-y-2">
						<Label>Employment Type</Label>
						<Input value={profileData.workInfo.employmentType} readonly />
					</div>
				</Card.Content>
			</Card.Root>
		</Tabs.Content>

		<!-- Skills & Goals -->
		<Tabs.Content value="skills" class="space-y-6">
			<Card.Root>
				<Card.Header>
					<Card.Title class="flex items-center gap-2">
						<Target class="h-5 w-5" />
						Skills & Competencies
					</Card.Title>
					<Card.Description>Your technical skills and areas of expertise</Card.Description>
				</Card.Header>
				<Card.Content>
					<div class="flex flex-wrap gap-2">
						{#each profileData.skills as skill}
							<Badge variant="secondary">{skill}</Badge>
						{/each}
					</div>
				</Card.Content>
				<Card.Footer>
					<Button variant="outline">Manage Skills</Button>
				</Card.Footer>
			</Card.Root>

			<Card.Root>
				<Card.Header>
					<Card.Title>Current Goals</Card.Title>
					<Card.Description>Your active performance goals and objectives</Card.Description>
				</Card.Header>
				<Card.Content>
					<div class="space-y-3">
						<div class="flex items-center justify-between rounded-lg border p-3">
							<div>
								<h4 class="font-medium">Complete React certification</h4>
								<p class="text-sm text-muted-foreground">Due: Dec 31, 2024</p>
							</div>
							<Badge variant="outline">In Progress</Badge>
						</div>
						<div class="flex items-center justify-between rounded-lg border p-3">
							<div>
								<h4 class="font-medium">Lead project migration to Svelte</h4>
								<p class="text-sm text-muted-foreground">Due: Mar 15, 2025</p>
							</div>
							<Badge variant="secondary">Planning</Badge>
						</div>
					</div>
				</Card.Content>
				<Card.Footer>
					<Button variant="outline" href="/dashboard/users/{$currentUser?.id}/performance"
						>View Performance</Button
					>
				</Card.Footer>
			</Card.Root>
		</Tabs.Content>

		<!-- Achievements -->
		<Tabs.Content value="achievements" class="space-y-6">
			<Card.Root>
				<Card.Header>
					<Card.Title class="flex items-center gap-2">
						<Trophy class="h-5 w-5" />
						Achievements & Recognition
					</Card.Title>
					<Card.Description>Your accomplishments and recognition history</Card.Description>
				</Card.Header>
				<Card.Content>
					<div class="space-y-4">
						{#each profileData.achievements as achievement}
							<div class="flex items-center gap-4 rounded-lg border p-4">
								<div class="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
									{#if achievement.type === 'recognition'}
										<Trophy class="h-5 w-5 text-yellow-600" />
									{:else if achievement.type === 'achievement'}
										<Target class="h-5 w-5 text-blue-600" />
									{:else}
										<Clock class="h-5 w-5 text-green-600" />
									{/if}
								</div>
								<div class="flex-1">
									<h4 class="font-medium">{achievement.title}</h4>
									<p class="text-sm text-muted-foreground">Received on {achievement.date}</p>
								</div>
								<Badge variant="outline">{achievement.type}</Badge>
							</div>
						{/each}
					</div>
				</Card.Content>
			</Card.Root>
		</Tabs.Content>
	</Tabs.Root>
</div>
