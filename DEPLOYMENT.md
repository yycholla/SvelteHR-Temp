# MountainHR Frontend - Production Deployment Guide

This guide provides comprehensive instructions for deploying the MountainHR Frontend to production environments.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Environment Setup](#environment-setup)
- [Deployment Methods](#deployment-methods)
- [Monitoring & Observability](#monitoring--observability)
- [Scaling](#scaling)
- [Security](#security)
- [Troubleshooting](#troubleshooting)
- [Rollback Procedures](#rollback-procedures)

## Prerequisites

### System Requirements

- **Operating System**: Ubuntu 20.04+ / CentOS 8+ / Docker-compatible Linux
- **CPU**: Minimum 2 cores, Recommended 4+ cores
- **Memory**: Minimum 4GB RAM, Recommended 8GB+ RAM
- **Storage**: Minimum 20GB, Recommended 50GB+ SSD
- **Network**: Stable internet connection with ports 80, 443, 3000, 6379, 9090 available

### Required Software

1. **Docker & Docker Compose**
   ```bash
   # Install Docker
   curl -fsSL https://get.docker.com -o get-docker.sh
   sudo sh get-docker.sh
   
   # Install Docker Compose
   sudo curl -L "https://github.com/docker/compose/releases/download/v2.20.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
   sudo chmod +x /usr/local/bin/docker-compose
   ```

2. **Doppler CLI (Recommended for secrets management)**
   ```bash
   curl -Ls --tlsv1.2 --proto "=https" --retry 3 https://cli.doppler.com/install.sh | sudo sh
   ```

3. **Node.js 20+ (for local development)**
   ```bash
   curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
   sudo apt-get install -y nodejs
   ```

### Domain & SSL Setup

1. **Domain Configuration**
   - Point your domain to the server IP
   - Configure DNS A records for your domain
   - Set up CNAME records for subdomains if needed

2. **SSL Certificate**
   ```bash
   # Using Let's Encrypt with Certbot
   sudo apt install certbot python3-certbot-nginx
   sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com
   ```

## Environment Setup

### 1. Clone Repository

```bash
git clone https://github.com/your-org/mountainhr-frontend.git
cd mountainhr-frontend
```

### 2. Environment Configuration

#### Option A: Using Doppler (Recommended)

```bash
# Login to Doppler
doppler login

# Setup project
doppler setup --project mountainhr-frontend --config prd

# Set Doppler token for Docker
export DOPPLER_TOKEN="your_doppler_token_here"
```

#### Option B: Using Environment Files

```bash
# Copy production environment template
cp .env.production .env

# Edit environment variables
nano .env
```

**Required Environment Variables:**

```bash
# API Configuration
PUBLIC_API_URL=https://api.yourdomain.com/api/v2
PUBLIC_GRAPHQL_ENDPOINT=https://api.yourdomain.com/graphql

# Database
DATABASE_URL=postgresql://user:password@db.yourdomain.com:5432/mountainhr_prod

# Security
SESSION_SECRET=your-super-secure-session-secret
JWT_SECRET=your-jwt-secret
REDIS_PASSWORD=your-redis-password

# Monitoring
GRAFANA_PASSWORD=your-grafana-password
SENTRY_DSN=https://your-sentry-dsn

# Notifications (Optional)
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/your/webhook/url
DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/your/webhook/url
```

### 3. SSL Certificate Setup

Create SSL certificate directory and add certificates:

```bash
mkdir -p nginx/ssl
# Copy your SSL certificates
cp /path/to/your/cert.pem nginx/ssl/
cp /path/to/your/key.pem nginx/ssl/
```

## Deployment Methods

### Method 1: Automated Script Deployment (Recommended)

The automated script handles the complete deployment process including health checks, backups, and rollback capabilities.

```bash
# Make script executable
chmod +x scripts/deploy-production.sh

# Deploy with latest version
./scripts/deploy-production.sh

# Deploy specific version
./scripts/deploy-production.sh v1.2.3

# Check deployment status
./scripts/deploy-production.sh health
```

### Method 2: Manual Docker Compose Deployment

```bash
# Build and start services
docker-compose -f docker-compose.prod.yml up -d --build

# Check service status
docker-compose -f docker-compose.prod.yml ps

# View logs
docker-compose -f docker-compose.prod.yml logs -f
```

### Method 3: Kubernetes Deployment

For Kubernetes deployments, see [kubernetes/](./kubernetes/) directory for manifests.

```bash
# Apply Kubernetes manifests
kubectl apply -f kubernetes/

# Check deployment status
kubectl get deployments
kubectl get services
kubectl get ingress
```

## Post-Deployment Verification

### 1. Health Checks

```bash
# Frontend health
curl -f http://localhost/health

# Prometheus metrics
curl -f http://localhost:9090/-/healthy

# Grafana
curl -f http://localhost:3000/api/health

# Redis
redis-cli ping
```

### 2. Load Testing

```bash
# Install Apache Bench
sudo apt-get install apache2-utils

# Run basic load test
ab -n 1000 -c 10 http://localhost/

# Advanced load testing with wrk
wrk -t12 -c400 -d30s http://localhost/
```

### 3. SSL Verification

```bash
# Check SSL certificate
curl -I https://yourdomain.com

# Verify SSL with OpenSSL
echo | openssl s_client -servername yourdomain.com -connect yourdomain.com:443 2>/dev/null | openssl x509 -noout -dates
```

## Monitoring & Observability

### Prometheus Metrics

Access Prometheus at `http://localhost:9090`

**Key Metrics to Monitor:**
- `http_request_duration_seconds` - Request duration
- `http_requests_total` - Request count
- `nodejs_memory_usage_bytes` - Memory usage
- `process_cpu_usage_ratio` - CPU usage

### Grafana Dashboards

Access Grafana at `http://localhost:3000` (admin/your-password)

**Pre-configured Dashboards:**
1. Application Overview
2. Node.js Performance
3. Infrastructure Metrics
4. Error Tracking

### Log Aggregation with Loki

Logs are automatically collected by Promtail and sent to Loki.

```bash
# Query logs
curl -G -s "http://localhost:3100/loki/api/v1/query" \
  --data-urlencode 'query={container="mountainhr-frontend"}'

# View logs in Grafana
# Navigate to Explore > Loki data source
```

### Application Performance Monitoring

Integrate with APM solutions:

1. **Sentry** - Error tracking and performance monitoring
2. **New Relic** - Full-stack observability
3. **DataDog** - Infrastructure and application monitoring

## Scaling

### Horizontal Scaling

Scale the number of frontend instances:

```bash
# Scale to 4 instances
docker-compose -f docker-compose.prod.yml up -d --scale frontend-1=2 --scale frontend-2=2

# Using Docker Swarm
docker service scale mountainhr-frontend=4
```

### Load Balancer Configuration

Nginx is configured for load balancing. For advanced load balancing:

1. **HAProxy** - High-performance load balancer
2. **Traefik** - Cloud-native load balancer
3. **AWS Application Load Balancer** - Managed load balancing
4. **Cloudflare** - Global load balancing

### Database Scaling

1. **Read Replicas** - Scale read operations
2. **Connection Pooling** - Optimize database connections
3. **Caching** - Redis for session and data caching

### CDN Integration

Integrate with CDN for static asset delivery:

```bash
# Configure CDN in environment
PUBLIC_CDN_URL=https://cdn.yourdomain.com
```

**Recommended CDN Providers:**
- Cloudflare
- AWS CloudFront
- Google Cloud CDN
- Azure CDN

## Security

### SSL/TLS Configuration

```nginx
# nginx/nginx.conf - SSL configuration
server {
    listen 443 ssl http2;
    ssl_certificate /etc/nginx/ssl/cert.pem;
    ssl_certificate_key /etc/nginx/ssl/key.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512;
    ssl_prefer_server_ciphers off;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 1d;
}
```

### Security Headers

```nginx
# Security headers
add_header X-Frame-Options "SAMEORIGIN" always;
add_header X-Content-Type-Options "nosniff" always;
add_header X-XSS-Protection "1; mode=block" always;
add_header Strict-Transport-Security "max-age=63072000" always;
add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'" always;
```

### Firewall Configuration

```bash
# UFW firewall setup
sudo ufw enable
sudo ufw allow ssh
sudo ufw allow 80
sudo ufw allow 443
sudo ufw deny 3000
sudo ufw deny 6379
sudo ufw deny 9090
```

### Container Security

1. **Non-root user** - Containers run as non-root user
2. **Resource limits** - CPU and memory limits configured
3. **Security scanning** - Regular image vulnerability scanning
4. **Secrets management** - Use Doppler or similar for secrets

## Backup & Disaster Recovery

### Automated Backups

```bash
# Database backup
pg_dump $DATABASE_URL | gzip > backup_$(date +%Y%m%d_%H%M%S).sql.gz

# Application backup
docker save mountainhr-frontend:latest | gzip > image_backup_$(date +%Y%m%d_%H%M%S).tar.gz

# Configuration backup
tar -czf config_backup_$(date +%Y%m%d_%H%M%S).tar.gz nginx/ monitoring/ .env
```

### Backup Strategy

1. **Daily automated backups** of database and configurations
2. **Weekly full system backups** including Docker images
3. **Cross-region replication** for disaster recovery
4. **Recovery testing** - Regular restoration testing

### Disaster Recovery Plan

1. **RTO (Recovery Time Objective)**: < 30 minutes
2. **RPO (Recovery Point Objective)**: < 1 hour
3. **Automated failover** to backup infrastructure
4. **Communication plan** for stakeholders

## Troubleshooting

### Common Issues

#### 1. Container Won't Start

```bash
# Check container logs
docker-compose -f docker-compose.prod.yml logs frontend-1

# Check container status
docker-compose -f docker-compose.prod.yml ps

# Restart specific service
docker-compose -f docker-compose.prod.yml restart frontend-1
```

#### 2. High Memory Usage

```bash
# Check memory usage
docker stats

# Increase memory limits in docker-compose.prod.yml
deploy:
  resources:
    limits:
      memory: 1G
```

#### 3. Database Connection Issues

```bash
# Test database connection
docker exec -it mountainhr-frontend-1 node -e "
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
pool.query('SELECT NOW()', (err, res) => {
  console.log(err ? err : res.rows[0]);
  pool.end();
});
"
```

#### 4. SSL Certificate Issues

```bash
# Renew Let's Encrypt certificate
sudo certbot renew

# Check certificate expiration
openssl x509 -in nginx/ssl/cert.pem -text -noout | grep "Not After"

# Test SSL configuration
curl -I https://yourdomain.com
```

### Performance Issues

#### 1. Slow Response Times

```bash
# Check application metrics
curl http://localhost:9090/api/v1/query?query=http_request_duration_seconds

# Enable application profiling
NODE_ENV=production PROFILING=true npm start

# Database query optimization
EXPLAIN ANALYZE your_slow_query;
```

#### 2. High CPU Usage

```bash
# Check process CPU usage
docker exec -it mountainhr-frontend-1 top

# Profile Node.js application
docker exec -it mountainhr-frontend-1 node --prof your_app.js

# Analyze profile
node --prof-process isolate-*.log > profile.txt
```

### Debug Mode

Enable debug mode for troubleshooting:

```bash
# Enable debug logging
DEBUG=* docker-compose -f docker-compose.prod.yml up

# Application-specific debugging
NODE_ENV=production DEBUG=app:* npm start
```

## Rollback Procedures

### Automated Rollback

```bash
# Rollback using deployment script
./scripts/deploy-production.sh rollback /path/to/backup/directory

# Quick rollback to previous image
docker tag mountainhr-frontend:previous mountainhr-frontend:latest
docker-compose -f docker-compose.prod.yml up -d
```

### Manual Rollback

```bash
# Stop current services
docker-compose -f docker-compose.prod.yml down

# Load previous image
gunzip -c backup_image.tar.gz | docker load

# Start services with previous image
docker-compose -f docker-compose.prod.yml up -d
```

### Database Rollback

```bash
# Restore database from backup
gunzip -c backup_20240101_120000.sql.gz | psql $DATABASE_URL

# Verify data integrity
psql $DATABASE_URL -c "SELECT COUNT(*) FROM employees;"
```

## Maintenance

### Regular Maintenance Tasks

1. **Weekly Tasks**
   - Update system packages
   - Review security logs
   - Check SSL certificate expiration
   - Performance review

2. **Monthly Tasks**
   - Update Docker images
   - Security vulnerability scan
   - Backup verification
   - Capacity planning review

3. **Quarterly Tasks**
   - Disaster recovery testing
   - Security audit
   - Performance optimization
   - Infrastructure cost review

### Update Procedures

```bash
# Update system packages
sudo apt update && sudo apt upgrade

# Update Docker images
docker-compose -f docker-compose.prod.yml pull
docker-compose -f docker-compose.prod.yml up -d

# Update application
git pull origin main
./scripts/deploy-production.sh
```

## Support & Documentation

### Getting Help

1. **Internal Documentation** - Check the [docs/](./docs/) directory
2. **Issue Tracking** - GitHub Issues for bug reports
3. **Team Communication** - Slack #mountainhr-support
4. **Emergency Contact** - On-call engineer via PagerDuty

### Additional Resources

- [API Documentation](./docs/api.md)
- [Architecture Overview](./docs/architecture.md)
- [Security Guidelines](./docs/security.md)
- [Performance Optimization](./docs/performance.md)

---

## Quick Reference

### Useful Commands

```bash
# Check service status
docker-compose -f docker-compose.prod.yml ps

# View logs
docker-compose -f docker-compose.prod.yml logs -f [service-name]

# Scale services
docker-compose -f docker-compose.prod.yml up -d --scale frontend-1=3

# Restart services
docker-compose -f docker-compose.prod.yml restart

# Update services
docker-compose -f docker-compose.prod.yml pull && docker-compose -f docker-compose.prod.yml up -d

# Health check
curl -f http://localhost/health

# Backup database
pg_dump $DATABASE_URL > backup.sql

# Monitor resources
docker stats
```

### Emergency Contacts

- **DevOps Team**: devops@mountainhr.com
- **Security Team**: security@mountainhr.com
- **On-call Engineer**: +1-XXX-XXX-XXXX
- **PagerDuty**: https://mountainhr.pagerduty.com

---

**Last Updated**: December 2024  
**Version**: 1.0.0  
**Maintained By**: DevOps Team