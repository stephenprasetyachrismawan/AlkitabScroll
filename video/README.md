# Video cerita Selah ("Jempol yang Lelah")

Film 57 detik di bagian atas README utama, dibuat dengan [HyperFrames](https://github.com/heygen-com/hyperframes) (HTML yang dirender jadi video).

**Cerita:** jam 23:47, jempol masih scroll. Lalu tanda jeda ‖ jatuh, warna kertas Selah mengalir, dan Selo memandu satu hari di aplikasi: mood pagi, tujuh ayat dengan tokohnya, streak, Taman Iman, Curhat, Perjalanan Alkitab, berbagi dan mendoakan teman. Ditutup dengan "Cukup untuk hari ini."

## Dari mana gambarnya

- **Karakter** (`assets/sprites/*.webp`) adalah animasi asli dari `src/components/characters`. Setiap aksi direkam frame demi frame dari build web aplikasinya (15 fps, satu putaran penuh, kecepatan aslinya), lalu disusun jadi sprite sheet.
- **Taman Iman** digambar dari data kotak `gardenArt()` milik widget (`src/lib/widgetArt.ts`).
- **Layar dan teks** (mood, kartu ayat, Curhat, perjalanan, kartu share, chat doa) dibangun ulang dengan warna, font (`assets/fonts`, sama dengan app), dan teks asli dari kode (`i18n.ts`, `moods.ts`, `journey/path.ts`, `shareCards.ts`, `sowing.ts`). Ayatnya diambil dari `data/verses.json`.

## Struktur

```
index.html              root: menyusun 9 adegan berurutan
compositions/*.html     satu adegan per file (doom, selah, mood, verses, garden, curhat, journey, share, end)
assets/                 font, sprite karakter, gsap
```

## Mengedit dan merender

```bash
cd video
npx hyperframes preview     # buka Studio untuk melihat dan mengedit
npx hyperframes check       # cek aturan komposisi
npx hyperframes render -q delivery -o ../docs/media/selah-story.mp4
```

GIF untuk README dibuat dari MP4 dengan ffmpeg (960 px, 12 fps, palet 128 warna):

```bash
ffmpeg -i ../docs/media/selah-story.mp4 -vf "fps=12,scale=960:-1:flags=lanczos,split[a][b];[a]palettegen=max_colors=128:stats_mode=diff[p];[b][p]paletteuse=dither=bayer:bayer_scale=4:diff_mode=rectangle" ../docs/media/selah-story.gif
```

Film ini belum punya musik. Kalau mau ditambah, taruh file audio di `assets/` lalu tambahkan elemen `<audio id="music" data-start="0" data-volume="0.6">` di `index.html`.
