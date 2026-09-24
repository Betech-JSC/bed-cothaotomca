# Thiết kế Kỹ thuật: Tinh giản Ví Ưu Đãi và Nâng cấp Thanh Voucher Checkout theo phong cách Shopee Ticket Bar (streamline-voucher-wallet-and-ticket-bar)

## Context

Hệ thống đặt hàng và thanh toán hiện tại của Bếp Cô Thảo Tôm Cá (`bed-cothaotomca`) sử dụng `CouponModal` cho việc duyệt và chọn ưu đãi, kết hợp với ô input voucher ngoài trang tại `CheckoutForm.tsx` (Desktop) và `MobileCartFlow.tsx` (Mobile Cart Drawer).

Tuy nhiên, giao diện hiện tại gặp phải 3 vấn đề lớn:
1. **Ngữ cảnh ngoài trang Checkout (Browse-only)**: Khi mở modal từ nút nổi `FloatingVoucherButton` hoặc Header ở trang chủ, các thẻ vẫn hiện Checkbox gây lúng túng cho người dùng (tưởng rằng đang chọn cho đơn hàng dù chưa đặt món). Ở đáy modal lại có nút "Bỏ qua ưu đãi và tiếp tục" không phù hợp với tâm lý duyệt món.
2. **Khu vực voucher trong trang Checkout**: Sử dụng ô input thô sơ cùng 2 nút con `Chọn mã` / `Xóa` và thông báo text màu xanh lá `✓ Đã áp dụng thành công...`. Cách bố trí này tốn diện tích, tạo cảm giác rời rạc và không theo tiêu chuẩn hiện đại của các sàn TMĐT lớn như Shopee hay Grab.
3. **Sự không nhất quán trong số đếm ưu đãi**: Do `totalAppliedCount` trong modal cộng gộp cả Chiến dịch tự động (`Campaign`) và Mã giảm giá (`Voucher Code`), người dùng tick 1 chiến dịch + 1 voucher thì modal ghi "Áp dụng • 2 ưu đãi", nhưng ngoài checkout lại hiển thị "Đã áp dụng thành công 1 ưu đãi!", gây khiếu nại "Tick 2 nhưng chỉ nhận 1".

## Goals / Non-Goals

### Goals
- **Ví ưu đãi Browse-only ngoài Checkout**:
  - Tự động nhận diện ngữ cảnh ngoài checkout (`isBrowseMode = isBrowseOnly || !isCheckoutRoute`).
  - Ẩn toàn bộ Checkbox ở tất cả các thẻ (cả thẻ Campaign và thẻ Voucher).
  - Đổi nút đáy modal thành nút CTA "Đặt món ngay" (`bg-secondary` `#CD4829`, text trắng), khi click sẽ đóng modal và điều hướng khách hàng tới `/product`.
- **Thanh Voucher Checkout (Shopee-style Ticket Bar)**:
  - Thay thế hoàn toàn khối input thô, nút bấm rời rạc và dòng phản hồi tĩnh cũ tại `CheckoutForm.tsx` và `MobileCartFlow.tsx`.
  - Hiển thị thanh thẻ vé 1 chạm với:
    - Brand Ticket SVG Icon `#CD4829` đồng bộ với `FloatingVoucherButton`.
    - Tiêu đề `Mã giảm giá (Voucher)`.
    - Trạng thái chưa chọn: Gợi ý `Chọn hoặc nhập mã ›`.
    - Trạng thái đã chọn: Các Thẻ vé ưu đãi (Ticket Badges) có vết khuyết bán nguyệt ở 2 mép:
      - Thẻ món/đơn: Viền & chữ `#CD4829`, nền `#FFF5F2`, hiển thị trực tiếp số tiền giảm (`-76,6kđ`, `-100.000đ`).
      - Thẻ Freeship: Viền & chữ xanh ngọc `#00BFA5`, nền `#F0FDF9`, hiển thị `Miễn Phí Vận Chuyển`.
      - Mũi tên `›` ở cuối thanh.
    - Click vào thanh sẽ mở `CouponModal` (chế độ Checkout có checkbox để chọn hoặc nhập mã).
- **Khắc phục lỗi đếm số lượng "Tick 2 nhưng hiện 1"**:
  - Tách bạch rõ ràng giữa Voucher Code và Campaign.
  - Loại bỏ hoàn toàn dòng thông báo tĩnh `✓ Đã áp dụng thành công X ưu đãi!`.
  - Đảm bảo khi chọn 1 mã món + 1 mã freeship thì cả 2 đều được lưu vào `localStorage`, truyền qua `onApplyVouchers`, và hiển thị song song 2 Ticket Badges trên thanh vé.

### Non-Goals
- Không thay đổi API backend hoặc cấu trúc schema cơ sở dữ liệu (`/api/v1/orders/validate-voucher`, campaign endpoints).
- Không can thiệp vào thuật toán tính toán tiền chiết khấu hay logic ma trận khuyến mãi 6 trường hợp (`calculateVoucherDiscount`, `promotionMatrix`).

## Decisions

### 1. Kiến trúc Component: Xây dựng `VoucherTicketBar` dùng chung cho CheckoutForm và MobileCartFlow
- **Lựa chọn**: Tách riêng một component chuyên biệt `src/components/Checkout/VoucherTicketBar.tsx` (hoặc đặt tại `src/components/Voucher/VoucherTicketBar.tsx`).
- **Lý do**:
  - Tránh trùng lặp code giao diện giữa `CheckoutForm.tsx` (màn hình thanh toán chính) và `MobileCartFlow.tsx` (ngăn kéo giỏ hàng di động).
  - Giúp việc quản lý styling vết khuyết bán nguyệt (ticket notches), màu sắc `#CD4829` và `#00BFA5` tập trung tại một nơi duy nhất.
  - Dễ dàng viết unit test độc lập cho Ticket Bar.
- **Phương án thay thế đã cân nhắc**: Viết trực tiếp mã JSX vào từng file -> Bị loại bỏ vì dễ gây lệch giao diện giữa desktop và mobile, khó bảo trì.

### 2. Thiết kế vết khuyết bán nguyệt (Ticket Notches) của Thẻ vé ưu đãi
- **Lựa chọn**: Sử dụng CSS container bo tròn kết hợp 2 vết khuyết bán nguyệt âm (`rounded-full`) đặt tuyệt đối tại 2 mép biên (`-left-1` và `-right-1`) khớp với màu nền thanh vé (`bg-white`).
- **Lý do**:
  - Tương thích tốt trên 100% trình duyệt di động và desktop hiện đại mà không phụ thuộc vào các thuộc tính CSS mask phức tạp hay ảnh SVG ngoài.
  - Render sắc nét, kích thước nhẹ, tự co giãn theo nội dung số tiền giảm (`-76,6kđ`, `Miễn Phí Vận Chuyển`).

### 3. Phân định Browse-only Mode trong `CouponModal`
- **Lựa chọn**:
  - `const isCheckoutRoute = Boolean(pathname && (pathname === "/checkout" || pathname.endsWith("/checkout") || pathname.includes("/checkout")));`
  - `const isBrowseMode = Boolean(isBrowseOnly || !isCheckoutRoute);`
- **Lý do**:
  - Bảo đảm modal luôn hiển thị đúng chế độ: Khi mở từ `FloatingVoucherButton` hoặc Header ở các trang khám phá, modal tự động chạy Browse-only Mode.
  - Khi ở trang Checkout, modal chuyển sang chế độ thao tác giỏ hàng (hiển thị checkbox, cho phép tick chọn hoặc gõ mã trực tiếp).
- **Hành vi Browse-only**:
  - Checkbox ở `renderCampaignCard` và `renderVoucherCard` bị ẩn hoàn toàn (`!isBrowseMode && <Checkbox ... />`).
  - Nút dưới đáy modal hiển thị nút CTA lớn màu cam đỏ `#CD4829`: **"Đặt món ngay"**. Click vào nút sẽ gọi `onClose()` và `router.push('/product')` (dùng `useRouter` từ `@/i18n/routing`).

### 4. Giải quyết triệt để lỗi "Tick 2 nhưng hiện 1"
- **Lựa chọn**:
  - Trong `CouponModal`: Tại Checkout, nhãn nút CTA đếm chính xác số voucher code được chọn: `selectedCodes.length > 0`. Nếu có kết hợp campaign, nút CTA ghi nhận rõ ràng `Áp dụng • ${selectedCodes.length} voucher` (hoặc nếu đếm tổng ưu đãi thì đồng bộ nhãn rõ ràng).
  - Loại bỏ hoàn toàn dòng chữ tĩnh `✓ Đã áp dụng thành công X ưu đãi!` ở ngoài thanh checkout, vì thanh vé đã trực tiếp hiển thị 2 huy hiệu vé riêng biệt: 1 vé món ăn (màu `#CD4829`) và 1 vé Freeship (màu `#00BFA5`).
  - Đảm bảo trong `handleApplyVouchers`: Mảng `codes` chứa cả mã món và mã ship được xác thực tuần tự, lưu đầy đủ vào state `appliedVoucher` và `appliedShippingVoucher`, đồng thời lưu danh sách 2 mã vào `localStorage` key `cothaotomca_applied_voucher_codes`.

## Risks / Trade-offs

- **[Risk] Khách hàng mở modal ở trang khác, bấm "Đặt món ngay" khi đang ở ngôn ngữ tiếng Anh (`/en/product`)**:
  - *Mitigation*: Sử dụng hook `useRouter` từ `@/i18n/routing` để tự động bảo toàn tiền tố locale hiện tại (`/${locale}/product`).
- **[Risk] Trường hợp mã voucher có tên dài hoặc mức giảm giá đặc biệt làm vỡ giao diện trên màn hình di động nhỏ (< 360px)**:
  - *Mitigation*: Ticket Badges có thiết kế flex-wrap hoặc co giãn linh hoạt (`truncate`, `shrink-0`), hiển thị số tiền rút gọn dạng `-76,6kđ` thay vì chuỗi quá dài.
- **[Risk] Trùng lặp kiểm thử trong các test suite hiện tại**:
  - *Mitigation*: Cập nhật các test case kiểm tra nút đáy trong `CouponModalSingleListMatrix.test.tsx` và bổ sung test suite chuyên biệt cho `VoucherTicketBar`.

## Migration Plan

1. Tạo component `src/components/Checkout/VoucherTicketBar.tsx`.
2. Cập nhật `src/components/Voucher/CouponModal.tsx` hỗ trợ Browse-only Mode (ẩn checkbox, nút "Đặt món ngay").
3. Thay thế khối voucher cũ trong `src/components/Checkout/CheckoutForm.tsx` bằng `VoucherTicketBar`.
4. Thay thế khối voucher cũ trong `src/components/Header/MobileCartFlow.tsx` bằng `VoucherTicketBar`.
5. Cập nhật file ngôn ngữ `src/i18n/locales/vi.json` và `en.json`.
6. Chạy Vitest test suite để đảm bảo không có bất kỳ regression nào.

## Open Questions

- Không còn câu hỏi mở. Tất cả yêu cầu về màu sắc thương hiệu `#CD4829`, màu Freeship `#00BFA5`, cơ chế 1 chạm và luồng điều hướng đã được thống nhất rõ ràng.
