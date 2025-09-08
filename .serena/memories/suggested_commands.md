# SvelteHR Development Commands

## Daily Development

- `npm run dev` - Start development server (http://localhost:5173)
- `npm run build` - Create production build
- `npm run preview` - Preview production build locally

## Code Quality (Run after making changes)

- `npm run check` - TypeScript/Svelte type checking (CRITICAL)
- `npm run lint` - ESLint + Prettier check (REQUIRED)
- `npm run format` - Format code with Prettier

## Testing

- `npm run test` - Run all tests (unit + e2e)
- `npm run test:unit` - Run Vitest unit tests
- `npm run test:unit -- --run` - Run unit tests once (CI mode)
- `npm run test:unit -- --run src/demo.spec.ts` - Run single test file
- `npm run test:e2e` - Run Playwright e2e tests
- `npm run test:e2e:ui` - Run e2e tests with UI
- `npm run test:e2e:debug` - Debug e2e tests
- `npm run test:e2e:headed` - Run e2e tests with browser visible

## Specific E2E Tests

- `npm run test:auth` - Test authentication flow
- `npm run test:dashboard` - Test dashboard functionality
- `npm run test:streaming` - Test streaming features
- `npm run test:employees` - Test employee management
- `npm run test:performance` - Performance testing

## Component Development

- `npm run storybook` - Start Storybook dev server (port 6006)
- `npm run build-storybook` - Build static Storybook

## Critical Commands to Run Before Commits

1. `npm run check` - Ensures TypeScript compilation
2. `npm run lint` - Ensures code quality
3. `npm run test:unit -- --run` - Ensures tests pass
4. `npm run build` - Ensures production build works

## Backend

- Backend runs on `localhost:8080/api/v1`
- Login credentials: `admin/admin`
- Health check: `GET /api/v1/health`
- API schema: `GET /api/v1/llm/schema`

## Utilities

- `git status` - Check git status
- `ls -la` - List files with details
- `find . -name "*.svelte"` - Find Svelte files
- `grep -r "searchterm" src/` - Search in source code
