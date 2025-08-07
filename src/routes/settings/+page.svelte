<script lang="ts">
	import { Settings, User, Bell, Shield, Globe, Palette, Save } from 'lucide-svelte';
	import Button from '$lib/components/ui/button/button.svelte';
	import Card from '$lib/components/ui/card/card.svelte';
	import CardHeader from '$lib/components/ui/card/card-header.svelte';
	import CardTitle from '$lib/components/ui/card/card-title.svelte';
	import CardContent from '$lib/components/ui/card/card-content.svelte';
	import Separator from '$lib/components/ui/separator/separator.svelte';
	
	let activeTab = $state('profile');
	
	const tabs = [
		{ id: 'profile', label: 'Profile', icon: User },
		{ id: 'notifications', label: 'Notifications', icon: Bell },
		{ id: 'security', label: 'Security', icon: Shield },
		{ id: 'preferences', label: 'Preferences', icon: Palette },
		{ id: 'system', label: 'System', icon: Globe }
	];
</script>

<svelte:head>
	<title>Settings - SvelteHR</title>
</svelte:head>

<div class="container mx-auto px-6 pb-6 pt-6">
	<!-- Page Header -->
	<div class="mb-8">
		<div class="flex items-center justify-between">
			<div>
				<h1 class="text-3xl font-bold bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text text-transparent">
					Settings
				</h1>
				<p class="text-muted-foreground mt-1">
					Manage your account and application preferences
				</p>
			</div>
			
			<div class="flex items-center space-x-3">
				<Button variant="outline" class="rounded-xl">
					Reset to Default
				</Button>
				<Button class="rounded-xl">
					<Save class="h-4 w-4 mr-2" />
					Save Changes
				</Button>
			</div>
		</div>
	</div>

	<!-- Settings Layout -->
	<div class="grid gap-6 lg:grid-cols-4">
		<!-- Sidebar Navigation -->
		<div class="lg:col-span-1">
			<Card class="rounded-2xl border-border/40 bg-background/20 backdrop-blur-md shadow-xl">
				<CardContent class="p-2">
					<nav class="space-y-1">
						{#each tabs as tab}
							{@const IconComponent = tab.icon}
							<Button
								variant={activeTab === tab.id ? 'default' : 'ghost'}
								class="w-full justify-start rounded-xl"
								onclick={() => activeTab = tab.id}
							>
								<IconComponent class="h-4 w-4 mr-2" />
								{tab.label}
							</Button>
						{/each}
					</nav>
				</CardContent>
			</Card>
		</div>

		<!-- Main Settings Content -->
		<div class="lg:col-span-3">
			<Card class="rounded-2xl border-border/40 bg-background/20 backdrop-blur-md shadow-xl">
				<CardHeader>
					<CardTitle class="flex items-center">
						{#each tabs as tab}
							{#if tab.id === activeTab}
								{@const IconComponent = tab.icon}
								<IconComponent class="h-5 w-5 mr-2" />
								{tab.label}
							{/if}
						{/each}
					</CardTitle>
				</CardHeader>
				<Separator />
				<CardContent class="p-6">
					{#if activeTab === 'profile'}
						<div class="space-y-6">
							<div>
								<h3 class="text-lg font-semibold mb-4">Profile Information</h3>
								<div class="space-y-4">
									<div class="grid grid-cols-2 gap-4">
										<div>
											<label class="text-sm font-medium">First Name</label>
											<div class="mt-1 p-2 border rounded-lg bg-background/10">John</div>
										</div>
										<div>
											<label class="text-sm font-medium">Last Name</label>
											<div class="mt-1 p-2 border rounded-lg bg-background/10">Doe</div>
										</div>
									</div>
									<div>
										<label class="text-sm font-medium">Email</label>
										<div class="mt-1 p-2 border rounded-lg bg-background/10">john.doe@company.com</div>
									</div>
									<div>
										<label class="text-sm font-medium">Job Title</label>
										<div class="mt-1 p-2 border rounded-lg bg-background/10">HR Manager</div>
									</div>
								</div>
							</div>
						</div>

					{:else if activeTab === 'notifications'}
						<div class="space-y-6">
							<div>
								<h3 class="text-lg font-semibold mb-4">Notification Preferences</h3>
								<div class="space-y-4">
									<div class="flex items-center justify-between p-4 border rounded-lg">
										<div>
											<div class="font-medium">Email Notifications</div>
											<div class="text-sm text-muted-foreground">Receive notifications via email</div>
										</div>
										<div class="w-12 h-6 bg-primary rounded-full"></div>
									</div>
									<div class="flex items-center justify-between p-4 border rounded-lg">
										<div>
											<div class="font-medium">Push Notifications</div>
											<div class="text-sm text-muted-foreground">Receive browser notifications</div>
										</div>
										<div class="w-12 h-6 bg-muted rounded-full"></div>
									</div>
								</div>
							</div>
						</div>

					{:else if activeTab === 'security'}
						<div class="space-y-6">
							<div>
								<h3 class="text-lg font-semibold mb-4">Security Settings</h3>
								<div class="space-y-4">
									<div class="p-4 border rounded-lg">
										<div class="font-medium mb-2">Password</div>
										<div class="text-sm text-muted-foreground mb-4">Last changed 30 days ago</div>
										<Button variant="outline" class="rounded-xl">Change Password</Button>
									</div>
									<div class="p-4 border rounded-lg">
										<div class="font-medium mb-2">Two-Factor Authentication</div>
										<div class="text-sm text-muted-foreground mb-4">Not enabled</div>
										<Button variant="outline" class="rounded-xl">Enable 2FA</Button>
									</div>
								</div>
							</div>
						</div>

					{:else if activeTab === 'preferences'}
						<div class="space-y-6">
							<div>
								<h3 class="text-lg font-semibold mb-4">Application Preferences</h3>
								<div class="space-y-4">
									<div class="p-4 border rounded-lg">
										<div class="font-medium mb-2">Theme</div>
										<div class="text-sm text-muted-foreground mb-4">Choose your preferred theme</div>
										<div class="flex space-x-2">
											<Button variant="default" size="sm" class="rounded-xl">Light</Button>
											<Button variant="outline" size="sm" class="rounded-xl">Dark</Button>
											<Button variant="outline" size="sm" class="rounded-xl">System</Button>
										</div>
									</div>
									<div class="p-4 border rounded-lg">
										<div class="font-medium mb-2">Language</div>
										<div class="text-sm text-muted-foreground mb-4">English (US)</div>
										<Button variant="outline" class="rounded-xl">Change Language</Button>
									</div>
								</div>
							</div>
						</div>

					{:else if activeTab === 'system'}
						<div class="space-y-6">
							<div>
								<h3 class="text-lg font-semibold mb-4">System Settings</h3>
								<div class="space-y-4">
									<div class="p-4 border rounded-lg">
										<div class="font-medium mb-2">Company Information</div>
										<div class="text-sm text-muted-foreground mb-4">Manage organization details</div>
										<Button variant="outline" class="rounded-xl">Edit Company Info</Button>
									</div>
									<div class="p-4 border rounded-lg">
										<div class="font-medium mb-2">User Management</div>
										<div class="text-sm text-muted-foreground mb-4">Manage user roles and permissions</div>
										<Button variant="outline" class="rounded-xl">Manage Users</Button>
									</div>
								</div>
							</div>
						</div>
					{/if}
				</CardContent>
			</Card>
		</div>
	</div>
</div>