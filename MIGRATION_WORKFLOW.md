# Database Migration Workflow

## 🎯 Goal: Migrations are the Single Source of Truth

All database schema must be defined in SeaORM migrations. **NEVER** manually alter the database in development.

## ✅ Production-Ready Development Setup

### Reset Database from Scratch

When schema issues arise or you want a clean slate:

**Docker Setup (Recommended):**

```bash
# From project root - works with containerized setup
./graphql-rust-server/scripts/reset-dev-db.sh
```

**Manual Docker Command:**

```bash
# Run migrations inside the container
docker exec sveltehr-graphql-rust sh -c 'cd /app && cargo run --bin migration -- fresh'

# Restart backend to reload schema
docker restart sveltehr-graphql-rust
```

**Non-Docker Setup:**

```bash
# From graphql-rust-server directory
cargo run --bin migration -- fresh
```

This will:
1. Drop all tables
2. Re-run all migrations in order
3. Apply seed data
4. Verify schema integrity

### Migration Commands

**Docker Setup:**

```bash
# Check migration status
docker exec sveltehr-graphql-rust sh -c 'cd /app && cargo run --bin migration -- status'

# Apply pending migrations
docker exec sveltehr-graphql-rust sh -c 'cd /app && cargo run --bin migration -- up'

# Rollback last migration
docker exec sveltehr-graphql-rust sh -c 'cd /app && cargo run --bin migration -- down'

# Fresh start (drop + reapply all)
docker exec sveltehr-graphql-rust sh -c 'cd /app && cargo run --bin migration -- fresh'

# Refresh (rollback all + reapply)
docker exec sveltehr-graphql-rust sh -c 'cd /app && cargo run --bin migration -- refresh'
```

**Non-Docker Setup:**

```bash
# Check migration status
cargo run --bin migration -- status

# Apply pending migrations
cargo run --bin migration -- up

# Fresh start (drop + reapply all)
cargo run --bin migration -- fresh
```

## 🔧 Creating New Migrations

### 1. Generate Migration File

```bash
cd graphql-rust-server
sea-orm-cli migrate generate add_your_feature_name
```

This creates `migration/mYYYYMMDD_NNN_add_your_feature_name.rs`

### 2. Write Migration Code

**CRITICAL**: Migration schema MUST match SeaORM entity model exactly.

Example - if your model has:
```rust
#[sea_orm(column_name = "user_id")]
pub recipient_id: Uuid,
```

Your migration must create column `user_id` (NOT `recipient_id`):
```rust
.col(ColumnDef::new(YourTable::UserId).uuid().not_null())
```

### 3. Update lib.rs and main.rs

Add your migration to:
- `migration/lib.rs` - Add to `migrations()` vector
- `migration/main.rs` - Add module import

### 4. Test Migration

**Docker Setup:**

```bash
# Test fresh migration
docker exec sveltehr-graphql-rust sh -c 'cd /app && cargo run --bin migration -- fresh'

# Restart backend
docker restart sveltehr-graphql-rust

# Verify schema
docker exec sveltehr-postgres-dev psql -U postgres -d hr_system -c "\d hr_public.your_table"
```

**Non-Docker:**

```bash
# Test fresh migration
cargo run --bin migration -- fresh

# Verify schema (if using local PostgreSQL)
psql -U postgres -d hr_system -c "\d hr_public.your_table"
```

## 🚨 Common Issues & Solutions

### Schema Mismatch Errors

**Symptom**: `column X does not exist` or `type mismatch` errors

**Cause**: Migration doesn't match SeaORM entity model

**Solution**:
1. Check entity model in `src/models/your_model.rs`
2. Look for `#[sea_orm(column_name = "...")]` attributes
3. Ensure migration creates columns with exact names
4. Run `cargo run --bin migration -- fresh` to test

### Column Name Mappings

SeaORM entities use Rust field names but may map to different DB column names:

```rust
// Entity field: recipient_id
// DB column: user_id (via column_name attribute)
#[sea_orm(column_name = "user_id")]
pub recipient_id: Uuid,
```

**Always check column_name attributes when writing migrations!**

### Migration Order

Migrations run in alphabetical/chronological order. Ensure:
- Foreign keys reference tables created in earlier migrations
- Dependent tables come after their dependencies

## 📋 Pre-Commit Checklist

Before committing migration changes:

- [ ] Migration creates ALL columns expected by entity model
- [ ] Column names match `column_name` attributes exactly
- [ ] Foreign keys point to correct tables
- [ ] `cargo run --bin migration -- fresh` succeeds
- [ ] GraphQL queries work without schema errors
- [ ] Migration added to `lib.rs` and `main.rs`

## 🔄 Development Workflow

**When schema issues occur (Docker):**

```bash
# 1. Pull latest migrations
git pull

# 2. Reset database (one command!)
./graphql-rust-server/scripts/reset-dev-db.sh

# 3. Test frontend
# Visit http://localhost:5173
```

**Manual Docker steps:**

```bash
# 1. Pull latest migrations
git pull

# 2. Reset database
docker exec sveltehr-graphql-rust sh -c 'cd /app && cargo run --bin migration -- fresh'

# 3. Restart backend
docker restart sveltehr-graphql-rust

# 4. Test frontend
# Visit http://localhost:5173
```

**When creating new features:**

1. Create SeaORM entity model first
2. Write migration matching entity exactly
3. Test with `migration fresh`
4. Verify with GraphQL queries
5. Commit migration + model together

## 🎓 Best Practices

1. **Never skip migrations** - Always use `cargo run --bin migration -- up`
2. **Test in isolation** - Use `fresh` to verify migration works from scratch
3. **Match entity models** - Migration schema = entity model schema
4. **Document changes** - Add comments in migration explaining complex logic
5. **Atomic commits** - Commit migration + model + GraphQL schema together

## 🆘 Emergency Reset

If completely stuck:

**Docker Setup:**

```bash
# Nuclear option - completely rebuild
docker exec sveltehr-postgres-dev psql -U postgres -d hr_system -c "DROP SCHEMA IF EXISTS hr_public CASCADE;"
docker exec sveltehr-graphql-rust sh -c 'cd /app && cargo run --bin migration -- fresh'
docker restart sveltehr-graphql-rust
```

**Or use the script:**

```bash
./graphql-rust-server/scripts/reset-dev-db.sh
```

---

**Remember**: In development, **rebuilding is faster than debugging schema mismatches**.
