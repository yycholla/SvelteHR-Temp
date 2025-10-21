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
# Keep existing sqlx for migration compatibility
sqlx = { version = "0.7", features = ["postgres", "runtime-tokio-rustls", "uuid", "chrono", "json", "decimal"] }
```

### 2. Generate SeaORM Entities

Install SeaORM CLI and generate base entities from existing database:

```bash
cargo install sea-orm-cli
sea-orm-cli generate entity --database-url "postgresql://user:pass@localhost/hr_db" --output-dir graphql-rust-server/src/models/generated
```

### 3. Customize Generated Entities

The auto-generated entities need manual customization for:

**Computed Columns**: Add methods for `display_name` and `full_name`:

```rust
impl User {
    pub fn display_name(&self) -> String {
        format!("{} {}", self.first_name, self.last_name)
    }

    pub fn full_name(&self) -> String {
        self.display_name()
    }
}
```

**Complex Relationships**: Manually implement self-referential and multi-table relationships:

```rust
impl User {
    pub fn department(&self, db: &DatabaseConnection) -> Result<Option<department::Model>> {
        // Custom relationship loading
    }
}
```

**Enum Handling**: Map database enums to SeaORM enum types:

```rust
#[derive(Debug, Clone, Copy, PartialEq, Eq, EnumIter, DeriveActiveEnum)]
#[sea_orm(rs_type = "String", db_type = "Enum", enum_name = "task_status")]
pub enum TaskStatus {
    #[sea_orm(string_value = "todo")]
    Todo,
    #[sea_orm(string_value = "in_progress")]
    InProgress,
    // ... other statuses
}
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

### 9. Handle Complex Relationships

Implement custom relationship loading for complex cases:

```rust
// Self-referential relationships (departments hierarchy)
impl Department {
    pub async fn parent(&self, db: &DatabaseConnection) -> Result<Option<Department>> {
        if let Some(parent_id) = self.parent_department_id {
            Department::find_by_id(parent_id).one(db).await
        } else {
            Ok(None)
        }
    }

    pub async fn children(&self, db: &DatabaseConnection) -> Result<Vec<Department>> {
        Department::find()
            .filter(department::Column::ParentDepartmentId.eq(self.id))
            .all(db)
            .await
    }
}

// Multi-table relationships with aggregations
impl User {
    pub async fn task_count(&self, db: &DatabaseConnection) -> Result<i64> {
        Task::find()
            .filter(task::Column::AssigneeId.eq(self.id))
            .count(db)
            .await
    }
}
```

### 10. Preserve Frontend Compatibility

Ensure GraphQL API maintains exact compatibility:

```rust
// Maintain field names exactly as frontend expects
impl User {
    async fn display_name(&self) -> &str {
        &self.display_name // Must match frontend queries
    }

    async fn full_name(&self) -> &str {
        &self.full_name // Must match frontend queries
    }
}

// Preserve pagination structure
impl UsersConnection {
    async fn nodes(&self) -> &Vec<User> {
        &self.nodes // Must return Vec<User>, not Vec<user::Model>
    }
}
```

### 11. Migrate Authentication Integration

Complete axum-login integration with existing JWT:

```rust
// Enhanced UserStore implementation
impl UserStore for SeaOrmUserStore {
    async fn get_user(&self, id: &str) -> Option<User> {
        let user_id = Uuid::parse_str(id).ok()?;
        User::find_by_id(user_id)
            .one(&self.db)
            .await
            .ok()
            .flatten()
    }

    async fn get_user_by_email(&self, email: &str) -> Option<User> {
        User::find()
            .filter(user::Column::Email.eq(email))
            .one(&self.db)
            .await
            .ok()
            .flatten()
    }
}

// Maintain JWT compatibility
pub async fn auth_middleware(
    State(state): State<AppState>,
    mut req: Request,
    next: Next,
) -> Response {
    // Keep existing JWT validation
    if let Some(user) = validate_jwt_token(&req).await? {
        req.extensions_mut().insert(user);
    }
    Ok(next.run(req).await)
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

**Solution**: Ensure database schema is up to date and accessible. Check that all tables exist and have proper constraints.

### Issue: Computed columns not working

**Solution**: Manually implement `display_name` and `full_name` methods in entity models since SeaORM doesn't auto-generate computed column logic.

### Issue: Relationship queries return empty results

**Solution**: Verify foreign key constraints and entity relationships are correctly defined. Check that SeaORM entity relationships match database foreign keys.

### Issue: Self-referential relationships not loading

**Solution**: Implement custom relationship methods for hierarchical data (departments, tasks). SeaORM may need manual relationship mapping for complex hierarchies.

### Issue: Authentication fails after migration

**Solution**: Ensure axum-login UserStore implementation correctly queries SeaORM entities and maintains JWT compatibility with SvelteKit Better Auth.

### Issue: Frontend GraphQL queries break

**Solution**: Verify that all field names, relationships, and pagination structures exactly match existing frontend expectations. Test with actual frontend queries.

### Issue: Performance degradation

**Solution**: Add database indexes for frequently queried fields and implement eager loading for complex relationships. Monitor query performance during migration.

### Issue: Enum values don't match frontend expectations

**Solution**: Ensure SeaORM enum string values match the exact casing expected by frontend GraphQL queries (e.g., "todo" vs "TODO").

### Issue: Soft delete patterns not preserved

**Solution**: Implement custom filtering for `deleted_at IS NULL` in all queries to maintain existing soft delete behavior.

### Issue: Complex business logic lost

**Solution**: Identify and manually implement business logic that was embedded in raw SQL queries, such as validations, state transitions, and computed aggregations.

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
