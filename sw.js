/* ============================================================
   Service Worker — Habit
   Cache app-shell dasar supaya bisa dibuka offline / lebih cepat.
   Naikkan CACHE_VERSION setiap kali file HTML/CSS/JS utama diubah,
   supaya pengguna otomatis dapat versi terbaru.
   ============================================================ */
const CACHE_VERSION = "v352";
const CACHE_NAME = "habit-" + CACHE_VERSION;
/* v352 -- Badge "adalah nama LAMA" di dropdown Kirim ke Grup Telegram:
   latar jadi hijau pudar, nama yang diketik ditebalkan. */
/* v351 -- Fitur baru: dialog "Kirim Sebelum Lunas / Setelah Lunas" saat
   checkbox "Pesan u/ Inventory" dicentang. Notifikasi resmi "siap
   diproses" ke Logistik TIDAK berubah sama sekali (tetap nunggu ACC
   Finance) -- ini cuma tambahan opsional. Lihat sendRincianToGroup di
   Worker_Rincian_Pemesanan.js. */
/* v350 -- Follow Up: indikator keyakinan prediksi (tinggi/sedang/rendah)
   berdasar konsistensi histori gap tiap customer -- rumus median TIDAK
   diubah (sudah dikonfirmasi dekat-optimal lewat backtest), murni
   tambahan transparansi. Lihat computeFollowUpData di
   Worker_Rincian_Pemesanan.js. */
/* v349 -- Follow Up: label kolom "Rata Jarak" diganti jadi "Median Jarak"
   (isinya memang median, bukan mean -- tidak ada logika/angka yang
   berubah, murni perbaikan label). */
/* v348 -- Dropdown saran nama (Kirim ke Grup Telegram) sekarang ikut
   mencari nama LAMA/alias, dengan penanda jelas biar CS tahu itu bukan
   nama aktif. */
/* v347 -- Perbaikan false-positive di peringatan "Customer ini kemungkinan
   sudah terdaftar" (Kirim ke Grup Telegram) -- bagian kota dalam kurung
   tidak lagi ikut dibandingkan, cuma bagian nama. */
/* v346 -- Notifikasi Follow Up ke CS: pengecualian overlap Daftar
   Logistik dihapus khusus di fitur ini -- lihat perbaikan di
   Worker_Rincian_Pemesanan.js (checkFollowUpDmNotif). */
/* v345 -- Perbaikan teks kartu "Notifikasi Follow Up ke CS" supaya sesuai
   perilaku backend yang baru diperbaiki (mode broadcast, bukan per-CS
   lagi) -- lihat perbaikan besar di Worker_Rincian_Pemesanan.js
   (checkFollowUpDmNotif). */
/* v344 -- Rekap Pesanan: badge kecil "● diupdate" sekarang nempel PERSIS
   di kolom field yang baru berubah (Status/Resi/Invoice/KG/Ekspedisi/
   Varian&Qty), bukan cuma penanda umum. Disimpan di Upstash (BUKAN KV/D1
   -- murni data tampilan, hilang otomatis setelah 3 jam). */
/* v343 -- Perbaikan bug lanjutan (laporan "masih freeze begitu app
   dibuka lagi, selalu balik ke Rekap Pesanan"): ternyata ada fitur
   "pulihkan tampilan terakhir setelah reload" (localStorage
   notaHalawa_lastView) yang bikin app OTOMATIS lompat ke Rekap Pesanan/
   Follow Up begitu dibuka lagi -- lalu LANGSUNG fetch+render tabel penuh
   dari nol, PERSIS bersamaan dgn index.html (~1MB, satu file besar)
   yang masih diparse/dieksekusi browser saat boot. 2 beban berat itu
   numpuk di detik paling kritis -> kemungkinan kuat inilah penyebab
   freeze yang dilaporkan. Sekarang reload/buka-ulang app SELALU balik
   ke Beranda dulu utk 2 halaman itu (bukan lagi otomatis lompat) --
   pemulihan tampilan "wiz" (form Grosir/Custom yang lagi diisi) TIDAK
   berubah, tetap dipulihkan seperti biasa krn itu murni data lokal,
   tidak ada fetch jaringan sama sekali. SENGAJA TIDAK dipaksa (bukan
   darurat/keamanan) -- pakai alur normal (popup "Versi Baru Tersedia"). */
/* v342 -- Fitur baru "Pesan u/ Inventory" (dulu "Keterangan Tambahan") di
   popup "Kirim ke Grup Telegram": checkbox baru di samping "Dropship"
   (1 baris, rapi), field-nya textarea (lebih tinggi, isinya catatan
   bebas buat Logistik) yang cuma muncul kalau dicentang. Isinya TIDAK
   pernah masuk caption/nota (tidak bocor ke customer) -- cuma dibaca
   ulang & ditaruh sbg baris terakhir "Pesan dari CS: ..." di DM "siap
   diproses" ke Logistik (dikirim begitu Finance klik Konfirmasi DAN
   status sudah Lunas 100%). DM Logistik itu juga sekarang menampilkan
   baris alias customer ("↳ dulu: ...") kalau ada, persis di bawah nama.
   BARU JUGA -- "auto-isi saat Revisi Pemesanan dicentang": begitu
   checkbox Revisi dicentang & nama customer terisi, sistem cek endpoint
   baru /revisi-autofill -- kalau customer itu punya rincian lama (di
   bawah 48 jam) yang punya data Dropship dan/atau Pesan u/ Inventory,
   field-nya otomatis ke-isi ulang (CS tidak perlu ngetik ulang info yang
   sama). Lewat 48 jam, dianggap basi & tidak ikut ke-autofill lagi.
   SENGAJA TIDAK dipaksa (bukan darurat/keamanan) -- pakai alur normal
   (popup "Versi Baru Tersedia"). */
/* v341 -- Perbaikan bug: menu "Rekap Pesanan" bisa freeze/macet total
   (harus force close dari recent apps) begitu HP dibuka lagi setelah
   sempat diminimize/pindah app lain. Penyebab: listener visibilitychange
   (fetch immediate begitu halaman terlihat lagi) TIDAK me-reset timer
   setInterval 30 detik (startAutoRefresh) -- padahal browser mobile
   menahan (throttle) setInterval selagi halaman disembunyikan, jadi
   timer yang tertahan itu bisa ikut "kejar setoran" persis di momen yang
   sama dengan fetch immediate, keduanya (fetch+hitung ulang ringkasan
   dari SELURUH baris+render ulang tabel) numpuk di saat paling sibuk
   (app baru resume) -> main thread terkunci beberapa detik. Sekarang
   startAutoRefresh() dipanggil ulang setelah fetch immediate selesai,
   countdown 30 detik mulai bersih dari momen resume, timer lama tidak
   akan sempat menembak dobel. SENGAJA TIDAK dipaksa (bukan darurat/
   keamanan) -- pakai alur normal (popup "Versi Baru Tersedia"). */
/* v340 -- Optimasi lanjutan "render nota di bawah 1 detik" (Kirim ke Grup
   Telegram): (1) ensureHtml2Canvas() sekarang JUGA dipicu lewat
   requestIdleCallback begitu app dibuka -- bukan cuma ditunggu sampai CS
   pertama kali klik Kirim/Unduh/Bagikan -- supaya download ~200KB
   html2canvas numpang di waktu browser nganggur, bukan bersaing dgn
   interaksi pertama CS. (2) renderCanvas() sekarang ikut menunggu
   document.fonts.ready (paralel dgn precache foto produk) sebelum
   menggambar nota -- jaga-jaga font Roboto belum sempat siap kalau CS
   langsung kirim dalam hitungan detik setelah app dibuka, yang bisa bikin
   lebar kolom nama produk (dihitung di atas asumsi Roboto) meleset dari
   font fallback yang sempat kepakai. (3) Dropdown saran nama di popup
   "Kirim ke Grup Telegram" sekarang menampilkan lagi baris "↳ dulu: ..."
   (nama alias) -- SEBELUMNYA (lihat catatan v-lama di HISTORY index.html)
   fitur ini pernah dicabut karena ambigu (sumbernya nameHistory, daftar
   nama flat, jadi alias yang tampil bisa salah sambung ke nama yang
   cuma kebetulan mengandung substring yang sama). Sekarang sumbernya
   diganti ke customerRecords (objek lengkap {name, cs, aliases[]}, SAMA
   PERSIS dgn yang sudah lama aman dipakai dropdown Master Nama/Rekap
   Pesanan/Follow Up) -- alias yang tampil di sini dijamin menempel ke
   record yang memang cocok, bukan hasil lookup terpisah yang gampang
   salah sambung seperti dulu. SENGAJA TIDAK dipaksa (bukan darurat/
   keamanan) -- pakai alur normal (popup "Versi Baru Tersedia"). */
/* v339 -- Menu Rekap Pesanan: filter rentang tanggal (dari-sampai)
   ditambahkan di sebelah dropdown "Semua Hari" -- 2 input tanggal +
   tombol ✕ pembersih, min/max kalender otomatis mengikuti data yang
   benar-benar ada. Filter jalan di browser (dateKeyDariRow, perbandingan
   string YYYY-MM-DD), 0 tambahan kuota baca KV. SENGAJA TIDAK dipaksa
   (bukan darurat/keamanan) -- pakai alur normal (popup "Perbarui
   Sekarang"). */
/* v338 -- Perbaikan bug: popup "Versi Baru Tersedia" bisa muncul
   berulang-ulang untuk versi yang sama. handleNewWorkerInstalled()
   SEBELUMNYA menulis localStorage (LS_KEY) begitu update terdeteksi,
   padahal user belum tentu klik terapkan / reload-nya belum tentu mulus
   -- localStorage jadi tidak sinkron dgn versi yang BENAR-BENAR aktif,
   memicu popup berulang. Sekarang localStorage HANYA ditulis oleh
   checkStartupVersionChange() (baca versi asli dari DOM), sedangkan
   dedup popup dalam 1 sesi tab pakai variabel di memori. SENGAJA TIDAK
   dipaksa (bukan darurat/keamanan) -- pakai alur normal (popup "Perbarui
   Sekarang"). */
/* v337 -- 2 perubahan:
   1) Teks pengaturan menu "Rekap Pesanan" di Master Data diperbaiki:
      tidak lagi mengklaim "cuma tampil di versi desktop" (sekarang juga
      ada di HP lewat "Aksi cepat"), dan penjelasan retensi data
      diperjelas: order Lunas+resi ada disimpan 25 hari, order yang belum
      selesai disimpan sampai 90 hari (sesuai ORDER_RETENTION_DAYS /
      ORDER_RETENTION_DAYS_INCOMPLETE di Worker).
   2) Rekap Pesanan dipaginasi (25 baris/halaman, tabel desktop & kartu
      mobile) -- tombol Sebelumnya/Selanjutnya muncul otomatis kalau
      hasil filter >25 baris. Baris TOTAL, ringkasan, dan Ekspor CSV/PDF
      tetap menghitung/menyertakan SEMUA baris hasil filter (PDF sengaja
      merender ulang penuh sesaat sebelum cetak, lalu kembali ke tampilan
      berhalaman setelahnya).
   SENGAJA TIDAK dipaksa (bukan darurat/keamanan) -- pakai alur normal
   (popup "Perbarui Sekarang"). */
/* v336 -- Menu Rekap Pesanan: kolom pencarian nama sekarang juga
   mencocokkan nama alias (nama lama), sama pola dgn Follow Up. Pakai
   rkAliasLookup yang SUDAH ADA, tidak ada perubahan Worker. SENGAJA
   TIDAK dipaksa (bukan darurat/keamanan) -- pakai alur normal (popup
   "Perbarui Sekarang"). */
/* v335 -- Menu Follow Up: kolom pencarian nama sekarang juga mencocokkan
   nama alias (nama lama), bukan cuma nama aktif customer. Pakai
   fuAliasLookup yang SUDAH ADA, tidak ada perubahan Worker. SENGAJA
   TIDAK dipaksa (bukan darurat/keamanan) -- pakai alur normal (popup
   "Perbarui Sekarang"). */
/* v334 -- Baris "↳ dulu: ..." di dropdown saran nama popup "Kirim ke
   Grup Telegram" dihapus lagi -- dinilai ambigu di konteks pencocokan
   substring. Kotak peringatan alias (exact-match) TIDAK berubah, tetap
   ada. Dropdown saran nama di Master Nama sendiri juga tidak berubah.
   SENGAJA TIDAK dipaksa (bukan darurat/keamanan) -- pakai alur normal
   (popup "Perbarui Sekarang"). */
/* v333 -- Teks "A.N." pada info Dropship dikembalikan jadi "a.n." (huruf
   kecil seperti semula) di badge kartu mobile Rekap Pesanan & tooltip
   tabel desktop. Worker_Rincian_Pemesanan.js juga ikut dikembalikan
   (caption "a.n." yang dikirim ke grup Telegram) -- perlu deploy ulang
   Worker terpisah. SENGAJA TIDAK dipaksa (bukan darurat/keamanan) --
   pakai alur normal (popup "Perbarui Sekarang"). */
/* v332 -- Teks "a.n." pada info Dropship diseragamkan jadi "A.N." di
   badge kartu mobile Rekap Pesanan & tooltip tabel desktop. Worker_
   Rincian_Pemesanan.js juga ikut diubah (caption "A.N." yang dikirim ke
   grup Telegram) -- perlu deploy ulang Worker terpisah. SENGAJA TIDAK
   dipaksa (bukan darurat/keamanan) -- pakai alur normal (popup "Perbarui
   Sekarang"). */
/* v331 -- Rekap Pesanan (kartu mobile): badge "📦 Dropship" sekarang
   menampilkan nama penerima langsung di badge-nya ("📦 Dropship · a.n.
   {nama}"), bukan cuma badge polos. SENGAJA TIDAK dipaksa (bukan
   darurat/keamanan) -- pakai alur normal (popup "Perbarui Sekarang"). */
/* v330 -- 2 perubahan:
   1) Master Nama: keterangan "Tekan Enter untuk simpan" muncul begitu
      mode edit/tambah alias aktif (baik lewat ketuk teks alias maupun
      tombol "+ Tambah").
   2) Nama alias (nama lama) sekarang ikut ditampilkan di 4 tempat baru:
      Rekap Pesanan (tabel & kartu mobile), popup "Perlu Dihubungi",
      subtitle popup "Riwayat Pembelian", dan dropdown saran nama di
      popup Kirim ke Grup Telegram + Master Nama sendiri. Semua pakai
      endpoint /customer-names yang SUDAH ADA, 0 endpoint baru.
   SENGAJA TIDAK dipaksa (bukan darurat/keamanan) -- pakai alur normal
   (popup "Perbarui Sekarang"). */
/* v329 -- Menu Follow Up: nama alias (nama lama) sekarang ditampilkan
   di tabel desktop, kartu mobile, dan popup Detail Customer -- baris
   kecil "↳ dulu: ..." di bawah nama kalau customer itu tercatat punya
   alias di Master Nama. Dipakai endpoint yang SUDAH ADA (/customer-
   names), dimuat lepas (tidak menghambat tabel utama), tidak ada
   perubahan Worker. SENGAJA TIDAK dipaksa (bukan darurat/keamanan) --
   pakai alur normal (popup "Perbarui Sekarang"). */
/* v328 -- Master Nama Pelanggan: tombol baru "+ Tambah" di sebelah chip
   nama lama -- sekarang bisa tambah alias secara manual kapan saja,
   tidak perlu nunggu kartu saran ketidaksinkronan. Pakai endpoint yang
   SUDAH ADA (POST /customer-names/add-alias, sama dgn tombol "🔄
   Sinkronkan"), tidak ada perubahan Worker. SENGAJA TIDAK dipaksa (bukan
   darurat/keamanan) -- pakai alur normal (popup "Perbarui Sekarang"). */
/* v327 -- Menu Follow Up, popup Detail Customer Bagian C: label "kali
   order" pada kartu "Jumlah order prediksi" diganti jadi "kali order
   lagi" supaya jelas ini proyeksi order KE DEPAN, bukan total order yang
   sudah terjadi. Perubahan teks murni, tidak ada perubahan logika.
   SENGAJA TIDAK dipaksa (bukan darurat/keamanan) -- pakai alur normal
   (popup "Perbarui Sekarang"). */
/* v326 -- Menu Follow Up: bagian "Riwayat Order Lunas" di popup Detail
   Customer (daftar tanggal + qty tiap order) disembunyikan atas
   permintaan user. Bagian A/B/C dan Grafik Riwayat tidak terpengaruh --
   masih pakai data r.riwayat yang sama seperti sebelumnya. SENGAJA TIDAK
   dipaksa (bukan darurat/keamanan) -- pakai alur normal (popup "Perbarui
   Sekarang"). */
/* v325 -- Master Nama Pelanggan: nama alias (nama lama) sekarang bisa
   diedit di tempat, bukan cuma dihapus. Ketuk teks alias di chip (garis
   putus-putus di bawahnya) -> jadi input kecil, Enter/blur = simpan lewat
   endpoint BARU POST /customer-names/edit-alias (Worker_Rincian_
   Pemesanan.js), Escape = batal. Endpoint baru ini rename 1 alias di
   tempat (bukan hapus+tambah) supaya atomik. SENGAJA TIDAK dipaksa
   (bukan darurat/keamanan) -- pakai alur normal (popup "Perbarui
   Sekarang"). */
/* v324 -- Popup "Kirim ke Grup Telegram" (index.html):
   1) Fitur baru: peringatan nama lama/alias -- kalau nama yang diketik
      persis sama dgn alias tercatat (customer sudah ganti nama lewat
      "Sinkronkan Nama Customer"), muncul kotak kuning + tombol "Pakai
      nama baru". Data alias diambil dari field `customers` yang SUDAH
      dikirim GET /customer-names (endpoint lama, tidak ada endpoint
      baru/perubahan Worker).
   2) Kotak "Customer ini kemungkinan sudah terdaftar" sekarang punya
      tombol "Pakai nama ini".
   3) Perbaikan bug: kedua kotak peringatan di atas sekarang gantian
      tampil dgn dropdown saran nama (dropdown diprioritaskan selagi
      terbuka), supaya tidak saling menutupi lagi.
   SENGAJA TIDAK dipaksa (bukan darurat/keamanan) -- pakai alur normal
   (popup "Perbarui Sekarang"). */
/* v323 -- Label field "Nama Penerima" di popup Dropship (Kirim ke Grup
   Telegram) diganti jadi "Nama Penerima Dropship" -- perubahan teks
   murni, tidak ada perubahan logika. SENGAJA TIDAK dipaksa (bukan
   darurat/keamanan) -- pakai alur normal (popup "Perbarui Sekarang"). */
/* v322 -- 2 perubahan di index.html:
   1) Popup "Kirim ke Grup Telegram" -- preview "Dikirim sebagai" sekarang
      resolve ke username/nama tampilan Telegram asli (lewat endpoint
      /resolve-sender yang sudah ada di worker), bukan angka ID mentah
      lagi. Tombol "Ubah" di sebelahnya dihapus (pengaturan ID Telegram
      tetap bisa lewat menu "ID Telegram Saya" di footer).
   2) Field "Nama CS" di form Edit Master Nama Pelanggan -- rekomendasi
      diganti dari <datalist> bawaan browser jadi dropdown kustom sendiri
      (pola & styling SAMA PERSIS dgn dropdown "Nama Customer" yang sudah
      ada), supaya tampilannya konsisten di semua perangkat/browser.
   SENGAJA TIDAK dipaksa (bukan darurat/keamanan) -- pakai alur normal
   (popup "Perbarui Sekarang"). */
/* v321 -- Rekap Pesanan: urutan default sekarang berdasarkan AKTIVITAS
   TERAKHIR (lastActivityAt -- field yang sudah lama ada & otomatis
   ke-update tiap ada perubahan pesanan: bukti transfer masuk, status
   berubah, dst), bukan cuma kapan pesanan DIBUAT lagi. Jadi pesanan yang
   baru saja ada perubahan naik ke paling atas. 0 kuota KV/D1 tambahan --
   murni baca ulang field yang sudah ada di data yang sama. */
/* v320 -- Bump ulang (permintaan "update dropship tidak muncul") --
   TIDAK ADA perubahan kode index.html sejak v319 (fitur Dropship sudah
   ada & sudah dicek lagi, tetap utuh) -- ini murni memaksa service
   worker deteksi "ada versi baru" lagi, buat kasus v319 kemarin belum
   sempat ke-cache/ke-deploy dgn benar di sisi hosting. Kalau setelah
   deploy v320 ini checkbox "📦 Dropship" MASIH tidak muncul, penyebabnya
   BUKAN cache lagi -- lihat catatan troubleshooting di changelog respons.
   SENGAJA TIDAK dipaksa (skipWaiting) -- pakai alur normal popup
   "Perbarui Sekarang", sama seperti v319. */
/* v319 -- Fitur baru: Dropship. Popup "Kirim ke Grup Telegram" sekarang
   punya checkbox "📦 Dropship" -- dicentang, muncul field "Nama Penerima"
   (nama penerima akhir barang, BEDA dari Nama Customer yang tetap jadi
   kunci sistem/reseller). Nama Customer TIDAK PERNAH diubah oleh fitur
   ini. Kalau dropship diisi, caption nota yang dikirim ke grup dapat 1
   blok tambahan "📦 Dropship / a.n. {Nama Penerima}" (di TENGAH caption,
   baris PALING BAWAH tetap "Pengirim {nama}" seperti sebelumnya -- jadi
   Monitor Utama tidak perlu diubah). Tabel Rekap Pesanan (desktop & kartu
   mobile) menampilkan badge kecil "📦 Dropship" di BAWAH nama customer
   kalau pesanan itu dropship. */
/* v318 -- Perbaikan bug popup "Kirim ke Grup Telegram": warning "⚠️
   Customer ini kemungkinan sudah terdaftar" SEBELUMNYA tetap muncul walau
   nama customer BARU SAJA dipilih langsung dari kotak rekomendasi nama
   (bukan diketik manual) -- padahal itu bukan potensi duplikat sama
   sekali (memang sengaja pilih customer yang sudah terdaftar), jadi
   warning-nya cuma membingungkan CS. Sekarang checkDuplicateNameWarning()
   otomatis skip/sembunyikan warning ini kalau nama sedang berasal dari
   klik kotak rekomendasi (pickedFromSuggestion true) -- warning tetap
   muncul normal seperti biasa kalau nama diketik manual dan ternyata
   mirip/sama dengan yang sudah terdaftar. */
/* v317 -- Audit & perbaikan bug: 4 popup (#followup-detail-overlay "Detail
   Customer", #followup-contact-overlay "Perlu Dihubungi", #followup-chart-overlay
   "Grafik Riwayat", #md-nama-sync-overlay "Sinkronkan Nama Customer") SENGAJA
   dibuat lepas dari class .md-overlay/.calc-overlay (posisi & z-index kustom
   lewat inline style), tapi akibatnya TIDAK IKUT TERDETEKSI oleh 2 mekanisme
   generik yang selama ini cuma memantau ".md-overlay, .calc-overlay":
   1) Kunci scroll body (setupOverlayScrollLock) -- scroll halaman belakang
      tidak terkunci selagi salah satu dari 4 popup ini terbuka di HP.
   2) Tombol/gesture Back Telegram Mini App (findOpenOverlay) -- YANG PALING
      SERIUS: menekan back Telegram saat salah satu popup ini terbuka TIDAK
      menutup popup itu dulu (beda dari tujuan fitur ini), melainkan langsung
      history.back() -- dan kalau itu langkah sejarah pertama, Mini App-nya
      bisa langsung KETUTUP TOTAL. Diperbaiki dgn menambahkan ID ke-4 popup
      ini eksplisit ke 3 titik selector terkait, plus aria-label="Tutup"/
      "Batal" pada tombol tutup masing-masing supaya tombol back Telegram
      memanggil fungsi tutup ASLINYA (bukan cuma hidden=true paksa).
   SENGAJA TIDAK dipaksa (baru kena kalau user pas menekan back Telegram
   selagi salah satu dari 4 popup spesifik ini terbuka, bukan tiap saat app
   dibuka) -- pakai alur normal (popup "Perbarui Sekarang"). */
/* v316 -- Audit & perbaikan bug: semua popup konfirmasi (window.showResetConfirm,
   dipakai utk konfirmasi hapus produk/ekspedisi/CS, hapus alias nama, sembunyikan
   customer, reset PIN, batal edit produk, dsb) SEBELUMNYA ketutupan/tampil di
   BELAKANG panel Master Data karena z-index-nya (1000, warisan dari .calc-overlay)
   lebih rendah dari z-index panel Master Data (.md-panel = 1250) dan sub-popupnya
   (.md-overlay = 1300) -- akibatnya tombol "Batal"/"Ya" di popup konfirmasi jadi
   tidak kelihatan/tidak bisa diklik saat dipanggil dari dalam menu Master Data.
   Diperbaiki dgn menaikkan z-index #reset-confirm-overlay ke 10050 (paling
   tinggi di seluruh app) supaya SELALU tampil paling depan di menu mana pun.
   SENGAJA TIDAK dipaksa (bukan bikin app sama sekali tidak bisa dipakai, cuma
   1 popup konfirmasi tertentu di dalam Master Data) -- pakai alur normal
   (popup "Perbarui Sekarang"). */
/* v315 -- 3 perubahan di halaman Follow Up & Master Nama Pelanggan:
   1) Hilangkan kolom "Order Lunas" & "Belum Lunas" dari tabel menu
      Follow Up (kolom lain tidak berubah).
   2) Hilangkan tombol "📥 Jalankan Impor Sekarang" (impor riwayat
      pesanan lama) di Master Nama Pelanggan beserta kode JS-nya --
      fitur ini cuma dipakai 1x dan sudah tidak diperlukan lagi.
   3) Field "Nama Customer" saat edit baris di Master Nama sekarang
      punya dropdown saran nama customer kustom (desain sendiri,
      BUKAN <datalist> bawaan browser) supaya tampilannya konsisten
      di semua perangkat -- memudahkan saat mau menyamakan/
      menggabungkan nama customer yang mirip. */
/* v314 -- Fitur baru (sekali pakai): tombol "📥 Jalankan Impor Sekarang"
   di Master Nama Pelanggan untuk memasukkan riwayat pesanan lama (file
   Excel ERP, 65 customer, 1.841 invoice, periode 2021-2026) ke Rincian
   Pemesanan/Follow Up + Master Nama, CS diisi "Mila Paramita" (sesuai
   instruksi user, file sumber tidak punya kolom CS). Semua invoice lama
   dianggap Lunas (instruksi user). Baris yang customer+tanggalnya SUDAH
   ADA di sistem (mis. sudah tercatat otomatis lewat bot Telegram)
   OTOMATIS DILEWATI, tidak dobel. Aman diklik berkali-kali (idempotent).
   Endpoint & tombol ini boleh dihapus kapan-kapan setelah dipastikan
   sukses & tidak dipakai lagi. SENGAJA TIDAK dipaksa (bukan darurat) --
   pakai alur normal (popup "Perbarui Sekarang"). */
/* v313 -- Perbaikan: rekomendasi (datalist) di field "Nama CS" pada form
   Edit Master Nama Pelanggan sebelumnya HANYA mengambil dari "Daftar CS"
   yang didaftarkan manual di Master Data -- padahal banyak nama CS yang
   SUDAH terpakai di data customer (mis. hasil auto-resolve username
   Telegram spt "@ulva_lailatul" dari fitur auto-isi CS v307) tidak
   pernah didaftarkan manual, jadi tidak pernah muncul sbg rekomendasi
   walau sudah jelas dipakai di tempat lain. Sekarang rekomendasi
   digabung dari 2 sumber: Daftar CS resmi + semua nama CS yang sudah
   ada di data Master Nama saat ini. SENGAJA TIDAK dipaksa (bukan
   darurat) -- pakai alur normal (popup "Perbarui Sekarang"). */
/* v312 -- Hasil audit menyeluruh sistem (cek sintaks JS, keseimbangan tag
   HTML, ID/endpoint duplikat, referensi fungsi, dan alur async) -- ketemu
   1 bug nyata: RACE CONDITION di tab Master Nama Pelanggan. loadNames()
   dan autofillCsAndReload() (fitur baru v307) sebelumnya dipanggil
   "lepas" tanpa saling menunggu, padahal keduanya menulis ke variabel
   data customer & merender ulang daftar. Kalau kebetulan response
   autofill datang LEBIH DULU drpd response daftar nama biasa (soal
   timing jaringan, bisa beda2 tiap saat), hasil autofill CS bisa
   KETIMPA BALIK data lama (CS kosong lagi) di layar -- padahal di
   server datanya sudah benar. Sekarang urutannya dipastikan (loadNames
   selesai dulu, baru autofill jalan) supaya hasil akhir SELALU benar,
   tidak tergantung untung-untungan jaringan. Sisanya (endpoint, ID
   HTML, struktur tag) diperiksa bersih, tidak ada bug lain ditemukan.
   SENGAJA TIDAK dipaksa (bukan darurat) -- pakai alur normal (popup
   "Perbarui Sekarang"). */
/* v311 -- Hasil audit lanjutan (murni sisi Worker + pengerasan kecil sisi
   app, TIDAK ada perubahan tampilan): (1) key KV baru "customerNameMismatchIgnored"
   (tombol "✕ Abaikan") didaftarkan ke D1_PREFIXES -- sebelumnya kelewatan
   sehingga masih numpang KV mentah, tidak konsisten dgn customerNameHistory/
   customerMasterV2 yang sudah dimigrasikan. (2) Guard anti-dobel-klik di
   tombol "🔄 Sinkronkan" (kartu saran Master Nama) -- klik cepat 2x sebelumnya
   berpotensi membuka popup pemilihan nama dua kali sekaligus. SENGAJA TIDAK
   dipaksa (bukan darurat) -- pakai alur normal (popup "Perbarui Sekarang"). */
/* v310 -- PERBAIKAN BUG (regresi dari v308): popup "Sinkronkan Nama
   Customer" yang baru ditambahkan v308 sempat NYANGKUT TAMPIL TERUS di
   Beranda sejak app dibuka, tidak bisa ditutup (tombol "Batal" tidak
   merespons). Penyebabnya: elemen popup itu ditulis dengan atribut
   `hidden` BERBARENGAN inline style `display:flex` di tag yang sama --
   inline style menang lawan aturan bawaan `[hidden]{display:none}`,
   jadi atribut hidden-nya kalah & popup selalu tampil dari awal (bukan
   cuma saat tombol "🔄 Sinkronkan" diklik). Karena muncul di luar alur
   normal, tombol Batal-nya juga belum sempat "dipasangi" fungsi apa
   pun. Sekarang ditambahkan override CSS eksplisit (pola yang sama
   persis sudah dipakai popup Follow Up) supaya `hidden` menang lagi.
   PENTING (walau bukan darurat keamanan) krn bug ini bikin Beranda
   sama sekali tidak bisa dipakai. */
/* v309 -- PENTING (tapi tidak dipaksa) -- audit menyeluruh & ganti SEMUA
   sisa dialog bawaan browser (confirm()/alert()) yang belum sempat
   dikonversi ke popup kustom, karena dialog bawaan itu DIBLOKIR TOTAL
   di dalam WebView Telegram (bikin tombolnya kelihatan "tidak
   berfungsi", padahal kodenya jalan normal). Titik paling kritis yang
   ikut kena: tombol "Lupa PIN? Reset ke PIN bawaan" (SATU-SATUNYA jalur
   pemulihan kalau lupa PIN Master Data) dan "Reset ke PIN bawaan" di
   tab Keamanan -- sebelumnya kalau dibuka dari Telegram, tombol ini
   bisa terlihat sama sekali tidak merespons. Titik lain yang ikut
   diganti: Hapus Produk/Ekspedisi, Batalkan perubahan Daftar Produk,
   Sembunyikan/Hapus alias di Master Nama Pelanggan (termasuk 2 tombol
   di kartu saran ketidaksinkronan yang baru ditambahkan v307/v308),
   plus 9 pesan error/validasi (alert()) diganti jadi notifikasi
   non-blocking yang sudah dipakai di tempat lain. Semua popup
   konfirmasi ini SEKARANG pakai komponen yang sama (window.
   showResetConfirm) yang sudah lama dipakai tombol RESET & toggle
   status Invoice, supaya konsisten 1 komponen di seluruh app. */
/* v308 -- (1) Popup custom "Sinkronkan Nama Customer" (bukan confirm()
   bawaan browser) di kartu saran Master Nama Pelanggan: user sekarang
   memilih sendiri nama mana (Master Nama lama / nama transaksi baru)
   yang mau dipakai sbg nama aktif saat "🔄 Sinkronkan". (2) Tombol baru
   "✕ Abaikan" di kartu saran yang sama -- pasangan nama yang MEMANG
   beda orang tidak akan terus-menerus muncul lagi di rekomendasi
   (tersimpan permanen di server, tidak mengubah data customer apa
   pun). (3) Perbaikan konsistensi kecil: label "byUser" di log
   keanggotaan bot Telegram sekarang ikut memakai nama tampilan penuh
   (first name + last name) kalau username tidak ada, bukan cuma first
   name -- konsisten dgn label pengirim CS di tempat lain. SENGAJA
   TIDAK dipaksa (bukan darurat/keamanan) -- pakai alur normal (popup
   "Versi Baru Tersedia"). */
/* v307 -- (1) Perbaikan bug kartu saran "tidak sinkron" di Master Nama
   > Master Nama Pelanggan: SEBELUMNYA nama kota dalam kurung ikut
   dibandingkan saat mendeteksi kemiripan nama, jadi banyak saran ngawur
   cuma gara-gara kebetulan satu kota (mis. "FATKHI (MALANG)" vs "AMINAH
   KHANEMAN (MALANG)"). Sekarang kota dipisah dulu, cuma bagian nama yang
   dibandingkan, plus kartu ringkasan klik-filter (Total/Kemiripan
   Tinggi/Perlu Ditinjau/Kemiripan Tipis) gaya sama seperti kartu Follow
   Up. (2) Ganti nama customer lewat "✏️ Edit" di Master Nama sekarang
   LANGSUNG tersinkron ke Follow Up & Rekap Pesanan (sebelumnya ada bug
   lupa purge cache, jadi bisa telat muncul). (3) Nama CS yang masih
   kosong di Master Nama sekarang OTOMATIS terisi dari riwayat transaksi
   customer itu (customer_order_log) tiap tab Master Nama dibuka -- yang
   sudah terisi (otomatis maupun diedit manual) tidak akan pernah ditimpa
   balik lagi, aman diedit manual kapan saja lewat "✏️ Edit". (4) Field
   "Nama CS" di form Edit sekarang punya rekomendasi otomatis (datalist)
   dari Daftar CS terdaftar. SENGAJA TIDAK dipaksa (bukan darurat/
   keamanan) -- pakai alur normal (popup "Versi Baru Tersedia"). */
/* v306 -- Pintasan baru "Grup Telegram" (long-press ikon di homescreen)
   pakai icon Telegram identik (biru #1e96e8 + logo kertas terbang,
   sama seperti tombol "Buka Payment Telegram" di Aksi cepat). Karena
   spec App Shortcuts mewajibkan url dalam scope app sendiri (tidak
   boleh langsung ke t.me), pintasan ini lewat
   ?shortcut=telegram lalu index.html yang men-klik tombol Aksi Cepat
   yang SUDAH ADA (id="home-actionrow-telegram", ditambahkan di sini)
   -- yang lalu membuka t.me di tab/app terpisah seperti biasa. Tidak
   ada logic baru, cuma memicu tombol lama. SENGAJA TIDAK dipaksa
   (bukan darurat/keamanan) -- pakai alur normal (popup "Versi Baru
   Tersedia"). */
/* v305 -- Optimasi performa: html2canvas (library ~200KB, sebelumnya
   di-load BLOCKING lewat <script src> di <head> -- diunduh & di-parse
   di SETIAP app dibuka walau cuma dipakai saat generate gambar
   nota/kwitansi) sekarang LAZY-LOAD lewat ensureHtml2Canvas() -- baru
   diunduh persis pas pertama kali dipakai, dipanggil paralel dengan
   kerja lain (pre-cache foto produk, susun HTML nota) supaya tidak
   nambah jeda terasa. Ditambah <link rel="preconnect"> ke
   cdnjs.cloudflare.com & fonts.gstatic.com supaya koneksi ke domain
   eksternal itu sudah "disiapkan" browser lebih awal, bukan nunggu
   DNS+TLS baru pas file-nya dibutuhkan. Efeknya kerasa di app dibuka
   PERTAMA kali / abis update -- Beranda & pindah antar menu SUDAH
   ringan dari sananya (cuma toggle CSS antar panel, bukan render
   ulang), jadi ini murni percepat proses paling awal (download+parse
   sebelum app siap dipakai sama sekali). SENGAJA TIDAK dipaksa (bukan
   darurat/keamanan) -- pakai alur normal (popup "Versi Baru
   Tersedia"). */
/* v304 -- Nama aplikasi diganti dari "Habit" jadi "Rp" DI SEBAGIAN
   tempat saja (bukan rebranding total): judul tab browser, teks logo
   Beranda, judul file saat share Rincian Pemesanan/Kwitansi, dan
   field "name"/"short_name"/"description" di manifest.json (penentu
   nama saat di-install di Android/Chrome/desktop -- utk iOS sudah
   lebih dulu "Rp" sejak versi 2.24, lihat Riwayat Update). SENGAJA
   TETAP "Habit" (permintaan eksplisit, tidak ikut diganti): judul +
   logo di sidebar (blok "Habit / Halawa Bintang Utama" atas sidebar),
   dan footer utama tempat gestur PIN rahasia disentuh 3x -- termasuk
   keterangannya di Master Data. Juga TIDAK diganti (murni identifier
   internal, tidak pernah tampil ke user): nama file
   habit-logo.png/habit-hero.png, nama class CSS habit-sidebar-*, dan
   prefix cache "habit-" di CACHE_NAME (variabel ini). SENGAJA TIDAK
   dipaksa (bukan darurat/keamanan) -- pakai alur normal (popup "Versi
   Baru Tersedia"). */
/* v303 -- App Shortcuts: 2 pintasan baru "Penjualan (Grosir)" & "Custom"
   yang muncul saat long-press ikon app di homescreen Android/Chrome
   (dibaca dari manifest.json field "shortcuts", url ?shortcut=penjualan
   / ?shortcut=custom). index.html menambahkan loader kecil di akhir
   file (sebelum </body>) yang tinggal memicu klik tombol [data-open-tab]
   yang SUDAH ADA di Beranda -- tidak ada logic navigasi baru. Ikon
   pintasan (icon-grosir-192.png, icon-custom-192.png) identik dengan
   ikon lingkaran hijau/biru di kartu Beranda, ditambahkan ke
   CORE_ASSETS supaya ikut ke-cache offline. Tidak berlaku di iOS Safari
   (keterbatasan WebKit, tidak mendukung shortcut PWA). SENGAJA TIDAK
   dipaksa (bukan darurat/keamanan) -- pakai alur normal (popup "Versi
   Baru Tersedia"). */
/* v302 -- Kunci-Edit di 6 bagian Master Data (Ekspedisi&Logistik,
   Tampilan, Rumus, Keamanan, Finance, Master Nama Pelanggan), pola sama
   spt "Daftar Produk" -- terkunci default, wajib "Mode Edit" dulu utk
   ubah. Plus kode singkat produk (HA/HS dkk) sekarang selalu huruf
   besar (index.html & Worker_Rincian_Pemesanan.js), label kartu "Qty
   Customer" -> "Total Customer", DAN cadangan otomatis render nota
   lewat server (v301, sempat lolos ketinggalan di build ini -- SUDAH
   digabung ulang manual, tidak lagi hilang). SENGAJA TIDAK dipaksa
   (bukan darurat/keamanan) -- pakai alur normal (popup "Versi Baru
   Tersedia", lihat versi 2.32.0 di Riwayat Update index.html). */
/* v300 -- opsi baru "Render Nota Lewat Server" (Master Data > Tampilan,
   nonaktif secara default): gambar Rincian Pemesanan bisa dirender via
   Browserless.io (server) alih-alih html2canvas di HP CS -- draft
   autosave ikut jadi lebih ringan (kirim data mentah, bukan gambar
   penuh). Dipasangkan dgn perubahan Worker_Rincian_Pemesanan.js
   (endpoint /send-bukti & /save-draft terima `notaData`, plus kartu
   kuota Browserless baru di Monitor Utama). SENGAJA TIDAK dipaksa
   (bukan darurat/keamanan) -- pakai alur normal (popup "Versi Baru
   Tersedia", lihat versi 2.31.0 di Riwayat Update index.html). */
/* v299 -- Master Data > kartu baru "🗂️ Topik Grup Resi": ID topik
   "Tagihan" & "Resi Aja" sekarang diatur di sini (bukan cuma env var
   Cloudflare) -- fleksibel diubah tiap kali ganti grup, tidak perlu
   sentuh kode. Dipasangkan dgn perubahan worker.js (routing pesan grup
   resi baca settings ini, plus fitur pelacakan tagihan ekspedisi belum
   dibayar via D1 -- 0 dampak ke kuota KV). SENGAJA TIDAK dipaksa (bukan
   darurat/keamanan) -- pakai alur normal (popup "Versi Baru Tersedia"). */
/* v298 -- perbaikan bug: tombol back fisik/gesture HP langsung menutup
   aplikasi saat lagi buka menu "Rekap Pesanan"/"Follow Up" (kedua
   halaman itu sebelumnya tidak pernah menambah entri riwayat browser
   saat dibuka). Sekarang keduanya ikut history.pushState/popstate,
   pola SAMA dgn navigasi Beranda<->tab yang sudah ada, jadi tombol back
   mundur satu langkah dulu ke tampilan sebelumnya. SENGAJA TIDAK dipaksa
   (bukan darurat/keamanan) -- pakai alur normal (popup "Versi Baru
   Tersedia", lihat versi 2.30.1 di Riwayat Update index.html). */
/* v297 -- tabel Rekap Pesanan (desktop) dirapikan: kolom "Hari" dihapus,
   & ditambah tombol toggle "Sembunyikan/Tampilkan Varian" utk sembunyikan
   sementara kolom-kolom varian produk (khusus tampilan desktop -- kartu
   mobile & Ekspor CSV tidak berubah). SENGAJA TIDAK dipaksa (bukan
   darurat/keamanan) -- pakai alur normal (popup "Versi Baru Tersedia",
   lihat versi 2.30.0 di Riwayat Update index.html). */
/* v296 -- index.html digabung ulang dari 2 jalur perubahan yang sempat
   berkembang terpisah: (1) kartu "Kesehatan Durable Object (Dedupe)" di
   Master Data -- status DO ORDER_LOCKS, pesan error asli, fallback ke KV,
   dari sisi user; digabung dgn (2) tampilan KARTU mobile utk Rekap
   Pesanan & Follow Up + pintu masuk "Aksi cepat" di Beranda (v295, lihat
   catatan di bawah). Murni penggabungan, tidak ada fitur yang saling
   menimpa/terhapus. SENGAJA TIDAK dipaksa (bukan darurat/keamanan) --
   pakai alur normal (popup "Perbarui Sekarang"). */
/* v295 -- menu "Rekap Pesanan" & "Follow Up" sekarang punya tampilan KARTU
   khusus layar mobile (sebelumnya cuma tabel dgn scroll horizontal spt di
   desktop, jadi kedua menu ini efektif tidak kepakai di HP karena memang
   belum ada pintu masuknya di sana). Ditambahkan juga 2 tombol baru di
   Beranda > "Aksi cepat" (khusus tampil di mobile, DISEMBUNYIKAN lagi di
   desktop lewat CSS supaya tidak dobel dgn menu yang sudah ada di
   sidebar) sebagai pintu masuk ke kedua menu ini di HP -- sebelumnya
   sama sekali tidak bisa dibuka dari mobile karena sidebar cuma muncul
   di layar ≥901px. Data yang ditampilkan di kartu SAMA PERSIS dgn tabel
   (dibaca dari fungsi render yang sama), termasuk tombol toggle Invoice
   di Rekap Pesanan & tombol "Hubungi" cepat di Follow Up. SENGAJA TIDAK
   dipaksa (bukan darurat/keamanan) -- pakai alur normal (popup "Perbarui
   Sekarang"). */
/* ---- PAKSA UPDATE (SEKALI PAKAI) ----
   Versi yang tercantum di sini akan langsung aktif sendiri begitu ter-install
   (skipWaiting otomatis) TANPA menunggu user klik "Perbarui Sekarang" di
   popup — begitu aktif, index.html otomatis reload halaman (lihat listener
   "controllerchange" di index.html). BUKAN perubahan perilaku permanen —
   versi yang TIDAK dimasukkan ke daftar ini (seperti v279 sekarang) otomatis
   pakai alur normal (popup persetujuan / auto-patch diam-diam seperti
   biasa). Kalau suatu saat butuh paksa update lagi, tambahkan versi barunya
   ke Set ini.
   PERINGATAN: user yang lagi isi form/nota bisa ke-reload tiba-tiba begitu
   halaman ini aktif (progres yang belum disimpan bisa hilang) — pakai
   fitur ini seperlunya saja, bukan kebiasaan tiap deploy.
   v294 -- fitur "Kirim Bukti Nota ke grup Telegram": daftar sugesti nama
   customer (riwayat dari server) sekarang muncul begitu ketik 1 huruf
   saja (SEBELUMNYA baru muncul mulai 3 huruf). Perilaku lain tidak
   berubah (tetap cocokkan ke riwayat nama, tetap buang tag "NEW" di
   akhir nama, tetap maksimal 6 hasil ditampilkan). SENGAJA TIDAK
   dipaksa (bukan darurat/keamanan) -- pakai alur normal (popup "Perbarui
   Sekarang").
   v293 -- menu Rekap Pesanan sekarang punya filter "Ekspedisi" (dropdown
   baru, pola sama dgn filter CS/Status/Hari yang sudah ada) -- pilih 1
   nama ekspedisi, tabel otomatis ikut tersaring. Saat filter ini aktif,
   muncul kartu ringkasan baru: Qty Customer (jumlah nama unik), Total
   KG, & Total Ongkir dari pesanan yang sedang tampil. Worker_Rincian_
   Pemesanan.js juga ikut diperbarui: tiap baris Rekap Pesanan sekarang
   ikut kirim nilai Ongkir (Rp) hasil estimasi (ongkirTotal > ongkirManual
   > ratePerKg x berat) -- TIDAK menambah kuota baca/tulis KV sama sekali
   (angka ini dihitung dari data pesanan yang memang sudah kebaca, bukan
   query terpisah). Kolom Ongkir ikut ditambahkan di ekspor CSV. Pesanan
   lama (sebelum update ini) belum punya data Ongkir tersimpan, jadi
   dihitung 0 -- ditandai di kartu ringkasan, bukan bug. SENGAJA TIDAK
   dipaksa (bukan darurat/keamanan) -- pakai alur normal (popup "Perbarui
   Sekarang").
   v286 -- Master Data Customer: tombol "🗑️ Hapus" nama customer sekarang
   BENERAN BERFUNGSI (sebelumnya endpoint /customer-names/delete belum
   ada di worker, jadi tombol ini gagal/error). Sekarang hapus 1 nama di
   sini JUGA menghapus PERMANEN riwayat pesanan Lunas customer itu di
   menu Follow Up (pola repeat-order/grafik riwayat) -- supaya customer
   yang dihapus dari Master Data langsung hilang juga dari Follow Up,
   sesuai permintaan user. Rincian Pemesanan/Rekap Pesanan yang sudah
   terkirim TIDAK ikut berubah/terhapus -- yang dihapus cuma catatan
   Follow Up-nya. Popup konfirmasi hapus juga diperjelas supaya user
   sadar ini tindakan permanen sebelum klik. SENGAJA TIDAK dipaksa
   (bukan darurat/keamanan) -- pakai alur normal (popup "Perbarui
   Sekarang").
   v285 -- 2 perubahan: (1) menu Follow Up -- muat otomatis begitu kartu
   ini dibuka DIHAPUS TOTAL atas permintaan user; sekarang tabel/statistik
   tetap kosong (ada pesan "Data belum dimuat") sampai user sendiri klik
   tombol "🔄 Muat ulang" -- tidak ada lagi panggilan ke server hanya
   karena membuka halaman Follow Up; (2) popup "Grafik Riwayat" (Follow
   Up) -- warna ketiga mode grafik (Qty per Order / Jarak Antar Order /
   Kumulatif Qty) diseragamkan jadi nuansa hijau (sebelumnya campur biru/
   cokelat/hijau tua), dan label angka di atas batang/garis dibuat lebih
   jelas terbaca (kotak putih di baliknya lebih pekat + garis tepi tipis).
   SENGAJA TIDAK dipaksa (bukan darurat/keamanan) -- pakai alur normal
   (popup "Perbarui Sekarang").
   v284 -- 3 perubahan: (1) auto-refresh diam-diam (interval 30 detik +
   refresh saat tab dibuka lagi) di menu Follow Up DIHAPUS TOTAL atas
   permintaan user -- data sekarang cuma dimuat saat kartu dibuka pertama
   kali atau saat user sendiri klik tombol "🔄 Muat ulang"; (2) menu Rekap
   Pesanan sekarang punya batas sesi 2 jam -- kalau halaman dibiarkan
   terbuka terus-menerus lebih dari 2 jam, auto-refresh otomatis berhenti
   & muncul popup custom (bukan alert/confirm bawaan browser) minta user
   klik "🔄 Muat Ulang Sekarang" utk lanjut (hitungan 2 jam mulai dari 0
   lagi) atau "Nanti" utk nutup popup tanpa refresh; (3) khusus versi
   mobile, kartu "Rincian Pemesanan" (Penjualan & Custom) sekarang
   menampilkan bar ringkas "Total Qty" & "Total Berat" di atas daftar
   produk -- muncul di Mode Tabel (atas daftar kartu) maupun Mode Kasir
   (atas grid produk), angkanya murni salinan dari total yang sudah
   dihitung calc() (sumber sama dgn kartu Ringkasan Pesanan desktop),
   tidak tampil di desktop lebar (≥901px) supaya tidak dobel dengan kartu
   Ringkasan Pesanan yang sudah ada di sana. SENGAJA TIDAK dipaksa (bukan
   darurat/keamanan) -- pakai alur normal (popup "Perbarui Sekarang").
   v279 -- 3 perbaikan: (1) bug body.classList "showing-rekap" &
   "showing-followup" bisa nyangkut AKTIF BERBARENGAN kalau pindah dari
   Follow Up ke Rekap Pesanan (atau sebaliknya) tanpa lewat Beranda dulu --
   sekarang openRekapPesanan()/openFollowUp() saling melepas class
   halaman lain sebelum mengaktifkan class-nya sendiri, jadi Follow Up
   tidak lagi macet tidak bisa dibuka lagi setelah buka Rekap Pesanan;
   (2) kolom "Customer" di tabel Follow Up sekarang sticky (dikunci) di
   sisi kiri waktu tabel digeser kanan/kiri, pola sama dgn kolom Customer
   di RepeatOrder_Calculator.html -- kolom kanan (Status, Qty Rata², dst)
   sekarang bisa diakses tanpa kehilangan konteks nama customer-nya;
   (3) judul kolom "Aksi" di tabel Rekap Pesanan diganti jadi "Invoice"
   (isinya tetap tombol toggle Sudah/Belum di Invoice, tidak berubah).
   SENGAJA TIDAK dipaksa (bukan darurat/keamanan) -- pakai alur normal
   (popup "Perbarui Sekarang").
   v278 -- menu Follow Up dilengkapi supaya fiturnya identik dgn
   RepeatOrder_Calculator.html: popup detail customer sekarang ada Bagian
   A/B/C (parameter, prediksi 8 order berikutnya, prediksi stok bulan ini),
   tombol "Grafik Riwayat" (chart qty/gap/kumulatif), dan kotak ringkasan
   ke-5 "Est. Qty Stok Bulan Ini". SENGAJA TIDAK dipaksa (bukan
   darurat/keamanan) -- pakai alur normal (popup "Perbarui Sekarang").
   v277 -- perbaikan bug popup Follow Up ("Segera Perlu Dihubungi" & detail
   customer) nyangkut tetap tampil / tidak konsisten ke-hidden -- overlay-nya
   punya atribut "hidden" BARENGAN inline style="display:flex", yang bikin
   [hidden]{display:none} bawaan browser kalah spesifisitas lawan inline
   style. Ditambal dgn override CSS eksplisit (pola sama dgn
   .calc-overlay[hidden]/.md-overlay[hidden] yg sudah ada). SENGAJA TIDAK
   dipaksa (bukan darurat/keamanan, cuma fitur baru yg belum lama dipakai
   siapa pun) -- pakai alur normal (popup "Perbarui Sekarang") supaya user
   yang lagi isi form tidak tiba-tiba ke-reload dan kehilangan progres.
   v283 -- kartu Rekap Pesanan sekarang dapat fitur SAMA PERSIS dgn Follow
   Up (v280-v282): auto-refresh diam-diam tiap 30 detik selama kartu
   terbuka (berhenti begitu keluar/tab disembunyikan), anti-kedip (tabel
   TIDAK disentuh kalau data server sama persis dgn yg tampil), info
   "diperbarui X menit yang lalu" di sebelah tombol "🔄 Muat ulang" (hijau
   = normal, merah = update terakhir gagal). Worker (Worker_Rincian_
   Pemesanan.js) juga ikut diperbarui: cache 90 detik Rekap Pesanan
   sekarang dibuang otomatis begitu ada pesanan baru/edit/toggle invoice
   (bukan cuma nunggu TTL habis) -- SAMA SEKALI TIDAK menambah kuota tulis
   KV (Cache API beda layanan total dari KV). SENGAJA TIDAK dipaksa (bukan
   darurat/keamanan) -- pakai alur normal (popup "Perbarui Sekarang").
   v282 -- info "diperbarui X menit yang lalu" di kartu Follow Up
   dipindah ke sebelah tombol "🔄 Muat ulang" (sebelumnya baris terpisah di
   bawah kotak ringkasan). Warnanya juga diganti dari abu-abu (ambigu,
   tidak jelas lagi memuat/berhasil/gagal) jadi HIJAU = status normal
   (termasuk saat "Memuat data…"), MERAH = update terakhir gagal (kalau
   auto-refresh diam-diam yang gagal, teks lama tetap ditampilkan tapi
   warnanya ikut jadi merah sbg penanda "belum tentu data terbaru").
   SENGAJA TIDAK dipaksa (bukan darurat/keamanan) -- pakai alur normal
   (popup "Perbarui Sekarang").
   v281 -- teks status kartu Follow Up sekarang tampil "diperbarui X menit
   yang lalu" (ikut jalan sendiri tiap 15 detik walau tidak ada
   auto-refresh baru) menggantikan jam digital "diperbarui 14.32" --
   lebih gampang dibaca sekilas begitu HP dibiarkan lama. Auto-refresh
   sendiri masih 30 detik seperti v280, tidak berubah. SENGAJA TIDAK
   dipaksa (bukan darurat/keamanan) -- pakai alur normal (popup "Perbarui
   Sekarang").
   v280 -- tambah auto-refresh diam-diam di kartu Follow Up (tiap 30
   detik selama kartu itu terbuka & tab aktif). Anti-kedip: data baru dari
   server dibandingkan dgn yang sudah tampil -- kalau PERSIS SAMA, tabel
   sama sekali tidak disentuh (0 elemen DOM diubah), cuma jam "diperbarui
   pukul .." di teks status yg jalan. Kalau memang ada perubahan data,
   baru tabel di-render ulang, dan posisi scroll (geser tabel ke
   kanan/kiri + scroll halaman) disimpan lalu dikembalikan supaya
   layar tidak "loncat". Auto-refresh otomatis berhenti begitu keluar dari
   kartu Follow Up (tombol Kembali) atau saat tab disembunyikan, dan
   langsung cek sekali lagi begitu tab dibuka lagi. SENGAJA TIDAK dipaksa
   (bukan darurat/keamanan) -- pakai alur normal (popup "Perbarui
   Sekarang").
   v287 -- kartu "Peringatan Bukti Transfer Belum Ada" (Master Data ->
   Tampilan) sekarang punya pengaturan "Hari Aktif" -- 7 checkbox
   Senin..Minggu yang bisa diisi manual, menentukan hari apa saja
   peringatan ini boleh terkirim (default semua hari kalau belum pernah
   diatur, migrasi mundur aman). Hari yang tidak dicentang bukan berarti
   pesanan yang lewat 7 hari di hari itu hilang -- pesannya cuma menunggu
   sampai hari aktif berikutnya baru terkirim (worker sudah disesuaikan).
   SENGAJA TIDAK dipaksa (bukan darurat/keamanan) -- pakai alur normal
   (popup "Perbarui Sekarang").
   v288 -- kartu ringkasan di menu Follow Up (Total Customer/Jatuh Tempo/
   Follow Up Minggu Ini/Belum Cukup Data/Est. Qty Stok Bulan Ini) sekarang
   BISA DIKLIK untuk filter cepat tabel di bawahnya, kartu yang aktif
   ditandai (border+latar hijau) plus chip "Filter aktif: … / ✕ Hapus
   filter". Tambah juga kartu baru "🟠 Follow Up Hari Ini" (sisa 0 hari) di
   sebelah kiri kartu "🟡 Follow Up Minggu Ini". SENGAJA TIDAK dipaksa
   (bukan darurat/keamanan) -- pakai alur normal (popup "Perbarui
   Sekarang").
   v289 -- kartu "Peringatan Bukti Transfer Belum Ada" (Master Data ->
   Tampilan) sekarang punya input angka "Kirim setelah pesanan lewat .. hari"
   -- sebelumnya ambang batasnya selalu tetap 7 hari (hardcode), sekarang
   bisa diganti manual (mis. 3 hari, 2 hari) lewat Master Data, dibaca
   Worker_Rincian_Pemesanan.js (checkAllOrderReminders). Default tetap 7
   hari kalau belum pernah diatur -- migrasi mundur aman. SENGAJA TIDAK
   dipaksa (bukan darurat/keamanan) -- pakai alur normal (popup "Perbarui
   Sekarang").
   v290 -- bot Telegram sekarang paham balasan "sudah" di DM Petugas
   Logistik utk konfirmasi manual resi sudah dikirim (menjawab peringatan
   "pesanan sudah LUNAS 2+ hari, belum ada resi tercatat") -- lihat
   handleDmLogistikPengingatSudah di Worker_Rincian_Pemesanan.js. Murni
   perubahan sisi Worker + teks changelog, tidak ada perubahan tampilan
   index.html lain. SENGAJA TIDAK dipaksa (bukan darurat/keamanan) --
   pakai alur normal (popup "Perbarui Sekarang").
   v276 lama sudah dikeluarkan dari Set ini (update itu sudah tersebar
   duluan).
   v310 -- DIPAKSA (skipWaiting otomatis, TANPA popup "Perbarui
   Sekarang") -- perbaikan bug popup "Sinkronkan Nama Customer" yang
   nyangkut tampil terus-menerus di Beranda sejak app dibuka (lihat
   catatan lengkap di komentar v310 di atas CACHE_VERSION). Dipaksa krn
   Beranda jadi SAMA SEKALI tidak bisa dipakai selama bug ini aktif,
   termasuk kemungkinan menutupi popup "Perbarui Sekarang" itu sendiri
   -- menunggu user klik update normal tidak bisa diandalkan di sini. ---- */
const FORCE_ACTIVATE_VERSIONS = new Set(["v310"]);
// File same-origin yang wajib ada supaya app bisa dibuka offline.
const CORE_ASSETS = [
  "./",
  "./index.html",
  "./manifest.json",
  "./icon-192x192.png",
  "./icon-512x512.png",
  "./icon-192x192-maskable.png",
  "./icon-512x512-maskable.png",
  "./icon-180x180.png",
  "./icon-32x32.png",
  "./habit-logo.png",
  "./habit-hero.png",
  "./icon-grosir-192.png",
  "./icon-custom-192.png",
  "./icon-telegram-192.png"
];
/* ---------- INSTALL: simpan app-shell ke cache ---------- */
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      // addAll akan gagal total kalau salah satu URL 404 —
      // jadi kita tambahkan satu per satu dan abaikan yang gagal,
      // supaya instalasi tidak batal hanya karena 1 file hilang.
      // PENTING: cache.add(url) biasa TUNDUK ke HTTP cache browser, jadi
      // bisa diam-diam menyimpan versi LAMA index.html/asset lain ke cache
      // baru walau nama cache-nya (CACHE_NAME) sudah berubah — inilah
      // penyebab "klik Perbarui Sekarang tapi tetap versi lama setelah
      // reload". Fix: pakai Request dengan {cache:"reload"} supaya fetch
      // ini SELALU ambil langsung dari server, bukan dari HTTP cache.
      return Promise.all(
        CORE_ASSETS.map((url) =>
          cache.add(new Request(url, { cache: "reload" })).catch((err) => {
            console.log("SW: gagal cache", url, err);
          })
        )
      );
    }).then(() => {
      // Lihat catatan FORCE_ACTIVATE_VERSIONS di atas — cuma versi yang
      // sengaja didaftarkan di situ yang langsung skipWaiting sendiri.
      if (FORCE_ACTIVATE_VERSIONS.has(CACHE_VERSION)) self.skipWaiting();
    })
  );
  // Untuk versi SELAIN yang ada di FORCE_ACTIVATE_VERSIONS: TIDAK panggil
  // self.skipWaiting() di sini — worker baru akan diam menunggu ("waiting")
  // sampai halaman mengirim pesan SKIP_WAITING (dipicu saat user klik
  // tombol "Perbarui Sekarang" di popup notifikasi). Ini yang bikin update
  // tidak lagi otomatis langsung reload, tapi menunggu persetujuan user dulu.
});
/* ---------- MESSAGE: terima sinyal "SKIP_WAITING" dari halaman ----------
   Ini SEKARANG SATU-SATUNYA jalur yang membuat worker baru aktif —
   dikirim index.html begitu user klik "Perbarui Sekarang" di popup. */
self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});
/* ---------- ACTIVATE: bersihkan cache versi lama ---------- */
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => (key.startsWith("nota-halawa-") || key.startsWith("habit-")) && key !== CACHE_NAME)
            .map((key) => caches.delete(key))
        )
      )
      // clients.claim() digabung ke rantai waitUntil yang sama (bukan
      // dipanggil terpisah di luar) supaya activate dijamin benar-benar
      // selesai — termasuk claim-nya — sebelum browser boleh mematikan SW.
      .then(() => self.clients.claim())
  );
});
/* ---------- FETCH: cache-first untuk same-origin, ---------- 
   fallback ke network. Untuk request lintas domain (font, cdnjs,
   dll) biarkan lewat langsung ke network — tidak dipaksa cache,
   supaya tidak ada masalah CORS/opaque response. */
self.addEventListener("fetch", (event) => {
  const req = event.request;
  // hanya tangani GET
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  const isSameOrigin = url.origin === self.location.origin;
  if (!isSameOrigin) {
    // biarkan browser yang urus (font Google, cdnjs html2canvas, dst)
    return;
  }
  // Request khusus pengecekan update (dari getUpdateInfo() di index.html)
  // sengaja DILEWATKAN dari cache sama sekali, supaya selalu ambil versi
  // TERBARU dari jaringan — bukan versi lama yang kebetulan sudah tercache.
  if (url.searchParams.has("_swbypass")) {
    return;
  }
  event.respondWith(
    caches.match(req).then((cached) => {
      const networkFetch = fetch(req)
        .then((res) => {
          // simpan salinan terbaru ke cache (stale-while-revalidate ringan)
          if (res && res.status === 200) {
            const resClone = res.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(req, resClone));
          }
          return res;
        })
        .catch(() => cached); // offline & tidak ada di cache -> gagal senyap
      // tampilkan versi cache dulu kalau ada (cepat), sambil update di belakang layar
      return cached || networkFetch;
    })
  );
});
