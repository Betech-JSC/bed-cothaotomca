# Tasks

## 1. CheckoutForm Mutual Exclusion Logic

- [x] 1.1 Mở rộng `isExcludedByVoucher` thành `isMemberExcludedByPromotions` tại `CheckoutForm.tsx` để kiểm tra cả voucher độc quyền và các campaign độc quyền (`can_combine_with_promotions === false`)
- [x] 1.2 Cập nhật `memberDiscount`, `isMemberApplied`, `VoucherTicketBar`, và cost summary trong `CheckoutForm.tsx` đảm bảo khi có campaign độc quyền active thì `memberDiscount = 0`, `isMemberApplied = false`, `VoucherTicketBar` chỉ hiển thị badge Campaign và `appliedCount` tính đúng 1 ưu đãi

## 2. MobileCartFlow Consistency

- [x] 2.1 Mở rộng `isExcludedByVoucher` thành `isMemberExcludedByPromotions` và cập nhật tính toán `memberDiscount` trong `MobileCartFlow.tsx` đồng nhất với `CheckoutForm.tsx`
- [x] 2.2 Cập nhật `VoucherTicketBar` và cost summary trong `MobileCartFlow.tsx` đảm bảo hiển thị đồng bộ 1 ưu đãi khi có campaign độc quyền

## 3. CouponModal Synchronization and i18n

- [x] 3.1 Cập nhật logic đóng modal và đồng bộ trạng thái `isMemberCardSelected` trong `CouponModal.tsx` để không làm bẩn state ngoài parent khi đóng modal mà không apply
- [x] 3.2 Tinh chỉnh nhãn `cost_summary.member_discount_mutex` trong `src/i18n/locales/vi.json` và `src/i18n/locales/en.json` cho bao quát cả voucher và ưu đãi chiến dịch

## 4. Verification and Build

- [x] 4.1 Chạy unit tests liên quan đến `VoucherTicketBar` bằng `npm test -- VoucherTicketBar.test.tsx` và xác minh test pass 100%
- [x] 4.2 Chạy `npm run build` trên frontend để xác nhận không có lỗi cú pháp, lint, hay TypeScript compiler error
