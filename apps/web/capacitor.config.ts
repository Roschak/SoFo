import type { CapacitorConfig } from '@capacitor/cli';

/**
 * Capacitor config — wraps the built web app into a native Android shell (APK).
 * `server.url` points the WebView at the deployed SOFO web build, so API and
 * socket calls hit the real backend (same-origin) instead of file:// assets.
 */
const config: CapacitorConfig = {
  appId: 'id.souloffice.app',
  appName: 'SOFO',
  webDir: 'dist',
  server: {
    // Ganti dengan URL produksi saat deploy; ini fallback dev.
    url: 'http://10.0.2.2:5173',
    cleartext: true,
  },
};

export default config;
