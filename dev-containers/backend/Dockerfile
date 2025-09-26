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
    postgresql-client \
    redis-tools \
    && rm -rf /var/lib/apt/lists/*

# Install latest Neovim
RUN curl -LO https://github.com/neovim/neovim/releases/latest/download/nvim-linux64.tar.gz \
    && tar -C /opt -xzf nvim-linux64.tar.gz \
    && ln -sf /opt/nvim-linux64/bin/nvim /usr/local/bin/nvim \
    && rm nvim-linux64.tar.gz

# Create development user
RUN useradd -m -s /bin/bash -u 1000 dev \
    && echo 'dev:dev' | chpasswd \
    && adduser dev sudo \
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

# Copy backend application
COPY --chown=dev:dev backend/ /home/dev/backend/
WORKDIR /home/dev/backend

# Install Node.js dependencies
RUN npm ci

# Install global development tools
USER root
RUN npm install -g tsx nodemon @typescript-eslint/cli

# Switch back to dev user
USER dev

# Create startup script
USER root
RUN echo '#!/bin/bash\n\
# Start SSH daemon\n\
service ssh start\n\
\n\
# Source host nvim config if available\n\
if [ -d "/host-nvim-config" ]; then\n\
    sudo -u dev ln -sf /host-nvim-config /home/dev/.config/nvim\n\
fi\n\
\n\
# Start the backend application in development mode\n\
cd /home/dev/backend\n\
exec sudo -u dev npm run dev' > /start.sh \
    && chmod +x /start.sh

# Expose SSH port and application port
EXPOSE 22 4000

# Start services
CMD ["/start.sh"]