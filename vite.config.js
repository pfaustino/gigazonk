import { defineConfig } from 'vite';
import { viteMcp } from 'vite-mcp';
import { consoleAdapter, localStorageAdapter } from 'vite-mcp/adapters';

export default defineConfig(({ command }) => ({
  base: command === 'serve' ? '/' : '/gigazonk/',
  plugins:
    command === 'serve'
      ? [
          viteMcp({
            adapters: [consoleAdapter, localStorageAdapter],
          }),
        ]
      : [],
}));
