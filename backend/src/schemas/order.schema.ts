import { z } from 'zod';

export const createOrderSchema = z.object({
    customerName: z.string().optional(),
    paymentMethod: z.enum(['CASH', "MIDTRANS"]),
    amountPaid: z.coerce.number().optional(),
    items: z
        .array(
            z.object({
                productId: z.string(). uuid('ID Produk tidak valid'),
                quantity: z.coerce.number().min(1, 'Jumlah beli minimal 1'),
            })
        )
        .min(1, 'Keranjang belanja tidak boleh kosong'),
});

export type CreateOrderInput = z.infer<typeof createOrderSchema>;