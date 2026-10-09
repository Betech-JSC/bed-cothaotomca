# Design

## Context

Hiện tại hệ thống Bếp Cô Thảo Tôm Cá hỗ trợ nhiều loại hình ưu đãi:
1. Mã giảm giá (Vouchers): Giảm giá món ăn và mã Freeship.
2. Chiến dịch khuyến mãi (Campaigns): Tặng món (Buy X Get Y / Order Gift), giảm giá đơn hàng (`order_discount`). Một số chiến dịch có cấu hình độc quyền: `can_combine_with_promotions === false`.
3. Ưu đãi thành viên (Loyalty Member Tier): Chiết khấu phần trăm theo hạng Gold (-5% hoặc lên hạng -10%) / Diamond (-8% hoặc lên hạng -10%). Cấu hình loyalty có `can_combine_with_promotions`.

Trước đây, logic loại trừ ưu đãi thành viên trên Checkout (`CheckoutForm.tsx`) và Mobile Cart (`MobileCartFlow.tsx`) chỉ mới đặt tên là `isExcludedByVoucher` và chỉ kiểm tra `appliedVoucher` / `appliedShippingVoucher`. Khi khách hàng áp dụng Campaign độc quyền (như tặng Súp Miso), trong `CouponModal.tsx` thẻ thành viên bị khóa chuẩn (`isMemberCardLocked = true`), nhưng ra ngoài màn hình Checkout / Giỏ hàng Mobile thì `isExcludedByVoucher` trả về `false`, dẫn đến áp dụng cùng lúc cả 2 ưu đãi và hiển thị sai trên `VoucherTicketBar` (2 ưu đãi) và Cost Summary.

## Goals / Non-Goals

**Goals:**
- Mở rộng logic `isExcludedByVoucher` thành `isMemberExcludedByPromotions` tại cả `CheckoutForm.tsx` và `MobileCartFlow.tsx`.
- Kiểm tra cả voucher độc quyền và chiến dịch khuyến mãi độc quyền (`can_combine_with_promotions === false`) hoặc loyalty setting không cho phép cộng dồn.
- Đảm bảo khi Campaign độc quyền active:
  + `memberDiscount = 0`.
  + `isMemberApplied = false`.
  + `VoucherTicketBar` chỉ hiển thị badge của Campaign, không hiển thị badge Thẻ hội viên.
  + `VoucherTicketBar` đếm đúng `appliedCount = 1`.
  + Cost summary hiển thị rõ ưu đãi thành viên không áp dụng đồng thời (0đ).
- Đồng bộ hóa logic đóng modal (`onClose`, click backdrop, apply) trong `CouponModal.tsx` để trạng thái thẻ hội viên luôn nhất quán.

**Non-Goals:**
- Không thay đổi API backend hoặc schema database của Campaign/Voucher/Loyalty.
- Không thay đổi thuật toán tính chiết khấu của voucher hay campaign độc lập.

## Decisions

### Quyết định 1: Mở rộng `isExcludedByVoucher` thành `isMemberExcludedByPromotions`
- **Lý do**: Cần một hook/memo toàn diện để kiểm tra mọi nguồn ưu đãi độc quyền (Voucher món, Voucher ship, Campaign giỏ hàng, Campaign tặng món, Campaign giảm đơn hàng).
- **Hiện thực**:
  ```typescript
  const isMemberExcludedByPromotions = useMemo(() => {
    if (canCombineLoyaltyWithPromotions) return false;
    if (appliedVoucher && appliedVoucher.canCombineWithPromotions === false) return true;
    if (appliedShippingVoucher && appliedShippingVoucher.canCombineWithPromotions === false) return true;

    const activePromos = (allPromotionsList || []).filter((c) =>
      selectedCampaignIds.some((id) => String(id) === String(c.id))
    );
    if (activePromos.some((c) => c.can_combine_with_promotions === false)) return true;
    if (cartCampaignG1 && cartCampaignG1.can_combine_with_promotions === false) return true;
    if (eligibleOrderGiftPromo && eligibleOrderGiftPromo.can_combine_with_promotions === false) return true;
    if (eligibleOrderDiscountPromo && eligibleOrderDiscountPromo.can_combine_with_promotions === false) return true;
    if (eligibleBuyXGetYPromos.some((p) => p.can_combine_with_promotions === false)) return true;

    return false;
  }, [...]);
  ```
- **Phương án thay thế**: Chỉ gán cờ thủ công khi bấm chọn trong modal. (Bị bác bỏ vì nếu reload trang hoặc restore từ localStorage thì state sẽ mất đồng bộ).

### Quyết định 2: Đồng nhất VoucherTicketBar và Cost Summary
- `isMemberApplied` truyền vào `VoucherTicketBar`: `memberDiscount > 0 && !isMemberExcludedByPromotions`.
- `activeCampaignName`: Khi có campaign active và không bị voucher độc quyền chặn thì hiển thị tên campaign.
- Cost summary: Khi `isMemberExcludedByPromotions` là `true`, hiển thị dòng thông báo không áp dụng đồng thời với 0đ.

### Quyết định 3: Hoàn thiện đồng bộ đóng modal trong `CouponModal.tsx`
- Tách biệt trạng thái nháp (draft state) trong lúc thao tác trong modal với state chính thức ở ngoài parent.
- Khi người dùng bấm "Áp dụng" (`handleApplySelected`), đồng bộ `onToggleMemberCard?.(isMemberCardSelected && !isMemberCardLocked)`.
- Khi người dùng đóng modal không áp dụng (bấm X, click backdrop, phím Escape), hoàn trả lại trạng thái ban đầu của `isMemberCardSelectedProp` để không gây hiệu ứng phụ ra ngoài cha.

## Risks / Trade-offs

- **[Risk]** Khách hàng đã chọn thẻ hội viên trước, sau đó chọn Campaign độc quyền:
  → **Mitigation**: Khi Campaign độc quyền được áp dụng, `isMemberExcludedByPromotions` tự động đưa `memberDiscount` về 0 và chuyển sang thông báo "Không áp dụng đồng thời với ưu đãi đã chọn". Khi gỡ Campaign độc quyền, thẻ hội viên tự động được khôi phục quyền lợi.
