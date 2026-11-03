# Hồng Hải Marketplace — nền tảng khởi đầu

Đây là **giai đoạn 1: nền móng backend + frontend**, không phải tuyên bố sàn đã sẵn sàng vận hành thương mại.
Các tích hợp thanh toán/ngân hàng/thẻ cào, OTP email/SMS, AI và lưu trữ ảnh cần tài khoản nhà cung cấp và cấu hình thật.

## Stack
- Node.js 20+, Express, Prisma, PostgreSQL
- Argon2id, JWT phiên ngắn trong cookie HttpOnly, Helmet, rate limit
- Giao dịch ví và đặt hàng dùng transaction phía PostgreSQL
- Frontend tĩnh có thể triển khai GitHub Pages; backend phải triển khai riêng

## Chạy local
1. Cài Node.js 20+ và PostgreSQL.
2. Sao chép `.env.example` thành `.env`, điền `DATABASE_URL` và `SESSION_SECRET` ngẫu nhiên dài.
3. `npm install`
4. `npx prisma generate`
5. `npx prisma migrate dev --name init`
6. `npm run dev`
7. Mở `http://localhost:3000`

## Lưu ý triển khai
- Không commit `.env`, khóa bí mật, dữ liệu tài khoản trong kho hoặc thông tin thanh toán.
- Bật HTTPS ở reverse proxy/hosting; đặt `COOKIE_SECURE=true`.
- Thêm email/SMS OTP, CSRF token theo origin, giám sát, backup và quy trình khôi phục trước khi mở công khai.
- Chỉ kinh doanh tài khoản/vật phẩm mà người bán có quyền chuyển nhượng và nền tảng liên quan cho phép. Không bán tài khoản chiếm đoạt, tài khoản xác minh giả, lượt tương tác giả hoặc dịch vụ né cơ chế bảo mật.
- Nạp tiền hiện chỉ tạo yêu cầu `pending`. Không có tự cộng tiền. Chỉ webhook đã xác thực từ nhà cung cấp mới được phép ghi có.
- Tích hợp cổng thanh toán trong `src/services/payment-provider.js` đang bị khóa có chủ đích cho đến khi cấu hình nhà cung cấp thật.
- Chưa bật rút tiền, thẻ cào, affiliate payout hoặc giao hàng tự động nếu chưa có quy trình đối soát và kiểm thử bảo mật.

## API hiện có
- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/logout`
- `GET /api/me`
- `GET /api/products`
- `POST /api/wallet/deposits` (tạo yêu cầu pending, không cộng số dư)
- `GET /api/wallet`
- `POST /api/orders` (thanh toán ví, khóa kho và trừ tiền nguyên tử)
- `GET /api/orders`

## Trạng thái
Giai đoạn 1 chỉ cung cấp nền tảng kỹ thuật tối thiểu để tiếp tục phát triển. Trước khi nhận tiền thật cần hoàn tất xác minh email/OTP, CSRF, webhook theo tài liệu nhà cung cấp, phân quyền admin, kiểm thử, logging/monitoring và đánh giá pháp lý.
