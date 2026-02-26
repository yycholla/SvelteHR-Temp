//! GraphQL Resolver Benchmarks
//!
//! Benchmarks for measuring performance of GraphQL resolvers, database operations,
//! and dataloader efficiency.
//!
//! Run with:
//! ```bash
//! cargo bench
//! cargo bench --bench resolver_benchmarks
//! cargo bench -- user_query  # Run specific benchmark
//! ```

use criterion::{black_box, criterion_group, criterion_main, BenchmarkId, Criterion};
use hr_graphql_server::testing::{TestContext, TestUserRole};
use std::sync::Arc;
use tokio::runtime::Runtime;

/// Benchmark: Simple user query resolution
fn bench_user_query(c: &mut Criterion) {
    let rt = Runtime::new().unwrap();

    let ctx = rt.block_on(async {
        TestContext::new()
            .await
            .expect("Failed to create test context")
    });

    let user = ctx.user(TestUserRole::Employee);

    let query = format!(
        r#"
        query {{
            user(id: "{}") {{
                id
                email
                firstName
                lastName
                role
            }}
        }}
        "#,
        user.id
    );

    c.bench_function("user_query", |b| {
        b.to_async(&rt).iter(|| async {
            let response = ctx.execute_query(black_box(&query)).await;
            black_box(response)
        });
    });
}

/// Benchmark: List users query with different page sizes
fn bench_users_list_query(c: &mut Criterion) {
    let rt = Runtime::new().unwrap();

    let ctx = rt.block_on(async {
        TestContext::new()
            .await
            .expect("Failed to create test context")
    });

    let mut group = c.benchmark_group("users_list_query");

    for limit in [10, 20, 50, 100].iter() {
        let query = format!(
            r#"
            query {{
                users(limit: {}, offset: 0) {{
                    id
                    email
                    firstName
                    lastName
                }}
            }}
            "#,
            limit
        );

        group.bench_with_input(
            BenchmarkId::from_parameter(format!("limit_{}", limit)),
            limit,
            |b, _| {
                b.to_async(&rt).iter(|| async {
                    let response = ctx.execute_query(black_box(&query)).await;
                    black_box(response)
                });
            },
        );
    }

    group.finish();
}

/// Benchmark: Nested query with relationships (user -> department -> manager)
fn bench_nested_query(c: &mut Criterion) {
    let rt = Runtime::new().unwrap();

    let ctx = rt.block_on(async {
        TestContext::new()
            .await
            .expect("Failed to create test context")
    });

    let user = ctx.user(TestUserRole::Employee);

    let query = format!(
        r#"
        query {{
            user(id: "{}") {{
                id
                email
                firstName
                lastName
                department {{
                    id
                    name
                    manager {{
                        id
                        email
                        firstName
                        lastName
                    }}
                }}
            }}
        }}
        "#,
        user.id
    );

    c.bench_function("nested_query", |b| {
        b.to_async(&rt).iter(|| async {
            let response = ctx.execute_query(black_box(&query)).await;
            black_box(response)
        });
    });
}

/// Benchmark: Mutation performance (user update)
fn bench_user_update_mutation(c: &mut Criterion) {
    let rt = Runtime::new().unwrap();

    let ctx = rt.block_on(async {
        TestContext::new()
            .await
            .expect("Failed to create test context")
    });

    let admin = ctx.user(TestUserRole::Admin);
    let user = ctx.user(TestUserRole::Employee);

    let query = format!(
        r#"
        mutation {{
            updateUser(
                id: "{}"
                input: {{
                    firstName: "Updated"
                    lastName: "Name"
                }}
            ) {{
                id
                firstName
                lastName
            }}
        }}
        "#,
        user.id
    );

    c.bench_function("user_update_mutation", |b| {
        b.to_async(&rt).iter(|| async {
            let response = ctx.execute_query_as(black_box(&query), admin).await;
            black_box(response)
        });
    });
}

/// Benchmark: Department list query
fn bench_departments_query(c: &mut Criterion) {
    let rt = Runtime::new().unwrap();

    let ctx = rt.block_on(async {
        TestContext::new()
            .await
            .expect("Failed to create test context")
    });

    let query = r#"
        query {
            departments {
                id
                name
                managerId
            }
        }
    "#;

    c.bench_function("departments_query", |b| {
        b.to_async(&rt).iter(|| async {
            let response = ctx.execute_query(black_box(&query)).await;
            black_box(response)
        });
    });
}

/// Benchmark: Authenticated vs unauthenticated query performance
fn bench_auth_overhead(c: &mut Criterion) {
    let rt = Runtime::new().unwrap();

    let ctx = rt.block_on(async {
        TestContext::new()
            .await
            .expect("Failed to create test context")
    });

    let user = ctx.user(TestUserRole::Employee);

    let query = r#"
        query {
            users(limit: 10) {
                id
                email
            }
        }
    "#;

    let mut group = c.benchmark_group("auth_overhead");

    group.bench_function("unauthenticated", |b| {
        b.to_async(&rt).iter(|| async {
            let response = ctx.execute_query(black_box(&query)).await;
            black_box(response)
        });
    });

    group.bench_function("authenticated", |b| {
        b.to_async(&rt).iter(|| async {
            let response = ctx.execute_query_as(black_box(&query), user).await;
            black_box(response)
        });
    });

    group.finish();
}

/// Benchmark: Query parsing and validation overhead
fn bench_query_complexity(c: &mut Criterion) {
    let rt = Runtime::new().unwrap();

    let ctx = rt.block_on(async {
        TestContext::new()
            .await
            .expect("Failed to create test context")
    });

    let mut group = c.benchmark_group("query_complexity");

    // Simple query
    let simple_query = r#"
        query {
            users(limit: 1) { id }
        }
    "#;

    group.bench_function("simple", |b| {
        b.to_async(&rt).iter(|| async {
            let response = ctx.execute_query(black_box(&simple_query)).await;
            black_box(response)
        });
    });

    // Complex query with multiple fields
    let complex_query = r#"
        query {
            users(limit: 10) {
                id
                email
                firstName
                lastName
                role
                isActive
                createdAt
                updatedAt
            }
        }
    "#;

    group.bench_function("complex", |b| {
        b.to_async(&rt).iter(|| async {
            let response = ctx.execute_query(black_box(&complex_query)).await;
            black_box(response)
        });
    });

    group.finish();
}

/// Benchmark: Concurrent query execution
fn bench_concurrent_queries(c: &mut Criterion) {
    let rt = Runtime::new().unwrap();

    let ctx = Arc::new(rt.block_on(async {
        TestContext::new()
            .await
            .expect("Failed to create test context")
    }));

    let query = r#"
        query {
            users(limit: 5) {
                id
                email
            }
        }
    "#;

    let mut group = c.benchmark_group("concurrent_queries");

    for concurrency in [1, 5, 10, 20].iter() {
        let ctx = Arc::clone(&ctx);

        group.bench_with_input(
            BenchmarkId::from_parameter(format!("concurrent_{}", concurrency)),
            concurrency,
            |b, &count| {
                b.to_async(&rt).iter(|| {
                    let ctx = Arc::clone(&ctx);
                    async move {
                        let mut handles = Vec::new();

                        for _ in 0..count {
                            let ctx = Arc::clone(&ctx);
                            let q = query;
                            handles.push(tokio::spawn(async move {
                                ctx.execute_query(black_box(q)).await
                            }));
                        }

                        for handle in handles {
                            black_box(handle.await.unwrap());
                        }
                    }
                });
            },
        );
    }

    group.finish();
}

// Benchmark groups
criterion_group! {
    name = benches;
    config = Criterion::default()
        .sample_size(100)
        .measurement_time(std::time::Duration::from_secs(10));
    targets =
        bench_user_query,
        bench_users_list_query,
        bench_nested_query,
        bench_user_update_mutation,
        bench_departments_query,
        bench_auth_overhead,
        bench_query_complexity,
        bench_concurrent_queries
}

criterion_main!(benches);
