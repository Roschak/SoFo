# SOFO — Phase 26 BETA: Distribusi & Daftar Tester (PRD §97)

> Status: **BETA 1 (`v0.1.0-beta.1`)** — dibangun 2026-09-26 dari commit `65e1e91`.
> Berisi seluruh fitur: MVP P0+P1, moderasi komunitas, portal client, recurrence
> kalender, feedback loop (Phase 27).

## 1. Artefak rilis (SUDAH DIBANGUN & terverifikasi)

| File | Target | Catatan |
|---|---|---|
| `data/sofo-v0.1.0-beta.1-release.apk` (3.3 MB) | Android | **Signed release** — diverifikasi `apksigner` (CN=SOFO Souloffice, SHA-256 `9355dad6…`) |
| `data/sofo-v0.1.0-beta.1-debug.apk` (4.3 MB) | Android | Debug — untuk tester yang butuh log/error mentah |

EXE Windows: tetap via CI — push tag `v*` atau manual dispatch di
`.github/workflows/release.yml` → artifact `sofo-windows-exe` (Tauri 2).

## 2. Prasyarat tester (Android)

1. HP/tablet Android **8.0+ (API 26+)** — sesuai `minSdkVersion` Capacitor.
2. Download APK (release untuk pemakaian normal, debug untuk pelaporan detail).
3. Izinkan "Install dari sumber tidak dikenal" untuk browser/file manager yang dipakai.
4. Install → buka SOFO → mendaftar akun baru → buat/bergabung workspace.
5. **PENTING — server**: APK adalah WebView aplikasi; backend API harus
   berjalan dan terjangkau. Beta ini menyambung ke server development.

## 3. ⚠️ Backend untuk beta (KEPUTUSAN OWNER)

APK menyambung ke URL API yang dikonfigurasi pada build (lihat
`capacitor.config.json`). Pilihan untuk beta:

| Opsi | Cara | Cocok untuk |
|---|---|---|
| A. Laptop owner jadi server (WiFi sama) | Jalankan `npm run dev -w @sofo/api`, tester set URL ke `http://<IP-laptop>:4001` | 2–5 tester dekat |
| B. VPS murah (DigitalOcean/Hetzner dst.) | Deploy `apps/api` + Postgres, HTTPS via Caddy/Nginx | Beta publik kecil |

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
   (atau formulir: bisa pakai Google Forms sederhana — link diisi owner).
2. OWNER/ADMIN buka menu Feedback → urutkan (OPEN dulu, vote terbanyak).
3. Putuskan tiap item: REVIEWED / ACCEPTED (masuk backlog) / REJECTED (+catatan).
4. Tester menerima notifikasi keputusan otomatis — loop tertutup.
5. Item ACCEPTED → masuk `docs/notes/03-BELUM-DIKERJAKAN.md` untuk sesi berikutnya.

## 7. Known issue & batas beta (PRD §133)

- Server beta = mesin dev (opsi A) atau belum ada (opsi B belum disiapkan) —
  uptime tidak dijamin; jangan pakai data produksi nyata.
- Realtime & notifikasi butuh koneksi WebSocket stabil (jaringan kantor yang
  memblokir WS dapat mengganggu — status koneksi terlihat di pojok kiri bawah).
- Rate limit login 20 req/5 menit/IP — tester jangan spam login.
- Eksperimen: data beta **bisa hilang** saat reset DB — informasikan ke tester.

## 8. Checklist rilis beta ini

- [x] Semua test hijau: 224 unit + 134 HTTP E2E + 15 realtime
- [x] APK release **signed** dibangun dari commit `65e1e91` + diverifikasi apksigner
- [x] APK debug dibangun (untuk tester teknis)
- [x] Menu Feedback siap menerima laporan tester
- [x] Known issue didokumentasikan (bagian 7)
- [ ] **Keputusan owner**: opsi backend beta (A WiFi lokal / B VPS + HTTPS)
- [ ] Isi daftar tester (bagian 4) + kirim APK + link formulir feedback
- [ ] EXE Windows: push tag `v0.1.0-beta.1` di GitHub → ambil artifact CI

## 9. Rollback (PRD §133)

Beta adalah build terpisah di perangkat tester; rollback = kirim APK versi
sebelumnya dan tester install ulang (uninstall dulu jika signature beda —
signature release saat ini konsisten via `sofo-release.jks`).
