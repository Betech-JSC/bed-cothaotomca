# Proposal

## Why

Qua phân tích trải nghiệm người dùng thực tế trên giao diện di động (Mobile Web) của Bếp Cô Thảo Tôm Cá và đối chiếu chuẩn nghiệp vụ với Desktop, nhóm phát triển ghi nhận 4 điểm cần tinh chỉnh nhằm tối ưu hóa chuyển đổi và trải nghiệm đặt món:
1. **Thứ tự giá món ăn trong giỏ hàng Mobile**: Giá gốc gạch ngang hiện đang nằm ở dòng trên và giá bán sau giảm nằm ở dòng dưới, chưa thuận mắt so với thói quen đọc của người dùng di động (ưu tiên thấy ngay số tiền thực tế phải trả). Cần đảo ngược để giá bán nằm ở trên, giá gốc nằm ở dưới.
2. **Popup thông báo ngoài giờ phục vụ trên Mobile**: Modal `PreOrderNoticeModal` có `z-index` mặc định là `z-50`, trong khi Mobile Cart Drawer có `z-index` là `z-[160]`. Điều này khiến popup bị che khuất đằng sau Drawer khi khách mở giỏ hàng ngoài giờ phục vụ. Cần nâng `zIndex` linh hoạt (`z-[200]` trên Mobile) và đồng bộ trạng thái mở tự động chuẩn như Desktop.
3. **Nút Ưu đãi nổi (Floating Voucher Button)**: Kích thước nút trên Mobile hiện hơi nhỏ, chưa đạt chuẩn kích thước cảm ứng (touch target) tối ưu ~38-40px, khiến thao tác bấm mở xem kho ưu đãi đôi khi chưa thật sự thoải mái. Cần mở rộng padding, icon vé, cỡ chữ và badge đếm số lượng ưu đãi.
4. **Hiển thị Phí giao hàng & Tách biệt Giảm ship vs Voucher món**:
   - Tại Step 1 (Summary Panel): Cần hiển thị giá gốc gạch ngang khi có ưu đãi giảm ship hoặc freeship.
   - Tại Step 2 (Thẻ tóm tắt tiền): Cần đưa dòng `Phí giao hàng` trở lại ngay dưới `Tạm tính`, hiển thị minh bạch giá gốc gạch ngang và phí thực thu; đồng thời dòng `Mã giảm giá` chỉ hiển thị tiền giảm món (`foodVoucherDiscount`), tuyệt đối không gộp tiền giảm ship vào dòng này để tránh gây hiểu lầm cho khách hàng.

## What Changes

1. **Thứ tự giá món ăn trong giỏ hàng Mobile (`src/components/Header/MobileCartFlow.tsx`)**:
   - Đảo ngược thứ tự hiển thị tại dòng ~2005-2018:
     * Giá bán sau giảm (`span` text-secondary font-bold font-display) nằm ở **TRÊN**.
     * Giá gốc gạch ngang (`p` text-xs text-gray-400 line-through) nằm ở **DƯỚI** (chỉ hiển thị khi `originalPrice > unitPrice`).
2. **Popup ngoài giờ hoạt động trên Mobile (`src/components/Checkout/PreOrderNoticeModal.tsx` & `src/components/Header/MobileCartFlow.tsx`)**:
   - Thêm prop tùy chọn `zIndex?: string` (mặc định `"z-50"` để Desktop không bị ảnh hưởng) vào `PreOrderNoticeModal.tsx`.
   - Trong `MobileCartFlow.tsx`, truyền `zIndex="z-[200]"` để modal luôn nổi lên trên Mobile Cart Drawer (`z-[160]`).
   - Đồng bộ state `showNoticeModal` mở tự động khi `!operatingStatus.canOrderNow && !!operatingStatus.notice`.
3. **Nút Ưu Đãi Nổi (`src/components/Voucher/FloatingVoucherButton.tsx`)**:
   - Tăng kích thước nút trên Mobile đạt chuẩn touch target:
     * Padding: `px-3.5 py-2 md:px-3.5 md:py-2.5` (chiều cao đạt ~38-40px).
     * Icon vé: `w-4.5 h-4.5 md:w-5 md:h-5` (container `w-5 h-5 md:w-6 md:h-6`).
     * Chữ "Ưu đãi": `text-xs sm:text-sm md:title-3 font-bold`.
     * Badge đếm số lượng: `text-[10px] md:text-[11px] px-1.5 py-0.5 md:py-0.2 min-w-[18px] md:min-w-[20px]`.
     * Pulse ring: `h-2.5 w-2.5 md:h-3 md:w-3`.
     * Vị trí: `bottom-5 left-3.5 md:bottom-8 md:left-8` (giữ nguyên độc lập ở góc trái dưới, an toàn 100% với cụm Zalo bên phải).
4. **Phí giao hàng & Tách Giảm ship vs Mã giảm giá tiền món (`src/components/Header/MobileCartFlow.tsx`)**:
   - **Step 1 (Summary Panel)**:
     * Nếu `isFreeship`: hiển thị `originalFee` (gạch ngang màu xám `line-through`) + `0đ` (màu cam).
     * Nếu `shippingDiscount > 0 || shippingVoucherDiscount > 0` và `originalFee > shipping`: hiển thị `originalFee` (gạch ngang `line-through`) + `shipping` (màu xanh/primary font-bold).
     * Ngược lại: hiển thị `shipping > 0 ? formatPrice(shipping) : "--"`.
   - **Step 2 (Thẻ tóm tắt tiền)**:
     * Đưa dòng `Phí giao hàng` trở lại ngay dưới dòng `Tạm tính`: Hiển thị đầy đủ giá gốc gạch ngang `originalFee` (nếu có giảm ship) và số tiền thực thu `shipping` (hoặc `0đ` nếu freeship), giữ thẻ tóm tắt tinh gọn không thêm chữ rườm rà.
     * Dòng `Mã giảm giá`: Chỉ hiển thị khi `appliedVoucher && foodVoucherDiscount > 0` với giá trị `-{formatPrice(foodVoucherDiscount)}`. Tuyệt đối không gộp `shippingDiscount`. Nếu `foodVoucherDiscount === 0` thì ẩn dòng này.

## Capabilities

### New Capabilities
- `mobile-cart-pricing-refinement`: Chuẩn hóa phân cấp thị giác giá bán trên/dưới trong giỏ hàng di động, cải thiện touch target cho nút ưu đãi, tối ưu z-index popup ngoài giờ và phân định minh bạch phí giao hàng cùng voucher chiết khấu món ăn.

### Modified Capabilities
<!-- None -->

## Impact

- **Affected components**:
  - `src/components/Header/MobileCartFlow.tsx`
  - `src/components/Checkout/PreOrderNoticeModal.tsx`
  - `src/components/Voucher/FloatingVoucherButton.tsx`
- **Testing**:
  - `src/__tests__/RefineMobileCartAndCheckoutUI.test.tsx`
- **APIs & Backend**: Tuyệt đối không can thiệp backend, không đổi logic tính toán phí hay hợp đồng API.
