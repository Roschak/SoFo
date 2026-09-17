# SOFO — SESSION NOTES (Wajib dibaca sebelum lanjut kerja)

> Aturan: **sebelum sesi berakhir (atau terasa akan putus), tulis kondisi terakhir di sini.**
> Tujuan: siapa pun (atau sesi baru) bisa lanjut tanpa kehilangan konteks.

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
