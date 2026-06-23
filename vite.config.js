import { defineConfig } from 'vite';
import { viteMcp } from 'vite-mcp';
import { consoleAdapter, localStorageAdapter } from 'vite-mcp/adapters';

export default defineConfig(({ command }) => ({
  base: command === 'serve' ? '/' : '/gigazonk/',
  server: {
    host: true,
    port: 5173,
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
