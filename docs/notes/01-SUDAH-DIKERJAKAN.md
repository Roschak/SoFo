# SUDAH DIKERJAKAN (selesai + terverifikasi)

## 1. Foundation & Kontrak (Sesi #1)
- Monorepo npm workspaces: `apps/api` (NestJS), `apps/web` (React+Vite), `packages/shared`
- Kontrak bersama: error codes (PRD §56), permission matrix + 8 role default (§25/§27),
  realtime event contract (ADR-004) — semua di `packages/shared`, ada unit test-nya
- Docker PostgreSQL lokal (port **5433**, jangan 5432 — dipakai project lain)
- Migration `init_p0` applied
- ⚠️ Env OS global `DATABASE_URL` (punya project aegis) menimpa `.env` —
  selalu override inline: `DATABASE_URL=postgresql://sofo:sofo_dev@localhost:5433/sofo?schema=public`

## 2. API MVP P0 — SEMUA MODULE SELESAI (Sesi #1)
| Module | Isi |
|---|---|
| identity | profil user (`/users/me`) |
| authentication | register, login, logout, session; bcrypt; token tersimpan ter-hash |
| authorization | permission engine + PermissionGuard global |
| workspace | create (seed role atomik via transaksi), membership, role change |
| organization | department/division/team (enterprise mode only) |
| communication | channel + message + thread reply + edit/delete policy |
| realtime | Socket.IO gateway, presence, typing (ADR-004) |
| file | upload/download/soft-delete, 25 MB, permission check |
| meeting | lifecycle + participants + live notes |
| project | project + task + assignee harus member |

## 3. Testing — SEMUA HIJAU sebelum perubahan terakhir
- Unit tests: 45/45 (37 API + 8 shared) + 7 test web (vitest) = 52
- HTTP E2E `apps/api/test/http-smoke.mjs`: **41/41** (sebelum perubahan `authorName`)
- Realtime E2E `apps/api/test/realtime-smoke.mjs`: **15/15** (sebelum perubahan `authorName`)
- Lint 0 error, typecheck 0 error, build sukses (api + web + shared)

## 4. Frontend Web (Sesi #1c) — SELESAI SEBAGAI CODE, lulus semua check
- Design system custom penuh (ADR-003): tokens.css, tanpa UI kit, tanpa template
- UI primitives: Button, Field, Modal, Avatar (masing-masing + css)
- Auth screen: login/register + error kontrak SOFO
- Chat shell: sidebar workspace/channel, member bar + presence dot,
  channel view realtime (dedupe by id, typing indicator, edit/delete milik sendiri)
- lib: api client, socket client (reconnect), message store murni + unit test
- Vite dev server teruji jalan di :5173 dengan proxy `/api` + `/socket.io` ke :4001
- Build web sukses (bundle gzip ~123 kB)

## 5. Bug yang sudah ditemukan & DIPERBAIKI (bukti E2E itu berguna)
1. Session token dicari mentah padahal tersimpan ter-hash → semua request 401.
   Fix: `hashToken()` dipakai di validateSession/logout. (security-relevant)
2. ValidationPipe error jadi 500 → filter menormalkan HttpException Nest.
3. Race auth realtime: join bisa dieksekusi sebelum auth selesai →
   auth dipindah ke handshake middleware socket.io.
4. Presence double-count saat join duplikat → join/leave idempotent per socket.
5. socket.io mengosongkan rooms sebelum disconnect hook → tracking manual Map.

## 6. Dokumentasi
- `docs/PROGRESS.md`, `docs/SESSION-NOTES.md`, `docs/ARCHITECTURE.md`
- ADR-001 (stack), ADR-002 (tenant isolation), ADR-003 (UI custom),
  ADR-004 (realtime) di `docs/adr/`
- 3 commit git berisi seluruh riwayat perubahan
