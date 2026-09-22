# ADR-005 — Centralized Notification via In-Process Event Bus

Status: Accepted
Tanggal: 2026-09-18

## Konteks
PRD §46: notification berasal dari event (RequestApproved, RequestRejected,
MemberInvited, TaskAssigned, MeetingStarted, …). PRD §47: alur ACTION → EVENT →
HANDLER → SIDE EFFECT, dan business logic tidak boleh di-copy ke setiap handler.
PRD §89: centralized notification system; semua notification harus berasal dari
defined event/source. ADR-004 sudah menyiapkan room `user:<id>` untuk push
notification langsung.

## Keputusan

### 1. Event bus in-process (NestJS EventEmitter2)
- Satu instance `EventEmitter2` global (`NotificationModule`).
- Domain service mempublikasikan event domain **setelah commit DB** (pola yang
  sama dengan ADR-004 untuk broadcast message).
- Handler = `NotificationService.onDomainEvent()` — satu-satunya tempat yang
  tahu cara membangun & menyimpan notification.
- Nama event: `notification.<kejadian>`, payload `NotificationEventPayload`:
  `{ workspaceId, actorId, recipientIds, type, title, body?, refType?, refId? }`.

### 2. Aturan notifikasi
- Recipient **tidak pernah** menerima notification untuk aksinya sendiri
  (`recipientIds` difilter dari `actorId`) — sesuai ekspektasi UX umum.
- Kegagalan pengiriman/push **tidak pernah** menggagalkan business flow
  (handler menangkap error sendiri, sama seperti AuditService).
- Tipe notification saat ini: `request.approved`, `request.rejected`,
  `request.created` (ke approver potensial), `member.invited`,
  `task.assigned` — mudah ditambah tanpa menyentuh domain service lagi.

### 3. Penyimpanan & pengiriman
- Setiap notification tersimpan per-recipient di tabel `Notification`
  (status `UNREAD`/`READ`, `readAt`), tenant-scoped `workspaceId`.
- Push realtime via room `user:<userId>` (ADR-004), event `notification.created`.
  Recipient yang online menerima instan; offline membaca saat login berikutnya.
- Deduplikasi idempotent: client meng-apply berdasarkan `id`.

### 4. Kontrak baru (server → client)
| Event | Payload |
|---|---|
| `notification.created` | NotificationView |
| `notification.read` | `{ notificationId, readAt }` |

### 5. Endpoint
| Endpoint | Fungsi | Gate |
|---|---|---|
| `GET /notifications` | daftar milik user (limit 50 terbaru) | session |
| `GET /notifications/unread-count` | jumlah unread (untuk badge) | session |
| `POST /notifications/:id/read` | tandai satu dibaca | session + pemilik |
| `POST /notifications/read-all` | tandai semua dibaca | session |

## Alternatif yang dipertimbangkan
- **Redis pub/sub / BullMQ**: lebih kuat untuk multi-instance & retry, tapi
  menambah infrastruktur baru di P1; socket scaling (P2) adalah titik natural
  untuk memindahkan bus ini ke Redis tanpa mengubah kontrak handler.
- **Notifikasi inline di setiap service**: ditolak — melanggar §47 (logic
  tersebar/di-copy), sulit diuji, dan tidak terpusat.

## Konsekuensi
+ Satu tempat untuk membuat notification; domain service hanya emit 1 baris.
+ Recipient & push teruji terpusat; mudah menambah tipe event baru.
+ Kontrak realtime & HTTP stabil saat bus dimigrasi ke Redis (P2).
- Bus in-process: event hilang jika proses mati di antara commit & emit —
  diterima untuk P1 (bukan jejak uang); audit tetap sumber kebenaran transisi.
