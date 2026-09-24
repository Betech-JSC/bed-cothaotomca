# Danh Sách Công Việc Triển Khai: Thanh Voucher Capsule Pill Bar & Brand UI (voucher-capsule-bar-brand-ui)

## 1. Chuẩn Bị & Khai Báo Đa Ngôn Ngữ (i18n & Types)

- [x] 1.1 Cập nhật interface `VoucherTicketBarProps` trong `src/components/Checkout/VoucherTicketBar.tsx`: bổ sung prop `onRemove?: () => void` và prop hỗ trợ chiến dịch giỏ hàng nếu có.
- [x] 1.2 Bổ sung các bản dịch mới vào `src/i18n/locales/vi.json` và `en.json` thuộc namespace `voucher`: `no_voucher_applied`, `btn_select_voucher`, `btn_remove_voucher`, `applied_vouchers_success_count`, `voucher_capsule_status`.

## 2. Tái Cấu Trúc Component Giao Diện Thanh Voucher (Capsule Pill Bar UI)

- [x] 2.1 Tách nhãn tiêu đề `Mã giảm giá (Voucher)` ra bên ngoài và nằm phía trên khung capsule với font `font-display`, in đậm `font-bold` và màu chữ thương hiệu `text-primary` (`#142A68`).
- [x] 2.2 Tạo khung chứa dạng viên thuốc bo tròn toàn phần: `rounded-full border border-gray-300 p-1.5 bg-white flex items-center justify-between gap-2 flex-wrap sm:flex-nowrap`.
- [x] 2.3 Xây dựng hệ thống thẻ ưu đãi dạng viên thuốc (Pill Chips) `rounded-full px-3 py-1 text-xs uppercase font-bold` chuẩn 3 tone màu thương hiệu:
  - Chip Món ăn/Đơn: Nền phớt cam `#FDF0ED`, viền `#CD4829`, chữ cam Brand `#CD4829`.
  - Chip Vận chuyển/Freeship: Nền phớt xanh `#EBF0FA`, viền `#142A68`, chữ xanh Brand `#142A68` (hoặc xanh ngọc `#00BFA5`).
  - Chip Chiến dịch: Nền vàng kem `#FEF9E7`, viền `#F5D585`, chữ vàng nâu `#8A5800`.
- [x] 2.4 Tích hợp 2 nút thao tác dạng viên thuốc bên trong khung:
  - Nút `Chọn mã`: `rounded-full px-3.5 py-1 text-xs font-bold bg-gray-100 hover:bg-gray-200 text-gray-700 cursor-pointer` gọi callback `onClick`.
  - Nút `Xóa`: `rounded-full px-3 py-1 text-xs font-bold bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 cursor-pointer` gọi callback `onRemove` khi có mã được áp dụng.
- [x] 2.5 Hiển thị trạng thái chưa áp dụng mã (Empty State): hiển thị văn bản placeholder `Chưa áp dụng mã ưu đãi` (màu xám `text-gray-400 font-medium pl-2`) và nút `Chọn mã`.
- [x] 2.6 Hiển thị dòng trạng thái phản hồi tích cực bên dưới khung: `✓ Đã áp dụng thành công X ưu đãi!` (icon check xanh lá, chữ xanh đậm `text-emerald-700` hoặc `text-green-700 font-semibold text-xs`) kèm theo ghi chú điều kiện (nếu có).

## 3. Tích Hợp Vào Màn Hình Thanh Toán & Giỏ Hàng

- [x] 3.1 Cập nhật `src/components/Checkout/CheckoutForm.tsx`: truyền callback `onRemove={handleRemoveVoucher}` vào component thanh voucher và đồng bộ hiển thị các thông báo điều kiện.
- [x] 3.2 Cập nhật `src/components/Header/MobileCartFlow.tsx`: truyền callback `onRemove={handleRemoveVoucher}` vào component thanh voucher trong drawer giỏ hàng di động.

## 4. Kiểm Thử & Đảm Bảo Chất Lượng (Testing & QA)

- [x] 4.1 Cập nhật và mở rộng test suite `src/__tests__/VoucherTicketBar.test.tsx` kiểm thử toàn diện:
  - Tiêu đề nằm độc lập phía trên khung với đúng kiểu chữ và màu sắc.
  - Khung bao bọc có class `rounded-full border border-gray-300 p-1.5`.
  - Các Pill Chips hiển thị đúng màu Cam Brand `#CD4829`, Xanh Brand `#142A68`, và Vàng kem.
  - Nút `Chọn mã` mở modal voucher khi click.
  - Nút `Xóa` kích hoạt `handleRemoveVoucher` khi click.
  - Hiển thị đúng văn bản placeholder khi chưa có mã.
  - Hiển thị dòng trạng thái `✓ Đã áp dụng thành công X ưu đãi!` khi có mã.
- [x] 4.2 Chạy test tự động với Vitest (`npx vitest run src/__tests__/VoucherTicketBar.test.tsx`) đảm bảo 100% test cases pass.
- [x] 4.3 Kiểm tra type checking (`npx tsc --noEmit`) và lint để bảo đảm chất lượng code không có lỗi tiềm ẩn.
