import { Router } from 'express';
import { randomBytes } from 'node:crypto';
import { prisma } from '../db.js';
import { requireAuth } from '../middleware/auth.js';
const router = Router();

router.get('/', requireAuth, async (req, res, next) => {
  try {
    const wallet = await prisma.wallet.findUnique({
      where: { userId: req.user.sub },
      include: { entries: { orderBy: { createdAt: 'desc' }, take: 30 } }
    });
    if (!wallet) return res.status(404).json({ error: 'Không tìm thấy ví.' });
    res.json({
      balance: wallet.balance.toString(),
      entries: wallet.entries.map(e => ({ ...e, amount: e.amount.toString() }))
    });
  } catch (e) { next(e); }
});

// Chỉ tạo yêu cầu. Tuyệt đối không cộng số dư ở endpoint này.
router.post('/deposits', requireAuth, async (req, res, next) => {
  try {
    const amount = Number(req.body.amount);
    if (!Number.isSafeInteger(amount) || amount < 10000 || amount > 100000000) {
      return res.status(400).json({ error: 'Số tiền nạp phải từ 10.000 đến 100.000.000 VND.' });
    }
    const transferCode = `HH${randomBytes(6).toString('hex').toUpperCase()}`;
    const deposit = await prisma.deposit.create({
      data: { userId: req.user.sub, amount: BigInt(amount), provider: 'UNCONFIGURED', transferCode }
    });
    res.status(201).json({
      id: deposit.id, amount: amount.toString(), transferCode,
      status: deposit.status,
      message: 'Đã tạo yêu cầu chờ thanh toán. Số dư chưa thay đổi; cần webhook nhà cung cấp đã xác minh.'
    });
  } catch (e) { next(e); }
});
export default router;
