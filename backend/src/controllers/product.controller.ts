import { Request, Response } from 'express';
import { prisma } from '../config/db';

// 1. Ambil semua kategori (untuk dropdown & filter tab)
export const getCategories = async (_req: Request, res: Response): Promise<void> => {
    try {
        const categories = await prisma.category.findMany({
        orderBy: { name: 'asc' },
    });
    res.json({ data: categories });
    } catch (error) {
        res.status(500).json({ message: 'Gagal mengambil data kategori' });
    }
};

// 2. Ambil semua produk (bisa difilter per kategori atau pencarian nama)
export const getProducts = async (req: Request, res: Response): Promise<void> => {
    try {
        const { categoryId, search } = req.query;

        const products = await prisma.product.findMany({
        where: {
            ...(categoryId ? { categoryId: String(categoryId) } : {}),
            ...(search
            ? { name: { contains: String(search), mode: 'insensitive' } }
            : {}),
        },
        include: { category: true },
        orderBy: { createdAt: 'desc' },
        });

    res.json({ data: products });
    } catch (error) {
        res.status(500).json({ message: 'Gagal mengambil data produk' });
    }
};

// 3. Tambah produk baru + Upload Gambar (Khusus ADMIN)
export const createProduct = async (req: Request, res: Response): Promise<void> => {
    try {
        const { name, price, stock, categoryId } = req.body;
        const imageUrl = req.file ? `/uploads/${req.file.filename}` : null;

    const product = await prisma.product.create({
        data: {
            name,
            price: Number(price),
            stock: Number(stock),
            categoryId,
            imageUrl,
            isAvailable: Number(stock) > 0,
        },
        include: { category: true },
        });

    res.status(201).json({
        message: 'Produk berhasil ditambahkan',
        data: product,
    });
    } catch (error) {
        console.error('Create product error:', error);
        res.status(500).json({ message: 'Gagal menambahkan produk' });
    }
};

// 4. Update produk + Gambar (Khusus ADMIN)
export const updateProduct = async (req: Request, res: Response): Promise<void> => {
    try {
        const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
        const { name, price, stock, categoryId, isAvailable } = req.body;

    const existing = await prisma.product.findUnique({ where: { id } });
    if (!existing) {
        res.status(404).json({ message: 'Produk tidak ditemukan' });
        return;
    }

    const imageUrl = req.file ? `/uploads/${req.file.filename}` : existing.imageUrl;

    const updated = await prisma.product.update({
        where: { id },
        data: {
            name: name ?? existing.name,
            price: price !== undefined ? Number(price) : existing.price,
            stock: stock !== undefined ? Number(stock) : existing.stock,
            categoryId: categoryId ?? existing.categoryId,
            imageUrl,
            isAvailable:
                isAvailable !== undefined
                    ? isAvailable === 'true' || isAvailable === true
                    : Number(stock ?? existing.stock) > 0,
        },
        include: { category: true },
    });

    res.json({
        message: 'Produk berhasil diperbarui',
        data: updated,
    });
    } catch (error) {
        console.error('Update product error:', error);
        res.status(500).json({ message: 'Gagal memperbarui produk' });
    }
};

// 5. Hapus produk (Khusus ADMIN)
export const deleteProduct = async (req: Request, res: Response): Promise<void> => {
    try {
        const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
        await prisma.product.delete({ where: { id } });
        res.json({ message: 'Produk berhasil dihapus' });
    } catch (error) {
    res.status(400).json({
        message: 'Produk tidak bisa dihapus karena sudah tercatat di riwayat transaksi',
    });
    }
};