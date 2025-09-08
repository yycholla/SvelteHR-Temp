<!--
	SEO Head Component
	
	Renders SEO meta tags, Open Graph, Twitter Cards, and structured data
	for optimal search engine optimization and social media sharing
	
	Usage:
	<SEOHead
		title="Custom Page Title"
		description="Custom page description"
		pathname="/current-path"
		customMetadata={{ keywords: ['custom', 'keywords'] }}
	/>
-->

<script lang="ts">
	import { page } from '$app/stores';
	import { generateSEOMetadata, type SEOMetadata } from '$lib/utils/seo';

	// Component props
	interface SEOHeadProps {
		title?: string;
		description?: string;
		pathname?: string;
		customMetadata?: Partial<SEOMetadata>;
		structuredDataOnly?: boolean;
	}

	let {
		title = '',
		description = '',
		pathname = '',
		customMetadata = {},
		structuredDataOnly = false
	}: SEOHeadProps = $props();

	// Get current pathname if not provided
	$: currentPath = pathname || $page.url.pathname;
	
	// Generate complete SEO metadata
	$: seoData = generateSEOMetadata(currentPath, {
		...(title && { title }),
		...(description && { description }),
		...customMetadata
	});

	// Convert structured data to JSON-LD strings
	$: structuredDataScripts = seoData.structuredData.map(data => 
		JSON.stringify(data, null, structuredDataOnly ? 2 : 0)
	);
</script>

<svelte:head>
	{#if !structuredDataOnly}
		<!-- Primary Meta Tags -->
		<title>{seoData.title}</title>
		<meta name="title" content={seoData.title} />
		
		{#each Object.entries(seoData.meta) as [name, content]}
			{#if name === 'canonical'}
				<link rel="canonical" href={content} />
			{:else}
				<meta name={name} content={content} />
			{/if}
		{/each}
		
		<!-- Open Graph / Facebook -->
		{#each Object.entries(seoData.openGraph) as [property, content]}
			<meta property={property} content={content} />
		{/each}
		
		<!-- Twitter -->
		{#each Object.entries(seoData.twitter) as [name, content]}
			<meta name={name} content={content} />
		{/each}
		
		<!-- Additional meta tags for better indexing -->
		<meta name="application-name" content="MountainHR" />
		<meta name="apple-mobile-web-app-title" content="MountainHR" />
		<meta name="apple-mobile-web-app-capable" content="yes" />
		<meta name="apple-mobile-web-app-status-bar-style" content="default" />
		<meta name="mobile-web-app-capable" content="yes" />
		
		<!-- Favicon and app icons -->
		<link rel="icon" type="image/x-icon" href="/favicon.ico" />
		<link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png" />
		<link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png" />
		<link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
		<link rel="manifest" href="/manifest.json" />
		
		<!-- DNS prefetch for external resources -->
		<link rel="dns-prefetch" href="//fonts.googleapis.com" />
		<link rel="dns-prefetch" href="//fonts.gstatic.com" />
		
		<!-- Preconnect to external domains -->
		<link rel="preconnect" href="https://fonts.googleapis.com" />
		<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
	{/if}
	
	<!-- Structured Data (JSON-LD) -->
	{#each structuredDataScripts as jsonLD, index}
		<script type="application/ld+json">
			{@html jsonLD}
		</script>
	{/each}
</svelte:head>