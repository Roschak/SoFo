# SOFO — Phase 26 BETA: Distribusi & Daftar Tester (PRD §97)

> Status: **BETA 2 (`v0.1.0-beta.2`, versionCode 2)** — dibangun 2026-09-28.
> Berisi seluruh fitur: MVP P0+P1, moderasi komunitas, portal client, recurrence
> kalender, feedback loop (Phase 27), **+ konfigurasi Server URL in-app**.

## 1. Artefak rilis (SUDAH DIBANGUN & terverifikasi)

| File | Target | Catatan |
|---|---|---|
| `data/sofo-v0.1.0-beta.2-release.apk` (3.3 MB) | Android | **Signed release** — diverifikasi `apksigner` (CN=SOFO Souloffice, SHA-256 `9355dad6…`, konsisten dgn beta.1) |
| `data/sofo-v0.1.0-beta.2-debug.apk` (4.2 MB) | Android | Debug — untuk tester yang butuh log/error mentah |
| ~~`data/sofo-v0.1.0-beta.1-*.apk`~~ | — | **DISUSULKAN** — server URL lama `10.0.2.2` (emulator saja), tanpa layar Server URL |

Perubahan beta.2 vs beta.1: default server URL → `http://192.168.68.107:4001`
(laptop owner), layar **Server** di halaman login (native only) untuk ganti/uji
koneksi tanpa rebuild, CORS API multi-origin, versionCode 1→2.

EXE Windows: tetap via CI — push tag `v*` atau manual dispatch di
`.github/workflows/release.yml` → artifact `sofo-windows-exe` (Tauri 2,
versi `0.1.0-beta.2`).

## 2. Prasyarat tester (Android)

1. HP/tablet Android **8.0+ (API 26+)** — sesuai `minSdkVersion` Capacitor.
2. Download APK beta.2 (release untuk pemakaian normal, debug untuk pelaporan detail).
3. Izinkan "Install dari sumber tidak dikenal" untuk browser/file manager yang dipakai.
4. **Sambungkan ke WiFi yang sama dengan laptop owner** (beta = server lokal).
5. Install → buka SOFO → di layar login bagian **Server**:
   pastikan berisi `http://192.168.68.107:4001` → tap **Simpan & uji koneksi**
   sampai muncul "Terhubung (… ms)". Kalau gagal: cek WiFi, server hidup, dan
   firewall Windows owner (izinkan Node.js saat prompt pertama).
6. Mendaftar akun baru → buat/bergabung workspace.
7. **PENTING — server**: APK adalah WebView aplikasi; backend API harus
   berjalan dan terjangkau. Server beta = laptop owner (Opsi A).

## 3. Backend untuk beta — KEPUTUSAN OWNER: **Opsi A (WiFi lokal)** ✅

> Diputuskan owner 2026-09-28 (persetujuan penuh semua opsi). Backend beta =
> laptop owner jadi server di jaringan WiFi lokal; VPS+HTTPS ditunda sampai
> beta publik / tester di luar jaringan.

APK menyambung ke URL server yang **bisa diubah tester langsung dari aplikasi**
(layar pertama sebelum login), tanpa rebuild APK:

- Persisten (localStorage), default `http://192.168.68.107:4001`.
- Berlaku untuk REST API (`/api/v1/...`) dan WebSocket (`/socket.io/...`).
- Web desktop (browser/Tauri/EXE) tetap same-origin `/api/v1` — tidak terpengaruh.
- 📡 Getaran singkat setelah "Simpan" = sinyal uji koneksi server gagal.
- ⚠️ APK beta dibangun sebelum fitur ini memakai URL lama (10.0.2.2) —
  **rebuild APK baru diperlukan**; APK lama = dev emulator saja.

| Opsi | Cara | Cocok untuk |
|---|---|---|
| **A. Laptop owner jadi server (WiFi sama) — DIPAKAI** | Jalankan `npm run dev -w @sofo/api`, tester set `http://192.168.68.107:4001` di layar Server URL aplikasi, izinkan port 4001 di firewall Windows | 2–5 tester dekat |
| B. VPS murah (DigitalOcean/Hetzner dst.) | Deploy `apps/api` + Postgres, HTTPS via Caddy/Nginx | Beta publik kecil — DITUNDA |

> ⚠️ Opsi A tidak untuk tester di luar jaringan; Opsi B wajib HTTPS karena
> WebView produksi memblokir cleartext HTTP. Keputusan dan biaya = owner
> (PRD §101/§102: AI berhenti di sini dan meminta keputusan human).

## 4. Target tester (PRD §97) — daftar & kanal distribusi

Minimal 5–10 tester untuk beta terbatas, dari tiap segmen target user:

| Segmen (PRD §5) | Nama tester | Kontak | APK | Status |
|---|---|---|---|---|
| Freelancer | _(isi)_ | | release | ⬜ |
| Agency | _(isi)_ | | release | ⬜ |
| UMKM / bisnis kecil | _(isi)_ | | release | ⬜ |
| Komunitas | _(isi)_ | | release | ⬜ |
| Enterprise/staff | _(isi)_ | | release | ⬜ |

Kanal distribusi sederhana: **Google Drive / WhatsApp / Telegram** — cukup
kirim file APK langsung ke tester (beta terbatas tidak butuh Play Store).
Kirim juga link formulir feedback (bagian 6).

## 5. Skenario uji yang diminta ke tester (PRD §138 ringkas)

1. Daftar akun baru + login.
2. Buat workspace (coba keduanya: ENTERPRISE dan COMMUNITY).
3. Undang anggota lain (pakai email yang sudah terdaftar), beri role.
4. Buat channel, kirim pesan, edit/hapus pesan sendiri, reply (thread).
5. Upload file (≤25 MB), download, hapus.
6. Buat meeting → mulai → tulis live notes → akhiri → lihat arsip.
7. Buat project + task, assign ke anggota, geser status (kanban).
8. Kalender: buat event sekali & event **berulang** (baru!), cek pengingat 7 hari.
9. ENTERPRISE: clock in/out presensi, ajukan request (cuti/reimburse), cek approval owner.
10. COMMUNITY: kirim pesan sebagai MEMBER (masuk moderasi), moderator approve/remove.
11. Beri **feedback lewat menu Feedback di aplikasi** (bug/usulan fitur, vote) — dogfooding!
12. Logout, login ulang, pastikan sesi & data kembali.

## 6. Loop feedback beta (PRD §98) — alur operasional

1. Tester menemukan bug/ide → kirim lewat **menu Feedback** di aplikasi
   (atau formulir: template siap-copy di `07-FEEDBACK-FORM-TEMPLATE.md`
   — owner tinggal pindahkan ke Google Forms dan isi link di §4).
2. OWNER/ADMIN buka menu Feedback → urutkan (OPEN dulu, vote terbanyak).
3. Putuskan tiap item: REVIEWED / ACCEPTED (masuk backlog) / REJECTED (+catatan).
4. Tester menerima notifikasi keputusan otomatis — loop tertutup.
5. Item ACCEPTED → masuk `docs/notes/03-BELUM-DIKERJAKAN.md` untuk sesi berikutnya.

## 7. Known issue & batas beta (PRD §133)

- Server beta = laptop owner (Opsi A, WiFi lokal) — uptime tidak dijamin;
  jangan pakai data produksi nyata. Server hanya hidup saat owner menjalankannya.
- Firewall Windows belum diizinkan untuk port 4001 (butuh elevasi admin):
  saat tester pertama konek, owner harus klik **Allow** pada prompt Windows
  untuk Node.js (jalankan sekali saja).
- Realtime & notifikasi butuh koneksi WebSocket stabil (jaringan kantor yang
  memblokir WS dapat mengganggu — status koneksi terlihat di pojok kiri bawah).
- Rate limit login 20 req/5 menit/IP — tester jangan spam login.
- IP WiFi bisa berubah (DHCP) — tester cukup ubah URL di layar Server,
  tanpa rebuild APK.
- Eksperimen: data beta **bisa hilang** saat reset DB — informasikan ke tester.

## 8. Checklist rilis beta ini

- [x] Semua test hijau: 236 unit + 134 HTTP E2E + 15 realtime (server beta live)
- [x] **Keputusan owner**: Opsi A — WiFi lokal (2026-09-28, lihat bagian 3)
- [x] APK beta.2 release **signed** dibangun + diverifikasi apksigner (signature konsisten)
- [x] APK debug dibangun (untuk tester teknis)
- [x] Server URL configurable in-app + probe koneksi + getaran gagal (12 unit test baru)
- [x] CORS API multi-origin (Capacitor shell + LAN) — preflight origin APK terverifikasi 204
- [x] Server beta live: health OK via LAN IP, DB up, E2E 134/134 + 15/15 dijalankan ulang
- [x] Menu Feedback siap menerima laporan tester
- [x] Known issue didokumentasikan (bagian 7)
- [ ] **Owner**: jalankan API saat sesi beta (`npm run build -w @sofo/api && node apps/api/dist/main.js` — DB Docker `sofo-db` harus hidup) + izinkan Node.js di firewall saat prompt Windows pertama
- [ ] Isi daftar tester (bagian 4) + kirim APK beta.2 + link formulir feedback
- [ ] EXE Windows: push tag `v0.1.0-beta.2` di GitHub → ambil artifact CI

## 9. Rollback (PRD §133)

Beta adalah build terpisah di perangkat tester; rollback = kirim APK versi
sebelumnya dan tester install ulang (uninstall dulu jika signature beda —
signature release saat ini konsisten via `sofo-release.jks`).
