FROM postgres:15-alpine

# Install bash (Alpine uses sh by default, but we need bash for our scripts)
RUN apk add --no-cache bash

# Copy our custom healthcheck script (simple PostgreSQL readiness check)
# Note: Database migrations are now handled by the Rust GraphQL server using SeaORM
COPY dev-containers/postgres/healthcheck.sh /usr/local/bin/healthcheck.sh

# Make healthcheck script executable
RUN chmod +x /usr/local/bin/healthcheck.sh
