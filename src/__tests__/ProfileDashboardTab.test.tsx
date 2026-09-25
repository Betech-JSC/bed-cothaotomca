import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import React from "react";
import ProfileDashboard from "../components/Auth/ProfileDashboard";
import CheckoutForm from "../components/Checkout/CheckoutForm";

let mockSearchParams = new URLSearchParams();

vi.mock("next/navigation", () => ({
  useSearchParams: () => mockSearchParams,
  usePathname: () => "/profile",
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
  }),
}));

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => {
    const map: Record<string, string> = {
      orders_history: "Lịch sử đơn hàng",
      addresses: "Sổ địa chỉ",
      add_new_address: "+ Thêm địa chỉ mới",
      personal_info: "Thông tin cá nhân",
      fullname: "Họ và tên",
      change_password: "Đổi mật khẩu",
      delivery_home: "Giao hàng tận nơi",
    };
    return map[key] || key;
  },
}));

vi.mock("@/i18n/routing", () => ({
  Link: ({ href, children, ...props }: any) => {
    const hrefStr = typeof href === "object" ? `${href.pathname}?${new URLSearchParams(href.query).toString()}` : href;
    return <a href={hrefStr} {...props}>{children}</a>;
  },
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
  }),
  usePathname: () => "/checkout",
}));

vi.mock("@/i18n/i18n-navigation", () => ({
  Link: ({ href, children, ...props }: any) => {
    const hrefStr = typeof href === "object" ? `${href.pathname}?${new URLSearchParams(href.query).toString()}` : href;
    return <a href={hrefStr} {...props}>{children}</a>;
  },
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
  }),
}));

vi.mock("@/contexts/CartContext", () => ({
  useCart: () => ({
    cartItems: [
      {
        id: "cart-item-1",
        productId: 1,
        title: "Chả ốc",
        unitPrice: 100000,
        price: 100000,
        quantity: 1,
        imageUrl: "/images/product.jpg",
      },
    ],
    subtotal: 100000,
    addToCart: vi.fn(),
    removeFromCart: vi.fn(),
    updateQuantity: vi.fn(),
    clearCart: vi.fn(),
    hasOutOfStockItems: false,
    setIsCartOpen: vi.fn(),
  }),
}));

vi.mock("@/contexts/AuthContext", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/contexts/AuthContext")>();
  return {
    ...actual,
    useAuth: () => ({
      user: {
        id: 1,
        name: "Nguyễn Văn A",
        email: "test@example.com",
        phone: "0901234567",
        status: "active",
      },
      loading: false,
      logout: vi.fn(),
      updateProfile: vi.fn(),
      refreshUser: vi.fn(),
    }),
  };
});

vi.mock("@/services/authService", () => ({
  getCachedCustomerAddresses: vi.fn().mockReturnValue([]),
  setCachedCustomerAddresses: vi.fn(),
  clearCachedCustomerAddresses: vi.fn(),
  getCustomerAddressesApi: vi.fn().mockResolvedValue([
    {
      id: 101,
      recipient_name: "Nguyễn Văn A",
      receiver_name: "Nguyễn Văn A",
      receiver_phone: "0901234567",
      phone: "0901234567",
      province_id: 1,
      province_name: "Hồ Chí Minh",
      province: "TP. Hồ Chí Minh",
      district: "Quận 1",
      ward_code: "001",
      ward_name: "Phường Bến Nghé",
      ward: "Phường Bến Nghé",
      detail_address: "123 Lê Duẩn",
      street_address: "123 Lê Duẩn",
      is_default: true,
    },
  ]),
  createCustomerAddressApi: vi.fn().mockResolvedValue({}),
  updateCustomerAddressApi: vi.fn().mockResolvedValue({}),
  deleteCustomerAddressApi: vi.fn().mockResolvedValue({}),
  setDefaultCustomerAddressApi: vi.fn().mockResolvedValue({}),
  changePasswordApi: vi.fn().mockResolvedValue({}),
}));

vi.mock("@/services/orderService", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/services/orderService")>();
  return {
    ...actual,
    getAdministrativeUnits: vi.fn().mockResolvedValue([]),
    FALLBACK_ADMINISTRATIVE_UNITS: [],
    getPaymentMethods: vi.fn().mockResolvedValue([]),
    getBranches: vi.fn().mockResolvedValue([]),
    getCheckoutConfig: vi.fn().mockResolvedValue({
      payment_methods: [],
      branches: [],
      delivery_services: [],
      shipping_settings: { is_min_amount_enabled: false },
      operating_hours: null,
      maintenance: { is_active: false },
    }),
  };
});

vi.mock("@/services/generalSettingService", () => ({
  getGeneralSettings: vi.fn().mockResolvedValue({}),
}));

vi.mock("@/services/voucherService", () => ({
  getAvailableVouchers: vi.fn().mockResolvedValue([]),
}));

describe("ProfileDashboard tab parameter navigation", () => {
  const dummyUser = {
    id: 1,
    name: "Nguyễn Văn A",
    email: "test@example.com",
    phone: "0901234567",
    status: "active",
  };

  beforeEach(() => {
    mockSearchParams = new URLSearchParams();
  });

  it("defaults to orders tab when tab query param is absent", () => {
    render(
      <ProfileDashboard
        user={dummyUser as any}
        onLogout={vi.fn()}
        updateProfile={vi.fn()}
        refreshUser={vi.fn()}
      />
    );

    // Addresses section "+ Thêm địa chỉ mới" should NOT be present when orders is active
    expect(screen.queryByText("+ Thêm địa chỉ mới")).not.toBeInTheDocument();
  });

  it("activates addresses tab when tab=addresses is in URL query parameters", () => {
    mockSearchParams = new URLSearchParams({ tab: "addresses" });

    render(
      <ProfileDashboard
        user={dummyUser as any}
        onLogout={vi.fn()}
        updateProfile={vi.fn()}
        refreshUser={vi.fn()}
      />
    );

    // Addresses section button "+ Thêm địa chỉ mới" should be rendered
    expect(screen.getByText("+ Thêm địa chỉ mới")).toBeInTheDocument();
  });

  it("activates info tab when tab=info is in URL query parameters", () => {
    mockSearchParams = new URLSearchParams({ tab: "info" });

    render(
      <ProfileDashboard
        user={dummyUser as any}
        onLogout={vi.fn()}
        updateProfile={vi.fn()}
        refreshUser={vi.fn()}
      />
    );

    expect(screen.getByText("Họ và tên")).toBeInTheDocument();
    expect(screen.queryByText("+ Thêm địa chỉ mới")).not.toBeInTheDocument();
  });
});

describe("CheckoutForm Address Book Link", () => {
  it("renders 'Danh sách địa chỉ →' with href='/profile?tab=addresses'", async () => {
    render(
      <CheckoutForm
        order={null as any}
        config={{
          payment_methods: [],
          branches: [],
          delivery_services: [],
          shipping_settings: { is_min_amount_enabled: false } as any,
          operating_hours: null as any,
          maintenance: { is_active: false } as any,
        }}
      />
    );

    // Wait for customer addresses to load and link to render
    await waitFor(() => {
      const addressBookLink = screen.getByRole("link", { name: /Danh sách địa chỉ →/i });
      expect(addressBookLink).toBeInTheDocument();
      expect(addressBookLink).toHaveAttribute("href", "/profile?tab=addresses");
    });
  });
});
