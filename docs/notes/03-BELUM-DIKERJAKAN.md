# BELUM DIKERJAKAN (urut prioritas PRD)

## 0. Sisa bug aktif (blocker satu-satunya)
- [ ] Prisma client regenerate → lihat `02-SEDANG-DIKERJAKAN.md`
- [ ] Regression penuh setelah fix: http-smoke 41/41 + realtime-smoke 15/15

## P1 — setelah P0 stabil (PRD §142)
- [ ] Audit service + viewer endpoints (PRD §49) — model `AuditLog` sudah ada
- [ ] Calendar: events, meeting/deadline view, reminders (PRD §86)
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
- [ ] Halaman Meetings + Live Notes UI (API sudah siap)
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
