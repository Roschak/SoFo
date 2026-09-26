# SOFO (SOULOFFICE)

> Your All-in-One Digital Office & Community Ecosystem — satu akun, satu workspace, satu kantor digital.
> Spec lengkap: [`PRD.md`](./PRD.md) • Status: [`docs/PROGRESS.md`](./docs/PROGRESS.md)

## Apa ini

SOFO menyatukan komunikasi (channel + pesan realtime), meeting + live notes, proyek & task,
kalender, presensi, request & approval, file, notifikasi, pencarian global, audit, admin,
moderasi komunitas, dan portal client — dalam satu platform multi-tenant (isolasi per workspace).

- **Backend**: NestJS + Prisma + PostgreSQL (`apps/api`)
- **Frontend**: React + Vite, design system custom tanpa UI kit (`apps/web`)
- **Kontrak lintas app**: error codes, permission matrix, event realtime (`packages/shared`)
- **Packaging**: Web (Vite), Android APK (Capacitor), Windows EXE (Tauri 2 via CI)

## Menjalankan (development)

```bash
npm install                        # sekali
docker compose -f apps/api/docker-compose.yml up -d   # Postgres di port 5433
cp apps/api/.env.example apps/api/.env
npm run build -w @sofo/shared      # WAJIB sebelum typecheck/build api
npm run prisma:migrate -w @sofo/api   # migrasi pertama (atau prisma:deploy)
npm run dev -w @sofo/api           # API   → http://localhost:4001
npm run dev -w @sofo/web           # Web   → http://localhost:5173 (proxy /api & /socket.io)
```

> ⚠️ Jika OS-mu punya env global `DATABASE_URL`, override inline:
> `DATABASE_URL=postgresql://sofo:sofo_dev@localhost:5433/sofo?schema=public`

## Script penting (root)

| Perintah | Isi |
|---|---|
| `npm run lint` | ESLint semua workspace |
| `npm run typecheck` | TypeScript strict semua workspace |
| `npm test` | Unit test semua workspace (Jest + Vitest) |
| `npm run build` | Build shared + api + web |

## Test E2E (butuh server API hidup di :4001)

```bash
node apps/api/test/http-smoke.mjs      # alur kritis HTTP (auth → ... → feedback)
node apps/api/test/realtime-smoke.mjs  # WebSocket realtime (2 user)
```

## Dokumentasi lanjutan

| Dokumen | Isi |
|---|---|
| [`docs/PROGRESS.md`](./docs/PROGRESS.md) | Tracker 27 phase PRD + checklist MVP |
| [`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md) | Diagram layer, alur request & realtime |
| [`docs/SESSION-NOTES.md`](./docs/SESSION-NOTES.md) | Log per sesi, bug & keputusan |
| [`docs/notes/`](./docs/notes/) | Catatan sudah/sedang/belum dikerjakan |
| [`docs/adr/`](./docs/adr/) | Architecture Decision Record (ADR-001…005) |
| [`docs/RUNBOOK.md`](./docs/RUNBOOK.md) | Backup, restore, health, incident |

## Struktur

```
apps/api        NestJS API — src/modules/<domain> (controllers/services/dto)
apps/web        React SPA — src/features/<view>, src/lib (murni + unit test)
packages/shared Kontrak bersama: errors, permissions, realtime events
scripts         backup-db.sh (pg_dump + retensi)
```
