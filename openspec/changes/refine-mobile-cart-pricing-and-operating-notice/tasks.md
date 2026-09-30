# Tasks

## 1. Implementation

- [x] 1.1 Đảo ngược thứ tự giá món ăn trong giỏ hàng Mobile (giá bán ở trên, giá gốc gạch ngang ở dưới) trong `src/components/Header/MobileCartFlow.tsx`.
- [x] 1.2 Bổ sung prop tùy chọn `zIndex` cho `src/components/Checkout/PreOrderNoticeModal.tsx` (mặc định `"z-50"`) và truyền `zIndex="z-[200]"` trong `src/components/Header/MobileCartFlow.tsx`, đồng thời đồng bộ mở popup khi ngoài giờ phục vụ.
- [x] 1.3 Nâng cấp kích thước cảm ứng và tỷ lệ nút Ưu Đãi Nổi trên Mobile trong `src/components/Voucher/FloatingVoucherButton.tsx`.
- [x] 1.4 Hiển thị giá gốc gạch ngang cho phí giao hàng tại Step 1 và Step 2, đồng thời tách biệt giảm ship khỏi dòng Mã giảm giá (chỉ hiện tiền giảm món) trong `src/components/Header/MobileCartFlow.tsx`.

## 2. Unit Testing & Verification

- [x] 2.1 Cập nhật bộ unit test `src/__tests__/RefineMobileCartAndCheckoutUI.test.tsx` kiểm thử thứ tự giá món, dòng phí giao hàng hiển thị giá gốc gạch ngang, và dòng mã giảm giá tách biệt giảm món.
- [x] 2.2 Chạy bộ test suite vitest và xác nhận 100% test cases pass.
- [x] 2.3 Chạy kiểm tra kiểu tĩnh TypeScript (`npx tsc --noEmit`) đạt 0 lỗi.
