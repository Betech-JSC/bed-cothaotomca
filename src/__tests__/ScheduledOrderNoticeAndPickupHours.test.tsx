import { render, screen, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import "@testing-library/jest-dom";
import React from "react";
import OrderSuccessClient from "@/components/Checkout/OrderSuccessClient";
import OrderStatusStepper from "@/components/Order/OrderStatusStepper";
import viMessages from "@/i18n/locales/vi.json";
import enMessages from "@/i18n/locales/en.json";
import * as orderService from "@/services/orderService";

// Mock next/image
vi.mock("next/image", () => ({
  default: (props: any) => <img {...props} />,
}));

// Mock @/i18n/i18n-navigation
vi.mock("@/i18n/i18n-navigation", () => ({
  Link: ({ children, href, className, ...props }: any) => (
    <a href={href} className={className} {...props}>
      {children}
    </a>
  ),
  useRouter: () => ({ replace: vi.fn(), push: vi.fn() }),
  usePathname: () => "/",
}));

// Mock GeneralSettingsContext
vi.mock("@/contexts/GeneralSettingsContext", () => ({
  useGeneralSettings: () => null,
  GeneralSettingsProvider: ({ children }: any) => children,
}));

// Mock next-intl
let currentLocaleMessages: any = viMessages;

vi.mock("next-intl", () => ({
  useTranslations: (namespace?: string) => {
    const resolveKey = (key: string) => {
      const fullPath = namespace ? `${namespace}.${key}` : key;
      const parts = fullPath.split(".");
      let current: any = currentLocaleMessages;
      for (const p of parts) {
        if (current && typeof current === "object" && p in current) {
          current = current[p];
        } else {
          return key;
        }
      }
      return typeof current === "string" ? current : key;
    };

    const t: any = (key: string, values?: Record<string, any>) => {
      let text = resolveKey(key);
      if (values) {
        Object.entries(values).forEach(([k, v]) => {
          text = text.replace(new RegExp(`\\{${k}\\}`, "g"), String(v));
        });
      }
      return text;
    };

    t.rich = (key: string, values?: Record<string, any>) => {
      let text = resolveKey(key);
      if (values && values.link && typeof values.link === "function") {
        return (
          <span>
            Hotline hỗ trợ: {values.link(values.hotline || "024.9999.7122")}
          </span>
        );
      }
      return text;
    };

    return t;
  },
}));

describe("Scheduled Order Notice & Operating Hours Test Suite", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    currentLocaleMessages = viMessages;
  });

  describe("1. i18n Locales Validation", () => {
    it("contains valid scheduled keys in Vietnamese locale", () => {
      expect(viMessages.orderSuccess.notice_message_scheduled).toBe(
        "Chúng tôi sẽ gọi cho bạn để xác nhận thông tin trước 1 - 2 tiếng so với giờ giao đã đặt trước. Vui lòng nghe máy để xác nhận, đơn hàng sẽ được giao sau khi xác nhận thành công."
      );
      expect(viMessages.orderStepper.step1_desc_scheduled).toBe(
        "CSKH sẽ gọi xác nhận trước giờ giao 1 - 2 tiếng."
      );
    });

    it("contains valid scheduled keys in English locale", () => {
      expect(enMessages.orderSuccess.notice_message_scheduled).toBe(
        "We will call you to confirm your order details 1 - 2 hours prior to your scheduled delivery time. Please stay reachable to confirm; your order will be dispatched once confirmed."
      );
      expect(enMessages.orderStepper.step1_desc_scheduled).toBe(
        "Customer service will call to confirm 1-2 hours before delivery."
      );
    });
  });

  describe("2. Scheduled Order Confirmation and Hotline Display", () => {
    const mockScheduledOrder = {
      order_code: "ORD-SCHED-001",
      status: "pending",
      sync_status: "pending",
      delivery_type: "delivery",
      delivery: {
        receiver: "Nguyen Van Scheduled",
        contact_number: "0987654321",
        address: "73 Rach Bung Binh, Ward 9, District 3",
        price: 25000,
        expected_delivery: "2026-10-04T12:00:00",
      },
      customer: {
        name: "Nguyen Van Scheduled",
        phone: "0987654321",
      },
      items: [
        {
          product_name: "Cơm tấm bì chả",
          quantity: 1,
          price: 55000,
        },
      ],
      subtotal: 55000,
      total: 80000,
      payment: {
        method: "CASH",
      },
    };

    it("renders scheduled notice message and dedicated hotline block on order success", async () => {
      vi.spyOn(orderService, "getOrderByCode").mockResolvedValueOnce(mockScheduledOrder);

      render(<OrderSuccessClient orderCode="ORD-SCHED-001" locale="vi" />);

      await waitFor(() => {
        expect(screen.getByText(viMessages.orderSuccess.title)).toBeInTheDocument();
      });

      // Scheduled notice message is rendered
      expect(
        screen.getByText(viMessages.orderSuccess.notice_message_scheduled)
      ).toBeInTheDocument();

      // Immediate notice message is NOT rendered
      expect(
        screen.queryByText(viMessages.orderSuccess.notice_message)
      ).not.toBeInTheDocument();

      // Dedicated hotline block exists as a separate paragraph with mt-2
      const hotlineLink = screen.getByRole("link", { name: /024\.9999\.7122/i });
      expect(hotlineLink).toBeInTheDocument();
      expect(hotlineLink).toHaveAttribute("href", "tel:02499997122");

      const hotlineParagraph = hotlineLink.closest("p");
      expect(hotlineParagraph).not.toBeNull();
      expect(hotlineParagraph?.className).toContain("mt-2");
      expect(hotlineParagraph?.className).toContain("font-medium");

      // Stepper renders scheduled step 1 description
      expect(
        screen.getByText(viMessages.orderStepper.step1_desc_scheduled)
      ).toBeInTheDocument();
    });
  });

  describe("3. Pickup Order Confirmation Display", () => {
    const mockPickupOrder = {
      order_code: "ORD-PICKUP-001",
      status: "pending",
      sync_status: "pending",
      delivery_type: "pickup",
      delivery: {
        receiver: "Tran Thi Pickup",
        contact_number: "0912345678",
        address: "73 Rach Bung Binh, Ward 9, District 3",
        price: 0,
      },
      customer: {
        name: "Tran Thi Pickup",
        phone: "0912345678",
      },
      items: [
        {
          product_name: "Cơm sườn đặc biệt",
          quantity: 2,
          price: 85000,
        },
      ],
      subtotal: 170000,
      total: 170000,
      payment: {
        method: "CASH",
      },
    };

    it("renders pickup notice message and pickup stepper description without regression", async () => {
      vi.spyOn(orderService, "getOrderByCode").mockResolvedValueOnce(mockPickupOrder);

      render(<OrderSuccessClient orderCode="ORD-PICKUP-001" locale="vi" />);

      await waitFor(() => {
        expect(screen.getByText(viMessages.orderSuccess.title)).toBeInTheDocument();
      });

      // Pickup notice is rendered
      expect(
        screen.getByText(viMessages.orderSuccess.notice_message_pickup)
      ).toBeInTheDocument();

      // Neither scheduled nor immediate delivery notices are rendered
      expect(
        screen.queryByText(viMessages.orderSuccess.notice_message_scheduled)
      ).not.toBeInTheDocument();
      expect(
        screen.queryByText(viMessages.orderSuccess.notice_message)
      ).not.toBeInTheDocument();

      // Stepper displays pickup step 1 description
      expect(
        screen.getByText(viMessages.orderStepper.step1_desc_pickup)
      ).toBeInTheDocument();
    });
  });

  describe("4. Immediate Delivery Order Confirmation Display", () => {
    const mockImmediateOrder = {
      order_code: "ORD-IMMED-001",
      status: "pending",
      sync_status: "pending",
      delivery_type: "delivery",
      delivery: {
        receiver: "Le Van Immediate",
        contact_number: "0933333333",
        address: "456 Le Loi, District 1",
        price: 20000,
        expected_delivery: null,
      },
      customer: {
        name: "Le Van Immediate",
        phone: "0933333333",
      },
      items: [
        {
          product_name: "Bún chả Cô Thảo",
          quantity: 1,
          price: 60000,
        },
      ],
      subtotal: 60000,
      total: 80000,
      payment: {
        method: "TRANSFER",
      },
    };

    it("renders standard immediate delivery notice message and stepper without regression", async () => {
      vi.spyOn(orderService, "getOrderByCode").mockResolvedValueOnce(mockImmediateOrder);

      render(<OrderSuccessClient orderCode="ORD-IMMED-001" locale="vi" />);

      await waitFor(() => {
        expect(screen.getByText(viMessages.orderSuccess.title)).toBeInTheDocument();
      });

      // Standard notice message is rendered
      expect(
        screen.getByText(viMessages.orderSuccess.notice_message)
      ).toBeInTheDocument();

      // Neither scheduled nor pickup notices are rendered
      expect(
        screen.queryByText(viMessages.orderSuccess.notice_message_scheduled)
      ).not.toBeInTheDocument();
      expect(
        screen.queryByText(viMessages.orderSuccess.notice_message_pickup)
      ).not.toBeInTheDocument();

      // Stepper displays immediate step 1 description
      expect(
        screen.getByText(viMessages.orderStepper.step1_desc)
      ).toBeInTheDocument();
    });
  });

  describe("5. OrderStatusStepper Standalone Component", () => {
    it("handles isScheduled=true and renders scheduled description", () => {
      render(
        <OrderStatusStepper
          status="pending"
          deliveryType="delivery"
          isScheduled={true}
        />
      );

      expect(screen.getByText(viMessages.orderStepper.step1_desc_scheduled)).toBeInTheDocument();
    });

    it("handles expectedDelivery string and renders scheduled description", () => {
      render(
        <OrderStatusStepper
          status="pending"
          deliveryType="delivery"
          expectedDelivery="2026-10-04T15:30:00"
        />
      );

      expect(screen.getByText(viMessages.orderStepper.step1_desc_scheduled)).toBeInTheDocument();
    });

    it("prioritizes pickup description when deliveryType is pickup even if expectedDelivery is present", () => {
      render(
        <OrderStatusStepper
          status="pending"
          deliveryType="pickup"
          expectedDelivery="2026-10-04T15:30:00"
        />
      );

      expect(screen.getByText(viMessages.orderStepper.step1_desc_pickup)).toBeInTheDocument();
      expect(
        screen.queryByText(viMessages.orderStepper.step1_desc_scheduled)
      ).not.toBeInTheDocument();
    });

    it("renders immediate description when not pickup and no expected delivery", () => {
      render(
        <OrderStatusStepper
          status="pending"
          deliveryType="delivery"
        />
      );

      expect(screen.getByText(viMessages.orderStepper.step1_desc)).toBeInTheDocument();
      expect(
        screen.queryByText(viMessages.orderStepper.step1_desc_scheduled)
      ).not.toBeInTheDocument();
    });
  });
});
