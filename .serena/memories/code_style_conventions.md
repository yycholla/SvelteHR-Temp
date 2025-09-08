# SvelteHR Code Style & Conventions

## Code Formatting (Prettier)

- **Tabs**: Use tabs for indentation (not spaces)
- **Quotes**: Single quotes for strings
- **Trailing Commas**: None
- **Print Width**: 100 characters max
- **Plugins**: prettier-plugin-svelte, prettier-plugin-tailwindcss

## File Structure & Naming

- **Components**: PascalCase filenames (e.g., `EmployeeCard.svelte`)
- **Files**: kebab-case for other files (e.g., `employee-schema.ts`)
- **Variables**: camelCase
- **Constants**: UPPER_SNAKE_CASE
- **Types**: PascalCase

## Import Conventions

- Use `.js` extensions for TypeScript imports
- Use `$lib/` path aliases for internal imports
- Use `type` keyword for type-only imports
- Group imports: external libraries, then internal modules

## Component Conventions (Svelte 5)

- Use `<script lang="ts">` for TypeScript
- Use `<script lang="ts" module>` for exports and types
- Use `$props()` syntax with destructuring and defaults
- Use `$state()` for reactive state
- Use `$bindable()` for two-way binding
- Define component props with `WithElementRef` for ref support

## CSS & Styling

- Use TailwindCSS utility classes
- Use `cn()` utility from `$lib/utils.js` for className merging
- Use `tailwind-variants` for component styling variants
- Follow existing component patterns in `src/lib/components/ui/`

## TypeScript

- Strict TypeScript configuration
- Export types with PascalCase
- Use Zod schemas for runtime validation
- Proper error type definitions

## Testing

- **Unit Tests**: `.spec.ts` or `.test.ts` files
- **Stories**: `.stories.svelte` files for Storybook
- Use Vitest for unit testing
- Use Playwright for E2E testing

## Error Handling

- Use Zod schemas for validation
- Proper TypeScript error types
- Consistent error boundaries and handling patterns

## Project Structure Guidelines

```
src/
├── lib/
│   ├── api/           # API client and utilities
│   ├── components/    # Reusable components
│   ├── hooks/         # Custom hooks
│   ├── schemas/       # Zod schemas
│   ├── stores/        # Svelte stores
│   └── utils/         # Utility functions
├── routes/            # Page components (SvelteKit routing)
└── tests/             # Test files
```
