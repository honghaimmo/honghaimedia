import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../db.js';
import { requireAuth } from '../middleware/auth.js';
const router = Router();
const orderInput = z.object({ productId: z.string().min(1) });

router.post('/', requireAuth, async (req, res, next) => {
  const parsed = orderInput.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Sản phẩm không hợp lệ.' });
  try {
    const result = await prisma.$transaction(async tx => {
      const product = await tx.product.findFirst({ where: { id: parsed.data.productId, active: true } });
      if (!product) throw Object.assign(new Error('Sản phẩm không tồn tại.'), { status: 404 });

      const wallet = await tx.wallet.findUnique({ where: { userId: req.user.sub } });
      if (!wallet || wallet.balance < product.price) throw Object.assign(new Error('Số dư ví không đủ.'), { status: 400 });

      // Khóa một mặt hàng kho để tránh hai khách mua cùng một tài khoản.
      const stock = await tx.inventoryItem.findFirst({
        where: { productId: product.id, status: 'AVAILABLE' },
        orderBy: { createdAt: 'asc' }
      });
      if (product.type === 'GAME_ACCOUNT' && !stock) {
        throw Object.assign(new Error('Sản phẩm hiện đã hết hàng.'), { status: 409 });
      }
      if (stock) {
        const reserved = await tx.inventoryItem.updateMany({
          where: { id: stock.id, status: 'AVAILABLE' },
          data: { status: 'RESERVED' }
        });
        if (reserved.count !== 1) throw Object.assign(new Error('Kho vừa thay đổi, vui lòng thử lại.'), { status: 409 });
      }

      const order = await tx.order.create({
        data: {
          userId: req.user.sub, status: 'PAID', total: product.price,
          lines: { create: { productId: product.id, inventoryItemId: stock?.id, unitPrice: product.price } }
        }
      });
      const debit = await tx.wallet.updateMany({
        where: { id: wallet.id, balance: { gte: product.price } },
        data: { balance: { decrement: product.price } }
      });
      if (debit.count !== 1) throw Object.assign(new Error('Số dư không đủ.'), { status: 409 });

      await tx.ledgerEntry.create({
        data: {
          walletId: wallet.id, type: 'PURCHASE', amount: -product.price,
          reference: `ORDER-${order.id}`, description: `Thanh toán đơn ${order.id}`
        }
      });
      // Chuyển RESERVED -> SOLD trong cùng transaction; giao dữ liệu bí mật qua endpoint bảo vệ riêng ở giai đoạn tiếp.
      if (stock) await tx.inventoryItem.update({ where: { id: stock.id }, data: { status: 'SOLD' } });
      return { id: order.id, status: order.status, total: product.price.toString() };
    }, { isolationLevel: 'Serializable' });
    res.status(201).json({ order: result, message: 'Đặt hàng và trừ ví thành công.' });
  } catch (e) { next(e); }
});

router.get('/', requireAuth, async (req, res, next) => {
  try {
    const orders = await prisma.order.findMany({
      where: { userId: req.user.sub }, orderBy: { createdAt: 'desc' }, take: 50,
      include: { lines: { include: { product: { select: { name: true, slug: true } } } } }
    });
    res.json({ items: orders.map(o => ({ ...o, total: o.total.toString() })) });
  } catch (e) { next(e); }
});
export default router;
