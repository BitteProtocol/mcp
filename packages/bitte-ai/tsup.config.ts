import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['index.ts', 'config.ts'],
  format: ['esm'],
  target: 'esnext',
  platform: 'node',
  splitting: false,
  sourcemap: true,
  clean: true,
  dts: {
    entry: {
      index: 'index.ts',
      config: 'config.ts'
    }
  },
  minify: false,
  bundle: true,
  skipNodeModulesBundle: true,
  external: [
    '@mcp-sdk/server',
    'zod'
  ]
}); 