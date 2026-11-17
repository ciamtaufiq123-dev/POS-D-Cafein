import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Search, ReceiptText, User as UserIcon, ChevronDown, LogOut, Plus, Minus, Banknote, QrCode, BadgeCheck, Coffee, Download, RefreshCw, CheckCircle2, LayoutDashboard, X, PiggyBank, IdCard } from 'lucide-react';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import type { Category, Product, PaymentMethod, Order } from '../types/index'
import { formatRupiah, formatDateTime, getImageUrl } from '../utils/format';
import { downloadReceiptPdf } from '../utils/receiptPdf';

type PosCartItem = { product: Product; quantity: number };
const createPreviewInvCode = () => `INV-${Date.now().toString().slice(-9)}`;

declare global {
    interface Window {
        snap?: {
            pay: (
        token: string,
        options?: {
            onSuccess?: () => void;
            onPending?: () => void;
            onClose?: () => void;
            }
        ) => void;
        };
    }
}

export const PosPage: React.FC = () => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();

    const [ products, setProducts ] = useState<Product[]>([]);
    const [ categories, setCategories ] = useState<Category[]>([]);
    const [ loading, setLoading ] = useState <boolean>(true);
    const [ selectedCategory, setSelectedCategory ] = useState <string>('ALL');
    const [ searchQuery, setSearchQuery ] = useState <string>('');
    const [ cart, setCart ] = useState<PosCartItem[]>([]);
    const [ customerName, setCustomerName ] = useState<string>('Pelanggan Umum');
    const [ paymentMethod, setPaymentMethod ] = useState<PaymentMethod>('CASH');
    const [ cashInput, setCashInput ] = useState<string>('');
    const [ submitting, setSubmitting ] = useState<boolean>(false);
    const [ errorMsg, setErrorMsg ] = useState<string | null>(null);
    const [ profileOpen, setProfileOpen ] = useState<boolean>(false);
    const [ completedOrder, setCompletedOrder ] = useState<Order | null>(null);
    const [ downloadingPdf, setDownloadingPdf ] = useState<boolean>(false);
    const [ historyOpen, setHistoryOpen ] = useState<boolean>(false);
    const [ ordersHistory, setOrdersHistory ] = useState<Order[]>([]);
    const [ loadingHistory, setLoadingHistory ] = useState<boolean>(false);

    const [ previewInvCode, setPreviewInvCode ] = useState<string>('');

    const fetchCatalog = async () => {
        try {
            const [prodRes, catRes] = await Promise.all([
                api.get('/products'),
                api.get('/products/categories').catch(() => ({ data: { data: [] } })),
            ]);

            const prodList: Product[] = prodRes.data?.data || prodRes.data || [];
            const catList: Category[] = catRes.data?.data || catRes.data || [];

            setProducts(prodList);
            setCategories(catList);
        } catch (err) {
            console.log('Gagal memuat katalog menu:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
      setPreviewInvCode(createPreviewInvCode());
        fetchCatalog();
    }, []);
    const categoryList = useMemo(() => {
        if (categories.length > 0) return categories;
        const map = new Map<string, Category>();
        products.forEach((p) => {
            if (p.category && !map.has(p.category.id)) {
                map.set(p.category.id, p.category);
            }
        });
        return Array.from(map.values());
    }, [categories, products]);

    const filteredProducts = useMemo(() => {
        return products.filter((product) => {
            const matchCategory =
                selectedCategory === 'ALL' || product.categoryId === selectedCategory;
            const matchSearch = product.name
                .toLowerCase()
                .includes(searchQuery.toLowerCase().trim());
            return matchCategory && matchSearch;
        });
    }, [products, selectedCategory, searchQuery]);

    const subtotal = useMemo(() => {
        return cart.reduce(
          (sum, item) => sum + Number(item.product.price) * item.quantity, 0);
    }, [cart]);

    const totalItemsCount = useMemo(() => {
        return cart.reduce((sum, item) => sum + item.quantity, 0);
    }, [cart]);

    const numericCash = useMemo(() => {
        const cleaned = cashInput.replace(/\D/g, '');
        return cleaned ? parseInt(cleaned, 10) : 0;
    }, [cashInput]);

    const changeAmount = useMemo(() => {
        if (paymentMethod !== 'CASH') return 0;
        return Math.max(0, numericCash - subtotal);
    }, [paymentMethod, numericCash, subtotal]);

    const addToCart = (product: Product) => {
        setErrorMsg(null);
        if (product.stock <= 0) {
            setErrorMsg(`Stok ${product.name} sedang habis.`);
            return;
        }

        setCart((prev) => {
            const existing = prev.find((item) => item.product.id === product.id);
            if (existing) {
                if(existing.quantity >= product.stock) {
                    setErrorMsg(`Maksimalkan stok ${product.name} hanya ${product.stock}.`);
                    return prev;
                }
                return prev.map((item) => {
                    return item.product.id === product.id
                        ? { ...item, quantity: item.quantity + 1 }
                        : item;
                });
            }
            return [...prev, { product, quantity: 1}];
        });
    };

    const decreaseFromCart = (productId: string) => {
        setErrorMsg(null);
        setCart((prev) => 
            prev
                .map((item) => 
                    item.product.id === productId ? {...item, quantity: item.quantity - 1} : item
            )
            .filter((item) => item.quantity > 0)
        );
    };

    const handleSetQuickCash = (amount: number) => {
        setCashInput(amount.toLocaleString('id-ID'));
    };

    const handleCashInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const raw = e.target.value.replace(/\D/g, '');
        if (!raw) {
            setCashInput('');
            return;
        }
        setCashInput(parseInt(raw, 10).toLocaleString('id-ID'));
    };

    const handleCheckout = async () => {
        setErrorMsg(null);

        if (cart.length === 0) {
            setErrorMsg('Pilih minimal 1 menu terlebih dahulu.');
            return;
        }

        if (paymentMethod === 'CASH' &&  numericCash < subtotal) {
            setErrorMsg(`Uang tunai (${formatRupiah(numericCash)}) kurang dari total tagihan (${formatRupiah(subtotal)}).`);
            return;
        }

        try {
        setSubmitting(true);
        const payload = {
            customerName: customerName.trim() || 'Pelanggan Umum',
            paymentMethod,
            amountPaid: paymentMethod ==='CASH' ? numericCash : subtotal,
            items: cart.map((item) => ({
                productId: item.product.id,
                quantity: item.quantity,
            })),
        };

        const res = await api.post('/orders', payload);
        const createdOrder: Order = res.data?.data || res.data; 
        const snapToken: string | undefined = res.data?.snapToken || createdOrder.snapToken;

        if (paymentMethod === 'MIDTRANS' && snapToken && window.snap) {
            localStorage.setItem('pending_midtrans_order_id', JSON.stringify(createdOrder));
            window.snap.pay(snapToken, {
              onSuccess: async () => {
                await handleConfirmMidtransPaid(createdOrder.id);
                },
                onPending: () => {
                    localStorage.removeItem('pending_midtrans_order_id');
                    setCompletedOrder(createdOrder);
                },
                onClose: () => {
                    setCompletedOrder(createdOrder);
                },
            });
        } else {
            setCompletedOrder(createdOrder);
        }

        setCart([]);
        setCustomerName('Pelanggan Umum');
        setCashInput('');
        setPreviewInvCode(createPreviewInvCode());
        fetchCatalog();

        } catch (err: unknown) {
            console.error('Gagal memproses pembayaran', err);
            if (axios.isAxiosError(err)) {
            setErrorMsg(
                err.response?.data?.message || 'Gagal memproses pembayaran, silahkan coba lagi.'
                );
            } else {
                setErrorMsg('Terjadi kesalahan jaringan ke server')
            }
            } finally {
                setSubmitting(false);
            }
        };

const handleConfirmMidtransPaid = async (orderId: string) => {
    try {
        const res = await api.patch(`/orders/${orderId}/pay`);
        const updatedOrder: Order = res.data?.data || res.data;
        if (updatedOrder && updatedOrder.items) {
          setCompletedOrder(updatedOrder)
        }
        fetchCatalog();
        if (historyOpen) {
            fetchOrderHistory();
        }
    } catch (err) {
        console.error('Gagal update status pembayaran', err)
    }
};

useEffect(() => {
  const savedOrderRaw = localStorage.getItem('pending_midtrans_order_id');

  if (savedOrderRaw) {
      localStorage.removeItem('pending_midtrans_order_id');
      
      try {
        const savedOrder: Order = JSON.parse(savedOrderRaw);
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setCompletedOrder({
          ...savedOrder,
          paymentStatus: 'PAID',
          amountPaid: savedOrder.totalAmount,
          changeAmount: 0,
        });

        handleConfirmMidtransPaid(savedOrder.id)
      } catch (err) {
        console.error('Gagal membaca data struk Midtrans:', err)
      }

      window.history.replaceState({}, '', '/pos')
  }
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, []);

const handleTriggerDownloadPdf = (order: Order) => {
    setDownloadingPdf(true);
    downloadReceiptPdf(order);
    setTimeout(() => {
        setDownloadingPdf(false);
    }, 1000);
};

const fetchOrderHistory = async () => {
    try {
        setLoadingHistory(true);
        const res = await api.get('/orders');
        const list: Order[] = res.data?.data || res.data || [];
        setOrdersHistory(list)
    } catch (err) {
        console.error('Gagal mengambil riwayat transaksi', err);
    } finally {
        setLoadingHistory(false);
    }
};

const handleOpenHistory = () => {
    setHistoryOpen(true);
    fetchOrderHistory();
};

const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
};

const getCategoryColorClass = (catName?: string) => {
    const lower = (catName || '').toLowerCase();
    if (lower.includes('non')) return 'text-[#006c49]';
    if (lower.includes('makan') || lower.includes('snack') || lower.includes('food'))
        return 'text-[#006398]';
    return 'text-primary';
};

return (
    <div className="bg-background text-on-surface antialiased min-h-screen font-sans">
      {/* HEADER ATAS */}
      <header className="fixed top-0 left-0 right-0 z-40 bg-white shadow-[0_1px_8px_rgba(0,0,0,0.04)]">
        <div className="h-16 w-full px-6 flex items-center justify-between gap-4">
          {/* Logo Brand */}
          <div className="flex items-center gap-3 shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-primary-fixed flex items-center justify-center text-primary font-bold shadow-2xs">
                <Coffee className="w-5 h-5 text-primary-container" />
              </div>
              <span className="text-[20px] font-semibold tracking-tight text-on-surface">
                D'Cafein
              </span>
            </div>
          </div>

          {/* Kolom Pencarian Tengah */}
          <div className="flex-1 max-w-xl mx-4">
            <div className="relative flex items-center w-full">
              <Search className="w-4 h-4 absolute left-3.5 text-on-surface-variant pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari menu kopi atau makanan..."
                className="w-full h-9 pl-10 pr-4 bg-surface-container-low rounded-lg text-sm text-on-surface placeholder:text-on-surface-variant/70 focus:outline-none focus:bg-white focus:ring-1 focus:ring-primary-container transition-all"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          {/* Menu Kanan: Dashboard (Khusus Admin), Riwayat Transaksi & Profil */}
          <div className="flex items-center gap-3 shrink-0">
            {user?.role === 'ADMIN' && (
              <button
                type="button"
                onClick={() => navigate('/dashboard')}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-primary bg-primary-fixed/50 hover:bg-primary-fixed text-xs font-semibold transition-colors cursor-pointer"
              >
                <LayoutDashboard className="w-4 h-4" />
                <span>Dashboard Admin</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleOpenHistory}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-on-surface-variant hover:text-on-surface hover:bg-surface-container text-xs font-semibold transition-colors cursor-pointer"
            >
              <ReceiptText className="w-4 h-4" />
              <span>Riwayat Transaksi</span>
            </button>

            {/* Dropdown Profil User */}
            <div className="relative flex items-center pl-2 border-l border-[#dae2fd]">
              <button
                type="button"
                onClick={() => setProfileOpen((prev) => !prev)}
                className="flex items-center gap-2 px-2 py-1.5 rounded-xl hover:bg-surface-container transition-all cursor-pointer group focus:outline-none"
              >
                <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-white font-semibold text-xs shadow-xs shrink-0">
                  <UserIcon className="w-4 h-4" />
                </div>
                <div className="flex flex-col text-left">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs text-on-surface font-semibold group-hover:text-primary transition-colors leading-none">
                      {user?.name?.split(' ')[0] || 'Kasir'}
                    </span>
                    <span className="px-1.5 py-0.5 rounded bg-primary-fixed text-[#783200] text-[10px] font-semibold leading-none">
                      {user?.role === 'ADMIN' ? 'Admin' : 'Kasir'}
                    </span>
                  </div>
                </div>
                <ChevronDown className="w-4 h-4 text-on-surface-variant group-hover:text-on-surface transition-transform" />
              </button>

              {profileOpen && (
                <div className="flex flex-col absolute right-0 top-full mt-2 w-64 bg-white rounded-xl shadow-xl border border-[#dae2fd] z-50 p-1.5">
                  <div className="px-3 py-2.5 bg-surface-container-low/60 rounded-lg mb-1">
                    <div className="flex items-center justify-between mb-0.5">
                      <p className="text-xs font-semibold text-on-surface truncate">
                        {user?.name}
                      </p>
                      <span className="px-1.5 py-0.5 rounded bg-primary-fixed text-[#783200] text-[10px] font-semibold">
                        {user?.role === 'ADMIN' ? 'Admin' : 'Kasir'}
                      </span>
                    </div>
                    <p className="text-[12px] text-on-surface-variant truncate">
                      {user?.email}
                    </p>
                  </div>

                  {user?.role === 'ADMIN' && (
                    <button
                      type="button"
                      onClick={() => navigate('/dashboard')}
                      className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium text-on-surface hover:bg-surface-container transition-colors cursor-pointer text-left"
                    >
                      <LayoutDashboard className="w-4 h-4 text-on-surface-variant" />
                      <span>Ke Dashboard Admin</span>
                    </button>
                  )}

                  <div className="h-0.5 bg-[#dae2fd] my-1" />
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium text-[#ba1a1a] hover:bg-[#ffdad6]/40 transition-colors cursor-pointer text-left"
                  >
                    <LogOut className="w-4 h-4 text-[#ba1a1a]" />
                    <span>Keluar</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* KONTEN UTAMA POS */}
      <main className="w-full pt-16 bg-background">
        <div className="flex flex-col lg:flex-row w-full min-h-[calc(100vh-4rem)] bg-background text-on-surface">
          {/* PANEL KIRI: Katalog Menu & Filter Kategori (68%) */}
          <section className="flex-1 lg:w-[68%] p-6 flex flex-col gap-4">
            {/* Bar Kategori (Pills) */}
            <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3 rounded-xl shadow-xs">
              <div className="flex flex-wrap items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setSelectedCategory('ALL')}
                  className={`rounded-full px-4 py-2 text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
                    selectedCategory === 'ALL'
                      ? 'bg-primary-container text-white shadow-xs'
                      : 'bg-surface-container-low text-on-surface-variant hover:bg-surface-container'
                  }`}
                >
                  <span>Semua Menu</span>
                  <span
                    className={`px-1.5 py-0.5 rounded-full text-[11px] ${
                      selectedCategory === 'ALL'
                        ? 'bg-white/20 text-white'
                        : 'bg-[#e2e7ff] text-on-surface'
                    }`}
                  >
                    {products.length}
                  </span>
                </button>

                {categoryList.map((cat) => {
                  const count = products.filter(
                    (p) => p.categoryId === cat.id
                  ).length;
                  const isActive = selectedCategory === cat.id;
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setSelectedCategory(cat.id)}
                      className={`rounded-full px-4 py-2 text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
                        isActive
                          ? 'bg-primary-container text-white shadow-xs'
                          : 'bg-surface-container-low text-on-surface-variant hover:bg-surface-container'
                      }`}
                    >
                      <span>{cat.name}</span>
                      <span
                        className={`px-1.5 py-0.5 rounded-full text-[11px] ${
                          isActive
                            ? 'bg-white/20 text-white'
                            : 'bg-[#e2e7ff] text-on-surface'
                        }`}
                      >
                        {count}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Grid Katalog Menu: 4 Kolom */}
            {loading ? (
              <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3">
                {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
                  <div
                    key={n}
                    className="bg-white rounded-xl overflow-hidden shadow-xs p-3 space-y-3 animate-pulse"
                  >
                    <div className="aspect-square w-full bg-slate-200 rounded-lg" />
                    <div className="h-3 w-16 bg-slate-200 rounded" />
                    <div className="h-5 w-3/4 bg-slate-200 rounded" />
                    <div className="h-6 w-1/2 bg-slate-200 rounded" />
                  </div>
                ))}
              </div>
            ) : filteredProducts.length === 0 ? (
              <div className="bg-white rounded-xl p-12 text-center space-y-2 shadow-xs">
                <Coffee className="w-10 h-10 text-primary/40 mx-auto" />
                <p className="text-base font-semibold text-on-surface">
                  Menu tidak ditemukan
                </p>
                <p className="text-xs text-on-surface-variant">
                  Coba gunakan kata kunci pencarian atau kategori lain.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3">
                {filteredProducts.map((product) => {
                  const imgUrl = getImageUrl(
                    (product as Product & { image?: string | null }).image
                  );
                  const outOfStock = product.stock <= 0;

                  return (
                    <div
                      key={product.id}
                      className={`group bg-white rounded-xl overflow-hidden shadow-xs hover:shadow-md transition-all duration-200 flex flex-col relative ${
                        outOfStock
                          ? 'opacity-60'
                          : ''
                      }`}
                    >
                      <div className="relative aspect-square w-full bg-surface-container-low overflow-hidden flex items-center justify-center">
                        {imgUrl ? (
                          <img
                            src={imgUrl}
                            alt={product.name}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            onError={(e) => {
                              (e.currentTarget as HTMLImageElement).style.display =
                                'none';
                            }}
                          />
                        ) : (
                          <Coffee className="w-12 h-12 text-primary/30" />
                        )}

                        <div
                          className={`absolute top-2 right-2 backdrop-blur-xs px-2 py-0.5 rounded text-[11px] font-semibold ${
                            outOfStock
                              ? 'bg-red-600 text-white'
                              : 'bg-white/90 text-on-surface-variant'
                          }`}
                        >
                          {outOfStock ? 'Habis' : `Stok: ${product.stock}`}
                        </div>
                      </div>

                      <div className="p-3 flex flex-col flex-1 justify-between gap-1">
                        <div>
                          <p
                            className={`text-[11px] font-semibold uppercase tracking-wider ${getCategoryColorClass(
                              product.category?.name
                            )}`}
                          >
                            {product.category?.name || 'Menu'}
                          </p>
                          <h3 className="text-[17px] font-semibold text-on-surface truncate">
                            {product.name}
                          </h3>
                        </div>

                        <div className="flex items-center justify-between pt-1">
                          <span className="text-[19px] font-bold text-on-surface">
                            {formatRupiah(Number(product.price))}
                          </span>
                          <button
                            type="button"
                            disabled={outOfStock}
                            onClick={() => addToCart(product)}
                            aria-label={`Tambah ${product.name} ke keranjang`}
                            className="p-1.5 rounded-full bg-surface-container-low text-on-surface hover:bg-primary-container hover:text-white transition-colors cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            <Plus className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          {/* PANEL KANAN: Keranjang Kasir & Pembayaran (32%) */}
          <aside className="w-full lg:w-[32%] bg-white shadow-[-4px_0_16px_rgba(0,0,0,0.03)] flex flex-col justify-between lg:sticky lg:top-16 lg:h-[calc(100vh-4rem)]">
            <div className="p-4 flex flex-col gap-3 flex-1 overflow-y-auto">
              {/* Header & Nomor Invoice */}
              <div className="flex items-center justify-between pb-1">
                <div>
                  <h2 className="text-[20px] text-on-surface font-semibold leading-tight">
                    Pesanan Baru
                  </h2>
                  <p className="text-[11px] font-semibold text-on-surface-variant">
                    Kasir Standby
                  </p>
                </div>
                <div className="flex items-center gap-1.5 px-3 py-1 rounded bg-primary-fixed text-[#783200] text-[11px] font-semibold font-mono shadow-2xs">
                  <ReceiptText className="w-3.5 h-3.5" />
                  <span>{previewInvCode}</span>
                </div>
              </div>

              {/* Input Nama Pelanggan (Tanpa Pilih Meja) */}
              <div className="bg-surface-container-low p-3 rounded-xl space-y-1">
                <label className="text-[11px] text-on-surface-variant block font-semibold">
                  Nama Pelanggan
                </label>
                <div className="relative flex items-center">
                  <IdCard className="w-4 h-4 absolute left-3 text-on-surface-variant" />
                  <input
                    type="text"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="Pelanggan Umum"
                    className="w-full h-10 pl-9 pr-3 bg-white rounded-lg text-sm text-on-surface shadow-2xs focus:outline-none focus:ring-1 focus:ring-primary-container transition-all"
                  />
                </div>
              </div>

              {/* Daftar Item Keranjang */}
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between text-on-surface-variant text-[11px] font-semibold px-1">
                  <span>Daftar Menu Dipilih</span>
                  <span className="bg-[#e2e7ff] px-2 py-0.5 rounded text-on-surface font-semibold">
                    {cart.length} Produk ({totalItemsCount} Items)
                  </span>
                </div>

                {cart.length === 0 ? (
                  <div className="py-8 px-4 rounded-xl border border-dashed border-[#dae2fd] text-center space-y-1 bg-background">
                    <p className="text-xs font-semibold text-on-surface-variant">
                      Belum ada menu dipilih
                    </p>
                    <p className="text-[11px] text-on-surface-variant/70">
                      Klik kartu menu di sebelah kiri untuk menambahkan pesanan.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-1.5 max-h-60 overflow-y-auto pr-0.5">
                    {cart.map((item) => {
                      const thumbUrl = getImageUrl(
                        (item.product as Product & { image?: string | null }).image
                      );
                      const lineTotal =
                        Number(item.product.price) * item.quantity;

                      return (
                        <div
                          key={item.product.id}
                          className="flex items-center justify-between p-2 rounded-lg bg-surface-container-low hover:bg-surface-container transition-colors"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="w-11 h-11 rounded-lg bg-[#dae2fd] shrink-0 overflow-hidden flex items-center justify-center">
                              {thumbUrl ? (
                                <img
                                  src={thumbUrl}
                                  alt={item.product.name}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <Coffee className="w-5 h-5 text-primary" />
                              )}
                            </div>
                            <div className="min-w-0">
                              <h4 className="text-xs font-semibold text-on-surface truncate">
                                {item.product.name}
                              </h4>
                              <p className="text-[12px] text-on-surface-variant">
                                {formatRupiah(Number(item.product.price))}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2.5 shrink-0">
                            <div className="flex items-center bg-white rounded-md shadow-2xs p-0.5">
                              <button
                                type="button"
                                onClick={() =>
                                  decreaseFromCart(item.product.id)
                                }
                                className="w-6 h-6 flex items-center justify-center text-on-surface-variant hover:text-primary transition-colors cursor-pointer"
                              >
                                <Minus className="w-3.5 h-3.5" />
                              </button>
                              <span className="w-6 text-center text-xs font-semibold text-on-surface">
                                {item.quantity}
                              </span>
                              <button
                                type="button"
                                onClick={() => addToCart(item.product)}
                                className="w-6 h-6 flex items-center justify-center text-on-surface-variant hover:text-primary transition-colors cursor-pointer"
                              >
                                <Plus className="w-3.5 h-3.5" />
                              </button>
                            </div>
                            <span className="text-xs text-on-surface font-bold w-20 text-right">
                              {formatRupiah(lineTotal)}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Tombol Pilihan Metode Pembayaran */}
              <div className="space-y-1 pt-1">
                <label className="text-[11px] text-on-surface-variant block font-semibold">
                  Metode Pembayaran
                </label>
                <div className="grid grid-cols-2 gap-1.5">
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('CASH')}
                    className={`flex items-center justify-center gap-2 p-3 rounded-xl text-sm font-semibold transition-all cursor-pointer ${
                      paymentMethod === 'CASH'
                        ? 'bg-primary-fixed/80 text-[#341100] shadow-xs ring-1 ring-primary-container'
                        : 'bg-surface-container-low text-on-surface-variant hover:bg-surface-container'
                    }`}
                  >
                    <Banknote className="w-5 h-5 text-primary" />
                    <span>Tunai</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('MIDTRANS')}
                    className={`flex items-center justify-center gap-2 p-3 rounded-xl text-sm font-semibold transition-all cursor-pointer ${
                      paymentMethod === 'MIDTRANS'
                        ? 'bg-primary-fixed/80 text-[#341100] shadow-xs ring-1 ring-primary-container'
                        : 'bg-surface-container-low text-on-surface-variant hover:bg-surface-container'
                    }`}
                  >
                    <QrCode className="w-5 h-5 text-primary" />
                    <span>QRIS</span>
                  </button>
                </div>
              </div>

              {/* Kotak Kalkulasi Uang Tunai & Rincian Tagihan */}
              <div className="bg-surface-container-low p-3 rounded-xl space-y-2.5 shadow-2xs">
                {paymentMethod === 'CASH' ? (
                  <>
                    <div>
                      <label className="text-[11px] font-semibold text-on-surface-variant block mb-1">
                        Uang Diterima (Rp)
                      </label>
                      <div className="relative flex items-center">
                        <span className="absolute left-3 text-sm font-semibold text-on-surface-variant">
                          Rp
                        </span>
                        <input
                          type="text"
                          value={cashInput}
                          onChange={handleCashInputChange}
                          placeholder="0"
                          className="w-full h-11 pl-10 pr-3 bg-white rounded-lg text-[20px] font-bold text-on-surface shadow-2xs focus:outline-none focus:ring-1 focus:ring-primary-container"
                        />
                      </div>
                    </div>

                    {/* Tombol Cepat Nominal Uang */}
                    <div className="flex items-center gap-1.5 pt-0.5">
                      <button
                        type="button"
                        onClick={() => handleSetQuickCash(subtotal)}
                        className={`flex-1 py-1.5 px-2 rounded text-[11px] font-semibold shadow-2xs transition-colors cursor-pointer ${
                          numericCash === subtotal && subtotal > 0
                            ? 'bg-primary-fixed text-[#341100]'
                            : 'bg-white text-on-surface-variant hover:bg-surface-container'
                        }`}
                      >
                        Pas ({subtotal > 0 ? `${subtotal / 1000}k` : '0'})
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSetQuickCash(50000)}
                        className={`flex-1 py-1.5 px-2 rounded text-[11px] font-semibold shadow-2xs transition-colors cursor-pointer ${
                          numericCash === 50000
                            ? 'bg-primary-fixed text-[#341100]'
                            : 'bg-white text-on-surface-variant hover:bg-surface-container'
                        }`}
                      >
                        50.000
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSetQuickCash(100000)}
                        className={`flex-1 py-1.5 px-2 rounded text-[11px] font-semibold shadow-2xs transition-colors cursor-pointer ${
                          numericCash === 100000
                            ? 'bg-primary-fixed text-[#341100]'
                            : 'bg-white text-on-surface-variant hover:bg-surface-container'
                        }`}
                      >
                        100.000
                      </button>
                    </div>
                  </>
                ) : (
                  <div className="p-2.5 rounded-lg bg-white text-xs text-on-surface-variant flex items-center gap-2">
                    <QrCode className="w-5 h-5 text-primary-container shrink-0" />
                    <span>
                      Pembayaran non-tunai via <strong>QRIS</strong>{' '}
                      sesuai nominal tagihan.
                    </span>
                  </div>
                )}

                {/* Rincian Subtotal, Pajak, Total & Kembalian */}
                <div className="pt-1 space-y-1.5">
                  <div className="flex justify-between items-center text-[13px] text-on-surface-variant">
                    <span>Subtotal</span>
                    <span className="font-medium text-on-surface">
                      {formatRupiah(subtotal)}
                    </span>
                  </div>
                  <div className="h-0.5 w-full bg-[#dae2fd] my-1" />
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-on-surface font-semibold">
                      Total Tagihan
                    </span>
                    <span className="text-primary text-[18px] font-bold">
                      {formatRupiah(subtotal)}
                    </span>
                  </div>

                  {paymentMethod === 'CASH' && (
                    <div className="flex items-center justify-between p-2 rounded-lg bg-[#6cf8bb]/25 text-[#00714d] mt-1">
                      <div className="flex items-center gap-1.5">
                        <PiggyBank className="w-4 h-4 text-[#006c49]" />
                        <span className="text-xs font-semibold">Kembalian</span>
                      </div>
                      <span className="text-[16px] font-bold text-[#006c49]">
                        {formatRupiah(changeAmount)}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {errorMsg && (
                <div className="p-2.5 rounded-lg bg-[#ffdad6] text-[#93000a] text-xs font-medium">
                  {errorMsg}
                </div>
              )}
            </div>

            {/* Tombol Bawah: Proses Pembayaran */}
            <div className="p-3 border-t border-[#dae2fd] bg-white shadow-[0_-4px_12px_rgba(0,0,0,0.03)]">
              <button
                type="button"
                disabled={submitting || cart.length === 0}
                onClick={handleCheckout}
                className="w-full h-12 px-4 bg-primary-container hover:bg-primary disabled:opacity-50 text-white rounded-xl shadow-xs flex items-center justify-between transition-all duration-150 cursor-pointer active:scale-[0.99] group"
              >
                <div className="flex items-center gap-2">
                  <Banknote className="w-5 h-5 transition-transform group-hover:scale-105" />
                  <span className="font-semibold text-sm">
                    {submitting ? 'Memproses...' : 'Proses Pembayaran'}
                  </span>
                </div>
                <span className="px-2.5 py-1 rounded-lg bg-white/20 text-white text-sm font-bold tracking-tight">
                  {formatRupiah(subtotal)}
                </span>
              </button>
            </div>
          </aside>
        </div>

        {/* MODAL PRATINJAU STRUK THERMAL (Desain Google Stitch) */}
        {completedOrder && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-on-surface/40 backdrop-blur-xs">
            <div className="bg-white w-full max-w-md rounded-2xl shadow-xl overflow-hidden flex flex-col">
              <div className="p-6 flex flex-col gap-4 max-h-[80vh] overflow-y-auto">
                {/* Header Cafe Logo & Info */}
                <div className="text-center space-y-1">
                  <div className="w-12 h-12 mx-auto rounded-full bg-primary-fixed flex items-center justify-center mb-1">
                    <Coffee className="w-6 h-6 text-primary" />
                  </div>
                  <h3 className="text-[22px] font-semibold text-on-surface tracking-tight">
                    D'Cafein Coffee &amp; Eatery
                  </h3>
                  <p className="text-xs text-on-surface-variant">
                    Jl. Senopati No. 42, Kebayoran Baru, Jakarta Selatan
                  </p>
                  <p className="text-[11px] font-semibold text-on-surface-variant">
                    WhatsApp: 0812-9988-7766
                  </p>
                </div>

                <div className="h-0.5 w-full bg-[#dae2fd]" />

                {/* Informasi Transaksi */}
                <div className="grid grid-cols-2 gap-y-1 text-xs text-on-surface-variant">
                  <div>
                    <span className="text-on-surface-variant/70">No. Struk:</span>{' '}
                    <strong className="text-on-surface font-mono">
                      {completedOrder.orderNumber}
                    </strong>
                  </div>
                  <div className="text-right">
                    <span className="text-on-surface-variant/70">Waktu:</span>{' '}
                    {formatDateTime(completedOrder.createdAt)}
                  </div>
                  <div>
                    <span className="text-on-surface-variant/70">Kasir:</span>{' '}
                    {completedOrder.cashier?.name || user?.name || 'Kasir'}
                  </div>
                  <div className="text-right">
                    <span className="text-on-surface-variant/70">Pelanggan:</span>{' '}
                    {completedOrder.customerName || 'Pelanggan Umum'}
                  </div>
                </div>

                <div className="h-0.5 w-full bg-[#dae2fd]" />

                {/* Daftar Item yang Dibeli */}
                <div className="space-y-2 py-1">
                  {completedOrder.items?.map((item) => {
                    const itemPrice = Number(
                      (item as { priceAtTime?: number }).priceAtTime ??
                      item.priceAtTime ??
                      (item.product as { id?: string; name: string; imageUrl?: string | null; price?: number } | undefined)?.price ??
                      0
                    );

                    return (
                      <div
                        key={item.id}
                        className="flex justify-between items-start text-sm"
                      >
                        <div>
                          <p className="font-medium text-on-surface">
                            {item.quantity}x {item.product?.name || 'Menu'}
                          </p>
                          <p className="text-xs text-on-surface-variant">
                            @ {formatRupiah(itemPrice)}
                          </p>
                        </div>
                        <span className="text-sm text-on-surface font-semibold">
                          {formatRupiah(itemPrice * item.quantity)}
                        </span>
                      </div>
                    );
                  })}
                </div>

                {/* Rincian Pembayaran */}
                <div className="space-y-1.5 text-xs">
                  <div className="flex justify-between text-on-surface-variant">
                    <span>Metode Bayar</span>
                    <span className="font-semibold text-on-surface">
                      {completedOrder.paymentMethod === 'CASH'
                        ? 'Tunai (CASH)'
                        : 'QRIS (MIDTRANS)'}
                    </span>
                  </div>
                  <div className="flex justify-between text-on-surface-variant">
                    <span>Status Pembayaran</span>
                    <span
                      className={`font-semibold ${
                        completedOrder.paymentStatus === 'PAID'
                          ? 'text-[#006c49]'
                          : 'text-amber-600'
                      }`}
                    >
                      {completedOrder.paymentStatus}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-on-surface-variant">
                    <span>Total Tagihan</span>
                    <span className="text-[18px] font-bold text-on-surface">
                      {formatRupiah(Number(completedOrder.totalAmount))}
                    </span>
                  </div>
                  {completedOrder.paymentMethod === 'CASH' && (
                    <>
                      <div className="flex justify-between text-on-surface-variant">
                        <span>Uang Diterima</span>
                        <span className="text-on-surface">
                          {formatRupiah(
                            Number(
                              completedOrder.amountPaid ??
                                completedOrder.totalAmount
                            )
                          )}
                        </span>
                      </div>
                      <div className="flex justify-between items-center bg-[#6cf8bb]/25 p-2 rounded-lg text-[#00714d]">
                        <span className="font-semibold">Kembalian</span>
                        <span className="text-base font-bold text-[#006c49]">
                          {formatRupiah(
                            Number(completedOrder.changeAmount ?? 0)
                          )}
                        </span>
                      </div>
                    </>
                  )}
                </div>

                {/* Jika QRIS masih PENDING, tampilkan tombol simulasi konfirmasi lunas */}
                {completedOrder.paymentStatus === 'PENDING' && (
                  <button
                    type="button"
                    onClick={() => handleConfirmMidtransPaid(completedOrder.id)}
                    className="w-full py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <BadgeCheck className="w-4 h-4" />
                    <span>Konfirmasi Pembayaran QRIS Lunas (PAID)</span>
                  </button>
                )}

                <div className="text-center pt-1 space-y-0.5">
                  <p className="text-xs text-on-surface font-semibold">
                    Terima kasih atas kunjungan Anda!
                  </p>
                  <p className="text-[11px] text-on-surface-variant">
                    Silakan berkunjung kembali dan selamat menikmati kopi Anda.
                  </p>
                </div>
              </div>

              {/* Tombol Bawah Modal */}
              <div className="p-4 bg-surface-container-low flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setCompletedOrder(null)}
                  className="px-4 py-2.5 rounded-xl bg-white text-on-surface hover:bg-surface-container text-xs font-semibold transition-colors cursor-pointer"
                >
                  Tutup
                </button>
                <button
                  type="button"
                  onClick={() => handleTriggerDownloadPdf(completedOrder)}
                  className="px-4 py-2.5 rounded-xl bg-primary-container hover:bg-primary text-white text-xs font-semibold shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  {downloadingPdf ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Mengunduh...</span>
                    </>
                  ) : (
                    <>
                      <Download className="w-4 h-4" />
                      <span>Download Struk (PDF)</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* MODAL RIWAYAT TRANSAKSI */}
        {historyOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-on-surface/40 backdrop-blur-xs">
            <div className="bg-white w-full max-w-2xl rounded-2xl shadow-xl overflow-hidden flex flex-col max-h-[85vh]">
              <div className="px-6 py-4 border-b border-[#dae2fd] flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ReceiptText className="w-5 h-5 text-primary-container" />
                  <h3 className="text-base font-bold text-on-surface">
                    Riwayat Transaksi Kasir
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setHistoryOpen(false)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 overflow-y-auto space-y-3">
                {loadingHistory ? (
                  <p className="text-center text-xs text-on-surface-variant py-8">
                    Memuat riwayat transaksi...
                  </p>
                ) : ordersHistory.length === 0 ? (
                  <p className="text-center text-xs text-on-surface-variant py-8">
                    Belum ada riwayat transaksi.
                  </p>
                ) : (
                  ordersHistory.map((ord) => (
                    <div
                      key={ord.id}
                      className="p-3.5 rounded-xl border border-[#dae2fd] bg-background flex flex-wrap items-center justify-between gap-3"
                    >
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-bold text-on-surface">
                            {ord.orderNumber}
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                              ord.paymentStatus === 'PAID'
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-amber-100 text-amber-800'
                            }`}
                          >
                            {ord.paymentStatus}
                          </span>
                          <span className="text-[11px] text-on-surface-variant">
                            • {ord.paymentMethod}
                          </span>
                        </div>
                        <p className="text-xs text-on-surface-variant">
                          Pelanggan: <strong>{ord.customerName || 'Umum'}</strong> •{' '}
                          {formatDateTime(ord.createdAt)}
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-primary mr-2">
                          {formatRupiah(Number(ord.totalAmount))}
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            setHistoryOpen(false);
                            setCompletedOrder(ord);
                          }}
                          className="px-3 py-1.5 rounded-lg bg-primary-fixed text-[#783200] hover:bg-primary-container hover:text-white text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Lihat Struk</span>
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

