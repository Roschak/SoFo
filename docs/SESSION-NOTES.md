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
