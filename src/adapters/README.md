# Adapters Layer

Implementations of Ports (interfaces) for external systems.

**Rules:**

- Implements Port interfaces from `services/`
- Handles external API calls (GraphQL, REST, localStorage)
- No business logic
- Transforms external data to domain models

**Examples:**

- UrqlGraphQLAdapter (implements GraphQLPort)
- LocalStorageAdapter (implements StoragePort)
- BrowserAuthAdapter (implements AuthPort)
