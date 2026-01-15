# Swagger/OpenAPI Documentation Setup

This document explains the OpenAPI/Swagger documentation setup for the SvelteHR REST API.

## Overview

The GraphQL Rust server now has **Swagger UI** for documenting REST API endpoints. This provides:

- Interactive API documentation
- Try-it-out functionality for testing endpoints
- Automatic schema generation from code annotations
- Clear documentation of request/response formats

**Important Note:** GraphQL endpoints continue to use the GraphQL Playground (at `/graphql`) for documentation. Swagger UI only documents REST endpoints.

## Accessing Swagger UI

Once the server is running, visit:

```
http://localhost:4000/swagger-ui
```

The OpenAPI JSON spec is available at:

```
http://localhost:4000/api-docs/openapi.json
```

## What's Documented

The following REST endpoints are documented:

### Authentication (`/auth/`)

- `POST /auth/login` - User login with email/password
- `POST /auth/logout` - User logout
- `GET /auth/me` - Get current user info
- `POST /auth/refresh` - Refresh session
- `GET /auth/sessions` - List active sessions

### Events (`/api/events/`)

- `DELETE /api/events/{id}` - Delete an event

### Roles (`/api/roles/`)

- `GET /api/roles` - Get all roles

### Users (`/api/users/`)

- `GET /api/users` - Get users with pagination (RLS enforced)

## Implementation Details

### File Structure

```
src/
├── openapi.rs              # OpenAPI configuration
├── handlers.rs             # Auth handlers with annotations
└── handlers/
    ├── events.rs           # Event handlers with annotations
    ├── roles.rs            # Role handlers with annotations
    └── users.rs            # User handlers with annotations
```

### Adding New Endpoints

To document a new REST endpoint:

1. **Annotate the handler function:**

```rust
#[utoipa::path(
    get,
    path = "/api/myendpoint",
    tag = "MyTag",
    responses(
        (status = 200, description = "Success", body = MyResponse),
        (status = 401, description = "Not authenticated"),
    ),
    security(
        ("session_cookie" = [])
    )
)]
pub async fn my_handler(...) -> Result<...> {
    // handler code
}
```

2. **Add ToSchema to request/response types:**

```rust
#[derive(Serialize, Deserialize, utoipa::ToSchema)]
pub struct MyResponse {
    #[schema(example = "example value")]
    pub field: String,
}
```

3. **Register in `src/openapi.rs`:**

```rust
paths(
    // ... existing paths
    crate::handlers::my_handler,
),
components(
    schemas(
        // ... existing schemas
        crate::handlers::MyResponse,
    )
),
```

### Security Considerations

**Sensitive fields are excluded from documentation:**

- `password_hash` - Never exposed in API docs
- `annual_salary`, `hourly_rate`, `commission_rate` - Represented as strings in schema but are sensitive fields

These fields use `#[schema(value_type = String)]` to map Rust types to OpenAPI types without exposing the actual values.

## Dependencies

```toml
utoipa = { version = "5.4.0", features = ["axum_extras", "uuid", "chrono"] }
utoipa-swagger-ui = { version = "9.0.2", features = ["axum"] }
```

## Best Practices

1. **Always annotate public REST endpoints** - Keep documentation up to date
2. **Use descriptive examples** - Help API consumers understand expected values
3. **Document error responses** - Show what can go wrong
4. **Tag endpoints logically** - Group related endpoints together
5. **Mark authentication requirements** - Use `security()` in path annotations
6. **Exclude sensitive data** - Use `#[schema(value_type = ...)]` for sensitive fields

## GraphQL vs REST Documentation

- **GraphQL endpoints** → Use GraphQL Playground at `/graphql`
- **REST endpoints** → Use Swagger UI at `/swagger-ui`

GraphQL has built-in introspection, so it doesn't need OpenAPI documentation. Keep using the GraphQL playground for all GraphQL queries and mutations.

## Troubleshooting

### Types not compiling

- Ensure the type has `#[derive(utoipa::ToSchema)]`
- For external types (Uuid, DateTime), ensure the feature is enabled in Cargo.toml
- For types that don't support ToSchema, use `#[schema(value_type = SomeOtherType)]`

### Endpoint not showing up

- Check that the handler is registered in `src/openapi.rs` under `paths()`
- Verify the handler has the `#[utoipa::path(...)]` annotation
- Restart the server after making changes

### Example values not showing

- Add `#[schema(example = "value")]` to struct fields
- For complex types, use `example = json!({...})`
