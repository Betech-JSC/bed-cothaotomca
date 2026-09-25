import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import "@testing-library/jest-dom";
import React from "react";
import OrderStatusStepper from "@/components/Order/OrderStatusStepper";
import viMessages from "@/i18n/locales/vi.json";

// Mock next-intl
vi.mock("next-intl", () => ({
  useTranslations: (namespace?: string) => {
    const resolveKey = (key: string) => {
      const fullPath = namespace ? `${namespace}.${key}` : key;
      const parts = fullPath.split(".");
      let current: any = viMessages;
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

    t.rich = (key: string) => resolveKey(key);
    return t;
  },
}));

describe("OrderStatusStepper 3-Stage Flow Test Suite", () => {
  describe("Giai đoạn 1: Đặt hàng thành công / Chờ duyệt (Pending / Synced)", () => {
    it("renders Stage 1 correctly for status='pending'", () => {
      render(<OrderStatusStepper status="pending" />);

      // Node 1: Displays "1" and has secondary color
      expect(screen.getByText("1")).toBeInTheDocument();
      const node1 = screen.getByText("1");
      expect(node1.className).toContain("bg-secondary");
      expect(node1.className).toContain("border-secondary");

      // Node 2: Displays "2" and is inactive gray
      expect(screen.getByText("2")).toBeInTheDocument();
      const node2 = screen.getByText("2");
      expect(node2.className).toContain("bg-[#E0E0E0]");
      expect(node2.className).toContain("text-gray-400");

      // Titles
      expect(screen.getByText(viMessages.orderStepper.step1_title)).toBeInTheDocument();
      expect(screen.getByText(viMessages.orderStepper.step1_desc)).toBeInTheDocument();
      expect(screen.getByText(viMessages.orderStepper.step2_title)).toBeInTheDocument();
    });

    it("renders Stage 1 correctly for status='synced' (TUYỆT ĐỐI KHÔNG vào Stage 2)", () => {
      render(
        <OrderStatusStepper status="synced" syncStatus="synced" />
      );

      // Node 1 must still display "1" (not checkmark)
      expect(screen.getByText("1")).toBeInTheDocument();
      const node1 = screen.getByText("1");
      expect(node1.className).toContain("bg-secondary");

      // Node 2 must still be inactive gray
      expect(screen.getByText("2")).toBeInTheDocument();
      const node2 = screen.getByText("2");
      expect(node2.className).toContain("bg-[#E0E0E0]");
      expect(node2.className).toContain("text-gray-400");

      // Step 2 title must be inactive text-gray-400
      const step2Heading = screen.getByText(viMessages.orderStepper.step2_title).closest("h4");
      expect(step2Heading?.className).toContain("text-gray-400");
    });
  });

  describe("Giai đoạn 2: Đã xác nhận & xuất hóa đơn (Confirmed / Processing / Shipping)", () => {
    it("renders Stage 2 for status='confirmed'", () => {
      render(<OrderStatusStepper status="confirmed" />);

      // Node 1: Completed checkmark icon (SVG present, "1" text absent)
      expect(screen.queryByText("1")).not.toBeInTheDocument();

      // Node 2: Active secondary "2"
      expect(screen.getByText("2")).toBeInTheDocument();
      const node2 = screen.getByText("2");
      expect(node2.className).toContain("bg-secondary");
      expect(node2.className).toContain("text-white");

      // Step 1 text is emerald / gray
      const step1Heading = screen.getByText(viMessages.orderStepper.step1_title).closest("h4");
      expect(step1Heading?.className).toContain("text-gray-800");

      // Step 2 title is secondary color
      const step2Heading = screen.getByText(viMessages.orderStepper.step2_title).closest("h4");
      expect(step2Heading?.className).toContain("text-secondary");
      expect(screen.getByText(viMessages.orderStepper.step2_desc)).toBeInTheDocument();
    });

    it("renders pickup description for deliveryType='pickup' in Stage 2", () => {
      render(<OrderStatusStepper status="processing" deliveryType="pickup" />);

      expect(screen.getByText(viMessages.orderStepper.step2_desc_pickup)).toBeInTheDocument();
    });
  });

  describe("Giai đoạn 3: Hoàn tất 100% (Completed / Delivered / Success)", () => {
    it("renders Stage 3 for status='completed'", () => {
      render(<OrderStatusStepper status="completed" />);

      // Neither "1" nor "2" text exists, both are SVG checkmarks
      expect(screen.queryByText("1")).not.toBeInTheDocument();
      expect(screen.queryByText("2")).not.toBeInTheDocument();

      // Step 2 Title & Description completed
      expect(screen.getByText(viMessages.orderStepper.step2_title_completed)).toBeInTheDocument();
      expect(screen.getByText(viMessages.orderStepper.step2_desc_completed)).toBeInTheDocument();

      const step2Heading = screen.getByText(viMessages.orderStepper.step2_title_completed).closest("h4");
      expect(step2Heading?.className).toContain("text-emerald-700");
    });

    it("renders pickup completed description for deliveryType='pickup' in Stage 3", () => {
      render(<OrderStatusStepper status="delivered" deliveryType="pickup" />);

      expect(screen.getByText(viMessages.orderStepper.step2_title_completed)).toBeInTheDocument();
      expect(screen.getByText(viMessages.orderStepper.step2_desc_completed_pickup)).toBeInTheDocument();
    });
  });

  describe("Cancellation and Expired States", () => {
    it("renders cancelled badge and message", () => {
      render(<OrderStatusStepper status="cancelled" />);
      expect(screen.getByText(viMessages.orderStepper.cancelled_badge)).toBeInTheDocument();
      expect(screen.getByText(viMessages.orderStepper.cancelled_title)).toBeInTheDocument();
    });

    it("renders cancel_requested badge and message", () => {
      render(<OrderStatusStepper status="cancel_requested" />);
      expect(screen.getByText(viMessages.orderStepper.cancel_requested_badge)).toBeInTheDocument();
      expect(screen.getByText(viMessages.orderStepper.cancel_requested_title)).toBeInTheDocument();
    });
  });
});
