# SvelteHR Development Containers

This directory contains Docker-based development containers for the SvelteHR project with SSH access and Neovim integration.

## 🚀 Quick Start

```bash
# Start the development environment
./start-dev.sh

# SSH into containers
./ssh-dev.sh backend   # or 'be'
./ssh-dev.sh frontend  # or 'fe'

# Stop the environment
./stop-dev.sh
```

## 📋 Prerequisites

1. **Docker Desktop** or **Docker Engine** installed and running
2. **Docker Compose** v2.0+
3. **Neovim configuration** at `~/.config/nvim` (optional but recommended)
4. **SSH client** for container access

## 🏗️ Architecture

The development environment consists of:

- **Backend Container** (`sveltehr-backend-dev`)
  - Node.js 20 + TypeScript + tsx
  - PostGraphile GraphQL server
  - SSH server on port 2222
  - API server on port 4000

- **Frontend Container** (`sveltehr-frontend-dev`)
  - Node.js 20 + SvelteKit + Vite
  - SSH server on port 2223
  - Dev server on port 5173

- **PostgreSQL Database** (`sveltehr-postgres-dev`)
  - PostgreSQL 15 on port 5433
  - Database: `hr_system`
  - User: `postgres` / Password: `postgres123`

- **Redis Cache** (`sveltehr-redis-dev`)
  - Redis 7 on port 6380
  - Persistent data storage

## 🔌 Port Mapping

| Service          | Container Port | Host Port | Description                      |
| ---------------- | -------------- | --------- | -------------------------------- |
| Backend SSH      | 22             | 2222      | SSH access to backend container  |
| Frontend SSH     | 22             | 2223      | SSH access to frontend container |
| Backend API      | 4000           | 4000      | GraphQL API endpoint             |
| GraphiQL         | 5000           | 5000      | GraphQL IDE interface            |
| Frontend Dev     | 5173           | 5173      | Vite development server          |
| Frontend Preview | 4173           | 4173      | Vite preview server              |
| PostgreSQL       | 5432           | 5433      | Database connection              |
| Redis            | 6379           | 6380      | Cache connection                 |

## 💻 Neovim Integration

Your host system's Neovim configuration is automatically mounted in both containers:

- **Host path**: `~/.config/nvim`
- **Container path**: `/home/dev/.config/nvim`

### Features:

- ✅ All your plugins and configurations work seamlessly
- ✅ LSP, treesitter, and other tools work out of the box
- ✅ Automatic configuration linking on container startup
- ✅ Live updates when you modify your nvim config

### Tools Included:

- `nvim` (latest stable)
- `ripgrep` (rg)
- `fd-find`
- `fzf`
- `tree`
- `git`
- `tmux`
- Standard development tools

## 🔑 SSH Access

### Connection Details:

```bash
# Backend container
ssh dev@localhost -p 2222

# Frontend container
ssh dev@localhost -p 2223

# Credentials
Username: dev
Password: dev
```

### SSH Key Setup (Optional):

If you have SSH keys, they'll be automatically mounted:

```bash
# Your public key is mounted as authorized_keys
~/.ssh/id_rsa.pub → /home/dev/.ssh/authorized_keys
```

### SSH Helper Script:

```bash
# Use the convenience script
./ssh-dev.sh backend   # Connect to backend
./ssh-dev.sh frontend  # Connect to frontend
./ssh-dev.sh be        # Short form
./ssh-dev.sh fe        # Short form
```

## 📂 Volume Mounts

### Backend Container:

- `../backend` → `/home/dev/backend` (live editing)
- `~/.config/nvim` → `/host-nvim-config` (read-only)
- `~/.ssh/id_rsa.pub` → `/home/dev/.ssh/authorized_keys` (read-only)

### Frontend Container:

- `../src` → `/home/dev/frontend/src` (live editing)
- `../static` → `/home/dev/frontend/static` (live editing)
- Config files mounted read-only for consistency
- `~/.config/nvim` → `/host-nvim-config` (read-only)

## 🛠️ Development Workflow

### 1. Start Environment

```bash
cd dev-containers
./start-dev.sh
```

### 2. SSH into Containers

```bash
# Backend development
./ssh-dev.sh backend
cd backend
npm run dev

# Frontend development (in another terminal)
./ssh-dev.sh frontend
cd frontend
npm run dev
```

### 3. Using Neovim

```bash
# Inside any container
nvim src/some-file.ts  # Your config works perfectly
```

### 4. Database Access

```bash
# From host system
psql -h localhost -p 5433 -U postgres -d hr_system

# From backend container
psql -h postgres-dev -U postgres -d hr_system
```

### 5. Multi-Session Development

```bash
# Inside container, use tmux for multiple sessions
tmux new-session -d -s dev
tmux split-window -h
tmux select-window -t 0
```

## 📊 Monitoring & Logs

### View Container Logs:

```bash
# All services
docker-compose -f docker-compose.dev.yml logs -f

# Specific service
docker-compose -f docker-compose.dev.yml logs -f backend-dev
docker-compose -f docker-compose.dev.yml logs -f frontend-dev
```

### Container Status:

```bash
docker-compose -f docker-compose.dev.yml ps
```

## 🗂️ File Structure

```
dev-containers/
├── README.md                    # This file
├── docker-compose.dev.yml       # Main orchestration
├── start-dev.sh                 # Start script
├── stop-dev.sh                  # Stop script
├── ssh-dev.sh                   # SSH helper
├── backend/
│   └── Dockerfile               # Backend container
└── frontend/
    └── Dockerfile               # Frontend container
```

## 🔧 Customization

### Environment Variables:

Edit `docker-compose.dev.yml` to modify:

- Database credentials
- JWT secrets
- API URLs
- Port mappings

### Adding Packages:

```bash
# SSH into container
./ssh-dev.sh backend

# Install packages (they'll persist in mounted package.json)
npm install some-package
```

### Custom Scripts:

Add your own scripts to the containers by modifying the Dockerfiles.

## 🚨 Troubleshooting

### Container Won't Start:

```bash
# Check Docker is running
docker info

# Check port conflicts
netstat -tulpn | grep :2222
netstat -tulpn | grep :5173
```

### SSH Connection Refused:

```bash
# Check container status
docker-compose -f docker-compose.dev.yml ps

# Check SSH service in container
docker-compose -f docker-compose.dev.yml exec backend-dev service ssh status
```

### Neovim Config Not Loading:

```bash
# Check if config directory exists
ls -la ~/.config/nvim

# Check mount inside container
docker-compose -f docker-compose.dev.yml exec backend-dev ls -la /host-nvim-config
```

### Database Connection Issues:

```bash
# Check database is ready
docker-compose -f docker-compose.dev.yml logs postgres-dev

# Test connection
docker-compose -f docker-compose.dev.yml exec postgres-dev pg_isready -U postgres
```

## 🧹 Cleanup

### Stop Containers:

```bash
./stop-dev.sh
```

### Remove Everything (including data):

```bash
docker-compose -f docker-compose.dev.yml down -v
docker system prune -f
```

### Reset Database:

```bash
docker-compose -f docker-compose.dev.yml down -v
docker volume rm sveltehr_postgres_dev_data
./start-dev.sh
```

## 💡 Tips & Tricks

1. **Use tmux** inside containers for multiple terminal sessions
2. **Set up SSH keys** for passwordless access
3. **Use port forwarding** for additional services: `ssh -L 8080:localhost:8080 dev@localhost -p 2222`
4. **Mount additional directories** by editing the docker-compose.yml
5. **Create aliases** in your host shell:
   ```bash
   alias be="cd /path/to/SvelteHR/dev-containers && ./ssh-dev.sh backend"
   alias fe="cd /path/to/SvelteHR/dev-containers && ./ssh-dev.sh frontend"
   ```

## 🤝 Contributing

To modify the development environment:

1. Update the appropriate Dockerfile
2. Test your changes: `docker-compose -f docker-compose.dev.yml build`
3. Document any new features or requirements
4. Update this README if needed

---

**Happy coding! 🎉**
