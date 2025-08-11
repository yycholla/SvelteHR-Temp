# SvelteHR - AI Development Context

## Project Overview
SvelteHR is a comprehensive Human Resources management application built with SvelteKit 5. It's part of the Mountain Care ecosystem, providing enterprise-grade HR functionality with real-time streaming capabilities and AI-assisted development.

## Technology Stack
- **Frontend**: SvelteKit 5, TypeScript, Tailwind CSS 4.0, Skeleton UI
- **Backend**: Go REST API (localhost:8080/api/v1)
- **Database**: PostgreSQL
- **Authentication**: Better Auth with JWT tokens
- **Testing**: Playwright (E2E), Vitest (Unit), Storybook (Component)
- **AI Integration**: MCP server for development assistance

## Key Commands
```bash
# Development
npm run dev                 # Start development server
npm run build              # Build for production
npm run preview            # Preview production build

# Code Quality
npm run lint               # Lint code
npm run format            # Format code
npm run check             # Type check

# Testing
npm run test              # Run all tests
npm run test:e2e          # E2E tests
npm run test:unit         # Unit tests
npm run storybook         # Component documentation

# Specific E2E Tests
npm run test:auth         # Authentication tests
npm run test:dashboard    # Dashboard tests
npm run test:streaming    # Streaming tests
npm run test:employees    # Employee management tests
npm run test:performance  # Performance tests
```

## Architecture

### Directory Structure
- `src/routes/` - SvelteKit routing with server-side data loading
- `src/lib/components/` - Reusable UI and business components
- `src/lib/api/` - API client and service functions
- `src/lib/stores/` - Svelte stores for state management
- `src/lib/schemas/` - Zod validation schemas
- `e2e/` - End-to-end tests with Playwright

### Core Features
- Employee management with advanced filtering and pagination
- Real-time streaming dashboard with SSE
- Task management and assignment
- Compliance tracking with document management
- Leave request workflows
- Authentication and role-based access control
- Responsive design with dark/light modes

### Streaming Architecture
The application features advanced real-time capabilities:
- `GenericStreamingPage.svelte` - Reusable streaming page component
- `/api/stream/*` - Streaming endpoints for all data types
- Fallback modes for static/streaming data display
- Progressive loading with skeleton states

## Development Guidelines

### Code Style
- TypeScript strict mode throughout
- Svelte 5 runes syntax ($props, $state, $bindable)
- TailwindCSS for styling with utility-first approach
- Component-driven architecture

### API Integration
- Backend runs on localhost:8080/api/v1
- Admin credentials: admin/admin
- tRPC for type-safe API calls
- Comprehensive error handling and validation

### Testing Strategy
- E2E tests cover critical user workflows
- Unit tests for business logic and utilities
- Storybook for component development and testing
- Performance tests for optimization

### Performance Considerations
- Pagination for large datasets
- Lazy loading for components
- API response caching
- Bundle optimization with Vite

## Getting Started

### Prerequisites
- Node.js 18+
- Go backend server running on localhost:8080
- PostgreSQL database

### Setup
1. Install dependencies: `npm install`
2. Start development server: `npm run dev`
3. Run tests: `npm run test`
4. View Storybook: `npm run storybook`

### Backend Integration
The Go backend provides:
- RESTful API with comprehensive HR endpoints
- Performance monitoring at `/api/v1/performance/metrics`
- LLM-friendly schema at `/api/v1/llm/schema`
- MCP server integration for AI development tools

## AI Development Context
This project uses MCP (Model Context Protocol) integration for AI-assisted development. Key capabilities include:
- Component generation and templating
- API schema analysis and documentation
- Performance monitoring and optimization
- Batch operations for data management

### MCP Tools Available
- Employee and task management operations
- Compliance and document handling
- Dashboard metrics and analytics
- Component template generation
- API schema introspection

## Current Focus Areas
1. **Streaming Architecture**: Real-time data updates and progressive loading
2. **Performance Optimization**: Bundle size, API efficiency, and caching
3. **Component Library**: Comprehensive UI system with Storybook
4. **Testing Coverage**: E2E workflows and component testing
5. **AI Integration**: Leveraging MCP tools for development efficiency

## Important Notes
- Always run `npm run check` before committing
- Use streaming endpoints for real-time data when possible
- Follow component patterns established in existing codebase
- Test new features with both static and streaming modes
- Maintain TypeScript strict compliance

## Troubleshooting
- Backend API issues: Check localhost:8080 is running
- Authentication problems: Verify JWT token handling
- Streaming failures: Check SSE endpoint connectivity
- Build errors: Run `npm run check` for type issues
- Test failures: Use `npm run test:e2e:ui` for debugging