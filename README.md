## Instagram Spam Filter Check — Cara Kerja & Konfigurasi

Proyek ini berfokus untuk **mengecek status filter spam akun Instagram**. Selain itu, aplikasi juga menampilkan ringkasan profil seperti nama, jumlah followers/following, jumlah post, dan status private. Pengecekan dilakukan via endpoint backend yang login ke sumber pihak ketiga untuk mengambil data.

### Fokus Utama: Spam Filter
- Output utama yang dicari adalah indikator apakah **filter spam sedang aktif** pada akun tersebut (`spamFilterOn`).
- Data profil (nama, followers, dst.) ditampilkan sebagai konteks tambahan agar hasil lebih mudah dipahami.

### Arsitektur Singkat
- **Frontend (UI)**: halaman `src/app/instagram/page.tsx`.
  - Input username Instagram, kirim request ke backend, tampilkan hasil yang sudah dinormalisasi (ringkasan profil + badge private/spam filter).
- **Backend API**: route `src/app/api/instagram-tools/route.ts` (`POST /api/instagram-tools`).
  - Melakukan flow: ambil CSRF → login ke `sprintpedia.id` (menggunakan kredensial dari environment variables) → panggil endpoint tools dengan query `username` → kembalikan JSON ke frontend.

### Alur Kerja
1. Pengguna membuka halaman `/instagram` dan memasukkan `username`.
2. Frontend memanggil `POST /api/instagram-tools` dengan body `{ username }`.
3. Backend:
   - GET halaman login untuk memperoleh `csrf_cookie`.
   - POST login ke `sprintpedia.id` memakai `SPRINTPEDIA_USERNAME` dan `SPRINTPEDIA_PASSWORD` dari environment.
   - Jika berhasil, gunakan cookie sesi (`ci_session`) untuk memanggil halaman tools: `https://sprintpedia.id/page/instagram_tools?username=...`.
   - Respons upstream diparsing; jika data valid, API mengembalikan `{ ok: true, data: ... }`. Jika tidak ditemukan, balas 404 dengan pesan yang sesuai.
4. Frontend menerima JSON, melakukan normalisasi field (nama, followers, following, posts, isPrivate, spamFilterOn), dan menampilkannya dalam komponen UI.

### Prasyarat
- Node.js 18+ (disarankan 18 LTS atau 20 LTS).
- NPM/PNPM/Yarn (pilih salah satu).

### Konfigurasi Environment
Buat file `.env.local` di root proyek (sejajar dengan `package.json`) dengan isi:

```env
SPRINTPEDIA_USERNAME=your_username
SPRINTPEDIA_PASSWORD=your_password
```

Catatan:
- Variabel ini digunakan hanya di server (API route). Jangan commit kredensial ke repository publik.
- Pastikan kredensial benar dan memiliki akses untuk menggunakan fitur tools pada `sprintpedia.id`.

### Menjalankan Secara Lokal
1. Install dependencies:
   - `npm install` (atau `pnpm install` / `yarn`)
2. Jalankan development server:
   - `npm run dev`
3. Buka `http://localhost:3000/instagram` untuk halaman utama tool.

### Endpoint Backend
- `POST /api/instagram-tools`
  - Body JSON: `{ "username": "natgeo" }`
  - Respons sukses: `{ ok: true, data: ... }`
  - Respons error: `{ ok: false, error: "pesan" }` dengan status 4xx/5xx yang sesuai.

### Deploy (contoh: Vercel)
1. Push repo ke GitHub/GitLab.
2. Buat project di Vercel dan hubungkan repository.
3. Pada pengaturan project Vercel, set Environment Variables:
   - `SPRINTPEDIA_USERNAME`
   - `SPRINTPEDIA_PASSWORD`
4. Deploy. Setelah selesai, akses `https://your-app.vercel.app/instagram`.

### Troubleshooting
- "Username tidak ditemukan": pastikan username valid dan tidak typo.
- "Login gagal, ci_session tidak diterima": cek kredensial `SPRINTPEDIA_*` dan kemungkinan perubahan alur login di upstream.
- Error CSRF: upstream bisa berubah sewaktu-waktu; pastikan flow masih sesuai dan tidak ada rate-limit/blokir.
- Pastikan server menjalankan runtime Node.js (API sudah mengatur `export const runtime = 'nodejs';`).

---

