# CLAUDE.md

Selah: aplikasi Android (React Native + Expo SDK 58, Expo Router, Supabase) yang menggantikan doomscroll dengan scroll ayat Alkitab. Lihat `README.md` untuk fitur dan `AGENTS.md` untuk aturan Expo (jangan percaya hafalan API Expo, cek docs versi SDK 58).

## Setup

- Package manager: **npm** (`package-lock.json`). Node 22 dipakai di CI.
- Pasang dependensi: `npm ci --include=dev`
  - Flag `--include=dev` wajib bila `NODE_ENV=production` (kasus sesi cloud). Tanpa itu eslint, typescript, dan @types/react tidak terpasang dan `expo lint` gagal.
- Env (opsional untuk typecheck/test/lint; wajib untuk menjalankan aplikasi): salin `.env.example` ke `.env.local`, isi `EXPO_PUBLIC_SUPABASE_URL` dan `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY`. Jangan commit `.env.local`.
- Backend: jalankan `supabase/migrations/*.sql` berurutan di Supabase SQL Editor, aktifkan Google OAuth (detail di README).

## Perintah penting

```bash
npm run typecheck     # tsc --noEmit
npm test              # node --test tests/*.test.ts (algoritma feed, 7 tes)
npx expo lint         # eslint (flat config, eslint-config-expo)
npx expo-doctor       # cek konfigurasi dan versi dependensi Expo
npx expo start        # dev server (Expo Go / emulator)
npm run fetch-verses  # ambil ulang teks ayat dari sabda.org ke data/verses.json
npx eas-cli@latest build -p android --profile preview   # APK via EAS
```

Sebelum selesai mengerjakan sesuatu: jalankan typecheck, lint, dan test. Tambah paket dengan `npx expo install <paket>`, bukan `npm install`.

## CI

`.github/workflows/android-release.yml`: push ke `main` atau tag `v*` menjalankan `npx tsc --noEmit`, `npm test`, `expo prebuild`, `gradlew assembleRelease`, lalu upload APK (release ke GitHub Releases hanya dari main/tag). Folder `android/` dan `ios/` digenerate (CNG), jangan diedit tangan; atur native lewat `app.json` dan config plugin. Branch `slim-apk` = APK ramping (arm64-v8a saja, R8 minify, resource shrinking).

## Struktur

```
src/app/         layar Expo Router
  (tabs)/        Beranda, Jelajah, Pesan, Profil
  login, mood, setup, settings, edit-profile, auth-callback
  comments/, chat/, status/, user/, post/, category/
src/components/  VerseCard, Feed, SelahBreak, ShareSheet, ProfileView, StatusRow, komponen UI (Glass, Aurora, ...)
src/lib/         algorithm (route stack), api (Supabase), auth, categories, moods, i18n, notifications, moderation, storage
data/verses.json teks ayat hasil fetch (jangan diketik manual)
scripts/         catalog.txt (daftar perikop), fetch-verses.mjs
supabase/        migrasi skema + RLS
tests/           tes unit algoritma
docs/            ALGORITMA.md, screenshots
```

## Catatan

- Algoritma feed ("route stack": mood > simpan > suka > lama melihat > acak) ada di `src/lib/algorithm.ts`, dijelaskan di `docs/ALGORITMA.md`, dan dites di `tests/algorithm.test.ts`.
- Teks TB/BIMK hak cipta LAI; KJV domain publik.
- Status pemeriksaan terakhir (branch slim-apk): typecheck, lint, test (7/7), dan expo-doctor (20/20) lolos. `npm audit` melaporkan 12 kerentanan (9 moderate, 3 high) pada dependensi transitif; belum ditangani.
