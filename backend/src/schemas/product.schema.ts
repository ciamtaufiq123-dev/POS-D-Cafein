import { z } from 'zod';

export const productSchema = z.object({
    name: z.string().min(2, 'Nama produk minimal 2 karakter'),
    price: z.coerce.number().min(1000, 'Harga minimal Rp 1.000'),
    stock: z.coerce.number().min(0, 'Stok tidak boleh minus'),
    categoryId: z.string().uuid('ID Kategori tidak valid'),
    isAvailable: z.coerce.boolean().optional(),
});