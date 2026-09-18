# BELUM DIKERJAKAN (urut prioritas PRD)

## 0. Sisa bug aktif — TIDAK ADA (Sesi #2, 2026-09-18)
- [x] Relasi `author` + migration + regenerate client → SELESAI, commit `d21cd60`
- [x] Regression penuh: http-smoke 41/41 + realtime-smoke 15/15 → SELESAI

## P1 — setelah P0 stabil (PRD §142)
- [x] Audit service + viewer endpoints (PRD §49) → SELESAI Sesi #2c: AuditService
      (record tenant-scoped + list dengan filter action/actor/result/from/to + cursor),
      GET /workspaces/:id/audit gated `audit.view` (OWNER/ADMIN/MANAGER), wiring ke
      critical actions: workspace.create, member.role.set, member.remove, user.register,
      auth.login (SUCCESS/FAILURE), message.delete,      meeting.start/end/archive,
      project.delete. http-smoke naik 41→48/48.
- [x] UI audit viewer web → SELESAI Sesi #2e (commit `bf14e07`): halaman Audit
      dgn filter, expand metadata, load-more; nav hanya utk OWNER/ADMIN/MANAGER;
      sekalian fix bug DTO `limit` (string → @Type coerce).
- [x] Calendar: events, meeting/deadline view, reminders (PRD §86) → SELESAI
      Sesi #2f (commit `411307f`): model CalendarEvent + endpoint agregasi 4 sumber
      (event, meeting, project/task deadline), reminders by horizon (default 7 hari,
      termasuk hari ini), permission `calendar.event.create`, audit wiring, UI grid
      bulanan + reminders di web. Catatan: push-notif reminder belum ada (butuh
      notification system §89); "company event" dari PRD §41 dipetakan ke manual
      event biasa.
- [ ] Attendance: clock in/out, history, late status (PRD §87) — enterprise only
- [ ] Request & Approval workflow (PRD §88)
- [ ] Notification system terpusat dari event (PRD §89) — butuh ADR event bus;
      room `user:<id>` sudah disiapkan di ADR-004
- [ ] Global search authorization-aware (PRD §90)
- [ ] Admin dashboard (PRD §92)

## P2 — core stabil dulu (PRD §143)
- [ ] Community features, moderation, community events (PRD §93)
- [ ] Client access UI terpisah (role CLIENT sudah read-only di matrix)
- [ ] Advanced analytics / reporting
- [ ] Mobile / desktop app
- [ ] AI, automation, integrations
- [ ] Redis adapter untuk socket scaling multi-instance (catatan ADR-004)

## Hardening & Production (PRD §95-§96) — sebelum release apa pun
- [ ] Security audit menyeluruh (PRD §139 checklist)
- [ ] Rate limiting + API abuse protection
- [ ] Monitoring, error tracking, health check endpoint (PRD §121)
- [ ] Backup & restore procedure (PRD §131)
- [ ] CI/CD pipeline: lint → typecheck → unit → integration → build (PRD §134)
- [ ] E2E otomatis di CI (http-smoke + realtime-smoke bisa dipakai)
- [ ] Feature flags (PRD §136)

## Frontend — lanjutan setelah chat stabil
- [x] Halaman Meetings + Live Notes UI (API sudah siap) → SELESAI Sesi #2
      (commit `11218e2`: MeetingContext + MeetingsView, notes autosave + polling,
      9 unit test baru)
- [ ] Halaman Projects & Tasks (kanban) (API sudah siap)
- [ ] File upload UI + preview (API sudah siap)
- [ ] Members management UI (invite, change role) (API sudah siap)
- [ ] Organization tree UI (enterprise)
- [ ] Responsive mobile layout (PRD §128) — struktur sudah siap, perlu tuning
- [ ] Accessibility pass lengkap (PRD §127)

## Kerapian
- [ ] `refreshWorkspaces` di WorkspaceContext masih ada versi duplikat logika
      load awal — bisa disatukan saat refactor berikutnya (kecil, bukan bug)
- [ ] Bump `socket.io-client` test di web ke smoke terpisah bila perlu
