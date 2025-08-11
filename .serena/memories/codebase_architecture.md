# SvelteHR Codebase Architecture

## Directory Structure

### `/src/routes/` - SvelteKit Routing
- **`/login/`** - Authentication pages
- **`/home/`** - Dashboard/homepage  
- **`/employees/`** - Employee management (CRUD operations)
- **`/hr/`** - HR-specific functions (layout wrapper)
  - `/hr/employees/` - HR employee view
  - `/hr/tasks/` - Task management
  - `/hr/compliance/` - Compliance tracking
  - `/hr/leave/` - Leave management
  - `/hr/notifications/` - Notification center
  - `/hr/performance/` - Performance reviews
  - `/hr/documents/` - Document management
  - `/hr/onboarding/` - Onboarding workflows
- **`/calendar/`** - Calendar and scheduling
- **`/reports/`** - Analytics and reporting
- **`/settings/`** - User and system settings
- **`/admin/`** - Admin-only functions
- **`/api/`** - API endpoints
  - `/api/stream/` - Streaming data endpoints
  - `/api/trpc/` - tRPC router endpoints

### `/src/lib/` - Shared Libraries

#### `/src/lib/components/`
- **`/ui/`** - Base UI components (buttons, inputs, cards, etc.)
- **`/dashboard/`** - Dashboard-specific components
- **`/employees/`** - Employee management components
- **`/hr/`** - HR-specific components
- **`/common/`** - Shared business components
- **`/streaming/`** - Real-time data components

#### `/src/lib/api/`
- `client.ts` - HTTP client configuration
- `services.ts` - API service functions
- `cache.ts` - API response caching
- `events.ts` - Event handling

#### `/src/lib/stores/`
- `auth.ts` - Authentication state
- `dashboard.ts` - Dashboard state
- `streaming.ts` - Real-time data state

#### `/src/lib/schemas/`
- Zod schemas for data validation
- `employee.ts`, `task.ts`, `compliance.ts`, etc.
- `transformers.ts` - Data transformation utilities

#### `/src/lib/hooks/`
- Custom hooks for data fetching
- `useApi.ts`, `useEmployees.ts`, `useNotifications.ts`

#### `/src/lib/utils/`
- Utility functions and helpers
- `date.ts`, `error-handler.ts`, `dataTransformers.ts`

## Key Architecture Patterns

### Data Flow
1. **SvelteKit Pages** - Handle routing and server-side data
2. **tRPC** - Type-safe API calls
3. **Svelte Stores** - Client-side state management
4. **Zod Schemas** - Runtime validation
5. **API Client** - HTTP communication with backend

### Component Architecture
- **Pages** - Route-level components with server-side data loading
- **Layouts** - Shared UI structure (`+layout.svelte`)
- **Components** - Reusable UI and business logic components
- **UI Components** - Base design system components

### Authentication
- JWT token-based authentication
- Better Auth library integration
- Route protection via hooks

### Streaming Data
- Server-sent events for real-time updates
- Dedicated streaming components
- WebSocket-like functionality for dashboards

### Performance Optimizations
- Pagination for large datasets
- Lazy loading for components
- API response caching
- Bundle optimization with Vite

## Backend Integration
- Go-based REST API on localhost:8080
- Comprehensive HR domain endpoints
- Performance monitoring and metrics
- MCP server for AI tool integration
- Batch operations for bulk updates

## Testing Strategy
- **Unit Tests**: Vitest for component logic
- **E2E Tests**: Playwright for full workflows
- **Storybook**: Component development and testing
- **Type Checking**: TypeScript strict mode

## Build & Deployment
- Vite for bundling and development
- SvelteKit adapter for deployment targets
- Environment-based configuration
- Docker support via backend