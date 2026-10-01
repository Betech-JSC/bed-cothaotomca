# Design

## Context

Trên giao diện Mobile Web của Bếp Cô Thảo Tôm Cá, luồng giỏ hàng và thanh toán (`MobileCartFlow.tsx`) đóng vai trò then chốt trong quyết định mua hàng. Qua khảo sát thực tế và đối chiếu với Desktop, 4 khía cạnh cần được hoàn thiện:
1. Thứ tự trực quan của giá món: Giá bán sau giảm cần đập vào mắt người dùng trước giá gốc gạch ngang.
2. Popup ngoài giờ (`PreOrderNoticeModal.tsx`): Cần hiển thị đè lên Drawer giỏ hàng (`z-[160]`) bằng cách cho phép nhận prop `zIndex="z-[200]"`.
3. Nút Ưu Đãi Nổi (`FloatingVoucherButton.tsx`): Kích thước nút nhỏ trên màn hình cảm ứng di động gây khó khăn khi bấm. Cần nâng kích thước đạt chuẩn ngón tay chạm (~38-40px).
4. Phí giao hàng & Chiết khấu voucher: Khách hàng cần thấy rõ ưu đãi giảm ship ở cả Step 1 và Step 2, nhưng dòng Mã giảm giá ở Step 2 chỉ được phản ánh phần giảm cho món ăn, tránh tình trạng gộp giảm ship vào gây hiểu nhầm về giá trị voucher.

## Goals / Non-Goals

**Goals:**
- Tối ưu hóa phân cấp thị giác giá bán và giá khuyến mãi của từng món trong giỏ hàng.
- Nâng cao z-index và tự động hiển thị popup ngoài giờ chuẩn xác trên Mobile mà không ảnh hưởng Desktop.
- Cải thiện trải nghiệm chạm (touch target) cho nút ưu đãi nổi góc trái dưới.
- Tái lập dòng phí giao hàng trong thẻ tóm tắt Step 2 và tách biệt hoàn toàn giảm ship khỏi mã giảm giá món ăn.

**Non-Goals:**
- Tuyệt đối không thay đổi mã nguồn của Desktop (`src/components/Checkout/CheckoutForm.tsx`).
- Không thay đổi công thức tính tổng tiền (`total`), logic backend hay API.

## Decisions

### 1. Thứ tự giá món ăn (`MobileCartFlow.tsx`)
- **Quyết định**: Đặt `span` giá bán sau giảm (`text-secondary font-bold font-display`) ở trên, và `p` giá gốc gạch ngang (`text-xs text-gray-400 line-through`) ở dưới.
- **Lý do**: Khi xem giỏ hàng, thông tin quan trọng nhất người dùng tìm kiếm là "món này giá bao nhiêu tiền". Việc đưa giá bán lên trên giúp não bộ tiếp nhận thông tin tức thì, giá gạch bên dưới đóng vai trò đối chiếu mức độ giảm giá.

### 2. Linh hoạt zIndex cho `PreOrderNoticeModal.tsx`
- **Quyết định**: Bổ sung `zIndex?: string` với giá trị mặc định là `"z-50"` vào `PreOrderNoticeModalProps`. Tại `MobileCartFlow.tsx`, truyền `zIndex="z-[200]"`.
- **Lý do**: Mobile Cart Drawer sử dụng `z-[160]`. Nếu modal dùng `z-50`, backdrop và nội dung modal sẽ bị ẩn hoàn toàn sau Drawer. Khi đặt mặc định `"z-50"`, Desktop (`CheckoutForm.tsx`) không truyền prop vẫn hoạt động 100% như cũ mà không phát sinh rủi ro.
- **Tự động mở**: Khởi tạo state `showNoticeModal` bằng `!operatingStatus.canOrderNow && !!operatingStatus.notice` và lắng nghe khi giỏ hàng mở để đảm bảo khách luôn được thông báo rõ về việc đặt hẹn trước ngoài giờ.

### 3. Chuẩn hóa Touch Target Nút Ưu Đãi (`FloatingVoucherButton.tsx`)
- **Quyết định**: Tăng padding `px-3.5 py-2 md:px-3.5 md:py-2.5`, icon `w-4.5 h-4.5 md:w-5 md:h-5` trong container `w-5 h-5 md:w-6 md:h-6`, chữ `text-xs sm:text-sm md:title-3 font-bold`, badge `text-[10px] md:text-[11px] px-1.5 py-0.5 md:py-0.2 min-w-[18px] md:min-w-[20px]`, pulse `h-2.5 w-2.5 md:h-3 md:w-3`, vị trí `bottom-5 left-3.5 md:bottom-8 md:left-8`.
- **Lý do**: Chiều cao nút đạt ~38-40px đáp ứng tiêu chuẩn tiếp cận Web Accessibility và Mobile Touch Target (WCAG 2.1), giúp người dùng dễ dàng chạm mở mà không bị lệch hay bấm hụt. Vị trí góc trái dưới an toàn tuyệt đối với nút hỗ trợ Zalo bên phải.

### 4. Tách biệt Phí giao hàng & Chiết khấu voucher món (`MobileCartFlow.tsx`)
- **Quyết định**:
  - Tại Step 1: Dòng `Phí giao hàng` hiển thị `originalFee` gạch ngang + `0đ` (nếu freeship) hoặc `originalFee` gạch ngang + `shipping` (nếu có giảm ship).
  - Tại Step 2: Dòng `Phí giao hàng` được đặt ngay dưới dòng `Tạm tính` với cùng định dạng giá gốc gạch ngang và phí thực thu. Dòng `Mã giảm giá` CHỈ hiển thị `foodVoucherDiscount` khi `appliedVoucher && foodVoucherDiscount > 0`, hoàn toàn không gộp `shippingDiscount` hay `shippingVoucherDiscount`.
- **Lý do**: Giúp khách hàng hiểu rõ: Voucher giảm tiền món ăn đã trừ ở dòng Mã giảm giá, còn ưu đãi vận chuyển đã trừ trực tiếp trên dòng Phí giao hàng, tạo sự minh bạch tuyệt đối về tài chính.

## Risks / Trade-offs

- **[Risk] Trường hợp freeship hoàn toàn (originalFee = 0 hoặc chưa tính được quận/huyện)**:
  - *Mitigation*: Chỉ render giá gốc gạch ngang khi `originalFee > 0`. Khi chưa chọn khu vực giao hàng, hiển thị `"--"` an toàn.
