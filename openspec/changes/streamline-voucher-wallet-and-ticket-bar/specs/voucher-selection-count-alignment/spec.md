## ADDED Requirements

### Requirement: Tách bạch rõ ràng số lượng Voucher Code và Campaign trong CouponModal
Hệ thống SHALL tách bạch minh bạch giữa mã giảm giá (`Voucher Code`) và chương trình khuyến mãi tự động (`Campaign`). Nút xác nhận tại Bottom Bar của modal khi ở Checkout chỉ hiển thị số lượng voucher hợp lệ được chọn (hoặc diễn đạt rõ ràng theo số lượng voucher đã tick), ngăn ngừa hoàn toàn tình trạng hiểu lầm người dùng khi chọn cả chiến dịch và mã voucher.

#### Scenario: Khách hàng tick chọn đồng thời 1 chiến dịch và 1 mã voucher
- **WHEN** người dùng mở `CouponModal` tại trang Checkout và tick chọn 1 chiến dịch khuyến mãi hợp lệ cùng 1 mã voucher giảm giá hợp lệ
- **THEN** hệ thống ghi nhận đúng số lượng từng loại (1 campaign ID và 1 voucher code)
- **AND** nhãn trên nút CTA tại Bottom Bar hiển thị chính xác số lượng voucher được áp dụng mà không gây hiểu lầm hoặc sai lệch số đếm khi đóng modal.

### Requirement: Lưu trữ và truyền nhận đầy đủ đồng thời cả mã món ăn và mã Freeship
Hệ thống SHALL hỗ trợ áp dụng song song 1 mã voucher món ăn và 1 mã voucher freeship (nếu thỏa mãn điều kiện kết hợp `canCombineWithFreeship`). Khi người dùng chọn cả 2 mã trong modal, hệ thống SHALL lưu cả 2 mã vào `localStorage` và truyền đầy đủ qua callback `onApplyVouchers`, bảo đảm cả hai mã đều được xác thực và giảm trừ hợp lệ trên đơn hàng.

#### Scenario: Áp dụng cùng lúc 1 mã giảm món và 1 mã Freeship
- **WHEN** người dùng chọn 1 mã voucher món ăn và 1 mã voucher vận chuyển thỏa mãn điều kiện kết hợp
- **AND** người dùng nhấn nút xác nhận áp dụng trong modal
- **THEN** cả 2 mã đều được đưa vào danh sách `appliedVoucherCodes`
- **AND** hệ thống lưu mảng gồm 2 mã này vào key `cothaotomca_applied_voucher_codes` trong `localStorage`
- **AND** callback `onApplyVouchers` nhận danh sách gồm đủ 2 mã và cập nhật thành công cả `appliedVoucher` và `appliedShippingVoucher`
- **AND** giao diện ngoài trang thanh toán hiển thị đầy đủ 2 Ticket Badges tương ứng cho từng voucher.
