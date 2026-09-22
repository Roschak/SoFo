# BUILD — APK (Android) & EXE (Windows Desktop)

> SOFO dibungkus tiga target: **web** (Vite SPA), **APK** (Capacitor WebView),
> dan **EXE/installer** (Tauri 2). Semua memakai satu backend API yang sama.

## Status (Sesi #4 — 2026-09-19)

- ✅ Proyek Android native SUDAH digenerate di `apps/web/android/`
  (`npx cap add android` sukses; `npx cap sync android` sukses menyalin
  hasil `npm run build` ke assets).
- ❌ Build APK berhenti di: `JAVA_HOME is not set` — mesin belum punya
  JDK 17 + Android SDK.
- ❌ Build EXE berhenti di: rustc/cargo + VS Build Tools MSVC tidak ada
  (diverifikasi via `npx tauri info`).
- Install sekali (butuh persetujuan, unduhan besar):
  - APK: `winget install EclipseAdoptium.Temurin.17.JDK` lalu set `JAVA_HOME`,
    Android SDK ikut diunduh Gradle saat build pertama (atau Android Studio).
  - EXE: `winget install Rustlang.Rustup` + `winget install Microsoft.VisualStudio.2022.BuildTools`
    dengan workload `Microsoft.VisualStudio.Workload.VCTools`, lalu `npx tauri build`.

## Prasyarat sekali saja

| Target | Butuh |
|---|---|
| Web | Node 22+ |
| APK | Android Studio (SDK 34), JDK 17, `JAVA_HOME` terisi |
| EXE | Rust toolchain (`rustup`), VS Build Tools (Windows) |

## 0. Build web (wajib untuk kedua target)

```bash
npm run build --workspace @sofo/shared
npm run build --workspace @sofo/web   # output: apps/web/dist
```

## 1. APK — Capacitor

```bash
npm install -w @sofo/web --save-dev @capacitor/cli @capacitor/core @capacitor/android
npx cap add android          # sekali: membuat apps/web/android
npx cap sync android         # setelah tiap build web
npx cap open android         # buka di Android Studio → Build APK
# atau tanpa Android Studio:
cd apps/web/android && ./gradlew assembleDebug   # APK debug
./gradlew assembleRelease                        # APK rilis (butuh signing)
```

- `capacitor.config.json` → `server.url` menunjuk ke URL web/API produksi.
  Saat dev di emulator Android, `10.0.2.2` = localhost host.
- Ganti `cleartext: false` dan pakai HTTPS saat produksi.

## 2. EXE — Tauri 2

```bash
cd apps/web
npm install -D @tauri-apps/cli
npx tauri build              # installer NSIS + exe di src-tauri/target/release
npx tauri dev                # mode dev dengan hot reload
```

- `src-tauri/tauri.conf.json` → `frontendDist: ../dist` memakai hasil build web.
- Ikon: letakkan `icons/icon.ico` (minimal 256px) di `apps/web/src-tauri/icons/`
  (bisa dibuat dengan `npx tauri icon path/ke/logo.png`).

## 3. Catatan lintas platform

- API_URL: web dev pakai proxy Vite (`/api` → :4001). Di APK/EXE produksi,
  pastikan origin `server.url`/`frontendDist` sama origin dengan API, atau set
  CORS di NestJS untuk origin aplikasi.
- Socket.IO: koneksi websocket ikut origin yang sama (`io('/')` di
  `lib/socket.ts`) — tidak perlu perubahan saat dibungkus WebView.
