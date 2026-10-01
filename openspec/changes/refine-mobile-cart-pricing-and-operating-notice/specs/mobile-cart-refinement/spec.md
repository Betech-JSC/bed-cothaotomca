# Spec Delta

## Purpose

Chuẩn hóa giao diện giỏ hàng và thanh toán trên thiết bị di động (MobileCartFlow), bao gồm: đảo ngược thứ tự giá món (giá bán ở trên, giá gốc ở dưới), nâng cấp z-index và tự động kích hoạt popup ngoài giờ phục vụ, mở rộng touch target cho nút ưu đãi nổi, và cấu trúc lại dòng phí giao hàng cùng tách bạch giảm giá món và giảm giá ship.

## ADDED Requirements

### Requirement: Item Pricing Order in Mobile Cart
Hệ thống SHALL hiển thị giá bán thực tế sau giảm ở phía trên và giá gốc gạch ngang ở phía dưới đối với từng món ăn trong giỏ hàng trên giao diện di động.

#### Scenario: Item has discount (originalPrice > unitPrice)
- **WHEN** Món ăn trong giỏ hàng di động có giá gốc lớn hơn giá bán (`originalPrice > unitPrice`)
- **THEN** Giá bán sau giảm (`span` text-secondary font-bold font-display) hiển thị ở hàng trên.
- **AND** Giá gốc gạch ngang (`p` text-xs text-gray-400 line-through) hiển thị ở hàng dưới.

#### Scenario: Item without discount (originalPrice <= unitPrice or not present)
- **WHEN** Món ăn trong giỏ hàng di động không có giảm giá
- **THEN** Chỉ hiển thị giá bán hiện tại ở hàng trên.
- **AND** Không hiển thị phần tử giá gốc gạch ngang.

### Requirement: Mobile PreOrder Notice Modal Z-Index and Auto-Sync
Hệ thống SHALL cho phép cấu hình linh hoạt `zIndex` cho `PreOrderNoticeModal` và tự động hiển thị popup khi người dùng mở giỏ hàng ngoài giờ phục vụ trên thiết bị di động.

#### Scenario: PreOrder notice rendered inside mobile cart flow
- **WHEN** Người dùng mở giỏ hàng di động trong khung giờ ngoài giờ phục vụ (`!operatingStatus.canOrderNow && !!operatingStatus.notice`)
- **THEN** `PreOrderNoticeModal` tự động được kích hoạt mở (`isOpen={true}`).
- **AND** Modal được truyền thuộc tính `zIndex="z-[200]"` để nổi phía trên Mobile Cart Drawer (`z-[160]`).

#### Scenario: PreOrder notice rendered on desktop checkout
- **WHEN** `PreOrderNoticeModal` được render trong luồng thanh toán Desktop (`CheckoutForm.tsx`) mà không truyền prop `zIndex`
- **THEN** Modal mặc định áp dụng class `"z-50"`, hoàn toàn không gây tác động hay thay đổi hành vi trên Desktop.

### Requirement: Floating Voucher Button Touch Target Upgrade
Hệ thống SHALL mở rộng kích thước nút Ưu Đãi Nổi trên màn hình di động để đạt chuẩn kích thước cảm ứng (touch target) tối ưu ~38-40px.

#### Scenario: Viewing floating voucher button on mobile viewport
- **WHEN** Người dùng truy cập website trên thiết bị di động
- **THEN** Nút có padding `px-3.5 py-2 md:px-3.5 md:py-2.5`.
- **AND** Icon vé có kích thước `w-4.5 h-4.5 md:w-5 md:h-5` nằm trong khung `w-5 h-5 md:w-6 md:h-6`.
- **AND** Chữ "Ưu đãi" có class `text-xs sm:text-sm md:title-3 font-bold`.
- **AND** Badge đếm số lượng có class `text-[10px] md:text-[11px] px-1.5 py-0.5 md:py-0.2 min-w-[18px] md:min-w-[20px]`.
- **AND** Vòng tròn xung nhịp (pulse ring) có class `h-2.5 w-2.5 md:h-3 md:w-3`.
- **AND** Tọa độ nút được ghim tại `bottom-5 left-3.5 md:bottom-8 md:left-8`.

### Requirement: Shipping Fee Display and Discount Separation
Hệ thống SHALL hiển thị minh bạch mức phí giao hàng gốc gạch ngang khi có ưu đãi giảm ship, đồng thời tách biệt hoàn toàn giữa giảm ship và mã giảm giá món ăn tại Step 1 và Step 2.

#### Scenario: Step 1 Shipping fee with freeship
- **WHEN** Đơn hàng đủ điều kiện miễn phí vận chuyển (`isFreeship === true`) tại Step 1
- **THEN** Hiển thị giá gốc `originalFee` gạch ngang (`line-through text-gray-400`) kèm số tiền `0đ` màu cam (`text-secondary font-bold font-display`).

#### Scenario: Step 1 Shipping fee with partial shipping discount
- **WHEN** Đơn hàng có giảm phí giao hàng (`shippingDiscount > 0 || shippingVoucherDiscount > 0`) và `originalFee > shipping`
- **THEN** Hiển thị giá gốc `originalFee` gạch ngang kèm số tiền thực thu `shipping` màu xanh (`text-primary font-bold font-display`).

#### Scenario: Step 2 Shipping fee placement and voucher isolation
- **WHEN** Người dùng chuyển sang Step 2 (Xác nhận đặt hàng)
- **THEN** Dòng `Phí giao hàng` hiển thị ngay dưới dòng `Tạm tính`, thể hiện giá gốc gạch ngang và phí thực thu (hoặc `0đ` nếu freeship) mà không bổ sung dòng chữ thông báo phụ rườm rà.
- **AND** Dòng `Mã giảm giá` CHỈ hiển thị khi `appliedVoucher && foodVoucherDiscount > 0` với giá trị `-{formatPrice(foodVoucherDiscount)}`.
- **AND** Tuyệt đối không gộp `shippingDiscount` vào dòng `Mã giảm giá`. Nếu `foodVoucherDiscount === 0`, dòng `Mã giảm giá` bị ẩn hoàn toàn.
