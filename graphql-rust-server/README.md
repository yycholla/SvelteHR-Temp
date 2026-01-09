# HR GraphQL Server (Rust + async-graphql)

High-performance GraphQL server for HR system built with Rust, async-graphql, and Tokio.

## Features

- ✅ **Full filtering support** - All columns filterable including range queries and null checks
- ✅ **Type-safe** - Rust's type system ensures correctness at compile time
- ✅ **High performance** - Tokio async runtime with connection pooling
- ✅ **GraphQL Playground** - Built-in interactive API explorer
- ✅ **CORS configured** - Ready for frontend integration
- ✅ **Health checks** - `/health` endpoint for monitoring
- ✅ **Docker support** - Multi-stage build for optimal image size

## Quick Start

### Prerequisites

- Docker and Docker Compose
- PostgreSQL database (hr_system) running
- Rust 1.75+ (for local development)

### Running with Docker

```bash
# Build and start the server
docker-compose up -d

# View logs
docker-compose logs -f

# Stop the server
docker-compose down
```

Server will be available at:

- GraphQL endpoint: `http://localhost:4001/graphql`
- GraphQL Playground: `http://localhost:4001/`
- Health check: `http://localhost:4001/health`

### Local Development

```bash
# Install dependencies
cargo build

# Run migrations (if any)
# cargo sqlx migrate run

# Start server
cargo run

# Or with watch mode
cargo watch -x run
```

## API Examples

### Query Event Attendees

```graphql
query GetAttendees {
	eventAttendees(limit: 10) {
		id
		eventId
		employeeId
		responseStatus
		reminderTime
		isOrganizer
		createdAt
	}
}
```

### Filter with Range Queries

```graphql
query GetAttendeesWithReminders {
	eventAttendees(filter: { reminderTimeGte: 10, reminderTimeLte: 60 }) {
		id
		reminderTime
	}
}
```

### Filter by Null Values

```graphql
query GetAttendeesWithoutReminders {
	eventAttendees(filter: { reminderTimeIsNull: true }) {
		id
		eventId
		reminderTime
	}
}
```

### Create Event Attendee

```graphql
mutation CreateAttendee {
	createEventAttendee(
		input: {
			eventId: "550e8400-e29b-41d4-a716-446655440000"
			employeeId: "660e8400-e29b-41d4-a716-446655440001"
			responseStatus: PENDING
			reminderTime: 15
			isOrganizer: false
		}
	) {
		id
		reminderTime
		responseStatus
	}
}
```

### Update Reminder Time

```graphql
mutation UpdateReminder {
	updateEventAttendee(id: "770e8400-e29b-41d4-a716-446655440002", input: { reminderTime: 30 }) {
		id
		reminderTime
	}
}
```

## Filtering Capabilities

Unlike PostGraphile, this Rust implementation supports **ALL filtering operations**:

### Exact Matching

- `id`, `eventId`, `employeeId`, `responseStatus`, `isRequired`, `scope`, `isOrganizer`

### Null Checks

- `reminderTimeIsNull: true` - Get attendees without reminders
- `reminderTimeIsNull: false` - Get attendees with reminders

### Range Queries

- `reminderTimeGt: 10` - Greater than
- `reminderTimeLt: 60` - Less than
- `reminderTimeGte: 10` - Greater than or equal
- `reminderTimeLte: 60` - Less than or equal

### Pagination

- `limit: 100` - Number of results (max 1000)
- `offset: 0` - Skip N results

## Schema

### EventAttendee Type

```graphql
type EventAttendee {
	id: UUID!
	eventId: UUID!
	employeeId: UUID!
	responseStatus: RsvpStatus!
	isRequired: Boolean!
	createdAt: DateTime!
	reminderTime: Int
	scope: RsvpScope
	isOrganizer: Boolean!
}
```

### RsvpStatus Enum

```graphql
enum RsvpStatus {
	PENDING
	ACCEPTED
	DECLINED
	TENTATIVE
}
```

### RsvpScope Enum

```graphql
enum RsvpScope {
	THIS_EVENT
	ALL_EVENTS
}
```

## Configuration

Environment variables (`.env` file):

```bash
DATABASE_URL=postgresql://postgres:postgres123@postgres-dev:5432/hr_system
HOST=0.0.0.0
PORT=4000
RUST_LOG=info,hr_graphql_server=debug
CORS_ALLOWED_ORIGINS=http://localhost:5173,http://localhost:3000
```

## Performance

- **Async I/O** - Tokio runtime for non-blocking operations
- **Connection pooling** - Configurable pool size (default: 20)
- **Type safety** - Zero runtime overhead from type checking
- **Minimal allocations** - Rust's zero-cost abstractions

## Comparison with PostGraphile

| Feature       | PostGraphile        | Rust + async-graphql |
| ------------- | ------------------- | -------------------- |
| Null checks   | ❌ Limited          | ✅ Full support      |
| Range queries | ❌ Requires indexes | ✅ Always works      |
| Custom logic  | ⚠️ Plugin system    | ✅ Native Rust code  |
| Performance   | Good                | Excellent            |
| Type safety   | Runtime             | Compile-time         |
| Filtering     | Index-dependent     | Always available     |

## Development

### Project Structure

```
graphql-rust-server/
├── src/
│   ├── main.rs           # Server entry point
│   ├── config.rs         # Configuration management
│   ├── db/               # Database connection
│   ├── models/           # Data models
│   │   └── event_attendee.rs
│   └── schema/           # GraphQL schema
│       ├── query.rs      # Query resolvers
│       └── mutation.rs   # Mutation resolvers
├── Cargo.toml            # Dependencies
├── Dockerfile            # Multi-stage build
└── docker-compose.yml    # Container orchestration
```

### Adding New Models

1. Create model in `src/models/`
2. Add query resolvers in `src/schema/query.rs`
3. Add mutation resolvers in `src/schema/mutation.rs`
4. Update schema exports

### Testing

```bash
# Run tests
cargo test

# Run with coverage
cargo tarpaulin
```

## Deployment

The Docker image uses multi-stage builds for optimal size:

- Builder stage: Full Rust toolchain
- Runtime stage: Minimal Debian slim (~50MB)

Production deployment:

```bash
# Build optimized image
docker build -t hr-graphql-server:latest .

# Run in production
docker run -d \
  -p 4000:4000 \
  -e DATABASE_URL=postgresql://... \
  hr-graphql-server:latest
```

## Troubleshooting

### Connection Refused

Ensure PostgreSQL is running and accessible:

```bash
docker exec postgres-dev psql -U postgres -c "SELECT 1"
```

### CORS Issues

Add your frontend origin to `CORS_ALLOWED_ORIGINS`:

```bash
CORS_ALLOWED_ORIGINS=http://localhost:5173,https://your-domain.com
```

### Slow Queries

Enable query logging:

```bash
RUST_LOG=sqlx::query=debug
```

## License

MIT
