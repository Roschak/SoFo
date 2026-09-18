# SOFO — CATATAN STATUS (Folder Notes)

> Folder ini dibuat sesuai permintaan owner: catatan apa yang SUDAH, yang SEDANG
> dikerjakan, dan yang BELUM dikerjakan — agar sesi berikutnya bisa langsung lanjut
> tanpa kehilangan konteks.

## Isi folder

| File | Isi |
|---|---|
| `01-SUDAH-DIKERJAKAN.md` | Semua yang selesai + terverifikasi |
| `02-SEDANG-DIKERJAKAN.md` | Pekerjaan yang berhenti di tengah + langkah lanjut persis |
| `03-BELUM-DIKERJAKAN.md` | Yang belum disentuh, urut sesuai PRD |

## Urutan baca saat membuka sesi baru

1. Baca `02-SEDANG-DIKERJAKAN.md` — mulai dari sini, ada blocker aktif.
2. Baca `03-BELUM-DIKERJAKAN.md` — peta pekerjaan ke depan.
3. `01-SUDAH-DIKERJAKAN.md` — referensi jika perlu konteks yang sudah jadi.

## File pendukung lain

| File | Isi |
|---|---|
| `docs/SESSION-NOTES.md` | Log detail per sesi (termasuk bug yang ditemukan & perbaikannya) |
| `docs/PROGRESS.md` | Tracker 27 phase PRD + checklist MVP |
| `docs/ARCHITECTURE.md` | Diagram arsitektur & alur request/realtime |
| `docs/adr/` | Keputusan arsitektur (ADR-001 s/d ADR-004) |

## Aturan sesi (dari owner)

- Sebelum sesi berakhir — apa pun alasannya — TULIS DULU status terakhir di folder ini.
- Jangan pernah menyatakan "selesai" jika test/build belum lulus (PRD §104).
- Jangan menebak; kalau ragu, catat sebagai "perlu keputusan owner" (PRD §102).

Terakhir diperbarui: 2026-09-18, Sesi #2c — Audit service + viewer (PRD §49)
selesai. Lanjut ke P1 berikutnya di `03-BELUM-DIKERJAKAN.md`.
