import React from "react";
import { render, screen, fireEvent, waitFor, cleanup } from "@testing-library/react";
import "@testing-library/jest-dom";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import WardSelectCombobox from "@/components/Checkout/WardSelectCombobox";
import CheckoutForm from "@/components/Checkout/CheckoutForm";
import MobileCartFlow from "@/components/Header/MobileCartFlow";
import * as wardMapping from "@/data/wardMapping";
import {
  validateAddressWardMatch,
  formatWardLabel,
  type WardCatalogEntry,
} from "@/data/wardMapping";
import * as orderService from "@/services/orderService";
import * as authService from "@/services/authService";
import * as contactService from "@/services/contactService";

vi.mock("next-intl", () => ({
  useTranslations: () => {
    const t = (key: string, params?: Record<string, unknown>) => {
      const map: Record<string, string> = {
        name_placeholder: "Nhập họ và tên người nhận",
        phone_placeholder: "Nhập số điện thoại nhận hàng",
        email_placeholder: "Nhập địa chỉ email",
        ward_label: "Phường / Xã",
        ward_select_placeholder: "Chọn hoặc gõ tìm Phường / Xã...",
        ward_select_clear: "Xóa lựa chọn",
        ward_select_not_found: `Không tìm thấy Phường / Xã phù hợp với "${params?.query || ""}"`,
        ward_select_required: "Vui lòng chọn Phường / Xã giao hàng",
        street_label: "Số nhà, tên đường",
        address_placeholder: "Nhập số nhà, tên đường...",
        "validation.ward_required": "Vui lòng chọn Phường / Xã",
        "validation.address_required": "Vui lòng nhập địa chỉ giao hàng",
        "validation.form_incomplete": "Vui lòng kiểm tra lại thông tin",
        "validation.phone_required": "Vui lòng nhập số điện thoại.",
        "validation.phone_invalid": "Số điện thoại không hợp lệ. Vui lòng nhập đúng 10 số để nhận cuộc gọi xác nhận.",
        shipping_calculation_failed: "Chưa tính được phí ship, vui lòng thử lại",
        invalid_saved_ward_notice: "Địa chỉ đã lưu có Phường/Xã cũ. Vui lòng chọn lại Phường Mới hợp lệ theo sáp nhập 2025.",
      };
      return map[key] || key;
    };
    t.rich = (key: string) => key;
    return t;
  },
  useLocale: () => "vi",
}));

vi.mock("@/i18n/routing", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  usePathname: () => "/checkout",
  Link: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

vi.mock("next/navigation", () => ({
  useSearchParams: () => ({
    get: () => null,
  }),
}));

const MOCK_USER = {
  id: 1,
  name: "Nguyễn Văn Khách",
  phone: "0909123456",
  email: "khach@example.com",
};
const mockRefreshUser = vi.fn().mockResolvedValue(undefined);

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({
    user: MOCK_USER,
    token: "mock-token",
    isAuthenticated: true,
    refreshUser: mockRefreshUser,
  }),
  getMemberTier: () => ({
    tier: "member",
    name: "Thành viên",
    discountPercent: 0,
    label: "",
  }),
  calculateMemberDiscount: () => 0,
}));

vi.mock("@/contexts/CartContext", () => ({
  useCart: () => ({
    cartItems: [
      {
        id: "1-default",
        productId: 101,
        title: "Chân gà sả tắc",
        unitPrice: 120000,
        quantity: 2,
      },
    ],
    clearCart: vi.fn(),
    restoreCampaignItemsToOriginalPrice: vi.fn(),
    isLoaded: true,
    isCartOpen: true,
    hasOutOfStockItems: false,
    updateQuantity: vi.fn(),
    removeFromCart: vi.fn(),
  }),
}));

vi.mock("@/services/campaignService", () => ({
  getActiveCampaigns: vi.fn().mockResolvedValue([]),
}));

vi.mock("@/services/generalSettingService", () => ({
  getGeneralSettings: vi.fn().mockResolvedValue({ hotline: "024.9999.7122" }),
}));

vi.mock("@/services/authService", () => ({
  getCustomerAddressesApi: vi.fn().mockResolvedValue([]),
  createCustomerAddressApi: vi.fn().mockResolvedValue({}),
  getCachedCustomerAddresses: vi.fn().mockReturnValue([]),
  setCachedCustomerAddresses: vi.fn(),
  checkGuestTierByPhone: vi.fn().mockResolvedValue(null),
}));

// Danh mục Phường/Xã chuẩn mô hình hành chính 2 cấp (Tỉnh/TP -> Phường/Xã mới, không kèm Quận/Huyện cũ)
const MOCK_WARDS: WardCatalogEntry[] = [
  { id: "SG", name: "Sài Gòn", district: "Sài Gòn" },
  { id: "BT", name: "Bến Thành", district: "Bến Thành" },
  { id: "PL", name: "Phước Long", district: "Phước Long" },
  { id: "TD", name: "Thủ Đức", district: "Thủ Đức" },
  { id: "TNP", name: "Tăng Nhơn Phú", district: "Tăng Nhơn Phú" },
  { id: "AK", name: "An Khánh", district: "An Khánh" },
  { id: "LB", name: "Long Bình", district: "Long Bình" },
  { id: "TH", name: "Tân Hưng", district: "Tân Hưng" },
  { id: "HB", name: "Hiệp Bình", district: "Hiệp Bình" },
  { id: "GV", name: "Gò Vấp", district: "Gò Vấp" },
  { id: "AHT", name: "An Hội Tây", district: "An Hội Tây" },
  { id: "CK", name: "Cầu Kiệu", district: "Cầu Kiệu" },
  { id: "TSN", name: "Tân Sơn Nhất", district: "Tân Sơn Nhất" },
  { id: "XH", name: "Xuân Hòa", district: "Xuân Hòa" },
];

describe("Nghiệm thu chống gian lận địa chỉ & phí vận chuyển (Mô hình hành chính 2 cấp TP.HCM)", () => {
  it("TC-FE-01: Hiển thị chuẩn tên Phường mới 2 cấp trong Dropdown WardSelectCombobox và hỗ trợ tìm theo tên Phường cũ", () => {
    expect(formatWardLabel("An Hội Tây", "Gò Vấp", "P.14")).toBe("Phường An Hội Tây");
    expect(formatWardLabel("Sài Gòn", "Sài Gòn")).toBe("Phường Sài Gòn");
    expect(formatWardLabel("Phước Long", "Phước Long")).toBe("Phường Phước Long");

    render(
      <WardSelectCombobox
        wards={MOCK_WARDS}
        selectedWardId=""
        selectedWardName=""
        onSelectWard={vi.fn()}
      />
    );

    const input = screen.getByPlaceholderText("Chọn hoặc gõ tìm Phường / Xã...");
    fireEvent.focus(input);

    // Hiển thị thuần tên Phường mới (không gắn - Quận 1, - TP. Thủ Đức)
    expect(screen.getByText("Phường Sài Gòn")).toBeInTheDocument();
    expect(screen.getByText("Phường An Hội Tây")).toBeInTheDocument();
    expect(screen.getByText("Phường Phước Long")).toBeInTheDocument();

    // Vẫn hỗ trợ gõ tên phường cũ (VD: Bến Nghé) để lọc ra đúng Phường Sài Gòn
    fireEvent.change(input, { target: { value: "Bến Nghé" } });
    expect(screen.getByText("Phường Sài Gòn")).toBeInTheDocument();
  });

  it("TC-FE-02: Gian lận chọn Phường Sài Gòn giá rẻ (20k) nhưng nhập địa chỉ thuộc khu vực Phường Phước Long / Phường Tân Hưng / Tỉnh khác", () => {
    // 1. Chọn Phường Sài Gòn nhưng nhập địa chỉ 150 Đỗ Xuân Hợp, Phường Phước Long B
    const phuocLongFraud = validateAddressWardMatch({
      streetAddress: "150 Đỗ Xuân Hợp, Phường Phước Long B, TP. Thủ Đức",
      selectedWard: "Sài Gòn",
      selectedWardId: "SG",
      selectedDistrict: "Sài Gòn",
      availableWards: MOCK_WARDS,
    });
    expect(phuocLongFraud.isValid).toBe(false);
    expect(phuocLongFraud.suggestedWard?.name).toBe("Phước Long");
    expect(phuocLongFraud.message).toContain("Phường Phước Long");
    expect(phuocLongFraud.message).toContain("Gợi ý: Phường Phước Long.");

    // 2. Chọn Phường Sài Gòn nhưng nhập địa chỉ 300 Nguyễn Thị Thập
    const tanHungFraud = validateAddressWardMatch({
      streetAddress: "300 Nguyễn Thị Thập, Quận 7",
      selectedWard: "Sài Gòn",
      selectedWardId: "SG",
      selectedDistrict: "Sài Gòn",
      availableWards: MOCK_WARDS,
    });
    expect(tanHungFraud.isValid).toBe(false);
    expect(tanHungFraud.conflictType).toBe("district_conflict");
    expect(tanHungFraud.suggestedWard?.name).toBe("Tân Hưng");
    expect(tanHungFraud.message).toContain("Phường Tân Hưng");

    // 3. Chọn Phường Sài Gòn nhưng nhập địa chỉ Dĩ An, Bình Dương
    const provinceFraud = validateAddressWardMatch({
      streetAddress: "12 Nguyễn An Ninh, Dĩ An, Bình Dương",
      selectedWard: "Sài Gòn",
      selectedWardId: "SG",
      selectedDistrict: "Sài Gòn",
      availableWards: MOCK_WARDS,
    });
    expect(provinceFraud.isValid).toBe(false);
    expect(provinceFraud.conflictType).toBe("province_conflict");
    expect(provinceFraud.message).toContain("Bình Dương");
  });

  it("TC-FE-03: Gian lận ẩn tên Phường - chỉ nhập số nhà + tên đường hoặc khu đô thị xa", () => {
    // 1. Chỉ nhập "S2.05 Vinhomes Grand Park" khi đang chọn Phường Bến Thành
    const vgpFraud = validateAddressWardMatch({
      streetAddress: "S2.05 Vinhomes Grand Park",
      selectedWard: "Bến Thành",
      selectedWardId: "BT",
      selectedDistrict: "Bến Thành",
      availableWards: MOCK_WARDS,
    });
    expect(vgpFraud.isValid).toBe(false);
    expect(vgpFraud.conflictType).toBe("street_conflict");
    expect(vgpFraud.suggestedWard?.name).toBe("Long Bình");
    expect(vgpFraud.message).toContain("Phường Long Bình");

    // 2. Chỉ nhập "120 Lê Văn Việt" khi đang chọn Phường Bến Thành
    const lvvFraud = validateAddressWardMatch({
      streetAddress: "120 Lê Văn Việt",
      selectedWard: "Bến Thành",
      selectedWardId: "BT",
      selectedDistrict: "Bến Thành",
      availableWards: MOCK_WARDS,
    });
    expect(lvvFraud.isValid).toBe(false);
    expect(lvvFraud.conflictType).toBe("street_conflict");
    expect(lvvFraud.suggestedWard?.name).toBe("Tăng Nhơn Phú");
    expect(lvvFraud.message).toContain("Phường Tăng Nhơn Phú");
  });

  it("TC-FE-04: Kiểm tra tên Phường cũ sau sáp nhập (Thảo Điền -> Phường An Khánh, P.14 Gò Vấp -> Phường An Hội Tây) & Hợp lệ khi khớp", () => {
    // 1. Nhập sai: Chọn Phường Sài Gòn, gõ "15 Quốc Hương, Thảo Điền" -> Chặn & gợi ý Phường An Khánh
    const thaoDienMismatch = validateAddressWardMatch({
      streetAddress: "15 Quốc Hương, Thảo Điền",
      selectedWard: "Sài Gòn",
      selectedWardId: "SG",
      selectedDistrict: "Sài Gòn",
      availableWards: MOCK_WARDS,
    });
    expect(thaoDienMismatch.isValid).toBe(false);
    expect(thaoDienMismatch.conflictType).toBe("ward_conflict");
    expect(thaoDienMismatch.suggestedWard?.name).toBe("An Khánh");
    expect(thaoDienMismatch.message).toContain("Phường An Khánh");

    // 2. Nhập sai: Chọn Phường Sài Gòn, gõ "99 Đường số 1, P.14, Gò Vấp" -> Chặn & gợi ý Phường An Hội Tây
    const p14GoVapMismatch = validateAddressWardMatch({
      streetAddress: "99 Đường số 1, P.14, Gò Vấp",
      selectedWard: "Sài Gòn",
      selectedWardId: "SG",
      selectedDistrict: "Sài Gòn",
      availableWards: MOCK_WARDS,
    });
    expect(p14GoVapMismatch.isValid).toBe(false);
    expect(p14GoVapMismatch.suggestedWard?.name).toBe("An Hội Tây");
    expect(p14GoVapMismatch.message).toContain("Phường An Hội Tây");

    // 3. Nhập đúng: Chọn đúng Phường Phước Long, gõ "150 Đỗ Xuân Hợp, Phường Phước Long" -> Hợp lệ
    const validPhuocLong = validateAddressWardMatch({
      streetAddress: "150 Đỗ Xuân Hợp, Phường Phước Long",
      selectedWard: "Phước Long",
      selectedWardId: "PL",
      selectedDistrict: "Phước Long",
      availableWards: MOCK_WARDS,
    });
    expect(validPhuocLong.isValid).toBe(true);

    // 4. Nhập đúng: Chọn đúng Phường An Hội Tây, gõ "99 Quang Trung, Phường An Hội Tây" -> Hợp lệ
    const validAnHoiTay = validateAddressWardMatch({
      streetAddress: "99 Quang Trung, Phường An Hội Tây",
      selectedWard: "An Hội Tây",
      selectedWardId: "AHT",
      selectedDistrict: "An Hội Tây",
      availableWards: MOCK_WARDS,
    });
    expect(validAnHoiTay.isValid).toBe(true);

    // 5. Chọn Phường Phước Long nhưng gõ "100 Võ Văn Ngân, Phường Thủ Đức" -> Chặn & gợi ý Phường Thủ Đức
    const thuDucWardMismatch = validateAddressWardMatch({
      streetAddress: "100 Võ Văn Ngân, Phường Thủ Đức",
      selectedWard: "Phước Long",
      selectedWardId: "PL",
      selectedDistrict: "Phước Long",
      availableWards: MOCK_WARDS,
    });
    expect(thuDucWardMismatch.isValid).toBe(false);
    expect(thuDucWardMismatch.conflictType).toBe("ward_conflict");
    expect(thuDucWardMismatch.suggestedWard?.name).toBe("Thủ Đức");
    expect(thuDucWardMismatch.message).toContain("Phường Thủ Đức");

    // 6. Chọn Phường An Hội Tây nhưng gõ "1073 Phan Văn Trị, Phường Gò Vấp" -> Chặn & gợi ý Phường Gò Vấp
    const goVapWardMismatch = validateAddressWardMatch({
      streetAddress: "1073 Phan Văn Trị, Phường Gò Vấp",
      selectedWard: "An Hội Tây",
      selectedWardId: "AHT",
      selectedDistrict: "An Hội Tây",
      availableWards: MOCK_WARDS,
    });
    expect(goVapWardMismatch.isValid).toBe(false);
    expect(goVapWardMismatch.conflictType).toBe("ward_conflict");
    expect(goVapWardMismatch.suggestedWard?.name).toBe("Gò Vấp");
    expect(goVapWardMismatch.message).toContain("Phường Gò Vấp");

    // 7. Gõ đường Xuân Thủy (khu Thảo Điền cũ) -> Luôn gợi ý Phường An Khánh, tuyệt đối không gợi ý Thảo Điền
    const xuanThuyMismatch = validateAddressWardMatch({
      streetAddress: "25 Xuân Thủy",
      selectedWard: "Sài Gòn",
      selectedWardId: "SG",
      selectedDistrict: "Sài Gòn",
      availableWards: MOCK_WARDS,
    });
    expect(xuanThuyMismatch.isValid).toBe(false);
    expect(xuanThuyMismatch.suggestedWard?.name).toBe("An Khánh");
    expect(xuanThuyMismatch.message).toContain("Phường An Khánh");
    expect(xuanThuyMismatch.message).not.toContain("Thảo Điền");
  });

  describe("TC-FE-05: Luồng UI Checkout thực tế (Cảnh báo + Chặn Submit + 1-Click đổi sang Phường Phước Long cập nhật phí ship 20k -> 45k + Đặt hàng thành công)", () => {
    afterEach(() => {
      cleanup();
      vi.restoreAllMocks();
    });

    beforeEach(() => {
      vi.clearAllMocks();
      vi.spyOn(wardMapping, "verifyAddressViaMapApi").mockImplementation(async (params) => {
        return wardMapping.validateAddressWardMatch(params);
      });
      vi.spyOn(authService, "getCustomerAddressesApi").mockResolvedValue([]);
      vi.spyOn(authService, "getCachedCustomerAddresses").mockReturnValue([]);
      vi.spyOn(orderService, "getCheckoutConfig").mockResolvedValue({
        delivery_types: [{ value: "delivery", label: "Giao tận nơi" }],
        default_shipping_fee: "30000",
        branches: [{ id: 1, branchName: "Chi nhánh Trần Đình Xu", address: "42/2 Trần Đình Xu", contactNumber: "0123", isActive: true }],
      } as any);
      vi.spyOn(orderService, "getAdministrativeUnits").mockResolvedValue([
        {
          id: "HCM",
          name: "TP. Hồ Chí Minh",
          wards: MOCK_WARDS,
        },
      ]);
      vi.spyOn(orderService, "getShippingSettings").mockResolvedValue({
        free_shipping_threshold: 400000,
        default_shipping_fee: 30000,
        can_combine_with_promotions: true,
        can_combine_with_freeship: true,
      } as any);
      vi.spyOn(orderService, "getLoyaltySettings").mockResolvedValue({
        can_combine_with_promotions: true,
        can_combine_with_freeship: true,
      } as any);
      vi.spyOn(orderService, "getAvailableVouchers").mockResolvedValue([]);
      vi.spyOn(orderService, "calculateShippingFee").mockImplementation(async (params) => ({
        shipping_fee: params.ward === "Phước Long" ? 45000 : 20000,
        original_fee: params.ward === "Phước Long" ? 45000 : 20000,
        shipping_discount: 0,
        is_freeship: false,
        is_deliverable: true,
        is_configured_area: true,
        branch_id: 1,
        branch_name: "Chi nhánh Trần Đình Xu",
      }));
      vi.spyOn(orderService, "createOrder").mockResolvedValue({
        success: true,
        data: { order_code: "ORD-VERIFIED-01" },
      } as any);
    });

    it("chặn Submit khi chọn Phường Sài Gòn (20k) nhưng nhập địa chỉ Đỗ Xuân Hợp, và cho phép Submit sau khi bấm 1-Click đổi sang Phường Phước Long (45k)", async () => {
      render(
        <CheckoutForm
          order={null}
          config={{
            delivery_types: [{ value: "delivery", label: "Giao tận nơi" }],
            default_shipping_fee: "30000",
            branches: [{ id: 1, branchName: "Chi nhánh Trần Đình Xu", address: "42/2 Trần Đình Xu", contactNumber: "0123", isActive: true }],
          }}
        />
      );

      await waitFor(() => {
        expect(orderService.getAdministrativeUnits).toHaveBeenCalled();
        expect(screen.getByTestId("desktop-street-address-input")).toBeInTheDocument();
        expect(screen.getByTestId("desktop-ward-select-input")).toBeInTheDocument();
      });

      // Bước 1: Khách chọn Phường Sài Gòn (phí ship 20.000đ)
      const desktopWardInput = screen.getByTestId("desktop-ward-select-input");
      fireEvent.focus(desktopWardInput);
      fireEvent.click(desktopWardInput);
      const saiGonOption = await screen.findByTestId("desktop-ward-select-option-SG");
      fireEvent.click(saiGonOption);

      await waitFor(() => {
        expect(orderService.calculateShippingFee).toHaveBeenCalledWith(
          expect.objectContaining({
            ward: "Sài Gòn",
            ward_id: "SG",
          })
        );
      });

      // Nhập địa chỉ xa: "150 Đỗ Xuân Hợp"
      const streetInput = screen.getByTestId("desktop-street-address-input");
      fireEvent.change(streetInput, { target: { value: "150 Đỗ Xuân Hợp" } });

      // Cảnh báo xuất hiện sau khi hoàn tất xác minh kèm gợi ý Phường Phước Long
      await waitFor(() => {
        expect(screen.queryByTestId("address-verifying-loader")).not.toBeInTheDocument();
        const warningBox = screen.getByTestId("address-ward-mismatch-warning");
        expect(warningBox).toBeInTheDocument();
        expect(warningBox.textContent).toContain("Phường Phước Long");
      }, { timeout: 4000 });

      // Tick xác nhận thông tin và cố tình bấm Đặt hàng -> Bị chặn, createOrder KHÔNG được gọi
      const confirmCheckbox = screen.getByTestId("desktop-confirm-checkbox");
      fireEvent.click(confirmCheckbox);

      const submitBtn = screen.getByTestId("checkout-submit-btn");
      fireEvent.click(submitBtn);
      expect(orderService.createOrder).not.toHaveBeenCalled();

      // Bước 2: Khách bấm nút 1-click [Đổi sang Phường Phước Long]
      const switchBtn = await screen.findByTestId("apply-suggested-ward-btn");
      expect(switchBtn.textContent).toContain("Đổi sang Phường Phước Long");
      fireEvent.click(switchBtn);

      // Tự động đổi sang Phường Phước Long, tính lại phí ship (45.000đ) và xóa cảnh báo
      await waitFor(() => {
        expect(screen.queryByTestId("address-ward-mismatch-warning")).not.toBeInTheDocument();
      }, { timeout: 4000 });

      await waitFor(() => {
        expect(orderService.calculateShippingFee).toHaveBeenCalledWith(
          expect.objectContaining({
            ward: "Phước Long",
            ward_id: "PL",
          })
        );
        expect((submitBtn as HTMLButtonElement).disabled).toBe(false);
      }, { timeout: 8000 });

      // Bước 3: Bấm Đặt hàng lại -> Submit thành công với đúng Phường Phước Long
      fireEvent.click(submitBtn);

      await waitFor(() => {
        expect(orderService.createOrder).toHaveBeenCalledTimes(1);
      }, { timeout: 4000 });

      const orderPayload = (orderService.createOrder as any).mock.calls[0][0];
      expect(orderPayload.delivery.ward).toBe("Phước Long");
      expect(orderPayload.delivery.ward_id).toBe("PL");
      expect(orderPayload.delivery.address).toContain("150 Đỗ Xuân Hợp");
    });

    it("Mục 2, 5, 6 & 7: khi đang cảnh báo sai phường (ward_mismatch), KHÔNG còn nút 'Địa chỉ của tôi đúng, giữ Phường...', nút Đặt hàng bị disabled kèm Hotline và nút 'Yêu cầu cửa hàng gọi lại' gửi POST /api/v1/contacts", async () => {
      const callbackSpy = vi.spyOn(contactService, "submitAddressCallbackRequest").mockResolvedValue({
        success: true,
        message: "Đã tiếp nhận yêu cầu gọi lại.",
      });

      render(
        <CheckoutForm
          order={null}
          config={{
            delivery_types: [{ value: "delivery", label: "Giao tận nơi" }],
            default_shipping_fee: "30000",
            branches: [{ id: 1, branchName: "Chi nhánh Trần Đình Xu", address: "42/2 Trần Đình Xu", contactNumber: "0123", isActive: true }],
          }}
        />
      );

      await waitFor(() => {
        expect(orderService.getAdministrativeUnits).toHaveBeenCalled();
        expect(screen.getByTestId("desktop-street-address-input")).toBeInTheDocument();
        expect(screen.getByTestId("desktop-ward-select-input")).toBeInTheDocument();
      });

      const desktopWardInput = screen.getByTestId("desktop-ward-select-input");
      fireEvent.focus(desktopWardInput);
      fireEvent.click(desktopWardInput);
      const saiGonOption = await screen.findByTestId("desktop-ward-select-option-SG");
      fireEvent.click(saiGonOption);

      await waitFor(() => {
        expect(orderService.calculateShippingFee).toHaveBeenCalledWith(
          expect.objectContaining({
            ward: "Sài Gòn",
            ward_id: "SG",
          })
        );
      });

      const streetInput = screen.getByTestId("desktop-street-address-input");
      fireEvent.change(streetInput, { target: { value: "150 Đỗ Xuân Hợp" } });

      await waitFor(() => {
        expect(screen.queryByTestId("address-verifying-loader")).not.toBeInTheDocument();
        const warningBox = screen.getByTestId("address-ward-mismatch-warning");
        expect(warningBox).toBeInTheDocument();
      }, { timeout: 4000 });

      // Mục 6 & 7: Tuyệt đối KHÔNG còn nút "Địa chỉ của tôi đúng, giữ Phường..."
      expect(screen.queryByTestId("keep-selected-ward-btn")).not.toBeInTheDocument();

      // Mục 2: Có nút 1-click đổi phường gợi ý, nút Hotline và nút "Yêu cầu cửa hàng gọi lại"
      expect(screen.getByTestId("apply-suggested-ward-btn")).toBeInTheDocument();
      expect(screen.getByTestId("request-store-callback-btn")).toBeInTheDocument();

      const confirmCheckbox = screen.getByTestId("desktop-confirm-checkbox");
      fireEvent.click(confirmCheckbox);

      const submitBtn = screen.getByTestId("checkout-submit-btn") as HTMLButtonElement;
      expect(submitBtn.disabled).toBe(true);

      // Mục 5: Khách bấm "Yêu cầu cửa hàng gọi lại" -> tự lấy name, phone, address, ward, items từ form Checkout
      fireEvent.click(screen.getByTestId("request-store-callback-btn"));

      await waitFor(() => {
        expect(callbackSpy).toHaveBeenCalledTimes(1);
        expect(screen.getByTestId("callback-request-success-notice")).toBeInTheDocument();
      });

      expect(callbackSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          name: "Nguyễn Văn Khách",
          phone: "0909123456",
          is_callback_request: true,
          type: "address_callback",
          address: "150 Đỗ Xuân Hợp",
          ward: "Sài Gòn",
          suggested_ward: "Phước Long",
          verification_status: "ward_mismatch",
          items: [
            expect.objectContaining({
              product_id: 101,
              product_name: "Chân gà sả tắc",
              quantity: 2,
              price: 120000,
            }),
          ],
        })
      );

      // Không tạo đơn hàng khi yêu cầu gọi lại
      expect(orderService.createOrder).not.toHaveBeenCalled();
    });

    it("Mục 3, 4 & 5: chặn đặt hàng với missing_house_number, ambiguous_multiple_wards (không cho tự chọn danh sách nhiều phường), unverifiable / api_error và nhắc điền Tên/SĐT nếu thiếu khi bấm Yêu cầu cửa hàng gọi lại", async () => {
      const callbackSpy = vi.spyOn(contactService, "submitAddressCallbackRequest").mockResolvedValue({
        success: true,
        message: "Đã tiếp nhận yêu cầu gọi lại.",
      });

      render(
        <CheckoutForm
          order={null}
          config={{
            delivery_types: [{ value: "delivery", label: "Giao tận nơi" }],
            default_shipping_fee: "30000",
            branches: [{ id: 1, branchName: "Chi nhánh Trần Đình Xu", address: "42/2 Trần Đình Xu", contactNumber: "0123", isActive: true }],
          }}
        />
      );

      await waitFor(() => {
        expect(orderService.getAdministrativeUnits).toHaveBeenCalled();
        expect(screen.getByTestId("desktop-street-address-input")).toBeInTheDocument();
      });

      const streetInput = screen.getByTestId("desktop-street-address-input");
      const confirmCheckbox = screen.getByTestId("desktop-confirm-checkbox");
      fireEvent.click(confirmCheckbox);
      const submitBtn = screen.getByTestId("checkout-submit-btn") as HTMLButtonElement;

      // 1. Mục 4: Thiếu số nhà ("Đỗ Xuân Hợp") -> hiển thị cảnh báo thiếu số nhà & khóa đặt hàng
      fireEvent.change(streetInput, { target: { value: "Đỗ Xuân Hợp" } });
      await waitFor(() => {
        expect(screen.getByTestId("address-missing-house-number-warning")).toBeInTheDocument();
      });
      expect(submitBtn.disabled).toBe(true);

      // 2. Mục 3: API trả nhiều phường mới khác nhau (ambiguous_multiple_wards) -> hiển thị cảnh báo hỗ trợ, KHÔNG hiển thị nút chọn phường, khóa đặt hàng
      vi.spyOn(wardMapping, "verifyAddressViaMapApi").mockResolvedValueOnce({
        isValid: false,
        verificationStatus: "ambiguous_multiple_wards",
        canOrder: false,
        requiresCallback: true,
        message: "Hệ thống tìm thấy nhiều địa chỉ trùng tên ở các phường khác nhau.",
        suggestedWards: [],
      });

      fireEvent.change(streetInput, { target: { value: "100 Phan Văn Trị" } });

      await waitFor(() => {
        expect(screen.getByTestId("address-ambiguous-support-warning")).toBeInTheDocument();
      }, { timeout: 4000 });

      expect(screen.queryByTestId("select-suggested-ward-btn")).not.toBeInTheDocument();
      expect(screen.queryByTestId("apply-suggested-ward-btn")).not.toBeInTheDocument();
      expect(submitBtn.disabled).toBe(true);

      // 3. Mục 5: Nếu khách xóa Tên trên form Checkout rồi bấm "Yêu cầu cửa hàng gọi lại" -> nhắc khách nhập Tên & SĐT trước khi gửi
      const nameInputs = screen.getAllByPlaceholderText("Nhập họ và tên người nhận");
      const nameInput = nameInputs[nameInputs.length - 1];
      fireEvent.change(nameInput, { target: { value: "   " } });

      fireEvent.click(screen.getByTestId("request-store-callback-btn"));
      await waitFor(() => {
        expect(screen.getByTestId("callback-request-error-notice")).toBeInTheDocument();
      });
      expect(callbackSpy).not.toHaveBeenCalled();

      // Điền lại Tên hợp lệ và bấm lại "Yêu cầu cửa hàng gọi lại" -> gửi thành công
      fireEvent.change(nameInput, { target: { value: "Trần Thị Khách" } });
      fireEvent.click(screen.getByTestId("request-store-callback-btn"));

      await waitFor(() => {
        expect(callbackSpy).toHaveBeenCalledTimes(1);
        expect(screen.getByTestId("callback-request-success-notice")).toBeInTheDocument();
      });
    });

    it("TC-FE-06: khi nhập địa chỉ có số nhà (500 Cách Mạng Tháng 8), hiển thị loading 'Đang xác định khu vực giao hàng...' và KHÔNG hiển thị 5-6 nút gợi ý từ sync dictionary", async () => {
      let resolveVerify: (val: any) => void = () => {};
      const verifyPromise = new Promise((resolve) => {
        resolveVerify = resolve;
      });
      const verifySpy = vi.spyOn(wardMapping, "verifyAddressViaMapApi").mockReturnValue(verifyPromise as any);

      try {
        render(
          <CheckoutForm
            order={null}
            config={{
              delivery_types: [{ value: "delivery", label: "Giao tận nơi" }],
              default_shipping_fee: "30000",
              branches: [{ id: 1, branchName: "Chi nhánh Trần Đình Xu", address: "42/2 Trần Đình Xu", contactNumber: "0123", isActive: true }],
            }}
          />
        );

        await waitFor(() => {
          expect(orderService.getAdministrativeUnits).toHaveBeenCalled();
          expect(screen.getByTestId("desktop-street-address-input")).toBeInTheDocument();
          expect(screen.getByTestId("desktop-ward-select-input")).toBeInTheDocument();
        });

        // Chọn Phường Phước Long (xa trung tâm, không đi qua đường CMT8)
        const desktopWardInput = screen.getByTestId("desktop-ward-select-input");
        fireEvent.focus(desktopWardInput);
        fireEvent.click(desktopWardInput);
        const plOption = await screen.findByTestId("desktop-ward-select-option-PL");
        fireEvent.click(plOption);

        await waitFor(() => {
          expect(orderService.calculateShippingFee).toHaveBeenCalledWith(
            expect.objectContaining({
              ward: "Phước Long",
              ward_id: "PL",
            })
          );
        });

        // Nhập địa chỉ trục đường dài có số nhà: "500 Cách Mạng Tháng 8"
        const streetInput = await screen.findByTestId("desktop-street-address-input");
        fireEvent.change(streetInput, { target: { value: "500 Cách Mạng Tháng 8" } });

        // Trong lúc chờ API geocode (debounce hoặc đang fetch):
        // 1. Phải hiển thị spinner loading "Đang xác định khu vực giao hàng..."
        // 2. Tuyệt đối KHÔNG hiển thị khung cảnh báo 5-6 phường từ sync dictionary
        await waitFor(() => {
          const loader = screen.getByTestId("address-verifying-loader");
          expect(loader).toBeInTheDocument();
          expect(loader.textContent).toContain("Đang xác định khu vực giao hàng");
          expect(screen.queryByTestId("address-ward-mismatch-warning")).not.toBeInTheDocument();
        }, { timeout: 4000 });

        // Đợi debounce timer (350ms) kết thúc và API thực sự được gọi
        await waitFor(() => {
          expect(verifySpy).toHaveBeenCalled();
        }, { timeout: 4000 });

        // Giả lập API geocode trả về kết quả chính xác duy nhất: Phường Xuân Hòa
        resolveVerify({
          isValid: false,
          verificationStatus: "ward_mismatch",
          verifiedWard: { id: "XH", name: "Xuân Hòa", district: "Xuân Hòa" },
          isWardMatched: false,
          canOrder: false,
          requiresCallback: true,
          conflictType: "street_conflict",
          detectedArea: "Phường Xuân Hòa",
          message: "Địa chỉ bạn nhập thuộc Phường Xuân Hòa. Vui lòng đổi phường.",
          suggestedWard: { id: "XH", name: "Xuân Hòa", district: "Xuân Hòa" },
          suggestedWards: [{ id: "XH", name: "Xuân Hòa", district: "Xuân Hòa" }],
        });

        // Sau khi API trả về:
        // 1. Loader biến mất
        // 2. Chỉ hiển thị cảnh báo với đúng 1 phường gợi ý (Xuân Hòa), không bị chớp 5-6 phường
        await waitFor(() => {
          expect(screen.queryByTestId("address-verifying-loader")).not.toBeInTheDocument();
          expect(screen.getByTestId("address-ward-mismatch-warning")).toBeInTheDocument();
        }, { timeout: 4000 });

        const warningBox = screen.getByTestId("address-ward-mismatch-warning");
        expect(warningBox.textContent).toContain("Phường Xuân Hòa");
        expect(screen.queryByText("Đổi sang Phường Bến Thành")).not.toBeInTheDocument();
      } finally {
        verifySpy.mockRestore();
      }
    });

    it("A03 & Ma trận #2 & D02 (Desktop): Khóa nút Đặt hàng khi đã nhập địa chỉ nhưng chưa chọn phường hoặc chỉ nhập khoảng trắng", async () => {
      vi.spyOn(wardMapping, "verifyAddressViaMapApi").mockResolvedValue({
        isValid: true,
        verificationStatus: "verified_single_ward",
        verifiedWard: "Phước Long",
        isWardMatched: false,
        canOrder: false,
        requiresCallback: false,
        detectedArea: "Phường Phước Long",
        suggestedWard: { id: "PL", name: "Phước Long", district: "Phước Long" },
        suggestedWards: [{ id: "PL", name: "Phước Long", district: "Phước Long" }],
      });

      render(
        <CheckoutForm
          order={null}
          config={{
            delivery_types: [{ value: "delivery", label: "Giao tận nơi" }],
            default_shipping_fee: "30000",
            branches: [{ id: 1, branchName: "Chi nhánh Trần Đình Xu", address: "42/2 Trần Đình Xu", contactNumber: "0123", isActive: true }],
          }}
        />
      );

      await waitFor(() => {
        expect(screen.getByTestId("desktop-street-address-input")).toBeInTheDocument();
      });

      const confirmCheckbox = screen.getByTestId("desktop-confirm-checkbox");
      fireEvent.click(confirmCheckbox);
      const submitBtn = screen.getByTestId("checkout-submit-btn") as HTMLButtonElement;
      const streetInput = screen.getByTestId("desktop-street-address-input");

      // D02: Chỉ nhập toàn khoảng trắng -> coi như thiếu số nhà & khóa nút
      fireEvent.change(streetInput, { target: { value: "   " } });
      await waitFor(() => {
        expect(screen.getByTestId("address-missing-house-number-warning")).toBeInTheDocument();
      });
      expect(submitBtn.disabled).toBe(true);

      // A03 & Ma trận #2: Nhập đủ địa chỉ nhưng CHƯA chọn phường -> nút Đặt hàng vẫn bị khóa
      fireEvent.change(streetInput, { target: { value: "150 Đỗ Xuân Hợp" } });
      await waitFor(() => {
        expect(screen.getByTestId("select-suggested-ward-btn")).toBeInTheDocument();
      }, { timeout: 4000 });
      expect(submitBtn.disabled).toBe(true);

      // Bấm chọn phường gợi ý -> tính ship xong -> nút Đặt hàng mở khóa
      fireEvent.click(screen.getByTestId("select-suggested-ward-btn"));
      await waitFor(() => {
        expect(orderService.calculateShippingFee).toHaveBeenCalledWith(
          expect.objectContaining({ ward: "Phước Long", ward_id: "PL" })
        );
        expect(submitBtn.disabled).toBe(false);
      }, { timeout: 4000 });
    });

    it("E05 (Desktop): Double-click nút Yêu cầu cửa hàng gọi lại chỉ gửi 1 request và khóa nút sau khi gửi thành công cho đến khi sửa thông tin", async () => {
      let resolveCallback: (v: any) => void = () => {};
      const callbackSpy = vi.spyOn(contactService, "submitAddressCallbackRequest").mockImplementation(
        () => new Promise((resolve) => { resolveCallback = resolve; })
      );

      render(
        <CheckoutForm
          order={null}
          config={{
            delivery_types: [{ value: "delivery", label: "Giao tận nơi" }],
            default_shipping_fee: "30000",
            branches: [{ id: 1, branchName: "Chi nhánh Trần Đình Xu", address: "42/2 Trần Đình Xu", contactNumber: "0123", isActive: true }],
          }}
        />
      );

      await waitFor(() => {
        expect(screen.getByTestId("desktop-street-address-input")).toBeInTheDocument();
      });

      vi.spyOn(wardMapping, "verifyAddressViaMapApi").mockResolvedValue({
        isValid: false,
        verificationStatus: "unverifiable",
        canOrder: false,
        requiresCallback: true,
        message: "Không xác minh được địa chỉ.",
        suggestedWards: [],
      });

      const streetInput = screen.getByTestId("desktop-street-address-input");
      fireEvent.change(streetInput, { target: { value: "999 Không Tồn Tại" } });

      const callbackBtn = await screen.findByTestId("request-store-callback-btn", {}, { timeout: 4000 });
      // Rapid double-click đồng bộ trước khi React re-render
      fireEvent.click(callbackBtn);
      fireEvent.click(callbackBtn);
      expect(callbackSpy).toHaveBeenCalledTimes(1);

      resolveCallback({ success: true, message: "OK" });
      await waitFor(() => {
        expect(screen.getByTestId("callback-request-success-notice")).toBeInTheDocument();
      });
      expect((screen.getByTestId("request-store-callback-btn") as HTMLButtonElement).disabled).toBe(true);

      // Click thêm lần nữa khi đã thành công -> không gửi trùng
      fireEvent.click(screen.getByTestId("request-store-callback-btn"));
      expect(callbackSpy).toHaveBeenCalledTimes(1);

      // Khi sửa tên -> cho phép gửi lại
      const nameInputs = screen.getAllByPlaceholderText("Nhập họ và tên người nhận");
      fireEvent.change(nameInputs[nameInputs.length - 1], { target: { value: "Nguyễn Văn Mới" } });
      await waitFor(() => {
        expect((screen.getByTestId("request-store-callback-btn") as HTMLButtonElement).disabled).toBe(false);
      });
    });
  });

  describe("TC-FE-07: MobileCartFlow parity (Ma trận #2 & #7, A03, H04 race condition, H07 saved address, E05 double-click, E07 phone_invalid)", () => {
    afterEach(() => {
      cleanup();
      vi.restoreAllMocks();
    });

    beforeEach(() => {
      vi.clearAllMocks();
      vi.spyOn(wardMapping, "verifyAddressViaMapApi").mockImplementation(async (params) => {
        return wardMapping.validateAddressWardMatch(params);
      });
      vi.spyOn(authService, "getCustomerAddressesApi").mockResolvedValue([]);
      vi.spyOn(authService, "getCachedCustomerAddresses").mockReturnValue([]);
      vi.spyOn(orderService, "getCheckoutConfig").mockResolvedValue({
        delivery_types: [{ value: "delivery", label: "Giao tận nơi" }],
        default_shipping_fee: "30000",
        branches: [{ id: 1, branchName: "Chi nhánh Trần Đình Xu", address: "42/2 Trần Đình Xu", contactNumber: "0123", isActive: true }],
      } as any);
      vi.spyOn(orderService, "getAdministrativeUnits").mockResolvedValue([
        { id: "HCM", name: "TP. Hồ Chí Minh", wards: MOCK_WARDS },
      ]);
      vi.spyOn(orderService, "getShippingSettings").mockResolvedValue({
        free_shipping_threshold: 400000,
        default_shipping_fee: 30000,
        can_combine_with_promotions: true,
        can_combine_with_freeship: true,
      } as any);
      vi.spyOn(orderService, "getLoyaltySettings").mockResolvedValue({
        can_combine_with_promotions: true,
        can_combine_with_freeship: true,
      } as any);
      vi.spyOn(orderService, "getAvailableVouchers").mockResolvedValue([]);
      vi.spyOn(orderService, "createOrder").mockResolvedValue({
        success: true,
        data: { order_code: "ORD-MOBILE-01" },
      } as any);
    });

    it("Ma trận #7 & H04 (Mobile): Khi calculateShippingFee lỗi -> KHÔNG fallback defaultShippingFee, báo lỗi và khóa nút; Đổi phường nhanh bỏ qua response cũ (race condition)", async () => {
      let resolveFirstWard: (v: any) => void = () => {};
      let resolveSecondWard: (v: any) => void = () => {};
      const shipSpy = vi.spyOn(orderService, "calculateShippingFee")
        .mockRejectedValueOnce(new Error("Shipping service unavailable"))
        .mockImplementationOnce(() => new Promise((r) => { resolveFirstWard = r; }))
        .mockImplementationOnce(() => new Promise((r) => { resolveSecondWard = r; }));

      render(<MobileCartFlow inline={true} />);

      await waitFor(() => {
        expect(orderService.getAdministrativeUnits).toHaveBeenCalled();
        expect(orderService.getCheckoutConfig).toHaveBeenCalled();
        expect(authService.getCustomerAddressesApi).toHaveBeenCalled();
        expect(screen.queryByText(/Đang tải danh sách địa chỉ/i)).not.toBeInTheDocument();
        expect(screen.getByTestId("mobile-ward-select-input")).toBeInTheDocument();
      });
      await waitFor(() => {
        const input = screen.getByTestId("mobile-ward-select-input");
        fireEvent.focus(input);
        fireEvent.click(input);
        expect(screen.getByTestId("mobile-ward-select-option-SG")).toBeInTheDocument();
      });

      const mobileSubmitBtn = screen.getByTestId("mobile-checkout-submit-btn") as HTMLButtonElement;

      // 1. Chọn Phường Sài Gòn nhưng API tính ship bị lỗi -> báo lỗi & khóa nút Đặt hàng (không fallback 30.000đ)
      fireEvent.click(await screen.findByTestId("mobile-ward-select-option-SG"));

      await waitFor(() => {
        expect(screen.getByTestId("mobile-shipping-calculation-error-alert")).toBeInTheDocument();
        expect(screen.getByTestId("mobile-shipping-calculation-error-label")).toBeInTheDocument();
      });
      expect(mobileSubmitBtn.disabled).toBe(true);
      expect(screen.queryByText(/30\.000\s*(đ|VNĐ)/i)).not.toBeInTheDocument();

      // 2. H04: Đổi nhanh sang Phường Bến Thành (chậm 20k) rồi đổi ngay sang Phường Phước Long (nhanh 45k)
      fireEvent.change(screen.getByTestId("mobile-ward-select-input"), { target: { value: "Bến Thành" } });
      fireEvent.click(await screen.findByTestId("mobile-ward-select-option-BT"));

      fireEvent.change(screen.getByTestId("mobile-ward-select-input"), { target: { value: "Phước Long" } });
      fireEvent.click(await screen.findByTestId("mobile-ward-select-option-PL"));

      expect(shipSpy).toHaveBeenCalledTimes(3);

      // Phước Long (45k) trả về trước, Bến Thành (20k) trả về trễ hơn -> KHÔNG được ghi đè 45k thành 20k
      resolveSecondWard({
        shipping_fee: 45000,
        original_fee: 45000,
        shipping_discount: 0,
        is_freeship: false,
        is_deliverable: true,
        branch_id: 1,
        branch_name: "Chi nhánh Trần Đình Xu",
      });
      resolveFirstWard({
        shipping_fee: 20000,
        original_fee: 20000,
        shipping_discount: 0,
        is_freeship: false,
        is_deliverable: true,
        branch_id: 1,
        branch_name: "Chi nhánh Trần Đình Xu",
      });

      await waitFor(() => {
        expect(screen.getByText(/45\.000\s*(đ|VNĐ)/i)).toBeInTheDocument();
      });
      expect(screen.queryByText(/20\.000\s*(đ|VNĐ)/i)).not.toBeInTheDocument();
    });

    it("A03, E07 & E05 (Mobile): Khóa nút khi chưa chọn phường; E07 báo phone_invalid cho SĐT sai định dạng ('0123456789'); E05 chống double-click callback", async () => {
      vi.spyOn(orderService, "calculateShippingFee").mockResolvedValue({
        shipping_fee: 20000,
        original_fee: 20000,
        shipping_discount: 0,
        is_freeship: false,
        is_deliverable: true,
        branch_id: 1,
        branch_name: "Chi nhánh Trần Đình Xu",
      } as any);
      const callbackSpy = vi.spyOn(contactService, "submitAddressCallbackRequest").mockResolvedValue({
        success: true,
        message: "OK",
      });
      vi.spyOn(wardMapping, "verifyAddressViaMapApi").mockResolvedValue({
        isValid: false,
        verificationStatus: "unverifiable",
        canOrder: false,
        requiresCallback: true,
        message: "Không xác minh được địa chỉ.",
        suggestedWards: [],
      });

      render(<MobileCartFlow inline={true} />);

      await waitFor(() => {
        expect(orderService.getAdministrativeUnits).toHaveBeenCalled();
        expect(orderService.getCheckoutConfig).toHaveBeenCalled();
        expect(authService.getCustomerAddressesApi).toHaveBeenCalled();
        expect(screen.getByPlaceholderText("Nhập số nhà, tên đường...")).toBeInTheDocument();
      });
      await Promise.resolve();
      await Promise.resolve();

      const streetInput = screen.getByPlaceholderText("Nhập số nhà, tên đường...");
      const phoneInput = screen.getByPlaceholderText("Nhập số điện thoại nhận hàng");
      const mobileSubmitBtn = screen.getByTestId("mobile-checkout-submit-btn") as HTMLButtonElement;

      // A03: Nhập địa chỉ chưa chọn phường -> khóa nút Đặt hàng
      fireEvent.change(streetInput, { target: { value: "150 Đỗ Xuân Hợp" } });
      expect(mobileSubmitBtn.disabled).toBe(true);

      // Chờ xác minh xong và cảnh báo unverifiable hiện nút callback
      await waitFor(() => {
        expect(screen.queryByTestId("mobile-address-verifying-loader")).not.toBeInTheDocument();
        expect(screen.getByTestId("mobile-request-store-callback-btn")).toBeInTheDocument();
      }, { timeout: 4000 });

      // E07: SĐT sai định dạng "0123456789" -> báo phone_invalid (KHÔNG báo phone_required)
      fireEvent.change(phoneInput, { target: { value: "0123456789" } });
      fireEvent.click(await screen.findByTestId("mobile-request-store-callback-btn", {}, { timeout: 4000 }));

      await waitFor(() => {
        expect(screen.getByTestId("mobile-callback-request-error-notice")).toBeInTheDocument();
        expect(screen.getByText(/Số điện thoại không hợp lệ/i)).toBeInTheDocument();
      });
      expect(callbackSpy).not.toHaveBeenCalled();

      // Sửa SĐT hợp lệ và double-click callback -> chỉ gọi 1 lần và khóa nút
      fireEvent.change(phoneInput, { target: { value: "0909123456" } });
      const callbackBtnAfterFix = await screen.findByTestId("mobile-request-store-callback-btn", {}, { timeout: 4000 });
      fireEvent.click(callbackBtnAfterFix);
      fireEvent.click(callbackBtnAfterFix);

      await waitFor(() => {
        expect(callbackSpy).toHaveBeenCalledTimes(1);
        expect(screen.getByTestId("mobile-callback-request-success-notice")).toBeInTheDocument();
      });
      expect((screen.getByTestId("mobile-request-store-callback-btn") as HTMLButtonElement).disabled).toBe(true);
    });

    it("H07 (Mobile): Địa chỉ đã lưu lệch phường vẫn qua verifyAddressViaMapApi, hiện cảnh báo, khóa đặt hàng và cho phép 1-click đổi phường", async () => {
      vi.spyOn(authService, "getCustomerAddressesApi").mockResolvedValue([
        {
          id: 91,
          recipient_name: "Nguyễn Văn Khách",
          phone: "0909123456",
          province: "TP. Hồ Chí Minh",
          district: "Sài Gòn",
          ward: "Sài Gòn",
          ward_id: "SG",
          street_address: "150 Đỗ Xuân Hợp",
          full_address: "150 Đỗ Xuân Hợp, Sài Gòn, TP. Hồ Chí Minh",
          is_default: true,
        },
      ]);
      vi.spyOn(orderService, "calculateShippingFee").mockResolvedValue({
        shipping_fee: 45000,
        original_fee: 45000,
        shipping_discount: 0,
        is_freeship: false,
        is_deliverable: true,
        branch_id: 1,
        branch_name: "Chi nhánh Trần Đình Xu",
      } as any);

      render(<MobileCartFlow inline={true} />);

      await waitFor(() => {
        expect(orderService.getAdministrativeUnits).toHaveBeenCalled();
        expect(wardMapping.verifyAddressViaMapApi).toHaveBeenCalled();
        expect(screen.queryByTestId("mobile-address-verifying-loader")).not.toBeInTheDocument();
        expect(screen.getByTestId("mobile-address-ward-mismatch-warning")).toBeInTheDocument();
        expect(screen.getByTestId("mobile-apply-suggested-ward-btn")).toBeInTheDocument();
      }, { timeout: 4000 });

      const mobileSubmitBtn = screen.getByTestId("mobile-checkout-submit-btn") as HTMLButtonElement;
      expect(mobileSubmitBtn.disabled).toBe(true);

      fireEvent.click(screen.getByTestId("mobile-apply-suggested-ward-btn"));

      await waitFor(() => {
        expect(screen.queryByTestId("mobile-address-ward-mismatch-warning")).not.toBeInTheDocument();
        expect(mobileSubmitBtn.disabled).toBe(false);
      }, { timeout: 4000 });
    });
  });
});
