import { sentrySvelteKit } from '@sentry/sveltekit';
import devtoolsJson from 'vite-plugin-devtools-json';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';
import { resolve } from 'path';
import tailwindcss from '@tailwindcss/vite';
import type { ViteDevServer } from 'vite';
import type { IncomingMessage, ServerResponse } from 'http';

// Custom plugin to disable compression completely
const disableCompression = () => ({
  name: 'disable-compression',
  configureServer(server: ViteDevServer) {
    // Disable compression middleware at the server level
    server.middlewares.use((req: IncomingMessage, res: ServerResponse, next: () => void) => {
      // Force identity encoding
      req.headers['accept-encoding'] = 'identity';

      // Override write methods to prevent compression
      const originalSetHeader = res.setHeader;

      res.setHeader = function (name: string, value: string | number | readonly string[]) {
        const lowerName = name.toLowerCase();
        if (lowerName === 'content-encoding' || lowerName === 'transfer-encoding') {
          return this; // Skip compression headers
        }
        return originalSetHeader.call(this, name, value);
      };

      // Ensure no compression flags are set
      (res as any).compress = false;

      next();
    });
  }
});

export default defineConfig({
  plugins: [
    sentrySvelteKit({
      sourceMapsUploadOptions: {
        org: 'mountain-care-rx',
        project: 'javascript-sveltekit'
      }
    }),
    tailwindcss(),
    sveltekit(), // devtoolsJson(), // Disabled to remove debugging UI overlay
    disableCompression(),
    devtoolsJson()
  ],

  // Performance optimizations
  build: {
    target: 'esnext',
    minify: false,
    sourcemap: true,
    rollupOptions: {
      output: {
        // Manual chunk splitting for optimal loading (simplified for SvelteKit compatibility)
        manualChunks: {
          // Only include packages that are not treated as external by SvelteKit
          vendor: ['svelte']
        }
        // Note: chunkFileNames and assetFileNames are managed by SvelteKit
        // and should not be overridden here to avoid conflicts
      },

      // Optimize tree shaking
      treeshake: {
        moduleSideEffects: false,
        propertyReadSideEffects: false,
        unknownGlobalSideEffects: false
      }
    },

    // Enable compression
    reportCompressedSize: true,
    chunkSizeWarningLimit: 1000,

    // Asset optimization
    assetsInlineLimit: 4096, // Inline assets smaller than 4kb

    // CSS optimization
    cssCodeSplit: true,
    cssMinify: true
  },

  // Optimize dependencies
  optimizeDeps: {
    include: [
      '@urql/svelte',
      '@urql/core',
      'graphql',
      'svelte/store',
      'svelte/animate',
      'svelte/easing',
      'svelte/transition',
      '@vincjo/datatables'
    ],
    exclude: ['@sveltejs/kit', 'jsonwebtoken']
  },

  // Prevent server-only packages from being bundled for client
  ssr: {
    noExternal: [],
    external: ['jsonwebtoken', 'crypto']
  },

  // Resolve aliases for cleaner imports
  resolve: {
    alias: {
      $components: resolve('./src/lib/components'),
      $services: resolve('./src/lib/services'),
      $utils: resolve('./src/lib/utils'),
      $stores: resolve('./src/lib/stores'),
      $types: resolve('./src/lib/types'),
      $graphql: resolve('./src/lib/graphql')
    }
  },

  // Development server optimizations
  server: {
    port: 5173, // Fixed port to match Docker mapping
    host: '0.0.0.0', // Bind to all interfaces for K8s access

    // Explicitly set origin to stabilize Vite 7.x module runner in K8s
    origin:
      process.env.VITE_K8S_MODE === 'true'
        ? `http://${process.env.VITE_HMR_HOST || 'localhost'}:${process.env.VITE_HMR_PORT || '5173'}`
        : undefined,

    // Allow Tailscale MagicDNS hostnames for remote development access
    allowedHosts: [
      '.ts.net', // Allow all Tailscale MagicDNS domains
      '.svc.cluster.local', // Allow all Kubernetes service DNS names
      'localhost',
      '127.0.0.1',
      '192.168.1.129' // Local network IP (Traefik)
    ],

    proxy: {
      // Note: GraphQL requests now handled by SvelteKit API route at /api/graphql
      // No proxy needed as we have a custom GraphQL server implementation
    },

    // Disable compression completely
    middlewareMode: false,

    // HTTPS disabled for development (uncomment and configure for HTTPS)
    // https: {
    //   key: './certs/key.pem',
    //   cert: './certs/cert.pem'
    // }

    // Optimize HMR for both local and Kubernetes environments
    hmr: {
      overlay: true,
      // K8s-specific HMR configuration (set via environment variables)
      ...(process.env.VITE_K8S_MODE === 'true' && {
        protocol: 'ws',
        host: process.env.VITE_HMR_HOST || 'localhost',
        port: parseInt(process.env.VITE_HMR_PORT || '5173'),
        clientPort: parseInt(process.env.VITE_HMR_CLIENT_PORT || '5173')
      })
    },

    // Watch options for container file systems
    watch: {
      // Enable polling in K8s or when explicitly requested
      usePolling: process.env.VITE_USE_POLLING === 'true',
      interval: 1000, // Poll every second if polling is enabled
      // Ignore node_modules and build artifacts for performance
      ignored: ['**/node_modules/**', '**/.svelte-kit/**', '**/build/**', '**/dist/**']
    },

    // Faster rebuilds
    fs: {
      allow: ['..']
    }
  },

  // Performance monitoring
  esbuild: {
    // IMPORTANT: Do NOT drop console logs - we need them for production logging
    // Only drop debugger statements
    drop: process.env.NODE_ENV === 'production' ? ['debugger'] : []
  },
  test: {
    expect: { requireAssertions: true },
    projects: [
      {
        extends: './vite.config.ts',
        test: {
          name: 'client',
          environment: 'browser',
          browser: {
            enabled: true,
            provider: 'playwright',
            instances: [{ browser: 'chromium' }]
          },
          include: ['src/**/*.svelte.{test,spec}.{js,ts}'],
          exclude: ['src/lib/server/**'],
          setupFiles: ['./vitest-setup-client.ts']
        }
      },
      {
        extends: './vite.config.ts',
        test: {
          name: 'server',
          environment: 'node',
          include: ['src/**/*.{test,spec}.{js,ts}'],
          exclude: ['src/**/*.svelte.{test,spec}.{js,ts}']
        }
      }
    ]
  }
});
