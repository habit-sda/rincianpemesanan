/* ============================================================
   Service Worker — Nota Halawa
   Cache app-shell dasar supaya bisa dibuka offline / lebih cepat.
   Naikkan CACHE_VERSION setiap kali file HTML/CSS/JS utama diubah,
   supaya pengguna otomatis dapat versi terbaru.
   ============================================================ */
const CACHE_VERSION = "v28";
const CACHE_NAME = "nota-halawa-" + CACHE_VERSION;
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
  "./icon-32x32.png"
];
/* ---------- INSTALL: simpan app-shell ke cache ---------- */
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      // addAll akan gagal total kalau salah satu URL 404 —
      // jadi kita tambahkan satu per satu dan abaikan yang gagal,
      // supaya instalasi tidak batal hanya karena 1 file hilang.
      return Promise.all(
        CORE_ASSETS.map((url) =>
          cache.add(url).catch((err) => {
            console.log("SW: gagal cache", url, err);
          })
        )
      );
    })
  );
  // SENGAJA TIDAK panggil self.skipWaiting() di sini lagi — worker baru
  // akan diam menunggu ("waiting") sampai halaman mengirim pesan
  // SKIP_WAITING (dipicu saat user klik tombol "Perbarui Sekarang" di
  // popup notifikasi). Ini yang bikin update tidak lagi otomatis
  // langsung reload, tapi menunggu persetujuan user dulu.
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
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key.startsWith("nota-halawa-") && key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
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
