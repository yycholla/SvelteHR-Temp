# GitHub Actions Workflows

This directory contains CI/CD workflows for automated testing, benchmarking, and quality assurance.

## Workflows

### `ci.yml` - Continuous Integration

**Triggers**: Push to main/develop, Pull Requests

**Jobs**:

- **test**: Unit and integration tests with PostgreSQL service
  - Formatting check (`cargo fmt`)
  - Linting (`cargo clippy`)
  - Unit tests (`cargo test --lib`)
  - Integration tests (`cargo test --test integration_tests`)
  - Cargo build cache for faster runs

- **docker-tests**: Integration tests with testcontainers
  - Full database isolation tests
  - Single-threaded execution for consistency

- **security-audit**: Security vulnerability scanning
  - `cargo audit` for known vulnerabilities
  - Fails on high-severity issues

- **coverage**: Code coverage reporting
  - Generates coverage reports with `cargo-tarpaulin`
  - Uploads to Codecov (requires `CODECOV_TOKEN` secret)

**Cache Strategy**:

- Cargo registry: `~/.cargo/registry`
- Cargo git: `~/.cargo/git`
- Build artifacts: `target/`

**Duration**: ~10-15 minutes

---

### `benchmark.yml` - Performance Benchmarking

**Triggers**: Push to main, Pull Requests, Manual dispatch

**Jobs**:

- **benchmark**: Run Criterion benchmarks
  - Executes all resolver benchmarks
  - Stores results for historical tracking
  - Alerts on >150% performance regression
  - Uploads HTML reports as artifacts (30 day retention)

- **benchmark-comparison** (PR only): Compare PR vs main
  - Runs benchmarks on both PR and main branch
  - Posts comparison comment on PR
  - Helps identify performance regressions before merge

**Benchmark Tracking**:

- Uses `benchmark-action/github-action-benchmark` for trend analysis
- Auto-pushes results to `gh-pages` branch (requires setup)
- Alerts via commit comments on regression

**Duration**: ~15-20 minutes

---

### `nightly.yml` - Nightly Comprehensive Tests

**Triggers**: Daily at 2 AM UTC, Manual dispatch

**Jobs**:

- **comprehensive-tests**: Full test suite
  - All unit tests with all features
  - All integration tests
  - Basic load tests (with timeout)
  - Full benchmark suite
  - Dependency update check

- **security-full-audit**: Enhanced security scanning
  - `cargo audit` for vulnerabilities
  - `cargo deny` for policy violations
  - License compliance check

- **rustdoc-check**: Documentation verification
  - Builds all documentation
  - Treats warnings as errors
  - Uploads docs as artifacts (7 day retention)

- **notify-on-failure**: Automated issue creation
  - Creates GitHub issue on failure
  - Avoids duplicate issues
  - Labels: `nightly-failure`, `automated`

**Duration**: ~60 minutes (max timeout)

---

## Setup Requirements

### Secrets

Configure these in GitHub repository settings:

- `CODECOV_TOKEN` (optional): For code coverage uploads
- `GITHUB_TOKEN`: Automatically provided by GitHub Actions

### Branch Protection

Recommended branch protection rules for `main`:

- Require status checks to pass:
  - `Test Suite`
  - `Security Audit`
  - `Performance Benchmarks` (optional)
- Require branches to be up to date before merging
- Require pull request reviews

### Benchmark Tracking Setup

To enable benchmark result tracking:

1. Enable GitHub Pages in repository settings
2. Set source to `gh-pages` branch
3. Benchmark action will auto-create and update the branch

## Workflow Commands

### Manual Triggering

```bash
# Trigger nightly tests manually
gh workflow run nightly.yml

# Trigger benchmarks manually
gh workflow run benchmark.yml
```

### Viewing Results

```bash
# List workflow runs
gh run list

# View specific run
gh run view <run-id>

# Download artifacts
gh run download <run-id>
```

## Caching Strategy

All workflows use GitHub Actions cache to speed up builds:

- **Cache Key**: `${{ runner.os }}-cargo-<workflow>-${{ hashFiles('**/Cargo.lock') }}`
- **Restore Keys**: Fallback to previous Cargo.lock hashes
- **Invalidation**: Automatic when dependencies change

## Performance

**Typical CI Run Times**:

- PR CI check: ~10 minutes (cached)
- Full nightly: ~45 minutes
- Benchmark comparison: ~15 minutes

**Cache Hit Rates**:

- Cold start (no cache): ~8-10 minutes compile time
- Warm cache: ~2-3 minutes compile time
- Cache invalidation: Only on `Cargo.lock` changes

## Debugging Workflows

### Enable Debug Logging

Add to workflow environment:

```yaml
env:
  RUST_LOG: debug
  RUST_BACKTRACE: 1
```

### Run Locally with act

```bash
# Install act
brew install act  # macOS
# or: curl https://raw.githubusercontent.com/nektos/act/master/install.sh | sudo bash

# Run CI workflow locally
act pull_request

# Run specific job
act -j test

# Use specific runner image
act -P ubuntu-latest=ghcr.io/catthehacker/ubuntu:rust-latest
```

## Maintenance

### Updating Workflow Actions

Check for action updates quarterly:

- `actions/checkout@v4` → [latest](https://github.com/actions/checkout/releases)
- `actions/cache@v4` → [latest](https://github.com/actions/cache/releases)
- `dtolnay/rust-toolchain@stable` → [latest](https://github.com/dtolnay/rust-toolchain)

### Monitoring

- Review nightly test results weekly
- Check benchmark trends for regressions
- Monitor security audit failures

## Troubleshooting

### Common Issues

**Issue**: Tests timeout

- **Solution**: Increase timeout in workflow or reduce test scope

**Issue**: Cache misses

- **Solution**: Check if `Cargo.lock` is committed, review cache keys

**Issue**: PostgreSQL connection failures

- **Solution**: Verify service health checks, ensure ports are correct

**Issue**: Benchmark comparison fails

- **Solution**: Ensure both branches compile, check for breaking changes

## Related Documentation

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Cargo Book](https://doc.rust-lang.org/cargo/)
- [Criterion.rs Guide](https://bheisler.github.io/criterion.rs/book/)
