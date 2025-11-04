# Stage 1: Base chef image with cargo-chef installed
FROM rust:1.90-slim AS chef

# Install cargo-chef
RUN cargo install cargo-chef

WORKDIR /app

# Stage 2: Planner - generates recipe.json from project dependencies
FROM chef AS planner

# Copy entire project to analyze dependencies
COPY . .

# Generate dependency recipe
RUN cargo chef prepare --recipe-path recipe.json

# Stage 3: Builder - builds dependencies then application
FROM chef AS builder

# Install build dependencies including mold linker for faster linking
RUN apt-get update && apt-get install -y \
    pkg-config \
    libssl-dev \
    clang \
    mold \
    && rm -rf /var/lib/apt/lists/*

# Copy dependency recipe from planner
COPY --from=planner /app/recipe.json recipe.json

# Build dependencies with Loki feature (this layer will be cached unless dependencies change)
RUN cargo chef cook --release --features loki --recipe-path recipe.json

# Copy actual source code
COPY . .

# Build application, migration, and seed-data binaries with Loki feature (only rebuilds if source changed)
RUN cargo build --release --features loki --bin hr-graphql-server && \
    cargo build --release --bin migration && \
    cargo build --release --bin seed-data

# Runtime stage - use same Debian version as rust:1.90-slim (Debian Sid/Trixie)
FROM debian:trixie-slim

# Install runtime dependencies
RUN apt-get update && apt-get install -y \
    ca-certificates \
    libssl3 \
    curl \
    clang \
    postgresql-client \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy binaries from builder
COPY --from=builder /app/target/release/hr-graphql-server /app/
COPY --from=builder /app/target/release/migration /app/
COPY --from=builder /app/target/release/seed-data /app/

# Copy startup script and set permissions before switching to appuser
COPY docker-entrypoint.sh /app/
RUN chmod +x /app/docker-entrypoint.sh /app/hr-graphql-server /app/migration /app/seed-data

# Create non-root user and transfer ownership
RUN useradd -m -u 1000 appuser && \
    chown -R appuser:appuser /app

USER appuser

EXPOSE 4000

ENTRYPOINT ["/app/docker-entrypoint.sh"]
CMD ["/app/hr-graphql-server"]
