# ADR-004 — Realtime Architecture (Socket.IO)

Status: Accepted
Tanggal: 2026-09-17

## Konteks
PRD §33: realtime untuk messages, presence, typing, notifications, events.
Realtime wajib menangani reconnect, duplicate event, ordering, network failure,
race condition. MVP P0 butuh realtime untuk message + presence + typing.

## Keputusan
**Socket.IO** pada port API yang sama, dengan kontrak berikut:

### Autentikasi handshake (PRD §55)
1. Client mengirim `auth.token` (bearer session token) saat connect.
2. Gateway memvalidasi via AuthenticationService **sebelum** koneksi diterima.
3. Token invalid/expired → koneksi ditolak (`UNAUTHENTICATED`).
4. Token valid → socket dipetakan ke `userId` (satu identity, banyak device).

### Rooms = tenant boundary (PRD §18-§19)
- Room per workspace: `ws:<workspaceId>` — hanya di-join **setelah** membership
  diverifikasi via AuthorizationService (bukan role name, tapi permission check).
- Room per user: `user:<userId>` — untuk notification langsung (P1).
- Tidak ada room lain. Klien tidak bisa join room sembarangan (server-side join).

### Event contract (client → server)
| Event | Payload | Guard |
|---|---|---|
| `workspace.join` | `{ workspaceId }` | membership `workspace.view` |
| `workspace.leave` | `{ workspaceId }` | — |
| `typing.start` | `{ workspaceId, channelId }` | membership `message.send` |
| `typing.stop` | `{ workspaceId, channelId }` | membership `message.send` |

### Event contract (server → client)
| Event | Payload |
|---|---|
| `message.created` | message view (dari CommunicationService) |
| `message.updated` | message view |
| `message.deleted` | `{ messageId, channelId }` |
| `presence.updated` | `{ userId, status, onlineUserIds }` per workspace |
| `typing.updated` | `{ channelId, userIds }` — daftar user yang sedang mengetik |

### Ordering & duplicate (PRD §33)
- Socket.IO menggaransi per-connection ordering (TCP underlying).
- `message.created` membawa `createdAt` + `id`; client idempotent-apply by `id`
  (duplikat event diabaikan). Ini tanggung jawab client, didokumentasikan di sini.
- Broadcast selalu dari service layer (bukan controller) sehingga urutan event
  mengikuti urutan commit database.

### Presence & typing (server authority)
- Presence: berdasarkan socket yang ter-join room `ws:*`. User online di workspace
  bila ≥1 socket-nya di room. Disconnect → presence offline otomatis.
- Typing: state sementara dengan TTL 6 detik di server (client tidak mempercayai
  client lain). `typing.stop` eksplisit atau TTL expiry sama-sama menghapus.

## Konsekuensi
+ Auth & permission sama dengan HTTP (satu sumber kebenaran, tanpa bypass)
+ Server-side join mencegah tenant leak via room
- Socket state in-memory: scaling multi-instance butuh Redis adapter (P2, bukan P0)
