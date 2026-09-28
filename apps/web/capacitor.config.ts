import type { CapacitorConfig } from '@capacitor/cli';

/**
 * Capacitor config — wraps the built web app into a native Android shell (APK).
 *
 * `server.url` points the WebView at the deployed SOFO backend so API and socket
 * calls hit the real server (same-origin) instead of file:// assets.
 *
 * Phase 26 beta (Opsi A — laptop owner as LAN server): default URL is the
 * owner's WiFi LAN address. Testers can override it in-app from the Server URL
 * screen (persisted in localStorage; see src/lib/server-config.ts) — no rebuild
 * needed when the IP changes. Web builds (browser/Tauri/EXE) are NOT affected:
 * they keep using same-origin `/api/v1` via Vite proxy or reverse proxy.
 */
const config: CapacitorConfig = {
  appId: 'id.souloffice.app',
  appName: 'SOFO',
  webDir: 'dist',
  server: {
    // Beta 1 (Opsi A): API laptop owner di jaringan WiFi lokal (PRD §102).
    // Ganti ke HTTPS VPS saat naik ke beta publik (docs/notes/06-BETA-PHASE26.md §3).
    url: 'http://192.168.68.107:4001',
    cleartext: true,
  },
};

export default config;
