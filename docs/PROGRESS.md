# SOFO — PROGRESS TRACKER

> Sumber kebenaran status development. Update setiap selesai satu phase.
> PRD: `PRD.md` • Session notes: `SESSION-NOTES.md` • Keputusan: `docs/adr/`

## Phase Status (PRD §71-§95)

| Phase | Module | Status | Tested | Integrated | Notes |
|---|---|---|---|---|---|
| 01 Foundation | monorepo, lint, tsconfig, docker pg | ✅ DONE | ✅ | ✅ | npm workspaces, strict TS |
| 02 Identity | identity/ | ✅ DONE | ✅ | ✅ | profile me endpoints |
| 03 Authentication | authentication/ | ✅ DONE | ✅ | ✅ | bcrypt, session token hashed |
| 04 Tenant isolation | semua query scoped workspaceId | ✅ DONE | ✅ | ✅ | test di tiap service |
| 05 Workspace | workspace/ | ✅ DONE | ✅ | ✅ | seed role atomik (tx) |
| 06 Authorization | authorization/ | ✅ DONE | ✅ | ✅ | PermissionGuard global |
| 07 Organization | organization/ | ✅ DONE | ✅ | ✅ | enterprise mode only |
| 08 Communication | communication/ | ✅ DONE | ✅ | ✅ | channel + message + thread |
| 09 Realtime | realtime/ | ✅ DONE | ✅ | ✅ | Socket.IO, ADR-004, 15 E2E checks |
| 10 File | file/ | ✅ DONE | ✅ | ✅ | disk lokal, 25MB limit |
| 11 Meeting | meeting/ | ✅ DONE | ✅ | ✅ | lifecycle + notes |
| 12 Live Notes | meeting/ (notes) | ✅ DONE | ✅ | ✅ | per-author note |
| 13 Project | project/ | ✅ DONE | ✅ | ✅ | |
| 14 Task | project/ (task) | ✅ DONE | ✅ | ✅ | assignee harus member |
| 15 Calendar | — | ⬜ NOT STARTED | — | — | P1 |
| 16 Attendance | — | ⬜ NOT STARTED | — | — | P1, enterprise only |
| 17 Request & Approval | — | ⬜ NOT STARTED | — | — | P1 |
| 18 Notification | — | ⬜ NOT STARTED | — | — | P1, butuh event system |
| 19 Search | — | ⬜ NOT STARTED | — | — | P1 |
| 20 Audit | — | ⬜ PARTIAL | — | — | model AuditLog ada, service/UI belum |
| 21 Admin | — | ⬜ NOT STARTED | — | — | P1 |
| 22 Community | — | ⬜ NOT STARTED | — | — | P2 |
| 23 Client Access | — | ✅ PARTIAL | — | — | role CLIENT read-only sudah di matrix |
| 24 Hardening | — | ⬜ NOT STARTED | — | — | sebelum production |
| 25 Production Readiness | — | ⬜ NOT STARTED | — | — | |
| 26 Beta | — | ⬜ NOT STARTED | — | — | |
| 27 Feedback Loop | — | ⬜ NOT STARTED | — | — | |

## MVP P0 Checklist (PRD §141)

- [x] Identity
- [x] Authentication
- [x] User
- [x] Tenant (isolation by scoping)
- [x] Workspace
- [x] Membership
- [x] Role
- [x] Permission
- [x] Channel
- [x] Message
- [x] Realtime (Socket.IO gateway + presence + typing, ADR-004)
- [x] File
- [x] Basic Meeting
- [x] Project
- [x] Task

## MVP P0 Acceptance (PRD §140) — sisi API

1. [x] Register — `POST /api/v1/auth/register`
2. [x] Login — `POST /api/v1/auth/login`
3. [x] Membuat workspace — `POST /api/v1/workspaces`
4. [x] Memilih mode — ENTERPRISE/COMMUNITY di create
5. [x] Mengundang user — `POST /workspaces/:id/members`
6. [x] Memberikan role — `PATCH /workspaces/:id/members/:memberId`
7. [x] Membuat channel — `POST /workspaces/:id/channels`
8. [x] Mengirim message — `POST /channels/:cid/messages`
9. [x] Mengirim file — `POST /workspaces/:id/files`
10. [x] Membuat meeting — `POST /workspaces/:id/meetings`
11. [x] Membuat notes — `PUT /meetings/:mid/notes`
12. [x] Membuat project — `POST /workspaces/:id/projects`
13. [x] Membuat task — `POST /projects/:pid/tasks`
14. [ ] Calendar (P1)
15. [ ] Attendance (P1)
16. [ ] Request & approval (P1)
17. [ ] Notification (P1)
18. [ ] Audit viewer (partial)
19. [x] Akses data sesuai permission — PermissionGuard di semua endpoint workspace

## Known Gaps (jujur, bukan fake completion — PRD §104)

- Frontend web belum dibangun (design system custom, lihat ADR-003)
- CI pipeline belum dibuat
- Realtime socket state in-memory — multi-instance scaling butuh Redis adapter (P2)
- Calendar/Attendance/Request/Approval/Notification/Search/Admin = P1, belum dimulai

## Verifikasi Terakhir (2026-09-17)

| Check | Hasil |
|---|---|
| Unit tests | 45/45 pass (37 API + 8 shared) |
| HTTP E2E (`test/http-smoke.mjs`) | 41/41 pass |
| Realtime E2E (`test/realtime-smoke.mjs`) | 15/15 pass |
| Lint / typecheck / build | 0 error |
| Migration | init_p0 applied (Postgres :5433) |
