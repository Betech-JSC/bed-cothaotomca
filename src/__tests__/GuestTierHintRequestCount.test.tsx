/* eslint-disable @next/next/no-img-element */
/**
 * change: guest-member-tier-login-hint — tasks 5.4 (Desktop) & 6.3 (Mobile)
 *
 * Đếm số request tra cứu hạng khách vãng lai (`checkGuestTierByPhone`) bằng fake timers:
 * - chỉ 1 request / 1 giá trị SĐT hợp lệ sau debounce 400ms
 * - không gọi lại khi kết quả cập nhật state (vòng lặp cũ trên Mobile), không gọi khi blur (Desktop)
 * - bỏ qua response cũ khi SĐT đã đổi, fail-silent khi API lỗi
 */
import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import '@testing-library/jest-dom';
import { NextIntlClientProvider } from 'next-intl';
import viMessages from '@/i18n/locales/vi.json';
import CheckoutForm from '@/components/Checkout/CheckoutForm';
import MobileCartFlow from '@/components/Header/MobileCartFlow';
import type { CheckoutConfig } from '@/services/orderService';
import type { GuestTierHint } from '@/services/authService';

const { mockCheckGuestTierByPhone, mockConfig } = vi.hoisted(() => ({
  mockCheckGuestTierByPhone: vi.fn(),
  mockConfig: {
    operating_hours: { store_open: '00:00', store_close: '23:59' },
    branches: [{ id: 1, branchName: 'Chi nhánh Tân Bình', address: '64 Út Tịch', isActive: true }],
    default_shipping_fee: '25000',
    active_promotions: [],
  } as unknown as CheckoutConfig,
}));

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------
vi.mock('next/image', () => ({
  default: (props: any) => <img {...props} alt={props.alt || ''} />,
}));

vi.mock('next/navigation', () => ({
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => '/checkout',
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
}));

// Link next-intl: serialize href object để assert pathname + query redirect
vi.mock('@/i18n/routing', () => ({
  usePathname: () => '/checkout',
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  Link: ({ children, href, className }: any) => {
    const hrefStr =
      typeof href === 'string'
        ? href
        : `${href?.pathname}${href?.query ? `?${new URLSearchParams(href.query).toString()}` : ''}`;
    return (
      <a href={hrefStr} className={className}>
        {children}
      </a>
    );
  },
}));

let mockUser: any = null;
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: mockUser, token: mockUser ? 'tkn' : null, refreshUser: vi.fn() }),
  getMemberTier: () => ({ tier: 'member', name: 'Member', discountPercent: 0, label: '' }),
  calculateMemberDiscount: () => 0,
}));

const mockCartItems = [
  {
    id: 'cart-1',
    productId: 1,
    title: 'Cơm Thố Xá Xíu',
    name: 'Cơm Thố Xá Xíu',
    unitPrice: 75000,
    originalPrice: 75000,
    quantity: 2,
    imageUrl: '/images/xaxiu.jpg',
    isOutOfStock: false,
  },
];

vi.mock('@/contexts/CartContext', () => ({
  useCart: () => ({
    cartItems: mockCartItems,
    updateQuantity: vi.fn(),
    removeFromCart: vi.fn(),
    clearCart: vi.fn(),
    addToCart: vi.fn(),
    subtotal: 150000,
    hasOutOfStockItems: false,
    isCartOpen: true,
  }),
}));

vi.mock('@/contexts/BranchContext', () => ({
  useBranches: () => ({
    branches: [{ id: 1, branchName: 'Chi nhánh Tân Bình', address: '64 Út Tịch', isActive: true }],
    currentBranch: { id: 1, branchName: 'Chi nhánh Tân Bình' },
    selectedBranchId: 1,
    setSelectedBranchId: vi.fn(),
    selectBranch: vi.fn(),
  }),
}));

vi.mock('@/services/campaignService', () => ({
  getActiveCampaigns: vi.fn().mockResolvedValue([]),
}));

vi.mock('@/services/generalSettingService', () => ({
  getGeneralSettings: vi.fn().mockResolvedValue({ hotline: '024.9999.7122' }),
}));

vi.mock('@/services/authService', async () => {
  const actual = await vi.importActual<typeof import('@/services/authService')>('@/services/authService');
  return {
    ...actual,
    getCustomerAddressesApi: vi.fn().mockResolvedValue([]),
    getCachedCustomerAddresses: vi.fn().mockReturnValue([]),
    setCachedCustomerAddresses: vi.fn(),
    checkGuestTierByPhone: (...args: unknown[]) => mockCheckGuestTierByPhone(...args),
  };
});

vi.mock('@/services/orderService', async () => {
  const actual = await vi.importActual<typeof import('@/services/orderService')>('@/services/orderService');
  return {
    ...actual,
    getCheckoutConfig: vi.fn().mockResolvedValue(mockConfig),
    getAvailableVouchers: vi.fn().mockResolvedValue([]),
    getShippingSettings: vi.fn().mockResolvedValue(null),
    getLoyaltySettings: vi.fn().mockResolvedValue(null),
    getAdministrativeUnits: vi.fn().mockResolvedValue([]),
    calculateShippingFee: vi.fn().mockResolvedValue({
      shipping_fee: 25000,
      original_fee: 25000,
      is_freeship: false,
      is_deliverable: true,
      message: null,
    }),
    createOrder: vi.fn(),
  };
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
// Lưu ý: mock trả về object MỚI mỗi lần (`{ ...GOLD_HINT }`) giống service thật — nếu trả cùng
// reference, React bỏ qua setState và vòng lặp deps cũ trên Mobile sẽ không bị phát hiện.
const GOLD_HINT: GuestTierHint = {
  tier: 'gold',
  discountPercent: 5,
  hasBenefit: true,
  isUpgradeCelebration: false,
  celebrationTier: null,
} as GuestTierHint;

const DIAMOND_HINT: GuestTierHint = {
  tier: 'diamond',
  discountPercent: 8,
  hasBenefit: true,
  isUpgradeCelebration: false,
  celebrationTier: null,
} as GuestTierHint;

const GOLD_TEXT =
  'Bạn là thành viên hạng GOLD! Đăng nhập để nhận ngay ưu đãi đặc quyền thành viên giảm 5% cho đơn hàng này.';
const DIAMOND_TEXT =
  'Bạn là thành viên hạng DIAMOND! Đăng nhập để nhận ngay ưu đãi đặc quyền thành viên giảm 8% cho đơn hàng này.';
const CHECKING_TEXT = 'Đang kiểm tra ưu đãi...';

const withIntl = (ui: React.ReactElement) => (
  <NextIntlClientProvider locale="vi" messages={viMessages} timeZone="Asia/Ho_Chi_Minh" onError={() => {}}>
    {ui}
  </NextIntlClientProvider>
);

const queryBanner = (text: string) =>
  screen.queryByText((_, el) => el?.tagName === 'P' && el.textContent === text);

const advance = async (ms: number) => {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(ms);
  });
};

const typePhone = async (input: HTMLInputElement, value: string) => {
  await act(async () => {
    fireEvent.change(input, { target: { value } });
  });
};

type Deferred<T> = { promise: Promise<T>; resolve: (v: T) => void; reject: (e: unknown) => void };
const deferred = <T,>(): Deferred<T> => {
  let resolve!: (v: T) => void;
  let reject!: (e: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
};

const renderDesktop = async () => {
  const utils = render(withIntl(<CheckoutForm order={null} config={mockConfig} mockTime="12:00" />));
  await advance(0);
  const desktopForm = utils.container.querySelector('form') as HTMLFormElement;
  expect(desktopForm).toBeInTheDocument();
  const phoneInput = desktopForm.querySelector('input[type="tel"]') as HTMLInputElement;
  expect(phoneInput).toBeInTheDocument();
  return { ...utils, desktopForm, phoneInput };
};

const renderMobile = async () => {
  const utils = render(withIntl(<MobileCartFlow inline={true} />));
  await advance(0);
  const phoneInput = utils.container.querySelector('input[type="tel"]') as HTMLInputElement;
  expect(phoneInput).toBeInTheDocument();
  return { ...utils, phoneInput };
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe('Guest tier hint — số request tra cứu hạng (change: guest-member-tier-login-hint)', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    mockUser = null;
    localStorage.clear();
    mockCheckGuestTierByPhone.mockReset();
    global.fetch = vi.fn().mockRejectedValue(new Error('network disabled in test')) as any;
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('Desktop — CheckoutForm', () => {
    it('nhập SĐT hợp lệ → đúng 1 request sau 400ms; blur → vẫn 1; advance 10s → vẫn 1; banner + link đăng nhập đúng', async () => {
      mockCheckGuestTierByPhone.mockImplementation(async () => ({ ...GOLD_HINT }));
      const { desktopForm, phoneInput } = await renderDesktop();

      await typePhone(phoneInput, '0901234567');
      await advance(399);
      expect(mockCheckGuestTierByPhone).toHaveBeenCalledTimes(0);

      await advance(1);
      expect(mockCheckGuestTierByPhone).toHaveBeenCalledTimes(1);
      expect(mockCheckGuestTierByPhone).toHaveBeenCalledWith('0901234567');
      expect(queryBanner(GOLD_TEXT)).toBeInTheDocument();

      await act(async () => {
        fireEvent.blur(phoneInput);
      });
      await advance(1000);
      expect(mockCheckGuestTierByPhone).toHaveBeenCalledTimes(1);

      await advance(10000);
      expect(mockCheckGuestTierByPhone).toHaveBeenCalledTimes(1);
      expect(queryBanner(GOLD_TEXT)).toBeInTheDocument();

      const loginLink = Array.from(desktopForm.querySelectorAll('a')).find((a) => a.textContent === 'Đăng nhập');
      expect(loginLink).toBeDefined();
      expect(loginLink!.getAttribute('href')).toBe(`/signin?redirect=${encodeURIComponent('/checkout')}&phone=0901234567`);
    });

    it('hiển thị text loading i18n trong lúc chờ response, ẩn khi có kết quả', async () => {
      const pending = deferred<GuestTierHint | null>();
      mockCheckGuestTierByPhone.mockReturnValue(pending.promise);
      const { desktopForm, phoneInput } = await renderDesktop();

      await typePhone(phoneInput, '0901234567');
      await advance(400);
      expect(desktopForm).toHaveTextContent(CHECKING_TEXT);

      await act(async () => {
        pending.resolve(GOLD_HINT);
      });
      expect(desktopForm).not.toHaveTextContent(CHECKING_TEXT);
      expect(queryBanner(GOLD_TEXT)).toBeInTheDocument();
    });

    it('đổi SĐT trước khi response cũ về → banner chỉ theo SĐT mới, response cũ bị bỏ qua', async () => {
      const first = deferred<GuestTierHint | null>();
      const second = deferred<GuestTierHint | null>();
      mockCheckGuestTierByPhone.mockImplementation((phone: string) =>
        phone === '0901234567' ? first.promise : second.promise
      );
      const { phoneInput } = await renderDesktop();

      await typePhone(phoneInput, '0901234567');
      await advance(400);
      expect(mockCheckGuestTierByPhone).toHaveBeenCalledTimes(1);

      await typePhone(phoneInput, '0912345678');
      await advance(400);
      expect(mockCheckGuestTierByPhone).toHaveBeenCalledTimes(2);
      expect(mockCheckGuestTierByPhone).toHaveBeenLastCalledWith('0912345678');

      // Response mới về trước
      await act(async () => {
        second.resolve(DIAMOND_HINT);
      });
      expect(queryBanner(DIAMOND_TEXT)).toBeInTheDocument();

      // Response cũ (SĐT A) về sau → phải bị bỏ qua
      await act(async () => {
        first.resolve(GOLD_HINT);
      });
      expect(queryBanner(DIAMOND_TEXT)).toBeInTheDocument();
      expect(queryBanner(GOLD_TEXT)).not.toBeInTheDocument();
      expect(mockCheckGuestTierByPhone).toHaveBeenCalledTimes(2);
    });

    it('user đã đăng nhập → 0 request tra cứu hạng public', async () => {
      mockUser = { id: 1, name: 'Nguyen Van A', phone: '0987654321', email: 'a@example.com' };
      mockCheckGuestTierByPhone.mockImplementation(async () => ({ ...GOLD_HINT }));
      const { phoneInput } = await renderDesktop();

      await typePhone(phoneInput, '0901234567');
      await advance(10000);
      expect(mockCheckGuestTierByPhone).toHaveBeenCalledTimes(0);
      expect(queryBanner(GOLD_TEXT)).not.toBeInTheDocument();
    });

    it('API reject → không banner, không lỗi, không retry, loading tắt', async () => {
      mockCheckGuestTierByPhone.mockRejectedValue(new Error('429 Too Many Attempts'));
      const { desktopForm, phoneInput } = await renderDesktop();

      await typePhone(phoneInput, '0901234567');
      await advance(400);
      await advance(10000);

      expect(mockCheckGuestTierByPhone).toHaveBeenCalledTimes(1);
      expect(queryBanner(GOLD_TEXT)).not.toBeInTheDocument();
      expect(desktopForm).not.toHaveTextContent(CHECKING_TEXT);
      expect(desktopForm).not.toHaveTextContent('429');
    });

    it('xoá bớt SĐT còn < 10 số → banner ẩn, không request mới', async () => {
      mockCheckGuestTierByPhone.mockImplementation(async () => ({ ...GOLD_HINT }));
      const { phoneInput } = await renderDesktop();

      await typePhone(phoneInput, '0901234567');
      await advance(400);
      expect(queryBanner(GOLD_TEXT)).toBeInTheDocument();

      await typePhone(phoneInput, '090123456');
      await advance(10000);
      expect(queryBanner(GOLD_TEXT)).not.toBeInTheDocument();
      expect(mockCheckGuestTierByPhone).toHaveBeenCalledTimes(1);
    });
  });

  describe('Mobile — MobileCartFlow (Step 2)', () => {
    it('nhập SĐT → đúng 1 request sau debounce; banner Gold hiện; advance ≥ 30s → không thêm request, banner vẫn hiện', async () => {
      mockCheckGuestTierByPhone.mockImplementation(async () => ({ ...GOLD_HINT }));
      const { container, phoneInput } = await renderMobile();

      await typePhone(phoneInput, '0901234567');
      await advance(399);
      expect(mockCheckGuestTierByPhone).toHaveBeenCalledTimes(0);

      await advance(1);
      expect(mockCheckGuestTierByPhone).toHaveBeenCalledTimes(1);
      expect(queryBanner(GOLD_TEXT)).toBeInTheDocument();

      // Trước fix: effect có `guestTierHint` trong deps → mỗi ~400ms lại gọi API (12 request/8,8s)
      for (let i = 0; i < 6; i++) {
        await advance(5000);
      }
      expect(mockCheckGuestTierByPhone).toHaveBeenCalledTimes(1);
      expect(queryBanner(GOLD_TEXT)).toBeInTheDocument();

      const loginLink = Array.from(container.querySelectorAll('a')).find((a) => a.textContent === 'Đăng nhập');
      expect(loginLink).toBeDefined();
      expect(loginLink!.getAttribute('href')).toBe(`/signin?redirect=${encodeURIComponent('/checkout')}&phone=0901234567`);
    });

    it('xoá SĐT còn < 10 số → banner ẩn, không request mới', async () => {
      mockCheckGuestTierByPhone.mockImplementation(async () => ({ ...GOLD_HINT }));
      const { phoneInput } = await renderMobile();

      await typePhone(phoneInput, '0901234567');
      await advance(400);
      expect(queryBanner(GOLD_TEXT)).toBeInTheDocument();

      await typePhone(phoneInput, '090123');
      await advance(10000);
      expect(queryBanner(GOLD_TEXT)).not.toBeInTheDocument();
      expect(mockCheckGuestTierByPhone).toHaveBeenCalledTimes(1);
    });

    it('đổi SĐT trước khi response cũ về → bỏ qua response cũ', async () => {
      const first = deferred<GuestTierHint | null>();
      const second = deferred<GuestTierHint | null>();
      mockCheckGuestTierByPhone.mockImplementation((phone: string) =>
        phone === '0901234567' ? first.promise : second.promise
      );
      const { phoneInput } = await renderMobile();

      await typePhone(phoneInput, '0901234567');
      await advance(400);
      await typePhone(phoneInput, '0912345678');
      await advance(400);
      expect(mockCheckGuestTierByPhone).toHaveBeenCalledTimes(2);

      await act(async () => {
        second.resolve(null);
      });
      await act(async () => {
        first.resolve(GOLD_HINT);
      });
      expect(queryBanner(GOLD_TEXT)).not.toBeInTheDocument();
      expect(mockCheckGuestTierByPhone).toHaveBeenCalledTimes(2);
    });

    it('API reject (vd. 429) → không banner, không retry', async () => {
      mockCheckGuestTierByPhone.mockRejectedValue(new Error('429'));
      const { phoneInput } = await renderMobile();

      await typePhone(phoneInput, '0901234567');
      await advance(400);
      await advance(30000);
      expect(mockCheckGuestTierByPhone).toHaveBeenCalledTimes(1);
      expect(queryBanner(GOLD_TEXT)).not.toBeInTheDocument();
    });
  });
});
