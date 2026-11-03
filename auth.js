import jwt from 'jsonwebtoken';

export function requireAuth(req, res, next) {
  const token = req.cookies?.session;
  if (!token) return res.status(401).json({ error: 'Vui lòng đăng nhập.' });
  try {
    req.user = jwt.verify(token, process.env.SESSION_SECRET);
    next();
  } catch {
    res.clearCookie('session');
    return res.status(401).json({ error: 'Phiên đăng nhập không hợp lệ.' });
  }
}

export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Bạn không có quyền truy cập.' });
    }
    next();
  };
}
