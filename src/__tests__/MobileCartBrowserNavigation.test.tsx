/* eslint-disable @next/next/no-img-element */
import { render, screen, fireEvent, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import '@testing-library/jest-dom';
import React from 'react';
import MobileCartFlow from '@/components/Header/MobileCartFlow';
import viMessages from '@/i18n/locales/vi.json';

// Mock next-intl
vi.mock('next-intl', () => ({
  useTranslations: (namespace?: string) => {
    const resolveKey = (key: string) => {
      const fullPath = namespace ? `${namespace}.${key}` : key;
      const parts = fullPath.split('.');
      let current: any = viMessages;
      for (const p of parts) {
        if (current && typeof current === 'object' && p in current) {
          current = current[p];
        } else {
          return key;
        }
      }
      return typeof current === 'string' ? current : key;
    };

    const t: any = (key: string, values?: Record<string, any>) => {
      let text = resolveKey(key);
      if (values) {
        Object.entries(values).forEach(([k, v]) => {
          text = text.replace(new RegExp(`\\{${k}\\}`, 'g'), String(v));
        });
      }
      return text;
    };

    t.rich = (key: string) => resolveKey(key);
    return t;
  },
  useLocale: () => 'vi',
}));

// Mock i18n routing
vi.mock('@/i18n/routing', () => ({
  usePathname: () => '/',
  useRouter: () => ({ push: vi.fn(), back: vi.fn() }),
  Link: ({ children, href, className, onClick, ...rest }: any) => (
    <a href={href} className={className} onClick={onClick} {...rest}>
      {children}
    </a>
  ),
}));

// Mock next/image
vi.mock('next/image', () => ({
  default: (props: any) => <img {...props} alt={props.alt || ''} />,
}));

// Mock AuthContext
vi.mock('@/contexts/AuthContext', async (importOriginal) => {
  const actual: any = await importOriginal();
  return {
    ...actual,
    useAuth: () => ({
      user: null,
      token: null,
      refreshUser: vi.fn(),
    }),
  };
});

// Mock BranchContext
vi.mock('@/contexts/BranchContext', async (importOriginal) => {
  const actual: any = await importOriginal();
  return {
    ...actual,
    useBranch: () => ({
      selectedBranch: { id: 1, name: 'Chi nhánh 1' },
      branches: [{ id: 1, name: 'Chi nhánh 1' }],
    }),
    useBranches: () => [{ id: 1, name: 'Chi nhánh 1' }],
  };
});

// Mock Services
vi.mock('@/services/generalSettingService', () => ({
  getGeneralSettings: vi.fn().mockResolvedValue({}),
}));

vi.mock('@/services/campaignService', () => ({
  getActiveCampaigns: vi.fn().mockResolvedValue([]),
}));

vi.mock('@/services/authService', () => ({
  getCustomerAddressesApi: vi.fn().mockResolvedValue([]),
  getCachedCustomerAddresses: vi.fn().mockReturnValue([]),
  setCachedCustomerAddresses: vi.fn(),
  checkGuestTierByPhone: vi.fn().mockResolvedValue(null),
}));

vi.mock('@/services/orderService', async () => {
  const actual: any = await vi.importActual('@/services/orderService');
  return {
    ...actual,
    getCheckoutConfig: vi.fn(async () => ({
      default_shipping_fee: '30000',
      operating_hours: { enabled: true, start_hour: 0, end_hour: 24 },
      branches: [{ id: 1, branchName: 'Chi nhánh 1', address: '123 Lê Lợi' }],
    })),
    getAvailableVouchers: vi.fn().mockResolvedValue([]),
    getActiveCampaigns: vi.fn().mockResolvedValue([]),
    getShippingSettings: vi.fn().mockResolvedValue({
      is_min_amount_enabled: false,
    }),
    getAdministrativeUnits: vi.fn().mockResolvedValue([
      {
        name: 'TP. Hồ Chí Minh',
        districts: [
          {
            name: 'Quận 1',
            wards: [{ name: 'Bến Nghé', id: 1 }],
          },
        ],
      },
    ]),
    createOrder: vi.fn(),
    cancelOrderApi: vi.fn(),
    getLoyaltySettings: vi.fn(async () => null),
    calculateShippingFee: vi.fn(async () => ({ success: true, shippingFee: 30000 })),
    validateVoucher: vi.fn(async () => ({ valid: false, message: "" })),
  };
});

// Mock CartContext
let mockCartState: any = {
  cartItems: [
    {
      id: 'cart-item-1',
      productId: 101,
      productCode: 'GHE-NGAM-01',
      title: 'Ghẹ ngâm tương',
      variant: 'SIZE 1 CON',
      unitPrice: 450000,
      quantity: 2,
      imageUrl: '/ghe.jpg',
      isOutOfStock: false,
    },
  ],
  subtotal: 900000,
  hasOutOfStockItems: false,
  isCartOpen: true,
  setIsCartOpen: vi.fn((val: boolean) => {
    mockCartState.isCartOpen = val;
  }),
  totalItems: 2,
  addToCart: vi.fn(),
  removeFromCart: vi.fn(),
  updateQuantity: vi.fn(),
  clearCart: vi.fn(),
};

vi.mock('@/contexts/CartContext', async (importOriginal) => {
  const actual: any = await importOriginal();
  return {
    ...actual,
    useCart: () => mockCartState,
  };
});

describe('MobileCartFlow Browser History Navigation & Synchronization', () => {
  const originalInnerWidth = window.innerWidth;
  let pushStateSpy: any;
  let backSpy: any;
  let goSpy: any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockCartState.isCartOpen = true;
    window.innerWidth = 390; // Mobile viewport

    // Setup history mocks
    let currentState: any = null;
    pushStateSpy = vi.fn((state: any) => {
      currentState = state;
      Object.defineProperty(window.history, 'state', {
        writable: true,
        value: state,
      });
    });
    backSpy = vi.fn();
    goSpy = vi.fn();

    Object.defineProperty(window.history, 'pushState', {
      writable: true,
      value: pushStateSpy,
    });
    Object.defineProperty(window.history, 'back', {
      writable: true,
      value: backSpy,
    });
    Object.defineProperty(window.history, 'go', {
      writable: true,
      value: goSpy,
    });
    Object.defineProperty(window.history, 'state', {
      writable: true,
      value: null,
    });
  });

  afterEach(() => {
    window.innerWidth = originalInnerWidth;
  });

  it('1. Pushes browser history entry { modal: "cart", step: 1 } when cart opens on mobile', () => {
    render(<MobileCartFlow onClose={vi.fn()} />);

    expect(pushStateSpy).toHaveBeenCalledWith(
      { modal: 'cart', step: 1 },
      '',
      expect.any(String)
    );
  });

  it('2. Does NOT push history entry when viewport is desktop (>= 1280px)', () => {
    window.innerWidth = 1440;
    render(<MobileCartFlow onClose={vi.fn()} />);

    expect(pushStateSpy).not.toHaveBeenCalled();
  });

  it('3. Does NOT push history entry when inline=true (e.g. in /checkout page)', () => {
    render(<MobileCartFlow inline={true} />);

    expect(pushStateSpy).not.toHaveBeenCalled();
  });

  it('4. Pushes { modal: "cart", step: 2 } when moving from Step 1 to Step 2', async () => {
    render(<MobileCartFlow onClose={vi.fn()} />);

    // Reset initial mount call
    pushStateSpy.mockClear();

    // Click "Tiếp tục" / Continue to step 2
    const continueBtn = screen.getByRole('button', { name: /^tiếp tục$/i });
    fireEvent.click(continueBtn);

    expect(pushStateSpy).toHaveBeenCalledWith(
      { modal: 'cart', step: 2 },
      '',
      expect.any(String)
    );

    // Verify Step 2 UI is shown (back arrow and contact info visible)
    expect(screen.getByText('←')).toBeInTheDocument();
    expect(screen.getByText('Thông tin liên hệ')).toBeInTheDocument();
  });

  it('5. Navigates back from Step 2 to Step 1 on browser popstate event with step 1', () => {
    render(<MobileCartFlow onClose={vi.fn()} />);

    // Move to step 2
    const continueBtn = screen.getByRole('button', { name: /^tiếp tục$/i });
    fireEvent.click(continueBtn);

    expect(screen.getByText('←')).toBeInTheDocument();

    // Simulate browser Back (popstate with step 1)
    act(() => {
      const popStateEvent = new PopStateEvent('popstate', {
        state: { modal: 'cart', step: 1 },
      });
      window.dispatchEvent(popStateEvent);
    });

    // Step 2 back arrow should now be hidden (we are back in Step 1)
    expect(screen.queryByText('←')).not.toBeInTheDocument();
    // Continue button in step 1 is present again
    expect(screen.getByRole('button', { name: /^tiếp tục$/i })).toBeInTheDocument();
  });

  it('6. Closes cart on browser popstate event when state is null (back past step 1)', () => {
    const handleClose = vi.fn();
    render(<MobileCartFlow onClose={handleClose} />);

    // Simulate browser Back when on Step 1 (pops past cart entry to page state)
    act(() => {
      const popStateEvent = new PopStateEvent('popstate', {
        state: null,
      });
      window.dispatchEvent(popStateEvent);
    });

    expect(handleClose).toHaveBeenCalled();
  });

  it('7. Re-opens cart on browser forward popstate event when state has modal: cart', () => {
    mockCartState.isCartOpen = false;
    const handleClose = vi.fn();

    render(<MobileCartFlow onClose={handleClose} />);

    // Simulate browser Forward into cart state
    act(() => {
      const popStateEvent = new PopStateEvent('popstate', {
        state: { modal: 'cart', step: 1 },
      });
      window.dispatchEvent(popStateEvent);
    });

    expect(mockCartState.setIsCartOpen).toHaveBeenCalledWith(true);
  });

  it('8. Clicking header back arrow in Step 2 invokes window.history.back()', () => {
    render(<MobileCartFlow onClose={vi.fn()} />);

    // Move to step 2
    const continueBtn = screen.getByRole('button', { name: /^tiếp tục$/i });
    fireEvent.click(continueBtn);

    // Ensure state is step 2
    Object.defineProperty(window.history, 'state', {
      writable: true,
      value: { modal: 'cart', step: 2 },
    });

    const backArrow = screen.getByText('←');
    fireEvent.click(backArrow);

    expect(backSpy).toHaveBeenCalled();
  });

  it('9. Clicking Close button (&times;) calls window.history.go(-depth) to cleanly rewind history', () => {
    const handleClose = vi.fn();
    render(<MobileCartFlow onClose={handleClose} />);

    // State was pushed as modal: cart, step 1
    Object.defineProperty(window.history, 'state', {
      writable: true,
      value: { modal: 'cart', step: 1 },
    });

    const closeBtn = screen.getByRole('button', { name: 'Đóng' });
    fireEvent.click(closeBtn);

    expect(goSpy).toHaveBeenCalledWith(-1);
    expect(handleClose).toHaveBeenCalled();
  });
});
