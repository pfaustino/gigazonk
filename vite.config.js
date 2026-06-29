import { readFileSync } from 'node:fs';
import { defineConfig } from 'vite';
import { viteMcp } from 'vite-mcp';
import { consoleAdapter, localStorageAdapter } from 'vite-mcp/adapters';

const { port: DEV_PORT } = JSON.parse(
  readFileSync(new URL('./dev-port.json', import.meta.url), 'utf8')
);

export default defineConfig(({ command }) => ({
  base: command === 'serve' ? '/' : '/gigazonk/',
  build: {
    chunkSizeWarningLimit: 800,
  },
  server: {
    host: true,
    port: DEV_PORT,
    strictPort: true,
  },
  plugins:
    command === 'serve'
      ? [
          viteMcp({
            adapters: [consoleAdapter, localStorageAdapter],
          }),
        ]
      : [],
}));
