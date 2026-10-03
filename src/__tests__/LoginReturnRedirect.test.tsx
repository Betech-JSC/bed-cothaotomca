import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import SignInContainer from '@/components/Auth/SignInContainer';
import LoginForm from '@/components/Auth/LoginForm';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------
vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => {
    const map: Record<string, string> = {
      email_phone: 'Email hoặc Số điện thoại',
      email_phone_placeholder: 'Nhập SĐT hoặc Email',
      password: 'Mật khẩu',
      password_placeholder: 'Nhập mật khẩu',
      button: 'Đăng nhập',
    };
    return map[key] || key;
  },
}));

vi.mock('next/image', () => ({
  // eslint-disable-next-line @next/next/no-img-element
  default: ({ src, alt }: { src: string; alt: string }) => <img src={src} alt={alt} />,
}));

let mockSearchParams = new URLSearchParams();
vi.mock('next/navigation', () => ({
  useSearchParams: () => mockSearchParams,
  usePathname: () => '/login',
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
}));

const mockPush = vi.fn();
vi.mock('@/i18n/i18n-navigation', () => ({
  Link: ({ href, children, ...props }: any) => (
    <a href={typeof href === 'string' ? href : href?.pathname} {...props}>
      {children}
    </a>
  ),
  useRouter: () => ({ push: mockPush, replace: vi.fn() }),
}));

const mockLogin = vi.fn();
const mockLoginWithGoogle = vi.fn();
const mockLoginWithToken = vi.fn();
let mockAuthState: { user: unknown; loading: boolean } = { user: null, loading: false };

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: mockAuthState.user,
    loading: mockAuthState.loading,
    token: null,
    login: mockLogin,
    loginWithGoogle: mockLoginWithGoogle,
    loginWithToken: mockLoginWithToken,
  }),
}));

const mockVerifyEmailApi = vi.fn();
vi.mock('@/services/authService', () => ({
  verifyEmailApi: (...args: unknown[]) => mockVerifyEmailApi(...args),
  resendActivationApi: vi.fn(),
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const CART_KEY = 'cothaotomca_cart';
const CART_VALUE = JSON.stringify([
  { productId: 11, variantId: 3, title: 'Tôm rim', quantity: 2, unitPrice: 120000 },
]);

const submitPasswordLogin = () => {
  fireEvent.change(screen.getByPlaceholderText('Nhập SĐT hoặc Email'), {
    target: { value: '0912345678' },
  });
  fireEvent.change(screen.getByPlaceholderText('Nhập mật khẩu'), {
    target: { value: 'secret123' },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Đăng nhập' }));
};

describe('Login return redirect (change: guest-member-tier-login-hint)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    localStorage.setItem(CART_KEY, CART_VALUE);
    mockSearchParams = new URLSearchParams();
    mockAuthState = { user: null, loading: false };
    document.querySelectorAll('script').forEach((el) => el.remove());
    delete (window as any).google;
  });

  describe('SignInContainer', () => {
    it('đăng nhập mật khẩu với redirect=/checkout → push /checkout, giỏ hàng giữ nguyên', async () => {
      mockSearchParams = new URLSearchParams('redirect=/checkout');
      mockLogin.mockResolvedValueOnce({ success: true });

      render(<SignInContainer />);
      submitPasswordLogin();

      await waitFor(() => expect(mockPush).toHaveBeenCalledWith('/checkout'));
      expect(mockPush).toHaveBeenCalledTimes(1);
      expect(localStorage.getItem(CART_KEY)).toBe(CART_VALUE);
    });

    it('redirect dạng link cũ /vi/checkout → push /checkout (không nhân đôi locale)', async () => {
      mockSearchParams = new URLSearchParams('redirect=/vi/checkout');
      mockLogin.mockResolvedValueOnce({ success: true });

      render(<SignInContainer />);
      submitPasswordLogin();

      await waitFor(() => expect(mockPush).toHaveBeenCalledWith('/checkout'));
    });

    it('không có redirect → push /profile', async () => {
      mockLogin.mockResolvedValueOnce({ success: true });

      render(<SignInContainer />);
      submitPasswordLogin();

      await waitFor(() => expect(mockPush).toHaveBeenCalledWith('/profile'));
    });

    it('user đã đăng nhập sẵn + redirect hợp lệ → push /checkout ngay', async () => {
      mockSearchParams = new URLSearchParams('redirect=/checkout');
      mockAuthState = { user: { id: 1, name: 'A' }, loading: false };

      render(<SignInContainer />);

      await waitFor(() => expect(mockPush).toHaveBeenCalledWith('/checkout'));
      expect(mockLogin).not.toHaveBeenCalled();
    });

    it('đang loading phiên đăng nhập → chưa push', () => {
      mockSearchParams = new URLSearchParams('redirect=/checkout');
      mockAuthState = { user: null, loading: true };

      render(<SignInContainer />);

      expect(mockPush).not.toHaveBeenCalled();
    });

    it.each(['https://evil.com', '//evil.com', 'javascript:alert(1)', '/\\evil.com', '%2F%2Fevil.com'])(
      'redirect độc hại %s → push /profile',
      async (malicious) => {
        mockSearchParams = new URLSearchParams();
        mockSearchParams.set('redirect', malicious);
        mockLogin.mockResolvedValueOnce({ success: true });

        render(<SignInContainer />);
        submitPasswordLogin();

        await waitFor(() => expect(mockPush).toHaveBeenCalledWith('/profile'));
        expect(mockPush).not.toHaveBeenCalledWith(malicious);
      }
    );

    it('user đã đăng nhập sẵn + redirect độc hại → push /profile', async () => {
      mockSearchParams = new URLSearchParams();
      mockSearchParams.set('redirect', '//evil.com');
      mockAuthState = { user: { id: 1 }, loading: false };

      render(<SignInContainer />);

      await waitFor(() => expect(mockPush).toHaveBeenCalledWith('/profile'));
    });

    it('đăng nhập thất bại → không push, hiển thị lỗi, giỏ hàng giữ nguyên', async () => {
      mockSearchParams = new URLSearchParams('redirect=/checkout');
      mockLogin.mockResolvedValueOnce({ success: false, message: 'Sai mật khẩu' });

      render(<SignInContainer />);
      submitPasswordLogin();

      await waitFor(() => expect(screen.getByText('Sai mật khẩu')).toBeInTheDocument());
      expect(mockPush).not.toHaveBeenCalled();
      expect(mockSearchParams.get('redirect')).toBe('/checkout');
      expect(localStorage.getItem(CART_KEY)).toBe(CART_VALUE);
    });
  });

  describe('LoginForm (nhánh fallback khi không có onLoginSuccess)', () => {
    it('mật khẩu: redirect=/checkout → push /checkout', async () => {
      mockSearchParams = new URLSearchParams('redirect=/checkout');
      mockLogin.mockResolvedValueOnce({ success: true });

      render(<LoginForm />);
      submitPasswordLogin();

      await waitFor(() => expect(mockPush).toHaveBeenCalledWith('/checkout'));
      expect(localStorage.getItem(CART_KEY)).toBe(CART_VALUE);
    });

    it('mật khẩu: redirect độc hại → push /profile', async () => {
      mockSearchParams = new URLSearchParams();
      mockSearchParams.set('redirect', 'https://evil.com');
      mockLogin.mockResolvedValueOnce({ success: true });

      render(<LoginForm />);
      submitPasswordLogin();

      await waitFor(() => expect(mockPush).toHaveBeenCalledWith('/profile'));
    });

    it('Google: đăng nhập thành công với redirect=/checkout → push /checkout', async () => {
      mockSearchParams = new URLSearchParams('redirect=/checkout');
      mockLoginWithGoogle.mockResolvedValueOnce({ success: true });

      let googleCallback: ((res: { credential: string }) => Promise<void>) | undefined;
      (window as any).google = {
        accounts: {
          id: {
            initialize: vi.fn((cfg: { callback: typeof googleCallback }) => {
              googleCallback = cfg.callback;
            }),
            renderButton: vi.fn(),
          },
        },
      };
      const script = document.createElement('script');
      script.id = 'google-gsi-client';
      document.body.appendChild(script);

      render(<LoginForm />);
      expect(googleCallback).toBeDefined();

      await act(async () => {
        await googleCallback!({ credential: 'google-token' });
      });

      expect(mockLoginWithGoogle).toHaveBeenCalledWith('google-token');
      expect(mockPush).toHaveBeenCalledWith('/checkout');
      expect(localStorage.getItem(CART_KEY)).toBe(CART_VALUE);
    });

    it('OTP kích hoạt: thành công với redirect=/checkout → push /checkout', async () => {
      mockSearchParams = new URLSearchParams('redirect=/checkout');
      mockLogin.mockResolvedValueOnce({
        success: false,
        error_code: 'ACCOUNT_PENDING',
        message: 'Tài khoản chưa được kích hoạt.',
        data: { email: 'pending@example.com' },
      });
      mockVerifyEmailApi.mockResolvedValueOnce({ token: 'tkn', user: { id: 9 } });

      render(<LoginForm />);
      submitPasswordLogin();

      await waitFor(() => expect(screen.getByText('Kích hoạt ngay →')).toBeInTheDocument());
      expect(mockPush).not.toHaveBeenCalled();

      fireEvent.click(screen.getByText('Kích hoạt ngay →'));
      fireEvent.change(screen.getByPlaceholderText('••••••'), { target: { value: '123456' } });
      fireEvent.click(screen.getByRole('button', { name: 'Xác nhận kích hoạt' }));

      await waitFor(() => expect(mockLoginWithToken).toHaveBeenCalledWith('tkn', { id: 9 }));
      await waitFor(() => expect(mockPush).toHaveBeenCalledWith('/checkout'), { timeout: 3000 });
      expect(localStorage.getItem(CART_KEY)).toBe(CART_VALUE);
    });
  });
});
