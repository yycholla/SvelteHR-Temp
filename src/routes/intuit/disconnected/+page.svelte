<svelte:head>
	<title>QuickBooks Disconnected - MountainHR</title>
	<meta
		name="description"
		content="Your QuickBooks connection was disconnected. Reconnect from MountainHR integrations."
	/>
</svelte:head>

<div class="min-h-screen bg-background">
	<main class="mx-auto flex min-h-screen w-full max-w-3xl items-center px-4 py-12">
		<section class="w-full rounded-xl border bg-card p-8 shadow-sm">
			<h1 class="text-2xl font-semibold tracking-tight">QuickBooks Is Disconnected</h1>
			<p class="mt-3 text-sm text-muted-foreground">
				This MountainHR app is no longer connected to your Intuit company. If this was expected, no
				action is required.
			</p>
			<p class="mt-2 text-sm text-muted-foreground">
				To sync employees and departments again, reconnect your QuickBooks integration.
			</p>

			<div class="mt-6 flex flex-wrap gap-3">
				<a
					href="/api/intuit/connect"
					class="inline-flex items-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
				>
					Connect/Reconnect QuickBooks
				</a>
				<a
					href="/admin/settings/integrations"
					class="inline-flex items-center rounded-md border px-4 py-2 text-sm font-medium hover:bg-accent"
				>
					Go To Integrations
				</a>
			</div>
		</section>
	</main>
</div>
