# Kế hoạch Thực hiện: Tinh giản Ví Ưu Đãi và Nâng cấp Thanh Voucher Checkout theo phong cách Shopee Ticket Bar (streamline-voucher-wallet-and-ticket-bar)

## 1. Xây dựng Component Thanh Voucher Shopee-style (`VoucherTicketBar.tsx`)

- [x] 1.1 Khởi tạo component `src/components/Checkout/VoucherTicketBar.tsx` với giao diện 1 chạm, hỗ trợ click mở `CouponModal`.
- [x] 1.2 Tích hợp Brand Ticket SVG Icon (`#CD4829`) và nhãn tiêu đề `Mã giảm giá (Voucher)`.
- [x] 1.3 Xây dựng sub-component hoặc styles cho Ticket Badges với hiệu ứng 2 vết khuyết bán nguyệt âm ở mép:
  - Thẻ giảm đơn/món: Viền & chữ `#CD4829`, nền `#FFF5F2`, hiển thị số tiền giảm trực tiếp (ví dụ: `-76,6kđ`, `-100.000đ`).
  - Thẻ Freeship: Viền & chữ `#00BFA5`, nền `#F0FDF9`, hiển thị `Miễn Phí Vận Chuyển`.
  - Mũi tên `›` ở cuối thanh.
- [x] 1.4 Hiển thị trạng thái chưa chọn mã với lời nhắc thanh lịch `Chọn hoặc nhập mã ›`.

## 2. Nâng cấp Ví Ưu Đãi: Chế độ Browse-only Mode (`CouponModal.tsx`)

- [x] 2.1 Cập nhật logic xác định `isBrowseMode = Boolean(isBrowseOnly || !isCheckoutRoute)`.
- [x] 2.2 Ẩn toàn bộ Checkbox ở tất cả các thẻ (cả `renderCampaignCard` và `renderVoucherCard`) khi `isBrowseMode` là true.
- [x] 2.3 Thay thế nút đáy modal: Khi `isBrowseMode` là true, hiển thị nút CTA lớn **"Đặt món ngay"** (`bg-secondary` `#CD4829`, chữ trắng, bo góc 2xl), click gọi `onClose()` và điều hướng tới `/product`.
- [x] 2.4 Bảo đảm prop `isBrowseOnly={true}` được truyền từ `FloatingVoucherButton.tsx`.

## 3. Tích hợp Ticket Bar vào `CheckoutForm` và `MobileCartFlow` & Sửa lỗi đếm số lượng

- [x] 3.1 Thay thế toàn bộ khối `<input>` thô, nút `Chọn mã` / `Xóa` và dòng text `✓ Đã áp dụng thành công...` trong `src/components/Checkout/CheckoutForm.tsx` bằng `VoucherTicketBar`.
- [x] 3.2 Thay thế toàn bộ khối `<input>` thô, nút `Chọn mã` / `Xóa` và dòng text phản hồi cũ trong `src/components/Header/MobileCartFlow.tsx` bằng `VoucherTicketBar`.
- [x] 3.3 Chuẩn hóa đếm số lượng trên nút CTA trong `CouponModal`: Tách bạch rõ giữa số lượng Voucher Code và Campaign, bảo đảm khi tick 1 món + 1 ship thì cả 2 đều được lưu và truyền qua `onApplyVouchers`.
- [x] 3.4 Đồng bộ trạng thái áp dụng đồng thời cả 2 voucher (món ăn và freeship) ra ngoài Ticket Bar với 2 Ticket Badges độc lập.

## 4. Bổ sung Translation Keys cho i18n

- [x] 4.1 Bổ sung các translation keys mới vào `src/i18n/locales/vi.json` (`order_now_cta`, `select_or_enter_voucher`, `voucher_ticket_title`, `freeship_badge_text`, v.v.).
- [x] 4.2 Bổ sung các bản dịch tương ứng vào `src/i18n/locales/en.json`.

## 5. Kiểm thử Tự động và Kiểm chứng Chất lượng

- [x] 5.1 Viết unit tests kiểm thử `VoucherTicketBar` hiển thị đúng trạng thái chưa chọn và đã chọn 1 mã / 2 mã (món + ship).
- [x] 5.2 Cập nhật test cases trong `src/__tests__/CouponModalSingleListMatrix.test.tsx` phù hợp với hành vi Browse-only Mode (ẩn checkbox, nút "Đặt món ngay").
- [x] 5.3 Chạy toàn bộ test suites (`npm run test:run` hoặc vitest) và xác minh build dự án (`npm run build`).
