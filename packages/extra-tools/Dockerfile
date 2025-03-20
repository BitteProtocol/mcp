FROM oven/bun:1.2.1

WORKDIR /app

COPY package.json bun.lock ./
COPY packages/extra-tools/package.json ./packages/extra-tools/

RUN bun install

COPY . .

WORKDIR /app/packages/extra-tools

# Build the application
RUN bun run build

EXPOSE 3001

# Run the compiled application
CMD ["bun", "run", "start"] 