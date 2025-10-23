#!/bin/bash
# PostgreSQL healthcheck - simple readiness verification
#
# Note: Database migrations are now handled by the Rust GraphQL server
# using SeaORM migrations that run automatically on container startup.
# This healthcheck only verifies PostgreSQL itself is ready to accept connections.

if pg_isready -U postgres -d hr_system > /dev/null 2>&1; then
    exit 0
else
    exit 1
fi
