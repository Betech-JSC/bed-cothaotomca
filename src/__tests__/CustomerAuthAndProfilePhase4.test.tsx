import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import "@testing-library/jest-dom";
import React from "react";
import {
  checkAvailability,
  verifyEmailApi,
  resendActivationApi,
  verifyResetOtpApi,
  changePasswordApi,
  getCustomerAddressesApi,
  createCustomerAddressApi,
  updateCustomerAddressApi,
  deleteCustomerAddressApi,
  setDefaultCustomerAddressApi,
} from "../services/authService";
import RegisterForm from "../components/Auth/RegisterForm";
import LoginForm from "../components/Auth/LoginForm";

// Mock next-intl
vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => {
    const map: Record<string, string> = {
      title: "Đăng ký tài khoản",
      description: "Đăng ký thành viên để tích điểm",
      name: "Họ và tên",
      name_placeholder: "Nhập họ và tên",
      email: "Email",
      email_placeholder: "Nhập email",
      phone: "Số điện thoại",
      phone_placeholder: "Nhập số điện thoại",
      password: "Mật khẩu",
      password_placeholder: "Nhập mật khẩu",
      button: "Đăng ký ngay",
      email_phone: "Email hoặc Số điện thoại",
      email_phone_placeholder: "Nhập SĐT hoặc Email",
      already_have_account: "Đã có tài khoản?",
      login_now: "Đăng nhập ngay",
      no_account: "Chưa có tài khoản?",
      register_now: "Đăng ký ngay",
      show_password: "Hiện",
      hide_password: "Ẩn",
      or: "hoặc",
    };
    return map[key] || key;
  },
}));

// Mock router & navigation
let mockSearchParams = new URLSearchParams();

vi.mock("next/navigation", () => ({
  useSearchParams: () => mockSearchParams,
  usePathname: () => "/",
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
  }),
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

// Mock AuthContext
const mockLogin = vi.fn();
const mockRegister = vi.fn();
const mockLoginWithToken = vi.fn();
const mockLoginWithGoogle = vi.fn();

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({
    user: null,
    token: null,
    login: mockLogin,
    register: mockRegister,
    loginWithToken: mockLoginWithToken,
    loginWithGoogle: mockLoginWithGoogle,
  }),
}));

describe("Phase 4: Customer Auth & Profile Storefront Tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    global.fetch = vi.fn();
    mockSearchParams = new URLSearchParams();
    document.querySelectorAll("script").forEach((el) => el.remove());
    delete (window as any).google;
  });

  describe("authService API client", () => {
    it("checkAvailability calls POST /api/auth/check-availability and returns availability status", async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: {
            available: false,
            exists: true,
            message: "Số điện thoại này đã được đăng ký tài khoản.",
            suggestion: {
              login_url: "/login?phone=0912345678",
              forgot_url: "/forgot-password?phone=0912345678",
            },
          },
        }),
      });

      const res = await checkAvailability("phone", "0912345678");
      expect(res.available).toBe(false);
      expect(res.exists).toBe(true);
      expect(res.suggestion?.login_url).toBe("/login?phone=0912345678");
    });

    it("verifyEmailApi calls POST /api/auth/verify-email and returns token and user", async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: {
            token: "valid-sanctum-token",
            user: { id: 10, name: "Cô Thảo", status: "active" },
          },
        }),
      });

      const res = await verifyEmailApi({ email: "test@example.com", otp_code: "123456" });
      expect(res.token).toBe("valid-sanctum-token");
      expect(res.user.status).toBe("active");
    });

    it("resendActivationApi calls POST /api/auth/resend-activation", async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          message: "Mã kích hoạt mới đã được gửi tới email của bạn.",
        }),
      });

      const res = await resendActivationApi("pending@example.com");
      expect(res.message).toContain("Mã kích hoạt mới");
    });

    it("verifyResetOtpApi calls POST /api/auth/verify-reset-otp and returns reset_token", async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: {
            reset_token: "reset-token-64-chars",
          },
        }),
      });

      const res = await verifyResetOtpApi("user@example.com", "654321");
      expect(res.token).toBe("reset-token-64-chars");
    });

    it("changePasswordApi sends Authorization header and payload", async () => {
      localStorage.setItem("auth_token", "active-token");
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          message: "Đổi mật khẩu thành công.",
        }),
      });

      const res = await changePasswordApi({
        current_password: "oldPassword123",
        new_password: "newPassword456",
        new_password_confirmation: "newPassword456",
      });

      expect(res.message).toBe("Đổi mật khẩu thành công.");
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining("/auth/change-password"),
        expect.objectContaining({
          method: "PUT",
          headers: expect.objectContaining({
            Authorization: "Bearer active-token",
          }),
        })
      );
    });

    it("Customer address CRUD APIs execute correctly", async () => {
      localStorage.setItem("auth_token", "active-token");

      // 1. GET addresses
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: [
            {
              id: 1,
              recipient_name: "Nguyễn Văn A",
              phone: "0912345678",
              province: "TP. Hồ Chí Minh",
              district: "Quận 1",
              ward: "Phường Bến Nghé",
              street_address: "123 Lê Lợi",
              full_address: "123 Lê Lợi, Phường Bến Nghé, Quận 1, TP. Hồ Chí Minh",
              is_default: true,
            },
          ],
        }),
      });

      const addresses = await getCustomerAddressesApi();
      expect(addresses).toHaveLength(1);
      expect(addresses[0].is_default).toBe(true);

      // 2. CREATE address
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: {
            id: 2,
            recipient_name: "Nguyễn Văn B",
            phone: "0987654321",
            province: "TP. Hồ Chí Minh",
            district: "Quận 3",
            ward: "Phường Võ Thị Sáu",
            street_address: "456 Nam Kỳ Khởi Nghĩa",
            full_address: "456 Nam Kỳ Khởi Nghĩa, Phường Võ Thị Sáu, Quận 3, TP. Hồ Chí Minh",
            is_default: false,
          },
        }),
      });

      const newAddr = await createCustomerAddressApi({
        recipient_name: "Nguyễn Văn B",
        phone: "0987654321",
        province: "TP. Hồ Chí Minh",
        district: "Quận 3",
        ward: "Phường Võ Thị Sáu",
        street_address: "456 Nam Kỳ Khởi Nghĩa",
        is_default: false,
      });
      expect(newAddr.id).toBe(2);

      // 3. SET DEFAULT address
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      });
      await expect(setDefaultCustomerAddressApi(2)).resolves.not.toThrow();

      // 4. DELETE address
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      });
      await expect(deleteCustomerAddressApi(2)).resolves.not.toThrow();
    });
  });

  describe("RegisterForm component behavior", () => {
    it("displays intelligent suggestion banner when phone is detected as already registered", async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: {
            available: false,
            exists: true,
            message: "Số điện thoại này đã được đăng ký tài khoản.",
            suggestion: {
              login_url: "/signin?phone=0912345678",
              forgot_url: "/forgot-password?phone=0912345678",
            },
          },
        }),
      });

      render(<RegisterForm />);

      const phoneInput = screen.getByPlaceholderText("Nhập số điện thoại");
      fireEvent.change(phoneInput, { target: { value: "0912345678" } });

      await waitFor(() => {
        expect(
          screen.getByText(/Số điện thoại này đã được đăng ký tài khoản/i)
        ).toBeInTheDocument();
      });

      expect(screen.getByText("Đăng nhập")).toBeInTheDocument();
      expect(screen.getByText("Quên mật khẩu")).toBeInTheDocument();
    });

    it("switches to OTP activation screen when registration returns requires_activation: true", async () => {
      mockRegister.mockResolvedValueOnce({
        success: true,
        requires_activation: true,
      });

      render(<RegisterForm />);

      fireEvent.change(screen.getByPlaceholderText("Nhập họ và tên"), {
        target: { value: "Khách Hàng Mới" },
      });
      fireEvent.change(screen.getByPlaceholderText("Nhập email"), {
        target: { value: "newuser@example.com" },
      });
      fireEvent.change(screen.getByPlaceholderText("Nhập số điện thoại"), {
        target: { value: "0933112233" },
      });
      fireEvent.change(screen.getByPlaceholderText("Nhập mật khẩu"), {
        target: { value: "securePassword123" },
      });

      fireEvent.click(screen.getByRole("button", { name: "Đăng ký ngay" }));

      await waitFor(() => {
        expect(
          screen.getByRole("heading", { name: "Kích hoạt tài khoản" })
        ).toBeInTheDocument();
      });

      expect(screen.getByText(/Nhập mã OTP 6 chữ số/i)).toBeInTheDocument();
      expect(screen.getByPlaceholderText("••••••")).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: "Kích hoạt tài khoản" })
      ).toBeInTheDocument();
    });

    it("displays intelligent alert banner above form with direct navigation buttons when register returns 422 with phone error", async () => {
      mockRegister.mockResolvedValueOnce({
        success: false,
        message: "Số điện thoại này đã được đăng ký tài khoản.",
        errors: { phone: ["Số điện thoại này đã được đăng ký tài khoản."] },
        data: {
          errors: { phone: ["Số điện thoại này đã được đăng ký tài khoản."] },
          suggestion: {
            login_url: "/login?phone=0912345678",
            forgot_url: "/forgot-password?phone=0912345678",
          },
        },
      });

      render(<RegisterForm />);

      fireEvent.change(screen.getByPlaceholderText("Nhập họ và tên"), {
        target: { value: "Nguyễn Văn Test" },
      });
      fireEvent.change(screen.getByPlaceholderText("Nhập email"), {
        target: { value: "test@example.com" },
      });
      fireEvent.change(screen.getByPlaceholderText("Nhập số điện thoại"), {
        target: { value: "0912345678" },
      });
      fireEvent.change(screen.getByPlaceholderText("Nhập mật khẩu"), {
        target: { value: "password123" },
      });

      fireEvent.click(screen.getByRole("button", { name: "Đăng ký ngay" }));

      await waitFor(() => {
        expect(screen.getByRole("alert")).toBeInTheDocument();
      });

      const alertBox = screen.getByRole("alert");
      expect(alertBox).toHaveTextContent("Số điện thoại này đã được đăng ký tài khoản.");

      const loginBtn = within(alertBox).getByRole("link", { name: "Đăng nhập ngay" });
      expect(loginBtn).toBeInTheDocument();
      expect(loginBtn).toHaveAttribute("href", "/login?phone=0912345678");

      const forgotBtn = within(alertBox).getByRole("link", { name: "Quên mật khẩu?" });
      expect(forgotBtn).toBeInTheDocument();
      expect(forgotBtn).toHaveAttribute("href", "/forgot-password?phone=0912345678");
    });

    it("displays intelligent alert banner with email navigation links when register returns 422 with email error", async () => {
      mockRegister.mockResolvedValueOnce({
        success: false,
        message: "Email này đã được đăng ký tài khoản.",
        errors: { email: ["Email này đã được đăng ký tài khoản."] },
      });

      render(<RegisterForm />);

      fireEvent.change(screen.getByPlaceholderText("Nhập họ và tên"), {
        target: { value: "Nguyễn Văn Test" },
      });
      fireEvent.change(screen.getByPlaceholderText("Nhập email"), {
        target: { value: "existing@example.com" },
      });
      fireEvent.change(screen.getByPlaceholderText("Nhập số điện thoại"), {
        target: { value: "0912345678" },
      });
      fireEvent.change(screen.getByPlaceholderText("Nhập mật khẩu"), {
        target: { value: "password123" },
      });

      fireEvent.click(screen.getByRole("button", { name: "Đăng ký ngay" }));

      await waitFor(() => {
        expect(screen.getByRole("alert")).toBeInTheDocument();
      });

      const alertBox = screen.getByRole("alert");
      expect(alertBox).toHaveTextContent("Email này đã được đăng ký tài khoản.");

      const loginBtn = within(alertBox).getByRole("link", { name: "Đăng nhập ngay" });
      expect(loginBtn).toHaveAttribute("href", "/login?email=existing%40example.com");

      const forgotBtn = within(alertBox).getByRole("link", { name: "Quên mật khẩu?" });
      expect(forgotBtn).toHaveAttribute("href", "/forgot-password?email=existing%40example.com");
    });

    it("clears intelligent alert banner when user modifies the conflicted field", async () => {
      mockRegister.mockResolvedValueOnce({
        success: false,
        errors: { phone: ["Số điện thoại này đã được đăng ký tài khoản."] },
      });

      render(<RegisterForm />);

      fireEvent.change(screen.getByPlaceholderText("Nhập họ và tên"), {
        target: { value: "Nguyễn Văn Test" },
      });
      fireEvent.change(screen.getByPlaceholderText("Nhập email"), {
        target: { value: "test@example.com" },
      });
      fireEvent.change(screen.getByPlaceholderText("Nhập số điện thoại"), {
        target: { value: "0912345678" },
      });
      fireEvent.change(screen.getByPlaceholderText("Nhập mật khẩu"), {
        target: { value: "password123" },
      });
      fireEvent.click(screen.getByRole("button", { name: "Đăng ký ngay" }));

      await waitFor(() => {
        expect(screen.getByRole("alert")).toBeInTheDocument();
      });

      // User modifies phone
      fireEvent.change(screen.getByPlaceholderText("Nhập số điện thoại"), {
        target: { value: "0912345679" },
      });

      expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    });

    it("renders #google-signin-btn-register, calls renderButton with text: 'signup_with', and displays correct visual hierarchy", async () => {
      const mockRenderButton = vi.fn();
      (window as any).google = {
        accounts: {
          id: {
            initialize: vi.fn(),
            renderButton: mockRenderButton,
          },
        },
      };

      const script = document.createElement("script");
      script.id = "google-gsi-client";
      document.body.appendChild(script);

      const { container } = render(<RegisterForm />);

      const googleBtnContainer = container.querySelector("#google-signin-btn-register");
      expect(googleBtnContainer).toBeInTheDocument();

      expect(mockRenderButton).toHaveBeenCalledWith(
        googleBtnContainer,
        expect.objectContaining({
          text: "signup_with",
          theme: "outline",
          size: "large",
          logo_alignment: "left",
        })
      );

      // Verify visual hierarchy:
      // 1. Submit button [Đăng ký ngay]
      // 2. Divider [hoặc]
      // 3. Google button container (#google-signin-btn-register)
      // 4. Footer link (Đã có tài khoản? [Đăng nhập ngay])
      const submitBtn = screen.getByRole("button", { name: "Đăng ký ngay" });
      const divider = screen.getByText("hoặc");
      const footerLink = screen.getByRole("link", { name: "Đăng nhập ngay" });

      expect(submitBtn).toBeInTheDocument();
      expect(divider).toBeInTheDocument();
      expect(googleBtnContainer).toBeInTheDocument();
      expect(footerLink).toBeInTheDocument();
      expect(footerLink).toHaveAttribute("href", "/signin");

      // Verify DOM sequence
      expect(submitBtn.compareDocumentPosition(divider)).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
      expect(divider.compareDocumentPosition(googleBtnContainer!)).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
      expect(googleBtnContainer!.compareDocumentPosition(footerLink)).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
    });
  });

  describe("LoginForm component error handling and URL prefill", () => {
    it("prefills phone from searchParams into username input", async () => {
      mockSearchParams = new URLSearchParams("phone=0987654321");

      render(<LoginForm />);

      const usernameInput = screen.getByPlaceholderText("Nhập SĐT hoặc Email") as HTMLInputElement;
      expect(usernameInput.value).toBe("0987654321");
    });

    it("prefills email from searchParams into username input", async () => {
      mockSearchParams = new URLSearchParams("email=customer@example.com");

      render(<LoginForm />);

      const usernameInput = screen.getByPlaceholderText("Nhập SĐT hoặc Email") as HTMLInputElement;
      expect(usernameInput.value).toBe("customer@example.com");
    });

    it("renders friendly orange banner with activate button on ACCOUNT_PENDING", async () => {
      mockLogin.mockResolvedValueOnce({
        success: false,
        error_code: "ACCOUNT_PENDING",
        message: "Tài khoản chưa được kích hoạt.",
        data: { email: "pending@example.com" },
      });

      render(<LoginForm />);

      fireEvent.change(screen.getByPlaceholderText("Nhập SĐT hoặc Email"), {
        target: { value: "pending@example.com" },
      });
      fireEvent.change(screen.getByPlaceholderText("Nhập mật khẩu"), {
        target: { value: "password123" },
      });

      fireEvent.click(screen.getByRole("button", { name: "Đăng ký ngay" })); // translated as button

      await waitFor(() => {
        expect(
          screen.getByText("Tài khoản chưa được kích hoạt")
        ).toBeInTheDocument();
      });

      expect(screen.getByText("Kích hoạt ngay →")).toBeInTheDocument();

      // Click "Kích hoạt ngay" opens activation modal
      fireEvent.click(screen.getByText("Kích hoạt ngay →"));

      expect(
        screen.getByText("Xác nhận kích hoạt")
      ).toBeInTheDocument();
    });

    it("renders red hotline banner on ACCOUNT_LOCKED", async () => {
      mockLogin.mockResolvedValueOnce({
        success: false,
        error_code: "ACCOUNT_LOCKED",
        message: "Tài khoản của bạn đã bị khóa.",
      });

      render(<LoginForm />);

      fireEvent.change(screen.getByPlaceholderText("Nhập SĐT hoặc Email"), {
        target: { value: "0988776655" },
      });
      fireEvent.change(screen.getByPlaceholderText("Nhập mật khẩu"), {
        target: { value: "password123" },
      });

      fireEvent.click(screen.getByRole("button", { name: "Đăng ký ngay" }));

      await waitFor(() => {
        expect(screen.getByText("Tài khoản đã bị khóa")).toBeInTheDocument();
      });

      expect(screen.getByText(/0336 298 906/i)).toBeInTheDocument();
    });

    it("renders #google-signin-btn-login, calls renderButton with text: 'signin_with', and displays correct visual hierarchy", async () => {
      const mockRenderButton = vi.fn();
      (window as any).google = {
        accounts: {
          id: {
            initialize: vi.fn(),
            renderButton: mockRenderButton,
          },
        },
      };

      const script = document.createElement("script");
      script.id = "google-gsi-client";
      document.body.appendChild(script);

      const { container } = render(<LoginForm />);

      const googleBtnContainer = container.querySelector("#google-signin-btn-login");
      expect(googleBtnContainer).toBeInTheDocument();

      expect(mockRenderButton).toHaveBeenCalledWith(
        googleBtnContainer,
        expect.objectContaining({
          text: "signin_with",
          theme: "outline",
          size: "large",
          logo_alignment: "left",
        })
      );

      // Verify visual hierarchy:
      // 1. Submit button [Đăng ký ngay] (mock key 'button')
      // 2. Divider [hoặc] (mock key 'or')
      // 3. Google button container (#google-signin-btn-login)
      // 4. Footer link (Chưa có tài khoản? [Đăng ký ngay])
      const submitBtn = screen.getByRole("button", { name: "Đăng ký ngay" });
      const divider = screen.getByText("hoặc");
      const footerLink = screen.getByRole("link", { name: "Đăng ký ngay" });

      expect(submitBtn).toBeInTheDocument();
      expect(divider).toBeInTheDocument();
      expect(googleBtnContainer).toBeInTheDocument();
      expect(footerLink).toBeInTheDocument();
      expect(footerLink).toHaveAttribute("href", "/signup");

      // Verify DOM sequence
      expect(submitBtn.compareDocumentPosition(divider)).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
      expect(divider.compareDocumentPosition(googleBtnContainer!)).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
      expect(googleBtnContainer!.compareDocumentPosition(footerLink)).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
    });
  });
});
