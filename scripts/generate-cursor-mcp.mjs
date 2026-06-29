/**
 * Generate .cursor/mcp.json with Windows-safe absolute paths (spaces in Drive path).
 * Run after clone: npm run setup:mcp
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const { port: devPort } = JSON.parse(
  fs.readFileSync(path.join(root, 'dev-port.json'), 'utf8')
);
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

const mcpServers = {
  'cursor-ide-browser': {
    url: 'https://mcp.cursor.com/browser',
  },
  'vite-mcp': {
    url: `http://localhost:${devPort}/__mcp`,
  },
  'chrome-devtools': chromeDevTools,
  playwright: {
    command: 'npx',
    args: ['-y', '@playwright/mcp@latest', '--headless', '--browser=chromium'],
    cwd: root,
  },
  context7: {
    command: 'npx',
    args: ['-y', '@upstash/context7-mcp'],
  },
};

if (process.env.GITHUB_TOKEN) {
  mcpServers.github = {
    url: 'https://api.githubcopilot.com/mcp/',
    headers: {
      Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
    },
  };
}

const config = { mcpServers };

const out = path.join(root, '.cursor', 'mcp.json');
fs.writeFileSync(out, `${JSON.stringify(config, null, 2)}\n`);
console.log(`Wrote ${out}`);
if (!process.env.GITHUB_TOKEN) {
  console.log('Tip: set GITHUB_TOKEN before setup:mcp to enable github MCP server.');
}
console.log('Restart Cursor or reload MCP in Settings → MCP.');
