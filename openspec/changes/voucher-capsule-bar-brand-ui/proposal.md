# Đề xuất Thay đổi: Tinh chỉnh Giao diện Thanh Voucher theo Thiết kế Capsule Pill Bar và Màu Brand (voucher-capsule-bar-brand-ui)

## Why

Thanh Voucher tại trang Đặt hàng / Thanh toán (`CheckoutForm.tsx`) và Giỏ hàng di động (`MobileCartFlow.tsx`) hiện đang sử dụng thiết kế thẻ vé chữ nhật (Ticket Bar) gộp chung tiêu đề và badge vào cùng một khối clickable, chưa có nút bấm thao tác rõ ràng (`Chọn mã`, `Xóa`), đồng thời thiếu dòng trạng thái phản hồi tích cực trực quan khi khách hàng đã áp dụng ưu đãi thành công.

Nhằm nâng cấp trải nghiệm người dùng theo thiết kế mới của Cô Thảo Tôm Cá, khối Voucher cần được tái cấu trúc thành dạng **Capsule Pill Bar** (khung bao bọc bo tròn toàn phần dạng viên thuốc), đưa nhãn Tiêu đề ra ngoài ở phía trên để tạo sự thông thoáng, sử dụng các thẻ ưu đãi dạng viên thuốc (Pill Chips) chuẩn màu nhận diện Brand (Cam Brand `#CD4829`, Xanh Brand `#142A68` / `#00BFA5`, Vàng kem Brand `#F1EEDF` / `#8A5800`), tích hợp các nút thao tác nhanh (`Chọn mã`, `Xóa`), và bổ sung dòng phản hồi trạng thái `✓ Đã áp dụng thành công X ưu đãi!` bên dưới khung. Thay đổi này giúp khách hàng dễ dàng nhận biết ưu đãi đang hưởng, thao tác thêm/gỡ mã nhanh chóng, tăng độ uy tín và nâng cao tỷ lệ hoàn tất đơn hàng.

## What Changes

1. **Tách biệt Tiêu đề lên phía trên (Title Above Capsule)**:
   - Đưa nhãn tiêu đề `Mã giảm giá (Voucher)` ra ngoài khung capsule, nằm ở phía trên.
   - Định dạng kiểu chữ: Font TomCaSerif (`font-display`), chữ màu xanh đậm thương hiệu `text-primary` (`#142A68`), độ đậm `font-bold`, kích thước vừa vặn hài hòa với bố cục form.

2. **Khung bao bọc dạng viên thuốc (Capsule Container)**:
   - Khung bao bọc bên ngoài bo tròn toàn phần: `rounded-full border border-gray-300 p-1.5 bg-white flex items-center justify-between gap-2 flex-wrap sm:flex-nowrap`.
   - Đảm bảo hiển thị gọn gàng trên cả màn hình Desktop và Mobile (hỗ trợ co giãn, wrap linh hoạt khi nhiều chip).

3. **Thẻ ưu đãi dạng viên thuốc (Pill Chips) chuẩn nhận diện thương hiệu**:
   - Bên trong khung capsule, các ưu đãi đã áp dụng được biểu diễn bằng các chip viên thuốc bo tròn (`rounded-full px-3 py-1 text-xs uppercase font-bold`), áp dụng đúng bảng màu Brand Cô Thảo Tôm Cá:
     - **Chip Giảm tiền món / Đơn hàng** (ví dụ: `GIẢM 20K`, `GIẢM 50K` hoặc `-50.000đ`): Màu **Cam Brand `#CD4829`** (nền phớt cam `#FDF0ED`, viền `#CD4829`, chữ `#CD4829`).
     - **Chip Phí vận chuyển / Freeship** (ví dụ: `SHIP 30K`, `FREESHIP`): Màu **Xanh Brand `#142A68` hoặc Xanh ngọc `#00BFA5`** (nền phớt xanh `#EBF0FA`, viền `#142A68`, chữ `#142A68`).
     - **Chip Chiến dịch / Ưu đãi thêm** (ví dụ: `ƯU ĐÃI THÊM 5%`, `TẶNG QUÀ` nếu có CTKM giỏ hàng): Màu **Vàng kem Brand `#F1EEDF` / Vàng nâu `#8A5800`** (nền `#FEF9E7`, viền `#F5D585`, chữ `#8A5800`).

4. **Tích hợp các nút thao tác viên thuốc bên trong khung (Action Buttons)**:
   - Nút **`Chọn mã`**: Dạng viên thuốc `rounded-full px-3.5 py-1 text-xs font-bold bg-gray-100 hover:bg-gray-200 text-gray-700 cursor-pointer transition-colors`. Bấm vào sẽ mở modal chọn mã ưu đãi (`CouponModal`).
   - Nút **`Xóa`**: Dạng viên thuốc `rounded-full px-3 py-1 text-xs font-bold bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 cursor-pointer transition-colors`. Nút này hiển thị khi có ít nhất một mã ưu đãi đang được áp dụng; khi bấm sẽ kích hoạt hàm gỡ mã (`handleRemoveVoucher`).

5. **Trạng thái khi chưa chọn mã (Empty State)**:
   - Bên trong khung capsule hiển thị văn bản placeholder trang nhã: `Chưa áp dụng mã ưu đãi` (màu xám `text-gray-400`, `text-xs sm:text-sm`, `pl-2 font-medium`).
   - Kèm theo nút **`Chọn mã`** nổi bật bên phải để kích thích khách hàng khám phá khuyến mãi.

6. **Dòng trạng thái và ghi chú bên dưới khung (Status & Notes Below Capsule)**:
   - Khi có ưu đãi đã áp dụng, hiển thị dòng trạng thái: `✓ Đã áp dụng thành công X ưu đãi!` với icon dấu tích xanh lá (`text-green-600` / `text-emerald-600`) và chữ màu xanh đậm thanh lịch (`text-green-800` / `text-emerald-800 font-semibold text-xs`).
   - Hiển thị các thông báo điều kiện / ràng buộc khuyến mãi (nếu có: `Mã ... không áp dụng đồng thời với...`, thông tin đơn hàng tối thiểu, ghi chú ma trận khuyến mãi).

## Capabilities

### New Capabilities
- `voucher-capsule-bar`: Thành phần giao diện Thanh Voucher dạng viên thuốc (Capsule Pill Bar) chuẩn nhận diện thương hiệu Cô Thảo Tôm Cá, hỗ trợ hiển thị tiêu đề bên trên, các thẻ ưu đãi viên thuốc (Pill Chips) đa sắc màu thương hiệu, các nút hành động trực tiếp (Chọn mã, Xóa), trạng thái rỗng và dòng thông báo kết quả áp dụng bên dưới.

### Modified Capabilities
<!-- None: Dự án chưa có spec nền trong openspec/specs/ -->

## Impact

- **Frontend Components (`bed-cothaotomca`)**:
  - `src/components/Checkout/VoucherTicketBar.tsx` (hoặc nâng cấp thành Capsule Bar):
    - Cập nhật cấu trúc DOM và styles Tailwind CSS: tách tiêu đề ra trên, tạo khung `rounded-full`, render các Pill Chips Cam/Xanh/Vàng kem, thêm nút `Chọn mã` và nút `Xóa`.
    - Bổ sung prop `onRemove?: () => void` vào component props interface để hỗ trợ nút `Xóa`.
    - Thêm render dòng trạng thái `✓ Đã áp dụng thành công X ưu đãi!` kèm icon check và ghi chú điều kiện.
  - `src/components/Checkout/CheckoutForm.tsx`:
    - Truyền callback `onRemove={handleRemoveVoucher}` vào component thanh voucher.
    - Căn chỉnh layout container chứa voucher để đồng bộ hiển thị đẹp mắt.
  - `src/components/Header/MobileCartFlow.tsx`:
    - Truyền callback `onRemove={handleRemoveVoucher}` vào component thanh voucher.
    - Đồng bộ giao diện Capsule Pill Bar trong drawer giỏ hàng di động.
- **Localization (`src/i18n/locales/vi.json` & `en.json`)**:
  - Bổ sung các bản dịch đa ngôn ngữ: `no_voucher_applied`, `btn_select_voucher`, `btn_remove_voucher`, `applied_vouchers_success_count`, v.v.
- **Unit & Component Testing**:
  - Cập nhật test suite trong `src/__tests__/VoucherTicketBar.test.tsx` để kiểm tra các hành vi mới: render tiêu đề trên, hiển thị các Pill Chips theo đúng màu sắc thương hiệu, click nút `Chọn mã` mở modal, click nút `Xóa` kích hoạt callback gỡ voucher, và hiển thị dòng trạng thái thành công.
- **Backend & Database**:
  - 100% Client-side UI/UX. Không sửa đổi database, không tạo endpoint mới, hoàn toàn an toàn theo Safe Guard Policy.
