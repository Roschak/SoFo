# SEDANG DIKERJAKAN — berhenti di tengah (RESUME DI SINI)

## Task aktif: tambah `authorName` pada message view API

**Kenapa**: UI chat web butuh nama penulis pesan; sebelumnya API hanya kirim `authorId`.

### Yang sudah diubah (source code sudah benar, BELUM lolos E2E)
- `apps/api/src/modules/communication/communication.service.ts`
  - `MESSAGE_INCLUDE` + relasi `author: { select: { displayName: true } }`
  - `toMessageView()` sekarang mengembalikan `authorName`
  - type `MessageWithRelations` + field `author`
- `packages/shared/src/realtime.ts` — `MessageRealtimeView` sudah punya `authorName`
- Web sudah konsumsi `authorName` (`ChannelView.tsx`)
- Typecheck & build SUKSES; unit test lulus (mock tidak menyentuh relasi)

### BLOCKER: Prisma client belum mengenal relasi `author`
Gejala: semua endpoint message `POST/PATCH/GET` → 500 INTERNAL_ERROR.
Verifikasi root cause (sudah dites manual):

```
prisma.message.findFirst({ include: { author: ... } })
→ PrismaClientValidationError: Unknown field `author` for include
  statement on model `Message`. (index.d.ts lama masih ter-load)
```

**PENTING**: schema `prisma/schema.prisma` SUDAH benar — relasi `author User`
ada di model Message sejak awal. Yang lama adalah **generated client**.

### Langkah lanjut persis (urut, jangan loncat)
1. Pastikan Docker DB hidup:
   `docker compose -f apps/api/docker-compose.yml up -d`
2. Stop proses node yang pegang port 4001:
   `netstat -ano | grep :4001` → `taskkill //F //PID <pid>`
3. Regenerate client (cari error saat ini dulu):
   `cd apps/api && npx prisma generate`
   - Jika error: catat output mentah, coba `npx prisma generate --help`
     untuk opsi; kemungkinan perlu hapus `node_modules/.prisma` lalu generate ulang.
   - Pembanding: `grep -c "author" node_modules/.prisma/client/index.d.ts`
     (angkanya harus naik setelah generate; sebelum fix = 84 tapi tanpa relasi
     `author` di model Message — cek bagian `model Message` di
     `node_modules/.prisma/client/schema.prisma`).
4. Rebuild: `npm run build -w @sofo/api` (harus 0 error)
5. Start server:
   `cd apps/api && DATABASE_URL="postgresql://sofo:sofo_dev@localhost:5433/sofo?schema=public" nohup node dist/main.js > /tmp/sofo-api.log 2>&1 &`
6. Uji manual satu message dulu (script debug ada di riwayat, atau:
   register → login → create workspace → create channel → send message).
   Harus 201 + body ada `authorName`.
7. Regression penuh:
   - `node test/http-smoke.mjs` → target 41/41
   - `node test/realtime-smoke.mjs` → target 15/15
8. `npm run lint && npm run typecheck && npm test` (semua workspace)
9. Commit.

### Alternatif yang SUDAH dipertimbangkan (jalan pintas terakhir)
Jika generate tetap gagal: hapus field `authorName` dari view API + shared type,
ubah `ChannelView.tsx` ambil nama dari `members` list (client-side join).
Tapi ini menambah coupling — hanya jika langkah 3 benar-benar buntu.

---

## Status server saat sesi berhenti
- API :4001 MATI (dipatikan untuk mencoba regenerate)
- Web dev :5173 mungkin masih hidup (tidak masalah, matikan saja nanti)
- DB Docker `sofo-db` :5433 seharusnya masih hidup (healthy)
