# SOFO Beta 2 — Panduan Tester (Satu Halaman)

> Versi: **v0.1.0-beta.2** · Server: laptop owner via WiFi lokal (Opsi A)
> Kirim halaman ini + APK + link formulir feedback ke tester.

---

## 📦 Yang kamu butuhkan (±5 menit)

1. HP/tablet **Android 8.0+** + APK terlampir (`sofo-v0.1.0-beta.2-release.apk`, 3.3 MB)
2. **WiFi yang sama dengan laptop owner** — server ada di laptop, bukan internet
3. Email apa saja untuk daftar (boleh email palsu — ini data uji!)

## 🚀 Setup (sekali)

1. Buka APK → izinkan *"Install dari sumber tidak dikenal"* → install
2. Buka **SOFO** → di layar login, bagian **Server**:
   pastikan berisi `http://192.168.68.107:4001` → tap **Simpan & uji koneksi**
   → tunggu **"Terhubung (… ms)"**
   *(Gagal? Cek WiFi, tanya owner apakah server hidup, atau tap "Pakai default")*
3. **Daftar** akun baru → login

## ✅ Yang dicoba (±30 menit, urut bebas)

| # | Skenario |
|---|---|
| 1 | Buat workspace — coba **kedua** mode: ENTERPRISE dan COMMUNITY |
| 2 | Undang anggota lain (email yang sudah terdaftar), ubah role-nya |
| 3 | **Chat**: kirim, edit, hapus pesan sendiri, reply (thread) — buka di 2 HP biar terlihat realtime |
| 4 | Upload file (maks 25 MB), download, hapus |
| 5 | **Meeting**: buat → mulai → 2 orang tulis live notes → akhiri |
| 6 | Project + task → assign ke anggota → geser kartu (kanban) |
| 7 | **Kalender**: buat event sekali + event **berulang** (baru!) → cek pengingat |
| 8 | ENTERPRISE saja: clock in/out presensi, ajukan cuti (request) |
| 9 | COMMUNITY saja: kirim pesan sebagai MEMBER → moderator approve/remove |
| 10 | **Feedback**: kirim bug/usulan lewat menu Feedback + vote (dogfooding!) |
| 11 | Logout → login ulang → data masih ada? |

## 🐞 Cara melapor

1. **Menu Feedback di aplikasi** (paling disukai — otomatis masuk sistem, kamu
   dapat notifikasi jawabannya)
2. Chat langsung ke owner + screenshot + **jam kejadian**

## ⚠️ Yang perlu diketahui

- Firewall port 4001 sudah diizinkan di laptop owner — tester langsung bisa konek
- Data beta **bisa hilang** kapan saja — jangan simpan data penting
- Status koneksi realtime terlihat di **pojok kiri bawah** aplikasi
- Login maksimal 20×/5 menit per IP — jangan spam
- Punya APK **beta.1**? Hapus dulu, install beta.2 ini

## 🙏 Terima kasih!

Setiap laporan langsung diproses — kamu akan dapat **notifikasi keputusan**
di aplikasi (diterima/ditolak/masuk backlog). Loop-nya tertutup!

---
*SOFO v0.1.0-beta.2 · Souloffice · 2026-09-28*
