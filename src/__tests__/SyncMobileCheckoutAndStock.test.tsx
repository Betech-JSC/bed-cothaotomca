/* eslint-disable @next/next/no-img-element */
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import '@testing-library/jest-dom';
import React from 'react';
import { checkItemOutOfStock, CartItem } from '@/contexts/CartContext';
import CouponModal from '@/components/Voucher/CouponModal';
import ProductDetailsInfo from '@/components/Product/ProductDetailsInfo';
import CartPopup from '@/components/Header/CartPopup';
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

    t.rich = (key: string, values?: Record<string, any>) => {
      let text = resolveKey(key);
      if (!values) return text;
      return text;
    };

    return t;
  },
  useLocale: () => 'vi',
}));

// Mock i18n routing
let mockPathname = '/';
const mockPush = vi.fn();
vi.mock('@/i18n/routing', () => ({
  usePathname: () => mockPathname,
  useRouter: () => ({ push: mockPush }),
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

// Mock CartContext
let mockCartState: any = {
  cartItems: [
    {
      id: 'cart-1',
      productId: 1,
      productCode: 'CA-KHO-01',
      title: 'Cá Kho Tộ',
      variant: 'Phần Nhỏ',
      unitPrice: 70000,
      quantity: 1,
      imageUrl: '/cakho.jpg',
      isOutOfStock: false,
    },
  ],
  subtotal: 70000,
  hasOutOfStockItems: false,
  isCartOpen: false,
  totalItems: 1,
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

// Mock AuthContext
let mockAuthUser: any = null;
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: mockAuthUser,
    token: mockAuthUser ? 'mock-token' : null,
    refreshUser: vi.fn(),
  }),
  getMemberTier: (u: any) => ({
    tier: u?.tier || 'member',
    discountPercent: u?.tier === 'diamond' ? 10 : u?.tier === 'gold' ? 5 : 0,
    minPoints: 0,
    badgeColor: 'gold',
  }),
  calculateMemberDiscount: (amount: number, user: any) => {
    if (!user) return 0;
    if (user.tier === 'diamond') return amount * 0.1;
    if (user.tier === 'gold') return amount * 0.05;
    return 0;
  },
}));

// Mock BranchContext
vi.mock('@/contexts/BranchContext', () => ({
  useBranches: () => ({
    branches: [{ id: 1, branchName: 'Chi nhánh 1' }],
    currentBranch: { id: 1, branchName: 'Chi nhánh 1' },
    selectBranch: vi.fn(),
  }),
}));

// Mock authService
const mockSavedAddresses = [
  {
    id: 10,
    recipient_name: 'Nguyen Van A',
    phone: '0901234567',
    province: 'TP. Hồ Chí Minh',
    district: 'Quận 1',
    ward: 'Phường Bến Nghé',
    ward_id: '760-26740',
    street_address: '123 Le Loi',
    full_address: '123 Le Loi, Phường Bến Nghé, Quận 1, TP. Hồ Chí Minh',
    is_default: true,
  },
  {
    id: 11,
    recipient_name: 'Tran Thi B',
    phone: '0909876543',
    province: 'Hà Nội',
    district: 'Quận Hoàn Kiếm',
    ward: 'Phường Hàng Bạc',
    ward_id: '001-00001',
    street_address: '456 Hang Bac',
    full_address: '456 Hang Bac, Phường Hàng Bạc, Quận Hoàn Kiếm, Hà Nội',
    is_default: false,
  },
];

let mockAddressesResponse = mockSavedAddresses;
let mockGuestHintResult: any = null;

vi.mock('@/services/authService', () => ({
  getCustomerAddressesApi: vi.fn(async () => mockAddressesResponse),
  getCachedCustomerAddresses: vi.fn(() => []),
  setCachedCustomerAddresses: vi.fn(),
  checkGuestTierByPhone: vi.fn(async () => mockGuestHintResult),
}));

// Mock orderService
vi.mock('@/services/orderService', async (importOriginal) => {
  const actual: any = await importOriginal();
  return {
    ...actual,
    getAdministrativeUnits: vi.fn(async () => [
      {
        id: '79',
        name: 'TP. Hồ Chí Minh',
        wards: [
          { id: '760-26740', name: 'Phường Bến Nghé', district: 'Quận 1' },
          { id: '760-26743', name: 'Phường Bến Thành', district: 'Quận 1' },
        ],
      },
    ]),
    getCheckoutConfig: vi.fn(async () => ({
      operating_hours: { enabled: true, start_hour: 9, end_hour: 23 },
      branches: [{ id: 1, branchName: 'Chi nhánh 1 - Trung tâm', address: '123 Le Loi' }],
      payment_methods: { cod: { enabled: true }, qr: { enabled: true } },
    })),
    getShippingSettings: vi.fn(async () => ({
      is_min_amount_enabled: true,
      min_order_amount: 500000,
    })),
    getAvailableVouchers: vi.fn(async () => []),
    calculateShippingFee: vi.fn(async () => ({
      fee: 30000,
      discount: 0,
      is_freeship: false,
      is_deliverable: true,
      applied_voucher: null,
      message: null,
    })),
    calculateVoucherDiscount: vi.fn(() => 0),
    createOrder: vi.fn(async () => ({ id: 999, code: 'ORD-999', status: 'pending' })),
  };
});

describe('sync-mobile-checkout-and-stock Changes Test Suite', () => {
  beforeEach(() => {
    localStorage.clear();
    mockPathname = '/';
    mockAuthUser = null;
    mockAddressesResponse = mockSavedAddresses;
    mockGuestHintResult = null;
    mockCartState = {
      cartItems: [
        {
          id: 'cart-1',
          productId: 1,
          productCode: 'CA-KHO-01',
          title: 'Cá Kho Tộ',
          variant: 'Phần Nhỏ',
          unitPrice: 70000,
          quantity: 1,
          imageUrl: '/cakho.jpg',
          isOutOfStock: false,
        },
      ],
      subtotal: 70000,
      hasOutOfStockItems: false,
      addToCart: vi.fn(),
      removeFromCart: vi.fn(),
      updateQuantity: vi.fn(),
      clearCart: vi.fn(),
    };
    vi.clearAllMocks();
  });

  // =========================================================================
  // 1. Unit Tests for checkItemOutOfStock
  // =========================================================================
  describe('1. checkItemOutOfStock (Bidirectional Variant/Parent Matching & Stock Check)', () => {
    const productsCache = [
      {
        id: 100, // Parent ID
        slug: 'com-nieu',
        code: 'COM-NIEU-PAR',
        stock: 5,
        variants: [
          {
            id: 101, // Variant ID
            size: 'Phần Nhỏ',
            code: 'COM-NIEU-S',
            stock: 20,
          },
          {
            id: 102, // Variant ID
            size: 'Phần Lớn',
            code: 'COM-NIEU-L',
            stock: 0, // Out of stock
          },
          {
            id: 103, // Variant with missing SKU
            size: 'Phần Đặc Biệt',
            code: '',
            stock: 10,
          },
        ],
      },
      {
        id: 200,
        slug: 'canh-chua',
        code: 'CANH-CHUA-01',
        stock: 0, // Single product out of stock
        variants: [],
      },
      {
        id: 300,
        slug: 'tra-da',
        code: 'TRA-DA-01',
        stock: 50, // Single product in stock
        variants: [],
      },
    ];

    it('Scenario 1: Matches variant when cart item references variant ID as productId', () => {
      const item: CartItem = {
        id: 'item-101',
        productId: 101, // Matches variant id: 101 inside parent id: 100
        productCode: 'COM-NIEU-S',
        slug: 'com-nieu',
        categorySlug: 'mon-chinh',
        title: 'Cơm Niêu - Phần Nhỏ',
        imageUrl: '/img.jpg',
        variant: 'Phần Nhỏ',
        unitPrice: 50000,
        quantity: 1,
      };

      const isOut = checkItemOutOfStock(item, productsCache);
      expect(isOut).toBe(false);
    });

    it('Scenario 2: Returns in stock (false) when variant has valid SKU even if stock is 0', () => {
      const item: CartItem = {
        id: 'item-102',
        productId: 102, // Matches variant with stock: 0 and valid SKU COM-NIEU-L
        productCode: 'COM-NIEU-L',
        slug: 'com-nieu',
        categorySlug: 'mon-chinh',
        title: 'Cơm Niêu - Phần Lớn',
        imageUrl: '/img.jpg',
        variant: 'Phần Lớn',
        unitPrice: 80000,
        quantity: 1,
      };

      const isOut = checkItemOutOfStock(item, productsCache);
      expect(isOut).toBe(false);
    });

    it('Scenario 3: Returns out of stock when variant SKU is empty', () => {
      const item: CartItem = {
        id: 'item-103',
        productId: 103,
        productCode: '',
        slug: 'com-nieu',
        categorySlug: 'mon-chinh',
        title: 'Cơm Niêu - Đặc Biệt',
        imageUrl: '/img.jpg',
        variant: 'Phần Đặc Biệt',
        unitPrice: 100000,
        quantity: 1,
      };

      const isOut = checkItemOutOfStock(item, productsCache);
      expect(isOut).toBe(true);
    });

    it('Scenario 4: Returns in stock (false) for simple product with valid SKU even if stock <= 0', () => {
      const item: CartItem = {
        id: 'item-200',
        productId: 200,
        productCode: 'CANH-CHUA-01',
        slug: 'canh-chua',
        categorySlug: 'mon-canh',
        title: 'Canh Chua',
        imageUrl: '/img.jpg',
        variant: '',
        unitPrice: 60000,
        quantity: 1,
      };

      const isOut = checkItemOutOfStock(item, productsCache);
      expect(isOut).toBe(false);
    });

    it('Scenario 5: Returns in stock for simple product with positive stock', () => {
      const item: CartItem = {
        id: 'item-300',
        productId: 300,
        productCode: 'TRA-DA-01',
        slug: 'tra-da',
        categorySlug: 'do-uong',
        title: 'Trà Đá',
        imageUrl: '/img.jpg',
        variant: '',
        unitPrice: 5000,
        quantity: 1,
      };

      const isOut = checkItemOutOfStock(item, productsCache);
      expect(isOut).toBe(false);
    });

    it('Scenario 6: Cache Miss fallback returns Boolean(item.isOutOfStock) without penalizing items', () => {
      const item: CartItem = {
        id: 'item-unknown',
        productId: 9999,
        productCode: 'UNKNOWN-SKU-1',
        slug: 'mon-chua-tai',
        categorySlug: 'mon-chinh',
        title: 'Món Chưa Tải',
        imageUrl: '/img.jpg',
        variant: '',
        unitPrice: 50000,
        quantity: 1,
        isOutOfStock: false,
      };

      // Cache miss with productsCache
      expect(checkItemOutOfStock(item, productsCache)).toBe(false);
      // Empty cache []
      expect(checkItemOutOfStock(item, [])).toBe(false);
      // Preserves existing true if already marked out of stock
      expect(checkItemOutOfStock({ ...item, isOutOfStock: true }, productsCache)).toBe(true);
    });
  });

  // =========================================================================
  // 2. Component Tests for CouponModal isBrowseMode resolution
  // =========================================================================
  describe('2. CouponModal isBrowseMode resolution', () => {
    const mockVouchers = [
      {
        id: 1,
        code: 'GIAM20K',
        title: 'Giảm 20K',
        description: 'Đơn từ 100K',
        min_order_value: 100000,
        discount_amount: 20000,
        discount_type: 'fixed',
        is_active: true,
      },
    ];

    it('evaluates to selection mode (isBrowseMode = false) when isBrowseOnly={false} even if not on /checkout', () => {
      mockPathname = '/'; // On homepage

      render(
        <CouponModal
          isOpen={true}
          onClose={vi.fn()}
          subtotal={150000}
          isBrowseOnly={false}
          vouchers={mockVouchers as any}
        />
      );

      // In selection mode: bottom CTA button should apply voucher selection rather than "Đặt món ngay"
      const bottomApplyButton = screen.queryByRole('button', { name: /Áp dụng/i });
      expect(bottomApplyButton).toBeInTheDocument();

      const browseOrderButton = screen.queryByRole('button', { name: /Đặt món ngay/i });
      expect(browseOrderButton).not.toBeInTheDocument();
    });

    it('evaluates to browse mode (isBrowseMode = true) when isBrowseOnly={true} even on /checkout', () => {
      mockPathname = '/checkout';

      render(
        <CouponModal
          isOpen={true}
          onClose={vi.fn()}
          subtotal={150000}
          isBrowseOnly={true}
          vouchers={mockVouchers as any}
        />
      );

      // In browse mode: bottom CTA renders "Đặt món ngay" linking to /product
      const browseOrderButton = screen.queryByRole('button', { name: /Đặt món ngay/i });
      expect(browseOrderButton).toBeInTheDocument();
    });

    it('renders voucher input with 16px typography (text-base font-sans h-11 px-4 rounded-full) to prevent iOS auto-zoom', () => {
      render(
        <CouponModal
          isOpen={true}
          onClose={vi.fn()}
          subtotal={150000}
          isBrowseOnly={false}
          vouchers={mockVouchers as any}
        />
      );

      const input = screen.getByPlaceholderText(/Nhập mã voucher/i);
      expect(input).toHaveClass('text-base', 'font-sans', 'h-11', 'px-4', 'rounded-full');
    });

    it('in campaign detail view: renders "Áp dụng ưu đãi này" when isBrowseOnly={false} and does not route to /product', () => {
      const mockCampaigns = [
        {
          id: 10,
          name: 'Giảm 10% Cho Đơn Từ 200k',
          discount_type: 'percent',
          discount_value: 10,
          min_order_value: 200000,
          start_at: '2026-01-01',
          end_at: '2026-12-31',
        },
      ];

      render(
        <CouponModal
          isOpen={true}
          onClose={vi.fn()}
          subtotal={250000}
          isBrowseOnly={false}
          campaigns={mockCampaigns as any}
        />
      );

      // Click on campaign terms link to open detail view
      const termsLink = screen.getByText(/Chi tiết điều kiện áp dụng/i);
      fireEvent.click(termsLink);

      // Bottom CTA should show "Áp dụng ưu đãi này"
      const applyBtn = screen.getByRole('button', { name: /Áp dụng ưu đãi này/i });
      expect(applyBtn).toBeInTheDocument();

      // Click CTA should close detail and not call router.push('/product')
      fireEvent.click(applyBtn);
      expect(mockPush).not.toHaveBeenCalledWith('/product');
    });

    it('in campaign detail view: renders "Bắt đầu đặt hàng" when isBrowseOnly={true} and routes to /product', () => {
      const mockCampaigns = [
        {
          id: 10,
          name: 'Giảm 10% Cho Đơn Từ 200k',
          discount_type: 'percent',
          discount_value: 10,
          min_order_value: 200000,
          start_at: '2026-01-01',
          end_at: '2026-12-31',
        },
      ];

      render(
        <CouponModal
          isOpen={true}
          onClose={vi.fn()}
          subtotal={250000}
          isBrowseOnly={true}
          campaigns={mockCampaigns as any}
        />
      );

      // Click on campaign to open detail view
      const campTitle = screen.getByText('Giảm 10% Cho Đơn Từ 200k');
      fireEvent.click(campTitle);

      // Bottom CTA should show "Bắt đầu đặt hàng"
      const startOrderBtn = screen.getByRole('button', { name: /Bắt đầu đặt hàng/i });
      expect(startOrderBtn).toBeInTheDocument();

      fireEvent.click(startOrderBtn);
      expect(mockPush).toHaveBeenCalledWith('/product');
    });
  });

  // =========================================================================
  // 3. ProductDetailsInfo & Desktop CartPopup Out-of-Stock UX
  // =========================================================================
  describe('3. ProductDetailsInfo & CartPopup Out-of-Stock Controls', () => {
    it('ProductDetailsInfo enables Add to Cart and Buy Now buttons when SKU is valid even if stock is 0', () => {
      const mockProductData: any = {
        id: 1,
        title: 'Cá Kho Tộ',
        description: 'Món cá kho thơm ngon',
        checkout: {
          productId: 1,
          productCode: 'CA-KHO-01',
          slug: 'ca-kho-to',
          categorySlug: 'mon-chinh',
        },
        images: [{ url: '/cakho.jpg' }],
        sizes: [
          {
            id: 11,
            title: 'Phần Nhỏ',
            code: 'CA-KHO-S',
            price: 70000,
            stock: 0, // Zero stock in KiotViet
          },
        ],
        infos: [],
      };

      render(<ProductDetailsInfo productData={mockProductData} />);

      // When SKU is valid, buttons are enabled
      const addBtn = screen.getByRole('button', { name: /Thêm vào giỏ/i });
      const buyBtn = screen.getByRole('button', { name: /Mua ngay/i });

      expect(addBtn).toBeEnabled();
      expect(buyBtn).toBeEnabled();
    });

    it('ProductDetailsInfo disables Add to Cart and Buy Now buttons with "Tạm hết" when SKU is empty', () => {
      const mockProductData: any = {
        id: 1,
        title: 'Cá Kho Tộ',
        description: 'Món cá kho thơm ngon',
        checkout: {
          productId: 1,
          productCode: '',
          slug: 'ca-kho-to',
          categorySlug: 'mon-chinh',
        },
        images: [{ url: '/cakho.jpg' }],
        sizes: [
          {
            id: 11,
            title: 'Phần Nhỏ',
            code: '', // Missing SKU in KiotViet
            price: 70000,
            stock: 10,
          },
        ],
        infos: [],
      };

      render(<ProductDetailsInfo productData={mockProductData} />);

      // Both buttons must be disabled and have "Tạm hết" or "Tạm hết hàng"
      const buttons = screen.getAllByRole('button');
      const outOfStockButtons = buttons.filter((btn) => btn.textContent?.includes('Tạm hết'));

      expect(outOfStockButtons.length).toBeGreaterThanOrEqual(2);
      outOfStockButtons.forEach((btn) => {
        expect(btn).toBeDisabled();
      });
    });

    it('CartPopup displays warning and disables Checkout when items are out of stock', () => {
      mockCartState = {
        cartItems: [
          {
            id: 'cart-1',
            productId: 1,
            productCode: 'OUT-SKU',
            title: 'Món Tạm Hết',
            variant: 'Tiêu chuẩn',
            unitPrice: 50000,
            quantity: 1,
            imageUrl: '/item.jpg',
            isOutOfStock: true,
          },
        ],
        subtotal: 0,
        hasOutOfStockItems: true,
        isCartOpen: true,
        totalItems: 1,
        addToCart: vi.fn(),
        removeFromCart: vi.fn(),
        updateQuantity: vi.fn(),
        clearCart: vi.fn(),
      };

      render(<CartPopup onClose={vi.fn()} />);

      // Warning text must be visible
      expect(
        screen.getByText(/Vui lòng xóa món tạm hết trước khi thanh toán/i)
      ).toBeInTheDocument();

      // Checkout button must be disabled
      const checkoutBtn = screen.getByRole('button', { name: /Thanh toán/i });
      expect(checkoutBtn).toBeDisabled();
    });
  });

  // =========================================================================
  // 4. MobileCartFlow Step 2 Parity (VoucherTicketBar, Address Book, Guest Banner)
  // =========================================================================
  describe('4. MobileCartFlow Step 2 Parity Features', () => {
    it('Step 2 renders VoucherTicketBar with action callbacks', async () => {
      render(<MobileCartFlow inline={true} />);

      await waitFor(() => {
        // VoucherTicketBar should be present in Step 2
        const ticketBar = screen.getByText(/Mã ưu đãi/i);
        expect(ticketBar).toBeInTheDocument();
      });
    });

    it('Step 2 loads and displays Saved Addresses dropdown for authenticated users', async () => {
      mockAuthUser = {
        id: 1,
        name: 'Nguyen Van A',
        phone: '0901234567',
        email: 'nguyenvana@example.com',
      };

      render(<MobileCartFlow inline={true} />);

      await waitFor(() => {
        const addressSelect = screen.getByTestId('customer-address-select');
        expect(addressSelect).toBeInTheDocument();
        expect(addressSelect).toHaveValue('10'); // Default address ID
      });
    });

    it('Step 2 displays GuestTierHintBanner when guest types phone with benefits', async () => {
      mockAuthUser = null;
      mockGuestHintResult = {
        tier: 'gold',
        discountPercent: 5,
        hasBenefit: true,
        isUpgradeCelebration: false,
      };

      const { container } = render(<MobileCartFlow inline={true} />);

      const phoneInput = container.querySelector('input[type="tel"]') as HTMLInputElement;
      expect(phoneInput).toBeInTheDocument();
      fireEvent.change(phoneInput, { target: { value: '0901234567' } });

      await waitFor(() => {
        expect(screen.getByText(/hạng/i)).toBeInTheDocument();
        expect(screen.getByText(/GOLD/i)).toBeInTheDocument();
      });
    });
  });

  // =========================================================================
  // 5. MobileCartFlow Step 1 & Step 2 Transition & OOS Parity
  // =========================================================================
  describe('5. MobileCartFlow Step 1 & Step 2 Transition and OOS Protection', () => {
    it('Step 1: disables "Thanh toán" button and shows warning when cart has out-of-stock items', () => {
      mockCartState = {
        ...mockCartState,
        cartItems: [
          {
            id: 'cart-oos',
            productId: 99,
            productCode: 'OOS-SKU',
            title: 'Món Tạm Hết',
            variant: 'Mặc định',
            unitPrice: 50000,
            quantity: 1,
            imageUrl: '/item.jpg',
            isOutOfStock: true,
          },
        ],
        hasOutOfStockItems: true,
        isCartOpen: true,
      };

      render(<MobileCartFlow inline={false} />);

      // Warning text is visible in Step 1
      expect(
        screen.getByText(/Vui lòng xóa sản phẩm \[Tạm hết hàng\] để tiếp tục đặt hàng/i)
      ).toBeInTheDocument();

      // Submit button is disabled
      const continueBtn = screen.getByRole('button', { name: /Thanh toán/i });
      expect(continueBtn).toBeDisabled();
    });

    it('Step 1 -> Step 2 transition: enables navigation and back button preserves flow', async () => {
      mockCartState = {
        ...mockCartState,
        cartItems: [
          {
            id: 'cart-ok',
            productId: 1,
            productCode: 'VALID-SKU',
            title: 'Món Có Sẵn',
            variant: 'Mặc định',
            unitPrice: 70000,
            quantity: 1,
            imageUrl: '/item.jpg',
            isOutOfStock: false,
          },
        ],
        hasOutOfStockItems: false,
        isCartOpen: true,
      };

      render(<MobileCartFlow inline={false} />);

      // In Step 1, Checkout button should be enabled
      const continueBtn = screen.getByRole('button', { name: /Thanh toán/i });
      expect(continueBtn).toBeEnabled();
      fireEvent.click(continueBtn);

      // Now in Step 2: customer info section is displayed
      await waitFor(() => {
        expect(screen.getByText(/Thông tin liên hệ/i)).toBeInTheDocument();
      });

      // Back button ← in header bar
      const backBtn = screen.getByRole('button', { name: /Thanh toán/i }); // header back button has aria-label t("title")
      expect(backBtn).toBeInTheDocument();
      fireEvent.click(backBtn);

      // Successfully transitions back to Step 1
      await waitFor(() => {
        expect(screen.getByText(/Tạm tính/i)).toBeInTheDocument();
      });
    });

    it('Step 2: disables place order button when isOutOfStockOverall is true', async () => {
      mockCartState = {
        ...mockCartState,
        cartItems: [
          {
            id: 'cart-oos-step2',
            productId: 99,
            productCode: 'OOS-SKU',
            title: 'Món Tạm Hết',
            variant: 'Mặc định',
            unitPrice: 50000,
            quantity: 1,
            imageUrl: '/item.jpg',
            isOutOfStock: true,
          },
        ],
        hasOutOfStockItems: true,
      };

      render(<MobileCartFlow inline={true} />);

      await waitFor(() => {
        // Warning must be displayed
        expect(
          screen.getByText(/Vui lòng xóa sản phẩm \[Tạm hết hàng\] để tiếp tục đặt hàng/i)
        ).toBeInTheDocument();

        // Place order button should be disabled
        const orderBtn = screen.getByRole('button', { name: /^(Đặt hàng|Đặt trước)$/i });
        expect(orderBtn).toBeDisabled();
      });
    });
  });
});
