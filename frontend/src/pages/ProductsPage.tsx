import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { BACKEND_URL } from '../api/axios';
import {
    Coffee,
    TrendingUp,
    Package,
    ReceiptText,
    Store,
    ChevronRight,
    Calendar,
    User,
    ChevronDown,
    UserCircle,
    Settings,
    LogOut,
    Search,
    Plus,
    Pencil,
    Trash2,
    X,
    UploadCloud,
    Minus,
    Check,
    AlertTriangle,
    CheckCircle2,
} from 'lucide-react';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import type { Product, Category } from '../types/index';

const getImageUrl = (url?: string | null) => {
    if (!url) return null;
    if (url.startsWith('http')) return url;
    return `${BACKEND_URL}${url.startsWith('/') ? '' : '/'}${url}`;
};

export const ProductsPages: React.FC = () => {
    const navigate = useNavigate();
    const { user, logout} = useAuth();

    const [products, setProducts] = useState<Product[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [profileOpen, setProfileOpen] = useState<boolean>(false);
    const [searchQuery, setSearchQuery] = useState<string>('');
    const [selectedCategory, setSelectedCategory] = useState<string>('all');
    const [selectedStatus, setSelectedStatus] = useState<string>('all');
    const [currentPage, setCurrentPage] = useState<number>(1);
    const itemsPerPage = 7;
    const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
    const [editingProduct, setEditingProduct] = useState<Product | null>(null);
    const [submitting, setSubmitting] = useState<boolean>(false);
    const [deletingProduct, setDeletingProduct] = useState<Product | null>(null);
    const [isDeleting, setIsDeleting] = useState<boolean>(false);
    const [formName, setFormName] = useState<string>('');
    const [formCategoryId, setFormCategoryId] = useState<string>('');
    const [formPrice, setFormPrice] = useState<string>('');
    const [formStock, setFormStock] = useState<number>(0);
    const [formAvailable, setFormAvailable] = useState<boolean>(true);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [toast, setToast] = useState<{
      message: string;
      type: 'success' | 'error';
    } | null>(null);
    const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const showToast = (message: string, type: 'success' | 'error' = 'success') => {
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
      setToast({ message, type })
      toastTimerRef.current = setTimeout(() => {
        setToast(null);
      }, 3000)
    }

    const fileInputRef = useRef<HTMLInputElement | null>(null);

    const fetchProductsAndCategories = async () => {
        try {
            setLoading(true);
            const [prodRes, catRes] = await Promise.all([
                api.get('/products'),
                api.get('/products/categories').catch(() => api.get('/categories')),
            ]);

            const prodList: Product[] = prodRes.data?.data || prodRes.data || [];
            const catList: Category[] = catRes.data?.data || catRes.data || [];

            setProducts(prodList);
            setCategories(catList);
        } catch (err) {
            console.error('Gagal memuat data produkatau kategori:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        //eslint-disable-next-line react-hooks/set-state-in-effect
        fetchProductsAndCategories();
    }, []);

    const handleLogout = () => {
        logout();
        navigate('/login', { replace: true });
    };

    const todayFormatted = useMemo(() => {
        return new Intl.DateTimeFormat('id-ID', {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
            year: 'numeric'
        }).format(new Date());
    }, []);

    const formatRupiah = (num: number) => {
        return new Intl.NumberFormat('id-ID', {
            style: 'currency',
            currency: 'IDR',
            minimumFractionDigits: 0,
        }).format(num || 0);
    };

    const metrics = useMemo(() => {
        const total = products.length;
        const available = products.filter((p) => p.stock > 0 && p.isAvailable !== false).length;
        const criticalOrOut = products.filter((p) => p.stock <= 5 || p.isAvailable === false).length;
        return { total, available, criticalOrOut };
    }, [products]);

    const filteredProducts = useMemo(() => {
        return products.filter((product) => {
            const matchSearch = product.name
                .toLocaleLowerCase()
                .includes(searchQuery.trim().toLowerCase());

            const matchCategory =
                selectedCategory === 'all' || product.categoryId === selectedCategory;

            const isReady = product.stock > 0 && product.isAvailable !== false;
            const matchStatus =
                selectedStatus === 'all' ||
                (selectedStatus === 'available' && isReady) ||
                (selectedStatus === 'out' && !isReady);

            return matchSearch && matchCategory && matchStatus;
        });
    }, [products, searchQuery, selectedCategory, selectedStatus]);

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setCurrentPage(1);
    }, [searchQuery, selectedCategory, selectedStatus]);

    const totalPages = Math.max(1, Math.ceil(filteredProducts.length / itemsPerPage));
    const paginatedProducts = useMemo(() => {
        const start = (currentPage - 1) * itemsPerPage;
        return filteredProducts.slice(start, start + itemsPerPage);
    }, [filteredProducts, currentPage]);

    const handleOpenCreateModal = () => {
        setEditingProduct(null);
        setFormName('');
        setFormCategoryId(categories[0]?.id || '');
        setFormPrice('');
        setFormStock(10);
        setFormAvailable(true);
        setSelectedFile(null);
        setPreviewUrl(null);
        setIsModalOpen(true);
    };

    const handleOpenEditModal = (product: Product) => {
        setEditingProduct(product);
        setFormName(product.name);
        setFormCategoryId(product.categoryId || categories[0]?.id || '');
        setFormPrice(String(product.price));
        setFormStock(product.stock);
        setFormAvailable(product.isAvailable !== false);
        setPreviewUrl(null);
        const existingImg = getImageUrl(
            product.imageUrl || (product as Product & { image?: string | null}).image
        );
        setPreviewUrl(existingImg);
        setIsModalOpen(true);
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setSelectedFile(file);
        setPreviewUrl(URL.createObjectURL(file));
    };

    const handleSubmitProduct = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formName.trim() || !formCategoryId) {
            showToast('Nama produk dan kategori wajib diisi!');
            return;
        }

        const cleanPrice = Number(String(formPrice).replace(/[^0-9]/g, ''));
        if (isNaN(cleanPrice) || cleanPrice <= 0) {
            showToast('Masukkan harga jual yang valid!');
            return;
        }

        try {
            setSubmitting(true);
            const formData = new FormData();
            formData.append('name', formName.trim());
            formData.append('categoryId', formCategoryId);
            formData.append('price', String(cleanPrice));
            formData.append('stock', String(Math.max(0, formStock)));
            formData.append('isAvailable', String(formAvailable));

            if (selectedFile) {
                formData.append('image', selectedFile);
            }

            if (editingProduct) {
                await api.put(`/products/${editingProduct.id}`, formData, {
                    headers: { 'Content-Type': 'multipart/form-data' },
                });
            } else {
                await api.post('/products', formData, {
                    headers: { 'Content-Type': 'multipart/form-data' },
                });
            }

            setIsModalOpen(false);
            showToast(
              editingProduct ? 'Produk berhasil diperbarui!' : 'Produk baru berhasil di tambahkan!',
              'success'
            );
            await fetchProductsAndCategories();
        } catch (err) {
            console.error('Gagal menyimpan produk:', err);
            showToast('Terjadi kesalahansaat menyimpan produk.');
        } finally {
            setSubmitting(false);
        }
    };

    const handleConfirmDelete = async () => {
      if (!deletingProduct) return;

      try {
        setIsDeleting(true);
        await api.delete(`/products/${deletingProduct.id}`);
        setDeletingProduct(null);
        showToast('Produk berhasil di hapus dari katalog!', 'success');
        await fetchProductsAndCategories();
      } catch (err) {
        console.error("Gagal mengapus produk:", err)
        showToast('Gagal menghapus produk', 'error');
      } finally {
        setIsDeleting(false);
      }
    };

    const getCategoryBadgeStyle = (categoryName?: string) => {
        const lower = (categoryName || '').toLowerCase();
        if (lower.includes('non')) {
            return 'bg-[#6ffbbe] text-[#005236]';
        }
        if (lower.includes('snack') || lower.includes('makanan')) {
            return 'bg-primary-fixed text-[#783200]';
        }
        return 'bg-surface-container text-on-surface';
    };

    const getSkuLabel = (product: Product, index: number) => {
        const catName = product.category?.name || 'Menu';
        const prefix = catName.toLowerCase().includes('non')
            ? 'NC'
            : catName.toLowerCase().includes('snack')
            ? 'SN'
            : 'CF';
        const num = String(index + 1).padStart(2, '0');
        return `SKU-${prefix}${num} • ${catName}`;
    };

    return (
    <div className="bg-background font-sans text-on-surface antialiased min-h-screen">
      {/* Sidebar Kiri */}
      <aside className="fixed left-0 top-0 h-screen w-60 bg-white border-r border-outline-variant/40 z-50 flex flex-col justify-between">
        <div className="flex flex-col">
          <div className="h-16 px-4 flex items-center gap-2.5 border-b border-outline-variant/30">
            <div className="w-9 h-9 rounded-xl bg-primary-container flex items-center justify-center shadow-xs">
              <Coffee className="w-5 h-5 text-white" />
            </div>
            <div className="flex flex-col">
              <span className="text-lg font-bold text-on-surface leading-none tracking-tight">
                D&apos;Cafein
              </span>
              <span className="text-[11px] font-medium text-on-surface-variant mt-0.5">
                Admin Dashboard
              </span>
            </div>
          </div>

          <div className="p-3">
            <p className="px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-on-surface-variant/80">
              Menu Utama
            </p>
            <nav className="space-y-1 mt-1">
              <Link
                to="/dashboard"
                className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm text-on-surface-variant hover:bg-surface-container hover:text-on-surface transition-colors"
              >
                <TrendingUp className="w-4 h-4" />
                <span>Dashboard Analitik</span>
              </Link>
              <Link
                to="/products"
                className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm bg-primary-fixed/50 text-primary-container font-semibold transition-colors"
              >
                <Package className="w-4 h-4" />
                <span>Kelola Produk (CRUD)</span>
              </Link>
              <Link
                to="/orders"
                className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm text-on-surface-variant hover:bg-surface-container hover:text-on-surface transition-colors"
              >
                <ReceiptText className="w-4 h-4" />
                <span>Riwayat Transaksi</span>
              </Link>
              <Link
                to="/pos"
                className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm text-on-surface-variant hover:bg-surface-container hover:text-on-surface transition-colors"
              >
                <Store className="w-4 h-4" />
                <span>Kasir POS</span>
              </Link>
            </nav>
          </div>
        </div>
      </aside>

      {/* Konten Utama */}
      <div className="pl-60 min-h-screen flex flex-col">
        {/* Header Atas */}
        <header className="fixed top-0 left-60 right-0 h-16 bg-white border-b border-outline-variant/40 z-40 px-6 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-medium text-on-surface-variant">
            <Store className="w-4 h-4" />
            <span>Operasional</span>
            <ChevronRight className="w-3.5 h-3.5" />
            <span className="text-on-surface font-semibold">Overview</span>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5 text-on-surface-variant text-xs">
              <Calendar className="w-4 h-4" />
              <span>{todayFormatted}</span>
            </div>

            <div className="h-4 w-px bg-outline-variant/40" />

            <div className="relative">
              <button
                type="button"
                onClick={() => setProfileOpen((prev) => !prev)}
                className="flex items-center gap-2 p-1 pl-2 pr-2.5 rounded-full bg-surface-container-low hover:bg-surface-container transition-colors focus:outline-none"
              >
                <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-white">
                  <User className="w-4 h-4" />
                </div>
                <div className="flex flex-col text-left">
                  <span className="text-xs text-on-surface font-semibold leading-tight">
                    {user?.name || "Admin D'Cafein"}
                  </span>
                  <span className="text-[10px] text-on-surface-variant leading-none mt-0.5">
                    Owner
                  </span>
                </div>
                <ChevronDown className="w-4 h-4 text-on-surface-variant" />
              </button>

              {profileOpen && (
                <div className="absolute right-0 top-full mt-2 w-64 bg-white rounded-xl shadow-xl border border-slate-100 z-50 p-2 flex flex-col">
                  <div className="flex items-center gap-2.5 p-2">
                    <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-white shrink-0">
                      <User className="w-5 h-5" />
                    </div>
                    <div className="flex flex-col min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm text-on-surface font-semibold truncate">
                          {user?.name || "Admin D'Cafein"}
                        </span>
                        <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-primary-fixed text-[#783200] uppercase tracking-wider font-semibold">
                          Owner
                        </span>
                      </div>
                      <span className="text-xs text-on-surface-variant truncate">
                        {user?.email || 'admin@dcafein.com'}
                      </span>
                    </div>
                  </div>
                  <div className="h-px bg-slate-100 my-1" />
                  <button
                    type="button"
                    onClick={() => setProfileOpen(false)}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-on-surface hover:bg-slate-50 transition-colors text-left"
                  >
                    <UserCircle className="w-4 h-4 text-on-surface-variant" />
                    <span>Profil Saya</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setProfileOpen(false)}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-on-surface hover:bg-slate-50 transition-colors text-left"
                  >
                    <Settings className="w-4 h-4 text-on-surface-variant" />
                    <span>Pengaturan Akun</span>
                  </button>
                  <div className="h-px bg-slate-100 my-1" />
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-[#ba1a1a] hover:bg-[#ffdad6]/40 transition-colors text-left font-medium"
                  >
                    <LogOut className="w-4 h-4 text-[#ba1a1a]" />
                    <span>Keluar</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Body Halaman */}
        <main className="flex-1 pt-22 px-6 pb-8 w-full">
          <div className="flex flex-col w-full">
            {/* Judul & Quick Metrics Ribbon */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-6">
              <div>
                <h1 className="text-2xl md:text-3xl font-bold text-on-surface tracking-tight">
                  Manajemen Menu &amp; Stok Produk
                </h1>
                <p className="text-sm text-on-surface-variant mt-1">
                  Kelola katalog menu, update ketersediaan stok bahan, dan ubah harga jual kafe secara real-time.
                </p>
              </div>

              <div className="flex items-center gap-3 shrink-0 flex-wrap">
                <div className="flex items-center gap-2 px-3.5 py-2 bg-white rounded-xl shadow-xs border border-slate-100">
                  <span className="w-2.5 h-2.5 rounded-full bg-primary-container" />
                  <span className="text-[11px] font-semibold text-on-surface-variant uppercase tracking-wider">
                    Total Menu:
                  </span>
                  <span className="text-lg font-bold text-on-surface">
                    {metrics.total}
                  </span>
                </div>
                <div className="flex items-center gap-2 px-3.5 py-2 bg-white rounded-xl shadow-xs border border-slate-100">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#006c49]" />
                  <span className="text-[11px] font-semibold text-on-surface-variant uppercase tracking-wider">
                    Tersedia:
                  </span>
                  <span className="text-lg font-bold text-[#006c49]">
                    {metrics.available}
                  </span>
                </div>
                <div className="flex items-center gap-2 px-3.5 py-2 bg-white rounded-xl shadow-xs border border-slate-100">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#ba1a1a]" />
                  <span className="text-[11px] font-semibold text-on-surface-variant uppercase tracking-wider">
                    Habis / Kritis:
                  </span>
                  <span className="text-lg font-bold text-[#ba1a1a]">
                    {metrics.criticalOrOut}
                  </span>
                </div>
              </div>
            </div>

            {/* Bar Filter & Tombol Tambah */}
            <div className="bg-white rounded-xl p-3.5 shadow-xs border border-slate-100 mb-6 flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
              <div className="flex flex-1 flex-col sm:flex-row items-stretch sm:items-center gap-3">
                {/* Input Pencarian */}
                <div className="relative flex-1 min-w-60">
                  <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-on-surface-variant" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Cari nama produk, SKU, varian..."
                    className="w-full pl-10 pr-4 py-2.5 bg-background rounded-lg text-sm text-on-surface placeholder:text-on-surface-variant/70 focus:outline-none focus:bg-white focus:ring-2 focus:ring-primary-container/30 transition-all"
                  />
                </div>

                {/* Filter Kategori */}
                <div className="relative w-full sm:w-48">
                  <select
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    className="w-full appearance-none pl-3.5 pr-9 py-2.5 bg-background rounded-lg text-sm font-medium text-on-surface cursor-pointer focus:outline-none focus:bg-white focus:ring-2 focus:ring-primary-container/30"
                  >
                    <option value="all">Semua Kategori</option>
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.name}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-on-surface-variant" />
                </div>

                {/* Filter Status */}
                <div className="relative w-full sm:w-44">
                  <select
                    value={selectedStatus}
                    onChange={(e) => setSelectedStatus(e.target.value)}
                    className="w-full appearance-none pl-3.5 pr-9 py-2.5 bg-background rounded-lg text-sm font-medium text-on-surface cursor-pointer focus:outline-none focus:bg-white focus:ring-2 focus:ring-primary-container/30"
                  >
                    <option value="all">Semua Status</option>
                    <option value="available">Tersedia (Ready)</option>
                    <option value="out">Habis (Out of stock)</option>
                  </select>
                  <ChevronDown className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-on-surface-variant" />
                </div>
              </div>

              {/* Tombol Tambah Produk Baru */}
              <div className="flex items-center">
                <button
                  type="button"
                  onClick={handleOpenCreateModal}
                  className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-2.5 bg-primary-container text-white rounded-lg text-sm font-semibold shadow-xs hover:opacity-95 active:scale-[0.98] transition-all cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Tambah Produk Baru</span>
                </button>
              </div>
            </div>

            {/* Tabel Data Produk */}
            <div className="bg-white rounded-xl shadow-xs border border-slate-100 overflow-hidden flex flex-col">
              <div className="w-full overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-surface-container-low text-[11px] font-semibold text-on-surface-variant uppercase tracking-wider">
                      <th className="py-3.5 px-4 w-20">Foto</th>
                      <th className="py-3.5 px-4">Nama Produk &amp; SKU</th>
                      <th className="py-3.5 px-4">Kategori</th>
                      <th className="py-3.5 px-4">Harga Jual</th>
                      <th className="py-3.5 px-4">Stok Terkini</th>
                      <th className="py-3.5 px-4">Status</th>
                      <th className="py-3.5 px-4 text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {loading ? (
                      <tr>
                        <td colSpan={7} className="py-12 text-center text-sm text-on-surface-variant">
                          Memuat data produk...
                        </td>
                      </tr>
                    ) : paginatedProducts.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-12 text-center text-sm text-on-surface-variant">
                          Tidak ada produk yang sesuai dengan filter pencarian.
                        </td>
                      </tr>
                    ) : (
                      paginatedProducts.map((product, idx) => {
                        const globalIdx = (currentPage - 1) * itemsPerPage + idx;
                        const imgUrl = getImageUrl(
                          product.imageUrl ||
                            (product as Product & { image?: string | null }).image
                        );
                        const isOut = product.stock <= 0 || product.isAvailable === false;
                        const isLow = !isOut && product.stock <= 12;

                        return (
                          <tr
                            key={product.id}
                            className={`hover:bg-background/80 transition-colors group ${
                              isOut ? 'bg-[#ffdad6]/15' : ''
                            }`}
                          >
                            <td className="py-3 px-4">
                              <div
                                className={`w-12 h-12 rounded-lg overflow-hidden bg-surface-container flex items-center justify-center shadow-2xs ${
                                  isOut ? 'opacity-75' : ''
                                }`}
                              >
                                {imgUrl ? (
                                  <img
                                    src={imgUrl}
                                    alt={product.name}
                                    className="w-full h-full object-cover"
                                  />
                                ) : (
                                  <Coffee className="w-5 h-5 text-primary/50" />
                                )}
                              </div>
                            </td>

                            <td className="py-3 px-4">
                              <div className="flex flex-col">
                                <span className="text-sm text-on-surface font-semibold group-hover:text-primary-container transition-colors">
                                  {product.name}
                                </span>
                                <span className="text-[11px] text-on-surface-variant font-mono mt-0.5">
                                  {getSkuLabel(product, globalIdx)}
                                </span>
                              </div>
                            </td>

                            <td className="py-3 px-4">
                              <span
                                className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold ${getCategoryBadgeStyle(
                                  product.category?.name
                                )}`}
                              >
                                {product.category?.name || 'Umum'}
                              </span>
                            </td>

                            <td className="py-3 px-4 text-sm font-semibold text-on-surface">
                              {formatRupiah(product.price)}
                            </td>

                            <td className="py-3 px-4">
                              {isOut ? (
                                <span className="text-sm text-[#ba1a1a] font-semibold">
                                  {product.stock} pcs (Habis)
                                </span>
                              ) : (
                                <div className="flex items-center gap-1.5">
                                  <span className="text-sm text-on-surface font-medium">
                                    {product.stock} pcs
                                  </span>
                                  {isLow ? (
                                    <span className="text-[11px] text-primary-container font-semibold">
                                      (Menipis)
                                    </span>
                                  ) : (
                                    <span className="text-[11px] text-on-surface-variant">
                                      (Aman)
                                    </span>
                                  )}
                                </div>
                              )}
                            </td>

                            <td className="py-3 px-4">
                              {isOut ? (
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[#ffdad6] text-[#93000a]">
                                  <span className="w-2 h-2 rounded-full bg-[#ba1a1a]" />
                                  Habis
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-secondary-fixed/50 text-[#005236]">
                                  <span className="w-2 h-2 rounded-full bg-[#006c49]" />
                                  Tersedia
                                </span>
                              )}
                            </td>

                            <td className="py-3 px-4 text-right">
                              <div className="inline-flex items-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => handleOpenEditModal(product)}
                                  title="Edit Menu"
                                  className="p-2 rounded-lg text-on-surface-variant hover:text-on-surface hover:bg-surface-container transition-all cursor-pointer"
                                >
                                  <Pencil className="w-4 h-4" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setDeletingProduct(product)}
                                  title="Hapus Menu"
                                  className="p-2 rounded-lg text-on-surface-variant hover:text-[#ba1a1a] hover:bg-[#ffdad6]/50 transition-all cursor-pointer"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                    {/* Modal Konfirmasi Hapus Produk */}
                    {deletingProduct && (
                      <div
                        onClick={() => !isDeleting && setDeletingProduct(null)}
                        className="fixed inset-0 z-50 flex items-center justify-center bg-[#283044]/40 backdrop-blur-xs p-4 animate-fade-in"
                      >
                        <div
                          onClick={(e) => e.stopPropagation()}
                          className="bg-white w-full max-w-105 rounded-2xl shadow-xl border border-slate-100 overflow-hidden"
                        >
                          <div className="p-6 text-center">
                            {/* Ikon Peringatan */}
                            <div className="w-12 h-12 rounded-full bg-[#ffdad6] text-[#ba1a1a] flex items-center justify-center mx-auto mb-4">
                              <AlertTriangle className="w-6 h-6" />
                            </div>
                    
                            <h3 className="text-lg font-bold text-on-surface">
                              Hapus Menu Ini?
                            </h3>
                            <p className="text-xs text-on-surface-variant mt-1.5 leading-relaxed">
                              Menu yang dihapus akan langsung hilang dari katalog kasir POS. Riwayat transaksi sebelumnya tetap tersimpan aman.
                            </p>
                    
                            {/* Preview Mini Produk yang Akan Dihapus */}
                            <div className="mt-4 p-3 rounded-xl bg-background border border-slate-100 flex items-center gap-3 text-left">
                              <div className="w-11 h-11 rounded-lg overflow-hidden bg-surface-container flex items-center justify-center shrink-0">
                                {getImageUrl(deletingProduct.imageUrl) ? (
                                  <img
                                    src={getImageUrl(deletingProduct.imageUrl) || ''}
                                    alt={deletingProduct.name}
                                    className="w-full h-full object-cover"
                                  />
                                ) : (
                                  <Coffee className="w-5 h-5 text-[#9d4300]/50" />
                                )}
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="text-sm font-semibold text-on-surface truncate">
                                  {deletingProduct.name}
                                </p>
                                <p className="text-xs text-on-surface-variant">
                                  {formatRupiah(deletingProduct.price)} • Stok {deletingProduct.stock} pcs
                                </p>
                              </div>
                            </div>
                          </div>
                              
                          {/* Tombol Aksi */}
                          <div className="px-6 py-4 bg-background border-t border-slate-100 flex items-center justify-end gap-2.5">
                            <button
                              type="button"
                              disabled={isDeleting}
                              onClick={() => setDeletingProduct(null)}
                              className="flex-1 px-4 py-2.5 bg-white border border-slate-200 text-on-surface rounded-xl text-sm font-semibold hover:bg-slate-50 transition-colors disabled:opacity-50 cursor-pointer"
                            >
                              Batal
                            </button>
                            <button
                              type="button"
                              disabled={isDeleting}
                              onClick={handleConfirmDelete}
                              className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5 bg-[#ba1a1a] text-white rounded-xl text-sm font-semibold shadow-xs hover:bg-[#93000a] active:scale-[0.98] transition-all disabled:opacity-50 cursor-pointer"
                            >
                              <Trash2 className="w-4 h-4" />
                              <span>{isDeleting ? 'Menghapus...' : 'Ya, Hapus'}</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                    {/* Toast Notifikasi Melayang */}
                    {toast && (
                      <div className="fixed top-20 right-6 z-60 flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg border bg-white max-w-sm transition-all">
                        <div
                          className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                            toast.type === 'success'
                              ? 'bg-secondary-fixed/40 text-[#006c49]'
                              : 'bg-[#ffdad6] text-[#ba1a1a]'
                          }`}
                        >
                          {toast.type === 'success' ? (
                            <CheckCircle2 className="w-4 h-4" />
                          ) : (
                            <AlertTriangle className="w-4 h-4" />
                          )}
                        </div>
                        <p className="text-sm font-medium text-on-surface leading-snug">
                          {toast.message}
                        </p>
                        <button
                          type="button"
                          onClick={() => setToast(null)}
                          className="p-1 rounded-md text-on-surface-variant hover:bg-slate-100 hover:text-on-surface transition-colors cursor-pointer"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                    </tbody>
                  </table>
                </div>

              {/* Footer Pagination */}
              <div className="px-4 py-3.5 bg-white flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-slate-100">
                <span className="text-xs text-on-surface-variant">
                  Menampilkan{' '}
                  <strong className="text-on-surface font-semibold">
                    {filteredProducts.length === 0
                      ? 0
                      : (currentPage - 1) * itemsPerPage + 1}{' '}
                    -{' '}
                    {Math.min(currentPage * itemsPerPage, filteredProducts.length)}
                  </strong>{' '}
                  dari{' '}
                  <strong className="text-on-surface font-semibold">
                    {filteredProducts.length}
                  </strong>{' '}
                  produk menu
                </span>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    disabled={currentPage <= 1}
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    className="px-3 py-1.5 rounded-lg bg-background text-on-surface-variant text-xs font-semibold hover:bg-surface-container transition-colors disabled:opacity-40 cursor-pointer"
                  >
                    Sebelumnya
                  </button>
                  <div className="flex items-center gap-1">
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                      <button
                        key={page}
                        type="button"
                        onClick={() => setCurrentPage(page)}
                        className={`w-8 h-8 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                          currentPage === page
                            ? 'bg-primary-container text-white'
                            : 'bg-background text-on-surface hover:bg-surface-container'
                        }`}
                      >
                        {page}
                      </button>
                    ))}
                  </div>
                  <button
                    type="button"
                    disabled={currentPage >= totalPages}
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    className="px-3 py-1.5 rounded-lg bg-background text-on-surface text-xs font-semibold hover:bg-surface-container transition-colors disabled:opacity-40 cursor-pointer"
                  >
                    Berikutnya
                  </button>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>

      {/* Modal Dialog: Tambah / Edit Produk */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#283044]/40 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white w-full max-w-135 rounded-xl shadow-xl overflow-hidden my-auto flex flex-col">
            {/* Header Modal */}
            <div className="px-6 py-4 flex items-center justify-between bg-white border-b border-slate-100">
              <div>
                <h2 className="text-lg font-bold text-on-surface">
                  {editingProduct ? 'Edit Menu Produk' : 'Tambah Produk Baru'}
                </h2>
                <p className="text-xs text-on-surface-variant mt-0.5">
                  Lengkapi informasi menu kafe dan stok produk di bawah ini.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-on-surface-variant hover:bg-slate-100 hover:text-on-surface transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form Modal */}
            <form onSubmit={handleSubmitProduct} className="p-6 space-y-4">
              {/* Area Upload Foto */}
              <div>
                <label className="block text-xs font-semibold text-on-surface mb-1.5">
                  Foto Menu Produk
                </label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full p-4 bg-background border border-dashed border-outline-variant rounded-xl flex flex-col items-center justify-center text-center group cursor-pointer hover:bg-surface-container/50 transition-colors"
                >
                  {previewUrl ? (
                    <div className="flex flex-col items-center">
                      <img
                        src={previewUrl}
                        alt="Preview Produk"
                        className="w-24 h-24 rounded-lg object-cover shadow-xs mb-2"
                      />
                      <span className="text-xs font-semibold text-primary-container">
                        Klik untuk mengganti foto
                      </span>
                    </div>
                  ) : (
                    <>
                      <div className="w-11 h-11 rounded-full bg-primary-fixed flex items-center justify-center text-primary-container mb-2 group-hover:scale-105 transition-transform">
                        <UploadCloud className="w-5 h-5" />
                      </div>
                      <span className="text-sm text-on-surface font-semibold">
                        Klik untuk memilih gambar dari perangkat
                      </span>
                      <span className="text-[11px] text-on-surface-variant mt-0.5">
                        Mendukung format JPG, PNG, WEBP (Maksimal 2MB)
                      </span>
                    </>
                  )}
                </div>
              </div>

              {/* Input Nama Produk */}
              <div>
                <label className="block text-xs font-semibold text-on-surface mb-1.5">
                  Nama Produk <span className="text-[#ba1a1a]">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="Contoh: Kopi Susu Gula Aren"
                  className="w-full px-3.5 py-2.5 bg-background rounded-lg text-sm text-on-surface focus:outline-none focus:bg-white focus:ring-2 focus:ring-primary-container/30 transition-all"
                />
              </div>

              {/* Pilih Kategori */}
              <div>
                <label className="block text-xs font-semibold text-on-surface mb-1.5">
                  Kategori Menu <span className="text-[#ba1a1a]">*</span>
                </label>
                <div className="relative">
                  <select
                    required
                    value={formCategoryId}
                    onChange={(e) => setFormCategoryId(e.target.value)}
                    className="w-full appearance-none px-3.5 py-2.5 bg-background rounded-lg text-sm text-on-surface cursor-pointer focus:outline-none focus:bg-white focus:ring-2 focus:ring-primary-container/30 transition-all"
                  >
                    <option value="" disabled>
                      -- Pilih Kategori --
                    </option>
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.name}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-on-surface-variant" />
                </div>
              </div>

              {/* Grid 2 Kolom: Harga & Stok */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-on-surface mb-1.5">
                    Harga Jual (IDR) <span className="text-[#ba1a1a]">*</span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs text-on-surface-variant font-semibold">
                      Rp
                    </span>
                    <input
                      type="number"
                      min={0}
                      required
                      value={formPrice}
                      onChange={(e) => setFormPrice(e.target.value)}
                      placeholder="15000"
                      className="w-full pl-9 pr-3.5 py-2.5 bg-background rounded-lg text-sm text-on-surface font-mono focus:outline-none focus:bg-white focus:ring-2 focus:ring-primary-container/30 transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-on-surface mb-1.5">
                    Stok Produk <span className="text-[#ba1a1a]">*</span>
                  </label>
                  <div className="flex items-center">
                    <button
                      type="button"
                      onClick={() => setFormStock((s) => Math.max(0, s - 1))}
                      className="w-10 h-10 bg-background rounded-l-lg flex items-center justify-center text-on-surface-variant hover:bg-surface-container transition-colors cursor-pointer"
                    >
                      <Minus className="w-4 h-4" />
                    </button>
                    <input
                      type="number"
                      min={0}
                      value={formStock}
                      onChange={(e) =>
                        setFormStock(Math.max(0, parseInt(e.target.value || '0', 10)))
                      }
                      className="w-full py-2.5 bg-background text-center text-sm text-on-surface font-mono focus:outline-none focus:bg-white"
                    />
                    <button
                      type="button"
                      onClick={() => setFormStock((s) => s + 1)}
                      className="w-10 h-10 bg-background rounded-r-lg flex items-center justify-center text-on-surface-variant hover:bg-surface-container transition-colors cursor-pointer"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Toggle Ketersediaan */}
              <div className="p-3.5 bg-background rounded-xl flex items-center justify-between gap-4">
                <div className="flex flex-col">
                  <span className="text-sm text-on-surface font-semibold">
                    Produk Tersedia untuk Dijual
                  </span>
                  <span className="text-xs text-on-surface-variant">
                    Menu akan langsung tampil di layar Kasir POS &amp; siap dipesan.
                  </span>
                </div>
                <label className="relative inline-flex items-center cursor-pointer shrink-0">
                  <input
                    type="checkbox"
                    checked={formAvailable}
                    onChange={(e) => setFormAvailable(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-300 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-container" />
                </label>
              </div>

              {/* Footer Modal */}
              <div className="pt-3 flex items-center justify-end gap-2.5 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2.5 bg-background text-on-surface rounded-lg text-sm font-semibold hover:bg-surface-container transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex items-center gap-1.5 px-5 py-2.5 bg-primary-container text-white rounded-lg text-sm font-semibold shadow-xs hover:opacity-95 active:scale-[0.98] transition-all disabled:opacity-50 cursor-pointer"
                >
                  <Check className="w-4 h-4" />
                  <span>{submitting ? 'Menyimpan...' : 'Simpan Produk'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
