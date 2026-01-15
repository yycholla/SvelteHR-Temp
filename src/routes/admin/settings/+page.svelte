<script lang="ts">
	import {
		AlertCircle,
		Save,
		Globe,
		Lock,
		Bell,
		Shield,
		Terminal,
		Activity,
		Plug
	} from '@lucide/svelte';
	import { logger } from '$lib/utils/logger';
	import { Button } from '$lib/components/ui/button';

	const { data } = $props();

	const settings = $state(
		data.settings || {
			general: {},
			authentication: {},
			notifications: {},
			security: {},
			developer: {},
			stats: {}
		}
	);
	let loading = $state(false);
	let errorMessage = $state('');
	let successMessage = $state('');
	let activeTab = $state('general');

	// Initialize corsOriginsText
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
			const categories = ['general', 'authentication', 'notifications', 'security', 'developer'];
			for (const category of categories) {
				const response = await fetch('/api/settings/update', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ category, settings: settings[category] })
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
			logger.error('Save settings error:', error as Error);
			errorMessage = error.message || 'Failed to save settings';
		} finally {
			loading = false;
		}
	}

	const tabs = [
		{ id: 'general', label: 'General', icon: Globe },
		{ id: 'authentication', label: 'Authentication', icon: Lock },
		{ id: 'notifications', label: 'Notifications', icon: Bell },
		{ id: 'security', label: 'Security', icon: Shield },
		{ id: 'developer', label: 'Developer', icon: Terminal },
		{ id: 'integrations', label: 'Integrations', icon: Plug, href: '/admin/settings/integrations' }
	];
</script>

<div class="flex flex-col h-full bg-background overflow-hidden">
	<!-- Toolbar -->
	<header
		class="flex-shrink-0 flex items-center justify-between h-14 px-4 border-b bg-background z-20"
	>
		<div class="flex items-center gap-4">
			<h1 class="text-sm font-semibold tracking-tight">System Settings</h1>
			<div class="h-4 w-px bg-border"></div>
			<div class="text-xs text-muted-foreground flex items-center gap-2">
				<Activity class="h-3.5 w-3.5" />
				<span>{settings.stats.totalUsers || 0} Users</span>
				<span class="text-border">|</span>
				<span>{settings.stats.totalDepartments || 0} Depts</span>
			</div>
		</div>
		<Button size="sm" onclick={handleSaveSettings} disabled={loading} class="h-8">
			<Save class="mr-2 h-3.5 w-3.5" />
			{loading ? 'Saving...' : 'Save Changes'}
		</Button>
	</header>

	<div class="flex flex-1 overflow-hidden">
		<!-- Sidebar Tabs -->
		<nav class="w-64 border-r bg-muted/5 flex-shrink-0 overflow-y-auto p-2 space-y-1">
			<div
				class="px-2 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1"
			>
				Categories
			</div>
			{#each tabs as tab}
				{@const Icon = tab.icon}
				{#if tab.href}
					<!-- External link tab -->
					<a
						href={tab.href}
						class="w-full flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md transition-colors
						text-muted-foreground hover:bg-muted hover:text-foreground"
					>
						<Icon class="h-4 w-4" />
						{tab.label}
					</a>
				{:else}
					<!-- In-page tab -->
					<button
						onclick={() => (activeTab = tab.id)}
						class="w-full flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md transition-colors text-left
						{activeTab === tab.id
							? 'bg-primary/10 text-primary'
							: 'text-muted-foreground hover:bg-muted hover:text-foreground'}"
					>
						<Icon class="h-4 w-4" />
						{tab.label}
					</button>
				{/if}
			{/each}
		</nav>

		<!-- Main Content -->
		<div class="flex-1 overflow-y-auto bg-background" data-testid="admin-settings-form">
			<div class="max-w-3xl p-8 space-y-8">
				{#if errorMessage}
					<div
						class="rounded-md bg-destructive/10 p-4 text-sm text-destructive flex items-center gap-2"
					>
						<AlertCircle class="h-4 w-4" />
						{errorMessage}
					</div>
				{/if}
				{#if successMessage}
					<div
						class="rounded-md bg-green-500/10 p-4 text-sm text-green-600 flex items-center gap-2"
					>
						<Save class="h-4 w-4" />
						{successMessage}
					</div>
				{/if}

				{#if activeTab === 'general'}
					<div class="space-y-6">
						<div>
							<h2 class="text-lg font-medium mb-1">General Configuration</h2>
							<p class="text-sm text-muted-foreground">
								Basic system information and localization.
							</p>
						</div>
						<div class="grid gap-4 p-4 border rounded-lg bg-card/50">
							<div class="grid gap-2">
								<label for="systemName" class="text-sm font-medium">System Name</label>
								<input
									id="systemName"
									type="text"
									bind:value={settings.general.systemName}
									class="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
								/>
							</div>
							<div class="grid gap-2">
								<label for="systemTimezone" class="text-sm font-medium">Timezone</label>
								<select
									id="systemTimezone"
									bind:value={settings.general.systemTimezone}
									class="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
								>
									<option value="UTC">UTC</option>
									<option value="America/New_York">Eastern Time</option>
									<option value="America/Chicago">Central Time</option>
									<option value="America/Denver">Mountain Time</option>
									<option value="America/Los_Angeles">Pacific Time</option>
								</select>
							</div>
						</div>
					</div>
				{:else if activeTab === 'authentication'}
					<div class="space-y-6">
						<div>
							<h2 class="text-lg font-medium mb-1">Authentication</h2>
							<p class="text-sm text-muted-foreground">Security policies for user access.</p>
						</div>
						<div class="grid gap-4 p-4 border rounded-lg bg-card/50">
							<div class="grid grid-cols-2 gap-4">
								<div class="grid gap-2">
									<label for="sessionTimeout" class="text-sm font-medium"
										>Session Timeout (min)</label
									>
									<input
										id="sessionTimeout"
										type="number"
										bind:value={settings.authentication.sessionTimeoutMinutes}
										min="5"
										max="1440"
										class="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm"
									/>
								</div>
								<div class="grid gap-2">
									<label for="minPassLen" class="text-sm font-medium">Min Password Length</label>
									<input
										id="minPassLen"
										type="number"
										bind:value={settings.authentication.minPasswordLength}
										min="6"
										max="32"
										class="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm"
									/>
								</div>
							</div>
							<div class="grid gap-2">
								<label for="maxLogin" class="text-sm font-medium">Max Login Attempts</label>
								<input
									id="maxLogin"
									type="number"
									bind:value={settings.authentication.maxLoginAttempts}
									min="3"
									max="10"
									class="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm"
								/>
							</div>
							<div class="space-y-3 pt-2">
								<div class="flex items-center gap-2">
									<input
										id="requireMfa"
										type="checkbox"
										bind:checked={settings.authentication.requireMfa}
										class="rounded border-input"
									/>
									<label for="requireMfa" class="text-sm font-medium"
										>Require Multi-Factor Authentication (MFA)</label
									>
								</div>
								<div class="flex items-center gap-2">
									<input
										id="passExp"
										type="checkbox"
										bind:checked={settings.authentication.passwordExpirationEnabled}
										class="rounded border-input"
									/>
									<label for="passExp" class="text-sm font-medium">Enable Password Expiration</label
									>
								</div>
								{#if settings.authentication.passwordExpirationEnabled}
									<div class="pl-6 grid gap-2">
										<label for="passExpDays" class="text-sm font-medium">Expiration Days</label>
										<input
											id="passExpDays"
											type="number"
											bind:value={settings.authentication.passwordExpirationDays}
											min="30"
											max="365"
											class="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm"
										/>
									</div>
								{/if}
							</div>
						</div>
					</div>
				{:else if activeTab === 'notifications'}
					<div class="space-y-6">
						<div>
							<h2 class="text-lg font-medium mb-1">Notifications</h2>
							<p class="text-sm text-muted-foreground">Manage delivery channels.</p>
						</div>
						<div class="p-4 border rounded-lg bg-card/50 text-sm">
							<div class="mb-4">
								<h3 class="font-medium mb-1">Email Channels</h3>
								<div class="text-muted-foreground">
									{settings.notifications.emailChannels?.length || 0} configured. Managed via API.
								</div>
							</div>
							<div>
								<h3 class="font-medium mb-1">Webhook Channels</h3>
								<div class="text-muted-foreground">
									{settings.notifications.webhookChannels?.length || 0} configured. Managed via API.
								</div>
							</div>
						</div>
					</div>
				{:else if activeTab === 'security'}
					<div class="space-y-6">
						<div>
							<h2 class="text-lg font-medium mb-1">Security Headers</h2>
							<p class="text-sm text-muted-foreground">Advanced web security configuration.</p>
						</div>
						<div class="grid gap-4 p-4 border rounded-lg bg-card/50">
							<div class="space-y-2">
								<div class="flex items-center gap-2">
									<input
										id="https"
										type="checkbox"
										bind:checked={settings.security.httpsEnforced}
										class="rounded border-input"
									/>
									<label for="https" class="text-sm font-medium">Enforce HTTPS</label>
								</div>
								<div class="flex items-center gap-2">
									<input
										id="xframe"
										type="checkbox"
										bind:checked={settings.security.xFrameOptions}
										class="rounded border-input"
									/>
									<label for="xframe" class="text-sm font-medium">X-Frame-Options</label>
								</div>
								<div class="flex items-center gap-2">
									<input
										id="hsts"
										type="checkbox"
										bind:checked={settings.security.hstEnabled}
										class="rounded border-input"
									/>
									<label for="hsts" class="text-sm font-medium">HSTS Enabled</label>
								</div>
							</div>
							<div class="grid gap-2">
								<label for="csp" class="text-sm font-medium">Content Security Policy (CSP)</label>
								<textarea
									id="csp"
									bind:value={settings.security.cspPolicy}
									rows="2"
									class="flex min-h-[60px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
									placeholder="default-src 'self'"
								></textarea>
							</div>
							<div class="grid gap-2">
								<label for="cors" class="text-sm font-medium">CORS Origins</label>
								<textarea
									id="cors"
									bind:value={settings.security.corsOriginsText}
									rows="3"
									class="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
									placeholder="https://example.com"
									onblur={() => {
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
							</div>
						</div>
					</div>
				{:else if activeTab === 'developer'}
					<div class="space-y-6">
						<div>
							<h2 class="text-lg font-medium mb-1">Developer</h2>
							<p class="text-sm text-muted-foreground">Logging and debugging.</p>
						</div>
						<div class="grid gap-4 p-4 border rounded-lg bg-card/50">
							<div class="grid gap-2">
								<label for="logFront" class="text-sm font-medium">Frontend Log Level</label>
								<select
									id="logFront"
									bind:value={settings.developer.logLevelFrontend}
									class="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
								>
									<option value="DEBUG">DEBUG</option>
									<option value="INFO">INFO</option>
									<option value="WARN">WARN</option>
									<option value="ERROR">ERROR</option>
								</select>
							</div>
							<div class="grid gap-2">
								<label for="logBack" class="text-sm font-medium">Backend Log Level</label>
								<select
									id="logBack"
									bind:value={settings.developer.logLevelBackend}
									class="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
								>
									<option value="DEBUG">DEBUG</option>
									<option value="INFO">INFO</option>
									<option value="WARN">WARN</option>
									<option value="ERROR">ERROR</option>
								</select>
							</div>
						</div>
					</div>
				{/if}
			</div>
		</div>
	</div>
</div>
