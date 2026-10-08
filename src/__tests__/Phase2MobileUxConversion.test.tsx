import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import React from "react";
import { formatOrderPrice } from "@/lib/format";
import { calcOrderTotal } from "@/services/orderService";
import SafeImage from "@/components/Common/SafeImage";
import ContactForm from "@/components/Contact/ContactForm";
import ProductInfoAccordion from "@/components/Product/ProductInfoAccordion";
import GoogleProfileCompletionModal from "@/components/Auth/GoogleProfileCompletionModal";
import * as contactService from "@/services/contactService";

// Mock next-intl
vi.mock("next-intl", () => ({
  useTranslations: () => {
    const t: any = (key: string) => {
      const map: Record<string, string> = {
        "contact.form.name.title": "Họ và tên",
        "contact.form.name.placeholder": "Nhập họ và tên",
        "contact.form.phone.title": "Số điện thoại",
        "contact.form.phone.placeholder": "Nhập số điện thoại",
        "contact.form.email.title": "Email",
        "contact.form.email.placeholder": "Nhập email",
        "contact.form.message.title": "Lời nhắn",
        "contact.form.message.placeholder": "Nhập lời nhắn",
        "button.submit-form": "Gửi lời nhắn",
        "modal.success.title": "Thành công",
        "modal.success.message": "Cảm ơn bạn đã gửi lời nhắn",
        "modal.success.button": "Đóng",
        "product.ingredients": "Thành phần & Nguyên liệu",
        "product.taste_notes": "Hương vị & Điểm đặc trưng",
        "product.preservation": "Hướng dẫn bảo quản & Sử dụng",
      };
      return map[key] || key;
    };
    return t;
  },
}));

// Mock AuthContext
const mockCompleteGoogleProfile = vi.fn();
const mockLogout = vi.fn();
let mockUser: any = null;
let mockToken: string | null = null;

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({
    user: mockUser,
    token: mockToken,
    completeGoogleProfile: mockCompleteGoogleProfile,
    logout: mockLogout,
    loading: false,
  }),
}));

describe("Phase 2 Mobile UX & Conversion Tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUser = null;
    mockToken = null;
  });

  describe("1. formatOrderPrice", () => {
    it("returns '0 VNĐ' for 0, negative, null, or undefined values", () => {
      expect(formatOrderPrice(0)).toBe("0 VNĐ");
      expect(formatOrderPrice(-1000)).toBe("0 VNĐ");
      expect(formatOrderPrice(null)).toBe("0 VNĐ");
      expect(formatOrderPrice(undefined)).toBe("0 VNĐ");
    });

    it("formats positive price values with VNĐ", () => {
      expect(formatOrderPrice(30000)).toBe("30.000 VNĐ");
      expect(formatOrderPrice(150000)).toBe("150.000 VNĐ");
    });
  });

  describe("2. Empty Cart Total Calculation", () => {
    it("calcOrderTotal returns 0 for subtotal, shipping, and total when items array is empty", () => {
      const result = calcOrderTotal([], "delivery", 30000, 0);
      expect(result).toEqual({ subtotal: 0, shipping: 0, total: 0 });
    });

    it("calcOrderTotal calculates normal delivery fee when items are present", () => {
      const items = [{ price: 50000, quantity: 2 }];
      const result = calcOrderTotal(items, "delivery", 30000, 0);
      expect(result.subtotal).toBe(100000);
      expect(result.shipping).toBe(30000);
      expect(result.total).toBe(130000);
    });
  });

  describe("3. SafeImage Component", () => {
    it("renders image and triggers fallback to /cover.jpg on error", () => {
      render(
        <SafeImage
          src="/broken-image.jpg"
          alt="Test Safe Image"
          width={100}
          height={100}
          fallbackSrc="/cover.jpg"
        />
      );

      const img = screen.getByAltText("Test Safe Image") as HTMLImageElement;
      expect(img).toBeInTheDocument();

      // Trigger error
      fireEvent.error(img);

      // Should have switched to fallback
      expect(img.src).toContain("cover.jpg");
    });
  });

  describe("4. Contact Form Phone Validation & Button Styling", () => {
    it("rejects invalid Vietnamese phone numbers and shows error message", async () => {
      render(<ContactForm />);

      fireEvent.change(screen.getByPlaceholderText("Nhập họ và tên"), {
        target: { value: "Nguyễn Văn A" },
      });
      fireEvent.change(screen.getByPlaceholderText("Nhập số điện thoại"), {
        target: { value: "123456" }, // Invalid phone
      });
      fireEvent.change(screen.getByPlaceholderText("Nhập email"), {
        target: { value: "test@example.com" },
      });
      fireEvent.change(screen.getByPlaceholderText("Nhập lời nhắn"), {
        target: { value: "Xin chào quán" },
      });

      const submitBtn = screen.getByRole("button", { name: "Gửi lời nhắn" });
      expect(submitBtn.className).toContain("hover:bg-yellow");
      expect(submitBtn.className).toContain("hover:text-primary");

      fireEvent.click(submitBtn);

      await waitFor(() => {
        expect(
          screen.getByText("Số điện thoại không hợp lệ. Vui lòng nhập số điện thoại Việt Nam gồm 10 chữ số.")
        ).toBeInTheDocument();
      });
    });

    it("accepts valid Vietnamese phone numbers and submits", async () => {
      vi.spyOn(contactService, "submitContact").mockResolvedValueOnce({ success: true } as any);

      render(<ContactForm />);

      fireEvent.change(screen.getByPlaceholderText("Nhập họ và tên"), {
        target: { value: "Nguyễn Văn A" },
      });
      fireEvent.change(screen.getByPlaceholderText("Nhập số điện thoại"), {
        target: { value: "0912345678" }, // Valid phone
      });
      fireEvent.change(screen.getByPlaceholderText("Nhập email"), {
        target: { value: "test@example.com" },
      });
      fireEvent.change(screen.getByPlaceholderText("Nhập lời nhắn"), {
        target: { value: "Xin chào quán" },
      });

      const submitBtn = screen.getByRole("button", { name: "Gửi lời nhắn" });
      fireEvent.click(submitBtn);

      await waitFor(() => {
        expect(contactService.submitContact).toHaveBeenCalledWith({
          name: "Nguyễn Văn A",
          phone: "0912345678",
          email: "test@example.com",
          message: "Xin chào quán",
        });
      });
    });
  });

  describe("5. ProductInfoAccordion Multi-Open", () => {
    it("allows multiple sections to remain open simultaneously", () => {
      const items = [
        { title: "Mô tả 1", content: "Nội dung 1" },
        { title: "Mô tả 2", content: "Nội dung 2" },
      ];

      render(<ProductInfoAccordion infos={items} />);

      // Section 1 is open by default
      expect(screen.getByText("Nội dung 1")).toBeInTheDocument();

      // Click Section 2 to open it as well
      const btn2 = screen.getByRole("button", { name: /Mô tả 2/i });
      fireEvent.click(btn2);

      // BOTH Section 1 and Section 2 should be open
      expect(screen.getByText("Nội dung 1")).toBeInTheDocument();
      expect(screen.getByText("Nội dung 2")).toBeInTheDocument();
    });
  });

  describe("6. GoogleProfileCompletionModal", () => {
    it("renders when logged-in user has no phone", () => {
      mockUser = { id: 1, name: "Google User", email: "user@gmail.com", phone: null };
      mockToken = "valid-test-token";

      render(<GoogleProfileCompletionModal />);

      expect(screen.getByText("Hoàn Thiện Hồ Sơ Tài Khoản")).toBeInTheDocument();
    });

    it("does not render when user has completed phone", () => {
      mockUser = { id: 1, name: "Google User", email: "user@gmail.com", phone: "0912345678" };
      mockToken = "valid-test-token";

      const { container } = render(<GoogleProfileCompletionModal />);
      expect(container.firstChild).toBeNull();
    });

    it("validates phone and password match before submitting", async () => {
      mockUser = { id: 1, name: "Google User", email: "user@gmail.com", phone: null };
      mockToken = "valid-test-token";

      render(<GoogleProfileCompletionModal />);

      const phoneInput = screen.getByPlaceholderText("Ví dụ: 0912345678");
      const passInput = screen.getByPlaceholderText("Nhập mật khẩu...");
      const confirmInput = screen.getByPlaceholderText("Nhập lại mật khẩu...");

      // Enter invalid phone
      fireEvent.change(phoneInput, { target: { value: "112233" } });
      fireEvent.change(passInput, { target: { value: "password123" } });
      fireEvent.change(confirmInput, { target: { value: "password123" } });

      const submitBtn = screen.getByRole("button", { name: "Hoàn Tất Hồ Sơ" });
      fireEvent.click(submitBtn);

      await waitFor(() => {
        expect(screen.getByText(/Số điện thoại không hợp lệ/i)).toBeInTheDocument();
      });

      // Fix phone, but mismatch password
      fireEvent.change(phoneInput, { target: { value: "0912345678" } });
      fireEvent.change(confirmInput, { target: { value: "mismatch" } });
      fireEvent.click(submitBtn);

      await waitFor(() => {
        expect(screen.getByText(/Mật khẩu xác nhận không khớp/i)).toBeInTheDocument();
      });
    });
  });
});
