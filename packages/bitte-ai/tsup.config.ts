import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['index.ts', 'config.ts', 'tools/goat-sdk/index.ts', 'tools/goat-sdk/wallet.ts'],
  format: ['esm'],
  target: 'esnext',
  platform: 'node',
  splitting: false,
  sourcemap: true,
  clean: true,
  dts: false,
  minify: false,
  bundle: true,
  skipNodeModulesBundle: true,
  external: [
    '@mcp-sdk/server',
    'zod',
    '@goat-sdk/adapter-model-context-protocol',
    '@goat-sdk/core',
    '@goat-sdk/plugin-erc20',
  ],
});
