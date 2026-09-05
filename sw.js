/* ============================================================
   Service Worker — Habit
   Cache app-shell dasar supaya bisa dibuka offline / lebih cepat.
   Naikkan CACHE_VERSION setiap kali file HTML/CSS/JS utama diubah,
   supaya pengguna otomatis dapat versi terbaru.
   ============================================================ */
const CACHE_VERSION = "v305";
const CACHE_NAME = "habit-" + CACHE_VERSION;
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
   duluan). ---- */
const FORCE_ACTIVATE_VERSIONS = new Set([]);
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
  "./icon-custom-192.png"
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
