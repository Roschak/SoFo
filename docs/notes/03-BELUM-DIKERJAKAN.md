# BELUM DIKERJAKAN (Status Sesi #7 — 2026-09-26)

> Dokumen ini mencatat item yang masih menjadi pekerjaan lanjutan setelah Sesi #7.
> Rekap lengkap Sesi #7: `05-SESI-7-REKAP.md`.

---

## 1. Status P1 & P2 setelah Sesi #6
- [x] **Admin Dashboard (PRD §92)**: SELESAI (sesi sebelumnya + terverifikasi Sesi #6).
- [x] **Organization Tree UI (PRD §28, §77)**: SELESAI & ter-wire di ChatShell.
- [x] **Community Moderation (PRD §93)**: SELESAI Sesi #6 —
  schema `Message.status` (VISIBLE/PENDING_REVIEW/REMOVED) + migration,
  otomatis PENDING_REVIEW utk non-moderator di workspace COMMUNITY,
  queue + approve/remove API (audit + realtime `message.moderated`),
  UI `ModerationQueueView` dengan scroll reveal, 12 acceptance E2E baru,
  notifikasi `message.pending` ke moderator via event bus (ADR-005).
- [x] **Portal Client/Guest (PRD §51, §94)**: SELESAI Sesi #6 —
  `ClientPortalView` read-only (pengumuman, proyek, dokumen),
  otomatis aktif untuk role CLIENT/GUEST.
- [x] **Rate limiting, health check, CI quality+release workflow, backup script**:
  SELESAI & terverifikasi (112/112 HTTP E2E, 15/15 realtime).

## 2. Build Binary
- [x] **APK**: BERHASIL dibangun fisik — `apps/web/android/app/build/outputs/apk/debug/app-debug.apk`
  (±4.3 MB, debug, Java 17 + Android SDK user-space di `~/sofo-tools`, tanpa admin).
  - Java 17 dipin via `afterEvaluate` di `apps/web/android/build.gradle`
    (template Capacitor memakai VERSION_21 yang ditolak JDK 17).
- [x] **EXE**: BUKAN via lokal — owner menolak install Visual Studio.
  Solusi: `.github/workflows/release.yml` membangun EXE (Tauri 2) + APK
  otomatis di GitHub runner. Jalankan: push tag `v*` atau manual dispatch,
  lalu ambil artifact `sofo-windows-exe` / `sofo-android-apk`.
- Rust toolchain 1.98.1 sudah terpasang lokal (di luar scope EXE karena
  MSVC link.exe tetap dibutuhkan; toolchain GNU bisa dipakai manual:
  `rustup default stable-gnu` bila ingin eksperimen lokal tanpa VS).

## 3. Sisa item lanjutan (opsional / skala berikutnya)
- [x] **Event recurrence/kalender berulang** — SELESAI Sesi #7 (DAILY/WEEKLY,
  expansion per query, UI + test).
- [x] **Feedback loop (Phase 27)** — SELESAI Sesi #7 (Feedback + FeedbackVote,
  API feedback module, UI FeedbackView, notifikasi feedback.submitted/decided,
  audit feedback.decide).
- [x] **Runbook + README** — SELESAI Sesi #7 (docs/RUNBOOK.md, README.md).
- [ ] Redis adapter untuk Socket.IO multi-instance (ADR-004) — saat butuh >1 replica.
- [ ] Signing key release APK (`assembleRelease` + keystore) sebelum publish store.
- [ ] Push notification (FCM) & reminder push (PRD §89 lanjutan).
- [ ] i18n penuh ID/EN (PRD §129) — arsitektur sudah mendukung.
- [ ] Phase 26 BETA — butuh keputusan owner: daftar tester, channel distribusi
      (APK signed via CI sudah siap di release workflow).
