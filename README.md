<div align="center">

<img src="docs/media/selah-story.gif" alt="Selah: dari doomscroll jam 23:47 ke tujuh ayat yang dibaca pelan, ditemani Selo si domba" width="100%" />

# Selah

**Ganti doomscroll dengan scroll yang menguatkan jiwa.**

[Unduh APK Android](https://github.com/stephenprasetyachrismawan/AlkitabScroll/releases/latest) · [Tonton video lengkap (57 detik)](docs/media/selah-story.mp4)

</div>

---

## Kenapa Selah ada

Jam 23:47. Jempol masih scroll. Dua jam lewat, dan tidak ada satu pun yang teringat.

*Selah* adalah kata dalam Mazmur yang artinya **berhenti sejenak, renungkan**. Aplikasi ini memakai gerakan yang sama dengan media sosial, yaitu scroll, tapi isinya ayat Alkitab dan ujungnya jelas: tujuh ayat yang dibaca pelan, lalu aplikasinya sendiri bilang *"Cukup untuk hari ini."*

## Sehari bersama Selah

**Pagi, satu pertanyaan.** Selo si domba menanyakan perasaanmu: senang, sedih, cemas, lelah, marah, atau bersyukur. Ayat hari ini disusun dari jawabanmu.

**Tujuh ayat, dibaca pelan.** Setiap ayat punya tokohnya. Kalau ayatnya tentang rajawali, Dara si merpati terbang. Kalau tentang keberanian, Arka si singa kecil mengaum. Pipi si burung pipit dan Lumi si pelita juga punya bagiannya. Api streak terisi satu demi satu, dan tidak ada feed tanpa ujung.

**Taman Iman di layar utama.** Widget-nya tumbuh dari benih sampai pohon berbunga setiap kali kamu kembali. Kalau kamu absen, kamu tidak dimarahi; Selo cuma tidur menunggu.

**Curhat.** Tulis saja apa yang kamu rasakan, misalnya *"hari ini aku cemas soal ujian besok"*, lalu pencarian pintar menangkap maksudnya dan memberi ayat yang pas. Catatanmu hanya tersimpan di HP.

**Perjalanan Alkitab.** Ada 18 kisah dari Abraham sampai Paulus, dengan kuis singkat dan kartu hafalan yang muncul lagi tepat sebelum lupa.

**Bagikan dan saling mendoakan.** Studio kartu ayat dengan banyak tema. Setiap kali berbagi, kamu menabur satu benih yang membuka tema baru. Ada juga streak bareng teman dan permintaan doa di chat, lengkap dengan tombol *"Aku doakan 🙏"*.

<div align="center">
<img src="docs/media/cast.png" alt="Selo, Dara, Arka, Pipi dan Lumi" width="88%" />
</div>

## Isi ayat

- 290+ perikop dari daftar ayat renungan Protestan yang umum, dibagi ke 21 kategori.
- Teks tidak diketik manual. Semuanya diambil otomatis dari [alkitab.sabda.org](https://alkitab.sabda.org), lalu jumlah ayat per perikop divalidasi.
- Tersedia tiga terjemahan: TB dan BIMK (© Lembaga Alkitab Indonesia) serta KJV (domain publik). Rilis publik di Play Store butuh izin tertulis dari LAI.

---

<details>
<summary><b>Untuk pengembang</b>: menjalankan, membangun, dan struktur kode</summary>

### Teknologi

React Native + Expo (Expo Router), Supabase (Auth Google, database, realtime), Reanimated. Karakter digambar dari View biasa tanpa aset gambar, jadi ukuran APK tetap kecil.

### Supabase (gratis)

1. Buat proyek di [supabase.com](https://supabase.com).
2. Buka **SQL Editor**, lalu jalankan isi [`supabase/migrations/0001_init.sql`](supabase/migrations/0001_init.sql).
3. Buka **Authentication → Providers → Google**, lalu isi Client ID dan Secret dari [Google Cloud Console](https://console.cloud.google.com/apis/credentials). Pakai OAuth client tipe *Web application* dengan redirect URI `https://<project>.supabase.co/auth/v1/callback`.
4. Buka **Authentication → URL Configuration → Redirect URLs**, lalu tambahkan `selah://auth-callback`, `exp://**`, dan `http://localhost:8081/**`.
5. Salin `.env.example` ke `.env.local`, lalu isi URL dan publishable key dari **Project Settings → API**.

> Supabase gratis menjeda proyek yang tidak dipakai selama 7 hari.

### Menjalankan

```bash
npm install
npx expo start          # scan QR dengan Expo Go, atau tekan "a" untuk emulator
npm test                # tes unit
npm run typecheck       # TypeScript
npx expo lint           # lint
npm run fetch-verses    # ambil ulang teks ayat dari sabda.org
```

Setiap push ke `main` membangun APK di GitHub Actions dan menerbitkannya di [Releases](https://github.com/stephenprasetyachrismawan/AlkitabScroll/releases). Build manual: `npx eas-cli@latest build -p android --profile preview`.

### Struktur

```
src/app/            layar (Expo Router)
src/components/     VerseCard, Feed, karakter, widget, chat, journey
src/lib/            algoritma feed, Supabase, kategori, mood, i18n
data/verses.json    teks ayat (hasil fetch)
supabase/           skema database + RLS
video/              video cerita di atas (HyperFrames), lihat video/README.md
docs/               algoritma feed dan media README
```

Algoritma feed ("route stack": mood > simpan > suka > lama melihat > acak) dijelaskan di [docs/ALGORITMA.md](docs/ALGORITMA.md).

</details>
