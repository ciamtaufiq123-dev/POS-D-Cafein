import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  // 1. Bersihkan data lama agar tidak bentrok (urutan dari tabel anak ke induk)
    await prisma.orderItem.deleteMany();
    await prisma.order.deleteMany();
    await prisma.product.deleteMany();
    await prisma.category.deleteMany();
    await prisma.user.deleteMany();

  // 2. Buat password hash ("password123")
    const hashedPassword = await bcrypt.hash('password123', 10);

  // 3. Buat akun Admin & Kasir baru
    const admin = await prisma.user.create({
    data: {
        name: "Admin D'Cafein",
        email: 'admin@dcafein.com',
        password: hashedPassword,
        role: 'ADMIN',
    },
    });

    const cashier = await prisma.user.create({
    data: {
        name: 'Kasir Shift Pagi',
        email: 'kasir@dcafein.com',
        password: hashedPassword,
        role: 'CASHIER',
    },
    });

  // 4. Buat Kategori
    const coffee = await prisma.category.create({ data: { name: 'Coffee' } });
    const nonCoffee = await prisma.category.create({ data: { name: 'Non-Coffee' } });
    const snack = await prisma.category.create({ data: { name: 'Snack' } });

  // 5. Buat Menu Awal
    await prisma.product.createMany({
    data: [
        { name: 'Kopi Susu Gula Aren', price: 18000, stock: 50, categoryId: coffee.id },
        { name: 'Ice Americano', price: 15000, stock: 40, categoryId: coffee.id },
        { name: 'Matcha Latte Ice', price: 22000, stock: 35, categoryId: nonCoffee.id },
        { name: 'French Fries', price: 16000, stock: 25, categoryId: snack.id },
    ],
    });

    console.log('Seeding berhasil di-reset dan diisi ulang!');
    console.log('Admin :', admin.email, '| Pass: password123');
    console.log('Kasir :', cashier.email, '| Pass: password123');
}

main()
    .catch((e) => {
        console.error('Seeding gagal:', e);
        process.exit(1);
    })
    .finally(async () => {
    await prisma.$disconnect();
    });