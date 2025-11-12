<script lang="ts">
	import { Save, AlertCircle } from '@lucide/svelte';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';

	let { data } = $props();

	let settings = $state(data.settings || {
		general: {},
		authentication: {},
		notifications: {},
		security: {},
		developer: {},
		stats: {}
	});
	let loading = $state(false);
	let errorMessage = $state('');
	let successMessage = $state('');
	let activeTab = $state('general');

	// Initialize corsOriginsText from array for textarea display
	$effect(() => {
		if (settings.security.corsOrigins && Array.isArray(settings.security.corsOrigins)) {
			settings.security.corsOriginsText = settings.security.corsOrigins.join('\n');
		} else {
			settings.security.corsOriginsText = '';
		}
	});

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
			<p class="text-2xl font-bold">{settings.stats.totalUsers || 0}</p>
		</div>
		<div class="rounded-lg border bg-card p-4">
			<p class="text-sm text-muted-foreground">Total Departments</p>
			<p class="text-2xl font-bold">{settings.stats.totalDepartments || 0}</p>
		</div>
		<div class="rounded-lg border bg-card p-4">
			<p class="text-sm text-muted-foreground">Total Roles</p>
			<p class="text-2xl font-bold">{settings.stats.totalRoles || 0}</p>
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
					<label for="systemTimezone" class="block text-sm font-medium">System Timezone</label>
					<select
						id="systemTimezone"
						bind:value={settings.general.systemTimezone}
						class="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none"
					>
						<option value="UTC">UTC</option>
						<option value="America/New_York">Eastern Time</option>
						<option value="America/Chicago">Central Time</option>
						<option value="America/Denver">Mountain Time</option>
						<option value="America/Los_Angeles">Pacific Time</option>
					</select>
				</div>
			</div>
		{:else if activeTab === 'authentication'}
			<div class="space-y-4">
				<h2 class="text-xl font-semibold">Authentication Settings</h2>

				<div>
					<label for="sessionTimeoutMinutes" class="block text-sm font-medium"
						>Session Timeout (minutes)</label
					>
					<input
						id="sessionTimeoutMinutes"
						type="number"
						bind:value={settings.authentication.sessionTimeoutMinutes}
						min="5"
						max="1440"
						class="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none"
					/>
				</div>

				<div>
					<label for="minPasswordLength" class="block text-sm font-medium"
						>Minimum Password Length</label
					>
					<input
						id="minPasswordLength"
						type="number"
						bind:value={settings.authentication.minPasswordLength}
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

				<div class="space-y-2 border-t pt-4">
					<div class="flex items-center gap-2">
						<input
							id="requireMfa"
							type="checkbox"
							bind:checked={settings.authentication.requireMfa}
						/>
						<label for="requireMfa" class="text-sm font-medium"
							>Require Multi-Factor Authentication (MFA)</label
						>
					</div>

					<div class="flex items-center gap-2">
						<input
							id="passwordExpirationEnabled"
							type="checkbox"
							bind:checked={settings.authentication.passwordExpirationEnabled}
						/>
						<label for="passwordExpirationEnabled" class="text-sm font-medium"
							>Enable Password Expiration</label
						>
					</div>

					{#if settings.authentication.passwordExpirationEnabled}
						<div class="ml-6">
							<label for="passwordExpirationDays" class="block text-sm font-medium"
								>Password Expiration (days)</label
							>
							<input
								id="passwordExpirationDays"
								type="number"
								bind:value={settings.authentication.passwordExpirationDays}
								min="30"
								max="365"
								class="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none"
							/>
						</div>
					{/if}
				</div>
			</div>
		{:else if activeTab === 'notifications'}
			<div class="space-y-4">
				<h2 class="text-xl font-semibold">Notification Settings</h2>
				<p class="text-sm text-muted-foreground">
					Configure email and webhook notification channels
				</p>

				<div class="border-t pt-4">
					<h3 class="mb-2 font-medium">Email Channels</h3>
					<p class="mb-2 text-xs text-muted-foreground">
						{settings.notifications.emailChannels?.length || 0} channel(s) configured
					</p>
					<p class="text-xs text-muted-foreground">
						Email channels will be managed via API in future release
					</p>
				</div>

				<div class="border-t pt-4">
					<h3 class="mb-2 font-medium">Webhook Channels</h3>
					<p class="mb-2 text-xs text-muted-foreground">
						{settings.notifications.webhookChannels?.length || 0} channel(s) configured
					</p>
					<p class="text-xs text-muted-foreground">
						Webhook channels will be managed via API in future release
					</p>
				</div>
			</div>
		{:else if activeTab === 'security'}
			<div class="space-y-4">
				<h2 class="text-xl font-semibold">Security Settings</h2>

				<div class="space-y-2">
					<div class="flex items-center gap-2">
						<input
							id="httpsEnforced"
							type="checkbox"
							bind:checked={settings.security.httpsEnforced}
						/>
						<label for="httpsEnforced" class="text-sm font-medium">Enforce HTTPS</label>
					</div>

					<div class="flex items-center gap-2">
						<input
							id="xFrameOptions"
							type="checkbox"
							bind:checked={settings.security.xFrameOptions}
						/>
						<label for="xFrameOptions" class="text-sm font-medium"
							>Enable X-Frame-Options Header</label
						>
					</div>

					<div class="flex items-center gap-2">
						<input
							id="hstEnabled"
							type="checkbox"
							bind:checked={settings.security.hstEnabled}
						/>
						<label for="hstEnabled" class="text-sm font-medium"
							>Enable HTTP Strict Transport Security (HSTS)</label
						>
					</div>
				</div>

				<div>
					<label for="cspPolicy" class="block text-sm font-medium"
						>Content Security Policy (CSP)</label
					>
					<textarea
						id="cspPolicy"
						bind:value={settings.security.cspPolicy}
						rows="3"
						placeholder="default-src 'self'; script-src 'self' 'unsafe-inline'"
						class="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none"
					></textarea>
					<p class="mt-1 text-xs text-muted-foreground">
						Leave empty to disable CSP headers
					</p>
				</div>

				<div>
					<label for="corsOrigins" class="block text-sm font-medium"
						>CORS Allowed Origins</label
					>
					<textarea
						id="corsOrigins"
						bind:value={settings.security.corsOriginsText}
						rows="3"
						placeholder="https://example.com&#10;https://app.example.com"
						class="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none"
						onblur={() => {
							// Convert textarea to array on blur
							if (settings.security.corsOriginsText) {
								settings.security.corsOrigins = settings.security.corsOriginsText
									.split('\n')
									.map((s: string) => s.trim())
									.filter((s: string) => s.length > 0);
							} else {
								settings.security.corsOrigins = [];
							}
						}}
					></textarea>
					<p class="mt-1 text-xs text-muted-foreground">
						One origin per line (e.g., https://example.com)
					</p>
				</div>
			</div>
		{:else if activeTab === 'developer'}
			<div class="space-y-4">
				<h2 class="text-xl font-semibold">Developer Settings</h2>
				<p class="text-sm text-muted-foreground">
					Configure logging levels for frontend and backend services
				</p>

				<div class="border-t pt-4">
					<h3 class="mb-2 font-medium">Frontend Log Level</h3>
					<select
						id="logLevelFrontend"
						bind:value={settings.developer.logLevelFrontend}
						class="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none"
					>
						<option value="DEBUG">DEBUG (verbose)</option>
						<option value="INFO">INFO (normal)</option>
						<option value="WARN">WARN (important)</option>
						<option value="ERROR">ERROR (critical only)</option>
					</select>
					<p class="mt-1 text-xs text-muted-foreground">
						Controls browser console logging verbosity
					</p>
				</div>

				<div class="border-t pt-4">
					<h3 class="mb-2 font-medium">Backend Log Level</h3>
					<select
						id="logLevelBackend"
						bind:value={settings.developer.logLevelBackend}
						class="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none"
					>
						<option value="DEBUG">DEBUG (verbose)</option>
						<option value="INFO">INFO (normal)</option>
						<option value="WARN">WARN (important)</option>
						<option value="ERROR">ERROR (critical only)</option>
					</select>
					<p class="mt-1 text-xs text-muted-foreground">
						Controls Rust GraphQL server logging verbosity
					</p>
				</div>
			</div>
		{/if}
	</div>
</div>
