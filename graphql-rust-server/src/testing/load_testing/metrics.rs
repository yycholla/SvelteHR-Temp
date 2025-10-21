//! Load Testing Metrics
//!
//! Tracks requests, latency histograms, and errors during load testing.
//! Uses hdrhistogram for accurate latency percentile calculations.

use std::sync::{Arc, Mutex};
use std::time::{Duration, Instant};
use hdrhistogram::Histogram;

/// Summary of load test results
#[derive(Debug, Clone)]
pub struct LoadTestSummary {
    /// Total requests attempted
    pub total_requests: u64,

    /// Successful requests
    pub successful_requests: u64,

    /// Failed requests
    pub failed_requests: u64,

    /// Success rate (0.0 - 1.0)
    pub success_rate: f64,

    /// Requests per second (throughput)
    pub throughput: f64,

    /// P50 latency in milliseconds
    pub p50_latency_ms: f64,

    /// P95 latency in milliseconds
    pub p95_latency_ms: f64,

    /// P99 latency in milliseconds
    pub p99_latency_ms: f64,

    /// Minimum latency in milliseconds
    pub min_latency_ms: f64,

    /// Maximum latency in milliseconds
    pub max_latency_ms: f64,

    /// Mean latency in milliseconds
    pub mean_latency_ms: f64,

    /// Test duration
    pub duration: Duration,

    /// Error messages (limited to first 10)
    pub errors: Vec<String>,
}

impl LoadTestSummary {
    /// Format summary as a readable string
    pub fn format(&self) -> String {
        format!(
            r#"
Load Test Summary
=================
Total Requests:     {}
Successful:         {} ({:.2}%)
Failed:             {} ({:.2}%)
Success Rate:       {:.2}%
Throughput:         {:.2} req/s
Duration:           {:.2}s

Latency (ms)
------------
Min:                {:.2}
P50 (median):       {:.2}
P95:                {:.2}
P99:                {:.2}
Max:                {:.2}
Mean:               {:.2}

Errors:             {}
"#,
            self.total_requests,
            self.successful_requests,
            self.success_rate * 100.0,
            self.failed_requests,
            (1.0 - self.success_rate) * 100.0,
            self.success_rate * 100.0,
            self.throughput,
            self.duration.as_secs_f64(),
            self.min_latency_ms,
            self.p50_latency_ms,
            self.p95_latency_ms,
            self.p99_latency_ms,
            self.max_latency_ms,
            self.mean_latency_ms,
            if self.errors.is_empty() {
                "None".to_string()
            } else {
                format!("{} (showing first 10)", self.failed_requests)
            }
        )
    }

    /// Print summary to stdout
    pub fn print(&self) {
        println!("{}", self.format());

        if !self.errors.is_empty() {
            println!("Error Samples:");
            for (i, error) in self.errors.iter().take(10).enumerate() {
                println!("  {}. {}", i + 1, error);
            }
            if self.errors.len() > 10 {
                println!("  ... and {} more", self.errors.len() - 10);
            }
        }
    }
}

/// Metrics collector for load testing
#[derive(Clone)]
pub struct LoadTestMetrics {
    /// Inner metrics protected by mutex for thread-safe access
    inner: Arc<Mutex<MetricsInner>>,

    /// Start time of the load test
    start_time: Instant,
}

struct MetricsInner {
    /// Total requests attempted
    total_requests: u64,

    /// Successful requests
    successful_requests: u64,

    /// Failed requests
    failed_requests: u64,

    /// Latency histogram (tracks microseconds)
    /// Configured to track from 1μs to 60s with 3 significant digits
    latency_histogram: Histogram<u64>,

    /// Error messages (limited to first 100)
    errors: Vec<String>,
}

impl LoadTestMetrics {
    /// Create a new metrics collector
    pub fn new() -> Self {
        // Configure histogram to track from 1μs to 60 seconds
        // with 3 significant digits of precision
        let histogram = Histogram::<u64>::new_with_bounds(1, 60_000_000, 3)
            .expect("Failed to create histogram");

        Self {
            inner: Arc::new(Mutex::new(MetricsInner {
                total_requests: 0,
                successful_requests: 0,
                failed_requests: 0,
                latency_histogram: histogram,
                errors: Vec::new(),
            })),
            start_time: Instant::now(),
        }
    }

    /// Record a successful request
    ///
    /// # Arguments
    /// * `latency` - Request latency
    pub fn record_success(&self, latency: Duration) {
        let mut inner = self.inner.lock().unwrap();
        inner.total_requests += 1;
        inner.successful_requests += 1;

        // Convert to microseconds for histogram
        let latency_us = latency.as_micros() as u64;

        // Record in histogram (saturating to max value if exceeds bounds)
        inner
            .latency_histogram
            .record(latency_us.min(60_000_000))
            .ok(); // Ignore errors if value exceeds bounds
    }

    /// Record a failed request
    ///
    /// # Arguments
    /// * `error` - Error message
    pub fn record_failure(&self, error: impl Into<String>) {
        let mut inner = self.inner.lock().unwrap();
        inner.total_requests += 1;
        inner.failed_requests += 1;

        // Store error message (limit to first 100)
        if inner.errors.len() < 100 {
            inner.errors.push(error.into());
        }
    }

    /// Get P50 (median) latency in milliseconds
    pub fn p50_latency(&self) -> f64 {
        let inner = self.inner.lock().unwrap();
        inner.latency_histogram.value_at_quantile(0.50) as f64 / 1000.0
    }

    /// Get P95 latency in milliseconds
    pub fn p95_latency(&self) -> f64 {
        let inner = self.inner.lock().unwrap();
        inner.latency_histogram.value_at_quantile(0.95) as f64 / 1000.0
    }

    /// Get P99 latency in milliseconds
    pub fn p99_latency(&self) -> f64 {
        let inner = self.inner.lock().unwrap();
        inner.latency_histogram.value_at_quantile(0.99) as f64 / 1000.0
    }

    /// Get minimum latency in milliseconds
    pub fn min_latency(&self) -> f64 {
        let inner = self.inner.lock().unwrap();
        inner.latency_histogram.min() as f64 / 1000.0
    }

    /// Get maximum latency in milliseconds
    pub fn max_latency(&self) -> f64 {
        let inner = self.inner.lock().unwrap();
        inner.latency_histogram.max() as f64 / 1000.0
    }

    /// Get mean latency in milliseconds
    pub fn mean_latency(&self) -> f64 {
        let inner = self.inner.lock().unwrap();
        inner.latency_histogram.mean() / 1000.0
    }

    /// Get throughput in requests per second
    pub fn throughput(&self) -> f64 {
        let inner = self.inner.lock().unwrap();
        let elapsed = self.start_time.elapsed().as_secs_f64();
        if elapsed > 0.0 {
            inner.total_requests as f64 / elapsed
        } else {
            0.0
        }
    }

    /// Get success rate (0.0 - 1.0)
    pub fn success_rate(&self) -> f64 {
        let inner = self.inner.lock().unwrap();
        if inner.total_requests > 0 {
            inner.successful_requests as f64 / inner.total_requests as f64
        } else {
            0.0
        }
    }

    /// Get total requests
    pub fn total_requests(&self) -> u64 {
        self.inner.lock().unwrap().total_requests
    }

    /// Get successful requests
    pub fn successful_requests(&self) -> u64 {
        self.inner.lock().unwrap().successful_requests
    }

    /// Get failed requests
    pub fn failed_requests(&self) -> u64 {
        self.inner.lock().unwrap().failed_requests
    }

    /// Generate a summary of the load test results
    pub fn summary(&self) -> LoadTestSummary {
        let inner = self.inner.lock().unwrap();

        LoadTestSummary {
            total_requests: inner.total_requests,
            successful_requests: inner.successful_requests,
            failed_requests: inner.failed_requests,
            success_rate: if inner.total_requests > 0 {
                inner.successful_requests as f64 / inner.total_requests as f64
            } else {
                0.0
            },
            throughput: self.throughput(),
            p50_latency_ms: self.p50_latency(),
            p95_latency_ms: self.p95_latency(),
            p99_latency_ms: self.p99_latency(),
            min_latency_ms: self.min_latency(),
            max_latency_ms: self.max_latency(),
            mean_latency_ms: self.mean_latency(),
            duration: self.start_time.elapsed(),
            errors: inner.errors.clone(),
        }
    }

    /// Print a summary report to stdout
    pub fn print_summary(&self) {
        self.summary().print();
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_metrics_record_success() {
        let metrics = LoadTestMetrics::new();

        metrics.record_success(Duration::from_millis(100));
        metrics.record_success(Duration::from_millis(200));
        metrics.record_success(Duration::from_millis(150));

        assert_eq!(metrics.total_requests(), 3);
        assert_eq!(metrics.successful_requests(), 3);
        assert_eq!(metrics.failed_requests(), 0);
        assert_eq!(metrics.success_rate(), 1.0);
    }

    #[test]
    fn test_metrics_record_failure() {
        let metrics = LoadTestMetrics::new();

        metrics.record_success(Duration::from_millis(100));
        metrics.record_failure("Connection timeout");
        metrics.record_failure("Server error");

        assert_eq!(metrics.total_requests(), 3);
        assert_eq!(metrics.successful_requests(), 1);
        assert_eq!(metrics.failed_requests(), 2);
        assert!((metrics.success_rate() - 0.333).abs() < 0.01);
    }

    #[test]
    fn test_metrics_latency_percentiles() {
        let metrics = LoadTestMetrics::new();

        // Record latencies: 10ms, 20ms, 30ms, ..., 100ms
        for i in 1..=10 {
            metrics.record_success(Duration::from_millis(i * 10));
        }

        // P50 should be around 50ms
        assert!((metrics.p50_latency() - 50.0).abs() < 10.0);

        // P95 should be around 95ms
        assert!((metrics.p95_latency() - 95.0).abs() < 10.0);
    }

    #[test]
    fn test_metrics_summary() {
        let metrics = LoadTestMetrics::new();

        metrics.record_success(Duration::from_millis(100));
        metrics.record_success(Duration::from_millis(200));
        metrics.record_failure("Error 1");

        let summary = metrics.summary();

        assert_eq!(summary.total_requests, 3);
        assert_eq!(summary.successful_requests, 2);
        assert_eq!(summary.failed_requests, 1);
        assert!((summary.success_rate - 0.666).abs() < 0.01);
        assert_eq!(summary.errors.len(), 1);
    }
}
