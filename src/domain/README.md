# Domain Layer

Pure business logic with zero external dependencies.

**Rules:**

- No imports from `lib/`, `routes/`, `adapters/`, or `services/`
- No Svelte components
- No browser APIs
- No GraphQL queries
- Only pure TypeScript functions and classes

**Examples:**

- Employee tenure calculation
- Validation logic
- Business rules
- Domain models (types/interfaces)
