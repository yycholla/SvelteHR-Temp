# PostgreSQL Operator - CloudNativePG

## Overview

CloudNativePG is a Kubernetes operator that provides PostgreSQL databases with high availability, backup/restore, and monitoring capabilities.

## Features

- Automated backups with retention policies
- High availability with synchronous replication
- Monitoring with Prometheus metrics
- Rolling updates with zero downtime
- Point-in-time recovery
- Connection pooling with PgBouncer

## Installation

```bash
kubectl apply -f https://raw.githubusercontent.com/cloudnative-pg/cloudnative-pg/release-1.22/releases/cnpg-1.22.1.yaml
```

## Usage

- Creates `Cluster` custom resources for PostgreSQL clusters
- Automatic failover and recovery
- Integrated with cert-manager for TLS
- Supports both synchronous and asynchronous replication

## Configuration

- Cluster size: 1 node (dev) / 3 nodes (prod)
- Backup: Scheduled with 7-day retention
- Monitoring: Enabled with Prometheus ServiceMonitor
