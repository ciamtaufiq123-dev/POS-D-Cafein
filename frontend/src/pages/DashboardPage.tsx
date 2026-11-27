import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Coffee,
    TrendingUp,
    Package,
    ReceiptText,
    Store,
    ChevronRight,
    Calendar,
    User as UserIcon,
    ChevronDown,
    Settings,
    LogOut,
    Download,
    Wallet,
    Search,
    ArrowRight,
    Banknote,
    QrCode
} from 'lucide-react';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import { ThemeToggle } from '../components/ThemeToggle';
import type { Order } from '../types/index';
import { formatRupiah } from '../utils/format';

interface ChartPeriodSelection {
    start: Date;
    end: Date;
    label: string;
}

export const DashboardPage: React.FC = () => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();

    const [ orders, setOrders ] = useState<Order[]>([]);
    const [ loading, setLoading ] = useState<boolean>(true);
    const [ loadError, setLoadError ] = useState<string | null>(null);
    const [ profileOpen, setProfileOpen ] = useState<boolean>(false);
    const [ chartRange, setChartRange ] = useState<'7D' | '30D' | 'MONTHLY'>('7D');
    const [ selectedYear, setSelectedYear ] = useState<number>(
        Math.max(2026, new Date().getFullYear())
    );
    const [ selectedChartPeriod, setSelectedChartPeriod ] = useState<ChartPeriodSelection | null>(null);
    const [ searchInvoice, setSearchInvoice ] = useState<string>('');
    const [ hoveredBarIndex, setHoveredBarIndex ] = useState<number | null>(null);
    const currentYear = new Date().getFullYear();
    const chartYears = Array.from(
        { length: Math.max(1, currentYear - 2026 + 1) },
        (_, index) => 2026 + index
    );

    const fetchOrders = async () => {
        try {
            setLoading(true);
            setLoadError(null);
            const res = await api.get('/orders');
            const list: Order[] = res.data?.data || res.data || [];
            setOrders(list);
        } catch (err) {
            console.error('Gagal memuat data analitik dashboard', err);
            setLoadError('Data transaksi gagal dimuat. Periksa koneksi server lalu coba lagi.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        fetchOrders();
    }, []);

    const handleLogout = () => {
        logout();
        navigate('/login', { replace: true});
    };

    const todayFormatted = useMemo(() => {
        return new Intl.DateTimeFormat('id-ID', {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
            year: 'numeric',
        }).format(new Date());
    }, []);

    const paidOrders = useMemo(() => {
        return orders.filter((o) => o.paymentStatus === 'PAID')
    }, [orders]);

    const todayPaidOrders = useMemo(() => {
        const now = new Date();
        return paidOrders.filter((o) => {
            if (!o.createdAt) return false;
            const d = new Date(o.createdAt);
            return (
                d.getDate() === now.getDate() &&
                d.getMonth() === now.getMonth() &&
                d.getFullYear() === now.getFullYear()
            );
        });
    }, [paidOrders]);

    const activePaidOrders = useMemo(() => {
        if (!selectedChartPeriod) return todayPaidOrders;

        return paidOrders.filter((o) => {
            const createdAt = new Date(o.createdAt).getTime();
            return (
                Number.isFinite(createdAt) &&
                createdAt >= selectedChartPeriod.start.getTime() &&
                createdAt < selectedChartPeriod.end.getTime()
            );
        });
    }, [paidOrders, selectedChartPeriod, todayPaidOrders]);

    const activePeriodRevenue = useMemo(() => {
        return activePaidOrders.reduce(
            (sum, o) => sum + Number(o.totalAmount || 0),
            0
        );
    }, [activePaidOrders]);

    const activePeriodOrderCount = activePaidOrders.length;

    const activePeriodItemsSold = useMemo(() => {
        return activePaidOrders.reduce((sum, o) => {
            const itemCount =
            o.items?.reduce((acc, item) => acc + Number(item.quantity || 0), 0) ||
            0;
            return sum + itemCount;
        }, 0);
    }, [activePaidOrders])

    const activePeriodLabel = selectedChartPeriod?.label || 'Hari Ini';

    const weeklyChartData = useMemo(() => {
        const dayNames = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
        const today = new Date();
        const days: {
            label: string;
            dateStr: string;
            amount: number;
            isToday: boolean;
            periodStart: Date;
            periodEnd: Date;
            periodLabel: string;
        }[] = [];

        const monthNames = ['Jan', 'Feb', 'mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];

        if (chartRange === 'MONTHLY') {
          for (let m = 0; m < 12 ; m++) {
            const periodStart = new Date(selectedYear, m, 1);
            const periodEnd = new Date(selectedYear, m + 1, 1);
            const monthTotal = paidOrders
              .filter((o) => {
                if (!o.createdAt) return false;
                const od = new Date(o.createdAt);
                return od.getFullYear() === selectedYear && od.getMonth() === m;
              })
              .reduce((sum, o) => sum + Number(o.totalAmount || 0), 0);

          days.push({
            label: monthNames[m],
            dateStr: `${monthNames[m]} ${selectedYear}`,
            amount: monthTotal,
            isToday: selectedYear === today.getFullYear() && m === today.getMonth(),
            periodStart,
            periodEnd,
            periodLabel: `${monthNames[m]} ${selectedYear}`,
          });
          }
        } else {
          const totalDays = chartRange === '7D' ? 7 : 30;
          for (let i = totalDays - 1; i >= 0; i--) {
            const d = new Date(today);
            d.setDate(today.getDate() - i);

            const dayTotal = paidOrders
              .filter((o) => {
                if (!o.createdAt) return false;
                const od = new Date(o.createdAt);
                return (
                  od.getDate() === d.getDate() &&
                  od.getMonth() === d.getMonth() &&
                  od.getFullYear() === d.getFullYear()
                );
              })
              .reduce((sum, o) => sum + Number(o.totalAmount || 0), 0);

            const shortDate = d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
            const periodStart = new Date(d.getFullYear(), d.getMonth(), d.getDate());
            const periodEnd = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1);
            days.push({
              label: chartRange === '7D' ? dayNames[d.getDay()] : shortDate,
              dateStr: shortDate,
              amount: dayTotal,
              isToday: i === 0,
              periodStart,
              periodEnd,
              periodLabel: periodStart.toLocaleDateString('id-ID', {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
                year: 'numeric',
              }),
            });
          }
        }

        const totalWeek = days.reduce((s, d) => s + d.amount, 0);
        const divisor = chartRange === 'MONTHLY'
              ? (selectedYear === today.getFullYear() ? today.getMonth() + 1 : 12)
              : days.length;
        const avgWeek = Math.round(totalWeek / Math.max(1, divisor));
        const maxVal = Math.max(100000, ...days.map((d) => d.amount));

        const title =
          chartRange === '7D'
            ? 'Tren Pemasukan 7 Hari'
            : chartRange === '30D'
            ? 'Tren Pemasukan 30 hari'
            : `Tren Pemasukan Bulanan ${selectedYear}`;

        const totalLabel =
          chartRange === '7D' ? 'Total 7 Hari' : chartRange === '30D' ? 'Total 30 Hari' : `Total Tahun ${selectedYear}`;

        const avgUnit = chartRange === 'MONTHLY' ? 'bulan' : 'hari';

        let periodLabel = `januari - Desember ${selectedYear}`;
        if (chartRange !== 'MONTHLY') {
          const startDate = new Date(today);
          startDate.setDate(today.getDate() - (days.length - 1));
          periodLabel = `Period ${startDate.toLocaleDateString('id-ID', { day: 'numeric', month: 'short'})} - ${today.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric'})}`;
        }

        return { days, totalWeek, avgWeek, maxVal, periodLabel, title, totalLabel, avgUnit };
    }, [paidOrders, chartRange, selectedYear]);

    const paymentBreakdown = useMemo(() => {
        const totalCount = activePaidOrders.length;

        const cashOrders = activePaidOrders.filter((o) => o.paymentMethod === 'CASH');
        const qrisOrders = activePaidOrders.filter((o) => o.paymentMethod === 'MIDTRANS');

        const cashCount = cashOrders.length;
        const qrisCount = qrisOrders.length;

        const cashAmount = cashOrders.reduce(
            (s, o) => s + Number(o.totalAmount || 0),
            0
        );
        const qrisAmount = qrisOrders.reduce(
            (s, o) => s + Number(o.totalAmount || 0),
            0
        );

        const cashPct = totalCount > 0 ? (cashCount / totalCount) * 100 : 0;
        const qrisPct = totalCount > 0 ? (qrisCount / totalCount) * 100 : 0;

        const circumference = 351.56;
        const qrisDash = (qrisPct / 100) * circumference;
        const cashDash = (cashPct / 100) * circumference;

        return {
            totalCount,
            cashCount,
            qrisCount,
            cashAmount,
            qrisAmount,
            cashPct: cashPct.toFixed(1),
            qrisPct: qrisPct.toFixed(1),
            circumference,
            qrisDash,
            cashDash,
        };
    }, [activePaidOrders]);

    const recentTransactions = useMemo(() => {
        const q = searchInvoice.toLocaleLowerCase().trim();
        const filtered = orders.filter((o) => {
            const matchesSearch = !q || (
                o.orderNumber?.toLocaleLowerCase().includes(q) ||
                o.customerName?.toLocaleLowerCase().includes(q)
            );
            if (!matchesSearch) return false;
            if (!selectedChartPeriod) return true;

            const createdAt = new Date(o.createdAt).getTime();
            return (
                Number.isFinite(createdAt) &&
                createdAt >= selectedChartPeriod.start.getTime() &&
                createdAt < selectedChartPeriod.end.getTime()
            );
        });
        return selectedChartPeriod ? filtered : filtered.slice(0, 5);
    }, [orders, searchInvoice, selectedChartPeriod]);

    const handleChartPeriodSelect = (period: ChartPeriodSelection) => {
        setSelectedChartPeriod((current) =>
            current?.start.getTime() === period.start.getTime() &&
            current?.end.getTime() === period.end.getTime()
                ? null
                : period
        );
    };

    const formatShortRupiah = (val: number) => {
        if (val <= 0) return 'Rp 0';
        if (val >= 1000000) return `Rp ${(val / 1000000).toFixed(1)}jt`;
        if (val >= 1000) return `Rp ${Math.round(val / 1000)}rb`;
        return `Rp ${val}`;
    };

    const handleExportCsv = () => {
        if (orders.length === 0) return;

        const headers = [
            'No Transaksi',
            'Waktu',
            'Pelanggan',
            'Kasir',
            'Metode Pembayaran',
            'Status',
            'Total Transaksi',
        ];
        const rows = orders.map((o) => [
            o.orderNumber,
            o.createdAt ? new Date(o.createdAt).toLocaleString('id-ID') : '-',
            `"${o.customerName || 'Pelanggan Umum'}"`,
            `"${o.cashier?.name || user?.name || 'Kasir'}"`,
            o.paymentMethod === 'CASH' ? 'Tunai' : 'QRIS',
            o.paymentStatus,
            Number(o.totalAmount || 0),
        ]);

        const csvContent =
            'data:text/csv;chartset=utf-8,' +
            [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');

        const encodedUri = encodeURI(csvContent);
        const link = document.createElement('a');
        link.setAttribute('href', encodedUri);
        link.setAttribute(
            'download',
            `Laporan-Transaksi-DCafein-${new Date().toISOString().slice(0, 10)}.csv`
        );
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
    <div className="bg-background font-sans text-on-surface antialiased min-h-screen">
      {/* SIDEBAR KIRI */}
      <aside className="fixed left-0 top-0 h-screen w-60 bg-white border-r border-outline-variant/40 z-50 flex flex-col justify-between">
        <div className="flex flex-col flex-1">
          {/* Logo Brand */}
          <div className="h-16 px-6 flex items-center gap-2.5 border-b border-outline-variant/30">
            <div className="w-10 h-10 rounded-xl bg-primary-container flex items-center justify-center shadow-xs shrink-0">
              <Coffee className="w-5 h-5 text-white" />
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-[20px] text-on-surface leading-tight tracking-tight font-semibold truncate">
                D'Cafein
              </span>
              <span className="text-[11px] text-on-surface-variant font-medium">
                Admin Dashboard
              </span>
            </div>
          </div>

          {/* Menu Navigasi */}
          <div className="p-3 flex-1 flex flex-col">
            <div className="px-3 mb-2">
              <span className="text-[11px] font-semibold text-on-surface-variant uppercase tracking-wider">
                Menu Utama
              </span>
            </div>
            <nav className="space-y-1">
              <button
                type="button"
                onClick={() => navigate('/dashboard')}
                className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl transition-all bg-primary-fixed/40 text-primary-container font-semibold shadow-2xs cursor-pointer text-left"
              >
                <TrendingUp className="w-5 h-5 text-primary-container shrink-0" />
                <span className="text-xs font-semibold">
                  Dashboard Analitik
                </span>
              </button>

              <button
                type="button"
                onClick={() => navigate('/products')}
                className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-medium text-on-surface-variant hover:text-on-surface hover:bg-surface-container transition-all cursor-pointer text-left"
              >
                <Package className="w-5 h-5 shrink-0" />
                <span className="text-xs font-semibold">
                  Kelola Produk (CRUD)
                </span>
              </button>

              <button
                type="button"
                onClick={() => navigate('/orders')}
                className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-medium text-on-surface-variant hover:text-on-surface hover:bg-surface-container transition-all cursor-pointer text-left"
              >
                <ReceiptText className="w-5 h-5 shrink-0" />
                <span className="text-xs font-semibold">Riwayat Transaksi</span>
              </button>

              <button
                type="button"
                onClick={() => navigate('/pos')}
                className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-medium text-on-surface-variant hover:text-on-surface hover:bg-surface-container transition-all cursor-pointer text-left"
              >
                <Store className="w-5 h-5 shrink-0" />
                <span className="text-xs font-semibold">Kasir POS</span>
              </button>
            </nav>
          </div>
        </div>
      </aside>

      {/* AREA KONTEN KANAN */}
      <div className="pl-60 min-h-screen flex flex-col">
        {/* TOP HEADER */}
        <header className="fixed top-0 left-60 right-0 h-16 bg-white border-b border-outline-variant/40 z-40 px-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-on-surface-variant">
              <Store className="w-4 h-4" />
              <span>Operasional</span>
              <ChevronRight className="w-3.5 h-3.5" />
              <span className="text-on-surface font-semibold">Overview</span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5 text-on-surface-variant text-[13px]">
              <Calendar className="w-4 h-4" />
              <span>{todayFormatted}</span>
            </div>

            <div className="h-4 w-px bg-outline-variant/40" />

            <ThemeToggle />

            {/* Dropdown Profil */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setProfileOpen((prev) => !prev)}
                className="flex items-center gap-2 p-1 pl-1.5 pr-2.5 rounded-full bg-surface-container-low hover:bg-surface-container transition-colors border border-outline-variant/30 cursor-pointer select-none"
              >
                <div className="w-8 h-8 rounded-full bg-primary-container flex items-center justify-center text-white shadow-2xs shrink-0">
                  <UserIcon className="w-4 h-4" />
                </div>
                <div className="flex flex-col text-left">
                  <span className="text-xs text-on-surface font-semibold leading-tight">
                    {user?.name || "Admin D'Cafein"}
                  </span>
                  <span className="text-[11px] text-on-surface-variant leading-none">
                    {user?.role === 'ADMIN' ? 'Owner' : 'Kasir'}
                  </span>
                </div>
                <ChevronDown className="w-4 h-4 text-on-surface-variant ml-0.5" />
              </button>

              {profileOpen && (
                <div className="absolute right-0 top-full mt-2 w-60 rounded-xl bg-white border border-outline-variant/40 shadow-lg p-1.5 z-50 flex flex-col gap-1">
                  <div className="px-3 py-2.5 flex flex-col gap-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-on-surface truncate">
                        {user?.name || "Admin D'Cafein"}
                      </span>
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[11px] bg-primary-fixed text-[#783200] font-semibold leading-none">
                        {user?.role === 'ADMIN' ? 'Owner' : 'Kasir'}
                      </span>
                    </div>
                    <span className="text-xs text-on-surface-variant truncate">
                      {user?.email || 'admin@dcafein.com'}
                    </span>
                  </div>

                  <div className="h-px bg-outline-variant/30 my-0.5" />

                  <button
                    type="button"
                    onClick={() => {
                      setProfileOpen(false);
                      navigate('/pos');
                    }}
                    className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold text-on-surface hover:bg-surface-container transition-colors cursor-pointer text-left"
                  >
                    <Store className="w-4 h-4 text-on-surface-variant" />
                    <span>Buka Kasir POS</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setProfileOpen(false);
                      navigate('/products');
                    }}
                    className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold text-on-surface hover:bg-surface-container transition-colors cursor-pointer text-left"
                  >
                    <Settings className="w-4 h-4 text-on-surface-variant" />
                    <span>Kelola Menu &amp; Stok</span>
                  </button>

                  <div className="h-px bg-outline-variant/30 my-0.5" />

                  <button
                    type="button"
                    onClick={handleLogout}
                    className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold text-[#ba1a1a] hover:bg-[#ffdad6]/40 transition-colors cursor-pointer text-left"
                  >
                    <LogOut className="w-4 h-4 text-[#ba1a1a]" />
                    <span>Keluar</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* MAIN CONTENT */}
        <main className="flex-1 pt-16 bg-background px-6 py-6 w-full">
          <div className="flex flex-col w-full gap-6">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
              <div className="flex flex-col">
                <h1 className="text-[24px] font-semibold text-on-surface tracking-tight">
                  Ringkasan Penjualan &amp; Analitik
                </h1>
                <p className="text-sm text-on-surface-variant">
                  Pantau performa penjualan harian, transaksi kasir, dan tren
                  pendapatan kafe.
                </p>
              </div>
              <div className="flex items-center gap-2 self-start md:self-auto">
                <button
                  type="button"
                  onClick={handleExportCsv}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-white hover:bg-surface-container text-on-surface text-xs font-semibold shadow-xs border border-outline-variant/30 transition-colors cursor-pointer"
                >
                  <Download className="w-4 h-4 text-on-surface-variant" />
                  <span>Export Data</span>
                </button>
              </div>
            </div>

            {/* Top Row: 3 Metric Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Metric 1: Pemasukan Hari Ini */}
              <div className="flex flex-col p-6 rounded-xl bg-white shadow-xs">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-on-surface-variant">
                    Pemasukan {activePeriodLabel}
                  </span>
                  <div className="w-10 h-10 rounded-lg bg-primary-fixed flex items-center justify-center">
                    <Wallet className="w-5 h-5 text-primary" />
                  </div>
                </div>
                <div className="mt-3 flex flex-col gap-1">
                  <span className="text-[30px] font-semibold text-on-surface tracking-tight leading-tight">
                    {formatRupiah(activePeriodRevenue)}
                  </span>
                </div>
              </div>

              {/* Metric 2: Total Transaksi Hari Ini */}
              <div className="flex flex-col p-6 rounded-xl bg-white shadow-xs">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-on-surface-variant">
                    Total Transaksi {activePeriodLabel}
                  </span>
                  <div className="w-10 h-10 rounded-lg bg-[#e2e7ff] flex items-center justify-center">
                    <ReceiptText className="w-5 h-5 text-on-surface" />
                  </div>
                </div>
                <div className="mt-3 flex flex-col gap-1">
                  <span className="text-[30px] font-semibold text-on-surface tracking-tight leading-tight">
                    {activePeriodOrderCount} Pesanan
                  </span>
                </div>
              </div>

              {/* Metric 3: Item Terjual Hari Ini */}
              <div className="flex flex-col p-6 rounded-xl bg-white shadow-xs">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-on-surface-variant">
                    Item Terjual {activePeriodLabel}
                  </span>
                  <div className="w-10 h-10 rounded-lg bg-primary-fixed flex items-center justify-center">
                    <Coffee className="w-5 h-5 text-primary" />
                  </div>
                </div>
                <div className="mt-3 flex flex-col gap-1">
                  <span className="text-[30px] font-semibold text-on-surface tracking-tight leading-tight">
                    {activePeriodItemsSold} Produk
                  </span>
                </div>
              </div>
            </div>

            {/* Middle Row: Analytics Side-by-Side (Col 8 vs Col 4) */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
              {/* Weekly Income Bar Chart (Col 8) */}
              <div className="lg:col-span-8 flex flex-col p-6 rounded-xl bg-white shadow-xs justify-between">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <div>
                    <h2 className="text-[20px] font-semibold text-on-surface">
                      {weeklyChartData.title}
                    </h2>
                    <p className="text-[13px] text-on-surface-variant">
                      {weeklyChartData.periodLabel}
                    </p>
                    <p className="text-[11px] text-on-surface-variant">
                      Klik batang untuk melihat transaksi pada tanggal atau bulan tersebut.
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center justify-end gap-2 self-start sm:self-auto">
                    {chartRange === 'MONTHLY' && (
                      <select
                        value={selectedYear}
                        onChange={(e) => {
                          setSelectedYear(Number(e.target.value));
                          setSelectedChartPeriod(null);
                        }}
                        className="px-2.5 py-1 rounded-lg bg-surface-container text-xs font-semibold text-on-surface cursor-pointer focus:outline-none"
                      >
                        {chartYears.map((yr) => (
                          <option key={yr} value={yr}>
                            {yr}
                          </option>
                        ))}
                      </select>
                    )}
                    <div className="inline-flex items-center p-0.5 rounded-lg bg-surface-container gap-1">
                      <button
                        type="button"
                        onClick={() => {
                          setChartRange('7D');
                          setSelectedChartPeriod(null);
                          setHoveredBarIndex(null);
                        }}
                        className={`px-3 py-1 rounded-md text-xs font-semibold transition-colors cursor-pointer ${
                          chartRange === '7D'
                            ? 'bg-white text-primary shadow-2xs'
                            : 'text-on-surface-variant hover:text-on-surface'
                        }`}
                      >
                        7 Hari
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setChartRange('30D');
                          setSelectedChartPeriod(null);
                          setHoveredBarIndex(null);
                        }}
                        className={`px-3 py-1 rounded-md text-xs font-semibold transition-colors cursor-pointer ${
                          chartRange === '30D'
                            ? 'bg-white text-primary shadow-2xs'
                            : 'text-on-surface-variant hover:text-on-surface'
                        }`}
                      >
                        30 Hari
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setChartRange('MONTHLY');
                          setSelectedChartPeriod(null);
                          setHoveredBarIndex(null);
                        }}
                        className={`px-2 py-1 rounded-md text-xs font-semibold transition-colors cursor-pointer ${
                          chartRange === 'MONTHLY'
                            ? 'bg-white text-primary shadow-2xs'
                            : 'text-on-surface-variant hover:text-on-surface'
                        }`}
                      >
                        Per Bulan
                      </button>
                    </div>
                  </div>
                </div>

                {/* SVG Bar Chart */}
                <div className="mt-4 relative w-full overflow-hidden">
                  <svg
                    className="w-full h-56 select-none"
                    viewBox="0 0 700 240"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    {/* Grid Lines & Y-Labels */}
                    <g className="text-on-surface-variant opacity-50 text-[11px] font-semibold">
                      {[1, 0.75, 0.5, 0.25, 0].map((ratio, idx) => {
                        const y = 20 + idx * 45;
                        return (
                          <g key={idx}>
                            <line
                              opacity={ratio === 0 ? '0.5' : '0.3'}
                              stroke="currentColor"
                              strokeDasharray={ratio === 0 ? undefined : '3 3'}
                              x1="65"
                              x2="680"
                              y1={y}
                              y2={y}
                            />
                            <text fill="currentColor" textAnchor="end" x="55" y={y + 4}>
                              {formatShortRupiah(weeklyChartData.maxVal * ratio)}
                            </text>
                          </g>
                        );
                      })}
                    </g>

                    {/* Dynamic Bars */}
                    {weeklyChartData.days.map((day, idx) => {
                      const slotWidth = 615 / weeklyChartData.days.length;
                      const barWidth = chartRange === '7D' ? 46 : chartRange === '30D' ? 12 : 30;
                      const xPos = 65 + idx * slotWidth + (slotWidth - barWidth) / 2;
                      const centerX = xPos + barWidth / 2;
                      const rawHeight = (day.amount / weeklyChartData.maxVal) * 180;
                      const barHeight =
                        day.amount > 0 ? Math.max(8, Math.min(180, rawHeight)) : 4;
                      const yPos = 200 - barHeight;
                      const isSelected =
                        selectedChartPeriod?.start.getTime() === day.periodStart.getTime();
                      const isHighlighted =
                        hoveredBarIndex === idx ||
                        (hoveredBarIndex === null &&
                          (selectedChartPeriod ? isSelected : day.isToday));
                      const isAccent = isSelected || (!selectedChartPeriod && day.isToday);
                      const showXLabel =
                        chartRange !== '30D' ||
                        idx === 0 ||
                        idx === weeklyChartData.days.length - 1 ||
                        idx % 5 === 0;

                      return (
                        <g
                          key={`${day.dateStr}-${idx}`}
                          role="button"
                          tabIndex={0}
                          aria-label={`Tampilkan transaksi ${day.periodLabel}`}
                          aria-pressed={isSelected}
                          className="cursor-pointer focus:outline-none focus-visible:outline-2 focus-visible:outline-[#f97316]"
                          onMouseEnter={() => setHoveredBarIndex(idx)}
                          onMouseLeave={() => setHoveredBarIndex(null)}
                          onClick={() =>
                            handleChartPeriodSelect({
                              start: day.periodStart,
                              end: day.periodEnd,
                              label: day.periodLabel,
                            })
                          }
                          onKeyDown={(event) => {
                            if (event.key === 'Enter' || event.key === ' ') {
                              event.preventDefault();
                              handleChartPeriodSelect({
                                start: day.periodStart,
                                end: day.periodEnd,
                                label: day.periodLabel,
                              });
                            }
                          }}
                        >
                          {/* Area hover agar batang tipis di mode 30 Hari gampang di-hover */}
                          <rect
                            fill="transparent"
                            height="190"
                            width={slotWidth}
                            x={65 + idx * slotWidth}
                            y="15"
                          />
                          <rect
                            fill={isAccent ? '#f97316' : '#ffb690'}
                            height={barHeight}
                            rx={chartRange === '30D' ? 3 : 4}
                            width={barWidth}
                            x={xPos}
                            y={yPos}
                            className="transition-all duration-300 hover:opacity-90"
                          />
                          {showXLabel && (
                            <text
                              className={`${chartRange === '30D' ? 'text-[10px]' : 'text-[12px]'} ${
                                day.isToday ? 'font-bold' : 'font-semibold'
                              }`}
                              fill={isAccent ? '#9d4300' : '#584237'}
                              textAnchor="middle"
                              x={centerX}
                              y="218"
                            >
                              {day.label}
                            </text>
                          )}

                          {/* Tooltip */}
                          {isHighlighted && (
                            <g className="pointer-events-none">
                              <rect
                                fill="#131b2e"
                                height="26"
                                rx="4"
                                width="165"
                                x={Math.min(515, Math.max(65, centerX - 82))}
                                y={Math.max(4, yPos - 34)}
                              />
                              <text
                                className="text-[11px] font-semibold"
                                fill="#ffffff"
                                textAnchor="middle"
                                x={Math.min(597, Math.max(147, centerX))}
                                y={Math.max(21, yPos - 17)}
                              >
                                {day.isToday && chartRange !== 'MONTHLY' ? 'Hari Ini' : day.dateStr}:{' '}
                                {formatRupiah(day.amount)}
                              </text>
                            </g>
                          )}
                        </g>
                  );
                  })}
                  </svg>
                </div>

                {/* Summary Footer */}
                <div className="mt-3 flex flex-col sm:flex-row sm:items-center sm:justify-between text-on-surface-variant text-[13px] bg-surface-container-low px-4 py-2.5 rounded-lg">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-primary-container" />
                    <span>
                      {weeklyChartData.totalLabel} :
                      <strong className="text-on-surface font-semibold">
                        {formatRupiah(weeklyChartData.totalWeek)}
                      </strong>
                    </span>
                  </div>
                  <span className="text-on-surface-variant">
                    Rata-rata: {' '}
                    <strong className="text-on-surface font-semibold">
                      {formatRupiah(weeklyChartData.avgWeek)}
                    </strong>{' '}
                    / {weeklyChartData.avgUnit}
                  </span>
                </div>
              </div>

              {/* Payment Method Donut Chart (Col 4) */}
              <div className="lg:col-span-4 flex flex-col p-6 rounded-xl bg-white shadow-xs justify-between">
                <div>
                  <h2 className="text-[20px] font-semibold text-on-surface">
                    Metode Pembayaran
                  </h2>
                  <p className="text-[13px] text-on-surface-variant">
                    Komposisi transaksi {activePeriodLabel}
                  </p>
                </div>

                {/* Donut Visual */}
                <div className="my-4 flex items-center justify-center relative">
                  <svg className="w-44 h-44 -rotate-90" viewBox="0 0 160 160">
                    <circle
                      cx="80"
                      cy="80"
                      fill="transparent"
                      r="56"
                      stroke="#f2f3ff"
                      strokeWidth="20"
                    />
                    {/* QRIS / Midtrans Segment */}
                    <circle
                      cx="80"
                      cy="80"
                      fill="transparent"
                      r="56"
                      stroke="#283044"
                      strokeDasharray={`${paymentBreakdown.qrisDash} ${paymentBreakdown.circumference}`}
                      strokeDashoffset="0"
                      strokeWidth="20"
                    />
                    {/* Tunai (Cash) Segment */}
                    <circle
                      cx="80"
                      cy="80"
                      fill="transparent"
                      r="56"
                      stroke="#f97316"
                      strokeDasharray={`${paymentBreakdown.cashDash} ${paymentBreakdown.circumference}`}
                      strokeDashoffset={-paymentBreakdown.qrisDash}
                      strokeWidth="20"
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <span className="text-[32px] font-bold text-on-surface leading-none">
                      {paymentBreakdown.totalCount}
                    </span>
                    <span className="text-[11px] font-semibold text-on-surface-variant uppercase tracking-wider mt-1">
                      Total Trx
                    </span>
                  </div>
                </div>

                {/* Legend Breakdown */}
                <div className="flex flex-col gap-2 pt-1">
                  {/* Row 1: Tunai */}
                  <div className="flex items-center justify-between p-2.5 rounded-lg bg-surface-container-low">
                    <div className="flex items-center gap-2.5">
                      <span className="w-3 h-3 rounded-full bg-primary-container shrink-0" />
                      <div className="flex flex-col">
                        <span className="text-sm font-medium text-on-surface leading-snug">
                          Tunai (Cash)
                        </span>
                        <span className="text-xs text-on-surface-variant">
                          {paymentBreakdown.cashCount} Transaksi (
                          {paymentBreakdown.cashPct}%)
                        </span>
                      </div>
                    </div>
                    <span className="text-sm text-on-surface font-semibold">
                      {formatRupiah(paymentBreakdown.cashAmount)}
                    </span>
                  </div>

                  {/* Row 2: QRIS */}
                  <div className="flex items-center justify-between p-2.5 rounded-lg bg-surface-container-low">
                    <div className="flex items-center gap-2.5">
                      <span className="w-3 h-3 rounded-full bg-[#283044] shrink-0" />
                      <div className="flex flex-col">
                        <span className="text-sm font-medium text-on-surface leading-snug">
                          QRIS
                        </span>
                        <span className="text-xs text-on-surface-variant">
                          {paymentBreakdown.qrisCount} Transaksi (
                          {paymentBreakdown.qrisPct}%)
                        </span>
                      </div>
                    </div>
                    <span className="text-sm text-on-surface font-semibold">
                      {formatRupiah(paymentBreakdown.qrisAmount)}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom Row: Recent Transactions Table */}
            <div className="flex flex-col rounded-xl bg-white shadow-xs p-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
                <div>
                  <h2 className="text-[20px] font-semibold text-on-surface">
                    {selectedChartPeriod
                      ? `Transaksi ${selectedChartPeriod.label}`
                      : 'Transaksi Terbaru'}
                  </h2>
                  <p className="text-[13px] text-on-surface-variant">
                    {selectedChartPeriod
                      ? `${recentTransactions.length} transaksi pada periode ini`
                      : '5 transaksi terakhir yang diproses'}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  {selectedChartPeriod && (
                    <button
                      type="button"
                      onClick={() => setSelectedChartPeriod(null)}
                      className="text-xs font-semibold text-primary hover:text-[#582200] cursor-pointer"
                    >
                      Tampilkan transaksi terbaru
                    </button>
                  )}
                  <div className="relative min-w-55">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant" />
                    <input
                      type="text"
                      value={searchInvoice}
                      onChange={(e) => setSearchInvoice(e.target.value)}
                      placeholder="Cari no. invoice..."
                      className="w-full pl-9 pr-3 py-1.5 rounded-lg bg-surface-container-low text-on-surface placeholder:text-on-surface-variant/60 text-[13px] focus:outline-none focus:ring-1 focus:ring-primary-container"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={() => navigate('/orders')}
                    className="inline-flex items-center gap-1 text-primary hover:text-[#582200] text-xs font-semibold transition-colors cursor-pointer"
                  >
                    <span>Lihat Semua Transaksi</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="overflow-x-auto w-full">
                <table className="w-full text-left text-[13px] border-collapse">
                  <thead>
                    <tr className="border-b border-outline-variant/30 text-on-surface-variant text-xs uppercase tracking-wider">
                      <th className="py-3 px-4 font-semibold">No. Transaksi</th>
                      <th className="py-3 px-4 font-semibold">
                        Waktu &amp; Tanggal
                      </th>
                      <th className="py-3 px-4 font-semibold">Pelanggan</th>
                      <th className="py-3 px-4 font-semibold">Kasir</th>
                      <th className="py-3 px-4 font-semibold">Metode Bayar</th>
                      <th className="py-3 px-4 text-right font-semibold">
                        Total Transaksi
                      </th>
                    </tr>
                  </thead>
                  <tbody className="text-on-surface divide-y divide-outline-variant/20">
                    {loading ? (
                      <tr>
                        <td
                          colSpan={6}
                          className="py-8 text-center text-xs text-on-surface-variant"
                        >
                          Memuat data transaksi...
                        </td>
                      </tr>
                    ) : loadError ? (
                      <tr>
                        <td
                          colSpan={6}
                          className="py-8 text-center text-xs text-[#93000a]"
                        >
                          {loadError}{' '}
                          <button
                            type="button"
                            onClick={fetchOrders}
                            className="font-semibold underline cursor-pointer"
                          >
                            Coba lagi
                          </button>
                        </td>
                      </tr>
                    ) : recentTransactions.length === 0 ? (
                      <tr>
                        <td
                          colSpan={6}
                          className="py-8 text-center text-xs text-on-surface-variant"
                        >
                          {selectedChartPeriod
                            ? `Belum ada transaksi pada ${selectedChartPeriod.label}.`
                            : 'Belum ada transaksi yang sesuai.'}
                        </td>
                      </tr>
                    ) : (
                      recentTransactions.map((ord) => {
                        const itemSummary =
                          ord.items && ord.items.length > 0
                            ? ord.items
                                .map(
                                  (i) =>
                                    `${i.quantity}x ${i.product?.name || 'Menu'}`
                                )
                                .join(', ')
                            : 'Pesanan Menu';

                        const createdDate = ord.createdAt
                          ? new Date(ord.createdAt)
                          : null;
                        const timeStr =
                          createdDate && !isNaN(createdDate.getTime())
                            ? `${createdDate.toLocaleTimeString('id-ID', {
                                hour: '2-digit',
                                minute: '2-digit',
                              })} WIB`
                            : '-';
                        const dateStr =
                          createdDate && !isNaN(createdDate.getTime())
                            ? createdDate.toLocaleDateString('id-ID', {
                                day: '2-digit',
                                month: 'short',
                                year: 'numeric',
                              })
                            : '-';

                        return (
                          <tr
                            key={ord.id}
                            className="hover:bg-surface-container-low/60 transition-colors"
                          >
                            <td className="py-3.5 px-4">
                              <div className="flex flex-col">
                                <span className="font-mono font-semibold text-on-surface text-[14px]">
                                  {ord.orderNumber}
                                </span>
                                <span className="text-[12px] text-on-surface-variant truncate max-w-55">
                                  {itemSummary}
                                </span>
                              </div>
                            </td>
                            <td className="py-3.5 px-4">
                              <div className="flex flex-col">
                                <span className="font-medium text-on-surface">
                                  {timeStr}
                                </span>
                                <span className="text-[12px] text-on-surface-variant">
                                  {dateStr}
                                </span>
                              </div>
                            </td>
                            <td className="py-3.5 px-4">
                              <div className="flex flex-col">
                                <span className="font-medium text-on-surface">
                                  {ord.customerName || 'Pelanggan Umum'}
                                </span>
                                <span className="text-[11px] text-on-surface-variant">
                                  {ord.paymentStatus === 'PAID'
                                    ? 'Lunas (PAID)'
                                    : 'Menunggu (PENDING)'}
                                </span>
                              </div>
                            </td>
                            <td className="py-3.5 px-4">
                              <span className="font-medium text-on-surface">
                                {ord.cashier?.name ||
                                  user?.name ||
                                  "Admin D'Cafein"}
                              </span>
                            </td>
                            <td className="py-3.5 px-4">
                              {ord.paymentMethod === 'CASH' ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] bg-surface-container font-medium text-on-surface">
                                  <Banknote className="w-3.5 h-3.5 text-on-surface-variant" />
                                  <span>Tunai</span>
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] bg-[#cde5ff] text-[#003554] font-semibold">
                                  <QrCode className="w-3.5 h-3.5" />
                                  <span>QRIS</span>
                                </span>
                              )}
                            </td>
                            <td className="py-3.5 px-4 text-right">
                              <span className="font-semibold text-on-surface text-[14px]">
                                {formatRupiah(Number(ord.totalAmount || 0))}
                              </span>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};