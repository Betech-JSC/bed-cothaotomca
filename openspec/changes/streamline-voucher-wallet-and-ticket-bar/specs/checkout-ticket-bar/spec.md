## ADDED Requirements

### Requirement: Thanh Voucher Shopee-style Ticket Bar 1 chạm tại màn hình Checkout
Tại màn hình thanh toán (`CheckoutForm.tsx`) và giỏ hàng mobile (`MobileCartFlow.tsx`), hệ thống SHALL thay thế toàn bộ khối ô `<input>` nhập mã thô, các nút bấm rời rạc và dòng phản hồi tĩnh cũ bằng một Thanh Thẻ Vé (Shopee-style Ticket Bar) tương tác 1 chạm, mang phong cách hiện đại và chuẩn nhận diện thương hiệu `#CD4829`.

#### Scenario: Hiển thị thanh Ticket Bar ở trạng thái chưa áp dụng mã
- **WHEN** người dùng vào màn hình Checkout hoặc mở giỏ hàng di động và chưa có voucher nào được áp dụng
- **THEN** hệ thống hiển thị thanh Ticket Bar với Brand Ticket SVG icon (`#CD4829`), nhãn tiêu đề "Mã giảm giá (Voucher)"
- **AND** ở phía bên phải hiển thị lời nhắc thân thiện "Chọn hoặc nhập mã ›"
- **AND** toàn bộ khối ô input cũ và các nút bấm rời rạc không xuất hiện trên giao diện.

#### Scenario: Hiển thị thanh Ticket Bar khi đã áp dụng mã giảm giá và/hoặc Freeship
- **WHEN** người dùng đã chọn và áp dụng thành công mã voucher món ăn và/hoặc mã Freeship
- **THEN** thanh Ticket Bar hiển thị các Thẻ vé ưu đãi (Ticket Badges) có vết khuyết bán nguyệt ở 2 mép bên:
  - Thẻ giảm đơn/món có viền và chữ màu cam đỏ `#CD4829`, nền `#FFF5F2`, hiển thị số tiền giảm (ví dụ: `-76,6kđ`, `-100.000đ`)
  - Thẻ Freeship có viền và chữ màu xanh ngọc `#00BFA5`, nền `#F0FDF9`, hiển thị `Miễn Phí Vận Chuyển`
- **AND** ở cuối thanh hiển thị icon mũi tên `›`
- **AND** hệ thống hoàn toàn không hiển thị dòng chữ phản hồi thừa `✓ Đã áp dụng thành công X ưu đãi!`.

#### Scenario: Thao tác 1 chạm mở modal chọn và nhập voucher
- **WHEN** người dùng click hoặc chạm vào bất kỳ vị trí nào trên thanh Ticket Bar
- **THEN** modal `CouponModal` được kích hoạt mở ra ngay lập tức
- **AND** modal hiển thị ở chế độ Checkout đầy đủ chức năng: danh sách mã đủ điều kiện có checkbox tick chọn, ô nhập mã voucher thủ công và nút xác nhận áp dụng.
