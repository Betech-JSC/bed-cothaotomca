# Proposal

## Why

Hiện tại trên giao diện Checkout (`CheckoutForm.tsx`) và Giỏ hàng di động (`MobileCartFlow.tsx`), khi người dùng áp dụng một chương trình khuyến mãi (Campaign) độc quyền (ví dụ: tặng Súp Miso với cấu hình `can_combine_with_promotions === false`), hệ thống xảy ra lỗi không đồng bộ loại trừ giữa Campaign và Thẻ hội viên (Gold/Diamond):

1. **Hiển thị và tính toán không loại trừ lẫn nhau**:
   - Trong `CouponModal.tsx` (Ví voucher), thẻ hội viên đã bị khóa đúng quy tắc loại trừ (`isMemberCardLocked = true`, `isChecked = false`), số lượng ưu đãi được chọn hiển thị là 1 (chỉ Campaign).
   - Tuy nhiên khi ra ngoài `CheckoutForm.tsx` và `MobileCartFlow.tsx`, logic `isExcludedByVoucher` chỉ mới kiểm tra mã giảm giá (`appliedVoucher`, `appliedShippingVoucher`) mà **chưa kiểm tra các chiến dịch khuyến mãi đang hoạt động (`activeCampaigns` / `selectedCampaignIds`)**.
   - Do đó, ngoài giao diện thanh toán, `memberDiscount` vẫn được tính (ví dụ hạng Gold: -6.000đ), `isMemberApplied` vẫn là `true`, và thanh vé ưu đãi `VoucherTicketBar` hiển thị cùng lúc cả 2 badge (badge Campaign Súp Miso + badge Hội viên Gold -6k), đồng thời `appliedCount` tính thành 2 ưu đãi ("Đã áp dụng thành công 2 ưu đãi").
   - Hộp tính giá (Cost summary) hiển thị cả dòng quà tặng/giảm giá của Campaign và dòng chiết khấu hội viên -6.000đ.
2. **Không đồng bộ trạng thái thẻ hội viên khi thao tác Modal**:
   - Khi đóng modal ưu đãi (bấm nút X, click ra backdrop mờ bên ngoài, hoặc bấm áp dụng), cần đảm bảo trạng thái chọn/khóa thẻ hội viên được đồng bộ nhất quán giữa trong ví và bên ngoài giao diện Checkout / Giỏ hàng Mobile.

Vấn đề này vi phạm quy tắc kinh doanh về tính loại trừ (Mutex) của chương trình khuyến mãi độc quyền, gây hiểu lầm cho khách hàng về tổng số tiền thanh toán thực tế và làm sai lệch số lượng ưu đãi áp dụng.

## What Changes

- **Mở rộng logic loại trừ ưu đãi thành viên tại `CheckoutForm.tsx`**:
  - Chuyển đổi và mở rộng `isExcludedByVoucher` thành `isMemberExcludedByPromotions`.
  - Bổ sung kiểm tra các Campaign đang được áp dụng (`selectedCampaignIds` / `appliedCartPromotions` / `allPromotionsList`): nếu có bất kỳ Campaign nào có cấu hình độc quyền (`can_combine_with_promotions === false`) hoặc cấu hình loyalty không cho phép cộng dồn (`can_combine_with_promotions === false`), thẻ hội viên sẽ bị loại trừ (`isMemberExcludedByPromotions = true`).
  - Khi có Campaign độc quyền hoặc Voucher độc quyền đang active:
    + `memberDiscount` = 0.
    + `isMemberApplied` = false.
    + `VoucherTicketBar` chỉ hiển thị badge của Campaign (không hiển thị badge Hội viên), và `appliedCount` tính chính xác 1 ưu đãi.
    + Hộp tính giá (Cost summary) hiển thị dòng thông báo ưu đãi thành viên không áp dụng đồng thời với ưu đãi đã chọn (0đ) một cách rõ ràng.
- **Đồng bộ hóa logic tương tự tại `MobileCartFlow.tsx`**:
  - Mở rộng `isExcludedByVoucher` thành `isMemberExcludedByPromotions` trong `MobileCartFlow.tsx`.
  - Đảm bảo luồng giỏ hàng mobile / drawer đồng nhất hoàn toàn với `CheckoutForm`: khi Campaign độc quyền active thì `memberDiscount = 0`, `isMemberApplied = false`, `VoucherTicketBar` và cost summary hiển thị chuẩn 1 ưu đãi.
- **Đồng bộ trạng thái chọn/khóa thẻ hội viên trong `CouponModal.tsx`**:
  - Đảm bảo khi đóng modal (bấm "Áp dụng", bấm nút "X", bấm backdrop ngoài, hoặc phím Escape), trạng thái `isMemberCardSelected` và trạng thái khóa được đồng bộ chuẩn xác với component cha.
  - Ngăn chặn việc gọi `onToggleMemberCard` ngầm làm thay đổi state của cha khi người dùng chưa bấm áp dụng, hoặc đảm bảo state cha - con luôn nhất quán.

## Capabilities

### New Capabilities
- `campaign-member-mutex-sync`: Cơ chế đồng bộ khóa loại trừ tương hỗ (mutual exclusion) toàn diện giữa chiến dịch khuyến mãi độc quyền (exclusive campaign) và thẻ ưu đãi hội viên trên toàn bộ các điểm chạm người dùng (CheckoutForm, MobileCartFlow, VoucherTicketBar, Cost Summary, CouponModal).

### Modified Capabilities
<!-- None: openspec/specs currently empty -->

## Impact

- **Mã nguồn bị ảnh hưởng**:
  - `src/components/Checkout/CheckoutForm.tsx`: Cập nhật logic `isMemberExcludedByPromotions`, `memberDiscount`, `VoucherTicketBar`, `CostSummary`.
  - `src/components/Header/MobileCartFlow.tsx`: Cập nhật logic `isMemberExcludedByPromotions`, `memberDiscount`, `VoucherTicketBar`, `CostSummary`.
  - `src/components/Voucher/CouponModal.tsx`: Kiểm tra và tinh chỉnh logic đóng modal và đồng bộ `isMemberCardSelected`.
- **Kiểm thử (Tests)**:
  - Chạy `npm run build` để kiểm tra TypeScript compilation và linting.
  - Chạy test suites hiện có liên quan đến `VoucherTicketBar` và voucher.
