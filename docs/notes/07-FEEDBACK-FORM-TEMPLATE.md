# SOFO — Template Formulir Feedback Tester (PRD §97, §98)

> Template siap pakai untuk didistribusikan bersama APK beta.2.
> **Cara pakai owner:** salin isian di bawah ke Google Forms (±5 menit),
> lalu kirim link-nya ke tester bersama APK. Bisa juga dipakai langsung
> sebagai chat template di WhatsApp/Telegram.
> Loop keputusan tetap lewat **menu Feedback di aplikasi** — formulir ini
> melengkapi, bukan menggantikan (lihat `06-BETA-PHASE26.md` §6).

---

## 1. Teks pembuka (copy ke deskripsi form)

```
Halo Tester SOFO! 👋

Terima kasih sudah mencoba beta pertama SOFO — Your All-in-One Digital
Office. Selama ±30 menit pemakaian, tolong coba skenario di bawah, lalu
catat semua yang terasa aneh, membingungkan, atau menyebalkan.

Tidak ada jawaban salah — jujur itu justru paling berharga.
Semua data di beta ini adalah data uji; jangan isi data pribadi nyata.
```

---

## 2. Pertanyaan form (untuk Google Forms)

### Bagian A — Profil tester (wajib, sekali)

| # | Pertanyaan | Tipe | Opsi |
|---|---|---|---|
| A1 | Nama / panggilan | Jawaban singkat | — |
| A2 | Kamu dari segmen mana? | Pilihan | Freelancer / Agency / UMKM / Komunitas / Staf perusahaan |
| A3 | Perangkat yang dipakai | Pilihan | HP Android (sebutkan tipe) / Tablet / Emulator |
| A4 | Versi APK yang dipasang | Pilihan | v0.1.0-beta.2 release / v0.1.0-beta.2 debug / beta.1 (jangan, mohon update) |

### Bagian B — Skenario uji (checkbox konfirmasi)

> Satu pertanyaan grid checkbox: "Skenario mana yang BERHASIL kamu selesaikan?"
> (semua dari `06-BETA-PHASE26.md` §5):

1. Daftar akun + login
2. Set Server URL + "Terhubung" di layar login
3. Buat workspace (ENTERPRISE dan/atau COMMUNITY)
4. Undang anggota + beri role
5. Chat: kirim / edit / hapus / reply pesan
6. Upload + download file
7. Meeting: buat → mulai → tulis live notes → akhiri
8. Project + task kanban (geser status)
9. Kalender: event sekali + event **berulang** + pengingat
10. ENTERPRISE: clock in/out + ajukan request (cuti) + approve
11. COMMUNITY: pesan member masuk moderasi, moderator approve/remove
12. Kirim feedback lewat menu Feedback di aplikasi
13. Logout → login ulang, data masih ada

### Bagian C — Penilaian (skala 1–5, rating)

| # | Pertanyaan |
|---|---|
| C1 | Seberapa mudah daftar + setup awal? |
| C2 | Seberapa cepat chat & notifikasi terasa? |
| C3 | Seberapa jelas istilah & tampilan (bahasa, ikon, alur)? |
| C4 | Seberapa yakin kamu mau pakai versi beta berikutnya? |
| C5 | Nilai keseluruhan pengalaman |

### Bagian D — Masalah & saran (paragraf, boleh kosong)

| # | Pertanyaan |
|---|---|
| D1 | Apa masalah/pengalaman paling mengganggu? (apa yang kamu lakukan, apa yang terjadi) |
| D2 | Fitur apa yang paling kamu butuhkan tapi belum ada? |
| D3 | Ada yang membingungkan dari tampilan/alur? |
| D4 | Hal terbaik menurut kamu di aplikasi ini? |

### Bagian E — Detail bug (diisi jika ada bug)

| # | Pertanyaan | Tipe |
|---|---|---|
| E1 | Di fitur apa? | Dropdown: Chat / Files / Meeting / Project / Kalender / Presensi / Request / Moderasi / Feedback / Lainnya |
| E2 | Langkah sampai bug muncul (1-2-3) | Paragraf |
| E3 | Yang kamu harapkan vs yang terjadi | Paragraf |
| E4 | Seberapa parah? | Pilihan: Blokir total / Tapi bisa lanjut / Gangguan kecil |
| E5 | Screenshot/record? | Upload file (opsional) |
| E6 | Jam kejadian (biar bisa dicek di log server) | Jawaban singkat |

---

## 3. Chat template WhatsApp/Telegram (untuk broadcast)

```
Halo! Kamu terpilih jadi tester beta pertama SOFO 🎉

1. Unduh APK + panduan:
   https://github.com/Roschak/SoFo/releases/tag/v0.1.0-beta.2
   (ambil sofo-v0.1.0-beta.2-release.apk)
2. Sambungkan HP ke WiFi yang sama dengan laptopku
3. Install APK (izinkan "install dari sumber tidak dikenal")
4. Buka SOFO → di layar login bagian Server pastikan:
   http://192.168.68.107:4001 → tap "Simpan & uji koneksi"
   sampai muncul "Terhubung"
5. Daftar akun (email palsu boleh) dan coba semua menu
6. Ada bug/ide? Kirim lewat menu Feedback di dalam aplikasi —
   kamu bakal dapat notifikasi jawabannya langsung

Server aktif selagi laptopku nyala — kalau gagal konek, kabari aku.
Data uji: jangan isi data pribadi nyata. Terima kasih! 🙏
```

---

## 4. Triage untuk owner (setelah form terisi)

1. Sortir entri: Blokir total → dulu; lalu bug lain → saran.
2. Buatkan item di **menu Feedback** aplikasi bila pelapor belum (atau
   sebaliknya, konfirmasi via form) — vote membantu prioritisasi.
3. Putuskan tiap item: REVIEWED / ACCEPTED / REJECTED (+catatan) —
   tester otomatis dapat notifikasi keputusan (loop tertutup §98).
4. Item ACCEPTED → salin ke `docs/notes/03-BELUM-DIKERJAKAN.md`
   untuk sesi berikutnya.

Terakhir diperbarui: 2026-09-28, Sesi #8 (beta.2).
