# Spec Delta

## Purpose

Cơ chế đồng bộ khóa loại trừ tương hỗ (mutual exclusion) toàn diện giữa chiến dịch khuyến mãi độc quyền (exclusive campaign) và thẻ ưu đãi hội viên trên toàn bộ các điểm chạm người dùng (CheckoutForm, MobileCartFlow, VoucherTicketBar, Cost Summary, CouponModal).

## ADDED Requirements

### Requirement: Exclusive Campaign Member Exclusion in Checkout and Cart
Hệ thống MUST tự động loại trừ ưu đãi thành viên (Gold / Diamond) và đặt `memberDiscount` về 0 khi một chiến dịch khuyến mãi có cấu hình không cho phép cộng dồn với khuyến mãi khác (`can_combine_with_promotions === false`) hoặc cấu hình loyalty không cho phép cộng dồn (`can_combine_with_promotions === false`).

#### Scenario: Exclusive Campaign active on Checkout
- **WHEN** Khách hàng chọn một Campaign độc quyền (ví dụ: Súp Miso với `can_combine_with_promotions === false`)
- **THEN** Hệ thống xác định `isMemberExcludedByPromotions = true`
- **AND** `memberDiscount = 0` và `isMemberApplied = false`
- **AND** `VoucherTicketBar` chỉ hiển thị badge của Campaign, không hiển thị badge Thẻ hội viên
- **AND** `VoucherTicketBar` thông báo số lượng ưu đãi thành công chính xác là 1 ưu đãi (`appliedCount = 1`)
- **AND** Hộp tính giá (Cost summary) hiển thị dòng thông báo ưu đãi thành viên không áp dụng đồng thời với ưu đãi đã chọn (0đ)

#### Scenario: Exclusive Campaign active on Mobile Cart
- **WHEN** Khách hàng xem giỏ hàng di động / drawer (`MobileCartFlow.tsx`) với Campaign độc quyền đang được kích hoạt
- **THEN** Giỏ hàng di động hiển thị đồng nhất: `memberDiscount = 0`, `isMemberApplied = false`
- **AND** `VoucherTicketBar` trong mobile cart chỉ hiển thị badge Campaign, `appliedCount = 1`

### Requirement: Modal and Checkout State Synchronization
Hệ thống SHALL đảm bảo trạng thái chọn/khóa thẻ hội viên trong `CouponModal` và ngoài `CheckoutForm`/`MobileCartFlow` luôn nhất quán, không xảy ra tình trạng "trong ví thì đúng mà ra ngoài lại sai".

#### Scenario: Closing Coupon Modal via Backdrop or Close button
- **WHEN** Khách hàng mở `CouponModal`, thay đổi hoặc xem các ưu đãi và đóng modal
- **THEN** Trạng thái chọn và khóa thẻ hội viên được đồng bộ nhất quán theo các ưu đãi thực tế đang được áp dụng
- **AND** Không xảy ra sai lệch tính toán giữa modal và màn hình thanh toán
