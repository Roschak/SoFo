# ADR-002 — Tenant Isolation Strategy

Status: Accepted
Tanggal: 2026-09-17

## Konteks
PRD §18-§19: Tenant A ≠ Tenant B, tidak boleh bypass. Setiap request wajib validasi tenant.

## Keputusan
Isolasi dilakukan dengan **query scoping + guard**:
1. Setiap query resource workspace selalu menyertakan `workspaceId` di `where` clause.
2. Setiap endpoint workspace-scoped wajib `@RequirePermission(...)` → `PermissionGuard`
   memvalidasi membership + permission **sebelum** handler dieksekusi.
3. Resource di luar workspace user mengembalikan NOT_FOUND (bukan FORBIDDEN) agar
   tidak membocorkan keberadaan resource (anti tenant-leak probing).

## Konsekuensi
+ Isolasi teruji di unit test tiap service
+ Tidak ada raw query yang bisa lupa scoping (Prisma typed)
- Disiplin developer: endpoint baru wajib guard — ditegakkan lewat code review + test
