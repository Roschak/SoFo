# SOFO — SESSION NOTES (Wajib dibaca sebelum lanjut kerja)

> Aturan: **sebelum sesi berakhir (atau terasa akan putus), tulis kondisi terakhir di sini.**
> Tujuan: siapa pun (atau sesi baru) bisa lanjut tanpa kehilangan konteks.

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
