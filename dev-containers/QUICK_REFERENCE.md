# 🚀 SvelteHR Development Containers - Quick Reference

## Make Commands (Recommended)

```bash
# Start containers
make dev-start

# SSH into containers
make ssh-backend    # Backend container
make ssh-frontend   # Frontend container

# Alternative short forms
make dev-ssh-be     # Backend (alias)
make dev-ssh-fe     # Frontend (alias)

# Container management
make dev-stop       # Stop containers
make dev-logs       # View logs
make clean          # Clean everything
```

## Direct Commands

```bash
# Manual control
cd dev-containers
./start-dev.sh      # Start
./stop-dev.sh       # Stop
./ssh-dev.sh be     # SSH backend
./ssh-dev.sh fe     # SSH frontend

# Direct SSH (after containers are running)
ssh dev@localhost -p 2222  # Backend
ssh dev@localhost -p 2223  # Frontend
```

## Container Credentials

- **Username**: `dev`
- **Password**: `dev`
- **Neovim config**: Your `~/.config/nvim` is automatically mounted

## Service URLs

- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:4000
- **GraphiQL**: http://localhost:5000
- **PostgreSQL**: `localhost:5433` (postgres/postgres123)
- **Redis**: `localhost:6380`

## Quick Setup

1. **Start containers**: `make dev-start`
2. **SSH to backend**: `make ssh-backend`
   ```bash
   cd backend
   npm run dev  # Start GraphQL server
   ```
3. **SSH to frontend** (new terminal): `make ssh-frontend`
   ```bash
   cd frontend
   npm run dev -- --host 0.0.0.0  # Start SvelteKit
   ```

## Inside Container Tips

```bash
# Your tools are available
nvim src/some-file.ts    # Full nvim config
tmux new-session         # Multiple terminals
rg "search term"         # ripgrep
fd filename              # find files
fzf                      # fuzzy finder

# Multiple terminal sessions
tmux new-session -d -s dev
tmux split-window -h
tmux attach -t dev
```

## Troubleshooting

```bash
# Check container status
docker ps | grep sveltehr

# View logs
make dev-logs

# Restart containers
make dev-stop
make dev-start

# Clean slate
make clean
make dev-start
```