import { Request, Response } from 'express';
import { Prisma } from '@prisma/client';
import { prisma } from '../config/db';
import { CreateOrderInput } from '../schemas/order.schema';

const midtransClient = require('midtrans-client')

const getSnapClient = () => {
    return new midtransClient.Snap({
        isProduction: false,
        serverKey: process.env.MIDTRANS_SERVER_KEY || '',
        clientKey: process.env.MIDTRANS_CLIENT_KEY || '',
    });
};

export const createOrder = async (req: Request, res: Response ): Promise<void> => {
    try {
        const { customerName, paymentMethod, amountPaid, items } = req.body as CreateOrderInput;
        const cashierId = req.user!.id;

        const productIds = items.map((item) => item.productId);
        const products = await prisma.product.findMany({
            where: { id: { in: productIds } },
        });

        let totalAmount = 0;
        const orderItemsData: Array <{
            productId: string;
            name: string;
            quantity: number;
            priceAtTime: number;
            subtotal: number;
        }> = [];

        for (const item of items) {
            const product = products.find((p) => p.id === item.productId);
            if (!product) {
                res.status(404).json({
                    message : 'Produk tidak ditemukan'
                });
                return;
            }
            if (product.stock < item.quantity) {
                res.status(400).json({
                    message: `Stok ${product.name} tidak cukup, (Sisa: ${product.stock})`,
                });
                return;
            }

            const subtotal = product.price * item.quantity;
            totalAmount += subtotal;

            orderItemsData.push({
                productId: product.id,
                name: product.name,
                quantity: item.quantity,
                priceAtTime: product.price,
                subtotal,
            });
        }

        if (paymentMethod === 'CASH') {
            if (!amountPaid || amountPaid < totalAmount) {
                res.status(400).json({
                    message: `Uang tunai (Rp ${amountPaid || 0}) kurang dari total tagihan (Rp ${totalAmount})`,
                });
                return;
            }
        }

        const orderNumber = `INV-${Date.now()}`;

        if (paymentMethod === 'CASH') {
            const changeAmount = amountPaid! - totalAmount;
            
            const order = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
                for (const item of orderItemsData) {
                    await tx.product.update({
                        where: { id: item.productId },
                        data: { stock: { decrement: item.quantity } }
                    });
                }

                return await tx.order.create({
                    data: {
                        orderNumber,
                        customerName: customerName || 'Pelanggan Umum',
                        totalAmount,
                        paymentMethod: 'CASH',
                        paymentStatus: 'PAID',
                        amountPaid: amountPaid!,
                        changeAmount,
                        cashierId,
                        items: {
                            create: orderItemsData.map((i) => ({
                                productId: i.productId,
                                quantity: i.quantity,
                                priceAtTime: i.priceAtTime,
                                subtotal: i.subtotal
                            })),
                        },
                    },
                    include: {
                        items: { include: { product: true } },
                        cashier: { select: { name: true } },
                    },
                });
            });

            res.status(201).json({
                message: 'Transaksi tunai berhasil',
                data: order,
            });
            return;
        }

        const snap = getSnapClient();
        const parameter = {
            transaction_details: {
                order_id: orderNumber,
                gross_amount: totalAmount,
            },
            customer_details: {
                first_name: customerName || 'Pelanggang D\'cafein',
            },
            item_details: orderItemsData.map((item) => ({
                id: item.productId,
                price: item.priceAtTime,
                quantity: item.quantity,
                name: item.name.substring(0, 50)
            })),
        };

        const transaction = await snap.createTransaction(parameter);
        const snapToken: string = transaction.token;

        const order = await prisma.order.create({
            data: {
                orderNumber,
                customerName: customerName || 'pelanggan Umum',
                totalAmount,
                paymentMethod: 'MIDTRANS',
                paymentStatus: 'PENDING',
                snapToken,
                cashierId,
                items: {
                    create: orderItemsData.map((i) => ({
                        productId: i.productId,
                        quantity: i.quantity,
                        priceAtTime: i.priceAtTime,
                        subtotal: i.subtotal,
                    })),
                },
            },
            include: {
                items: { include: { product: true } },
                cashier: { select: { name: true } },
            },
        });

        res.status(201).json({
            message: 'Token Midtrans sandbox berhasil dibuat',
            data: order,
            snapToken
        });
    } catch (error) {
        console.error('Create order error:', error);
        res.status(500).json({
            message: 'Gagal memproses transaksi'
        });
    }
};

export const confirmMidtransPayment = async (req: Request, res: Response): Promise<void> => {
    try {
        const id = String(req.params.id);

        const existingOrder = await prisma.order.findUnique({
            where: { id },
            include: { items: true },
        });

        if (!existingOrder) {
            res.status(404).json({
                message: 'Pesanan tidak ditemukan'
            });
            return;
        }

        if (existingOrder.paymentStatus === 'PAID') {
            res.json({ message: 'Pesanan sudah berstatus LUNAS', data: existingOrder });
            return;
        }

        const updateOrder = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
            for (const item of existingOrder.items) {
                await tx.product.update({
                    where: { id: item.productId },
                    data: { stock: { decrement: item.quantity } },
                });
            }

            return await tx.order.update({
                where: { id },
                data: {
                    paymentStatus: 'PAID',
                    amountPaid: existingOrder.totalAmount,
                    changeAmount: 0,
                },
                include: {
                    items: { include: { product: true } },
                    cashier: { select: { name: true } },
                },
            });
        });

        res.json({
            message: 'Pembayaran berhasil di konfirmasi',
            data: updateOrder,
        });
    } catch (error) {
        console.error('Confirm payment error:', error);
        res.status(500).json({ message: 'Gagal mengonfirmasi pembayaran' });
    }
};

export const getOrders = async(req: Request, res: Response): Promise<void> => {
    try {
        const orders = await prisma.order.findMany({
            include: {
                cashier: { select: { id: true, name: true, role: true } },
                items: { include: { product: { select: { name: true, imageUrl: true } } } },
            },
            orderBy: { createdAt: 'desc'},
        });

        res.json({ data: orders })
    } catch (error) {
        res.status(500).json({
            message: 'Gagal mengambil riwayat transaksi'
        });
    }
};

export const getDashboardSummary = async(_req: Request, res: Response): Promise<void> => {
    try {
        const now = new Date();
        const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

        const sevenDaysAgo = new Date(startOfToday);
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);

        const paidOrders = await prisma.order.findMany({
            where: {
                paymentStatus: 'PAID',
                createdAt: { gte: sevenDaysAgo },
            },
            include: { items: true },
        });

        const todayOrdersList = paidOrders.filter((o) => o.createdAt >= startOfToday);
        const todayRevenue = todayOrdersList.reduce((sum, o) => sum + o.totalAmount, 0);
        const todayOrderCount = todayOrdersList.length;
        const todayItemsSold = todayOrdersList.reduce((sum, o) => sum + o.items.reduce((acc, item) => acc + item.quantity, 0), 0);

        const dayNames = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
        const revenueChart = Array.from({ length: 7}).map((_, index) => {
            const targetDate = new Date(sevenDaysAgo);
            targetDate.setDate(sevenDaysAgo.getDate() + index);
            const nextDate = new Date(targetDate);
            nextDate.setDate(targetDate.getDate() + 1);

            const dailyTotal = paidOrders
            .filter((o) => o.createdAt >= targetDate && o.createdAt < nextDate)
            .reduce((sum, o) => sum + o.totalAmount, 0);

            return {
                date: targetDate.toISOString().split('T')[0],
                day: dayNames[targetDate.getDay()],
                revenue: dailyTotal,
            };
        });

        const cashCount = paidOrders.filter((o) => o.paymentMethod === 'CASH').length;
        const midtransCount = paidOrders.filter((o) => o.paymentMethod === 'MIDTRANS').length;

        res.json({
            data: {
                todayRevenue,
                todayOrderCount,
                todayItemsSold,
                revenueChart,
                paymentMethodChart: [
                    { name: 'Tunai (Cash)', value: cashCount },
                    { name: 'MidTrans Sanbox', value: midtransCount },
                ],
            },
        });
    } catch (error) {
        console.error('Summary error:', error);
        res.status(500).json({
            message: 'Gagal mengambil statistik laporan'
        });
    }
};