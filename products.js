import { Router } from 'express';
import { prisma } from '../db.js';
const router = Router();

router.get('/', async (req, res, next) => {
  try {
    const page = Math.max(1, Number.parseInt(req.query.page || '1', 10) || 1);
    const limit = Math.min(60, Math.max(1, Number.parseInt(req.query.limit || '24', 10) || 24));
    const where = { active: true };
    if (req.query.category) where.category = String(req.query.category).slice(0, 80);
    if (req.query.type) where.type = String(req.query.type).toUpperCase();
    const [items, total] = await Promise.all([
      prisma.product.findMany({
        where, skip: (page - 1) * limit, take: limit,
        select: { id: true, slug: true, name: true, description: true, type: true, category: true, price: true },
        orderBy: { createdAt: 'desc' }
      }),
      prisma.product.count({ where })
    ]);
    res.json({ items: items.map(p => ({ ...p, price: p.price.toString() })), page, limit, total });
  } catch (e) { next(e); }
});
export default router;
