import { parseDevFlags } from './parseDevFlags.js';

export const DEV_UNLOCK_STORAGE_KEY = 'gigazonk_dev_unlock';
/** Typed anywhere (except text fields) to unlock dev tools on itch.io embeds where ?dev=1 is stripped. */
export const DEV_SECRET_CODE = 'zonkdev';

function readHashParams(): URLSearchParams {
  const raw = window.location.hash.replace(/^#/, '');
  if (!raw) return new URLSearchParams();
  const query = raw.startsWith('?') ? raw.slice(1) : raw.includes('=') ? raw : '';
  return new URLSearchParams(query);
}

function isDevQuery(params: URLSearchParams): boolean {
  const v = params.get('dev');
  return v === '1' || v === 'true';
}

export function isDevUrlFlag(): boolean {
  const search = new URLSearchParams(window.location.search);
  if (isDevQuery(search)) return true;
  return isDevQuery(readHashParams());
}

export function isDevUnlockedInStorage(): boolean {
  try {
    return localStorage.getItem(DEV_UNLOCK_STORAGE_KEY) === '1';
  } catch {
    return false;
  }
}

/** Dev panel enabled: ?dev=1 / #dev=1, or secret unlock persisted in localStorage. */
export function isDevEnabled(): boolean {
  if (parseDevFlags().dev || isDevUrlFlag()) return true;
  return isDevUnlockedInStorage();
}

export function persistDevUnlock(): void {
  try {
    localStorage.setItem(DEV_UNLOCK_STORAGE_KEY, '1');
  } catch {
    /* private mode / blocked storage */
  }
}

export function installDevSecretListener(onUnlock: () => void): () => void {
  if (isDevEnabled()) return () => {};

  let buffer = '';
  const handler = (e: KeyboardEvent) => {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    const target = e.target;
    if (target instanceof HTMLElement) {
      const tag = target.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || target.isContentEditable) return;
    }
    if (e.key.length !== 1) return;

    buffer += e.key.toLowerCase();
    if (buffer.length > DEV_SECRET_CODE.length) {
      buffer = buffer.slice(-DEV_SECRET_CODE.length);
    }
    if (buffer !== DEV_SECRET_CODE) return;

    buffer = '';
    persistDevUnlock();
    onUnlock();
  };

  document.addEventListener('keydown', handler);
  return () => document.removeEventListener('keydown', handler);
}
