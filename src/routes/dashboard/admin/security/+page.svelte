<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Badge } from '$lib/components/ui/badge';
	import { Progress } from '$lib/components/ui/progress';
	import { Switch } from '$lib/components/ui/switch';
	import { Label } from '$lib/components/ui/label';
	import * as Card from '$lib/components/ui/card';
	import * as Table from '$lib/components/ui/table';
	import * as Tabs from '$lib/components/ui/tabs';
	import * as Alert from '$lib/components/ui/alert';
	import {
		Shield,
		Lock,
		Key,
		Eye,
		AlertTriangle,
		CheckCircle,
		Users,
		Activity,
		Clock,
		RefreshCw,
		Settings,
		ArrowLeft,
		Ban,
		Unlock,
		UserX,
		Globe,
		Wifi,
		Database
	} from 'lucide-svelte';

	// Security overview data
	let securityOverview = $state({
		score: 98,
		status: 'excellent',
		lastScan: '2024-01-15 14:30:22',
		threats: 0,
		blockedAttempts: 47,
		activeUsers: 23
	});

	// Security policies
	let securityPolicies = $state({
		passwordComplexity: true,
		twoFactorRequired: false,
		sessionTimeout: true,
		ipWhitelist: false,
		auditLogging: true,
		encryptionAtRest: true,
		sslRequired: true,
		bruteForceProtection: true
	});

	// Active sessions
	let activeSessions = $state([
		{
			id: 'session-1',
			user: 'admin@company.com',
			userName: 'Admin User',
			ipAddress: '192.168.1.100',
			location: 'New York, US',
			device: 'Chrome on Windows',
			lastActivity: '2 minutes ago',
			status: 'active'
		},
		{
			id: 'session-2',
			user: 'hr@company.com',
			userName: 'HR Manager',
			ipAddress: '192.168.1.105',
			location: 'California, US',
			device: 'Safari on Mac',
			lastActivity: '15 minutes ago',
			status: 'active'
		},
		{
			id: 'session-3',
			user: 'manager@company.com',
			userName: 'Department Manager',
			ipAddress: '10.0.1.45',
			location: 'Texas, US',
			device: 'Firefox on Linux',
			lastActivity: '1 hour ago',
			status: 'idle'
		}
	]);

	// Security events
	let securityEvents = $state([
		{
			id: 'event-1',
			type: 'Failed Login',
			severity: 'medium',
			user: 'unknown',
			ipAddress: '45.123.456.789',
			timestamp: '2024-01-15 14:25:33',
			description: 'Multiple failed login attempts for admin@company.com',
			action: 'IP temporarily blocked'
		},
		{
			id: 'event-2',
			type: 'Privilege Escalation',
			severity: 'high',
			user: 'hr@company.com',
			ipAddress: '192.168.1.105',
			timestamp: '2024-01-15 13:45:12',
			description: 'User attempted to access admin resources',
			action: 'Access denied, incident logged'
		},
		{
			id: 'event-3',
			type: 'Suspicious Activity',
			severity: 'low',
			user: 'manager@company.com',
			ipAddress: '10.0.1.45',
			timestamp: '2024-01-15 12:30:45',
			description: 'Unusual login time detected',
			action: 'User notified via email'
		}
	]);

	// Blocked IPs
	let blockedIPs = $state([
		{
			ip: '45.123.456.789',
			reason: 'Brute force attack',
			blockedAt: '2024-01-15 14:25:33',
			attempts: 15,
			status: 'blocked'
		},
		{
			ip: '203.45.67.89',
			reason: 'Suspicious activity',
			blockedAt: '2024-01-15 11:20:15',
			attempts: 8,
			status: 'blocked'
		}
	]);

	let loading = $state(false);

	function getSeverityColor(severity: string) {
		switch (severity) {
			case 'high':
				return 'text-red-600';
			case 'medium':
				return 'text-yellow-600';
			case 'low':
				return 'text-blue-600';
			default:
				return 'text-gray-600';
		}
	}

	function getSeverityVariant(severity: string) {
		switch (severity) {
			case 'high':
				return 'destructive';
			case 'medium':
				return 'secondary';
			case 'low':
				return 'outline';
			default:
				return 'outline';
		}
	}

	function revokeSession(sessionId: string) {
		activeSessions = activeSessions.filter((session) => session.id !== sessionId);
	}

	function unblockIP(ip: string) {
		blockedIPs = blockedIPs.filter((blocked) => blocked.ip !== ip);
	}

	function runSecurityScan() {
		loading = true;
		setTimeout(() => {
			loading = false;
			securityOverview.lastScan = new Date().toISOString().slice(0, 19).replace('T', ' ');
			console.log('Security scan completed');
		}, 3000);
	}

	function updatePolicy(policy: string) {
		console.log(`Updated security policy: ${policy}`);
	}
</script>

<svelte:head>
	<title>Security Center - Admin Dashboard</title>
</svelte:head>

<div class="space-y-6">
	<!-- Header -->
	<div class="flex items-center justify-between">
		<div>
			<div class="mb-2 flex items-center gap-3">
				<Button variant="ghost" size="sm" href="/dashboard/admin" class="p-2">
					<ArrowLeft class="h-4 w-4" />
				</Button>
				<h1 class="flex items-center gap-3 text-3xl font-bold tracking-tight">
					<Shield class="h-8 w-8" />
					Security Center
				</h1>
			</div>
			<p class="text-muted-foreground">
				Monitor security status, manage policies, and track threats
			</p>
		</div>
		<div class="flex items-center gap-3">
			<Button variant="outline" onclick={runSecurityScan} disabled={loading}>
				{#if loading}
					<RefreshCw class="mr-2 h-4 w-4 animate-spin" />
				{:else}
					<Shield class="mr-2 h-4 w-4" />
				{/if}
				Security Scan
			</Button>
		</div>
	</div>

	<!-- Security Score -->
	<Card.Root class="bg-gradient-to-r from-green-50 to-blue-50">
		<Card.Content class="p-6">
			<div class="flex items-center justify-between">
				<div class="space-y-2">
					<h3 class="text-2xl font-bold">Security Score</h3>
					<div class="flex items-center gap-2">
						<div class="text-4xl font-bold text-green-600">{securityOverview.score}%</div>
						<Badge variant="default" class="bg-green-100 text-green-800">
							{securityOverview.status}
						</Badge>
					</div>
					<p class="text-sm text-muted-foreground">
						Last scan: {securityOverview.lastScan}
					</p>
				</div>
				<div class="space-y-2 text-right">
					<div class="relative h-32 w-32">
						<div class="flex h-full w-full items-center justify-center rounded-full bg-gray-200">
							<Shield class="h-16 w-16 text-green-600" />
						</div>
					</div>
				</div>
			</div>
		</Card.Content>
	</Card.Root>

	<!-- Security Metrics -->
	<div class="grid grid-cols-1 gap-6 md:grid-cols-3">
		<Card.Root>
			<Card.Content class="p-6">
				<div class="flex items-center justify-between">
					<div>
						<p class="text-sm font-medium text-muted-foreground">Active Threats</p>
						<p class="text-2xl font-bold text-green-600">{securityOverview.threats}</p>
					</div>
					<AlertTriangle class="h-8 w-8 text-green-600" />
				</div>
			</Card.Content>
		</Card.Root>
		<Card.Root>
			<Card.Content class="p-6">
				<div class="flex items-center justify-between">
					<div>
						<p class="text-sm font-medium text-muted-foreground">Blocked Attempts</p>
						<p class="text-2xl font-bold text-red-600">{securityOverview.blockedAttempts}</p>
					</div>
					<Ban class="h-8 w-8 text-red-600" />
				</div>
			</Card.Content>
		</Card.Root>
		<Card.Root>
			<Card.Content class="p-6">
				<div class="flex items-center justify-between">
					<div>
						<p class="text-sm font-medium text-muted-foreground">Active Users</p>
						<p class="text-2xl font-bold text-blue-600">{securityOverview.activeUsers}</p>
					</div>
					<Users class="h-8 w-8 text-blue-600" />
				</div>
			</Card.Content>
		</Card.Root>
	</div>

	<!-- Main Content Tabs -->
	<Tabs.Root value="policies" class="space-y-6">
		<Tabs.List>
			<Tabs.Trigger value="policies" class="flex items-center gap-2">
				<Lock class="h-4 w-4" />
				Security Policies
			</Tabs.Trigger>
			<Tabs.Trigger value="sessions" class="flex items-center gap-2">
				<Users class="h-4 w-4" />
				Active Sessions
			</Tabs.Trigger>
			<Tabs.Trigger value="events" class="flex items-center gap-2">
				<Activity class="h-4 w-4" />
				Security Events
			</Tabs.Trigger>
			<Tabs.Trigger value="blocked" class="flex items-center gap-2">
				<Ban class="h-4 w-4" />
				Blocked IPs
			</Tabs.Trigger>
		</Tabs.List>

		<!-- Security Policies Tab -->
		<Tabs.Content value="policies">
			<div class="grid grid-cols-1 gap-6 md:grid-cols-2">
				<Card.Root>
					<Card.Header>
						<Card.Title>Authentication Policies</Card.Title>
					</Card.Header>
					<Card.Content class="space-y-6">
						<div class="flex items-center justify-between">
							<div class="space-y-1">
								<Label>Password Complexity</Label>
								<p class="text-sm text-muted-foreground">Enforce strong password requirements</p>
							</div>
							<Switch
								bind:checked={securityPolicies.passwordComplexity}
								onchange={() => updatePolicy('passwordComplexity')}
							/>
						</div>
						<div class="flex items-center justify-between">
							<div class="space-y-1">
								<Label>Two-Factor Authentication</Label>
								<p class="text-sm text-muted-foreground">Require 2FA for all users</p>
							</div>
							<Switch
								bind:checked={securityPolicies.twoFactorRequired}
								onchange={() => updatePolicy('twoFactorRequired')}
							/>
						</div>
						<div class="flex items-center justify-between">
							<div class="space-y-1">
								<Label>Session Timeout</Label>
								<p class="text-sm text-muted-foreground">Automatic session expiration</p>
							</div>
							<Switch
								bind:checked={securityPolicies.sessionTimeout}
								onchange={() => updatePolicy('sessionTimeout')}
							/>
						</div>
						<div class="flex items-center justify-between">
							<div class="space-y-1">
								<Label>Brute Force Protection</Label>
								<p class="text-sm text-muted-foreground">Block repeated failed attempts</p>
							</div>
							<Switch
								bind:checked={securityPolicies.bruteForceProtection}
								onchange={() => updatePolicy('bruteForceProtection')}
							/>
						</div>
					</Card.Content>
				</Card.Root>

				<Card.Root>
					<Card.Header>
						<Card.Title>System Security</Card.Title>
					</Card.Header>
					<Card.Content class="space-y-6">
						<div class="flex items-center justify-between">
							<div class="space-y-1">
								<Label>Audit Logging</Label>
								<p class="text-sm text-muted-foreground">Log all system activities</p>
							</div>
							<Switch
								bind:checked={securityPolicies.auditLogging}
								onchange={() => updatePolicy('auditLogging')}
							/>
						</div>
						<div class="flex items-center justify-between">
							<div class="space-y-1">
								<Label>Encryption at Rest</Label>
								<p class="text-sm text-muted-foreground">Encrypt stored data</p>
							</div>
							<Switch
								bind:checked={securityPolicies.encryptionAtRest}
								onchange={() => updatePolicy('encryptionAtRest')}
							/>
						</div>
						<div class="flex items-center justify-between">
							<div class="space-y-1">
								<Label>SSL Required</Label>
								<p class="text-sm text-muted-foreground">Force HTTPS connections</p>
							</div>
							<Switch
								bind:checked={securityPolicies.sslRequired}
								onchange={() => updatePolicy('sslRequired')}
							/>
						</div>
						<div class="flex items-center justify-between">
							<div class="space-y-1">
								<Label>IP Whitelist</Label>
								<p class="text-sm text-muted-foreground">Restrict access by IP address</p>
							</div>
							<Switch
								bind:checked={securityPolicies.ipWhitelist}
								onchange={() => updatePolicy('ipWhitelist')}
							/>
						</div>
					</Card.Content>
				</Card.Root>
			</div>
		</Tabs.Content>

		<!-- Active Sessions Tab -->
		<Tabs.Content value="sessions">
			<Card.Root>
				<Card.Header>
					<Card.Title class="flex items-center gap-2">
						<Users class="h-5 w-5" />
						Active User Sessions
					</Card.Title>
				</Card.Header>
				<Card.Content>
					<Table.Root>
						<Table.Header>
							<Table.Row>
								<Table.Head>User</Table.Head>
								<Table.Head>Device</Table.Head>
								<Table.Head>IP Address</Table.Head>
								<Table.Head>Location</Table.Head>
								<Table.Head>Last Activity</Table.Head>
								<Table.Head>Status</Table.Head>
								<Table.Head class="text-right">Actions</Table.Head>
							</Table.Row>
						</Table.Header>
						<Table.Body>
							{#each activeSessions as session}
								<Table.Row>
									<Table.Cell>
										<div>
											<div class="font-medium">{session.userName}</div>
											<div class="text-sm text-muted-foreground">{session.user}</div>
										</div>
									</Table.Cell>
									<Table.Cell>{session.device}</Table.Cell>
									<Table.Cell class="font-mono text-sm">{session.ipAddress}</Table.Cell>
									<Table.Cell>{session.location}</Table.Cell>
									<Table.Cell>{session.lastActivity}</Table.Cell>
									<Table.Cell>
										<Badge variant={session.status === 'active' ? 'default' : 'secondary'}>
											{session.status}
										</Badge>
									</Table.Cell>
									<Table.Cell class="text-right">
										<Button variant="ghost" size="sm" onclick={() => revokeSession(session.id)}>
											<UserX class="h-4 w-4" />
										</Button>
									</Table.Cell>
								</Table.Row>
							{/each}
						</Table.Body>
					</Table.Root>
				</Card.Content>
			</Card.Root>
		</Tabs.Content>

		<!-- Security Events Tab -->
		<Tabs.Content value="events">
			<Card.Root>
				<Card.Header>
					<Card.Title class="flex items-center gap-2">
						<Activity class="h-5 w-5" />
						Recent Security Events
					</Card.Title>
				</Card.Header>
				<Card.Content>
					<Table.Root>
						<Table.Header>
							<Table.Row>
								<Table.Head>Event Type</Table.Head>
								<Table.Head>Severity</Table.Head>
								<Table.Head>User</Table.Head>
								<Table.Head>IP Address</Table.Head>
								<Table.Head>Timestamp</Table.Head>
								<Table.Head>Action Taken</Table.Head>
							</Table.Row>
						</Table.Header>
						<Table.Body>
							{#each securityEvents as event}
								<Table.Row>
									<Table.Cell>
										<div>
											<div class="font-medium">{event.type}</div>
											<div class="text-sm text-muted-foreground">{event.description}</div>
										</div>
									</Table.Cell>
									<Table.Cell>
										<Badge
											variant={getSeverityVariant(event.severity)}
											class={getSeverityColor(event.severity)}
										>
											{event.severity}
										</Badge>
									</Table.Cell>
									<Table.Cell>{event.user}</Table.Cell>
									<Table.Cell class="font-mono text-sm">{event.ipAddress}</Table.Cell>
									<Table.Cell class="font-mono text-sm">{event.timestamp}</Table.Cell>
									<Table.Cell>
										<span class="text-sm text-muted-foreground">{event.action}</span>
									</Table.Cell>
								</Table.Row>
							{/each}
						</Table.Body>
					</Table.Root>
				</Card.Content>
			</Card.Root>
		</Tabs.Content>

		<!-- Blocked IPs Tab -->
		<Tabs.Content value="blocked">
			<Card.Root>
				<Card.Header>
					<Card.Title class="flex items-center gap-2">
						<Ban class="h-5 w-5" />
						Blocked IP Addresses
					</Card.Title>
				</Card.Header>
				<Card.Content>
					<Table.Root>
						<Table.Header>
							<Table.Row>
								<Table.Head>IP Address</Table.Head>
								<Table.Head>Reason</Table.Head>
								<Table.Head>Failed Attempts</Table.Head>
								<Table.Head>Blocked At</Table.Head>
								<Table.Head>Status</Table.Head>
								<Table.Head class="text-right">Actions</Table.Head>
							</Table.Row>
						</Table.Header>
						<Table.Body>
							{#each blockedIPs as blocked}
								<Table.Row>
									<Table.Cell class="font-mono text-sm">{blocked.ip}</Table.Cell>
									<Table.Cell>{blocked.reason}</Table.Cell>
									<Table.Cell>
										<Badge variant="destructive">{blocked.attempts} attempts</Badge>
									</Table.Cell>
									<Table.Cell class="font-mono text-sm">{blocked.blockedAt}</Table.Cell>
									<Table.Cell>
										<Badge variant="destructive">{blocked.status}</Badge>
									</Table.Cell>
									<Table.Cell class="text-right">
										<Button variant="ghost" size="sm" onclick={() => unblockIP(blocked.ip)}>
											<Unlock class="h-4 w-4" />
										</Button>
									</Table.Cell>
								</Table.Row>
							{/each}
						</Table.Body>
					</Table.Root>
				</Card.Content>
			</Card.Root>
		</Tabs.Content>
	</Tabs.Root>
</div>
