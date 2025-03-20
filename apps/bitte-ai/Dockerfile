FROM oven/bun:1.2.1

WORKDIR /app

COPY package.json bun.lock ./
COPY apps/bitte-ai/package.json ./apps/bitte-ai/

RUN bun install

COPY . .

WORKDIR /app/apps/bitte-ai

# Build the application
RUN bun run build

EXPOSE 3000

# Run the compiled application
CMD ["bun", "run", "start"] 