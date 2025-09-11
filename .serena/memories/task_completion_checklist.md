# Task Completion Checklist for SvelteHR

## Before Starting Development
- [ ] Ensure database services are running: `make db-up`
- [ ] Verify database health: `make db-health`
- [ ] Check schema status: `make schema-status`

## During Development
- [ ] Follow container-first development principles
- [ ] Use Makefile commands instead of direct Docker commands
- [ ] Test database connectivity before making schema changes
- [ ] Use `make gel-repl` for interactive database exploration

## Schema Changes
- [ ] Create migration: `make schema-create`
- [ ] Test migration on clean database: `make db-reset && make schema-apply`
- [ ] Verify schema status: `make schema-status`

## Task Completion
- [ ] Test database connectivity: `make db-health`
- [ ] Verify all containers are running: `docker compose ps`
- [ ] Check for any migration issues: `make schema-status`
- [ ] Clean up if needed: `make clean` (only if removing containers)

## Code Quality (when applicable)
- [ ] Follow twelve-factor app principles
- [ ] Use environment variables via Doppler
- [ ] Ensure non-root container execution
- [ ] Document any new Makefile targets

## Database Operations
- [ ] Backup critical data before destructive operations
- [ ] Use `make gel-cli` for custom database operations
- [ ] Monitor logs with `make db-logs` during troubleshooting

## Environment Management
- [ ] Use Doppler tokens for production deployments
- [ ] Never commit secrets to repository
- [ ] Test with both development and production Docker targets