# SOFO — Architecture Overview

## 1. Layered Architecture (PRD §11, §67)

```
┌─────────────────────────────────────────────┐
│  Presentation   apps/web (React custom DS)  │
├─────────────────────────────────────────────┤
│  Application    Controllers + Guards        │
│                 apps/api/src/modules/*/     │
├─────────────────────────────────────────────┤
│  Domain         Services (business rules)   │
├─────────────────────────────────────────────┤
│  Infrastructure Prisma, FS, env             │
│                 apps/api/src/infrastructure │
└─────────────────────────────────────────────┘
Dependency hanya mengalir ke bawah (PRD §67).
```

## 2. Module Tree (PRD §12, §61)

```
apps/api/src/
├── modules/
│   ├── identity/          # Phase 02 — akar user (PRD §14)
│   ├── authentication/    # Phase 03 — login/session (PRD §15)
│   ├── authorization/     # Phase 06 — permission engine (PRD §16)
│   ├── workspace/         # Phase 05 — root container (PRD §20)
│   ├── organization/      # Phase 07 — dept/div/team (PRD §24)
│   ├── communication/     # Phase 08 — channel+message (PRD §28)
│   ├── realtime/          # Phase 09 — WS gateway (ADR-004)
│   ├── file/              # Phase 10 — upload/download (PRD §32)
│   ├── meeting/           # Phase 11-12 — meeting+notes (PRD §34)
│   └── project/           # Phase 13-14 — project+task (PRD §38)
├── infrastructure/
│   ├── prisma/            # satu-satunya DB connection
│   └── realtime/          # registry Socket.IO server
└── shared/                # pipes, filter, env
packages/shared/           # kontrak lintas app: errors, permissions
```

## 2b. Realtime Flow (ADR-004)

```
CLIENT ── handshake(auth.token) ──► middleware validasi session
                                        │ invalid → connect_error
                                        │ valid   → socket.data.userId
CLIENT ── workspace.join ────────► membership check (AuthorizationService)
                                        │ ok  → join room ws:<id> + presence
                                        │ no  → FORBIDDEN
CLIENT ── typing.start/stop ─────► permission message.send + TTL 6s
HTTP POST /messages ──► CommunicationService ──► commit DB
                                        └──► RealtimeBroadcaster
                                               └──► room ws:<id>: message.created
```

## 3. Request Flow (PRD §55, §19)

```
REQUEST
  │
  ▼
ValidationPipe ──── invalid ──► 400 VALIDATION_ERROR
  │ valid
  ▼
SessionGuard ────── no token ─► 401 UNAUTHENTICATED
  │ Bearer valid
  ▼
PermissionGuard ── no role ───► 403 FORBIDDEN
  │ membership+permission OK
  ▼
Controller ─► Service (tenant-scoped query, workspaceId selalu di where)
  │
  ▼
SofoExceptionFilter ─► standard error body, tanpa stack trace (PRD §56)
```

## 4. Entity Relationship (ringkas)

```
User 1──* Session
User 1──* WorkspaceMember *──1 Workspace
Workspace 1──* Role 1──* WorkspaceMember
Workspace 1──* OrgUnit (self-relation tree)
Workspace 1──* Channel 1──* Message (self-relation: thread)
Message 1──* File (attachment)
Workspace 1──* Meeting 1──* MeetingParticipant / MeetingNote
Workspace 1──* Project 1──* Task
Workspace 1──* AuditLog
```

## 5. Development Order (PRD §8) — tercapai sesi ini

```
Foundation → Identity → Authentication → Tenant → Workspace →
Authorization → Organization → Communication → Realtime → File →
Meeting → Notes → Project → Task   ✅ (API lengkap P0)
```

## 6. Berikutnya (urutan tetap)

```
Audit service → Calendar → Attendance → Request/Approval →
Notification → Search → apps/web (design system custom)
```
