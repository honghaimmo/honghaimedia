import { Router } from 'express';
import argon2 from 'argon2';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { prisma } from '../db.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();
const credentials = z.object({
  email: z.string().email().max(254),
  password: z.string().min(12).max(128)
});

router.post('/register', async (req, res, next) => {
  try {
    const parsed = credentials.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: 'Email hoặc mật khẩu không hợp lệ. Mật khẩu tối thiểu 12 ký tự.' });
    const email = parsed.data.email.toLowerCase();
    const passwordHash = await argon2.hash(parsed.data.password, { type: argon2.argon2id });
    const user = await prisma.user.create({
      data: { email, passwordHash, wallet: { create: {} } },
      select: { id: true, email: true, role: true }
    });
    res.status(201).json({ user, message: 'Tạo tài khoản thành công. Cần bổ sung xác minh email trước khi mở đăng ký công khai.' });
  } catch (e) { next(e); }
});

router.post('/login', async (req, res, next) => {
  try {
    const parsed = credentials.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: 'Thông tin đăng nhập không hợp lệ.' });
    const user = await prisma.user.findUnique({ where: { email: parsed.data.email.toLowerCase() } });
    if (!user || !(await argon2.verify(user.passwordHash, parsed.data.password))) {
      return res.status(401).json({ error: 'Email hoặc mật khẩu không đúng.' });
    }
    const token = jwt.sign({ sub: user.id, role: user.role }, process.env.SESSION_SECRET, { expiresIn: '2h', issuer: 'honghai-market' });
    res.cookie('session', token, {
      httpOnly: true, secure: process.env.COOKIE_SECURE === 'true',
      sameSite: 'strict', maxAge: 2 * 60 * 60 * 1000, path: '/'
    });
    res.json({ user: { id: user.id, email: user.email, role: user.role } });
  } catch (e) { next(e); }
});

router.post('/logout', (_req, res) => {
  res.clearCookie('session', { httpOnly: true, sameSite: 'strict', secure: process.env.COOKIE_SECURE === 'true', path: '/' });
  res.status(204).end();
});

router.get('/me', requireAuth, async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.sub },
      select: { id: true, email: true, role: true, createdAt: true }
    });
    if (!user) return res.status(401).json({ error: 'Tài khoản không tồn tại.' });
    res.json({ user });
  } catch (e) { next(e); }
});

export default router;
