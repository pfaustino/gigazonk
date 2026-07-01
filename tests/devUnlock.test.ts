import { describe, expect, it, beforeEach, vi } from 'vitest';
import {
  DEV_UNLOCK_STORAGE_KEY,
  isDevEnabled,
  isDevUnlockedInStorage,
  persistDevUnlock,
} from '../src/lib/devUnlock.js';

function mockStorage() {
  const store = new Map<string, string>();
  vi.stubGlobal('localStorage', {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => { store.set(key, value); },
    removeItem: (key: string) => { store.delete(key); },
    clear: () => { store.clear(); },
  });
}

describe('devUnlock', () => {
  beforeEach(() => {
    mockStorage();
    vi.stubGlobal('window', {
      location: { search: '', hash: '' },
    });
  });

  it('isDevEnabled when localStorage unlock is set', () => {
    persistDevUnlock();
    expect(isDevUnlockedInStorage()).toBe(true);
    expect(isDevEnabled()).toBe(true);
  });

  it('isDevEnabled from ?dev=1 query flag', () => {
    vi.stubGlobal('window', {
      location: { search: '?dev=1', hash: '' },
    });
    expect(isDevEnabled()).toBe(true);
    expect(localStorage.getItem(DEV_UNLOCK_STORAGE_KEY)).toBeNull();
  });
});
