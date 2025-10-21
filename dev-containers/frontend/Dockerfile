FROM node:20-bullseye

# Install system dependencies including SSH server and Neovim
RUN apt-get update && apt-get install -y \
    git \
    curl \
    wget \
    openssh-server \
    sudo \
    build-essential \
    python3 \
    python3-pip \
    ripgrep \
    fd-find \
    fzf \
    tree \
    htop \
    tmux \
    neovim \
    && rm -rf /var/lib/apt/lists/*

# Create development user with host UID/GID (1000:1000) to avoid permission issues
# Rename existing 'node' user/group (UID/GID 1000) to 'dev'
RUN usermod -l dev node \
    && groupmod -n dev node \
    && usermod -d /home/dev -m dev \
    && echo 'dev:dev' | chpasswd \
    && usermod -aG sudo dev \
    && echo 'dev ALL=(ALL) NOPASSWD:ALL' >> /etc/sudoers

# Configure SSH
RUN mkdir /var/run/sshd \
    && sed -i 's/#PermitRootLogin prohibit-password/PermitRootLogin no/' /etc/ssh/sshd_config \
    && sed -i 's/#PasswordAuthentication yes/PasswordAuthentication yes/' /etc/ssh/sshd_config \
    && sed -i 's/#PubkeyAuthentication yes/PubkeyAuthentication yes/' /etc/ssh/sshd_config \
    && echo 'AllowUsers dev' >> /etc/ssh/sshd_config

# Set up SSH keys directory for dev user
USER dev
WORKDIR /home/dev

# Create SSH directory
RUN mkdir -p /home/dev/.ssh \
    && chmod 700 /home/dev/.ssh

# Create basic shell configuration
RUN echo 'export PATH="/usr/local/bin:$PATH"' >> /home/dev/.bashrc \
    && echo 'export EDITOR=nvim' >> /home/dev/.bashrc \
    && echo 'alias vi=nvim' >> /home/dev/.bashrc \
    && echo 'alias vim=nvim' >> /home/dev/.bashrc \
    && echo 'alias ll="ls -alF"' >> /home/dev/.bashrc \
    && echo 'alias la="ls -A"' >> /home/dev/.bashrc \
    && echo 'alias l="ls -CF"' >> /home/dev/.bashrc

# Copy frontend application (exclude node_modules and build artifacts)
COPY --chown=dev:dev package*.json /home/dev/frontend/
COPY --chown=dev:dev src/ /home/dev/frontend/src/
COPY --chown=dev:dev static/ /home/dev/frontend/static/
COPY --chown=dev:dev *.config.* /home/dev/frontend/
COPY --chown=dev:dev *.json /home/dev/frontend/
COPY --chown=dev:dev *.js /home/dev/frontend/
COPY --chown=dev:dev *.ts /home/dev/frontend/
COPY --chown=dev:dev *.md /home/dev/frontend/
COPY --chown=dev:dev .env* /home/dev/frontend/

WORKDIR /home/dev/frontend

# Install Node.js dependencies
RUN npm install

# Install global development tools
USER root
RUN npm install -g @sveltejs/kit @sveltejs/adapter-auto vite

# Switch back to dev user
USER dev

# Create startup script - NO chown commands to preserve host permissions
USER root
RUN echo '#!/bin/bash\n\
# Start SSH daemon\n\
service ssh start\n\
\n\
# Fix npm cache permissions\n\
mkdir -p /home/dev/.npm\n\
chown -R dev:dev /home/dev/.npm\n\
sudo -u dev npm config set cache /home/dev/.npm\n\
\n\
# Source host nvim config if available\n\
if [ -d "/host-nvim-config" ]; then\n\
    mkdir -p /home/dev/.config\n\
    sudo -u dev ln -sf /host-nvim-config /home/dev/.config/nvim\n\
fi\n\
\n\
# Change to frontend directory\n\
cd /home/dev/frontend\n\
\n\
# Install/update dependencies if needed (in case package.json changed)\n\
sudo -E -u dev npm install\n\
\n\
# Clean any stale build artifacts\n\
sudo -E -u dev rm -rf .svelte-kit 2>/dev/null || true\n\
\n\
# Start the frontend application in development mode\n\
exec sudo -E -u dev npm run dev -- --host 0.0.0.0' > /start.sh \
    && chmod +x /start.sh

# Expose SSH port and application port
EXPOSE 22 5173

# Start services
CMD ["/start.sh"]
