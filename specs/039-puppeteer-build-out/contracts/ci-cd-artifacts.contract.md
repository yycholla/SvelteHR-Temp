# CI/CD Artifacts Contract

**Feature**: 039-puppeteer-build-out
**Date**: 2025-10-27
**Status**: Template - Requires Implementation

## Artifact Types

### 1. Test Screenshots

**Purpose**: Capture visual evidence of test execution and failures

**Naming Convention**:
```
screenshots/{test-file}/{test-name}-{status}-{timestamp}.png
```

**Examples**:
- `screenshots/dashboard-data/dashboard-displays-real-attendance-rate-passed-2025-10-27-14-32-15.png`
- `screenshots/form-interactions/form-submission-works-failed-2025-10-27-14-33-42.png`

**Capture Conditions**:
- On test failure (automatic)
- On explicit `takeScreenshot()` call in test
- Full page screenshot (not viewport only)

**Retention**: 7-30 days in CI/CD platform

---

### 2. Test Videos

**Purpose**: Record full test execution for debugging complex failures

**Naming Convention**:
```
videos/{test-file}.mp4
```

**Examples**:
- `videos/dashboard-data.puppeteer.test.mp4`
- `videos/form-interactions.puppeteer.test.mp4`

**Capture Conditions**:
- Only on test failure (to save storage)
- Optional: All tests if enabled via environment variable

**Retention**: 7-30 days in CI/CD platform

---

### 3. Console Logs

**Purpose**: Capture browser console output for debugging JavaScript errors

**Naming Convention**:
```
logs/{test-file}/{test-name}-console.log
```

**Examples**:
- `logs/dashboard-data/dashboard-displays-real-attendance-rate-console.log`

**Capture Format**:
```
[14:32:15.123] [LOG] Dashboard component mounted
[14:32:15.456] [ERROR] Failed to fetch GraphQL query: Network error
[14:32:15.789] [WARN] Missing data-testid attribute on button
```

**Retention**: 7-30 days in CI/CD platform

---

### 4. GraphQL Request/Response Logs

**Purpose**: Capture GraphQL network activity for debugging API issues

**Naming Convention**:
```
logs/{test-file}/{test-name}-graphql.json
```

**Capture Format**:
```json
{
  "requests": [
    {
      "timestamp": "2025-10-27T14:32:15.123Z",
      "operation": "GetUsers",
      "variables": { "limit": 20 },
      "response": {
        "data": { "users": [...] },
        "errors": null
      },
      "duration": 125
    }
  ]
}
```

**Retention**: 7-30 days in CI/CD platform

---

### 5. HTML Test Reports

**Purpose**: Provide human-readable test execution summary with pass/fail status

**Naming Convention**:
```
reports/puppeteer-test-report-{timestamp}.html
```

**Example**:
- `reports/puppeteer-test-report-2025-10-27-14-35-00.html`

**Report Contents**:
- Test execution summary (total, passed, failed, skipped)
- Execution time per test file
- Failure details with stack traces
- Links to screenshots and videos
- GraphQL request/response logs

**Retention**: 30 days in CI/CD platform

---

## Artifact Upload Configuration

### GitHub Actions Example

```yaml
- name: Upload test artifacts
  if: failure()  # Only upload on failure to save storage
  uses: actions/upload-artifact@v4
  with:
    name: puppeteer-test-results-${{ github.run_id }}
    path: |
      ./test-results/screenshots/
      ./test-results/videos/
      ./test-results/logs/
      ./test-results/reports/
    retention-days: 30  # Configurable: 7-30 days
```

### Artifact Organization

```
test-results/
├── screenshots/
│   ├── dashboard-data/
│   │   ├── test-1-passed-2025-10-27.png
│   │   └── test-2-failed-2025-10-27.png
│   └── form-interactions/
│       └── test-3-failed-2025-10-27.png
├── videos/
│   ├── dashboard-data.puppeteer.test.mp4
│   └── form-interactions.puppeteer.test.mp4
├── logs/
│   ├── dashboard-data/
│   │   ├── test-1-console.log
│   │   └── test-1-graphql.json
│   └── form-interactions/
│       ├── test-3-console.log
│       └── test-3-graphql.json
└── reports/
    └── puppeteer-test-report-2025-10-27-14-35-00.html
```

---

## Artifact Access

### Via CI/CD Platform

1. Navigate to workflow run
2. Scroll to "Artifacts" section
3. Click artifact name to download ZIP
4. Extract and view files locally

### Via API (GitHub Actions)

```bash
# List artifacts
gh api repos/Mountain-Care-Rx/SvelteHR/actions/runs/{run_id}/artifacts

# Download artifact
gh api repos/Mountain-Care-Rx/SvelteHR/actions/artifacts/{artifact_id}/zip > artifacts.zip
```

---

## Artifact Retention Policy

| Artifact Type | Default Retention | Configurable Range | Storage Impact |
|---------------|-------------------|-------------------|----------------|
| Screenshots | 30 days | 7-90 days | Low (1-5 MB per test run) |
| Videos | 30 days | 7-90 days | High (50-200 MB per test run) |
| Console Logs | 30 days | 7-90 days | Low (< 1 MB per test run) |
| GraphQL Logs | 30 days | 7-90 days | Low (< 1 MB per test run) |
| HTML Reports | 30 days | 7-90 days | Low (< 1 MB per test run) |

**Recommendation**: Use 30-day retention for debugging recent failures, with automatic cleanup to manage storage costs.

---

## Notification Integration

### Slack Notification (Optional)

When tests fail with artifacts:

```
🚨 Puppeteer E2E Tests Failed on PR #123

Branch: feature/039-puppeteer-build-out
Commit: abc123def456
Failed Tests: 3 / 87

Test Artifacts: https://github.com/Mountain-Care-Rx/SvelteHR/actions/runs/12345678/artifacts

Failed Tests:
- Dashboard displays real attendance rate metric
- Form submission prevents double submission
- Event RSVP persists after page reload

View Details: https://github.com/Mountain-Care-Rx/SvelteHR/actions/runs/12345678
```

---

## Implementation Checklist

- [ ] Configure screenshot capture on test failure
- [ ] Implement video recording for failed tests
- [ ] Add console log capture to test setup
- [ ] Implement GraphQL request/response logging
- [ ] Create HTML report generation script
- [ ] Configure CI/CD artifact upload with 30-day retention
- [ ] Set up notification integration (optional)
- [ ] Test artifact download and viewing workflow
- [ ] Document artifact access process in README
- [ ] Verify storage usage and adjust retention if needed
