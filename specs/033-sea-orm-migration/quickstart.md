# Quick Start: SeaORM Migration

**Feature**: 033-sea-orm-migration
**Date**: 2025-10-14

## Overview

This guide provides a quick start for migrating the HR system backend from sqlx to SeaORM while maintaining 100% feature parity with the existing SvelteKit frontend.

## Prerequisites

- Rust 1.75+
- PostgreSQL database
- Existing HR system database schema
- SvelteKit frontend running on http://localhost:5173

## Migration Steps

### 1. Setup SeaORM Dependencies

Add SeaORM dependencies to `graphql-rust-server/Cargo.toml`:

```toml
[dependencies]
sea-orm = { version = "0.12", features = ["sqlx-postgres", "runtime-tokio-rustls", "macros"] }
sea-orm-migration = "0.12"
axum-login = "0.12"  # For enhanced authentication
```

### 2. Generate SeaORM Entities

Install SeaORM CLI and generate entities from existing database:

```bash
cargo install sea-orm-cli
sea-orm-cli generate entity --database-url "postgresql://user:pass@localhost/hr_db" --output-dir graphql-rust-server/src/models
```

### 3. Update Database Connection

Replace sqlx connection with SeaORM database:

```rust
// Before (sqlx)
let pool = PgPool::connect(&database_url).await?;

// After (SeaORM)
let db = Database::connect(&database_url).await?;
```

### 4. Migrate Query Operations

Replace sqlx queries with SeaORM operations:

```rust
// Before (sqlx)
let users = sqlx::query_as!(User, "SELECT * FROM users WHERE department_id = $1", dept_id)
    .fetch_all(&pool)
    .await?;

// After (SeaORM)
let users: Vec<user::Model> = User::find()
    .filter(user::Column::DepartmentId.eq(dept_id))
    .all(&db)
    .await?;
```

### 5. Update Authentication

Integrate axum-login with SeaORM user store:

```rust
use axum_login::{AuthManager, UserStore};
use sea_orm::DatabaseConnection;

// Implement UserStore for SeaORM
#[derive(Clone)]
pub struct SeaOrmUserStore {
    db: DatabaseConnection,
}

impl UserStore for SeaOrmUserStore {
    // Implement required methods using SeaORM queries
}
```

### 6. Update GraphQL Resolvers

Replace sqlx-based resolvers with SeaORM:

```rust
// Before
pub async fn get_users(ctx: &Context<'_>) -> Result<Vec<User>> {
    let pool = ctx.data::<PgPool>()?;
    let users = sqlx::query_as!(User, "SELECT * FROM users")
        .fetch_all(pool)
        .await?;
    Ok(users)
}

// After
pub async fn get_users(ctx: &Context<'_>) -> Result<Vec<user::Model>> {
    let db = ctx.data::<DatabaseConnection>()?;
    let users = User::find().all(db).await?;
    Ok(users)
}
```

### 7. Add Performance Optimizations

Implement connection pooling and eager loading:

```rust
// Connection pooling
let db = Database::connect(&database_url).await?;

// Eager loading for relationships
let users_with_departments = User::find()
    .find_with_related(department::Entity)
    .all(&db)
    .await?;
```

### 8. Update Tests

Migrate tests to use SeaORM test utilities:

```rust
use sea_orm::{Database, DatabaseConnection, DbErr};

#[cfg(test)]
mod tests {
    use super::*;

    async fn setup_test_db() -> DatabaseConnection {
        let db = Database::connect("postgresql://test:test@localhost/test_db").await.unwrap();
        // Setup test data
        db
    }
}
```

## Verification Steps

### 1. Run Existing Tests

Ensure all existing functionality still works:

```bash
npm run test:e2e  # Frontend tests
cargo test         # Backend unit tests
```

### 2. Performance Validation

Verify API response times meet requirements:

```bash
# Test simple queries (<500ms)
curl -w "@curl-format.txt" -o /dev/null -s "http://localhost:8080/graphql" \
  -H "Content-Type: application/json" \
  -d '{"query": "query { users { id email } }"}'
```

### 3. Feature Parity Check

Compare frontend behavior before and after migration:

- User login/logout
- Department navigation
- Employee data display
- Task management
- Leave request workflow
- Performance review process

## Common Issues & Solutions

### Issue: Entity generation fails

**Solution**: Ensure database schema is up to date and accessible

### Issue: Relationship queries return empty results

**Solution**: Verify foreign key constraints and entity relationships are correctly defined

### Issue: Authentication fails after migration

**Solution**: Ensure axum-login UserStore implementation correctly queries SeaORM entities

### Issue: Performance degradation

**Solution**: Add database indexes and implement eager loading for frequently accessed relationships

## Next Steps

1. Complete the full migration following this guide
2. Run comprehensive testing suite
3. Monitor performance metrics
4. Address any feature parity issues
5. Consider additional SeaORM optimizations for future enhancements

## Resources

- [SeaORM Documentation](https://www.sea-ql.org/SeaORM/)
- [axum-login Documentation](https://docs.rs/axum-login/latest/axum_login/)
- [Migration Guide](research.md)
- [Data Model](data-model.md)
