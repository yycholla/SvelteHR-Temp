# SvelteHR Development Guidelines

Auto-generated from all feature plans. Last updated: 2025-10-14

## Active Technologies
- Rust 1.75+ (current project uses Rust for GraphQL backend) + SeaORM 0.12, async-graphql 7.0, axum 0.8, jsonwebtoken 9.0 (033-sea-orm-migration)
- PostgreSQL (existing database) (033-sea-orm-migration)
- Rust 1.75+ (current project uses Rust for GraphQL backend) + SeaORM 0.12, async-graphql 7.0, axum 0.8, jsonwebtoken 9.0, sqlx (migration source), pgcrypto (encryption) (033-sea-orm-migration)
- PostgreSQL (existing database with 20+ tables, computed columns, constraints, business logic functions) (033-sea-orm-migration)
- Rust 1.75+ (current project standard) + axum-login (new), axum 0.8, async-graphql 7.0, sea-orm 0.12, jsonwebtoken 9.0 (035-axum-login-migration)
- PostgreSQL (existing database with user tables and sessions) (035-axum-login-migration)
- SvelteKit (TypeScript/JavaScript frontend), Rust 1.75+ (backend) + SvelteKit, axum-login, SeaORM, async-graphql, axum, jsonwebtoken (036-svelte-kit-session)

## Project Structure
```
src/
tests/
```

## Commands
cargo test [ONLY COMMANDS FOR ACTIVE TECHNOLOGIES][ONLY COMMANDS FOR ACTIVE TECHNOLOGIES] cargo clippy

## Code Style
Rust 1.75+ (current project uses Rust for GraphQL backend): Follow standard conventions

## Recent Changes
- 036-svelte-kit-session: Added SvelteKit (TypeScript/JavaScript frontend), Rust 1.75+ (backend) + SvelteKit, axum-login, SeaORM, async-graphql, axum, jsonwebtoken
- 035-axum-login-migration: Added Rust 1.75+ (current project standard) + axum-login (new), axum 0.8, async-graphql 7.0, sea-orm 0.12, jsonwebtoken 9.0
- 033-sea-orm-migration: Added Rust 1.75+ (current project uses Rust for GraphQL backend) + SeaORM 0.12, async-graphql 7.0, axum 0.8, jsonwebtoken 9.0, sqlx (migration source), pgcrypto (encryption)

<!-- MANUAL ADDITIONS START -->
<!-- MANUAL ADDITIONS END -->
