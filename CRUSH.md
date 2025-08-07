# CRUSH.md - SvelteHR Development Guide

## Build/Test/Lint Commands
- `npm run dev` - Start development server
- `npm run build` - Production build
- `npm run check` - TypeScript/Svelte type checking
- `npm run lint` - ESLint + Prettier check
- `npm run format` - Format code with Prettier
- `npm run test` - Run all tests (unit + e2e)
- `npm run test:unit` - Vitest unit tests
- `npm run test:unit -- --run` - Run unit tests once
- `npm run test:unit -- --run src/demo.spec.ts` - Run single test file
- `npm run test:e2e` - Playwright e2e tests
- `npm run storybook` - Start Storybook dev server

## Code Style Guidelines
- **Formatting**: Tabs (not spaces), single quotes, no trailing commas, 100 char width
- **Imports**: Use `.js` extension for TypeScript imports, `$lib/` path aliases
- **Types**: Export types with PascalCase, use `type` for type-only imports
- **Components**: PascalCase filenames, use `<script lang="ts" module>` for types/exports
- **Props**: Use Svelte 5 `$props()` syntax with destructuring and defaults
- **Utilities**: Use `cn()` from `$lib/utils.js` for className merging
- **Variants**: Use `tailwind-variants` for component styling variants
- **State**: Use `$bindable()` for two-way binding, `$state()` for reactive state
- **Types**: Define component props with `WithElementRef` for ref support
- **Error Handling**: Use Zod schemas for validation, proper TypeScript error types
- **Design System**: Follow existing component patterns in `src/lib/components/ui/`
- **File Structure**: Stories in `.stories.svelte`, tests in `.spec.ts` or `.test.ts`
- **Naming**: kebab-case for files, PascalCase for components, camelCase for variables