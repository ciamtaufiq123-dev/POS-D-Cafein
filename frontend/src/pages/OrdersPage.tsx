import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { 
    Coffee,
    TrendingUp,
    Package,
    ReceiptText,
    Store,
    ChevronRight,
    ChevronLeft,
    Calendar,
    User,
    ChevronDown,
    UserCircle,
    Settings,
    LogOut,
    Search,
    X,
    SlidersHorizontal,
    Download,
    RotateCcw,
    Filter,
    Eye,
    Printer,
    QrCode,
    Banknote,
    CheckCircle2,
    AlertTriangle,
    FileText,
} from 'lucide-react'
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import type { Order } from '../types/index';

interface NormalizedOrderItem {
    id: string;
    name: string;
    quantity: number;
    price: number;
    subtotal: number;
}

interface NormalizedOrder {
    raw: Order;
    id: string;
    invoice: string;
    createdAt: Date;
    customerName: string;
    cashierName: string;
    paymentMethod: 'QRIS' | 'CASH';
    paymentLabel: string;
    totalAmount: number;
    status: 'PAID' | 'PENDING' | 'CANCELLED';
    items: NormalizedOrderItem[];
}

const normalizeOrder = (order: Order): NormalizedOrder => {
    const o = order as unknown as Record<string, unknown>;

    const id = String(o.id ?? '');
    const invoice = String(
        o.invoiceNumber ?? o.orderNumber ?? o.code ?? `TRX-${id.slice(0, 8).toUpperCase()}`
    );
    const createdAt = o.createdAt ? new Date(String(o.createdAt)) : new Date();

    const userObj = (o.user ?? o.cashier ?? null) as Record<string, unknown> | null;
    const cashierName = String(
        userObj?.name ?? o.cashierName ?? "Kasir D'Cafein"
    );
    const customerName = String(o.customerName ?? "Pelanggan Umum");

    const rawMethod = String(o.paymentMethod ?? o.paymentType ?? 'CASH').toUpperCase();
    const isQris = rawMethod.includes('QRIS') || rawMethod.includes('MIDTRANS');
    const paymentMethod: 'QRIS' | 'CASH' = isQris ? 'QRIS' : 'CASH';
    const paymentLabel = isQris ? 'QRIS' : 'Tunai / Cash';

    const rawStatus = String(o.status ?? o.paymentStatus ?? 'PAID').toUpperCase();
    let status: 'PAID' | 'PENDING' | 'CANCELLED' = 'PAID';
    if (rawStatus.includes('CANCEL') || rawStatus.includes('REFUND') || rawStatus.includes("FAIL")) {
        status = 'CANCELLED';
    } else if (rawStatus.includes('PEND') || rawStatus.includes('WAIT')) {
        status = 'PENDING'
    }

    const rawItems = (Array.isArray(o.items) 
    ? o.items 
    : Array.isArray(o.orderITems) 
        ? o.orderItems 
        : []) as Array<Record<string, unknown>>;

    const items: NormalizedOrderItem[] = rawItems.map((item, idx) => {
        const productObj = (item.product ?? null) as Record<string, unknown> | null;
        const quantity = Number(item.quantity ?? item.qty ?? 1);
        const price = Number(item.price ?? productObj?.price?? 0);
        const subtotal = Number(item.subtotal ?? price * quantity);
        return {
            id: String(item.id ?? idx),
            name: String(productObj?.name ?? item.productName ?? item.name ?? 'Menu'),
            quantity,
            price,
            subtotal,
        };
    });

    const computedTotal = items.reduce((acc, item) => acc + item.subtotal, 0);
    const totalAmount = Number(o.totalAmount ?? o.total ?? o.grandTotal ?? computedTotal);

    return {
        raw: order,
        id,
        invoice,
        createdAt,
        customerName,
        cashierName,
        paymentMethod,
        paymentLabel,
        totalAmount,
        status,
        items,
    };
};

export const OrdersPage: React.FC = () => {
    const navigate = useNavigate();
    const { user, logout } = useAuth();

    const [rawOrders, setRawOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [profileOpen, setProfileOpen] = useState<boolean>(false);
    const [searchQuery, setSearchQuery] = useState<string>('');
    const [paymentFilter, setPaymentFilter] = useState<string>('all');
    const [showAdvancedFilter, setShowAdvancedFilter] = useState<boolean>(false);
    const [minPrice, setMinPrice] = useState<string>('');
    const [maxPrice, setMaxPrice] = useState<string>('');
    const [shiftFilter, setShiftFilter] = useState<string>('all')
    const [dateFilter, setDateFilter] = useState<string>('');
    const [currentPage, setCurrentPage] = useState<number>(1)
    const itemsPerPage = 7;
    const [selectedOrder, setSelectedOrder] = useState<NormalizedOrder | null>(null);
    const [toast, setToast] = useState<{
        message: string;
        type: 'success' | 'error';
    } | null>(null);
    const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const showToast = (message: string, type: 'success' | 'error' = 'success') => {
        if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
        setToast({ message, type });
        toastTimerRef.current = setTimeout(() => {
            setToast(null);
        }, 3000);
    };

    const fetchOrders = async () => {
        try {
            setLoading(true)
            const res = await api.get('/orders');
            const list: Order[] = res.data?.data || res.data || [];
            setRawOrders(list);
        } catch (err) {
            console.error('Gagal memuat riwayat transaksi:', err);
            showToast('Gagal memuat riwayat transaksi', 'error');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        fetchOrders();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const handleLogout = () => {
        logout()
        navigate('/login', { replace: true });
    };

    const todayFormatted = useMemo(() => {
        return new Intl.DateTimeFormat('id-ID', {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
            year: 'numeric'
        }).format(new Date())
    }, []);

    const formatRupiah = (num: number) => {
        return new Intl.NumberFormat('id-ID', {
            style: 'currency',
            currency: 'IDR',
            minimumFractionDigits: 0,
        }).format(num || 0);
    };

    const formatNumber = (num: number) => {
        return new Intl.NumberFormat('id-ID').format(num | 0);
    }

    const formatTime = (date: Date) => {
        return (
            new Intl.DateTimeFormat('id-ID', {
                hour: '2-digit',
                minute: '2-digit',
                hour12: false,
            }).format(date) + ' WIB'
        );
    };

    const formatDate = (date: Date) => {
        return new Intl.DateTimeFormat('id-ID', {
            day: '2-digit',
            month: 'short',
            year: 'numeric'
        }).format(date);
    }

    const orders = useMemo(() => {
        return rawOrders
            .map(normalizeOrder)
            .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    }, [rawOrders]);

    const filteredOrders = useMemo(() => {
        const q = searchQuery.trim().toLowerCase();
        const minVal = minPrice ? Number(minPrice.replace(/[^0-9]/g, '')) : null;
        const maxVal = maxPrice ? Number(maxPrice.replace(/[^0-9]/g, '')) : null;

        return orders.filter((order) => {
            const itemNames = order.items.map((i) => i.name.toLowerCase()).join(' ');
            const matchSearch =
                !q ||
                order.invoice.toLowerCase().includes(q) ||
                order.customerName.toLowerCase().includes(q) ||
                order.cashierName.toLowerCase().includes(q) ||
                itemNames.includes(q)

            const matchPayment =
            paymentFilter === 'all' ||
            (paymentFilter === 'QRIS' && order.paymentMethod === 'QRIS') ||
            (paymentFilter === 'CASH' && order.paymentMethod === 'CASH');

            const matchMin = minVal === null || isNaN(minVal) || order.totalAmount >= minVal;
            const matchMax = maxVal === null || isNaN(maxVal) || order.totalAmount <= maxVal;

            const hour = order.createdAt.getHours();
            const matchShift =
                shiftFilter === 'all' ||
                (shiftFilter === 'pagi' && hour >= 7 && hour < 15) ||
                (shiftFilter === 'sore' && (hour >= 15 || hour < 7));

            let matchDate = true;
            if (dateFilter) {
                const yyyy = order.createdAt.getFullYear();
                const mm = String(order.createdAt.getMonth() + 1).padStart(2, '0');
                const dd = String(order.createdAt.getDate()).padStart(2, '0');
                matchDate = `${yyyy}-${mm}-${dd}` === dateFilter;
            }

            return matchSearch && matchPayment && matchMin && matchMax && matchShift && matchDate;
        });
    }, [orders, searchQuery, paymentFilter, minPrice, maxPrice, shiftFilter, dateFilter]);

    const kpi = useMemo(() => {
        const totalCount = filteredOrders.length;
        const totalRevenue = filteredOrders
            .filter((o) => o.status !== 'CANCELLED')
            .reduce((sum, o) => sum + o.totalAmount, 0);
        return { totalCount, totalRevenue };
    }, [filteredOrders]);

    const totalPages = Math.max(1, Math.ceil(filteredOrders.length / itemsPerPage));
    const safeCurrentPage = Math.min(currentPage, totalPages);

    const paginationOrders = useMemo(() => {
        const start = (safeCurrentPage - 1) * itemsPerPage;
        return filteredOrders.slice(start, start + itemsPerPage);
    }, [filteredOrders, safeCurrentPage]);

    const handleResetFilters = () => {
        setSearchQuery('');
        setPaymentFilter('all');
        setMinPrice('');
        setMaxPrice('');
        setShiftFilter('all');
        setDateFilter('');
        setCurrentPage(1);
        showToast('Semua filter berhasil di reset', 'success');
    };

    const getItemSummary = (items: NormalizedOrderItem[]) => {
        if (items.length === 0) return '0 Item';
        const totalQty = items.reduce((sum, i) => sum + i.quantity, 0);
        const names = items.slice(0, 2).map((i) => i.name).join(', ');
        const extra = items.length > 2 ? ` +${items.length -2} lainnya` : '';
        return `${totalQty} Item (${names}${extra})`;
    };

    const handleExportCsv = () => {
        if (filteredOrders.length === 0) {
            showToast('Tidak ada data transaksi untuk diekspor', 'error');
            return;
        }

        const headers = [
            'No. Transaksi',
            'Tanggal',
            'Waktu',
            'Pelanggan',
            'Kasir',
            'Metode Pembayaran',
            'Status',
            'Ringhkasan Item',
            'Total Transaksi (IDR)',
        ];

        const rows = filteredOrders.map((o) => [
            o.invoice,
            formatDate(o.createdAt),
            formatTime(o.createdAt),
            o.customerName,
            o.cashierName,
            o.paymentLabel,
            o.status,
            getItemSummary(o.items),
            o.totalAmount,
        ]);

        const csvContent =
            '\uFEFF' +
            [headers, ...rows]
                .map((row) => 
                    row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')
                )
                .join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;chartset=utf-8;' });
        const url = URL .createObjectURL(blob);
        const link = document.createElement('a');
        const todayStr = new Date().toISOString().slice(0, 10);
        link.href = url;
        link.download = `Laporan_Transaksi_D'Cafein_${todayStr}.csv`;
        document.body.appendChild(link);
        link.click();

        setTimeout(() => {
            link.remove();
            URL.revokeObjectURL(url);
        }, 150);

        showToast(
            `Berhasil mengekspor ${filteredOrders.length} transaksi ke CSV.`,
            'success'
        );

        showToast(`Berhasil mengekspor ${filteredOrders.length} transaksi ke CSV.`, 'success');
    };

    const handlePrintReceipt = (order: NormalizedOrder) => {
        const printWindow = window.open('', '_blank', 'width=380,height=640');
        if (!printWindow) {
            showToast('Pop-up diblokir browser. Izinkan pop-up untuk mencetak struk.', 'error');
            return;
        }

        const itemsHtml = order.items
            .map(
                (item) => `
                <tr>
                <td style="padding: 4px 0;">
                    <div style="font-weight:600;">${item.quantity}x ${item.name}</div>
                    <div style="font-size:11px;color:#555;">@ ${formatRupiah(item.price)}</div>
                </td>
                <td style="text-align:right;vertical-align:top;padding:4px 0;font-weight:600;">
                    ${formatRupiah(item.subtotal)}
                </td>
                </tr>
            `
            )
            .join('');

        printWindow.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>Struk ${order.invoice}</title>
                <style>
                body {
                    font-family: 'Courier New', monospace;
                    width: 300px;
                    margin: 0 auto;
                    padding: 16px;
                    color: #111;
                    font-size: 12px;
                }   
                .center { text-align: center; }
                .divider { border-top: 1px dashed #333; margin: 10px 0; }
                table { width: 100%; border-collapse: collapse; }
                .row { display: flex; justify-content: space-between; margin: 3px 0; }
                .total { font-size: 15px; font-weight: bold; }
                @media print {
                    body { width: 100%; padding: 0; }
                }
                </style>
            </head>
            <body>
                <div class="center">
                    <h2 style="margin:0;font-size:18px;">D'Cafein Roastery</h2>
                    <p style="margin:4px 0 0;font-size:11px;">Point of Sale Receipt</p>
                </div>
                <div class="divider"></div>
                <div class="row"><span>Invoice</span><strong>${order.invoice}</strong></div>
                <div class="row"><span>Tanggal</span><span>${formatDate(order.createdAt)} ${formatTime(order.createdAt)}</span></div>
                <div class="row"><span>Kasir</span><span>${order.cashierName}</span></div>
                <div class="row"><span>Pelanggan</span><span>${order.customerName}</span></div>
                <div class="divider"></div>
                <table>
                    <tbody>${itemsHtml}</tbody>
                </table>
                <div class="divider"></div>
                <div class="row total">
                    <span>TOTAL</span>
                    <span>${formatRupiah(order.totalAmount)}</span>
                </div>
                <div class="row">
                    <span>Metode</span>
                    <span>${order.paymentLabel} (${order.status})</span>
                </div>
                <div class="divider"></div>
                <div class="center" style="margin-top:12px;font-size:11px;">
                    Terima kasih telah berkunjung ke D'Cafein!<br/>
                    Simpan struk ini sebagai bukti pembayaran.
                </div>
                <script>
                    window.onload = function() {
                    window.print();
                    window.onafterprint = function() { window.close(); };
                };
                </script>
            </body>
            </html>
        `);
    printWindow.document.close();
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
                className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm text-on-surface-variant hover:bg-surface-container hover:text-on-surface transition-colors"
              >
                <Package className="w-4 h-4" />
                <span>Kelola Produk (CRUD)</span>
              </Link>
              <Link
                to="/orders"
                className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm bg-primary-fixed/50 text-primary-container font-semibold transition-colors"
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

      {/* Wrapper Kanan */}
      <div className="pl-60 min-h-screen flex flex-col">
        {/* Header Atas */}
        <header className="fixed top-0 left-60 right-0 h-16 bg-white border-b border-outline-variant/40 z-40 px-6 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-medium text-on-surface-variant">
            <ReceiptText className="w-4 h-4" />
            <span>Admin</span>
            <ChevronRight className="w-3.5 h-3.5" />
            <span className="text-on-surface font-semibold">Riwayat Transaksi</span>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5 text-on-surface-variant text-xs">
              <Calendar className="w-4 h-4" />
              <span>{todayFormatted}</span>
            </div>

            <div className="h-4 w-px bg-outline-variant/40" />

            {/* Profile Dropdown */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setProfileOpen((prev) => !prev)}
                className="flex items-center gap-2 p-1 pl-2 pr-2.5 rounded-full bg-surface-container-low hover:bg-surface-container transition-colors focus:outline-none cursor-pointer"
              >
                <div className="w-8 h-8 rounded-full bg-primary-container flex items-center justify-center text-white">
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
                <div className="absolute right-0 top-full mt-2 w-60 bg-white rounded-xl shadow-xl border border-slate-100 z-50 p-2 flex flex-col">
                  <div className="px-2.5 py-2 flex flex-col gap-0.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm text-on-surface font-semibold truncate">
                        {user?.name || "Admin D'Cafein"}
                      </span>
                      <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-primary-fixed text-[#783200] uppercase tracking-wider font-semibold shrink-0">
                        Owner
                      </span>
                    </div>
                    <span className="text-xs text-on-surface-variant truncate">
                      {user?.email || 'admin@dcafein.com'}
                    </span>
                  </div>
                  <div className="h-px bg-slate-100 my-1" />
                  <button
                    type="button"
                    onClick={() => setProfileOpen(false)}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-on-surface hover:bg-slate-50 transition-colors text-left cursor-pointer"
                  >
                    <UserCircle className="w-4 h-4 text-on-surface-variant" />
                    <span>Profil Saya</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setProfileOpen(false)}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-on-surface hover:bg-slate-50 transition-colors text-left cursor-pointer"
                  >
                    <Settings className="w-4 h-4 text-on-surface-variant" />
                    <span>Pengaturan Akun</span>
                  </button>
                  <div className="h-px bg-slate-100 my-1" />
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-[#ba1a1a] hover:bg-[#ffdad6]/40 transition-colors text-left font-medium cursor-pointer"
                  >
                    <LogOut className="w-4 h-4 text-[#ba1a1a]" />
                    <span>Keluar</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Konten Utama */}
        <main className="flex-1 pt-22 px-6 pb-8 w-full">
          <div className="flex flex-col w-full gap-5">
            {/* Hero & Action Toolbar */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2.5">
                  <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-primary-fixed/70 text-primary-container">
                    <ReceiptText className="w-4 h-4" />
                  </span>
                  <h1 className="text-2xl font-bold text-on-surface tracking-tight">
                    Riwayat &amp; Laporan Transaksi
                  </h1>
                </div>
                <p className="text-sm text-on-surface-variant max-w-2xl">
                  Pantau seluruh rekaman transaksi kasir, status pembayaran, audit omzet harian, dan cetak ulang struk pelanggan.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => setShowAdvancedFilter((prev) => !prev)}
                  className={`inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-colors shadow-xs border cursor-pointer ${
                    showAdvancedFilter
                      ? 'bg-primary-fixed/40 text-primary border-primary-container/40'
                      : 'bg-white text-on-surface-variant border-slate-100 hover:bg-surface-container hover:text-on-surface'
                  }`}
                >
                  <SlidersHorizontal className="w-4 h-4" />
                  <span>Filter Lanjutan</span>
                </button>

                <button
                  type="button"
                  onClick={handleExportCsv}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary-container text-white hover:opacity-95 active:scale-[0.98] transition-all shadow-xs text-xs font-semibold cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  <span>Export Excel / CSV</span>
                </button>
              </div>
            </div>

            {/* KPI Banner (2 Kartu) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="relative overflow-hidden bg-white rounded-xl p-5 shadow-xs border border-slate-100 flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-on-surface-variant font-semibold">
                    Total Transaksi
                  </span>
                  <div className="w-9 h-9 rounded-xl bg-surface-container-low flex items-center justify-center text-primary-container">
                    <Store className="w-4 h-4" />
                  </div>
                </div>
                <div className="mt-3">
                  <span className="text-3xl font-bold text-on-surface tracking-tight">
                    {formatNumber(kpi.totalCount)}
                  </span>
                </div>
                <div className="absolute bottom-0 left-0 right-0 h-1 bg-primary-container/25" />
              </div>

              <div className="relative overflow-hidden bg-white rounded-xl p-5 shadow-xs border border-slate-100 flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-on-surface-variant font-semibold">
                    Total Omzet Masuk
                  </span>
                  <div className="w-9 h-9 rounded-xl bg-secondary-fixed/45 flex items-center justify-center text-[#006c49]">
                    <Banknote className="w-4 h-4" />
                  </div>
                </div>
                <div className="mt-3 flex items-baseline gap-1.5">
                  <span className="text-sm font-bold text-[#006c49]">Rp</span>
                  <span className="text-3xl font-bold text-on-surface tracking-tight">
                    {formatNumber(kpi.totalRevenue)}
                  </span>
                </div>
                <div className="absolute bottom-0 left-0 right-0 h-1 bg-[#006c49]/30" />
              </div>
            </div>

            {/* Search & Quick Filters Bar */}
            <div className="bg-white rounded-xl p-3.5 shadow-xs border border-slate-100 flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
              <div className="relative flex-1 max-w-lg">
                <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-on-surface-variant" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setCurrentPage(1);
                  }}
                  placeholder="Cari ID transaksi, nama pelanggan, kasir, atau menu..."
                  className="w-full pl-10 pr-9 py-2.5 rounded-xl bg-surface-container-low text-sm text-on-surface placeholder:text-on-surface-variant/70 focus:outline-none focus:bg-white focus:ring-2 focus:ring-primary-container/30 transition-all"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchQuery('');
                      setCurrentPage(1);
                    }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-on-surface cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <div className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-surface-container-low text-xs">
                  <span className="text-on-surface-variant font-medium">Metode:</span>
                  <select
                    value={paymentFilter}
                    onChange={(e) => {
                      setPaymentFilter(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="bg-transparent font-semibold text-on-surface focus:outline-none cursor-pointer"
                  >
                    <option value="all">Semua Metode</option>
                    <option value="TUNAI">Tunai (Cash)</option>
                    <option value="QRIS">QRIS</option>
                  </select>
                </div>

                <button
                  type="button"
                  onClick={handleResetFilters}
                  title="Reset Semua Filter"
                  className="p-2.5 rounded-xl bg-surface-container-low text-on-surface-variant hover:text-primary-container hover:bg-surface-container transition-colors cursor-pointer"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Panel Filter Lanjutan (Toggleable) */}
            {showAdvancedFilter && (
              <div className="bg-white rounded-xl p-5 shadow-xs border border-slate-100 -mt-2 flex flex-col gap-4">
                <div className="flex items-center justify-between pb-2.5 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <Filter className="w-4 h-4 text-primary-container" />
                    <span className="text-xs font-bold text-on-surface">
                      Parameter Pencarian Spesifik
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowAdvancedFilter(false)}
                    className="text-on-surface-variant hover:text-on-surface cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[11px] font-semibold text-on-surface-variant uppercase tracking-wider">
                      Rentang Nominal Harga
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min={0}
                        value={minPrice}
                        onChange={(e) => {
                          setMinPrice(e.target.value);
                          setCurrentPage(1);
                        }}
                        placeholder="Min Rp 0"
                        className="w-full px-3 py-2 rounded-lg bg-surface-container-low text-xs text-on-surface focus:outline-none focus:bg-white focus:ring-1 focus:ring-primary-container"
                      />
                      <span className="text-on-surface-variant">-</span>
                      <input
                        type="number"
                        min={0}
                        value={maxPrice}
                        onChange={(e) => {
                          setMaxPrice(e.target.value);
                          setCurrentPage(1);
                        }}
                        placeholder="Maks Rp 500000"
                        className="w-full px-3 py-2 rounded-lg bg-surface-container-low text-xs text-on-surface focus:outline-none focus:bg-white focus:ring-1 focus:ring-primary-container"
                      />
                    </div>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-[11px] font-semibold text-on-surface-variant uppercase tracking-wider">
                      Tanggal Transaksi
                    </label>
                    <input
                      type="date"
                      value={dateFilter}
                      onChange={(e) => {
                        setDateFilter(e.target.value);
                        setCurrentPage(1);
                      }}
                      className="w-full px-3 py-2 rounded-lg bg-surface-container-low text-xs text-on-surface focus:outline-none focus:bg-white focus:ring-1 focus:ring-primary-container"
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-[11px] font-semibold text-on-surface-variant uppercase tracking-wider">
                      Shift Kasir
                    </label>
                    <select
                      value={shiftFilter}
                      onChange={(e) => {
                        setShiftFilter(e.target.value);
                        setCurrentPage(1);
                      }}
                      className="w-full px-3 py-2 rounded-lg bg-surface-container-low text-xs text-on-surface focus:outline-none focus:bg-white focus:ring-1 focus:ring-primary-container cursor-pointer"
                    >
                      <option value="all">Semua Shift Operasional</option>
                      <option value="pagi">Pagi (07:00 - 15:00)</option>
                      <option value="sore">Sore / Malam (15:00 - 23:00)</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            {/* Tabel Data Transaksi */}
            <div className="bg-white rounded-xl shadow-xs border border-slate-100 overflow-hidden flex flex-col">
              <div className="px-5 py-3.5 bg-white flex items-center justify-between border-b border-slate-100">
                <div className="flex items-center gap-2.5">
                  <span className="text-xs font-bold text-on-surface">
                    Data Transaksi Terkini
                  </span>
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] bg-primary-fixed text-[#783200] font-semibold">
                    {formatNumber(filteredOrders.length)} Rekaman
                  </span>
                </div>
              </div>

              <div className="overflow-x-auto w-full">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-surface-container-low/80 border-b border-slate-100 text-on-surface-variant text-[11px] uppercase tracking-wider">
                      <th className="py-3.5 px-4 font-semibold">
                        No. Transaksi / Invoice
                      </th>
                      <th className="py-3.5 px-4 font-semibold">
                        Waktu &amp; Tanggal
                      </th>
                      <th className="py-3.5 px-4 font-semibold">Pelanggan</th>
                      <th className="py-3.5 px-4 font-semibold">Kasir</th>
                      <th className="py-3.5 px-4 font-semibold text-center">
                        Metode Bayar
                      </th>
                      <th className="py-3.5 px-4 font-semibold text-right">
                        Total Transaksi
                      </th>
                      <th className="py-3.5 px-4 font-semibold text-center">
                        Aksi
                      </th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-100 text-xs text-on-surface">
                    {loading ? (
                      <tr>
                        <td
                          colSpan={7}
                          className="py-12 text-center text-sm text-on-surface-variant"
                        >
                          Memuat data riwayat transaksi...
                        </td>
                      </tr>
                    ) : paginationOrders.length === 0 ? (
                      <tr>
                        <td
                          colSpan={7}
                          className="py-12 text-center text-sm text-on-surface-variant"
                        >
                          Belum ada transaksi yang sesuai dengan filter pencarian.
                        </td>
                      </tr>
                    ) : (
                      paginationOrders.map((order) => {
                        const isCancelled = order.status === 'CANCELLED';
                        const isPending = order.status === 'PENDING';
                        const summaryText = getItemSummary(order.items);

                        return (
                          <tr
                            key={order.id}
                            className={`transition-colors group ${
                              isCancelled
                                ? 'bg-[#ffdad6]/20 hover:bg-[#ffdad6]/30'
                                : 'hover:bg-surface-container-low/60'
                            }`}
                          >
                            <td className="py-3.5 px-4 align-top">
                              <div className="flex flex-col min-w-0 max-w-55">
                                <button
                                  type="button"
                                  onClick={() => setSelectedOrder(order)}
                                  className={`text-left text-xs font-bold group-hover:underline cursor-pointer tracking-tight leading-tight ${
                                    isCancelled
                                      ? 'text-[#ba1a1a]'
                                      : isPending
                                        ? 'text-[#006398]'
                                        : 'text-primary-container'
                                  }`}
                                >
                                  {order.invoice}
                                </button>
                                <span
                                  className="text-[11px] text-on-surface-variant mt-1 truncate"
                                  title={summaryText}
                                >
                                  {summaryText}
                                </span>
                              </div>
                            </td>

                            <td className="py-3.5 px-4 align-top whitespace-nowrap">
                              <div className="flex flex-col gap-0.5">
                                <span className="font-semibold text-on-surface">
                                  {formatTime(order.createdAt)}
                                </span>
                                <span className="text-[11px] text-on-surface-variant">
                                  {formatDate(order.createdAt)}
                                </span>
                              </div>
                            </td>

                            <td className="py-3.5 px-4 align-top">
                              <span className="font-semibold text-on-surface">
                                {order.customerName}
                              </span>
                            </td>

                            <td className="py-3.5 px-4 align-top whitespace-nowrap">
                              <span className="font-medium text-on-surface">
                                {order.cashierName}
                              </span>
                            </td>

                            <td className="py-3.5 px-4 align-top text-center whitespace-nowrap">
                              {order.paymentMethod === 'QRIS' ? (
                                <span
                                  className={`inline-flex items-center justify-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold ${
                                    isCancelled
                                      ? 'bg-slate-100 text-on-surface-variant line-through'
                                      : 'bg-[#cde5ff] text-[#001d32]'
                                  }`}
                                >
                                  <QrCode className="w-3.5 h-3.5" />
                                  QRIS
                                </span>
                              ) : (
                                <span
                                  className={`inline-flex items-center justify-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold ${
                                    isCancelled
                                      ? 'bg-slate-100 text-on-surface-variant line-through'
                                      : 'bg-surface-container text-on-surface'
                                  }`}
                                >
                                  <Banknote className="w-3.5 h-3.5" />
                                  Tunai / Cash
                                </span>
                              )}
                            </td>

                            <td className="py-3.5 px-4 align-top text-right whitespace-nowrap">
                              <span
                                className={`font-bold ${
                                  isCancelled
                                    ? 'text-[#ba1a1a] line-through'
                                    : 'text-on-surface'
                                }`}
                              >
                                {formatRupiah(order.totalAmount)}
                              </span>
                            </td>

                            <td className="py-3.5 px-4 align-top text-center whitespace-nowrap">
                              <div className="inline-flex items-center justify-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => setSelectedOrder(order)}
                                  title="Lihat Rincian Struk"
                                  className="p-1.5 rounded-lg text-on-surface-variant hover:text-on-surface hover:bg-surface-container transition-colors cursor-pointer"
                                >
                                  <Eye className="w-4 h-4" />
                                </button>
                                <button
                                  type="button"
                                  disabled={isCancelled}
                                  onClick={() => handlePrintReceipt(order)}
                                  title={
                                    isCancelled
                                      ? 'Struk Dibatalkan'
                                      : 'Cetak Struk Transaksi'
                                  }
                                  className="p-1.5 rounded-lg text-on-surface-variant hover:text-primary-container hover:bg-primary-fixed/40 transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                                >
                                  <Printer className="w-4 h-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination Footer */}
              <div className="px-5 py-3.5 bg-white border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="text-xs text-on-surface-variant">
                  Menampilkan{' '}
                  <span className="font-semibold text-on-surface">
                    {filteredOrders.length === 0
                      ? 0
                      : (safeCurrentPage - 1) * itemsPerPage + 1}{' '}
                    -{' '}
                    {Math.min(
                      safeCurrentPage * itemsPerPage,
                      filteredOrders.length
                    )}
                  </span>{' '}
                  dari{' '}
                  <span className="font-semibold text-on-surface">
                    {formatNumber(filteredOrders.length)}
                  </span>{' '}
                  transaksi
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    disabled={safeCurrentPage <= 1}
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-surface-container-low text-on-surface-variant hover:text-on-surface hover:bg-surface-container transition-colors text-xs font-semibold disabled:opacity-40 cursor-pointer"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                    <span>Sebelumnya</span>
                  </button>

                  <div className="flex items-center gap-1">
                    {Array.from({ length: totalPages }, (_, i) => i + 1)
                      .slice(
                        Math.max(0, safeCurrentPage - 3),
                        Math.min(totalPages, safeCurrentPage + 2)
                      )
                      .map((page) => (
                        <button
                          key={page}
                          type="button"
                          onClick={() => setCurrentPage(page)}
                          className={`w-8 h-8 rounded-lg text-xs font-semibold flex items-center justify-center transition-colors cursor-pointer ${
                            safeCurrentPage === page
                              ? 'bg-primary-container text-white'
                              : 'bg-surface-container-low text-on-surface-variant hover:bg-surface-container hover:text-on-surface'
                          }`}
                        >
                          {page}
                        </button>
                      ))}
                  </div>

                  <button
                    type="button"
                    disabled={safeCurrentPage >= totalPages}
                    onClick={() =>
                      setCurrentPage((p) => Math.min(totalPages, p + 1))
                    }
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-surface-container-low text-on-surface hover:bg-surface-container transition-colors text-xs font-semibold disabled:opacity-40 cursor-pointer"
                  >
                    <span>Selanjutnya</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>

      {/* Slide-Over Drawer: Detail Struk Transaksi */}
      {selectedOrder && (
        <div
          onClick={() => setSelectedOrder(null)}
          className="fixed inset-0 bg-on-surface/40 backdrop-blur-xs z-50 flex justify-end"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="h-full w-full max-w-md bg-white shadow-2xl flex flex-col justify-between"
          >
            {/* Header Drawer */}
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <div className="flex flex-col">
                <span className="text-[11px] font-semibold text-on-surface-variant uppercase tracking-wider">
                  Detail Struk Transaksi
                </span>
                <span className="text-lg font-bold text-on-surface">
                  {selectedOrder.invoice}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setSelectedOrder(null)}
                className="p-1.5 rounded-lg text-on-surface-variant hover:text-on-surface hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Isi Struk */}
            <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-4">
              <div className="text-center flex flex-col items-center gap-1 pb-4 border-b border-dashed border-slate-200">
                <div className="w-10 h-10 rounded-xl bg-primary-container text-white flex items-center justify-center mb-1">
                  <Coffee className="w-5 h-5" />
                </div>
                <span className="text-base font-bold text-on-surface">
                  D&apos;Cafein Roastery
                </span>
                <span className="text-xs text-on-surface-variant">
                  Point of Sale Transaction Receipt
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs pb-4 border-b border-dashed border-slate-200">
                <div>
                  <span className="text-on-surface-variant">Kasir:</span>{' '}
                  <strong className="text-on-surface">
                    {selectedOrder.cashierName}
                  </strong>
                </div>
                <div className="text-right">
                  <span className="text-on-surface-variant">Waktu:</span>{' '}
                  <strong className="text-on-surface">
                    {formatTime(selectedOrder.createdAt)}
                  </strong>
                </div>
                <div>
                  <span className="text-on-surface-variant">Pelanggan:</span>{' '}
                  <strong className="text-on-surface">
                    {selectedOrder.customerName}
                  </strong>
                </div>
                <div className="text-right">
                  <span className="text-on-surface-variant">Tanggal:</span>{' '}
                  <strong className="text-on-surface">
                    {formatDate(selectedOrder.createdAt)}
                  </strong>
                </div>
              </div>

              {/* Daftar Item */}
              <div className="flex flex-col gap-3 py-1 border-b border-dashed border-slate-200 text-xs">
                {selectedOrder.items.length === 0 ? (
                  <p className="text-on-surface-variant text-center py-2">
                    Detail item tidak tersedia.
                  </p>
                ) : (
                  selectedOrder.items.map((item) => (
                    <div
                      key={item.id}
                      className="flex justify-between items-start gap-2"
                    >
                      <div className="flex flex-col">
                        <span className="font-semibold text-on-surface">
                          {item.quantity}x {item.name}
                        </span>
                        <span className="text-[11px] text-on-surface-variant">
                          @ {formatRupiah(item.price)}
                        </span>
                      </div>
                      <span className="font-semibold text-on-surface whitespace-nowrap">
                        {formatRupiah(item.subtotal)}
                      </span>
                    </div>
                  ))
                )}
              </div>

              {/* Total Pembayaran */}
              <div className="flex flex-col gap-1.5 text-xs">
                <div className="flex justify-between text-on-surface-variant">
                  <span>Subtotal Item</span>
                  <span>{formatRupiah(selectedOrder.totalAmount)}</span>
                </div>
                <div className="flex justify-between font-bold text-base text-on-surface pt-2 border-t border-slate-100">
                  <span>Total Bayar</span>
                  <span className="text-primary-container">
                    {formatRupiah(selectedOrder.totalAmount)}
                  </span>
                </div>
              </div>

              {/* Status Pembayaran */}
              <div
                className={`mt-1 p-3.5 rounded-xl flex items-center justify-between ${
                  selectedOrder.status === 'CANCELLED'
                    ? 'bg-[#ffdad6]/50'
                    : 'bg-secondary-fixed/30'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  {selectedOrder.status === 'CANCELLED' ? (
                    <AlertTriangle className="w-5 h-5 text-[#ba1a1a]" />
                  ) : (
                    <CheckCircle2 className="w-5 h-5 text-[#006c49]" />
                  )}
                  <div className="flex flex-col">
                    <span
                      className={`text-xs font-bold ${
                        selectedOrder.status === 'CANCELLED'
                          ? 'text-[#93000a]'
                          : 'text-[#005236]'
                      }`}
                    >
                      {selectedOrder.status === 'CANCELLED'
                        ? 'DIBATALKAN'
                        : selectedOrder.status === 'PENDING'
                          ? `MENUNGGU - ${selectedOrder.paymentLabel}`
                          : `LUNAS - ${selectedOrder.paymentLabel}`}
                    </span>
                    <span className="text-[11px] text-on-surface-variant">
                      ID: {selectedOrder.id.slice(0, 12)}
                    </span>
                  </div>
                </div>
                <span
                  className={`text-[11px] font-bold ${
                    selectedOrder.status === 'CANCELLED'
                      ? 'text-[#ba1a1a]'
                      : 'text-[#006c49]'
                  }`}
                >
                  {selectedOrder.status}
                </span>
              </div>
            </div>

            {/* Footer Aksi Drawer */}
            <div className="p-5 border-t border-slate-100 flex items-center gap-2.5">
              <button
                type="button"
                disabled={selectedOrder.status === 'CANCELLED'}
                onClick={() => handlePrintReceipt(selectedOrder)}
                className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-primary-container text-white text-xs font-semibold hover:opacity-95 transition-opacity shadow-xs disabled:opacity-40 cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                <span>Cetak Struk Thermal</span>
              </button>
              <button
                type="button"
                disabled={selectedOrder.status === 'CANCELLED'}
                onClick={() => handlePrintReceipt(selectedOrder)}
                title="Simpan / Cetak PDF"
                className="p-2.5 rounded-xl bg-surface-container text-on-surface hover:bg-[#dae2fd] transition-colors disabled:opacity-40 cursor-pointer"
              >
                <FileText className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notifikasi Melayang */}
      {toast && (
        <div className="fixed top-20 right-6 z-60 flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg border border-slate-100 bg-white max-w-sm">
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
    </div>
  );
};