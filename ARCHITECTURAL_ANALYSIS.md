# Architectural Analysis: GraphQL vs REST for SvelteHR

## Current State Analysis

### 1. Abstraction Level
The current architecture uses a highly abstracted approach:
- **Frontend**: `EventsOperations` class wraps `urql` client, which wraps raw GraphQL strings. This provides type safety and reusable logic but adds boilerplate.
- **Backend**: Rust/Axum server with `async-graphql`. The `MutationRoot` is massive (4000+ lines in `mutation.rs`), handling everything from auth to complex business logic (event conflicts, RBAC, etc.).

### 2. REST Implementation
The current backend uses `axum` and already supports REST endpoints, specifically for authentication:
- `/auth/login`
- `/auth/logout`
- `/auth/me`
- `/auth/refresh`
- `/health`

These are mounted in `main.rs` using standard `axum` routing:
```rust
.route("/auth/login", axum::routing::post(login_handler))
```

### 3. GraphQL Complexity
The GraphQL implementation is complex because it tries to map a relational database (SeaORM) directly to a graph, with manual implementation of:
- Filtering (custom `EventFilter` inputs)
- Pagination (offset/limit)
- Relations (manual loaders or huge joins)
- RBAC (checked imperatively in every resolver/mutation)

## Switching to REST for Common Functions

### Feasibility
Switching to REST for common CRUD operations (like `deleteEvent`, `updateEvent`) is **highly feasible** and likely beneficial for specific use cases.

**Backend Effort (Low to Medium):**
- You already have `axum` set up.
- You can reuse the Service layer logic if it's extracted from the GraphQL resolvers (currently much of it is inline in `mutation.rs`, so refactoring is needed to pull logic into `services/` modules).
- Authentication/Authorization is already handled via middleware (`AuthManagerLayer`).

**Frontend Effort (Low):**
- Replacing `eventsOps.deleteEvent(...)` with `fetch('/api/events/${id}', { method: 'DELETE' })` is trivial.
- SvelteKit's `+page.server.ts` actions are already naturally aligned with REST-like flows.

### Benefits of REST for this Project
1.  **Simplicity for CRUD**: For simple "Delete ID X" or "Update status of Y", REST is often less verbose than constructing a GraphQL mutation string and variables.
2.  **Performance**: REST responses can be smaller (no GraphQL metadata overhead) and are easily cacheable by CDNs/browsers (though session-auth makes caching tricky for private data regardless).
3.  **Decoupling**: Decouples the frontend from the specific GraphQL schema structure for simple actions.
4.  **Debugging**: Easier to curl/test simple endpoints than full graph queries.

### Drawbacks
1.  **Dual Maintenance**: You will likely need to maintain both GraphQL (for complex data fetching) and REST (for simple mutations), splitting your API surface area.
2.  **Type Safety**: You lose the automatic type generation that tools like `graphql-codegen` provide unless you set up OpenAPI (Swagger) generation for your Rust endpoints.

## Recommendation

**Hybrid Approach**:
Keep GraphQL for **fetching data** (complex queries, nested relations, filters) where it shines.
Use REST for **simple mutations** (actions) like:
- `DELETE /api/events/:id`
- `POST /api/events/:id/rsvp`
- `POST /api/auth/...` (already done)

This reduces the complexity of your GraphQL mutation root and simplifies the frontend code for actions.

### Implementation Plan (Example: Delete Event)

1.  **Refactor Backend Logic**: Extract the deletion logic from `mutation.rs` into a `services::event_service::delete_event` function.
2.  **Create Handler**: Add a new handler in `handlers/events.rs`:
    ```rust
    pub async fn delete_event_handler(
        State(state): State<AppState>,
        Path(id): Path<Uuid>,
        auth_session: AuthSession,
    ) -> Result<impl IntoResponse, AppError> {
        // Auth check
        // Service call
        event_service::delete_event(&state.db, id, &user).await?;
        Ok(StatusCode::NO_CONTENT)
    }
    ```
3.  **Register Route**: In `main.rs`, add `.route("/api/events/:id", delete(delete_event_handler))`.
4.  **Frontend Update**: Replace the `urql` call in `+page.server.ts` with a native `fetch`.

This creates a cleaner separation of concerns and leverages the strengths of both patterns.
