# MCP Proxy Monorepo

This monorepo contains MCP (Model Control Protocol) servers for different services.

## Packages

- **bitte-ai**: MCP server for Bitte AI integrations
- **extra-tools**: Additional tools for extending MCP functionality

## Setup

To install dependencies:

```bash
bun install
```

## Development

This project uses Turborepo for managing the monorepo workflow and Biome for code quality tools.

### Build all packages

```bash
bun run build
```

### Start both services

```bash
bun run start
```

### Development mode

```bash
bun run dev
```

### Lint your code

```bash
bun run lint
# To fix automatically:
bun run lint:fix
```

### Format your code

```bash
bun run format
# To fix automatically:
bun run format:fix
```

### Run individual services

```bash
# Run bitte-ai service
bun run dev:bitte-ai

# Run extra-tools service
bun run dev:extra-tools
```

## Adding a new package

1. Create a new directory in the `packages` folder
2. Add the necessary package.json, tsconfig.json, and implementation files
3. Update the root package.json and tsconfig.json to include your new package

This project uses [Bun](https://bun.sh) as the JavaScript runtime.

For more information: [Vibestreaming Logs](https://github.com/microchipgnu/vibestream)