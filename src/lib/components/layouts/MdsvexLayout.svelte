<!-- 
  MDSvex Layout Component
  
  Default layout for rendering markdown files (.svx) in SvelteKit.
  Provides consistent styling and structure for documentation and content pages.
-->

<script lang="ts">
  // Accept any props that might be passed from mdx content
  interface Props {
    [key: string]: any;
  }
  
  let { children, ...props }: Props = $props();
</script>

<!-- SEO and Meta -->
<svelte:head>
  <meta name="viewport" content="width=device-width, initial-scale=1">
  {#if props.title}
    <title>{props.title} | SvelteHR</title>
  {/if}
  {#if props.description}
    <meta name="description" content={props.description}>
  {/if}
</svelte:head>

<!-- Main Content Container -->
<article class="prose prose-slate max-w-4xl mx-auto px-4 py-8 md:px-8 md:py-12">
  <!-- Header Section -->
  {#if props.title || props.date || props.author}
    <header class="mb-8 border-b border-gray-200 pb-6">
      {#if props.title}
        <h1 class="text-3xl md:text-4xl font-bold text-gray-900 mb-2">
          {props.title}
        </h1>
      {/if}
      
      {#if props.subtitle}
        <p class="text-xl text-gray-600 mb-4">
          {props.subtitle}
        </p>
      {/if}
      
      <!-- Meta information -->
      {#if props.date || props.author || props.tags}
        <div class="flex flex-wrap gap-4 text-sm text-gray-500">
          {#if props.date}
            <time datetime={props.date} class="flex items-center">
              📅 {new Date(props.date).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })}
            </time>
          {/if}
          
          {#if props.author}
            <span class="flex items-center">
              👤 {props.author}
            </span>
          {/if}
          
          {#if props.readingTime}
            <span class="flex items-center">
              ⏱️ {props.readingTime} min read
            </span>
          {/if}
        </div>
      {/if}
      
      <!-- Tags -->
      {#if props.tags && props.tags.length > 0}
        <div class="flex flex-wrap gap-2 mt-4">
          {#each props.tags as tag}
            <span class="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-md">
              {tag}
            </span>
          {/each}
        </div>
      {/if}
    </header>
  {/if}
  
  <!-- Table of Contents (if provided) -->
  {#if props.toc && props.toc.length > 0}
    <aside class="bg-gray-50 rounded-lg p-4 mb-8">
      <h2 class="text-lg font-semibold text-gray-900 mb-3">Table of Contents</h2>
      <nav class="toc">
        <ul class="space-y-1 text-sm">
          {#each props.toc as item}
            <li>
              <a 
                href="#{item.slug}" 
                class="text-blue-600 hover:text-blue-800 hover:underline"
              >
                {item.title}
              </a>
            </li>
          {/each}
        </ul>
      </nav>
    </aside>
  {/if}
  
  <!-- Main Content -->
  <div class="mdx-content">
    {@render children()}
  </div>
  
  <!-- Footer Section -->
  {#if props.lastModified || props.editUrl}
    <footer class="mt-12 pt-6 border-t border-gray-200">
      <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 text-sm text-gray-500">
        {#if props.lastModified}
          <p>
            Last updated: {new Date(props.lastModified).toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            })}
          </p>
        {/if}
        
        {#if props.editUrl}
          <a 
            href={props.editUrl}
            target="_blank"
            rel="noopener noreferrer"
            class="text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-1"
          >
            ✏️ Edit this page
          </a>
        {/if}
      </div>
    </footer>
  {/if}
</article>

<!-- Styles for MDX content -->
<style>
  :global(.mdx-content) {
    /* Enhanced typography */
    line-height: 1.7;
  }
  
  /* Code blocks */
  :global(.mdx-content pre) {
    @apply bg-gray-900 text-gray-100 rounded-lg p-4 overflow-x-auto text-sm;
  }
  
  :global(.mdx-content code:not(pre code)) {
    @apply bg-gray-100 text-gray-800 px-1.5 py-0.5 rounded text-sm font-mono;
  }
  
  /* Blockquotes */
  :global(.mdx-content blockquote) {
    @apply border-l-4 border-blue-500 bg-blue-50 pl-4 py-2 my-4 italic text-gray-700;
  }
  
  /* Tables */
  :global(.mdx-content table) {
    @apply w-full border-collapse border border-gray-300 my-6;
  }
  
  :global(.mdx-content th) {
    @apply border border-gray-300 bg-gray-50 px-4 py-2 text-left font-semibold;
  }
  
  :global(.mdx-content td) {
    @apply border border-gray-300 px-4 py-2;
  }
  
  /* Links */
  :global(.mdx-content a) {
    @apply text-blue-600 hover:text-blue-800 hover:underline;
  }
  
  /* Images */
  :global(.mdx-content img) {
    @apply max-w-full h-auto rounded-lg shadow-md my-6;
  }
  
  /* Lists */
  :global(.mdx-content ul) {
    @apply list-disc list-inside my-4 space-y-2;
  }
  
  :global(.mdx-content ol) {
    @apply list-decimal list-inside my-4 space-y-2;
  }
  
  /* Headings with anchor links */
  :global(.mdx-content h1),
  :global(.mdx-content h2),
  :global(.mdx-content h3),
  :global(.mdx-content h4),
  :global(.mdx-content h5),
  :global(.mdx-content h6) {
    @apply scroll-mt-20;
  }
  
  /* Alert boxes */
  :global(.mdx-content .alert) {
    @apply border-l-4 p-4 my-4 rounded-r-lg;
  }
  
  :global(.mdx-content .alert.info) {
    @apply border-blue-500 bg-blue-50 text-blue-800;
  }
  
  :global(.mdx-content .alert.warning) {
    @apply border-yellow-500 bg-yellow-50 text-yellow-800;
  }
  
  :global(.mdx-content .alert.error) {
    @apply border-red-500 bg-red-50 text-red-800;
  }
  
  :global(.mdx-content .alert.success) {
    @apply border-green-500 bg-green-50 text-green-800;
  }
</style>