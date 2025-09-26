# SvelteHR Monorepo Architecture

A modern HR management system organized as a monorepo with GelDB as the primary backend using GraphQL and built-in authentication.

## 🏗️ Project Structure

```
SvelteHR/
├── apps/
│   ├── frontend/          # SvelteKit application (main app code)
│   └── database/          # GelDB schema and database configuration
│       └── dbschema/      # .gel schema files
├── packages/
│   ├── shared/           # Shared utilities and types
│   └── ui-components/    # Reusable UI component library
├── tools/
│   ├── scripts/          # Build and deployment scripts
│   └── dev-tools/        # Development utilities
├── configs/
│   ├── docker/           # Docker configurations
│   └── deployment/       # Deployment configurations
├── docs/                 # Documentation
├── docker-compose.yml    # Root container orchestration
└── Makefile             # Development commands
```

## 🚀 Quick Start

```bash
# Start development environment (database + frontend)
make dev

# Or start just the database services
make db-up

# Check database health
make db-health

# Reset database with fresh schema
make db-reset
```

## 💾 Database Architecture

**GelDB** serves as our primary backend providing:

- **GraphQL API**: `http://localhost:5656/db/main/ext/graphql`
- **Admin UI**: `http://localhost:5656/ui` (admin/admin)
- **Auth Extension**: Magic links, email/password, RBAC
- **Built-in SMTP**: Email functionality for auth workflows

### Key Extensions Enabled:

- ✅ `graphql` - GraphQL API endpoint
- ✅ `auth` - Authentication with magic links and email/password
- ✅ `pgcrypto` - Cryptographic functions

### SMTP Configuration:

- **Provider**: SMTP2GO
- **Host**: mail.smtp2go.com:2525
- **Sender**: gel@yycholla.com

## 🎯 Development Workflow

### Frontend Development

The SvelteKit app connects directly to GelDB's GraphQL endpoint, eliminating the need for a separate API layer.

```bash
# Development server with hot reload
make dev

# Build for production
make build
```

### Database Management

```bash
# Apply schema changes
make schema-apply

# View database logs
make db-logs

# Reset database (fresh start)
make db-reset
```

### Schema Development

Schema files are located in `apps/database/dbschema/` and include:

- `default.gel` - Core types and auth integration
- `rbac.gel` - Role-based access control
- `hr_workflows.gel` - HR-specific business logic
- `payroll.gel` - Payroll and compensation
- `performance.gel` - Performance management
- And more modular schema files...

## 🔐 Authentication & RBAC

GelDB's auth extension provides:

- **Magic Link Authentication** - Passwordless login via email
- **Email/Password** - Traditional authentication
- **Role-Based Access Control** - Hierarchical permissions
- **Session Management** - JWT tokens and secure sessions

### Available Roles:

- `Admin` - Full system access
- `HR_Manager` - HR operations and employee management
- `Manager` - Team and department management
- `Employee` - Basic user access

## 📊 GraphQL Integration

The frontend uses GelDB's native GraphQL endpoint for all data operations:

- **Endpoint**: `http://localhost:5656/db/main/ext/graphql`
- **Authentication**: Bearer tokens from auth extension
- **Real-time**: WebSocket subscriptions for live updates
- **Type Safety**: Generated TypeScript types from schema

## 🐳 Container Architecture

```yaml
services:
  geldb: # Primary database with GraphQL + Auth
  redis: # Session storage and caching (optional)
```

No separate API layer needed - GelDB handles everything!

## 🛠️ Available Commands

| Command             | Description                      |
| ------------------- | -------------------------------- |
| `make dev`          | Start development environment    |
| `make db-up`        | Start database services          |
| `make db-health`    | Check service health             |
| `make db-reset`     | Reset database with fresh schema |
| `make schema-apply` | Apply schema changes             |
| `make clean`        | Clean all artifacts              |

## 🎨 Frontend Stack

- **SvelteKit 2.22.0** with **Svelte 5.0** (runes)
- **TypeScript 5.0** - Strict typing throughout
- **Tailwind CSS 4.0** - Modern styling
- **GraphQL Codegen** - Type-safe GraphQL operations
- **Vite 7.0.4** - Fast development and building

## 🔄 Development Flow

1. **Schema Changes**: Edit files in `apps/database/dbschema/`
2. **Apply Schema**: Run `make schema-apply`
3. **Generate Types**: GraphQL codegen creates TypeScript types
4. **Frontend Development**: Use type-safe GraphQL operations
5. **Testing**: E2E tests with Playwright, unit tests with Vitest

This architecture provides a clean separation of concerns while leveraging GelDB's powerful built-in features for a modern, efficient development experience.
