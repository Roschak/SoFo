# ADR-003 — Custom Design System (Bukan Template)

Status: Accepted
Tanggal: 2026-09-17
Keputusan: Owner

## Konteks
Owner menuntut tampilan modern dan eksplisit menolak template/admin kit.

## Keputusan
Frontend membangun **design system sendiri**:
- Design tokens (warna, spacing, tipografi, radius, shadow) didefinisikan sendiri
- Komponen primitif custom (Button, Input, Card, Modal, dsb.) dibangun dari nol
- Tanpa UI kit pihak ketiga, tanpa admin template

## Konsekuensi
+ Identitas visual unik, kontrol penuh atas UX
+ Bundle kecil, tanpa dependensi tema pihak ketiga
- Waktu pembangunan komponen lebih lama — diterima owner
- Wajib dokumentasi token agar konsisten
