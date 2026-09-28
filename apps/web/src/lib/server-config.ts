/**
 * Server URL configuration (Phase 26 beta — PRD §102).
 *
 * The Capacitor Android shell loads the API from a configurable server URL
 * (default: the owner's LAN address baked into capacitor.config.ts). Beta
 * testers can change it from the Server URL screen without rebuilding the APK.
 * Web builds (browser/Tauri) keep using same-origin relative paths, so they
 * ignore this entirely.
 */

const STORAGE_KEY = 'sofo.serverUrl';

/** Default baked into the beta build (owner's laptop on the local WiFi). */
export const DEFAULT_SERVER_URL = 'http://192.168.68.107:4001';

/**
 * True when the app runs inside a native shell (Capacitor Android APK or the
 * Tauri Windows EXE). Uses the official Capacitor global when available and
 * falls back to shell-specific UA/origin signals. Only native shells load the
 * API from the configurable server URL; plain web stays same-origin.
 */
export function isNativePlatform(): boolean {
  const cap = (globalThis as Record<string, unknown>)['Capacitor'];
  if (cap && typeof cap === 'object' && 'isNativePlatform' in cap) {
    return Boolean((cap as { isNativePlatform: () => boolean }).isNativePlatform());
  }
  const ua = typeof navigator !== 'undefined' ? navigator.userAgent : '';
  if (/Capacitor/i.test(ua)) return true;
  // Tauri desktop shell: the webview serves assets from a tauri:// origin or
  // an http(s)://tauri.localhost host (Windows WebView2) — never the real API.
  if (typeof location !== 'undefined') {
    if (location.protocol === 'tauri:') return true;
    if (location.hostname === 'tauri.localhost' || location.hostname.endsWith('.tauri.localhost')) {
      return true;
    }
  }
  return false;
}

/** Reject anything that is not a clean origin like `http://192.168.1.5:4001`. */
export function validateServerUrl(raw: string): string | null {
  let url: URL;
  try {
    url = new URL(raw.trim());
  } catch {
    return null;
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return null;
  if (url.pathname !== '/' && url.pathname !== '') return null;
  if (url.search !== '' || url.hash !== '') return null;
  // Strip a trailing slash so stored values stay canonical.
  return url.origin;
}

export function loadServerUrl(): string {
  try {
    const stored = globalThis.localStorage?.getItem(STORAGE_KEY);
    if (stored) {
      const valid = validateServerUrl(stored);
      if (valid) return valid;
    }
  } catch {
    // localStorage unavailable (private mode) — fall through to default.
  }
  return DEFAULT_SERVER_URL;
}

export function saveServerUrl(raw: string): string | null {
  const valid = validateServerUrl(raw);
  if (!valid) return null;
  try {
    globalThis.localStorage?.setItem(STORAGE_KEY, valid);
  } catch {
    // Ignore quota/private-mode errors — the value still applies for this run.
  }
  return valid;
}

/** Reset to the build default (used by the "Use default" action). */
export function resetServerUrl(): void {
  try {
    globalThis.localStorage?.removeItem(STORAGE_KEY);
  } catch {
    // Ignore storage errors.
  }
}

/**
 * Base URL for REST calls. Web builds keep same-origin relative paths so the
 * Vite dev proxy and production reverse proxies keep working; only the native
 * shell talks to the configured server.
 */
export function resolveApiBase(): string {
  if (!isNativePlatform()) return '/api/v1';
  return `${loadServerUrl()}/api/v1`;
}

/**
 * Probe server reachability (health endpoint, no auth). Returns latency in ms,
 * or null when unreachable — used for the connect-check signal in the UI.
 */
export async function probeServer(baseUrl: string, timeoutMs = 4000): Promise<number | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const startedAt = Date.now();
  try {
    const response = await fetch(`${baseUrl}/api/v1/health`, { signal: controller.signal });
    if (!response.ok) return null;
    return Date.now() - startedAt;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}
