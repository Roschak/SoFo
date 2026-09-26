# Sesi #7 — 2026-09-26 — Recurrence Kalender + Feedback Loop (Phase 27) + Runbook — SELESAI ✅

## Prinsip sesi ini
- TIDAK mengubah apa pun yang sudah benar & sejalan PRD (permintaan owner).
- Semua perubahan bersifat ADDITIVE (fitur baru / dokumen baru), nol refactor pada modul lama.

---

## 1. Yang Dikerjakan (baru)

### A. Recurrence Kalender (PRD §86 lanjutan — sisa item Sesi #2f)
- **Schema** `apps/api/prisma/schema.prisma`: model `CalendarEvent` + kolom
  `recurrence` (default "NONE") & `recurrenceUntil` (nullable).
- **Migration** `20260926000001_add_calendar_recurrence` — applied & verified
  (2 kolom baru + index `CalendarEvent_workspaceId_recurrenceUntil_idx`).
- **Service** `apps/api/src/modules/calendar/calendar.service.ts`:
  - `expandRecurrence(event, from, to)` — pure function, DAILY/WEEKLY
    di-expand jadi occurence konkret per query range (rows tidak berlipat).
  - Query `getCalendar` sekarang OR: one-shot dalam range ATAU deret berulang
    yang masih relevan (`startAt <= to` AND (`recurrenceUntil >= from` OR null)).
  - `createEvent` validasi: kind harus NONE/DAILY/WEEKLY, `recurrenceUntil`
    wajib utk berulang, tidak boleh < startAt, span maks 2 tahun.
  - Response occurence: `id: "event:<id>#<n>"` stabil + `occurrenceIndex`.
- **DTO** `calendar.dto.ts`: field opsional `recurrence` (@IsIn) +
  `recurrenceUntil` (@IsDateString).
- **Web**:
  - `lib/types.ts`: `CalendarEntry.occurrenceIndex: number | null`.
  - `lib/calendar-view.ts`: `RECURRENCE_OPTIONS`, `RECURRENCE_LABEL`,
    `validateRecurrenceInput()`, `countRecurrenceOccurrences()`.
  - `features/app/CalendarView.tsx`: selector Berulang (Sekali/Harian/Mingguan),
    input "Berulang sampai", hint jumlah occurence, prefix `↻` di grid utk occurence.
  - `features/app/CalendarView.css`: style selector (token design system).
- **Test**: API 16/16 (+8 recurrence: expand DAILY/WEEKLY, berhenti di
  recurrenceUntil, occurence lintas tengah malam, validasi createEvent,
  audit metadata, bentuk query). Web 7/7 baru (`calendar-recurrence.spec.ts`).

### B. Feedback Loop (PRD §98 — Phase 27 SELESAI)
- **Schema**: enum `FeedbackType` (BUG/UX/FEATURE_REQUEST), `FeedbackStatus`
  (OPEN/REVIEWED/ACCEPTED/REJECTED), model `Feedback` + `FeedbackVote`
  (unique feedbackId+userId), relasi balik di `User` & `Workspace`.
- **Migration** `20260926000002_add_feedback_loop` — applied & verified.
- **Permission baru** `packages/shared`: `feedback.decide` (default seed:
  OWNER, ADMIN).
- **Notification type baru** `packages/shared/realtime.ts`:
  `feedback.submitted`, `feedback.decided` (ADR-005, event bus).
- **Modul API baru** `apps/api/src/modules/feedback/`:
  - `feedback.service.ts`: submit (any member, workspace.view), vote
    (idempotent via unique constraint; duplikat → 409), list (filter
    status/mine), decide (gated feedback.decide, sekali putus → 409;
    audit `feedback.decide`; notifikasi ke reporter).
  - `feedback.controller.ts`: POST /, GET /, POST /:id/vote,
    POST /:id/decision — @RequireSession, decide @RequirePermission.
  - `feedback.dto.ts`, `feedback.module.ts`.
  - Registered di `app.module.ts` (FeedbackModule).
- **Web**:
  - `lib/types.ts`: `Feedback`, `FeedbackType`, `FeedbackStatus` +
    2 NotificationType baru.
  - `lib/feedback-view.ts` + spec: label ID, `canDecideFeedback(role)`,
    `sortFeedback()` (OPEN dulu → vote terbanyak → terbaru; pure).
  - `features/app/FeedbackView.tsx/.css`: kirim feedback (BUG/UX/Fitur),
    vote ▲, filter status, keputusan OWNER/ADMIN (REVIEWED/ACCEPTED/
    REJECTED + catatan), scroll reveal.
  - `ChatShell.tsx`: nav "Feedback" + routing view baru (semua role).
- **Test**: API 7/7 (submit+notif, vote baru, vote duplikat 409,
  tenant-scope 404, decide+audit+notif, decide ulang 409, filter mine).
  Web 4/4 baru (`feedback-view.spec.ts`).

### C. E2E acceptance baru di `apps/api/test/http-smoke.mjs`
- **6i0. CALENDAR RECURRENCE** (9 check): create berulang 201, tanpa
  recurrenceUntil 409, kind MONTHLY 400, DAILY 4 hari → 4 occurence,
  id stabil #0..#3, staff 403, delete series → occurence hilang.
- **6k. FEEDBACK LOOP** (13 check): submit 201 OPEN, vote requester 1,
  vote owner 2, vote ulang 409, list + voterNames, member list OK,
  decide ACCEPTED + catatan, decide ulang 409, member decide 403,
  outsider 403, type invalid 400, audit feedback.decide, notifikasi
  owner (feedback.submitted) & reporter (feedback.decided).

### D. Dokumentasi (Phase 25 doc + onboarding)
- **README.md** (root, BARU): overview, quickstart dev, script penting,
  E2E, peta dokumentasi, struktur repo.
- **docs/RUNBOOK.md** (BARU): health check, backup `scripts/backup-db.sh`
  + cron, restore pg_dump (dengan peringatan approval owner), prisma
  migrate deploy/resolve, rate limit 429, realtime, prosedur insiden
  5 langkah, deployment rilis (ci.yml + release.yml).
- Total file baru: 12. File diubah: 10. Nol file lama di-refactor.

---

## 2. Bug yang ditemukan & diperbaiki saat verifikasi

1. **Migration gagal P3009** (SQL pakai `calendar_events` snake_case padahal
   tabel Prisma `"CalendarEvent"` PascalCase) → perbaiki SQL, lalu
   `prisma migrate resolve --rolled-back` + `deploy` ulang. Pelajaran:
   selalu cek bentuk nama tabel di migration sebelumnya.
2. **Type error `occurrenceIndex`** — meetings/projects/tasks di
   `getCalendar` belum punya field baru → tambahkan `occurrenceIndex: null`
   di 3 mapper.
3. **Smoke `owner vote feedback` gagal** — service mengirim count hardcoded
   `1` (row di-fetch sebelum vote baru). Fix: refetch row setelah create vote.
4. **Smoke `recurrence kind` 409 → seharusnya 400**: `@IsIn` DTO menolak
   MONTHLY di ValidationPipe sebelum service → ekspektasi smoke diubah ke 400.
5. **Smoke `reminders` kosong**: event smoke pakai tanggal hardcoded
   2026-09-25/26 yang sudah lewat (hari ini 26 Sep). Fix: helper `isoDay()`
   (besok & +5..+8 hari, UTC) — smoke kini kebal drift waktu.
6. **`isoDay` redeclare** di smoke (6c & 6i0) → hapus duplikat, definisi
   tunggal di 6c.
7. **Realtime smoke crash "missing token"** saat run pertama — ternyata
   efek 429 rate limit auth dari smoke berulang (20 req/5 menit/IP):
   register/login gagal → token undefined. Fix prosedur: restart server API
   utk reset limiter, jalankan realtime smoke setelahnya. (Bukan bug kode.)
8. **ESLint `forbidden` unused** di feedback.service.ts → import dibersihkan.
9. **`@sofo/shared` perlu rebuild** setelah ubah NotificationType (API baca
   dari dist) — `npm run build -w @sofo/shared` sebelum typecheck API.

---

## 3. Hasil verifikasi akhir (semua hijau)

| Check | Hasil |
|---|---|
| Migration (2 baru) | applied: recurrence + feedback_loop |
| Unit API (Jest) | 19 suites, **127/127** (112 lama + 15 baru) |
| Unit shared | **8/8** |
| Unit web (Vitest) | 15 files, **89/89** (78 lama + 11 baru) |
| HTTP E2E | **134/134** (+22: recurrence 9, feedback 13) |
| Realtime E2E | **15/15** |
| Lint (3 workspace) | 0 error, 0 warning |
| Typecheck (3 workspace) | 0 error |
| Build (shared+api+web) | sukses |
| Health live | `{"status":"ok","checks":{"database":"up","disk":"up"}}` |

Total test: 127 + 8 + 89 unit + 134 HTTP + 15 realtime = **373 checks hijau**.

---

## 4. Status Phase vs PRD (setelah Sesi #7)

| Phase | Status |
|---|---|
| 01–24 | ✅ DONE (tidak disentuh) |
| 25 Production Readiness | ✅ LEBIH LENGKAP (RUNBOOK + README) |
| 26 Beta | ⬜ butuh keputusan owner (tester list, channel distribusi) |
| 27 Feedback Loop | ✅ SELESAI (infra: model+API+UI+notif+audit; run loop-nya manual oleh owner) |
| Sisa opsional | Redis adapter (multi-instance), push notif FCM, i18n penuh, signing key store |

## 5. Peringatan untuk sesi berikutnya
- Rate limit auth 20 req/5 menit — jangan jalankan smoke berulang cepat
  tanpa restart API; realtime smoke setelah http-smoke butuh jeda/restart.
- Jangan commit `apps/api/prisma/migrations` manual sebelum `migrate deploy`
  diverifikasi; urutan: tulis SQL → deploy → resolve jika gagal → deploy lagi.
- `npm run build -w @sofo/shared` WAJIB setelah mengubah packages/shared.
- API server berjalan dari `dist` — rebuild sebelum smoke kalau src berubah.
