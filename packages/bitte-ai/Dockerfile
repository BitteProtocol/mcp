FROM oven/bun:1.2.1

WORKDIR /app

COPY package.json bun.lock ./
COPY packages/bitte-ai/package.json ./packages/bitte-ai/

RUN bun install

COPY . .

WORKDIR /app/packages/bitte-ai

# Build the application
RUN bun run build

EXPOSE 3000

# Run the compiled application
CMD ["bun", "run", "start"] 