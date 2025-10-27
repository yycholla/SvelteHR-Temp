<script lang="ts">
	import { Save, AlertCircle } from '@lucide/svelte';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';

	let { data } = $props();

	let settings = $state({ ...data.settings });
	let loading = $state(false);
	let errorMessage = $state('');
	let successMessage = $state('');
	let activeTab = $state('general');

	async function handleSaveSettings() {
		loading = true;
		errorMessage = '';
		successMessage = '';

		try {
			// Save each settings category via GraphQL mutation
			const categories = ['general', 'authentication', 'notifications', 'security', 'developer'];

			for (const category of categories) {
				const response = await fetch('/api/settings/update', {
					method: 'POST',
					headers: {
						'Content-Type': 'application/json'
					},
					body: JSON.stringify({
						category,
						settings: settings[category]
					})
				});

				if (!response.ok) {
					const error = await response.json();
					throw new Error(error.message || `Failed to save ${category} settings`);
				}
			}

			successMessage = 'Settings saved successfully';
			setTimeout(() => {
				successMessage = '';
			}, 3000);
		} catch (error: any) {
			console.error('Save settings error:', error);
			errorMessage = error.message || 'Failed to save settings';
		} finally {
			loading = false;
		}
	}

	const tabs = [
		{ id: 'general', label: 'General' },
		{ id: 'authentication', label: 'Authentication' },
		{ id: 'notifications', label: 'Notifications' },
		{ id: 'security', label: 'Security' },
		{ id: 'developer', label: 'Developer' }
	];
</script>

<div class="space-y-6 p-6">
	<!-- Header -->
	<div class="flex items-center justify-between">
		<div>
			<h1 class="text-3xl font-bold">System Settings</h1>
			<p class="text-muted-foreground">Configure system-wide settings and preferences</p>
		</div>
		<button
			onclick={handleSaveSettings}
			disabled={loading}
			class="flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
		>
			<Save class="h-4 w-4" />
			{loading ? 'Saving...' : 'Save Changes'}
		</button>
	</div>

	<!-- Error/Success Messages -->
	{#if data.error}
		<div class="flex items-center gap-2 rounded-md bg-destructive/10 p-4 text-destructive">
			<AlertCircle class="h-4 w-4" />
			{data.error}
		</div>
	{/if}

	{#if errorMessage}
		<div class="flex items-center gap-2 rounded-md bg-destructive/10 p-4 text-destructive">
			<AlertCircle class="h-4 w-4" />
			{errorMessage}
		</div>
	{/if}

	{#if successMessage}
		<div class="rounded-md bg-green-500/10 p-4 text-green-600">
			{successMessage}
		</div>
	{/if}

	<!-- System Stats -->
	<div class="grid gap-4 md:grid-cols-3">
		<div class="rounded-lg border bg-card p-4">
			<p class="text-sm text-muted-foreground">Total Users</p>
			<p class="text-2xl font-bold">{settings.stats.totalUsers}</p>
		</div>
		<div class="rounded-lg border bg-card p-4">
			<p class="text-sm text-muted-foreground">Total Departments</p>
			<p class="text-2xl font-bold">{settings.stats.totalDepartments}</p>
		</div>
		<div class="rounded-lg border bg-card p-4">
			<p class="text-sm text-muted-foreground">Total Roles</p>
			<p class="text-2xl font-bold">{settings.stats.totalRoles}</p>
		</div>
	</div>

	<!-- Tabs -->
	<div class="border-b">
		<div class="flex gap-4">
			{#each tabs as tab}
				<button
					onclick={() => (activeTab = tab.id)}
					class="border-b-2 px-4 py-2 text-sm font-medium transition-colors"
					class:border-primary={activeTab === tab.id}
					class:text-primary={activeTab === tab.id}
					class:border-transparent={activeTab !== tab.id}
					class:text-muted-foreground={activeTab !== tab.id}
				>
					{tab.label}
				</button>
			{/each}
		</div>
	</div>

	<!-- Settings Content -->
	<div class="rounded-lg border bg-card p-6" data-testid="admin-settings-form">
		{#if activeTab === 'general'}
			<div class="space-y-4">
				<h2 class="text-xl font-semibold">General Settings</h2>

				<div>
					<label for="systemName" class="block text-sm font-medium">System Name</label>
					<input
						id="systemName"
						type="text"
						bind:value={settings.general.systemName}
						class="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none"
					/>
				</div>

				<div>
					<label for="systemEmail" class="block text-sm font-medium">System Email</label>
					<input
						id="systemEmail"
						type="email"
						bind:value={settings.general.systemEmail}
						class="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none"
					/>
				</div>

				<div>
					<label for="timezone" class="block text-sm font-medium">Timezone</label>
					<select
						id="timezone"
						bind:value={settings.general.timezone}
						class="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none"
					>
						<option value="UTC">UTC</option>
						<option value="America/New_York">Eastern Time</option>
						<option value="America/Chicago">Central Time</option>
						<option value="America/Denver">Mountain Time</option>
						<option value="America/Los_Angeles">Pacific Time</option>
					</select>
				</div>

				<div>
					<label for="dateFormat" class="block text-sm font-medium">Date Format</label>
					<select
						id="dateFormat"
						bind:value={settings.general.dateFormat}
						class="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none"
					>
						<option value="YYYY-MM-DD">YYYY-MM-DD</option>
						<option value="MM/DD/YYYY">MM/DD/YYYY</option>
						<option value="DD/MM/YYYY">DD/MM/YYYY</option>
					</select>
				</div>

				<div>
					<label for="language" class="block text-sm font-medium">Language</label>
					<select
						id="language"
						bind:value={settings.general.language}
						class="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none"
					>
						<option value="en">English</option>
						<option value="es">Spanish</option>
						<option value="fr">French</option>
						<option value="de">German</option>
					</select>
				</div>
			</div>
		{:else if activeTab === 'authentication'}
			<div class="space-y-4">
				<h2 class="text-xl font-semibold">Authentication Settings</h2>

				<div>
					<label for="sessionTimeout" class="block text-sm font-medium"
						>Session Timeout (seconds)</label
					>
					<input
						id="sessionTimeout"
						type="number"
						bind:value={settings.authentication.sessionTimeout}
						class="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none"
					/>
				</div>

				<div>
					<label for="passwordMinLength" class="block text-sm font-medium"
						>Minimum Password Length</label
					>
					<input
						id="passwordMinLength"
						type="number"
						bind:value={settings.authentication.passwordMinLength}
						min="6"
						max="32"
						class="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none"
					/>
				</div>

				<div>
					<label for="maxLoginAttempts" class="block text-sm font-medium"
						>Max Login Attempts</label
					>
					<input
						id="maxLoginAttempts"
						type="number"
						bind:value={settings.authentication.maxLoginAttempts}
						min="3"
						max="10"
						class="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none"
					/>
				</div>

				<div class="space-y-2">
					<div class="flex items-center gap-2">
						<input
							id="requireUppercase"
							type="checkbox"
							bind:checked={settings.authentication.requireUppercase}
						/>
						<label for="requireUppercase" class="text-sm font-medium"
							>Require uppercase letters</label
						>
					</div>

					<div class="flex items-center gap-2">
						<input
							id="requireNumbers"
							type="checkbox"
							bind:checked={settings.authentication.requireNumbers}
						/>
						<label for="requireNumbers" class="text-sm font-medium">Require numbers</label>
					</div>

					<div class="flex items-center gap-2">
						<input
							id="requireSpecialChars"
							type="checkbox"
							bind:checked={settings.authentication.requireSpecialChars}
						/>
						<label for="requireSpecialChars" class="text-sm font-medium"
							>Require special characters</label
						>
					</div>
				</div>
			</div>
		{:else if activeTab === 'notifications'}
			<div class="space-y-4">
				<h2 class="text-xl font-semibold">Notification Settings</h2>

				<div class="space-y-2">
					<div class="flex items-center gap-2">
						<input
							id="emailEnabled"
							type="checkbox"
							bind:checked={settings.notifications.emailEnabled}
						/>
						<label for="emailEnabled" class="text-sm font-medium">Enable email notifications</label
						>
					</div>

					<div class="flex items-center gap-2">
						<input
							id="slackEnabled"
							type="checkbox"
							bind:checked={settings.notifications.slackEnabled}
						/>
						<label for="slackEnabled" class="text-sm font-medium">Enable Slack notifications</label
						>
					</div>

					<div class="flex items-center gap-2">
						<input
							id="webhooksEnabled"
							type="checkbox"
							bind:checked={settings.notifications.webhooksEnabled}
						/>
						<label for="webhooksEnabled" class="text-sm font-medium">Enable webhooks</label>
					</div>
				</div>

				<div class="border-t pt-4">
					<h3 class="mb-2 font-medium">Notification Triggers</h3>

					<div class="space-y-2">
						<div class="flex items-center gap-2">
							<input
								id="notifyOnUserCreate"
								type="checkbox"
								bind:checked={settings.notifications.notifyOnUserCreate}
							/>
							<label for="notifyOnUserCreate" class="text-sm">Notify on user creation</label>
						</div>

						<div class="flex items-center gap-2">
							<input
								id="notifyOnRoleChange"
								type="checkbox"
								bind:checked={settings.notifications.notifyOnRoleChange}
							/>
							<label for="notifyOnRoleChange" class="text-sm">Notify on role changes</label>
						</div>
					</div>
				</div>
			</div>
		{:else if activeTab === 'security'}
			<div class="space-y-4">
				<h2 class="text-xl font-semibold">Security Settings</h2>

				<div class="space-y-2">
					<div class="flex items-center gap-2">
						<input
							id="enforceHttps"
							type="checkbox"
							bind:checked={settings.security.enforceHttps}
						/>
						<label for="enforceHttps" class="text-sm font-medium">Enforce HTTPS</label>
					</div>

					<div class="flex items-center gap-2">
						<input
							id="allowApiAccess"
							type="checkbox"
							bind:checked={settings.security.allowApiAccess}
						/>
						<label for="allowApiAccess" class="text-sm font-medium">Allow API access</label>
					</div>

					<div class="flex items-center gap-2">
						<input
							id="rateLimitEnabled"
							type="checkbox"
							bind:checked={settings.security.rateLimitEnabled}
						/>
						<label for="rateLimitEnabled" class="text-sm font-medium">Enable rate limiting</label>
					</div>
				</div>

				<div>
					<label for="maxRequestsPerMinute" class="block text-sm font-medium"
						>Max Requests Per Minute</label
					>
					<input
						id="maxRequestsPerMinute"
						type="number"
						bind:value={settings.security.maxRequestsPerMinute}
						min="10"
						max="1000"
						class="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none"
					/>
				</div>

				<div>
					<label for="ipWhitelist" class="block text-sm font-medium"
						>IP Whitelist (comma-separated)</label
					>
					<textarea
						id="ipWhitelist"
						bind:value={settings.security.ipWhitelist}
						rows="3"
						placeholder="192.168.1.1, 10.0.0.1"
						class="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none"
					></textarea>
				</div>

				<div>
					<label for="corsOrigins" class="block text-sm font-medium"
						>CORS Allowed Origins (comma-separated)</label
					>
					<textarea
						id="corsOrigins"
						bind:value={settings.security.corsOrigins}
						rows="3"
						placeholder="https://example.com, https://app.example.com"
						class="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none"
					></textarea>
				</div>
			</div>
		{:else if activeTab === 'developer'}
			<div class="space-y-4">
				<h2 class="text-xl font-semibold">Developer Settings</h2>
				<p class="text-sm text-muted-foreground">
					Debug tools and development options (system_admin only)
				</p>

				<div class="space-y-4 border-t pt-4">
					<h3 class="font-medium">Debug Information</h3>

					<div class="flex items-center gap-2">
						<input
							id="showDebugInfo"
							type="checkbox"
							bind:checked={settings.developer.show_debug_info}
						/>
						<label for="showDebugInfo" class="text-sm font-medium">
							Show debug information in sidebar
						</label>
					</div>
					<p class="ml-6 text-xs text-muted-foreground">
						Displays current user, role, page load times, and auth status in the sidebar
					</p>

					<div class="flex items-center gap-2">
						<input
							id="showPerformanceMetrics"
							type="checkbox"
							bind:checked={settings.developer.show_performance_metrics}
						/>
						<label for="showPerformanceMetrics" class="text-sm font-medium">
							Show performance metrics
						</label>
					</div>
					<p class="ml-6 text-xs text-muted-foreground">
						Displays element load times and performance data
					</p>
				</div>

				<div class="border-t pt-4">
					<h3 class="mb-2 font-medium">Log Level</h3>
					<select
						id="logLevel"
						bind:value={settings.developer.log_level}
						class="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none"
					>
						<option value="debug">Debug (verbose)</option>
						<option value="info">Info (normal)</option>
						<option value="warn">Warning (important)</option>
						<option value="error">Error (critical only)</option>
					</select>
					<p class="mt-1 text-xs text-muted-foreground">
						Controls the verbosity of console logging
					</p>
				</div>
			</div>
		{/if}
	</div>
</div>
