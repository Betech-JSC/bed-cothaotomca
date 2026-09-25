# Thiết Kế Kỹ Thuật: Thanh Voucher Capsule Pill Bar & Brand UI (voucher-capsule-bar-brand-ui)

## Context

Tại website Cô Thảo Tôm Cá, luồng giỏ hàng và thanh toán diễn ra ở hai thành phần chính:
- `CheckoutForm.tsx`: Trang thanh toán chính `/checkout` (hỗ trợ cả giao diện Desktop và Mobile).
- `MobileCartFlow.tsx`: Drawer giỏ hàng và đặt món nhanh trên thiết bị di động.

Trước đây, khu vực mã giảm giá sử dụng component `VoucherTicketBar.tsx` với kiểu dáng thẻ vé hình chữ nhật (Shopee-style ticket bar) tích hợp cả tiêu đề và badge voucher vào bên trong một khung nhấn mở modal. Thiết kế này có một số hạn chế:
1. Tiêu đề bị lồng vào trong khung cùng với thẻ voucher, làm không gian bị chật chội khi có nhiều mã (món + ship + campaign).
2. Chưa có nút thao tác trực diện (`Chọn mã`, `Xóa`), người dùng phải bấm vào toàn thanh để mở modal và gỡ mã từ bên trong modal.
3. Thiếu dòng trạng thái phản hồi tích cực bên dưới để người mua an tâm về số lượng ưu đãi đã áp dụng thành công.

Khách hàng đã cung cấp thiết kế mới dạng **Capsule Pill Bar** lấy cảm hứng từ nhận diện thương hiệu Cô Thảo Tôm Cá (màu Cam `#CD4829`, Xanh `#142A68` / `#00BFA5`, và Vàng kem `#F1EEDF` / `#8A5800`).

## Goals / Non-Goals

**Goals:**
- Tách biệt nhãn `Mã giảm giá (Voucher)` lên phía trên thanh capsule với font chữ TomCaSerif (`font-display`), màu `text-primary` (`#142A68`), in đậm.
- Xây dựng khung chứa dạng viên thuốc bo tròn toàn phần: `rounded-full border border-gray-300 p-1.5 bg-white flex items-center justify-between gap-2 flex-wrap sm:flex-nowrap`.
- Thiết kế các thẻ ưu đãi dạng viên thuốc (Pill Chips) bên trong khung với 3 tone màu chuẩn Brand:
  - Chip Giảm món/đơn: Màu Cam Brand `#CD4829` (nền `#FDF0ED`, viền `#CD4829`, chữ `#CD4829`).
  - Chip Phí ship/Freeship: Màu Xanh Brand `#142A68` hoặc Xanh ngọc `#00BFA5` (nền `#EBF0FA`, viền `#142A68`, chữ `#142A68`).
  - Chip Chiến dịch khuyến mãi/Quà tặng (nếu có): Màu Vàng kem Brand `#F1EEDF` / Vàng nâu `#8A5800` (nền `#FEF9E7`, viền `#F5D585`, chữ `#8A5800`).
- Tích hợp 2 nút thao tác dạng viên thuốc bên trong khung:
  - Nút `Chọn mã`: `rounded-full px-3.5 py-1 text-xs font-bold bg-gray-100 hover:bg-gray-200 text-gray-700 cursor-pointer`, kích hoạt mở `CouponModal`.
  - Nút `Xóa`: `rounded-full px-3 py-1 text-xs font-bold bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 cursor-pointer`, chỉ hiển thị khi có mã được áp dụng và gọi `handleRemoveVoucher`.
- Hiển thị dòng phản hồi trạng thái tích cực bên dưới khung: `✓ Đã áp dụng thành công X ưu đãi!` (Icon check xanh lá, chữ xanh đậm).
- Hỗ trợ trạng thái chưa áp dụng mã (Empty state): hiển thị văn bản gợi ý `Chưa áp dụng mã ưu đãi` kèm nút `Chọn mã`.
- Tương thích 100% với `CheckoutForm.tsx` và `MobileCartFlow.tsx`, bảo toàn đầy đủ các logic xử lý mutex lock và promotion matrix đã có.

**Non-Goals:**
- Không thay đổi thuật toán tính toán giảm giá, validate mã voucher hoặc logic mutex lock giữa voucher món và voucher ship ở phía backend/service.
- Không thay đổi cấu trúc dữ liệu giỏ hàng hoặc schema lưu trữ `localStorage`.
- Không thay đổi thiết kế nội dung bên trong modal `CouponModal` (chỉ kích hoạt mở/đóng modal từ nút `Chọn mã`).

## Decisions

### Quyết định 1: Cấu trúc Component `VoucherTicketBar` vs Tạo mới `VoucherCapsuleBar`
- **Lựa chọn**: Refactor trực tiếp component `VoucherTicketBar.tsx` (hoặc export đồng thời alias `VoucherCapsuleBar` để tương thích ngược) với các props mở rộng.
- **Lý do**:
  - `VoucherTicketBar.tsx` hiện đang được import tại `CheckoutForm.tsx`, `MobileCartFlow.tsx` và có sẵn test suite `VoucherTicketBar.test.tsx`.
  - Việc nâng cấp trực tiếp component này đảm bảo tính kế thừa, tránh code duplication và giữ vững hợp đồng giao tiếp giữa các trang checkout/cart.
- **Phương án thay thế đã cân nhắc**: Tạo file component hoàn toàn mới `VoucherCapsuleBar.tsx`. Tuy nhiên, điều này sẽ tạo ra 2 component song song cùng chức năng, gây nhầm lẫn khi bảo trì.

### Quyết định 2: Tách Tiêu đề ra ngoài Capsule Container
- **Lựa chọn**: Đặt tiêu đề `<div className="text-sm sm:text-base font-display font-bold text-primary mb-1.5">{title}</div>` phía trên khung capsule trong chính component (hoặc bọc bên ngoài container).
- **Lý do**:
  - Giúp khung capsule bên dưới chỉ tập trung vào hiển thị Chips ưu đãi và Nút bấm thao tác, tạo cảm giác thanh lịch, hiện đại và không bị rối mắt.
  - Khi thu nhỏ trên màn hình mobile hẹp (360px - 390px), tiêu đề không chiếm ngang diện tích của các chip ưu đãi.

### Quyết định 3: Thiết kế Hệ thống Pill Chips đa màu theo Brand Identity
- **Lựa chọn**: Tạo component helper `VoucherPillChip` với 3 biến thể (variant):
  - `food`: `bg-[#FDF0ED] border-[#CD4829] text-[#CD4829]` (Cam Brand Cô Thảo).
  - `ship`: `bg-[#EBF0FA] border-[#142A68] text-[#142A68]` (Xanh Navy Brand Cô Thảo) hoặc `bg-[#F0FDF9] border-[#00BFA5] text-[#00BFA5]`.
  - `campaign`: `bg-[#FEF9E7] border-[#F5D585] text-[#8A5800]` (Vàng kem / Vàng mật ong).
- **Lý do**:
  - Giúp phân biệt rõ ràng cấp độ ưu đãi: giảm trực tiếp món ăn (màu cam nổi bật kích thích vị giác), giảm phí vận chuyển (màu xanh tin cậy), và chiến dịch tặng kèm/chiết khấu giỏ hàng (màu vàng ấm áp).
  - Định dạng text đồng nhất: uppercase, font-bold, `text-xs`, padding `px-3 py-1`, bo tròn `rounded-full`.

### Quyết định 4: Cơ chế nút bấm thao tác trong khung (`Chọn mã` & `Xóa`)
- **Lựa chọn**:
  - Nút `Chọn mã`: Luôn hiển thị (kể cả khi chưa có mã lẫn khi đã có mã) để khách hàng có thể đổi mã khác nhanh chóng.
  - Nút `Xóa`: Chỉ hiển thị khi `appliedVoucher || appliedShippingVoucher || appliedCampaigns`. Khi click, gọi prop `onRemove?.()`.
- **Lý do**:
  - Cung cấp toàn quyền kiểm soát cho khách hàng ngay tại trang thanh toán mà không bắt buộc phải mở modal mới gỡ được mã.
  - Sự tách biệt giữa 2 nút bấm có màu sắc tương phản (`bg-gray-100` cho chọn và `bg-red-50 text-red-600` cho xóa) giúp ngăn chặn bấm nhầm.

### Quyết định 5: Dòng trạng thái `✓ Đã áp dụng thành công X ưu đãi!`
- **Lựa chọn**:
  - Đặt ngay bên dưới khung capsule khi tổng số lượng ưu đãi đang áp dụng (`totalAppliedCount > 0`).
  - Sử dụng icon checkmark tròn SVG màu xanh lá, đi kèm text: `✓ Đã áp dụng thành công ${totalAppliedCount} ưu đãi!`.
  - Giữ nguyên các dòng cảnh báo phụ (nếu có lỗi mutex lock hoặc ghi chú điều kiện đơn tối thiểu) bên dưới dòng trạng thái.

## Risks / Trade-offs

- **[Risk] Độ dài của Pill Chips trên màn hình mobile hẹp (< 375px) có thể làm vỡ khung**:
  → *Mitigation*: Khung capsule sử dụng `flex-wrap sm:flex-nowrap` kèm `gap-1.5`. Các chip áp dụng `truncate max-w-[120px] sm:max-w-[180px]`, text ngắn gọn súc tích (`GIẢM 50K`, `FREESHIP` hoặc `-50.000đ`).
- **[Risk] Người dùng bấm nhầm giữa nút "Xóa" và nút "Chọn mã"**:
  → *Mitigation*: Bố trí khoảng cách nút rõ ràng (`gap-1.5`), màu sắc đối lập (Xóa dùng viền đỏ nhạt cảnh báo `bg-red-50 border-red-200 text-red-600`, Chọn mã dùng tone xám trung tính `bg-gray-100 text-gray-700`).
- **[Risk] Lỗi đếm số lượng ưu đãi ở dòng trạng thái (Count Mismatch)**:
  → *Mitigation*: Tính toán `totalAppliedCount` dựa trên số lượng mã hợp lệ thực tế đang có: `(foodVoucher ? 1 : 0) + (shipVoucher ? 1 : 0) + (campaignCount || 0)`.
