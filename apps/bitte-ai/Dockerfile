FROM node:20-slim

WORKDIR /app

# Install Bun and PM2 for process management
RUN apt-get update && apt-get install -y curl unzip && \
    curl -fsSL https://bun.sh/install | bash && \
    ln -s $HOME/.bun/bin/bun /usr/local/bin/bun && \
    npm install -g pm2

COPY package.json bun.lock ./
COPY apps/bitte-ai/package.json ./apps/bitte-ai/

RUN bun install

COPY . .

WORKDIR /app/apps/bitte-ai

# Build the application
RUN bun run build

EXPOSE 3000

# Create PM2 configuration
RUN echo '{\
  "apps": [{\
    "name": "bitte-ai",\
    "script": "dist/index.js",\
    "instances": "1",\
    "exec_mode": "cluster",\
    "max_memory_restart": "500M",\
    "env": {\
      "NODE_ENV": "production"\
    }\
  }]\
}' > ecosystem.config.json

# Run with PM2 in production mode
CMD ["pm2-runtime", "ecosystem.config.json"]