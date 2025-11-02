# =============================================================================
# SvelteHR Tiltfile - Kubernetes Development with Hot Reloading
# =============================================================================
#
# This Tiltfile configures Tilt to provide hot-reloading HMR for Kubernetes
# development with minimal rebuilds and instant feedback.
#
# Quick Start:
#   tilt up              # Start all services with live updates
#   tilt down            # Stop Tilt (keeps K8s resources running)
#   tilt down --delete   # Stop and delete all K8s resources
#
# UI Dashboard: http://localhost:10350
# Frontend App: http://localhost:5173
# Backend API:  http://localhost:4000
#
# =============================================================================

# -----------------------------------------------------------------------------
# Tilt Configuration
# -----------------------------------------------------------------------------

# Allow deployment to local K8s cluster
# Safe for local development (cluster is running on localhost)
allow_k8s_contexts('default')

# Update settings for optimal performance
update_settings(
    max_parallel_updates=3,        # Build up to 3 resources in parallel
    k8s_upsert_timeout_secs=180,   # Give plenty of time for deployments
    suppress_unused_image_warnings=None
)

# Allow configurable namespace via tilt args
# Usage: tilt up -- --namespace=my-custom-namespace
config.define_string('namespace', args=False, usage='Kubernetes namespace to use')
cfg = config.parse()
namespace = cfg.get('namespace', 'sveltehr-dev')

# -----------------------------------------------------------------------------
# Namespace Setup
# -----------------------------------------------------------------------------

# Ensure namespace exists before deploying
# This prevents "namespace not found" errors on first run
k8s_yaml(blob("""
apiVersion: v1
kind: Namespace
metadata:
  name: {}
""".format(namespace)))

# -----------------------------------------------------------------------------
# Helm Chart Deployment
# -----------------------------------------------------------------------------

# Load SvelteHR Helm chart with development values
k8s_yaml(helm(
    './k8s/helm-charts/sveltehr',
    name='sveltehr-dev',
    namespace=namespace,
    values=[
        './k8s/helm-charts/sveltehr/values-dev.yaml',
        './k8s/helm-charts/sveltehr/tilt-values.yaml'
    ]
))

# -----------------------------------------------------------------------------
# Frontend - SvelteKit with Vite HMR
# -----------------------------------------------------------------------------

# Custom Docker build with live update for instant feedback
docker_build(
    'ghcr.io/mountain-care-rx/sveltehr/frontend',
    context='.',
    dockerfile='./Dockerfile',
    target='development',  # Use development stage from multi-stage build

    # Live update configuration - sync files without rebuilding container
    live_update=[
        # Sync source code changes (most frequent changes)
        sync('./src', '/app/src'),
        sync('./static', '/app/static'),

        # Sync configuration files
        sync('./svelte.config.js', '/app/svelte.config.js'),
        sync('./vite.config.ts', '/app/vite.config.ts'),
        sync('./tailwind.config.js', '/app/tailwind.config.js'),
        sync('./tsconfig.json', '/app/tsconfig.json'),

        # Sync package files (triggers npm install)
        sync('./package.json', '/app/package.json'),
        sync('./package-lock.json', '/app/package-lock.json'),

        # Run npm install when package.json changes
        run(
            'npm install',
            trigger=['./package.json', './package-lock.json']
        ),

        # Vite dev server will auto-detect file changes, no restart needed
    ],

    # Only watch specific files/directories to avoid unnecessary rebuilds
    only=[
        './src',
        './static',
        './package.json',
        './package-lock.json',
        './svelte.config.js',
        './vite.config.ts',
        './tailwind.config.js',
        './tsconfig.json',
        './Dockerfile',
    ],

    # Ignore patterns to exclude from Docker build context
    ignore=[
        '.git',
        '.github',
        'node_modules',
        '.svelte-kit',
        'build',
        'dist',
        '*.log',
        '.env*',
        'coverage',
        'playwright-report',
        'test-results',
        'graphql-rust-server',
        'k8s',
        'docs',
    ]
)

# Configure frontend resource with port forwarding and dependencies
k8s_resource(
    'sveltehr-dev-frontend',
    port_forwards=[
        '5173:5173',  # Vite dev server with HMR
    ],
    labels=['frontend'],
    resource_deps=[
        'sveltehr-dev-backend'
    ],
    # Trigger mode: auto rebuild on changes
    trigger_mode=TRIGGER_MODE_AUTO,
)

# -----------------------------------------------------------------------------
# Backend - Rust GraphQL Server
# -----------------------------------------------------------------------------

# Backend Docker build (optional: add live update for Rust if needed)
docker_build(
    'ghcr.io/mountain-care-rx/sveltehr/backend-server',
    context='./graphql-rust-server',
    dockerfile='./graphql-rust-server/Dockerfile',
    # Note: No target specified - builds the entire Dockerfile (final unnamed stage)

    # Optional: Live update for Rust (slower than frontend, rebuilds required)
    # Uncomment if you want to enable Rust hot reload
    # live_update=[
    #     sync('./graphql-rust-server/src', '/app/src'),
    #     run('cargo build --release', trigger=['./graphql-rust-server/src']),
    # ],

    only=[
        './src',
        './Cargo.toml',
        './Cargo.lock',
        './Dockerfile',
    ]
)

# Configure backend resource
k8s_resource(
    'sveltehr-dev-backend',
    port_forwards=[
        '4000:4000',  # GraphQL API endpoint
    ],
    labels=['backend'],
    # Note: Backend depends on PostgreSQL, but CloudNativePG cluster is managed
    # by the operator outside of Tilt's resource tracking
    trigger_mode=TRIGGER_MODE_AUTO,
)

# -----------------------------------------------------------------------------
# Database - PostgreSQL (CloudNativePG)
# -----------------------------------------------------------------------------
# Note: CloudNativePG operator creates these resources automatically:
#   - Cluster: sveltehr-dev-postgres (managed by operator)
#   - Services: sveltehr-dev-postgres-rw, sveltehr-dev-postgres-ro, sveltehr-dev-postgres-r
#   - Pods: sveltehr-dev-postgres-1, sveltehr-dev-postgres-2, etc.
#
# We only need to configure resources that Tilt directly manages.
# The database cluster is managed by the operator, so we don't configure it here.

# -----------------------------------------------------------------------------
# Redis Cache
# -----------------------------------------------------------------------------

# Redis - no rebuild needed
k8s_resource(
    workload='sveltehr-dev-redis-master',
    new_name='sveltehr-dev-redis',
    labels=['cache'],
    trigger_mode=TRIGGER_MODE_MANUAL,
)

# -----------------------------------------------------------------------------
# Local Resources - Development Tools
# -----------------------------------------------------------------------------

# TypeScript type checking (manual trigger)
local_resource(
    'typecheck',
    cmd='npm run check',
    deps=['src'],
    labels=['tests'],
    auto_init=False,
    trigger_mode=TRIGGER_MODE_MANUAL,
    resource_deps=['sveltehr-dev-frontend'],
)

# Linting (manual trigger)
local_resource(
    'lint',
    cmd='npm run lint',
    deps=['src'],
    labels=['quality'],
    auto_init=False,
    trigger_mode=TRIGGER_MODE_MANUAL,
)

# Unit tests (manual trigger)
local_resource(
    'test-unit',
    cmd='npm run test:unit -- --run',
    deps=['src'],
    labels=['tests'],
    auto_init=False,
    trigger_mode=TRIGGER_MODE_MANUAL,
)

# Build check (manual trigger) - verify production build works
local_resource(
    'build-check',
    cmd='npm run build',
    deps=['src'],
    labels=['quality'],
    auto_init=False,
    trigger_mode=TRIGGER_MODE_MANUAL,
)

# -----------------------------------------------------------------------------
# Helper Functions
# -----------------------------------------------------------------------------

# Print helpful instructions
print("""
╔═══════════════════════════════════════════════════════════════════════════╗
║                     SvelteHR Development Environment                      ║
╠═══════════════════════════════════════════════════════════════════════════╣
║                                                                           ║
║  🎯 Services Running:                                                     ║
║     • Frontend (SvelteKit + Vite):  http://localhost:5173                ║
║     • Backend (Rust GraphQL):       http://localhost:4000                ║
║     • Tilt UI Dashboard:            http://localhost:10350               ║
║                                                                           ║
║  🔥 Hot Module Replacement:                                               ║
║     • Edit files in ./src - changes sync instantly to K8s                ║
║     • Vite HMR updates browser automatically                             ║
║     • No container rebuilds needed for source changes                    ║
║                                                                           ║
║  🛠️  Manual Tools (click in Tilt UI):                                     ║
║     • typecheck   - Run TypeScript type checking                         ║
║     • lint        - Run Prettier and ESLint                              ║
║     • test-unit   - Run Vitest unit tests                                ║
║     • build-check - Verify production build                              ║
║                                                                           ║
║  📝 Logs:                                                                 ║
║     • View live logs in Tilt UI at http://localhost:10350                ║
║     • Or use: tilt logs sveltehr-dev-frontend                            ║
║                                                                           ║
║  🔄 Commands:                                                             ║
║     • tilt down            - Stop Tilt (keep K8s resources)              ║
║     • tilt down --delete   - Stop and delete everything                  ║
║     • tilt trigger <name>  - Manually trigger a resource                 ║
║                                                                           ║
╚═══════════════════════════════════════════════════════════════════════════╝
""")

# =============================================================================
# End of Tiltfile
# =============================================================================
