## ADDED Requirements

### Requirement: Ẩn Checkbox ở tất cả các thẻ trong chế độ Browse-only Mode
Hệ thống SHALL ẩn toàn bộ Checkbox ở tất cả các thẻ ưu đãi (bao gồm cả thẻ Chiến dịch khuyến mãi `PublicCampaignItem` và thẻ Mã giảm giá `PublicVoucherItem`) khi modal Ví ưu đãi (`CouponModal`) được kích hoạt ở chế độ Browse-only Mode (từ nút nổi `FloatingVoucherButton`, header, hoặc bất kỳ trang nào ngoài `/checkout`). Người dùng chỉ có thể xem nội dung, điều kiện áp dụng hoặc bấm sao chép mã voucher.

#### Scenario: Khách hàng mở Ví ưu đãi ngoài trang Checkout
- **WHEN** người dùng mở modal Ví ưu đãi từ nút nổi `FloatingVoucherButton` hoặc từ trang chủ/thực đơn ngoài trang `/checkout` (`isBrowseOnly = true` hoặc route không phải checkout)
- **THEN** modal `CouponModal` render ở chế độ Browse-only
- **AND** tất cả thẻ chiến dịch khuyến mãi không hiển thị phần tử checkbox lựa chọn
- **AND** tất cả thẻ voucher giảm giá không hiển thị phần tử checkbox lựa chọn
- **AND** thao tác click vào thẻ mở popup chi tiết điều kiện áp dụng hoặc cho phép sao chép mã (đối với voucher) thay vì thay đổi trạng thái tick chọn.

### Requirement: Nút CTA Đặt món ngay ở đáy modal khi xem ngoài Checkout
Tại chế độ Browse-only Mode ngoài trang Checkout, hệ thống SHALL hiển thị nút kêu gọi hành động (CTA) "Đặt món ngay" (`bg-secondary` `#CD4829`, chữ trắng nổi bật) ở thanh đáy (Bottom Bar) của modal. Khi người dùng click vào nút này, hệ thống SHALL đóng modal và điều hướng người dùng tới trang danh mục món ăn `/product`.

#### Scenario: Người dùng click nút Đặt món ngay dưới đáy modal Ví ưu đãi
- **WHEN** người dùng đang mở Ví ưu đãi ở chế độ Browse-only và click vào nút "Đặt món ngay" ở thanh đáy modal
- **THEN** modal `CouponModal` được đóng lại (`onClose()`)
- **AND** hệ thống điều hướng trình duyệt tới trang sản phẩm/thực đơn `/product` thông qua router hỗ trợ i18n
- **AND** không hiển thị nút "Bỏ qua ưu đãi và tiếp tục".
