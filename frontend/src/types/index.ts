export type UserRole = 'ADMIN' | 'CASHIER';

export interface User {
    id: string;
    name: string;
    email: string;
    role: UserRole;
}

export interface Authresponse {
    message: string;
    token: string;
    user: User;
}

export interface Category {
    id: string;
    name: string;
    createdAt?: string;
    updateAt?: string;
}

export interface Product {
    id: string;
    name: string;
    price: number;
    stock: number;
    imageUrl: string | null;
    isAvailable: boolean;
    categoryId: string;
    category?: Category;
    createdAt: string;
    updateAt: string;
}

export interface CartItem extends Product {
    quantity: number;
}

export type PaymentMethod = 'CASH' | 'MIDTRANS';
export type PaymentStatus  = 'PENDING' | 'PAID' | 'FAILED';

export interface OrderItem {
    id: string;
    orderId?: string;
    productId: string;
    quantity: number;
    price: number;
    product?: {
        id?: string;
        name: string;
        imageUrl?: string | null;
    };
}

export interface Order {
    id: string;
    orderNumber: string;
    customerName: string | null;
    totalAmount: number;
    paymentMethod: PaymentMethod;
    paymentStatus: PaymentStatus;
    snapToken: string | null;
    amountPaid: number | null;
    changeAmount: number | null;
    cashierId: string;
    cashier?: {
        id: string;
        name: string;
        email?: string;
    };
    items?: OrderItem[];
    createdAt: string;
}

export interface RevenueChartItem {
    date: string;
    day: string;
    revenue: number;
}

export interface PaymentMethodChartItem {
    name: string;
    value: number;
}

export interface DashboardSummary {
    todayRevenue: number;
    todayOrderCount: number;
    todayItemsSold: number;
    revenueChart: RevenueChartItem[];
    paymentMethodChart: PaymentMethodChartItem[];
}