# Selah

> *Selah* — kata dalam Mazmur yang berarti "berhenti sejenak, renungkan".

Aplikasi Android (React Native + Expo) untuk menggantikan doomscroll dengan scroll ayat Alkitab.
Setiap ayat tampil sebagai postingan bergaya sesuai kategorinya, dengan mode **Post 3:4** dan **Reels 9:16**.

## Fitur

| Fitur | Keterangan |
|---|---|
| Login Google | Lewat Supabase Auth |
| Moody harian | Wajib diisi saat pertama membuka aplikasi tiap hari; mengarahkan algoritma |
| Feed algoritma | "Route stack": mood > simpan > suka > lama melihat > acak (lihat [docs/ALGORITMA.md](docs/ALGORITMA.md)) |
| Ayat Hari Ini | Sama untuk semua pengguna di hari yang sama |
| Saat Teduh | Setiap 30 ayat: jeda dengan musik instrumental (YouTube embed) dan pilihan "Cukup untuk hari ini" |
| Suka, Simpan, Komentar | Komentar publik, dengan filter kata kasar, lapor & blokir |
| Profil | Tab Disukai & Disimpan; membuka satu ayat lalu scroll berlanjut ke algoritma |
| Ikuti | Follow antar pengguna, profil publik |
| Status 24 jam | Hanya untuk pengikut; bisa diekspor jadi gambar untuk status WhatsApp/IG |
| Pesan (DM) | Chat realtime, bisa kirim ayat ke teman |
| 3 terjemahan | TB, BIMK (© LAI), KJV (domain publik) |
| 2 bahasa | Indonesia & Inggris, plus mode gelap |
| Hapus akun | Tersedia di Pengaturan |

## Isi ayat

- 290+ perikop dipilih dari daftar ayat renungan Protestan yang umum dipakai (GotQuestions Indonesia, CNN Indonesia, Bisnis.com, Tithe.ly, dll), dibagi ke 21 kategori.
- **Teks tidak diketik manual.** Semua diambil otomatis dari [alkitab.sabda.org](https://alkitab.sabda.org) lewat `scripts/fetch-verses.mjs`, lalu divalidasi (jumlah ayat per perikop harus cocok).
- Penomoran Mazmur di TB/BIMK mengikuti teks Ibrani (sering beda 1–2 ayat dari KJV). Katalog menyimpan referensi KJV terpisah untuk kasus ini.
- Hak cipta: TB & BIMK © Lembaga Alkitab Indonesia. Untuk rilis publik di Play Store, perlu izin tertulis dari LAI.

Daftar & kategori: [`scripts/catalog.txt`](scripts/catalog.txt). Untuk menambah ayat: tambah baris di katalog, lalu `npm run fetch-verses`.

## Menjalankan

### 1. Supabase (gratis)

1. Buat proyek di [supabase.com](https://supabase.com).
2. **SQL Editor** → jalankan isi [`supabase/migrations/0001_init.sql`](supabase/migrations/0001_init.sql).
3. **Authentication → Providers → Google**: aktifkan, isi Client ID & Secret dari [Google Cloud Console](https://console.cloud.google.com/apis/credentials) (OAuth client tipe *Web application*, redirect URI = `https://<project>.supabase.co/auth/v1/callback`).
4. **Authentication → URL Configuration → Redirect URLs**: tambahkan `selah://auth-callback` (aplikasi Android), `exp://**` (Expo Go saat development), dan `http://localhost:8081/**` (web).
5. Salin `.env.example` ke `.env.local`, isi URL & publishable key dari **Project Settings → API**.

> Supabase gratis menjeda proyek setelah 7 hari tidak dipakai. Untuk publik, pertimbangkan paket Pro.

### 2. Aplikasi

```bash
npm install
npx expo start          # scan QR dengan Expo Go, atau tekan "a" untuk emulator Android
```

Build APK Android (tanpa Android Studio):

```bash
npx eas-cli@latest build -p android --profile preview
```

### Perintah lain

```bash
npm test              # tes unit algoritma
npm run typecheck     # TypeScript
npx expo lint         # lint
npm run fetch-verses  # ambil ulang teks ayat dari sabda.org
```

## Struktur

```
src/app/            layar (Expo Router)
  (tabs)/           Beranda, Jelajah, Pesan, Profil
  login, mood       gerbang harian
  comments/, chat/, status/, user/, post/, category/
src/components/     VerseCard, Feed, SelahBreak, ShareSheet, ProfileView, StatusRow
src/lib/            algorithm (route stack), api (Supabase), categories (gaya), moods, i18n
data/verses.json    teks ayat (hasil fetch)
supabase/           skema database + RLS
```
