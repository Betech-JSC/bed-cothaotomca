# Đề xuất Thay đổi: Tinh giản Ví Ưu Đãi và Nâng cấp Thanh Voucher Checkout theo phong cách Shopee Ticket Bar (streamline-voucher-wallet-and-ticket-bar)

## Why

Giao diện Ví ưu đãi (`CouponModal`) và cơ chế áp dụng voucher tại trang Giỏ hàng / Thanh toán (`CheckoutForm.tsx`, `MobileCartFlow.tsx`) hiện tồn tại 3 điểm nghẽn lớn về trải nghiệm người dùng:
1. Khi mở modal ngoài trang Checkout (Browse-only Mode), các thẻ vẫn hiển thị Checkbox gây hiểu lầm là có thể kích hoạt áp dụng ngay dù chưa có giỏ hàng, kèm nút đáy "Bỏ qua ưu đãi và tiếp tục" không đúng ngữ cảnh duyệt món.
2. Tại màn hình Checkout, khu vực voucher vẫn dùng khối ô `<input>` thô sơ cùng 2 nút bấm rời rạc và dòng chữ phản hồi tĩnh thô cứng `✓ Đã áp dụng thành công X ưu đãi!`, gây tốn diện tích và kém trực quan so với trải nghiệm thương mại điện tử hiện đại.
3. Tồn tại lỗi trải nghiệm đếm số lượng "Tick 2 nhưng hiện 1" do chưa tách bạch rõ giữa Mã Voucher (Voucher Code) và Chiến dịch khuyến mãi tự động (Campaign), dẫn tới sự không nhất quán giữa số lượng chọn trong modal và thông báo ngoài trang thanh toán.

Việc chuẩn hóa giao diện Browse-only ngoài Checkout, thay thế khối input thô bằng Thanh Thẻ Vé (Shopee-style Ticket Bar) 1 chạm và khắc phục triệt để lỗi đếm sẽ tối ưu tỷ lệ chuyển đổi (CRO), tôn vinh nhận diện thương hiệu `#CD4829`, và mang lại trải nghiệm mua sắm mượt mà, trực quan nhất cho khách hàng Bếp Cô Thảo Tôm Cá.

## What Changes

1. **Ví ưu đãi NGOÀI trang Checkout (Browse-only Mode)**:
   - Áp dụng khi mở từ nút nổi `FloatingVoucherButton` hoặc Header ở bất kỳ trang nào không phải `/checkout` (`isBrowseOnly = true` hoặc không phải route checkout).
   - **Ẩn toàn bộ Checkbox** ở tất cả các thẻ (cả thẻ Chương trình khuyến mãi và thẻ Mã giảm giá). Khách hàng chỉ xem thông tin chi tiết, điều kiện áp dụng hoặc bấm sao chép mã.
   - **Đổi nút đáy modal**: Thay vì "Bỏ qua ưu đãi và tiếp tục", chuyển thành nút kêu gọi hành động nổi bật **"Đặt món ngay"** (màu cam đỏ `bg-secondary` `#CD4829`, text trắng, bo góc 2xl), khi click sẽ đóng modal và điều hướng khách hàng tới trang danh mục món ăn `/product`.

2. **Thanh Voucher TRONG trang Checkout (Shopee-style Ticket Bar)**:
   - Áp dụng tại `CheckoutForm.tsx` (Desktop & Mobile view) và `MobileCartFlow.tsx` (Mobile Cart Drawer).
   - **Loại bỏ hoàn toàn**: Khối `<input>` thô, nút `Chọn mã`, nút `Xóa` rời rạc, và dòng thông báo thừa `✓ Đã áp dụng thành công X ưu đãi!`.
   - **Xây dựng Thanh Thẻ Vé (Shopee-style Ticket Bar)**:
     - **Icon đầu dòng**: Brand Ticket SVG icon (`#CD4829`, icon cuống vé khuyết 2 mép đồng bộ với `FloatingVoucherButton`).
     - **Tiêu đề**: `Mã giảm giá (Voucher)` (font display, đậm, màu `#001737` / `text-primary`).
     - **Khu vực hiển thị thẻ vé ưu đãi (Ticket Badges)** với hiệu ứng vết khuyết bán nguyệt ở 2 mép:
       - *Thẻ giảm đơn/món*: Viền & chữ màu cam đỏ `#CD4829`, nền `#FFF5F2`, hiển thị trực quan số tiền giảm (ví dụ: `-76,6kđ`, `-100.000đ`).
       - *Thẻ Freeship*: Viền & chữ màu xanh ngọc `#00BFA5`, nền `#F0FDF9`, hiển thị `Miễn Phí Vận Chuyển`.
       - Mũi tên điều hướng `›` ở cuối thanh.
     - **Trạng thái chưa chọn**: Hiển thị gợi ý thanh lịch `Chọn hoặc nhập mã ›`.
     - **Thao tác 1 chạm (One-tap action)**: Click vào bất kỳ vị trí nào trên thanh sẽ mở `CouponModal` (chế độ Checkout đầy đủ chức năng checkbox chọn mã và ô nhập mã tay).

3. **Sửa triệt để lỗi đếm số lượng "Tick 2 nhưng hiện 1"**:
   - Tách bạch minh bạch giữa Mã Voucher (Voucher Code) và Chiến dịch (Campaign). Nút modal ở Checkout chỉ đếm các Voucher Code hợp lệ được tick (hoặc phân định rõ số lượng voucher và chiến dịch).
   - Đảm bảo khi khách hàng chọn đồng thời 1 mã món + 1 mã freeship (hoặc kết hợp với chiến dịch G1), cả 2 mã đều được lưu vào `localStorage`, truyền đầy đủ ra ngoài qua `onApplyVouchers`, và hiển thị song song 2 Ticket Badges tương ứng trên thanh Ticket Bar.

## Capabilities

### New Capabilities
- `voucher-wallet-browse-mode`: Chế độ duyệt xem ưu đãi ngoài trang Checkout (Browse-only Mode) với việc ẩn toàn bộ checkbox và nút CTA "Đặt món ngay" dẫn thẳng đến thực đơn `/product`.
- `checkout-ticket-bar`: Thanh voucher dạng thẻ vé Shopee-style 1 chạm tại Checkout (`CheckoutForm.tsx` và `MobileCartFlow.tsx`), thay thế khối input thô, hiển thị các Ticket Badge chuẩn thương hiệu `#CD4829` và `#00BFA5`.
- `voucher-selection-count-alignment`: Cơ chế tách bạch và đồng bộ chuẩn xác số lượng ưu đãi được chọn giữa `CouponModal` và Checkout, bảo đảm hỗ trợ áp dụng đồng thời và hiển thị đầy đủ cả mã món và mã freeship.

### Modified Capabilities
<!-- None: Dự án chưa có spec nền trong openspec/specs/ -->

## Impact

- **Frontend Components (`bed-cothaotomca`)**:
  - `src/components/Voucher/CouponModal.tsx`:
    - Nhận biết chuẩn xác `isBrowseMode = isBrowseOnly || !isCheckoutRoute`.
    - Ẩn toàn bộ Checkbox ở campaign cards và voucher cards khi ở `isBrowseMode`.
    - Đổi nút đáy modal thành "Đặt món ngay" (`bg-secondary` `#CD4829`) điều hướng `/product` khi ở `isBrowseMode`.
    - Đồng bộ đếm số lượng trên nút CTA tại Checkout.
  - `src/components/Voucher/FloatingVoucherButton.tsx`:
    - Truyền rõ ràng `isBrowseOnly={true}` sang `CouponModal`.
  - `src/components/Checkout/CheckoutForm.tsx`:
    - Thay thế khối input voucher cũ bằng Shopee-style Ticket Bar component.
    - Xóa bỏ dòng chữ phản hồi tĩnh `✓ Đã áp dụng thành công...`.
    - Render Ticket Badges cho mã món và mã ship.
  - `src/components/Header/MobileCartFlow.tsx`:
    - Thay thế khối input voucher cũ bằng Shopee-style Ticket Bar tương tự `CheckoutForm.tsx`.
- **Localization (`src/i18n/locales/{vi,en}.json`)**:
  - Thêm các translation keys mới: `order_now_cta`, `select_or_enter_voucher`, `voucher_ticket_title`, `freeship_badge_text`, v.v.
- **Tests & Quality Assurance**:
  - Cập nhật và bổ sung unit tests trong `src/__tests__/CouponModalSingleListMatrix.test.tsx` và viết test mới cho Ticket Bar.
- **Backend & Database**:
  - 100% Client-side UI/UX và Context alignment. Không thay đổi schema database, không gọi thêm API backend mới, tuân thủ nghiêm ngặt Safe Guard Policy.
