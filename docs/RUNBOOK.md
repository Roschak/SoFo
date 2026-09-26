# SOFO — RUNBOOK Operasional

> Prosedur backup, restore, health check, dan penanganan insiden (PRD §121, §131, §132).
> Target pembaca: siapa yang mengoperasikan SOFO di server produksi/dev bersama.

## 1. Health check (PRD §121)

```bash
curl -s http://localhost:4001/api/v1/health
# Harap: {"status":"ok","checks":{"database":"up"},"uptimeSeconds":<angka>}
```

- `checks.database: "down"` → lihat bagian Database di bawah.
- Endpoint ini publik (tanpa auth) — aman untuk load balancer/uptime monitor.

## 2. Database

- Kontainer: `sofo-db` (PostgreSQL 16, port host **5433** — 5432 dipakai project lain).
- Connection string dev: `postgresql://sofo:sofo_dev@localhost:5433/sofo?schema=public`

### Menyalakan / mematikan

```bash
docker compose -f apps/api/docker-compose.yml up -d     # start
docker compose -f apps/api/docker-compose.yml down      # stop (volume tetap aman)
```

### Backup (PRD §131)

```bash
./scripts/backup-db.sh                      # → ./data/backups/sofo-<timestamp>.sql.gz
./scripts/backup-db.sh /var/backups/sofo    # lokasi kustom
RETENTION_DAYS=30 ./scripts/backup-db.sh    # retensi 30 hari (default 14)
```

Jadwalkan harian (contoh cron jam 02:00):

```
0 2 * * * /path/ke/sofo/scripts/backup-db.sh /var/backups/sofo
```

### Restore (PRD §132)

```bash
# 1. Hentikan API supaya tidak menulis saat restore.
# 2. Restore dari snapshot:
gunzip -c /var/backups/sofo/sofo-<timestamp>.sql.gz | \
  docker exec -i sofo-db psql -U sofo -d sofo
# 3. Nyalakan API, cek /api/v1/health, lalu login uji.
```

> ⚠️ Restore menimpa data saat itu. Lakukan hanya dengan persetujuan owner (PRD §101, §120).

## 3. Migration

```bash
cd apps/api
DATABASE_URL=... npx prisma migrate deploy    # terapkan migration yang ada (aman, berurutan)
DATABASE_URL=... npx prisma migrate resolve --rolled-back <nama>   # tandai gagal sudah di-rollback
```

- Migration baru berisiko (drop kolom/tabel) **wajib** approval human (PRD §101, §119).
- Jika deploy migration gagal di tengah: `migrate resolve --rolled-back`, perbaiki SQL, lalu `deploy` ulang.

## 4. Rate limit (PRD §139)

- Auth endpoint dibatasi **20 req / 5 menit / IP**.
- Menjalankan smoke test berulang cepat bisa memicu HTTP 429 pada register/login —
  restart server API untuk reset, atau beri jeda antar run.

## 5. Realtime (Socket.IO)

- Koneksi WebSocket ikut origin web (`/socket.io`), auth lewat token di handshake.
- Client reconnect otomatis; status koneksi tampil di pojok shell (`● Live / ○ Offline`).
- Untuk >1 replica API nanti, pasang Redis adapter (lihat `docs/notes/03-BELUM-DIKERJAKAN.md`).

## 6. Insiden (PRD §132)

1. **Deteksi**: health check gagal / laporan user / alert.
2. **Mitigasi cepat**: restart API (`npm run start -w @sofo/api`), atau `down`+`up` DB bila DB bermasalah.
3. **Investigasi**: cek log API, `GET /workspaces/:id/audit` (jejak aksi), tabel `_prisma_migrations`.
4. **Recovery data**: ikuti bagian Restore di atas (butuh approval owner).
5. **Pasca-insiden**: catat kronologi + akar masalah di `docs/SESSION-NOTES.md`, perbaiki runbook ini.

## 7. Deployment rilis (PRD §133, §134, §136)

- CI (`.github/workflows/ci.yml`): lint → typecheck → unit → build → E2E smoke + Postgres service.
- Release (`.github/workflows/release.yml`): push tag `v*` atau manual dispatch →
  membangun EXE (Tauri 2) + APK (signed via secrets) → artifact `sofo-windows-exe` / `sofo-android-apk`.
- Setiap rilis wajib punya: version, changelog, status test, known issue, rollback strategy.
