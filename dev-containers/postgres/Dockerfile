FROM postgres:15-alpine

# Install bash (Alpine uses sh by default, but we need bash for our scripts)
RUN apk add --no-cache bash

# Copy migration check script to a location that will be available at runtime
# Build context is project root, so use full path from root
COPY db/scripts/check-and-apply-migrations.sh /usr/local/bin/check-and-apply-migrations.sh

# Copy our custom healthcheck script that also runs migrations
COPY dev-containers/postgres/healthcheck.sh /usr/local/bin/healthcheck.sh

# Make scripts executable
RUN chmod +x /usr/local/bin/check-and-apply-migrations.sh \
    && chmod +x /usr/local/bin/healthcheck.sh

# The init scripts will still run on first container creation
# The healthcheck will ensure migrations are applied on every start
