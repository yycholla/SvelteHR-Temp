# Redis Operator - Spotahome Redis Operator

## Overview

Redis Operator by Spotahome provides Redis clusters with automated failover, scaling, and persistence.

## Features

- Redis cluster formation and management
- Automatic failover with Redis Sentinel
- Dynamic scaling of cluster nodes
- Configurable persistence (RDB/AOF)
- Monitoring and metrics
- Backup and restore capabilities

## Installation

```bash
kubectl apply -f https://raw.githubusercontent.com/spotahome/redis-operator/master/example/operator/all-redis-operator-resources.yaml
```

## Usage

- Creates `RedisCluster` custom resources
- Automatic cluster reconfiguration during scaling
- Integrated health checks and recovery
- Supports Redis 6+ clustering

## Configuration

- Cluster size: 1 node (dev) / 3 nodes (prod)
- Persistence: AOF with fsync every second
- Monitoring: Redis exporter for Prometheus
