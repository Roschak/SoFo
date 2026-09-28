# SOFO — SESSION NOTES (Wajib dibaca sebelum lanjut kerja)

> Aturan: **sebelum sesi berakhir (atau terasa akan putus), tulis kondisi terakhir di sini.**
> Tujuan: siapa pun (atau sesi baru) bisa lanjut tanpa kehilangan konteks.

---

## Sesi #8 lanjutan 2 — 2026-09-28 — Regression penuh via LAN + fix CI/Release — SELESAI ✅

### Regression penuh di server LAN (semua hijau, 195/195)
| Suite | Hasil |
|---|---|
| beta-flow.mjs | **46/46** |
| http-smoke.mjs | **134/134** |
| realtime-smoke.mjs | **15/15** |

(Gotcha terkonfirmasi ulang: restart API antar suite — rate limit auth 20/5menit
membuat realtime-smoke kena UNAUTHENTICATED kalau dijalankan tepat setelah http.)

### CI/Release gagal — akar masalah ditemukan & diperbaiki
1. **Release/EXE (tag v0.1.0-beta.2)**: `icons/icon.ico not found` — folder
   `src-tauri/icons/` TIDAK PERNAH ter-commit (kosong sejak dibuat). Fix:
   `npx tauri icon` dari launcher Android → 38 file ikon (ico/icns/png +
   android/ios) ter-commit. Android res tidak berubah (regenerate identik).
2. **Release/APK job**: `android-actions/setup-android@v3` gagal — menginstall
   paket legacy `tools` yang sudah DIHAPUS dari SDK repo. Fix: hapus step
   (ubuntu-latest sudah punya SDK preinstalled + lisensi accepted).
3. **CI (merah sejak 22 Sep — BUKAN karena perubahan Sesi #8)**:
   `npm ci` tidak menjalankan `prisma generate` (postinstall hoisted workspace
   tidak menemukan schema apps/api) → Prisma client tidak tergenerate →
   ratusan TS7006 implicit-any. Fix: step eksplisit `prisma:generate` di kedua
   job quality + smoke.

### Dokumen baru
- `docs/notes/08-BETA-DISTRIBUSI-SATUHALAMAN.md` — panduan distribusi satu
  halaman siap kirim ke tester (setup, 11 skenario, cara melapor, batasan).

### Yang BELUM selesai
- Re-run Release workflow (tag baru `v0.1.0-beta.2b` atau re-run manual) untuk
  memastikan EXE+APK hijau di CI; ambil artifact `sofo-windows-exe`.
- Isi daftar tester + kirim APK beta.2 + link form (owner).

---

## Sesi #8 lanjutan — 2026-09-28 — Beta flow E2E + template formulir feedback — SELESAI ✅

### Yang sudah selesai
- **`apps/api/test/beta-flow.mjs`** (BARU, 46 checks): mensimulasikan perjalanan
  tester 06-BETA §5 secara end-to-end — register/login, 2 workspace (mode),
  invite+role (3 user: tester/friend→MANAGER/colleague MEMBER), chat realtime
  2 socket (kirim/edit/reply/hapus broadcast), file, meeting+join+live notes,
  kanban task, kalender **recurrence WEEKLY** + reminders, presensi +
  request/approve + self-approval ban, moderasi COMMUNITY, feedback loop penuh
  (submit→vote→decide→**notif loop tertutup**), logout→login ulang.
  Jalankan: `BASE_URL=http://192.168.68.107:4001/api/v1 \
  WS_URL=http://192.168.68.107:4001 node apps/api/test/beta-flow.mjs`.
- **Hasil: 46/46 PASSED via server LAN** `http://192.168.68.107:4001` —
  alur tester beta terverifikasi penuh (dijalankan 4x iterasi perbaikan script).
- **Template formulir feedback**: `docs/notes/07-FEEDBACK-FORM-TEMPLATE.md`
  (Google Forms siap-copy + chat broadcast WA/Telegram + triage owner).

### Temuan saat verifikasi (bukan bug API — semua perilaku benar)
- `MEMBER` tidak punya `message.delete` & `request.create` hanya STAFF/MEMBER —
  sesuai permission matrix; script beta-flow menyesuaikan (pengaju = MEMBER).
- Live note hanya untuk participant/host → tester harus "Ikut" meeting dulu
  (persis alur UI) — didokumentasikan di script.
- Notifikasi `feedback.decided` dibuat listener async → butuh ±1 detik;
  script memakai polling 6×400ms (realistis dgn UI yang poll).
- Shape API terkonfirmasi ulang: invite `{success}` (memberId via list),
  calendar `{items}`, notifications `{items}`, `MessageDeletedEvent.messageId`.

### Yang BELUM selesai
- Isi daftar tester + kirim APK beta.2 + link form (owner, lihat §4 06-BETA).
- Status CI run `v0.1.0-beta.2` (EXE) — dicek owner di tab Actions.

---

## Sesi #8 — 2026-09-28 — Beta 2: Server URL in-app + Opsi A (WiFi lokal) + server live — SELESAI ✅

> Owner menyetujui SEMUA langkah di awal sesi ("setuju semuanya, proceed").
> Keputusan backend beta (PRD §102): **Opsi A — laptop owner jadi server via WiFi lokal**.

### Yang sudah selesai
- **Ditemukan blocker beta.1**: `capacitor.config.ts` masih `http://10.0.2.2:5173`
  (emulator-only) — APK beta.1 tidak akan bisa konek ke server di HP tester asli.
- **Server URL configurable in-app** (semua ADDITIVE):
  - `web/src/lib/server-config.ts`: load/save/validate/reset URL (localStorage),
    `isNativePlatform()`, `resolveApiBase()` (web tetap same-origin `/api/v1`),
    `probeServer()` via `/api/v1/health`.
  - `lib/api.ts` + `lib/socket.ts` memakai base dari server-config (native only);
    per-request resolve → ganti server langsung efektif tanpa reload.
  - AuthScreen: bagian **Server** (hanya native) — Simpan & uji koneksi
    ("Terhubung (n ms)" / gagal → `navigator.vibrate`), tombol Pakai default.
  - 12 unit test baru (`server-config.spec.ts`) → web 101/101.
- **CORS multi-origin**: `CORS_ORIGIN` kini comma-separated list; `env.corsOrigins`
  dipakai `enableCors` (`.env` + `.env.example` diupdate). Preflight dari origin
  APK (`https://localhost`) terverifikasi 204.
- **Rebuild APK beta.2** (`v0.1.0-beta.2`, versionCode 1→2): release signed
  3.3 MB + debug 4.2 MB, `apksigner` OK (CN=SOFO Souloffice, SHA-256 `9355dad6…`
  — signature konsisten dgn beta.1 → upgrade install mulus). Artefak:
  `data/sofo-v0.1.0-beta.2-*.apk` (beta.1 disusulkan).
- **Server beta LIVE** (Sesi #8): `sofo-db` distart, API `dist/main.js` di
  `0.0.0.0:4001` (nohup, log `data/beta-api.log`), health OK via LAN IP
  `http://192.168.68.107:4001`.
- **Verifikasi ulang penuh di server beta live**: unit 236/236 (127 API + 101 web
  + 8 shared), lint/typecheck 0, HTTP E2E **134/134**, realtime **15/15**.
- Tauri `version` → `0.1.0-beta.2` (konsistensi EXE via CI).

### Keputusan / temuan
- Beta.1 TIDAK layak dibagikan ke tester (URL emulator) — beta.2 wajib dipakai.
- Firewall Windows utk port 4001 butuh elevasi admin (dibatalkan sesuai preseden
  Sesi #6): saat tester pertama konek, owner klik **Allow** pada prompt Node.js.
- IP LAN owner saat ini: `192.168.68.107` (DHCP — bisa berubah; tester cukup
  ubah URL di layar Server, tanpa rebuild).
- API listen `0.0.0.0` default Nest — tanpa perubahan kode.

### Yang BELUM selesai (lanjutkan di sini)
- Push main + tag `v0.1.0-beta.2` → EXE Windows via CI (dilakukan di akhir sesi).
- Isi daftar tester (06-BETA §4) + kirim APK beta.2 + link formulir feedback.
- Sisa opsional: Redis adapter, FCM push, i18n — lihat `03-BELUM-DIKERJAKAN.md`.

### Peringatan
- Server beta hanya hidup saat owner menjalankannya (lihat checklist 06-BETA §8
  untuk perintah start). Smoke berulang cepat → 429 rate limit (restart API).
- Prisma generate EPERM jika server jalan (Windows) — matikan dulu (preseden Sesi #2f).

---

## Sesi #7 — 2026-09-26 — Recurrence Kalender + Feedback Loop (Phase 27) + Runbook — SELESAI ✅

> Rekap penuh: `docs/notes/05-SESI-7-REKAP.md`. Ringkasan:

### Yang sudah selesai (semua ADDITIVE — tidak ada modul lama yang diubah)
- **Recurrence kalender (PRD §86 lanjutan)**: kolom `recurrence`/`recurrenceUntil`
  + migration, `expandRecurrence()` DAILY/WEEKLY per query range, validasi create
  (span maks 2 tahun), UI selector Berulang + hint jumlah occurence + prefix ↻.
- **Feedback loop (PRD §98, Phase 27 ✅)**: model `Feedback`/`FeedbackVote` +
  migration, permission `feedback.decide` (OWNER/ADMIN), modul API
  `modules/feedback` (submit/vote/list/decide, idempotent vote 409,
  sekali-putus 409), UI `FeedbackView` (kirim/vote/filter/keputusan),
  notifikasi `feedback.submitted`/`feedback.decided` via event bus, audit
  `feedback.decide`, nav Feedback di ChatShell.
- **Dokumentasi**: `README.md` (root) + `docs/RUNBOOK.md` (health, backup,
  restore, migration, rate limit, insiden, release) — melengkapi Phase 25.

### Hasil verifikasi (semua hijau)
| Check | Hasil |
|---|---|
| Unit tests | 224/224 (127 API + 89 web + 8 shared) |
| HTTP E2E | 134/134 (+22 acceptance baru) |
| Realtime E2E | 15/15 |
| Lint / typecheck / build | 0 error, 3 workspace |
| Migration | 2 baru applied (recurrence, feedback_loop) |

### Keputusan / temuan
- 3 failure smoke awal = bug ekspektasi test + 1 bug service vote count
  (hardcoded 1 → refetch setelah create). Semua diperbaiki; detail di rekap.
- Tanggal di smoke kini dinamis (`isoDay()` UTC) — kebal drift waktu.
- Smoke berulang cepat memicu 429 (rate limit auth) → restart API sebelum run.

### Yang BELUM selesai (lanjutkan di sini)
- Lihat `docs/notes/03-BELUM-DIKERJAKAN.md` — tinggal item opsional
  (Redis adapter, FCM push, i18n, signing key store) + Phase 26 Beta
  (butuh keputusan owner).

### Tambahan akhir Sesi #7 — verifikasi ulang + commit + BETA 1 ✅
- Verifikasi penuh diulang dari nol: lint 0, typecheck 0, unit 224/224,
  build sukses, HTTP E2E **134/134**, realtime **15/15** — semua hijau.
- Commit: `65e1e91` (33 file, +2353/−30).
- **Phase 26 Beta dimulai**: APK release **signed** v0.1.0-beta.1 (3.3 MB)
  + debug (4.3 MB) dibangun dari commit ini (`cap sync` + `gradlew
  assembleDebug assembleRelease`, Java 17 user-space), diverifikasi
  apksigner (CN=SOFO Souloffice). Artefak disalin ke `data/sofo-v0.1.0-beta.1-*.apk`.
- Panduan beta lengkap (tester list, distribusi, skenario uji, loop
  feedback, known issue, rollback): `docs/notes/06-BETA-PHASE26.md`.
- **Perlu keputusan owner (PRD §102)**: backend untuk tester — WiFi lokal
  atau VPS + HTTPS. EXE Windows: push tag `v0.1.0-beta.1` → artifact CI.

---

## Sesi #6 — 2026-09-22 — Audit E2E + P2 (Moderasi & Portal Client) + APK Fisik — SELESAI ✅

### Yang sudah selesai
- **Audit end-to-end awal**: seluruh notes dibaca, semua uncommitted diverifikasi
  (181 unit, 100/100 HTTP, 15/15 realtime, lint/typecheck/build hijau), DB Docker
  `sofo-db` :5433 dihidupkan, migration 8/8 applied.
- **Community Moderation (PRD §93)**:
  - `Message.status` enum baru (VISIBLE/PENDING_REVIEW/REMOVED) + migration
    `20260922070221_add_message_moderation` (+FK moderatedBy, index status).
  - Permission baru `message.moderate` + `moderation.queue.view` (MODERATOR/ADMIN/OWNER).
  - Otomatis: pesan member biasa di workspace COMMUNITY → PENDING_REVIEW;
    moderator/owner langsung VISIBLE; feed member hanya VISIBLE.
  - API: `GET /moderation/queue`, `POST /messages/:id/approve|remove`
    (audit + realtime `message.moderated` + notifikasi `message.pending` via event bus).
  - UI `ModerationQueueView` (scroll reveal) + nav "Moderasi" (COMMUNITY + role gate).
  - Refactor anti-duplikasi (PRD §110): `realtime.types.ts` API kini re-export
    `@sofo/shared` (kontrak tunggal), `MessageRealtimeView` + `status` ISO-string.
- **Portal Client/Guest (PRD §51, §94)**: `ClientPortalView` read-only
  (pengumuman channel pertama, proyek, dokumen) — otomatis untuk role CLIENT/GUEST.
- **APK fisik BERHASIL**: JDK 17 (Adoptium ZIP user-space) + Android SDK
  cmdline-tools (tanpa admin) → `gradlew assembleDebug` OK (±4.3 MB).
  Pin Java 17 via `afterEvaluate` di root `build.gradle` (Capacitor template
  memakai VERSION_21, ditolak JDK 17). `local.properties` dibuat (jangan di-commit).
- **EXE tanpa Visual Studio** (keputusan owner): release workflow
  `.github/workflows/release.yml` membangun EXE (Tauri 2) + APK di GitHub runner
  saat push tag `v*` / manual dispatch → artifact `sofo-windows-exe`/`sofo-android-apk`.
- Rust 1.98.1 terpasang lokal (opsional; EXE lokal tetap butuh MSVC → pakai CI).

### Hasil verifikasi akhir (semua hijau)
| Check | Hasil |
|---|---|
| Unit tests | **197/197** (111 API + 78 web + 8 shared) |
| HTTP E2E | **112/112** (+12 moderasi) |
| Realtime E2E | **15/15** |
| Typecheck + Lint (3 workspace) | **0 error** |
| Build shared+api+web | sukses; cap sync OK |
| APK | app-debug.apk 4.3 MB (aset terbaru) |

### Keputusan owner (Sesi #6)
- Commit name: `supabiggbang1`.
- Tidak install Visual Studio; EXE via CI release workflow.

### Peringatan
- Rate limit auth 20 req/5 menit per IP (PRD §139) — menjalankan smoke berulang
  cepat dapat memicu 429 pada register/login; restart server utk reset.
- `node_modules/@capacitor/android/capacitor/build.gradle` juga dipatch ke VERSION_17
  (root `afterEvaluate` sebenarnya sudah menimpa; patch manual cadangan).
- UAC untuk installer elevation dibatalkan owner → semua toolchain dipasang
  user-space (tidak butuh admin).

---

## Sesi #5 — 2026-09-19 — Landing Portfolio Scroll Animations, Attendance UI, Global Search & Master E2E Audit — SELESAI ✅

### Yang sudah selesai
- **Landing Page Portfolio & Animasi Scroll**:
  - Top scroll progress indicator (`scaleX(scrollProgress)`).
  - Background floating glowing ambient mesh dengan delay halus.
  - Interactive Product Portfolio Showcase: multi-tab preview switcher dengan 6 live mockups (Chat, Kanban, Meeting, Calendar, Approval, Attendance).
  - 3D perspective tilt reveal (`tilt-left`, `tilt-right`, `scale`, `up`) pada kartu produk portofolio.
  - Aksesibilitas penuh: `prefers-reduced-motion` mematikan efek jika diminta pengguna.
- **Attendance (Presensi Enterprise)**:
  - Ditemukan & diperbaiki bug controller API: parameter `dto: ClockInDto` tanpa `@Body()` decorator menyebabkan `dto` undefined saat clock-in.
  - UI `AttendanceView`: 1-tap clock in/out, status shift harian, durasi jam kerja, filter status, pencarian riwayat.
  - Terintegrasi ke navigasi `ChatShell` untuk workspace ENTERPRISE.
  - 6 unit test baru untuk `attendance-view.ts`.
- **Global Search (PRD §48, §90)**:
  - Modul baru di backend `SearchModule`: `GET /workspaces/:workspaceId/search?q=...&type=...`.
  - Authorization-aware filtering antar channel, message, project, task, file, dan member.
  - UI command palette / global search modal di `ChatShell` dengan filter chips dan hotkey `Ctrl+K`.
  - 3 unit test baru di `search.service.spec.ts`.
- **Packaging Web / APK / EXE**:
  - Web production build bersih di `apps/web/dist` via Vite.
  - Capacitor Android assets disinkronisasi ke `android/app/src/main/assets/public`.
  - Tauri 2 config terverifikasi untuk build executable Windows.

### Hasil Audit End-to-End
- **Unit Tests**: 153/153 PASS (86 API + 59 web + 8 shared).
- **HTTP Smoke Tests**: 94/94 PASS (100% acceptance, 0 failures).
- **Realtime WebSocket Smoke**: 15/15 PASS (100% acceptance, 0 failures).
- **TypeScript Typecheck**: 0 errors di seluruh 3 workspaces.
- **ESLint**: 0 errors, 0 warnings di seluruh 3 workspaces.
- **Production Build**: Sukses 100%.

---


## Sesi #2 — 2026-09-18 — RESUME: fix blocker `authorName` — SELESAI ✅

### Yang sudah selesai
- **Root cause sebenarnya ditemukan**: catatan Sesi #1c menduga generated client
  usang; faktanya `prisma/schema.prisma` sendiri BELUM punya relasi `author User`
  di model `Message`. Ditambahkan relasi + back-relation `messages Message[]` di
  `User` + migration `20260918071233_add_message_author_relation` (FK cascade).
- Prisma client regenerate → relasi `author` dikenali (grep 84 → 92).
- Unit test mock `communication.service.spec.ts` ditambah `author.displayName`.
- Hasil: semua endpoint message 201/200 dengan `authorName` terisi.

### Hasil verifikasi
- http-smoke **41/41**, realtime-smoke **15/15**, unit 37+8+7 = 52/52
- lint 0, typecheck 0, build sukses
- Commit: `d21cd60`

### Keputusan / temuan teknis
- Docker Desktop perlu dinyalakan manual dulu (daemon tidak auto-start);
  lokasi exe: `%LOCALAPPDATA%\Programs\DockerDesktop\Docker Desktop.exe`.
- File sampah `how --stat` di repo root TIDAK ikut di-commit (sisa typo shell);
  sudah dihapus di Sesi #2d.

### Sesi #2b — 2026-09-18 — Meetings + Live Notes UI — SELESAI ✅
- Web: `MeetingContext` (state + lifecycle + join + notes polling 5s),
  `MeetingsView` (list, jadwalkan, mulai/akhiri/arsip, ikut, live notes
  autosave 1.2s debounce + merge polling), nav "Meetings" di sidebar shell.
- `lib/meeting-view.ts` pure helpers (sort, mergeNotes, canWriteNotes,
  roleCanManageMeetings) + 9 unit test; web total 16/16 pass.
- Shape API diverifikasi live terhadap server :4001 (keys cocok dgn type UI).
- catatan: polling dipakai utk notes karena realtime event meeting belum ada
  di ADR-004 — ganti ke push saat notification/event bus (P1) dibuat.
- Commit: `11218e2`

### Sesi #2c — 2026-09-18 — Audit service + viewer (PRD §49) — SELESAI ✅
- `AuditService.record()` tidak pernah melempar (audit gagal hanya dilogger,
  business flow aman); query tenant-scoped + filter + cursor pagination (max 200).
- Permission baru `audit.view` di shared matrix (OWNER/ADMIN/MANAGER) —
  ⚠️ workspace yang dibuat SEBELUM perubahan ini masih pakai role seed lama
  (tanpa audit.view); hanya berlaku untuk workspace baru / setelah reseed.
- Entri auth (register/login) disimpan dengan `workspaceId: null` — global,
  tidak tampil di audit per-workspace (keputusan desain, bukan bug).
- Verifikasi: unit 42+8+16 = 66/66, http-smoke **48/48** (+7 audit acceptance),
  realtime 15/15, lint/typecheck 0, build sukses.
- Commit: (lihat git log sesi ini)

### Yang BELUM selesai (lanjutkan di sini)
- Lihat `docs/notes/03-BELUM-DIKERJAKAN.md` — P1 berikutnya: calendar,
  attendance, approval, notification, global search, admin dashboard.

### Sesi #2d — 2026-09-18 — Kerapian — SELESAI ✅
- File sampah `how --stat` di repo root dihapus (untracked, sisa typo shell;
  tidak ada perubahan git).

### Sesi #2e — 2026-09-18 — UI Audit log viewer — SELESAI ✅
- Web: `AuditView` (filter aksi/hasil, tabel newest-first, baris FAILURE
  disorot, expand metadata JSON, load-more cursor), nav "Audit log" hanya
  tampil untuk OWNER/ADMIN/MANAGER (canViewAudit). Helpers `audit-view.ts`
  + 5 unit test (web 21/21).
- **Bug API ditemukan & diperbaiki**: `limit` query param ditolak `@IsInt`
  karena datang sebagai string → VALIDATION_ERROR 400. Fix: `@Type(() => Number)`
  di `audit.dto.ts`. Terungkap saat verifikasi live UI (smoke lama tidak
  memakai limit — pelajaran: smoke perlu varian dengan limit).
- Verifikasi: web 21/21 + typecheck/lint/build hijau; http-smoke 48/48;
  API unit 42/42; live check `limit=10` + filter 200 OK.
- Commit: `bf14e07`

### Sesi #2f — 2026-09-18 — Calendar (PRD §41, §86) — SELESAI ✅
- API: model `CalendarEvent` + migration; `CalendarService` agregasi 4 sumber
  (event manual, meeting.scheduledAt, project.deadline, task.deadline) semua
  tenant-scoped & sorted; `GET .../calendar/reminders?horizonDays=` dengan
  `dueInDays` (window anchor = start of today supaya agenda hari ini ikut);
  `POST/DELETE .../calendar/events` gated `calendar.event.create` baru
  (OWNER/ADMIN/MANAGER) + audit `calendar.event.create/delete`.
- Web: `CalendarView` grid 6 minggu Monday-first (warna per kind: event ungu,
  meeting biru, deadline kuning; highlight hari ini), panel Pengingat 7 hari
  ("Hari ini/Besok/n hari lagi"), agenda bulan, dialog buat event; nav "Kalender".
- Gotcha Windows: `prisma generate` gagal EPERM kalau API server masih jalan
  (query engine DLL ter-lock) — matikan dulu server, lalu generate ulang.
- Verifikasi: http-smoke **56/56** (+8 calendar), API unit **49/49** (+7),
  web unit **28/28** (+7), lint/typecheck/build hijau, live check agregasi
  3 kind + reminders `event:0d`.
- Belum: push-notif reminder (§89), recurrence/event berulang.
- Commit: `411307f`

### Sesi #2g — 2026-09-18 — Request & Approval (PRD §88) — SELESAI ✅
- Model `Request` (tipe §44: LEAVE/REIMBURSEMENT/OPERATIONAL/DOCUMENT/PERMISSION)
  + migration; endpoint create/list/approve/reject/cancel di
  `/workspaces/:id/requests`.
- Aturan: `request.create` utk buat/lihat; `request.approve` utk putuskan;
  **self-approval ban** (403), decide ulang (409), cancel hanya requester & saat
  PENDING; list: approver lihat semua, non-approver lihat request sendiri
  (helper baru `AuthorizationService.hasPermission`).
- Audit semua transisi: request.create/approve/reject/cancel (PRD §45 hop audit).
- **Gotcha Nest ValidationPipe**: field optional di DTO body WAJIB `@IsOptional()`,
  kalau tidak `body: {}` → VALIDATION_ERROR 400 (dua kali kena: audit `limit`,
  request `note`). Untuk query param numerik pakai `@Type(() => Number)`.
- Verifikasi: http-smoke **69/69** (+13), API unit **61/61** (+12), realtime 15/15,
  lint/typecheck/build hijau.
- Commit: `8b28b2f`

---

## Sesi #4 — 2026-09-19 — Frontend P1 + Landing animasi scroll + APK/EXE — SELESAI ✅

### Yang sudah selesai
- Landing page portofolio produk dengan **animasi scroll** di setiap section
  (permintaan eksplisit owner): IntersectionObserver via `lib/scroll-reveal.ts`,
  dipakai juga di view baru (kanban/kartureveal). Aman `prefers-reduced-motion`.
- 4 view web baru: Requests, Projects (kanban drag-drop), Files, Members —
  semuanya wired ke ChatShell dengan guard per-peran.
- API baru: file list + file delete endpoint, user lookup by email,
  relasi `File.uploader` (+migration). Semua tenant-scoped & permission-gated.
- Packaging: Capacitor (APK) + Tauri 2 (EXE) — config + panduan di
  `docs/notes/04-BUILD-APK-EXE.md` (build butuh Android Studio / Rust toolchain,
  belum dijalankan di mesin ini).

### Bug yang ditemukan & diperbaiki saat verifikasi live
1. `DELETE /workspaces/:id/files/:fileId` belum ada di controller padahal UI
   memakainya → 404. Service `softDelete` sudah benar; endpoint ditambahkan.
2. Spec file.service awalnya ditulis gaya Vitest padahal API pakai Jest →
   diganti `import from '@jest/globals'`.
3. Import `./request.service` salah di `lib/request-view.ts` (tipe API dipakai
   lintas batas) → diganti interface lokal.

### Hasil verifikasi (semua hijau)
- http-smoke **80/80**, realtime-smoke **15/15**
- unit: API **70/70** (+2 file), shared 8/8, web **50/50** (+22)
- lint 0, typecheck 0, build sukses
- Probe live tambahan: upload→list→download→delete file, lookup email 200/404.
- **Tambahan (permintaan owner)**: scroll-reveal dipasang juga di view existing —
  Calendar (sel `scale`, reminder/agenda `right`, re-run saat ganti bulan),
  Audit (baris `up`, termasuk hasil 'load more'), Meetings (kartu `up`,
  catatan `right`, re-run saat buka meeting). Lint/typecheck/test 50/50/build
  diverifikasi ulang — tetap hijau.

### Yang BELUM selesai (lanjutkan di sini)
- Attendance, global search, admin dashboard (P1 API).
- Build fisik APK/EXE (butuh toolchain; lihat doc build).
- Org tree UI, a11y pass, responsive tuning.

---

## Sesi #3 — 2026-09-19 — Notification system (PRD §46/§47/§89, ADR-005) — SELESAI ✅

### Kondisi saat mulai
- Pekerjaan setengah jadi ditemukan di working tree (belum di-commit): API
  notification, event bus, migration, bell UI — semua TANPA verifikasi.

### Yang dikerjakan
- **3 bug ditemukan & diperbaiki:**
  1. `EventBusModule` `wildcard: false` → `true` (wajib untuk @OnEvent pola).
  2. **Akar masalah utama:** pola `@OnEvent('notification.%')` TIDAK pernah match
     event multi-segmen — `%` dan `*` eventemitter2 hanya match TEPAT SATU
     segmen. Fix: `notification.**`. Gejala licik: listener terdaftar, wildcard
     aktif, TAPI `emit()` return false & handler tak jalan.
  3. `decisionNote ?? null ?? undefined` → `?? undefined` (no-op typo).
- Perbaiki perhitungan `dueInDays` reminders (calendar-date diff, bukan ms-ceil).
- Tambah 11 acceptance E2E notification (§6e http-smoke): inbox per-user,
  actor filter, unread-count, mark read owner-only, read-all, 401.
- Update PROGRESS.md + 03-BELUM-DIKERJAKAN.md (calendar/request status yang
  tertinggal dari sesi lama juga diluruskan).

### Hasil verifikasi (semua hijau)
- http-smoke **80/80**, realtime-smoke **15/15**, unit 68+8+28 = **104/104**
- lint 0, typecheck 0, build sukses (shared+api+web)

### Peringatan
- POST tanpa @HttpCode = **201** (bukan 200) — smoke assertion pakai 200/201.
- `prisma generate` gagal EPERM kalau API server masih jalan (Windows).
- Verifikasi notification WAJIB lewat dist build baru — server dari dist lama
  diam-diam memakai kode lama (penyebab kebingungan awal).

---

## ⚠️ STOP DIMINTA OWNER — akhir Sesi #1c (2026-09-17)

Status berhenti: perbaikan `authorName` pada message API BELUM lolos E2E.
Blocker: Prisma client perlu regenerate (relasi `author` belum dikenali).

**Baca folder `docs/notes/` — dibuat khusus untuk ini:**
- `01-SUDAH-DIKERJAKAN.md` — semua yang selesai
- `02-SEDANG-DIKERJAKAN.md` — RESUME DI SINI + langkah persis + alternatif
- `03-BELUM-DIKERJAKAN.md` — peta kerja ke depan

Server API :4001 sudah dimatikan. DB Docker :5433 dibiarkan hidup.

---

## Sesi #1 — 2026-09-17 — Bootstrap Foundation + MVP P0 (API)

### STATUS AKHIR SESI (verifikasi end-to-end sudah dijalankan)
- `npm install` ✅ (543 packages)
- `npm run lint` ✅ 0 error
- `npm run typecheck` ✅ 0 error
- `npm test` ✅ 36/36 pass (28 API + 8 shared)
- `npm run build` ✅ sukses (shared + api)
- `prisma generate` ✅ (schema valid, relation Workspace↔OrgUnit diperbaiki)
- Audit no-duplication ✅: 0 TODO/placeholder/duplikat/dead code

### CATATAN PENTING: prisma migrate BELUM dijalankan
Butuh Docker Postgres aktif dulu:
```bash
docker compose -f apps/api/docker-compose.yml up -d
cp apps/api/.env.example apps/api/.env
cd apps/api && npx prisma migrate dev --name init_p0
```

### Sesi #1b — 2026-09-17 (lanjutan): E2E via HTTP — SELESAI
- Migration `init_p0` ✅ applied (port DB digeser ke 5433, API ke 4001 karena
  port 5432/3001 dipakai project lain di mesin ini — jangan dikembalikan)
- ⚠️ **OS env `DATABASE_URL` global (project aegis) menimpa .env** → selalu
  override inline: `DATABASE_URL=postgresql://sofo:sofo_dev@localhost:5433/sofo?schema=public`
- **2 bug ditemukan & diperbaiki oleh E2E:**
  1. `validateSession`/`logout` mencari token mentah padahal tersimpan ter-hash
     → sekarang `hashToken(token)` dipakai di lookup (security-relevant!)
  2. ValidationPipe `BadRequestException` lolos filter → 500; filter sekarang
     menormalkan HttpException Nest ke body standar SOFO tanpa kehilangan status
- Smoke test `apps/api/test/http-smoke.mjs`: **41/41 PASS** (auth, workspace,
  member, channel, message+thread, edit/delete policy, project, task+assignee,
  meeting lifecycle, notes, file upload/download, tenant isolation, logout)
- Cara jalankan: `node apps/api/test/http-smoke.mjs` (server harus live di :4001)

### Keputusan owner
- Stack dipilihkan oleh agent (mandat owner): **NestJS + React + PostgreSQL + Prisma**
- UI: **modern, custom design system, BUKAN template** (lihat ADR-003)
- Scope sesi: Foundation + MVP P0

### Yang sudah selesai
- Monorepo: `apps/api` (NestJS), `apps/web` (belum dibangun), `packages/shared`
- Kontrak: error codes (§56), permission matrix + roles (§25/§27) di `packages/shared`
- Prisma schema lengkap P0+P1 models: User, Session, Workspace, WorkspaceMember, Role,
  OrgUnit, Channel, Message, File, Meeting, MeetingParticipant, MeetingNote, Project, Task, AuditLog
- Modules API: identity, authentication, workspace, authorization, organization,
  communication, file, meeting, project
- Unit tests: authorization (3), authentication (5), workspace (1), communication (4),
  meeting (5), project (5), shared permissions (5), shared errors (3)

### Cara menjalankan (untuk sesi berikutnya)
```bash
npm install
docker compose -f apps/api/docker-compose.yml up -d
cp apps/api/.env.example apps/api/.env
npm run prisma:migrate -w @sofo/api   # migration pertama
npm run build -w @sofo/shared          # WAJIB sebelum typecheck api
npm run test                           # semua unit test
npm run dev -w @sofo/api               # server di :3001
```

### Yang BELUM selesai (lanjutkan di sini — jangan mulai dari nol)
1. **Prisma migration** — jalankan blok perintah di atas (butuh Docker Postgres).
2. **Realtime P0** (PRD §33, §80): WebSocket gateway NestJS untuk message/presence/typing.
   Desain dulu di ADR baru sebelum coding.
3. **E2E test** (PRD §138): register→login→workspace→channel→message flow.
4. **apps/web**: frontend React + Vite + design system custom (ADR-003). Belum ada satu file pun.
5. **Audit service** (PRD §49): model sudah ada, tulis AuditService + viewer endpoints.
6. **CI pipeline** (PRD §134): lint → typecheck → test → build.

### Peringatan untuk sesi berikutnya
- JANGAN buat module duplikat — cek dulu daftar module di atas (PRD §110).
- Semua endpoint workspace-scoped WAJIB `@RequirePermission(...)` (PRD §55).
- Token session disimpan TER-HASH di DB — jangan ubah tanpa migrasi.
- `npm run build -w @sofo/shared` harus jalan sebelum typecheck API (path alias @sofo/shared).

---

## Sesi #1c — 2026-09-17 (lanjutan): Realtime P0 — SELESAI

### Yang sudah selesai
- ADR-004 (desain realtime) → RealtimeModule: gateway Socket.IO + service
  presence/typing (TTL 6s) + broadcaster
- Auth handshake via middleware socket.io — koneksi ditolak SEBELUM accept jika
  token invalid (mencegah race condition event vs auth, PRD §33)
- Room = tenant boundary: `ws:<id>` join server-side + membership check;
  `user:<id>` reserved untuk notification P1
- Join/leave idempotent per socket (duplicate join tidak double-count presence)
- Broadcast dari CommunicationService SETELAH commit DB: message.created /
  message.updated / message.deleted
- presence.updated otomatis saat join/leave/disconnect; typing.updated TTL

### Bug yang ditemukan E2E dan diperbaiki
1. Race condition: `workspace.join` bisa dieksekusi sebelum `handleConnection`
   async selesai → auth dipindah ke handshake middleware.
2. Double-count presence pada join duplikat → idempotent join/leave.
3. socket.io mengosongkan rooms sebelum `handleDisconnect` → tracking manual
   `joinedWorkspaces` Map per socket id.

### Hasil verifikasi
- Realtime E2E (`test/realtime-smoke.mjs`, 2 user): **15/15 pass**
- Regression HTTP (`test/http-smoke.mjs`): 41/41 pass
- Unit: 45/45, lint 0, typecheck 0, build OK

### Yang BELUM selesai (lanjutkan di sini)
1. Audit service + viewer (PRD §49) — model sudah ada
2. apps/web frontend (design system custom, ADR-003)
3. CI pipeline (PRD §134)
4. Redis adapter untuk socket scaling multi-instance (P2)

---

## Template entri baru (copy saat mulai sesi)

```
## Sesi #N — TANGGAL — FOKUS

### Yang sudah selesai
-

### Keputusan
-

### Yang BELUM selesai (lanjutkan di sini)
-

### Peringatan
-
```
