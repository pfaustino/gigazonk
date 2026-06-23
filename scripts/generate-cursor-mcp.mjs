/**
 * Generate .cursor/mcp.json with Windows-safe absolute paths (spaces in Drive path).
 * Run after clone: npm run setup:mcp
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const entry = path.join(
  root,
  'node_modules',
  'chrome-devtools-mcp',
  'build',
  'src',
  'bin',
  'chrome-devtools-mcp.js',
);

if (!fs.existsSync(entry)) {
  console.error('Install chrome-devtools-mcp first: npm install');
  process.exit(1);
}

const node = process.execPath;
const isWindows = process.platform === 'win32';

let chromeDevTools;

if (isWindows) {
  const launcherDir = path.join(os.homedir(), 'AppData', 'Local', 'cursor-mcp');
  fs.mkdirSync(launcherDir, { recursive: true });
  const launcherPath = path.join(launcherDir, 'chrome-devtools-gigazonk.cmd');
  const bat = `@echo off\r\n"${node}" "${entry}" %*\r\n`;
  fs.writeFileSync(launcherPath, bat, 'utf8');
  chromeDevTools = {
    command: launcherPath,
    args: ['--slim', '--headless', '--no-usage-statistics'],
    cwd: root,
  };
  console.log(`Launcher: ${launcherPath}`);
} else {
  chromeDevTools = {
    command: node,
    args: [entry, '--slim', '--headless', '--no-usage-statistics'],
    cwd: root,
  };
}

const config = {
  mcpServers: {
    'cursor-ide-browser': {
      url: 'https://mcp.cursor.com/browser',
    },
    'vite-mcp': {
      url: 'http://localhost:5173/__mcp',
    },
    'chrome-devtools': chromeDevTools,
  },
};

const out = path.join(root, '.cursor', 'mcp.json');
fs.writeFileSync(out, `${JSON.stringify(config, null, 2)}\n`);
console.log(`Wrote ${out}`);
console.log('Restart Cursor or reload MCP in Settings → MCP.');
