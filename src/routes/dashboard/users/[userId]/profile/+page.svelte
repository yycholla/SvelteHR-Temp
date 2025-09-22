<script lang="ts">
	import { page } from '$app/stores';
	import { currentUser } from '$lib/stores/auth';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Textarea } from '$lib/components/ui/textarea';
	import * as Card from '$lib/components/ui/card';
	import * as Badge from '$lib/components/ui/badge';
	import * as Tabs from '$lib/components/ui/tabs';
	import { createUrqlClient } from '$lib/graphql/client';
	import { gql } from '@urql/svelte';
	import {
		User,
		Mail,
		Phone,
		MapPin,
		Calendar,
		Building2,
		Trophy,
		Clock,
		Settings
	} from 'lucide-svelte';
	import { onMount } from 'svelte';

	// Get user ID from URL params
	const userId = $page.params.userId;

	// Check if viewing own profile
	const isOwnProfile = $derived($currentUser?.id === userId);

	// GraphQL client
	const client = createUrqlClient();

	// GraphQL queries
	const GET_USER_PROFILE_QUERY = gql`
		query GetUserProfile($userId: UUID!) {
			userById(id: $userId) {
				id
				email
				displayName
				isActive
				createdAt
			}
			allUserPreferences(condition: { userId: $userId }) {
				nodes {
					phone
					address
					city
					state
					zipCode
					country
					emergencyContactFirstName
					emergencyContactLastName
					emergencyContactPhone
					emergencyContactEmail
					emergencyContactRelation
				}
			}
		}
	`;

	// State for profile data
	let profileData = $state(null);
	let loading = $state(true);

	// Load profile data
	async function loadProfile() {
		try {
			loading = true;
			const result = await client.query(GET_USER_PROFILE_QUERY, { userId }).toPromise();

			if (result.data?.userById) {
				const user = result.data.userById;
				const preferences = result.data.allUserPreferences?.nodes?.[0] || {};

				const nameParts = user.displayName?.split(' ') || [];

				profileData = {
					personalInfo: {
						firstName: nameParts[0] || '',
						lastName: nameParts.slice(1).join(' ') || '',
						email: user.email,
						phone: preferences.phone || '',
						address: preferences.address || '',
						city: preferences.city || '',
						state: preferences.state || '',
						zipCode: preferences.zipCode || '',
						country: preferences.country || '',
						emergencyContactFirstName: preferences.emergencyContactFirstName || '',
						emergencyContactLastName: preferences.emergencyContactLastName || '',
						emergencyContactPhone: preferences.emergencyContactPhone || '',
						emergencyContactEmail: preferences.emergencyContactEmail || '',
						emergencyContactRelation: preferences.emergencyContactRelation || ''
					},
					workInfo: {
						employeeId: user.id.substring(0, 8).toUpperCase(),
						position: 'Employee', // This would come from HR data
						startDate: new Date(user.createdAt).toLocaleDateString(),
						status: user.isActive ? 'Active' : 'Inactive'
					}
				};
			}
		} catch (error) {
			console.error('Error loading profile:', error);
		} finally {
			loading = false;
		}
	}

	onMount(() => {
		if (userId) {
			loadProfile();
		}
	});
</script>

<svelte:head>
	<title>{isOwnProfile ? 'My Profile' : 'Employee Profile'} - SvelteHR</title>
	<meta name="description" content="View employee profile information" />
</svelte:head>

<div class="space-y-8">
	<!-- Header -->
	<div class="flex items-center justify-between">
		<div>
			<h1 class="flex items-center gap-3 text-3xl font-bold tracking-tight">
				<User class="h-8 w-8" />
				{isOwnProfile ? 'My Profile' : 'Employee Profile'}
			</h1>
			<p class="text-muted-foreground">
				{isOwnProfile ? 'View your employee information' : 'View employee information'}
			</p>
		</div>

		{#if isOwnProfile}
			<Button href="/dashboard/users/{userId}/settings">
				<Settings class="mr-2 h-4 w-4" />
				Edit Profile
			</Button>
		{/if}
	</div>

	{#if loading}
		<div class="text-center py-8">
			<p class="text-muted-foreground">Loading profile...</p>
		</div>
	{:else if profileData}
		<!-- Profile Header Card -->
		<Card.Root>
			<Card.Content class="pt-6">
				<div class="flex items-center space-x-4">
					<div class="flex h-20 w-20 items-center justify-center rounded-full bg-primary/10">
						<User class="h-10 w-10" />
					</div>
					<div class="space-y-1">
						<h2 class="text-2xl font-bold">{profileData.personalInfo.firstName} {profileData.personalInfo.lastName}</h2>
						<p class="text-lg text-muted-foreground">{profileData.workInfo.position}</p>
						<div class="flex items-center gap-4 pt-2">
							<Badge.Root variant="secondary">Employee ID: {profileData.workInfo.employeeId}</Badge.Root>
							<Badge.Root variant={profileData.workInfo.status === 'Active' ? 'default' : 'secondary'}>
								{profileData.workInfo.status}
							</Badge.Root>
						</div>
					</div>
				</div>
			</Card.Content>
		</Card.Root>

		<!-- Profile Tabs -->
		<Tabs.Root value="personal" class="w-full">
			<Tabs.List class="grid w-full grid-cols-3">
				<Tabs.Trigger value="personal">Personal Info</Tabs.Trigger>
				<Tabs.Trigger value="work">Work Details</Tabs.Trigger>
				<Tabs.Trigger value="emergency">Emergency Contact</Tabs.Trigger>
			</Tabs.List>

			<!-- Personal Information -->
			<Tabs.Content value="personal" class="space-y-6">
				<Card.Root>
					<Card.Header>
						<Card.Title class="flex items-center gap-2">
							<User class="h-5 w-5" />
							Personal Information
						</Card.Title>
						<Card.Description>Personal details and contact information</Card.Description>
					</Card.Header>
					<Card.Content class="space-y-4">
						<div class="grid grid-cols-2 gap-4">
							<div class="space-y-2">
								<Label>First Name</Label>
								<Input value={profileData.personalInfo.firstName} readonly />
							</div>
							<div class="space-y-2">
								<Label>Last Name</Label>
								<Input value={profileData.personalInfo.lastName} readonly />
							</div>
						</div>
						<div class="space-y-2">
							<Label>Email Address</Label>
							<div class="flex items-center gap-2">
								<Mail class="h-4 w-4 text-muted-foreground" />
								<Input value={profileData.personalInfo.email} readonly />
							</div>
						</div>
						<div class="space-y-2">
							<Label>Phone Number</Label>
							<div class="flex items-center gap-2">
								<Phone class="h-4 w-4 text-muted-foreground" />
								<Input value={profileData.personalInfo.phone || 'Not provided'} readonly />
							</div>
						</div>
						<div class="space-y-2">
							<Label>Address</Label>
							<div class="flex items-center gap-2">
								<MapPin class="h-4 w-4 text-muted-foreground" />
								<Textarea
									value={profileData.personalInfo.address || 'Not provided'}
									readonly
									rows="2"
								/>
							</div>
						</div>
						<div class="grid grid-cols-2 gap-4">
							<div class="space-y-2">
								<Label>City</Label>
								<Input value={profileData.personalInfo.city || 'Not provided'} readonly />
							</div>
							<div class="space-y-2">
								<Label>State/Province</Label>
								<Input value={profileData.personalInfo.state || 'Not provided'} readonly />
							</div>
						</div>
						<div class="grid grid-cols-2 gap-4">
							<div class="space-y-2">
								<Label>ZIP/Postal Code</Label>
								<Input value={profileData.personalInfo.zipCode || 'Not provided'} readonly />
							</div>
							<div class="space-y-2">
								<Label>Country</Label>
								<Input value={profileData.personalInfo.country || 'Not provided'} readonly />
							</div>
						</div>
					</Card.Content>
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
						<Card.Description>Employment details and organizational information</Card.Description>
					</Card.Header>
					<Card.Content class="space-y-4">
						<div class="grid grid-cols-2 gap-4">
							<div class="space-y-2">
								<Label>Employee ID</Label>
								<Input value={profileData.workInfo.employeeId} readonly />
							</div>
							<div class="space-y-2">
								<Label>Position</Label>
								<Input value={profileData.workInfo.position} readonly />
							</div>
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
								<Label>Employment Status</Label>
								<Input value={profileData.workInfo.status} readonly />
							</div>
						</div>
					</Card.Content>
				</Card.Root>
			</Tabs.Content>

			<!-- Emergency Contact -->
			<Tabs.Content value="emergency" class="space-y-6">
				<Card.Root>
					<Card.Header>
						<Card.Title class="flex items-center gap-2">
							<Phone class="h-5 w-5" />
							Emergency Contact
						</Card.Title>
						<Card.Description>Emergency contact information</Card.Description>
					</Card.Header>
					<Card.Content class="space-y-4">
						{#if profileData.personalInfo.emergencyContactFirstName || profileData.personalInfo.emergencyContactLastName}
							<div class="grid grid-cols-2 gap-4">
								<div class="space-y-2">
									<Label>First Name</Label>
									<Input value={profileData.personalInfo.emergencyContactFirstName || 'Not provided'} readonly />
								</div>
								<div class="space-y-2">
									<Label>Last Name</Label>
									<Input value={profileData.personalInfo.emergencyContactLastName || 'Not provided'} readonly />
								</div>
							</div>
							<div class="grid grid-cols-2 gap-4">
								<div class="space-y-2">
									<Label>Phone Number</Label>
									<div class="flex items-center gap-2">
										<Phone class="h-4 w-4 text-muted-foreground" />
										<Input value={profileData.personalInfo.emergencyContactPhone || 'Not provided'} readonly />
									</div>
								</div>
								<div class="space-y-2">
									<Label>Email Address</Label>
									<div class="flex items-center gap-2">
										<Mail class="h-4 w-4 text-muted-foreground" />
										<Input value={profileData.personalInfo.emergencyContactEmail || 'Not provided'} readonly />
									</div>
								</div>
							</div>
							<div class="space-y-2">
								<Label>Relationship</Label>
								<Input value={profileData.personalInfo.emergencyContactRelation || 'Not provided'} readonly />
							</div>
						{:else}
							<div class="text-center py-8">
								<Phone class="h-12 w-12 mx-auto text-muted-foreground mb-4" />
								<h3 class="text-lg font-semibold mb-2">No Emergency Contact</h3>
								<p class="text-muted-foreground mb-4">No emergency contact information has been provided.</p>
								{#if isOwnProfile}
									<Button href="/dashboard/users/{userId}/settings">
										Add Emergency Contact
									</Button>
								{/if}
							</div>
						{/if}
					</Card.Content>
				</Card.Root>
			</Tabs.Content>
		</Tabs.Root>
	{:else}
		<div class="text-center py-8">
			<User class="h-12 w-12 mx-auto text-muted-foreground mb-4" />
			<h3 class="text-lg font-semibold mb-2">Profile Not Found</h3>
			<p class="text-muted-foreground">The requested profile could not be found.</p>
		</div>
	{/if}
</div>