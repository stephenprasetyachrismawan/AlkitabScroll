// "Perjalanan Alkitab": a winding path through the Bible story, Abraham to Paul.
// Each stop retells a story in a few lines, then reads five verses tied to it and ends
// with a short quiz. Verse ids point into data/verses.json, so every stop works offline
// in all three translations. Pure data: no React, safe to import from tests.

type L = { id: string; en: string };

/** Who appears on a stop. The character thread can map each id to an animated figure. */
export type FigureId =
  | 'abraham'
  | 'joseph'
  | 'moses'
  | 'joshua'
  | 'david'
  | 'isaiah'
  | 'jeremiah'
  | 'jesus'
  | 'peter'
  | 'paul';

export type StoryQuestion = { q: L; options: L[]; answer: number };

export type JourneyNode = {
  id: string;
  figure: FigureId;
  /** an Ionicons glyph for the stop's medallion */
  icon: string;
  title: L;
  /** where to read the full story */
  source: L;
  /** a short retelling, two or three sentences */
  intro: L;
  verseIds: string[];
  story: StoryQuestion;
};

export type Chapter = { id: string; title: L; subtitle: L; nodes: JourneyNode[] };

export const CHAPTERS: Chapter[] = [
  {
    id: 'fathers',
    title: { id: 'Para Bapa Leluhur', en: 'The Patriarchs' },
    subtitle: { id: 'Iman yang berjalan tanpa peta', en: 'Faith that walks without a map' },
    nodes: [
      {
        id: 'abraham-call',
        figure: 'abraham',
        icon: 'footsteps',
        title: { id: 'Abraham dipanggil', en: 'Abraham is called' },
        source: { id: 'Kejadian 12; 15', en: 'Genesis 12; 15' },
        intro: {
          id: 'Allah memanggil Abram meninggalkan negerinya menuju tanah yang belum pernah ia lihat. Ia berangkat hanya dengan janji: keturunannya akan menjadi bangsa yang besar dan menjadi berkat bagi semua kaum.',
          en: 'God called Abram to leave his homeland for a land he had never seen. He set out with nothing but a promise: his family would become a great nation and a blessing to every people.',
        },
        verseIds: ['Ibr11.1', 'Ibr11.6', 'Ams3.5-6', 'Mzm37.5', '2Kor5.7'],
        story: {
          q: { id: 'Apa yang Allah minta dari Abram?', en: 'What did God ask Abram to do?' },
          options: [
            { id: 'Meninggalkan negerinya', en: 'Leave his homeland' },
            { id: 'Membangun bahtera', en: 'Build an ark' },
            { id: 'Menjadi raja', en: 'Become a king' },
          ],
          answer: 0,
        },
      },
      {
        id: 'abraham-moriah',
        figure: 'abraham',
        icon: 'flame',
        title: { id: 'Gunung Moria', en: 'Mount Moriah' },
        source: { id: 'Kejadian 22', en: 'Genesis 22' },
        intro: {
          id: 'Abraham diuji untuk menyerahkan Ishak, anak yang lama dinantikan. Di puncak gunung Allah menghentikannya dan menyediakan seekor domba jantan sebagai gantinya.',
          en: 'Abraham was tested to give up Isaac, the son he had waited for. On the mountaintop God stopped him and provided a ram in Isaac’s place.',
        },
        verseIds: ['Kej22.14', 'Flp4.19', 'Mat6.33', 'Rm8.32', 'Mzm34.10'],
        story: {
          q: { id: 'Apa yang Allah sediakan sebagai ganti Ishak?', en: 'What did God provide in Isaac’s place?' },
          options: [
            { id: 'Seekor domba jantan', en: 'A ram' },
            { id: 'Seekor burung merpati', en: 'A dove' },
            { id: 'Roti dan anggur', en: 'Bread and wine' },
          ],
          answer: 0,
        },
      },
      {
        id: 'joseph',
        figure: 'joseph',
        icon: 'shirt',
        title: { id: 'Dari sumur ke istana', en: 'From pit to palace' },
        source: { id: 'Kejadian 37–50', en: 'Genesis 37–50' },
        intro: {
          id: 'Yusuf dijual saudara-saudaranya, difitnah, lalu dipenjara. Bertahun-tahun kemudian ia menjadi penguasa Mesir dan menyelamatkan keluarganya dari kelaparan. "Kamu mereka-rekakan yang jahat, tetapi Allah mereka-rekakannya untuk kebaikan."',
          en: 'Joseph was sold by his brothers, falsely accused, and jailed. Years later he ruled Egypt and saved his family from famine. “You meant evil against me, but God meant it for good.”',
        },
        verseIds: ['Rm8.28', 'Gal6.9', 'Yak1.2-4', 'Mzm37.23', 'Ams16.9'],
        story: {
          q: { id: 'Siapa yang menjual Yusuf?', en: 'Who sold Joseph?' },
          options: [
            { id: 'Saudara-saudaranya', en: 'His brothers' },
            { id: 'Firaun', en: 'Pharaoh' },
            { id: 'Ayahnya, Yakub', en: 'His father, Jacob' },
          ],
          answer: 0,
        },
      },
    ],
  },
  {
    id: 'exodus',
    title: { id: 'Keluar dari Mesir', en: 'Out of Egypt' },
    subtitle: { id: 'Allah yang membuka jalan', en: 'The God who makes a way' },
    nodes: [
      {
        id: 'moses-bush',
        figure: 'moses',
        icon: 'bonfire',
        title: { id: 'Semak yang menyala', en: 'The burning bush' },
        source: { id: 'Keluaran 3–4', en: 'Exodus 3–4' },
        intro: {
          id: 'Di padang gurun Musa melihat semak yang menyala tetapi tidak terbakar habis. Allah memanggilnya untuk membebaskan Israel. Musa merasa tidak mampu, dan Allah menjawab, "Aku akan menyertai engkau."',
          en: 'In the wilderness Moses saw a bush on fire that did not burn up. God sent him to free Israel. Moses felt unable, and God answered, “I will be with you.”',
        },
        verseIds: ['Kel33.14', 'Yes41.10', 'Ul31.8', 'Mzm32.8', 'Yes43.2'],
        story: {
          q: { id: 'Apa yang aneh dari semak itu?', en: 'What was strange about the bush?' },
          options: [
            { id: 'Menyala tetapi tidak habis terbakar', en: 'It burned but was not consumed' },
            { id: 'Berbuah di musim kering', en: 'It bore fruit in the dry season' },
            { id: 'Bisa berpindah tempat', en: 'It moved from place to place' },
          ],
          answer: 0,
        },
      },
      {
        id: 'red-sea',
        figure: 'moses',
        icon: 'water',
        title: { id: 'Laut terbelah', en: 'The sea parts' },
        source: { id: 'Keluaran 14–15', en: 'Exodus 14–15' },
        intro: {
          id: 'Terjepit antara laut dan pasukan Firaun, Israel ketakutan. Musa berkata, "TUHAN akan berperang untuk kamu." Laut terbelah dan mereka berjalan di tanah kering, lalu bernyanyi di seberang.',
          en: 'Trapped between the sea and Pharaoh’s army, Israel was terrified. Moses said, “The LORD will fight for you.” The sea parted, they walked on dry ground, and sang on the far shore.',
        },
        verseIds: ['Kel14.14', 'Kel15.2', 'Mzm46.1', 'Mzm18.2', 'Rm8.31'],
        story: {
          q: { id: 'Bagaimana Israel menyeberangi laut?', en: 'How did Israel cross the sea?' },
          options: [
            { id: 'Berjalan di tanah kering', en: 'On dry ground' },
            { id: 'Naik perahu', en: 'By boat' },
            { id: 'Berenang bersama-sama', en: 'Swimming together' },
          ],
          answer: 0,
        },
      },
      {
        id: 'joshua',
        figure: 'joshua',
        icon: 'flag',
        title: { id: 'Kuatkan hatimu, Yosua', en: 'Be strong, Joshua' },
        source: { id: 'Yosua 1; 6; 24', en: 'Joshua 1; 6; 24' },
        intro: {
          id: 'Sesudah Musa wafat, Yosua memimpin bangsa yang besar memasuki tanah perjanjian. Tiga kali Allah berkata kepadanya, "Kuatkan dan teguhkanlah hatimu." Di akhir hidupnya Yosua memilih: "Aku dan seisi rumahku akan beribadah kepada TUHAN."',
          en: 'After Moses died, Joshua led a whole nation into the promised land. Three times God told him, “Be strong and courageous.” At the end of his life Joshua chose: “As for me and my house, we will serve the LORD.”',
        },
        verseIds: ['Yos1.9', 'Ul31.6', 'Yos24.15', 'Mzm27.14', '2Tim1.7'],
        story: {
          q: { id: 'Siapa yang Yosua gantikan sebagai pemimpin?', en: 'Whom did Joshua succeed as leader?' },
          options: [
            { id: 'Musa', en: 'Moses' },
            { id: 'Daud', en: 'David' },
            { id: 'Abraham', en: 'Abraham' },
          ],
          answer: 0,
        },
      },
    ],
  },
  {
    id: 'kings',
    title: { id: 'Raja dan Nabi', en: 'Kings and Prophets' },
    subtitle: { id: 'Hati yang jatuh dan dipulihkan', en: 'Hearts that fall and are restored' },
    nodes: [
      {
        id: 'david-shepherd',
        figure: 'david',
        icon: 'leaf',
        title: { id: 'Daud si gembala', en: 'David the shepherd' },
        source: { id: '1 Samuel 16–17; Mazmur 23', en: '1 Samuel 16–17; Psalm 23' },
        intro: {
          id: 'Anak bungsu yang menggembalakan domba dipilih Allah menjadi raja. Dengan umban dan lima batu Daud menghadapi Goliat, dan dari padang penggembalaan lahir nyanyian "TUHAN adalah gembalaku."',
          en: 'The youngest son, out with the sheep, was chosen by God to be king. With a sling and five stones David faced Goliath, and from the pastures came the song “The LORD is my shepherd.”',
        },
        verseIds: ['Mzm23.1-4', 'Mzm27.1', 'Mzm28.7', 'Mzm3.3', '1Taw28.20'],
        story: {
          q: { id: 'Apa yang Daud bawa untuk melawan Goliat?', en: 'What did David take to face Goliath?' },
          options: [
            { id: 'Umban dan batu', en: 'A sling and stones' },
            { id: 'Pedang dan perisai', en: 'A sword and shield' },
            { id: 'Busur dan panah', en: 'A bow and arrows' },
          ],
          answer: 0,
        },
      },
      {
        id: 'david-repent',
        figure: 'david',
        icon: 'heart-half',
        title: { id: 'Hati yang baru', en: 'A clean heart' },
        source: { id: '2 Samuel 11–12; Mazmur 51', en: '2 Samuel 11–12; Psalm 51' },
        intro: {
          id: 'Raja Daud jatuh dalam dosa yang besar. Ketika nabi Natan menegurnya, Daud tidak membela diri. Ia mengaku, dan doanya menjadi Mazmur 51: "Jadikanlah hatiku tahir, ya Allah."',
          en: 'King David fell into grave sin. When the prophet Nathan confronted him, David did not defend himself. He confessed, and his prayer became Psalm 51: “Create in me a clean heart, O God.”',
        },
        verseIds: ['Mzm51.10', 'Mzm103.12', '1Yoh1.9', 'Mzm32.7', 'Yes1.18'],
        story: {
          q: { id: 'Nabi siapa yang menegur Daud?', en: 'Which prophet confronted David?' },
          options: [
            { id: 'Natan', en: 'Nathan' },
            { id: 'Elia', en: 'Elijah' },
            { id: 'Yunus', en: 'Jonah' },
          ],
          answer: 0,
        },
      },
      {
        id: 'isaiah',
        figure: 'isaiah',
        icon: 'sparkles',
        title: { id: 'Sayap rajawali', en: 'Wings like eagles' },
        source: { id: 'Yesaya 6; 40', en: 'Isaiah 6; 40' },
        intro: {
          id: 'Yesaya melihat kemuliaan Allah dan berkata, "Ini aku, utuslah aku!" Kepada bangsa yang letih di pembuangan ia membawa kabar penghiburan: yang menanti-nantikan TUHAN mendapat kekuatan baru.',
          en: 'Isaiah saw God’s glory and said, “Here am I, send me!” To a weary people in exile he brought comfort: those who wait on the LORD renew their strength.',
        },
        verseIds: ['Yes40.31', 'Yes40.29', 'Yes26.3', 'Yes43.1', 'Yes55.12'],
        story: {
          q: { id: 'Apa jawaban Yesaya saat Allah mencari utusan?', en: 'What did Isaiah say when God looked for a messenger?' },
          options: [
            { id: '"Ini aku, utuslah aku!"', en: '“Here am I, send me!”' },
            { id: '"Utuslah orang lain."', en: '“Send someone else.”' },
            { id: '"Aku terlalu muda."', en: '“I am too young.”' },
          ],
          answer: 0,
        },
      },
      {
        id: 'jeremiah',
        figure: 'jeremiah',
        icon: 'color-palette',
        title: { id: 'Di rumah tukang periuk', en: 'At the potter’s house' },
        source: { id: 'Yeremia 1; 18; 29', en: 'Jeremiah 1; 18; 29' },
        intro: {
          id: 'Yeremia dipanggil sejak muda dan menangisi bangsanya. Di rumah tukang periuk ia melihat tanah liat yang rusak dibentuk ulang. Kepada orang buangan ia menulis: Allah punya rancangan damai sejahtera untuk hari depan mereka.',
          en: 'Jeremiah was called young and wept over his people. At the potter’s house he watched spoiled clay reshaped. To the exiles he wrote: God has plans of peace for their future.',
        },
        verseIds: ['Yer29.11', 'Yer1.5', 'Yer33.3', 'Rat3.22-23', 'Yer31.3'],
        story: {
          q: { id: 'Apa yang Yeremia lihat di rumah tukang periuk?', en: 'What did Jeremiah see at the potter’s house?' },
          options: [
            { id: 'Tanah liat dibentuk ulang', en: 'Clay being reshaped' },
            { id: 'Periuk emas', en: 'A golden pot' },
            { id: 'Roda yang terbakar', en: 'A burning wheel' },
          ],
          answer: 0,
        },
      },
    ],
  },
  {
    id: 'jesus',
    title: { id: 'Yesus', en: 'Jesus' },
    subtitle: { id: 'Firman yang menjadi manusia', en: 'The Word made flesh' },
    nodes: [
      {
        id: 'birth',
        figure: 'jesus',
        icon: 'star',
        title: { id: 'Lahir di Betlehem', en: 'Born in Bethlehem' },
        source: { id: 'Lukas 1–2', en: 'Luke 1–2' },
        intro: {
          id: 'Malaikat berkata kepada Maria, "Bagi Allah tidak ada yang mustahil." Di Betlehem bayi Yesus dibaringkan di palungan, dan kabar sukacita pertama sampai kepada para gembala di padang.',
          en: 'The angel told Mary, “Nothing is impossible with God.” In Bethlehem the baby Jesus was laid in a manger, and the first good news came to shepherds in the fields.',
        },
        verseIds: ['Luk1.37', 'Yoh3.16', 'Luk19.10', '1Yoh4.19', 'Rm5.8'],
        story: {
          q: { id: 'Di mana bayi Yesus dibaringkan?', en: 'Where was the baby Jesus laid?' },
          options: [
            { id: 'Di palungan', en: 'In a manger' },
            { id: 'Di istana', en: 'In a palace' },
            { id: 'Di Bait Allah', en: 'In the Temple' },
          ],
          answer: 0,
        },
      },
      {
        id: 'mount',
        figure: 'jesus',
        icon: 'sunny',
        title: { id: 'Khotbah di Bukit', en: 'Sermon on the Mount' },
        source: { id: 'Matius 5–7', en: 'Matthew 5–7' },
        intro: {
          id: 'Di sebuah bukit Yesus mengajar orang banyak: berbahagialah yang berdukacita, kamu adalah terang dunia, jangan kuatir akan hari esok. Cara hidup yang terbalik dari dunia, dan justru di situ ada kelegaan.',
          en: 'On a hillside Jesus taught the crowds: blessed are those who mourn, you are the light of the world, do not worry about tomorrow. A way of life upside down from the world’s, and full of rest.',
        },
        verseIds: ['Mat5.4', 'Mat5.14', 'Mat5.16', 'Mat6.34', 'Mat7.7-8'],
        story: {
          q: { id: 'Yesus menyebut murid-murid-Nya sebagai apa?', en: 'What did Jesus call His disciples?' },
          options: [
            { id: 'Terang dunia', en: 'The light of the world' },
            { id: 'Raja bumi', en: 'Kings of the earth' },
            { id: 'Penjaga Bait Allah', en: 'Keepers of the Temple' },
          ],
          answer: 0,
        },
      },
      {
        id: 'shepherd',
        figure: 'jesus',
        icon: 'trail-sign',
        title: { id: 'Gembala yang baik', en: 'The good shepherd' },
        source: { id: 'Yohanes 8; 10; 14', en: 'John 8; 10; 14' },
        intro: {
          id: 'Yesus berkata, "Akulah gembala yang baik." Domba-domba-Nya mengenal suara-Nya. Ia juga berkata, "Akulah jalan, kebenaran dan hidup," dan mengundang semua yang letih untuk datang kepada-Nya.',
          en: 'Jesus said, “I am the good shepherd.” His sheep know His voice. He also said, “I am the way, the truth and the life,” and invited all who are weary to come to Him.',
        },
        verseIds: ['Yoh10.27', 'Yoh10.10', 'Yoh14.6', 'Yoh8.12', 'Mat11.28-30'],
        story: {
          q: { id: 'Apa yang domba-domba kenal dari gembalanya?', en: 'What do the sheep recognise in their shepherd?' },
          options: [
            { id: 'Suaranya', en: 'His voice' },
            { id: 'Pakaiannya', en: 'His clothes' },
            { id: 'Tongkatnya', en: 'His staff' },
          ],
          answer: 0,
        },
      },
      {
        id: 'cross',
        figure: 'jesus',
        icon: 'sunny-outline',
        title: { id: 'Salib dan kubur kosong', en: 'The cross and the empty tomb' },
        source: { id: 'Yohanes 11; 19–20', en: 'John 11; 19–20' },
        intro: {
          id: 'Yesus menyerahkan nyawa-Nya di kayu salib. Pada hari ketiga para perempuan menemukan kubur-Nya kosong. Ia sudah berkata sebelumnya, "Akulah kebangkitan dan hidup."',
          en: 'Jesus gave His life on the cross. On the third day the women found His tomb empty. He had said beforehand, “I am the resurrection and the life.”',
        },
        verseIds: ['Yoh11.25-26', '2Kor5.21', 'Rm6.23', 'Yoh15.12-13', 'Yoh16.33'],
        story: {
          q: { id: 'Pada hari ke berapa kubur Yesus ditemukan kosong?', en: 'On which day was the tomb found empty?' },
          options: [
            { id: 'Hari ketiga', en: 'The third day' },
            { id: 'Hari ketujuh', en: 'The seventh day' },
            { id: 'Hari keempat puluh', en: 'The fortieth day' },
          ],
          answer: 0,
        },
      },
    ],
  },
  {
    id: 'church',
    title: { id: 'Gereja Mula-mula', en: 'The Early Church' },
    subtitle: { id: 'Kabar baik sampai ke ujung bumi', en: 'Good news to the ends of the earth' },
    nodes: [
      {
        id: 'peter',
        figure: 'peter',
        icon: 'boat',
        title: { id: 'Petrus di atas air', en: 'Peter on the water' },
        source: { id: 'Matius 14; Kisah 2–4', en: 'Matthew 14; Acts 2–4' },
        intro: {
          id: 'Petrus pernah melangkah di atas air lalu tenggelam karena takut, dan Yesus memegang tangannya. Nelayan yang pernah menyangkal Yesus itu kemudian berkhotbah dengan berani pada hari Pentakosta.',
          en: 'Peter once stepped onto the water and sank in fear, and Jesus caught his hand. The fisherman who had denied Jesus later preached boldly on the day of Pentecost.',
        },
        verseIds: ['Mat14.27', '1Ptr5.7', 'Kis4.12', '1Ptr2.9', '1Ptr1.3'],
        story: {
          q: { id: 'Mengapa Petrus mulai tenggelam?', en: 'Why did Peter begin to sink?' },
          options: [
            { id: 'Ia takut melihat angin', en: 'He was afraid of the wind' },
            { id: 'Perahunya bocor', en: 'His boat had a leak' },
            { id: 'Ia terlalu lelah', en: 'He was too tired' },
          ],
          answer: 0,
        },
      },
      {
        id: 'damascus',
        figure: 'paul',
        icon: 'flash',
        title: { id: 'Jalan ke Damsyik', en: 'The road to Damascus' },
        source: { id: 'Kisah 9', en: 'Acts 9' },
        intro: {
          id: 'Saulus berangkat ke Damsyik untuk menangkap pengikut Yesus. Di tengah jalan cahaya dari langit membuatnya buta, dan Yesus berbicara kepadanya. Tiga hari kemudian ia melihat lagi, dengan hidup yang sama sekali baru.',
          en: 'Saul set out for Damascus to arrest followers of Jesus. On the road a light from heaven blinded him, and Jesus spoke to him. Three days later he could see again, with an entirely new life.',
        },
        verseIds: ['2Kor5.17', '1Tim1.15', 'Gal2.20', 'Ef2.8-9', 'Kis16.31'],
        story: {
          q: { id: 'Apa yang terjadi pada Saulus di jalan?', en: 'What happened to Saul on the road?' },
          options: [
            { id: 'Ia dibutakan cahaya dari langit', en: 'A light from heaven blinded him' },
            { id: 'Ia dirampok', en: 'He was robbed' },
            { id: 'Ia tersesat di gurun', en: 'He got lost in the desert' },
          ],
          answer: 0,
        },
      },
      {
        id: 'prison',
        figure: 'paul',
        icon: 'lock-open',
        title: { id: 'Sukacita di penjara', en: 'Joy in prison' },
        source: { id: 'Kisah 16; Filipi 4', en: 'Acts 16; Philippians 4' },
        intro: {
          id: 'Paulus dan Silas dipukuli lalu dipenjara, tetapi tengah malam mereka berdoa dan menyanyi. Bertahun-tahun kemudian, dari penjara lain, Paulus menulis kepada jemaat Filipi: "Bersukacitalah senantiasa."',
          en: 'Paul and Silas were beaten and jailed, yet at midnight they prayed and sang. Years later, from another prison, Paul wrote to the Philippians: “Rejoice always.”',
        },
        verseIds: ['Flp4.4', 'Flp4.6-7', 'Flp4.11-12', 'Flp4.13', 'Flp1.6'],
        story: {
          q: { id: 'Apa yang Paulus dan Silas lakukan tengah malam di penjara?', en: 'What did Paul and Silas do at midnight in prison?' },
          options: [
            { id: 'Berdoa dan menyanyi', en: 'Prayed and sang' },
            { id: 'Menggali terowongan', en: 'Dug a tunnel' },
            { id: 'Tidur nyenyak', en: 'Slept soundly' },
          ],
          answer: 0,
        },
      },
      {
        id: 'finish',
        figure: 'paul',
        icon: 'trophy',
        title: { id: 'Garis akhir', en: 'The finish line' },
        source: { id: '2 Timotius 4; Wahyu 21', en: '2 Timothy 4; Revelation 21' },
        intro: {
          id: 'Menjelang akhir hidupnya Paulus menulis, "Aku telah mengakhiri pertandingan." Alkitab ditutup dengan janji: Allah akan menghapus segala air mata, dan tidak akan ada lagi maut.',
          en: 'Near the end of his life Paul wrote, “I have finished the race.” The Bible closes with a promise: God will wipe away every tear, and death shall be no more.',
        },
        verseIds: ['2Tim4.7', 'Ibr12.1-2', '2Kor4.16-18', 'Rm8.38-39', 'Why21.4'],
        story: {
          q: { id: 'Paulus membandingkan hidupnya dengan apa?', en: 'What did Paul compare his life to?' },
          options: [
            { id: 'Sebuah pertandingan', en: 'A race' },
            { id: 'Sebuah rumah', en: 'A house' },
            { id: 'Sebuah kebun', en: 'A garden' },
          ],
          answer: 0,
        },
      },
    ],
  },
];

export const NODES: JourneyNode[] = CHAPTERS.flatMap((c) => c.nodes);
export const NODE_MAP: Record<string, JourneyNode> = Object.fromEntries(NODES.map((n) => [n.id, n]));
export const nodeIndex = (id: string) => NODES.findIndex((n) => n.id === id);
export const chapterOf = (id: string) => CHAPTERS.find((c) => c.nodes.some((n) => n.id === id));
