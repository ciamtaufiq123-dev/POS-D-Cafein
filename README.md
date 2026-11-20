# D'Cafein POS

Aplikasi Point of Sale (POS) dan manajemen operasional kafe berbasis web (*Full-Stack*) yang mendukung transaksi kasir secara *real-time*, pembayaran Tunai & QRIS (Midtrans), cetak struk, manajemen produk, analitik penjualan, serta kontrol akses berbasis *role* (Admin & Kasir).

## Fitur Utama

### Autentikasi & Keamanan (RBAC)
- Login berbasis JWT (*JSON Web Token*) dengan pembagian hak akses **Admin** dan **Kasir**.
- Proteksi rute berlapis: pembatasan halaman di sisi *frontend* (`ProtectedRoute`, `PublicOnlyRoute`, dan halaman `404 Not Found`) serta validasi token & *role* di *middleware backend* (`403 Forbidden`).

### Kasir POS (`/pos`)
- Katalog menu dengan pencarian, filter kategori, dan keranjang belanja dinamis.
- Dukungan metode pembayaran **Tunai (Cash)** dan **QRIS via Midtrans Sandbox**.
- Cetak struk transaksi (format thermal / PDF).

### Panel Admin (`/dashboard`, `/products`, `/orders`)
- **Dashboard Analitik:** Ringkasan pemasukan harian, total transaksi, jumlah item terjual, grafik tren pendapatan (7 & 30 hari), dan komposisi metode pembayaran.
- **Kelola Produk (CRUD):** Tambah, ubah, dan *soft delete* produk beserta unggah gambar (`Multer`), dilengkapi modal konfirmasi kustom dan *toast* notifikasi.
- **Riwayat Transaksi & Laporan:** Pencarian, filter transaksi lanjutan, dan ekspor laporan ke format **CSV / Excel**.

## Tech Stack

| Bagian | Teknologi |
| --- | --- |
| **Frontend** | React, TypeScript, Vite, Tailwind CSS, React Router, Lucide React, html2canvas |
| **Backend** | Node.js, Express, TypeScript, Prisma ORM, PostgreSQL |
| **Keamanan & Validasi** | JWT (`jsonwebtoken`), `bcryptjs`, `zod`, `cors` |
| **Integrasi & Media** | Midtrans (`midtrans-client`), `multer` |

## Struktur Proyek

```text
POS-D-Cafein/
├── backend/
│   ├── prisma/         # Skema database & seed data awal
│   ├── src/            # Controller, route, middleware, dan server entry
│   └── uploads/        # Penyimpanan gambar produk lokal
└── frontend/
    └── src/
        ├── api/        # Konfigurasi HTTP client
        ├── components/ # Komponen reusable (ProtectedRoute, ReceiptModal, dll.)
        ├── context/    # AuthContext
        └── pages/      # Login, POS, Dashboard, Products, Orders, NotFound
```

## Cara Menjalankan di Lokal

### Prasyarat
- Node.js (v18+ direkomendasikan)
- PostgreSQL
- Akun Midtrans Sandbox (untuk simulasi QRIS)

### 1. Clone Repositori
```bash
git clone [https://github.com/ciamtaufiq123-dev/POS-D-Cafein.git](https://github.com/ciamtaufiq123-dev/POS-D-Cafein.git)
cd POS-D-Cafein
```

### 2. Setup Backend
```bash
cd backend
npm install
```

Buat file `.env` di dalam folder `backend/` lalu sesuaikan nilainya:
```env
PORT=5000
DATABASE_URL="postgresql://USER:PASSWORD@localhost:5432/nama_database"
JWT_SECRET="isi_secret_key_kamu"
MIDTRANS_SERVER_KEY="SB-Mid-server-..."
MIDTRANS_CLIENT_KEY="SB-Mid-client-..."
```

Jalankan migrasi database, *seed* data awal, lalu nyalakan server:
```bash
npx prisma migrate dev
npm run seed
npm run dev
```

### 3. Setup Frontend
Buka terminal baru dari folder utama proyek:
```bash
cd frontend
npm install
npm run dev
```

Aplikasi dapat diakses melalui `http://localhost:5173` dengan server backend berjalan di `http://localhost:5000`.

## Akun Demo (Seed)

| Role | Email | Password |
| --- | --- | --- |
| **Admin** | `admin@dcafein.com` | `password123` |
| **Kasir** | `kasir@dcafein.com` | `password123` |

*(Sesuaikan kredensial di atas dengan data yang ada pada `backend/prisma/seed.ts`)*

## Build Produksi

```bash
# Backend
cd backend && npm run build

# Frontend
cd frontend && npm run build
```