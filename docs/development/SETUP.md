# SvelteHR Multi-PC Setup Guide

This guide helps you set up SvelteHR development environment on a new PC or synchronize between multiple development machines.

## 🎯 Quick Setup for New PC

If you're setting up SvelteHR on a new PC for the first time, run:

```bash
make init
```

This single command will:

- ✅ Check all prerequisites (Node.js, Docker, npm)
- ✅ Install frontend and backend dependencies
- ✅ Start Docker containers (PostgreSQL, Redis)
- ✅ Apply all database migrations in correct order
- ✅ Verify the installation

After successful installation, start development with:

```bash
npm run dev
# OR
make dev
```

## 📋 Prerequisites

Before running `make init`, ensure you have:

1. **Node.js 18+** - [Download](https://nodejs.org/)
2. **Docker Desktop** - [Download](https://www.docker.com/get-started)
3. **Git** - [Download](https://git-scm.com/)

## 🔄 Synchronizing Between Multiple PCs

### First Time on New PC

```bash
# 1. Clone the repository
git clone <repository-url>
cd SvelteHR

# 2. Run the initialization wizard
make init

# 3. Start development
npm run dev
```

### Returning to Existing Setup

If you've already set up the project and are pulling new changes:

```bash
# 1. Pull latest changes
git pull

# 2. Install any new dependencies
npm install

# 3. Apply new migrations (if any)
make db-init

# 4. Start development
npm run dev
```

## 🗄️ Database Management

### Initialize/Apply Migrations

Apply all pending migrations:

```bash
make db-init
# OR
make db-migrate
```

### Check Migration Status

See which migrations have been applied:

```bash
make db-status
```

### Verify Database Health

Check database connection and schema:

```bash
make db-verify
```

### Reset Database (⚠️ Dangerous)

Complete database reset (deletes all data):

```bash
make db-reset
```

## 🐳 Docker Container Management

### Start Containers

```bash
# Start all development containers
cd dev-containers
docker compose -f docker-compose.dev.yml up -d

# OR use Makefile
make backend-dev
```

### Stop Containers

```bash
cd dev-containers
docker compose -f docker-compose.dev.yml down

# OR use Makefile
make dev-stop
```

### Check Container Status

```bash
docker ps

# OR detailed health check
make db-health
```

## 📊 Available Services

When containers are running:

| Service          | URL/Port              | Credentials          |
| ---------------- | --------------------- | -------------------- |
| **Frontend**     | http://localhost:5173 | N/A                  |
| **PostgreSQL**   | localhost:5433        | postgres/postgres123 |
| **Redis**        | localhost:6380        | N/A                  |
| **Backend SSH**  | localhost:2222        | dev/dev              |
| **Frontend SSH** | localhost:2223        | dev/dev              |

## 🛠️ Common Commands

### Development

```bash
make dev              # Start complete development (backend + frontend)
make frontend-dev     # Start frontend only (backend must be running)
make backend-dev      # Start backend containers only
```

### Database

```bash
make db-shell         # Open PostgreSQL shell
make db-logs          # View database logs
make db-health        # Check database health
```

### Testing

```bash
npm run test          # Run all tests
npm run test:unit     # Run unit tests
npm run test:e2e      # Run E2E tests
```

### Code Quality

```bash
npm run check         # TypeScript and Svelte check
npm run lint          # Prettier + ESLint
npm run format        # Format code
```

## 🔧 Manual Migration Management

If you need more control over migrations, use the scripts directly:

### Apply All Migrations

```bash
bash scripts/init-db.sh
```

### Check Migration Status

```bash
bash scripts/init-db.sh --status
```

### Custom Database Connection

```bash
DB_HOST=localhost \
DB_PORT=5433 \
DB_NAME=hr_system \
DB_USER=postgres \
DB_PASSWORD=postgres123 \
bash scripts/init-db.sh
```

## 📝 Migration System

### How Migrations Work

1. Migrations are stored in `/migrations` directory
2. Each migration runs only once (tracked in `public.schema_migrations` table)
3. Migrations run in a specific order:
   - Base schema (01-07)
   - Feature migrations (sorted by date)
   - Seed data (last)

### Migration Execution Order

```
01-roles.sql                                 # Database roles
02-schema.sql                                # Core schema
03-data.sql                                  # Initial data
03_create_tasks_table.sql                    # Tasks table
04-indexes.sql                               # Performance indexes
04_create_current_user_function.sql          # User functions
05_add_missing_tables.sql                    # Additional tables
06_create_event_attendees.sql                # Events
07_add_employee_details.sql                  # Employee details
20250930_add_performance_indexes.sql         # Feature: Performance
20250930_add_rls_policies.sql                # Feature: RLS
20250930_create_hr_reports_table.sql         # Feature: Reports
20250930_create_notifications_table.sql      # Feature: Notifications
20250930_validate_schema.sql                 # Validation
20251002_001_create_activity_logs.sql        # Feature: Audit logging
20251002_002_create_rollback_requests.sql    # Feature: Rollback
20251002_003_create_bulk_rollback_batches.sql # Feature: Bulk rollback
20251002_004_comprehensive_audit_logging.sql # Feature: Complete audit
seed-development-data.sql                    # Development seed data
```

### Creating New Migrations

1. Create SQL file in `/migrations` directory
2. Use naming convention: `YYYYMMDD_NNN_description.sql`
3. Test locally with `make db-init`
4. Commit to repository

## 🚨 Troubleshooting

### Container Won't Start

```bash
# Check Docker is running
docker ps

# Remove old containers and volumes
make clean
make init
```

### Database Connection Failed

```bash
# Check PostgreSQL is healthy
docker exec sveltehr-postgres-dev pg_isready -U postgres -d hr_system

# Check container logs
make db-logs
```

### Migration Failed

```bash
# Check migration status
make db-status

# View detailed error
bash scripts/init-db.sh

# If needed, reset database
make db-reset
```

### Port Already in Use

If ports 5433, 6380, 5173, 2222, or 2223 are in use:

```bash
# Find what's using the port
lsof -i :5433

# Stop conflicting services or change ports in docker-compose.dev.yml
```

## 📚 Additional Resources

- **Full Command List**: Run `make help`
- **Project README**: See [README.md](README.md)
- **Architecture Guide**: See [CLAUDE.md](CLAUDE.md)

## 💡 Best Practices

1. **Always pull before starting work**

   ```bash
   git pull
   npm install
   make db-init
   ```

2. **Keep migrations synchronized**
   - Run `make db-init` after pulling new changes
   - Check `make db-status` to verify

3. **Use Makefile commands**
   - Consistent across all PCs
   - Handles environment differences automatically

4. **Commit dependencies together**
   - Commit `package-lock.json` with `package.json`
   - Document new dependencies in PR

## 🔐 Environment Variables

The development setup uses these defaults:

```env
# Database
DB_HOST=localhost
DB_PORT=5433
DB_NAME=hr_system
DB_USER=postgres
DB_PASSWORD=postgres123

# Redis
REDIS_PORT=6380

# Application
NODE_ENV=development
PUBLIC_API_URL=http://localhost:4000
```

For production, use `.env` files (not committed to repo).

## ✅ Verification Checklist

After setup, verify everything works:

- [ ] `docker ps` shows 4+ running containers
- [ ] `make db-verify` shows successful connection
- [ ] `make db-status` shows applied migrations
- [ ] `npm run dev` starts frontend on port 5173
- [ ] Can access http://localhost:5173
- [ ] Can log in with test credentials

## 🆘 Getting Help

If you encounter issues:

1. Check container logs: `make db-logs` or `make dev-logs`
2. Verify database health: `make db-verify`
3. Check migration status: `make db-status`
4. Try fresh installation: `make clean && make init`

---

**Last Updated**: 2025-10-02
**Version**: 1.0.0
