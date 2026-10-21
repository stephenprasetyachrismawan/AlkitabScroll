# Algoritma feed Selah: "route stack"

Kode: [`src/lib/algorithm.ts`](../src/lib/algorithm.ts) · Tes: [`tests/algorithm.test.ts`](../tests/algorithm.test.ts)

## Ide dasar

Setiap aksi pengguna menumpuk satu **route** = (sumber, kategori, kekuatan, kedaluwarsa).
Kekuatan route **memudar lurus** sampai habis saat kedaluwarsa, jadi feed selalu mengikuti kebutuhan terbaru dan tidak basi.

| Sumber | Porsi peluang | Kekuatan per sinyal | Umur |
|---|---|---|---|
| Moody (mood harian) | 40% | 3 (dibagi ke kategori mood) | 3 hari |
| Simpan | 25% | 2 | 14 hari |
| Suka | 10% | 1 | 7 hari |
| Lama melihat (≥ 6 detik) | 10% | 0,5 | 3 hari |
| Acak | 15% | selalu ada | — |

Sinyal dari satu ayat dibagi rata ke semua kategori ayat itu.
Sinyal berulang ke kategori yang sama **ditumpuk** ke kekuatan yang sudah memudar (maks. 10), dan umurnya diperbarui.

## Memilih postingan berikutnya

1. Tiap sumber memiliki porsinya. Di dalam satu sumber, kategori berbagi porsi itu sesuai kekuatan (yang sudah memudar).
2. Sumber tanpa route aktif menyerahkan porsinya ke sumber lain (dinormalisasi ulang). Acak selalu ikut.
3. Undi kategori, lalu ambil ayat yang **belum dilihat** dari kategori itu.
4. Maksimal dua postingan berturut-turut dari kategori yang sama, demi variasi.
5. Setelah semua ayat dilihat, daftar "sudah dilihat" diulang.

## Mood → kategori

| Mood | Kategori (bobot) |
|---|---|
| 😊 Senang | Sukacita 3, Syukur 3, Kasih 2, Pekerjaan 1, Relasi 1 |
| 😢 Sedih | Penghiburan 4, Pengharapan 3, Kasih 2, Sukacita 1 |
| 😰 Cemas | Damai 4, Perlindungan 3, Iman 2, Pemeliharaan 2, Doa 1 |
| 😩 Lelah | Perhentian 4, Kekuatan 3, Ketekunan 2, Pengharapan 1 |
| 😠 Marah | Damai 3, Pengampunan 3, Hikmat 2, Kasih 1, Relasi 1 |
| 🙏 Bersyukur | Syukur 4, Sukacita 2, Keselamatan 2, Pemeliharaan 1, Identitas 1 |

Karena mood berumur 3 hari, mood hari ini **bertumpuk** dengan dua hari sebelumnya yang sudah memudar.

## Penyimpanan

Route disimpan di tabel `algo_routes` (satu baris per sumber+kategori), diperbarui lewat fungsi SQL `bump_route` dengan rumus yang sama.
Aplikasi juga memperbarui route di memori, jadi feed langsung berubah tanpa menunggu server.
