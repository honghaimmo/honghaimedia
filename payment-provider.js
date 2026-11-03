/**
 * Adapter thanh toán bị khóa có chủ đích.
 * Chỉ triển khai sau khi chọn nhà cung cấp, đọc tài liệu API chính thức,
 * xác minh chữ ký webhook, timestamp, amount, currency, merchant và idempotency.
 */
export function assertPaymentProviderConfigured() {
  throw new Error('Cổng thanh toán chưa được cấu hình. Yêu cầu nạp tiền vẫn ở trạng thái pending.');
}
