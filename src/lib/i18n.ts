export type Lang = 'id' | 'en';

const dict = {
  appTagline: { id: 'Berhenti sejenak. Renungkan firman-Nya.', en: 'Pause. Reflect on His word.' },
  signInGoogle: { id: 'Masuk dengan Google', en: 'Continue with Google' },
  signInNote: {
    id: 'Ganti doomscroll dengan scroll yang menguatkan jiwa.',
    en: 'Trade doomscrolling for scrolling that strengthens your soul.',
  },
  moodQuestion: { id: 'Bagaimana perasaanmu hari ini?', en: 'How are you feeling today?' },
  moodHint: {
    id: 'Kami akan menyiapkan ayat yang sesuai untukmu.',
    en: "We'll prepare verses that fit where you are.",
  },
  verseOfDay: { id: 'Ayat Hari Ini', en: 'Verse of the Day' },
  home: { id: 'Beranda', en: 'Home' },
  explore: { id: 'Jelajah', en: 'Explore' },
  messages: { id: 'Pesan', en: 'Messages' },
  profile: { id: 'Profil', en: 'Profile' },
  status: { id: 'Status', en: 'Status' },
  liked: { id: 'Disukai', en: 'Liked' },
  saved: { id: 'Disimpan', en: 'Saved' },
  comments: { id: 'Komentar', en: 'Comments' },
  writeComment: { id: 'Tulis komentar…', en: 'Write a comment…' },
  send: { id: 'Kirim', en: 'Send' },
  noComments: { id: 'Belum ada komentar. Jadilah yang pertama.', en: 'No comments yet. Be the first.' },
  follow: { id: 'Ikuti', en: 'Follow' },
  following: { id: 'Mengikuti', en: 'Following' },
  followers: { id: 'Pengikut', en: 'Followers' },
  message: { id: 'Kirim Pesan', en: 'Message' },
  editProfile: { id: 'Ubah Profil', en: 'Edit Profile' },
  settings: { id: 'Pengaturan', en: 'Settings' },
  language: { id: 'Bahasa', en: 'Language' },
  translation: { id: 'Terjemahan Alkitab', en: 'Bible Translation' },
  theme: { id: 'Tema', en: 'Theme' },
  themeSystem: { id: 'Ikuti sistem', en: 'System' },
  themeLight: { id: 'Terang', en: 'Light' },
  themeDark: { id: 'Gelap', en: 'Dark' },
  viewMode: { id: 'Mode tampilan', en: 'View mode' },
  modePost: { id: 'Post 3:4', en: 'Post 3:4' },
  modeReels: { id: 'Reels 9:16', en: 'Reels 9:16' },
  signOut: { id: 'Keluar', en: 'Sign out' },
  deleteAccount: { id: 'Hapus akun', en: 'Delete account' },
  deleteConfirm: {
    id: 'Akun dan semua datamu akan dihapus permanen. Lanjutkan?',
    en: 'Your account and all data will be permanently deleted. Continue?',
  },
  cancel: { id: 'Batal', en: 'Cancel' },
  yes: { id: 'Ya', en: 'Yes' },
  selahTitle: { id: 'Selah · Saat Teduh', en: 'Selah · Quiet Time' },
  selahBody: {
    id: 'Kamu sudah membaca 30 ayat. Berhenti sejenak, tarik napas, dan biarkan firman-Nya tinggal di hatimu.',
    en: "You've read 30 verses. Pause, breathe, and let His word settle in your heart.",
  },
  continueScroll: { id: 'Lanjutkan', en: 'Continue' },
  enoughToday: { id: 'Cukup untuk hari ini', en: 'Enough for today' },
  enoughBody: {
    id: 'Tuhan memberkatimu. Sampai jumpa besok. 🤍',
    en: 'God bless you. See you tomorrow. 🤍',
  },
  shareTo: { id: 'Bagikan', en: 'Share' },
  sendToFriend: { id: 'Kirim ke teman', en: 'Send to a friend' },
  exportImage: { id: 'Simpan sebagai gambar / status WA', en: 'Export image / WhatsApp status' },
  makeStatus: { id: 'Jadikan status (24 jam)', en: 'Post as status (24h)' },
  statusNote: { id: 'Tambahkan catatan (opsional)', en: 'Add a note (optional)' },
  statusPosted: { id: 'Status terkirim ke pengikutmu.', en: 'Status shared with your followers.' },
  yourStatus: { id: 'Statusmu', en: 'Your status' },
  searchUsers: { id: 'Cari teman…', en: 'Find friends…' },
  categories: { id: 'Kategori', en: 'Categories' },
  noMessages: { id: 'Belum ada percakapan.', en: 'No conversations yet.' },
  report: { id: 'Laporkan', en: 'Report' },
  block: { id: 'Blokir', en: 'Block' },
  unblock: { id: 'Buka blokir', en: 'Unblock' },
  reported: { id: 'Terima kasih, laporan terkirim.', en: 'Thanks, report sent.' },
  delete: { id: 'Hapus', en: 'Delete' },
  emptyLiked: { id: 'Ayat yang kamu sukai akan muncul di sini.', en: 'Verses you like will appear here.' },
  emptySaved: { id: 'Ayat yang kamu simpan akan muncul di sini.', en: 'Verses you save will appear here.' },
  displayName: { id: 'Nama', en: 'Name' },
  username: { id: 'Nama pengguna', en: 'Username' },
  bio: { id: 'Bio', en: 'Bio' },
  save: { id: 'Simpan', en: 'Save' },
  moodToday: { id: 'Mood hari ini', en: "Today's mood" },
  moodHistory: { id: 'Riwayat mood', en: 'Mood history' },
  setupTitle: { id: 'Supabase belum diatur', en: 'Supabase not configured' },
  setupBody: {
    id: 'Isi EXPO_PUBLIC_SUPABASE_URL dan EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY di file .env.local, lalu jalankan ulang aplikasi. Lihat README.',
    en: 'Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY in .env.local, then restart. See README.',
  },
  readContext: { id: 'Baca pasal lengkap', en: 'Read full chapter' },
  copyright: { id: 'Hak cipta', en: 'Copyright' },
  errorGeneric: { id: 'Terjadi kesalahan. Coba lagi.', en: 'Something went wrong. Try again.' },
  justNow: { id: 'baru saja', en: 'just now' },
  sentVerse: { id: 'mengirim ayat', en: 'sent a verse' },
  people: { id: 'Orang', en: 'People' },
  versesTab: { id: 'Ayat', en: 'Verses' },
  searchVerses: { id: 'Cari ayat… (mis. damai, Yohanes 3)', en: 'Search verses… (e.g. peace, John 3)' },
  noResults: { id: 'Tidak ditemukan.', en: 'No results.' },
  suggested: { id: 'Saran untuk diikuti', en: 'Suggested for you' },
  typeToSearch: { id: 'Ketik minimal 2 huruf.', en: 'Type at least 2 letters.' },
  notifications: { id: 'Notifikasi', en: 'Notifications' },
  notifAllow: { id: 'Izinkan notifikasi', en: 'Allow notifications' },
  notifDenied: {
    id: 'Notifikasi diblokir. Buka Pengaturan HP untuk mengizinkan.',
    en: 'Notifications are blocked. Open phone settings to allow them.',
  },
  openSettings: { id: 'Buka pengaturan', en: 'Open settings' },
  dailyReminder: { id: 'Pengingat harian', en: 'Daily reminder' },
  reminderTime: { id: 'Jam pengingat', en: 'Reminder time' },
  messageNotif: { id: 'Notifikasi pesan baru', en: 'New message alerts' },
  testNotif: { id: 'Kirim notifikasi uji', en: 'Send test notification' },
  testNotifBody: { id: 'Notifikasi Selah berfungsi. Tuhan memberkati! 🕊️', en: 'Selah notifications work. God bless! 🕊️' },
  reminderTitle: { id: 'Saatnya Selah sejenak 🕊️', en: 'Time for a Selah pause 🕊️' },
  newMessageFrom: { id: 'Pesan baru dari', en: 'New message from' },
  music: { id: 'Musik latar', en: 'Background music' },
  musicHint: { id: 'Instrumental tenang saat menggulir ayat', en: 'Calm instrumentals while you scroll' },
} satisfies Record<string, Record<Lang, string>>;

export type StringKey = keyof typeof dict;

export function translate(lang: Lang, key: StringKey): string {
  return dict[key][lang];
}

export function timeAgo(iso: string, lang: Lang): string {
  const s = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return translate(lang, 'justNow');
  const units: [number, string, string][] = [
    [60, 'm', 'm'],
    [3600, 'j', 'h'],
    [86400, 'h', 'd'],
    [604800, 'mg', 'w'],
  ];
  let out = '';
  for (const [sec, id, en] of units) {
    if (s >= sec) out = `${Math.floor(s / sec)}${lang === 'id' ? id : en}`;
  }
  return out;
}
