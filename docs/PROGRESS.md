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
| 15 Calendar | calendar/ | ✅ DONE | ✅ | ✅ | Sesi #2f |
| 16 Attendance | attendance/ | ✅ DONE | ✅ | ✅ | Sesi #5; Enterprise clock in/out, UI AttendanceView |
| 17 Request & Approval | request/ | ✅ DONE | ✅ | ✅ | Sesi #2g; UI web SELESAI Sesi #4 |
| 18 Notification | notification/ | ✅ DONE | ✅ | ✅ | ADR-005 event bus, bell UI, E2E 80/80 |
| 19 Search | search/ | ✅ DONE | ✅ | ✅ | Sesi #5; Global auth-aware search + Ctrl+K UI modal |
| 19b Landing page | web/landing | ✅ DONE | ✅ | ✅ | Sesi #5; Dynamic scroll animations, portfolio showcase |
| 20 Audit | audit/ | ✅ DONE | ✅ | ✅ | AuditService, AuditView UI, E2E verified |
| 21 Admin | admin/ | ✅ DONE | ✅ | ✅ | stats + suspended, UI AdminView |
| 22 Community | moderation (Sesi #6) | ✅ DONE | ✅ | ✅ | PENDING_REVIEW→approve/remove, UI queue |
| 23 Client Access | client portal (Sesi #6) | ✅ DONE | ✅ | ✅ | ClientPortalView read-only utk CLIENT/GUEST |
| 24 Hardening | rate limit + health | ✅ DONE | ✅ | ✅ | E2E 112/112 + 15/15 + 197/197 unit |
| 25 Production Readiness | CI + backup + release + runbook | ✅ DONE | ✅ | ✅ | Sesi #7: RUNBOOK + README; quality+release workflow; APK fisik OK |
| 26 Beta | BETA 1 dibangun | 🟨 IN PROGRESS | — | — | Sesi #7: APK release signed v0.1.0-beta.1; panduan & tester list di `docs/notes/06-BETA-PHASE26.md`; backend beta = keputusan owner |
| 27 Feedback Loop | feedback/ | ✅ DONE | ✅ | ✅ | Sesi #7; Feedback+Vote, UI, notif, audit; recurrence kalender jg selesai |

## MVP P0 & P1 Acceptance (PRD §140) — sisi API & Web

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
14. [x] Calendar (P1) — grid bulanan & 7-hari pengingat
15. [x] Attendance (P1) — clock in/out, durasi kerja, riwayat Enterprise
16. [x] Request & approval (P1) — 5 jenis pengajuan, larangan self-approval
17. [x] Notification (P1) — event bus + bell realtime
18. [x] Audit viewer (P1) — jejak aksi kritis ter-filter
19. [x] Global search (P1) — auth-aware across channels, messages, projects, tasks, files, members
20. [x] Akses data sesuai permission — PermissionGuard di semua endpoint workspace
21. [x] Landing page & Product Portfolio — animasi scroll memukau, top progress bar, interactive mockups

## Verifikasi Terakhir (2026-09-26 — Sesi #7)

| Check | Hasil |
|---|---|
| Unit tests | 224/224 pass (127 API + 89 web + 8 shared) |
| HTTP E2E (`test/http-smoke.mjs`) | 134/134 pass (+22 recurrence & feedback) |
| Realtime E2E (`test/realtime-smoke.mjs`) | 15/15 pass (100% acceptance) |
| Lint / typecheck / build | 0 error across all workspaces |
| Migration baru | recurrence + feedback_loop applied |
| Rekap Sesi #7 | `docs/notes/05-SESI-7-REKAP.md` |

### Historis — Sesi #6 (2026-09-22)

| Check | Hasil |
|---|---|
| Unit tests | 197/197 pass (111 API + 78 web + 8 shared) |
| HTTP E2E (`test/http-smoke.mjs`) | 112/112 pass (+12 moderation acceptance) |
| Realtime E2E (`test/realtime-smoke.mjs`) | 15/15 pass (100% acceptance) |
| Lint / typecheck / build | 0 error across all workspaces |
| Android APK | app-debug.apk fisik 4.3 MB (JDK17+SDK user-space) |
| Windows EXE | via CI release workflow (owner menolak VS lokal) |

## Sesi #5 (2026-09-19) — Portfolio Scroll Animations, Attendance UI, Global Search, End-to-End Audit

- **Landing Page & Animasi Scroll Produk**:
  - Top scroll progress indicator bar (`scaleX` based on scroll percentage).
  - Floating ambient glowing background mesh.
  - Interactive product portfolio showcase: selector tabs with 6 live product preview mockups (Chat, Kanban, Meeting Notes, Calendar, Approvals, Attendance).
  - Staggered 3D perspective tilt (`tilt-left`, `tilt-right`, `scale`, `up`) on product cards.
  - Full respect for `prefers-reduced-motion`.
- **Attendance (Presensi Enterprise)**:
  - Fixed API controller bug: missing `@Body()` decorator in `clockIn`.
  - Frontend `AttendanceView`: 1-tap clock in/out, active shift status, duration counter, search & filter history table.
  - Added to navigation when workspace mode is `ENTERPRISE`.
  - 6 new unit tests for `attendance-view.ts`.
- **Global Search (PRD §48, §90)**:
  - New `SearchModule` in API: `GET /workspaces/:workspaceId/search?q=...&type=...`.
  - Authorization-aware filtering across channels, messages, projects, tasks, files, and members.
  - Global search UI modal in `ChatShell` with instant filter chips and `Ctrl+K` shortcut.
  - 3 new unit tests in `search.service.spec.ts` + 3 new E2E checks in `http-smoke.mjs`.
- **APK & EXE Verification**:
  - `npm run build` generates clean production assets in `apps/web/dist`.
  - `npx cap sync android` synchronizes assets cleanly to Android project.
  - `src-tauri/tauri.conf.json` validated for Windows desktop bundling.
- **Audit Akhir End-to-End**:
  - 153 unit tests: 100% PASS.
  - 94 HTTP E2E tests: 100% PASS.
  - 15 Realtime WebSocket tests: 100% PASS.
  - TypeScript typecheck: 0 errors across all 3 workspaces.
  - ESLint: 0 errors / 0 warnings across all 3 workspaces.
