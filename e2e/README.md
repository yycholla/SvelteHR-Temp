# E2E Testing with Playwright

This directory contains comprehensive end-to-end tests for the SvelteHR application using Playwright.

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- SvelteHR application running on `http://localhost:5173`
- Go backend running on `http://localhost:8080` (optional, some tests will gracefully handle API failures)

### Install Dependencies
```bash
npm install
npx playwright install
```

### Run Tests
```bash
# Run all tests
npm run test:e2e

# Run tests with UI (interactive)
npm run test:e2e:ui

# Run tests in headed mode (see browser)
npm run test:e2e:headed

# Debug tests
npm run test:e2e:debug

# Run specific test suites
npm run test:auth          # Authentication tests
npm run test:dashboard     # Dashboard functionality
npm run test:streaming     # Streaming features
npm run test:employees     # Employee management
npm run test:performance   # Performance benchmarks
```

## 📁 Test Structure

### Test Files
- `auth.test.ts` - Authentication flow testing
- `dashboard.test.ts` - Dashboard functionality and navigation
- `streaming.test.ts` - Streaming data functionality
- `employees.test.ts` - Employee management features
- `performance.test.ts` - Performance benchmarks and optimization

### Utilities
- `utils/test-helpers.ts` - Common testing utilities and helper functions
- `global.setup.ts` - Global test setup and environment checks

## 🔧 Test Configuration

### Browsers Tested
- **Desktop**: Chrome, Firefox, Safari
- **Mobile**: Chrome (Pixel 5), Safari (iPhone 12)

### Test Credentials
- **Username**: `admin`
- **Password**: `admin`

## 📊 Test Categories

### 1. Authentication Tests (`auth.test.ts`)
- ✅ Login/logout functionality
- ✅ Protected route redirects  
- ✅ Session persistence
- ✅ Invalid credential handling

### 2. Dashboard Tests (`dashboard.test.ts`)
- ✅ Dashboard loading and rendering
- ✅ Static vs Streaming mode toggle
- ✅ Dashboard cards and metrics
- ✅ Navigation to other sections
- ✅ Error handling
- ✅ Responsive design

### 3. Streaming Tests (`streaming.test.ts`)
- ✅ Progressive data loading
- ✅ Progress bar functionality
- ✅ Real-time data updates
- ✅ Error recovery
- ✅ Mode switching
- ✅ Mobile responsiveness

### 4. Employee Management (`employees.test.ts`)
- ✅ Employee list loading
- ✅ Search and filtering
- ✅ Data table functionality
- ✅ Navigation and CRUD operations
- ✅ Export functionality
- ✅ Pagination handling

### 5. Performance Tests (`performance.test.ts`)
- ⏱️ Page load times
- 📊 Core Web Vitals (LCP, CLS)
- 🌐 Network performance
- 💾 Memory usage monitoring
- 👥 Concurrent user simulation
- 📱 Mobile performance

## 🎯 Key Features Tested

### Streaming Functionality
- **Progressive Loading**: Data appears incrementally as it loads
- **Progress Indicators**: Visual feedback during loading
- **Error Handling**: Graceful degradation when APIs fail
- **Mode Switching**: Toggle between static and streaming modes

### User Experience
- **Authentication Flow**: Complete login/logout cycle
- **Navigation**: Between different app sections
- **Responsiveness**: Mobile and tablet compatibility
- **Accessibility**: ARIA labels, keyboard navigation
- **Performance**: Load times and Core Web Vitals

### Data Management
- **CRUD Operations**: Create, read, update, delete functionality
- **Search/Filter**: Real-time filtering and search
- **Export**: Data export functionality
- **Pagination**: Large dataset handling

## 🔍 Test Helpers

The `TestHelpers` class provides reusable testing utilities:

```typescript
// Login as admin user
await helpers.loginAsAdmin();

// Wait for streaming to complete
await helpers.waitForStreamingComplete();

// Check for API errors
await helpers.checkForApiErrors();

// Test responsive design
await helpers.testResponsiveDesign();

// Check accessibility
await helpers.checkAccessibility();

// Take screenshot
await helpers.takeScreenshot('test-state');
```

## 📈 Performance Benchmarks

### Expected Performance Targets
- **Login**: < 10 seconds
- **Dashboard Load**: < 8 seconds  
- **Page Navigation**: < 3 seconds
- **Streaming Complete**: < 15 seconds
- **LCP (Largest Contentful Paint)**: < 2.5 seconds
- **CLS (Cumulative Layout Shift)**: < 0.1
- **Memory Usage**: < 100MB

## 🚨 Error Handling

Tests are designed to handle various failure scenarios:
- **API Failures**: Graceful degradation when backend is unavailable
- **Network Issues**: Slow network simulation
- **Authentication Errors**: Invalid credential handling
- **UI Errors**: Missing elements or unexpected states

## 📱 Mobile Testing

Comprehensive mobile testing includes:
- **Touch Interactions**: Tap, swipe, scroll
- **Viewport Adaptation**: Different screen sizes
- **Performance**: Mobile-specific performance metrics
- **Accessibility**: Touch targets and mobile accessibility

## 🔧 Debugging

### Debug a Specific Test
```bash
npx playwright test auth.test.ts --debug
```

### Run with Browser Visible
```bash
npx playwright test --headed
```

### View Test Report
```bash
npm run test:e2e:report
```

### Screenshots and Videos
- **Screenshots**: Taken on test failure and stored in `e2e/screenshots/`
- **Videos**: Recorded for failed tests
- **Traces**: Available for debugging in Playwright UI

## 🔄 CI/CD Integration

Tests run automatically on:
- **Push** to main/develop branches
- **Pull Requests** to main/develop branches
- **Scheduled** runs (can be configured)

### GitHub Actions Workflow
- Runs all test suites
- Uploads test reports and screenshots
- Separate performance testing job
- Automatic artifact retention

## 📋 Writing New Tests

### Test Structure
```typescript
import { test, expect } from '@playwright/test';
import { TestHelpers } from './utils/test-helpers';

test.describe('Feature Name', () => {
  let helpers: TestHelpers;

  test.beforeEach(async ({ page }) => {
    helpers = new TestHelpers(page);
    await helpers.loginAsAdmin(); // If auth required
  });

  test('should do something', async ({ page }) => {
    // Test implementation
    await page.goto('/feature');
    await expect(page.locator('h1')).toBeVisible();
  });
});
```

### Best Practices
1. **Use Page Object Model**: Keep selectors and logic in helper functions
2. **Wait for Elements**: Use `waitFor` methods instead of `setTimeout`
3. **Error Handling**: Test both success and failure scenarios  
4. **Screenshots**: Take screenshots for debugging and visual regression
5. **Cleanup**: Ensure tests don't interfere with each other

## 🎯 Test Coverage

Current test coverage includes:
- ✅ **Authentication**: Login, logout, session management
- ✅ **Dashboard**: Static and streaming modes, navigation
- ✅ **Employee Management**: CRUD operations, search, filter
- ✅ **Streaming**: Progressive loading, error handling
- ✅ **Performance**: Load times, memory usage, Core Web Vitals
- ✅ **Responsive**: Mobile and tablet compatibility
- ✅ **Accessibility**: ARIA compliance, keyboard navigation

## 🚀 Future Enhancements

- **Visual Regression Testing**: Screenshot comparison
- **API Contract Testing**: Backend API validation
- **Load Testing**: High-concurrency user simulation
- **Cross-browser Cloud Testing**: BrowserStack/Sauce Labs integration
- **Accessibility Automation**: axe-core integration
- **Performance Monitoring**: Real-time performance tracking