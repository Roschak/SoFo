import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  DEFAULT_SERVER_URL,
  isNativePlatform,
  loadServerUrl,
  probeServer,
  resetServerUrl,
  resolveApiBase,
  saveServerUrl,
  validateServerUrl,
} from './server-config';

/** Minimal in-memory Storage for asserting localStorage persistence. */
function fakeStorage(): Storage {
  const map = new Map<string, string>();
  return {
    get length() {
      return map.size;
    },
    clear: () => map.clear(),
    getItem: (key) => map.get(key) ?? null,
    key: (index) => [...map.keys()][index] ?? null,
    removeItem: (key) => void map.delete(key),
    setItem: (key, value) => void map.set(key, value),
  };
}

afterEach(() => {
  vi.unstubAllGlobals();
  resetServerUrl();
  delete (globalThis as Record<string, unknown>).localStorage;
  delete (globalThis as Record<string, unknown>).Capacitor;
  delete (globalThis as Record<string, unknown>).location;
});

describe('validateServerUrl', () => {
  it('accepts clean http/https origins and strips trailing slash', () => {
    expect(validateServerUrl('http://192.168.68.107:4001')).toBe('http://192.168.68.107:4001');
    expect(validateServerUrl('http://192.168.68.107:4001/')).toBe('http://192.168.68.107:4001');
    expect(validateServerUrl('https://sofo.example.com')).toBe('https://sofo.example.com');
  });

  it('trims surrounding whitespace', () => {
    expect(validateServerUrl('  http://10.0.0.5:4001  ')).toBe('http://10.0.0.5:4001');
  });

  it('rejects non-http protocols, paths, query, hash, and garbage', () => {
    expect(validateServerUrl('ftp://192.168.0.1:4001')).toBeNull();
    expect(validateServerUrl('http://192.168.0.1:4001/api')).toBeNull();
    expect(validateServerUrl('http://192.168.0.1:4001?x=1')).toBeNull();
    expect(validateServerUrl('http://192.168.0.1:4001#top')).toBeNull();
    expect(validateServerUrl('bukan-url')).toBeNull();
    expect(validateServerUrl('')).toBeNull();
  });
});

describe('loadServerUrl / saveServerUrl / resetServerUrl', () => {
  it('falls back to the build default when nothing is stored', () => {
    expect(loadServerUrl()).toBe(DEFAULT_SERVER_URL);
  });

  it('persists a valid URL and loads it back', () => {
    (globalThis as Record<string, unknown>).localStorage = fakeStorage();
    expect(saveServerUrl('http://10.0.0.9:4001/')).toBe('http://10.0.0.9:4001');
    expect(loadServerUrl()).toBe('http://10.0.0.9:4001');
  });

  it('rejects invalid URLs without touching the stored value', () => {
    (globalThis as Record<string, unknown>).localStorage = fakeStorage();
    saveServerUrl('http://10.0.0.9:4001');
    expect(saveServerUrl('not-a-url')).toBeNull();
    expect(loadServerUrl()).toBe('http://10.0.0.9:4001');
  });

  it('ignores invalid stored values and returns the default', () => {
    (globalThis as Record<string, unknown>).localStorage = fakeStorage();
    (globalThis.localStorage as Storage).setItem('sofo.serverUrl', 'javascript:alert(1)');
    expect(loadServerUrl()).toBe(DEFAULT_SERVER_URL);
  });

  it('resetServerUrl clears the override', () => {
    (globalThis as Record<string, unknown>).localStorage = fakeStorage();
    saveServerUrl('http://10.0.0.9:4001');
    resetServerUrl();
    expect(loadServerUrl()).toBe(DEFAULT_SERVER_URL);
  });
});

describe('isNativePlatform / resolveApiBase', () => {
  it('treats a plain web runtime as non-native with same-origin API base', () => {
    expect(isNativePlatform()).toBe(false);
    expect(resolveApiBase()).toBe('/api/v1');
  });

  it('detects the Capacitor shell and resolves the configured server URL', () => {
    (globalThis as Record<string, unknown>).localStorage = fakeStorage();
    (globalThis as Record<string, unknown>).Capacitor = { isNativePlatform: () => true };
    saveServerUrl('http://192.168.1.20:4001');
    expect(isNativePlatform()).toBe(true);
    expect(resolveApiBase()).toBe('http://192.168.1.20:4001/api/v1');
  });

  it('detects the Tauri desktop shell (EXE) via the tauri.localhost origin', () => {
    (globalThis as Record<string, unknown>).localStorage = fakeStorage();
    (globalThis as Record<string, unknown>).location = {
      protocol: 'http:',
      hostname: 'tauri.localhost',
    };
    saveServerUrl('http://192.168.68.107:4001');
    expect(isNativePlatform()).toBe(true);
    expect(resolveApiBase()).toBe('http://192.168.68.107:4001/api/v1');
  });

  it('treats a normal https site as web even with a Capacitor-less UA', () => {
    (globalThis as Record<string, unknown>).location = {
      protocol: 'https:',
      hostname: 'sofo.example.com',
    };
    expect(isNativePlatform()).toBe(false);
    expect(resolveApiBase()).toBe('/api/v1');
  });
});

describe('probeServer', () => {
  it('returns latency in ms when the health endpoint responds ok', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({ ok: true, status: 200 })),
    );
    const latency = await probeServer('http://192.168.68.107:4001');
    expect(latency).not.toBeNull();
    expect(latency as number).toBeGreaterThanOrEqual(0);
  });

  it('returns null when the server is unreachable or responds not-ok', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        throw new TypeError('fetch failed');
      }),
    );
    expect(await probeServer('http://10.255.255.1:4001')).toBeNull();

    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({ ok: false, status: 503 })),
    );
    expect(await probeServer('http://192.168.68.107:4001')).toBeNull();
  });
});
