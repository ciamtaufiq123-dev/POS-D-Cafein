import { jsPDF } from 'jspdf';
import type { Order } from '../types';
import { formatRupiah, formatDateTime } from '../utils/format';

export const downloadReceiptPdf = (order: Order): void => {
    const itemCount = order.items?.length || 1;
    const dynamicHeight = Math.max(130, 95 + itemCount * 12);

    const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: [80, dynamicHeight],
    });

    let y = 10;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.text("D'CAFEIN", 40, y, { align: 'center' });

    y += 5;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.text('Jl. Raya Margasari, Tangerang', 40, y, { align: 'center' });

    y += 4;
    doc.text('--------------------------------------------------', 40, y, { align: 'center' });

    y += 5;
    doc.setFontSize(8);
    doc.text(`No. Order : ${order.orderNumber}`, 5, y);
    y += 4;
    doc.text(`Tanggal   : ${formatDateTime(order.createdAt)}`, 5, y);
    y += 4;
    doc.text(`Kasir     : ${order.cashier?.name || 'Staff Kasir'}`, 5, y);
    y += 4;
    doc.text(`Pelanggan : ${order.customerName || 'Umum'}`, 5, y);

    y += 4;
    doc.text('-------------------------------------------------', 40, y, { align: 'center' });

    y += 5;
    order.items?.forEach((item) => {
        const productName = item.product?.name || 'Produk Menu';
        const subtotal = item.price * item.quantity

        doc.setFont('helvetica', 'bold');
        doc.text(productName, 5, y);
        y += 4;

        doc.setFont('helvetica', 'normal');
        doc.text(`${item.quantity} x ${formatRupiah(item.price)}`, 5, y);
        doc.text(formatRupiah(subtotal), 75, y, { align: 'right' });
        y += 5;
    });

    doc.text('------------------------------------------------', 40, y, { align: 'center' });

    y += 5;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text('TOTAL', 5, y);
    doc.text(formatRupiah(order.totalAmount), 75, y, { align: 'right' });

    y += 5;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    const methodLabel = order.paymentMethod === 'CASH' ? 'Tunai (CASH)' : 'QRIS';
    doc.text('Metode Bayar', 5, y);
    doc.text(methodLabel, 75, y, { align: 'right' });

    if (order.paymentMethod === 'CASH') {
        y += 4
        doc.text('Tunai Diterima', 5, y);
        doc.text(formatRupiah(order.amountPaid ?? order.totalAmount), 75, y, { align: 'right' });

        y += 4;
        doc.text('Kembalian', 5, y);
        doc.text(formatRupiah(order.changeAmount ?? 0), 75, y, { align: 'right' });
    }

    y += 4;
    doc.text('Status', 5, y);
    doc.text(order.paymentStatus, 75, y, { align: 'right' });

    y += 6;
    doc.text('-----------------------------------------------', 40, y, { align: 'center' });
    y += 5;
    doc.setFontSize(8);
    doc.text('Terima kasih atas kunjungan Anda!', 40, y, { align: 'center' });

    doc.save(`Struk-${order.orderNumber}.pdf`);
};