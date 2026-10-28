import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import { describe, it, expect, vi, beforeEach } from "vitest";
import WardSelectCombobox from "@/components/Checkout/WardSelectCombobox";
import CheckoutForm from "@/components/Checkout/CheckoutForm";
import {
  validateAddressWardMatch,
  formatWardLabel,
  type WardCatalogEntry,
} from "@/data/wardMapping";
import * as orderService from "@/services/orderService";

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
    beforeEach(() => {
      vi.clearAllMocks();
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
      });

      // Bước 1: Khách chọn Phường Sài Gòn (phí ship 20.000đ)
      const wardInputs = screen.getAllByPlaceholderText("Chọn hoặc gõ tìm Phường / Xã...");
      const wardInput = wardInputs[wardInputs.length - 1];
      fireEvent.focus(wardInput);
      const saiGonOptions = await screen.findAllByText("Phường Sài Gòn");
      fireEvent.click(saiGonOptions[saiGonOptions.length - 1]);

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

      // Cảnh báo xuất hiện ngay lập tức kèm gợi ý Phường Phước Long
      const warningBox = await screen.findByTestId("address-ward-mismatch-warning");
      expect(warningBox).toBeInTheDocument();
      expect(warningBox.textContent).toContain("Phường Phước Long");

      // Tick xác nhận thông tin và cố tình bấm Đặt hàng -> Bị chặn, createOrder KHÔNG được gọi
      const confirmCheckbox = screen.getByTestId("desktop-confirm-checkbox");
      fireEvent.click(confirmCheckbox);

      const submitBtn = screen.getByTestId("checkout-submit-btn");
      fireEvent.click(submitBtn);
      expect(orderService.createOrder).not.toHaveBeenCalled();

      // Bước 2: Khách bấm nút 1-click [Đổi sang Phường Phước Long]
      const switchBtn = screen.getByTestId("apply-suggested-ward-btn");
      expect(switchBtn.textContent).toContain("Đổi sang Phường Phước Long");
      fireEvent.click(switchBtn);

      // Tự động đổi sang Phường Phước Long, tính lại phí ship (45.000đ) và xóa cảnh báo
      await waitFor(() => {
        expect(screen.queryByTestId("address-ward-mismatch-warning")).not.toBeInTheDocument();
        expect(orderService.calculateShippingFee).toHaveBeenCalledWith(
          expect.objectContaining({
            ward: "Phước Long",
            ward_id: "PL",
          })
        );
      });

      // Bước 3: Bấm Đặt hàng lại -> Submit thành công với đúng Phường Phước Long
      fireEvent.click(submitBtn);

      await waitFor(() => {
        expect(orderService.createOrder).toHaveBeenCalledTimes(1);
      });

      const orderPayload = (orderService.createOrder as any).mock.calls[0][0];
      expect(orderPayload.delivery.ward).toBe("Phước Long");
      expect(orderPayload.delivery.ward_id).toBe("PL");
      expect(orderPayload.delivery.address).toContain("150 Đỗ Xuân Hợp");
    });
  });
});
