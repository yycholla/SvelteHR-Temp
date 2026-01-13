<script lang="ts">
	import { Building2 } from '@lucide/svelte';
</script>

<svelte:head>
	<title>Privacy Policy - MountainHR</title>
	<meta name="description" content="Privacy Policy for MountainHR by Mountain Care Rx" />
</svelte:head>

<div class="min-h-screen bg-background">
	<!-- Header -->
	<header class="border-b bg-card">
		<div class="mx-auto max-w-4xl px-4 py-6">
			<a href="/" class="flex items-center gap-2 font-semibold text-xl">
				<Building2 class="h-6 w-6 text-primary" />
				<span>MountainHR</span>
			</a>
		</div>
	</header>

	<!-- Content -->
	<main class="mx-auto max-w-4xl px-4 py-12">
		<article class="prose prose-slate dark:prose-invert max-w-none">
			<h1>Privacy Policy</h1>

			<p class="text-muted-foreground">
				<strong>Last Updated:</strong> January 12, 2026
			</p>

			<h2>1. Introduction</h2>
			<p>
				Mountain Care Rx ("we," "our," or "us") operates MountainHR, a human resources management
				system. This Privacy Policy explains how we collect, use, disclose, and safeguard your
				information when you use our application and services, including our integration with
				QuickBooks.
			</p>

			<h2>2. Information We Collect</h2>

			<h3>2.1 Personal Information</h3>
			<p>We collect information that you provide directly to us, including:</p>
			<ul>
				<li>Name, email address, and contact information</li>
				<li>Employment information (job title, department, hire date)</li>
				<li>Compensation and payroll data</li>
				<li>Time tracking and attendance records</li>
				<li>Performance reviews and employee documents</li>
			</ul>

			<h3>2.2 QuickBooks Integration Data</h3>
			<p>When you connect MountainHR with QuickBooks, we access and store:</p>
			<ul>
				<li>Employee records synchronized from QuickBooks</li>
				<li>Department and organization structure</li>
				<li>Compensation and payroll information</li>
				<li>Time entries and billable hours</li>
			</ul>

			<h3>2.3 Automatically Collected Information</h3>
			<ul>
				<li>Usage data and analytics</li>
				<li>Log files and access timestamps</li>
				<li>Device information and IP addresses</li>
				<li>Session information and authentication tokens</li>
			</ul>

			<h2>3. How We Use Your Information</h2>
			<p>We use the information we collect to:</p>
			<ul>
				<li>Provide, maintain, and improve our HR management services</li>
				<li>Synchronize employee data with QuickBooks</li>
				<li>Process payroll and compensation information</li>
				<li>Generate reports and analytics for HR management</li>
				<li>Communicate with you about system updates and changes</li>
				<li>Comply with legal obligations and employment regulations</li>
			</ul>

			<h2>4. Data Sharing and Disclosure</h2>

			<h3>4.1 QuickBooks Integration</h3>
			<p>
				When you authorize the QuickBooks integration, we share employee data with Intuit Inc. in
				accordance with their privacy policy and terms of service. This includes bidirectional
				synchronization of employee information, compensation data, and time entries.
			</p>

			<h3>4.2 Service Providers</h3>
			<p>We may share your information with third-party service providers who assist us in:</p>
			<ul>
				<li>Cloud infrastructure and hosting (Kubernetes, PostgreSQL)</li>
				<li>Authentication and security services</li>
				<li>Data backup and disaster recovery</li>
			</ul>

			<h3>4.3 Legal Requirements</h3>
			<p>
				We may disclose your information if required to do so by law or in response to valid
				requests by public authorities (e.g., employment law compliance, tax reporting).
			</p>

			<h2>5. Data Security</h2>
			<p>We implement security measures to protect your information, including:</p>
			<ul>
				<li>Encryption of data in transit (TLS/SSL) and at rest</li>
				<li>Role-based access control (RBAC) and authentication</li>
				<li>Regular security audits and vulnerability assessments</li>
				<li>Secure credential management with External Secrets Operator</li>
				<li>Database backups with point-in-time recovery</li>
			</ul>

			<h2>6. Data Retention</h2>
			<p>
				We retain your information for as long as necessary to fulfill the purposes outlined in this
				Privacy Policy, unless a longer retention period is required or permitted by law. Employee
				records are typically retained for at least 7 years after employment termination to comply
				with employment and tax regulations.
			</p>

			<h2>7. Your Rights</h2>
			<p>You have the right to:</p>
			<ul>
				<li>Access and review your personal information</li>
				<li>Request correction of inaccurate data</li>
				<li>Request deletion of your data (subject to legal retention requirements)</li>
				<li>Export your data in a portable format</li>
				<li>Disconnect the QuickBooks integration at any time</li>
				<li>Opt-out of certain data processing activities</li>
			</ul>

			<h2>8. QuickBooks Integration Disconnection</h2>
			<p>
				You may disconnect the QuickBooks integration at any time through your admin settings. Upon
				disconnection, we will:
			</p>
			<ul>
				<li>Stop synchronizing data with QuickBooks</li>
				<li>Retain historical sync data for audit purposes</li>
				<li>Maintain employee records created before disconnection</li>
			</ul>

			<h2>9. Children's Privacy</h2>
			<p>
				MountainHR is not intended for use by individuals under the age of 18. We do not knowingly
				collect personal information from children.
			</p>

			<h2>10. Changes to This Privacy Policy</h2>
			<p>
				We may update this Privacy Policy from time to time. We will notify you of any changes by
				posting the new Privacy Policy on this page and updating the "Last Updated" date.
			</p>

			<h2>11. Contact Us</h2>
			<p>If you have questions about this Privacy Policy, please contact us at:</p>
			<p>
				<strong>Mountain Care Rx</strong><br />
				Email: <a href="mailto:privacy@mountaincarerx.com">privacy@mountaincarerx.com</a><br />
				Website: <a href="https://hr.mtncarerx.com">https://hr.mtncarerx.com</a>
			</p>

			<hr class="my-8" />

			<p class="text-sm text-muted-foreground">
				This privacy policy governs the use of MountainHR and its integration with third-party
				services including QuickBooks by Intuit Inc. For QuickBooks-specific privacy practices,
				please refer to
				<a href="https://www.intuit.com/privacy/" target="_blank" rel="noopener noreferrer">
					Intuit's Privacy Statement
				</a>.
			</p>
		</article>
	</main>

	<!-- Footer -->
	<footer class="border-t bg-card py-6">
		<div class="mx-auto max-w-4xl px-4 text-center text-sm text-muted-foreground">
			<p>&copy; 2026 Mountain Care Rx. All rights reserved.</p>
			<p class="mt-2">
				<a href="/terms" class="hover:text-primary">Terms of Service</a>
				<span class="mx-2">•</span>
				<a href="/privacy" class="hover:text-primary">Privacy Policy</a>
			</p>
		</div>
	</footer>
</div>

<style>
	:global(body) {
		margin: 0;
	}
</style>
