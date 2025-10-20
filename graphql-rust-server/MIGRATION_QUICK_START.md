# SeaORM Migrations - Quick Start 🚀

## Docker (Recommended)

**Migrations run automatically on container startup!**

```bash
# Just start your services
docker-compose up -d

# Watch migration logs
docker logs -f hr-graphql-rust
```

You should see:
```
📦 Running SeaORM database migrations...
Applying migration 'm20251017_001_schemas'
✅ Migrations completed successfully!
```

---

## Local Development

```bash
cd graphql-rust-server

# Set DATABASE_URL
export DATABASE_URL=postgresql://postgres:postgres123@localhost:5433/hr_system

# Check status
cargo run --bin migration status

# Apply all pending
cargo run --bin migration up

# Rollback last
cargo run --bin migration down
```

---

## File Structure

```
graphql-rust-server/
├── migration/              # 🆕 Rust migrations (USE THESE!)
│   ├── m20251017_001_schemas.rs
│   ├── m20251017_002_enums.rs
│   ├── m20251017_003_auth.rs
│   ├── ...
│   └── README.md
├── db/migrations/          # ❌ Old SQL files (deprecated)
├── Dockerfile              # ✅ Updated to run migrations
└── docker-entrypoint.sh    # ✅ New migration runner script
```

---

## Key Changes

| Before (SQL) | After (Rust) |
|-------------|-------------|
| `./scripts/init-db.sh` | `cargo run --bin migration up` |
| Manual SQL files | Type-safe Rust code |
| No rollback | Built-in `down()` migrations |
| Bash script | Docker entrypoint automation |

---

## Common Commands

```bash
# Development
cargo run --bin migration status        # Check what's applied
cargo run --bin migration up            # Apply pending migrations
cargo run --bin migration down          # Rollback last migration
cargo run --bin migration fresh         # Reset database (⚠️ deletes data!)

# Docker
docker-compose up -d                    # Migrations run automatically
docker logs hr-graphql-rust             # View migration logs
docker-compose down && docker-compose up -d  # Restart with fresh migrations
```

---

## Troubleshooting

**Problem: Migration failed**
```bash
# Check logs
docker logs hr-graphql-rust

# Or run manually
cargo run --bin migration up
```

**Problem: Need fresh database**
```bash
# ⚠️ This deletes ALL data!
docker-compose down
docker volume rm sveltehr_postgres_data
docker volume create sveltehr_postgres_data
docker-compose up -d
```

---

## Documentation

- **Full Guide**: [`MIGRATION_GUIDE.md`](./MIGRATION_GUIDE.md)
- **Migration Details**: [`migration/README.md`](./migration/README.md)
- **SeaORM Docs**: https://www.sea-ql.org/SeaORM/docs/migration/

---

## ✅ You're All Set!

The new migration system is:
- ✅ Type-safe (compile-time validation)
- ✅ Automatic (runs on Docker startup)
- ✅ Reversible (rollback support)
- ✅ Integrated (part of Rust codebase)
