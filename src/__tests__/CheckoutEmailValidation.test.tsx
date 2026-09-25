import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import '@testing-library/jest-dom';
import React from 'react';

import CheckoutForm from '@/components/Checkout/CheckoutForm';
import MobileCartFlow from '@/components/Header/MobileCartFlow';
import viMessages from '@/i18n/locales/vi.json';
import enMessages from '@/i18n/locales/en.json';
import type { CheckoutConfig } from '@/services/orderService';

// --- Hoisted mock definitions for vi.mock factories ---
const {
  mockAdministrativeUnits,
  mockCalculateShippingFee,
  mockCreateOrder,
  mockPush,
} = vi.hoisted(() => {
  return {
    mockAdministrativeUnits: [
      {
        id: 'P01',
        name: 'TP. Hồ Chí Minh',
        wards: [
          { id: 'W001', name: 'Tân Sơn Nhất', district: 'Tân Bình' },
          { id: 'W002', name: 'Võ Thị Sáu', district: 'Quận 3' },
        ],
      },
    ],
    mockCalculateShippingFee: vi.fn().mockResolvedValue({
      shipping_fee: 25000,
      original_fee: 25000,
      is_freeship: false,
      is_deliverable: true,
      message: null,
      branch_name: 'Chi nhánh Tân Bình',
    }),
    mockCreateOrder: vi.fn().mockResolvedValue({
      data: {
        order_code: 'ORD-TEST-EMAIL-001',
        status: 'pending',
        payment_status: 'pending',
        subtotal: '150000',
        total: '175000',
        delivery_price: '25000',
      },
    }),
    mockPush: vi.fn(),
  };
});

// --- Mock next/image ---
vi.mock('next/image', () => ({
  default: (props: any) => <img {...props} />,
}));

// --- Mock routing ---
vi.mock('@/i18n/routing', () => ({
  usePathname: () => '/checkout',
  useRouter: () => ({ push: mockPush, replace: vi.fn() }),
  Link: ({ children, href, className }: any) => (
    <a href={href} className={className}>
      {children}
    </a>
  ),
}));

// --- Mock next-intl ---
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
}));

// --- Mock User & Auth ---
let mockUser: any = null;
let mockToken: string | null = null;

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: mockUser, token: mockToken, refreshUser: vi.fn() }),
  getMemberTier: () => ({ tier: 'member', name: 'Member', discountPercent: 0, label: '' }),
  calculateMemberDiscount: () => 0,
}));

// --- Mock CartContext ---
const mockCartItems = [
  {
    productId: 1,
    name: 'Cơm Thố Xá Xíu',
    unitPrice: 75000,
    originalPrice: 75000,
    quantity: 2,
    image: '/images/xaxiu.jpg',
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

// --- Mock BranchContext ---
vi.mock('@/contexts/BranchContext', () => ({
  useBranches: () => ({
    branches: [
      {
        id: 1,
        branchName: 'Chi nhánh Tân Bình',
        address: '64 Út Tịch, P.4, Tân Bình',
        contactNumber: '0901234567',
        isActive: true,
      },
    ],
    selectedBranchId: 1,
    setSelectedBranchId: vi.fn(),
  }),
}));

// --- Mock Service APIs ---
vi.mock('@/services/campaignService', () => ({
  getActiveCampaigns: vi.fn().mockResolvedValue([]),
}));

vi.mock('@/services/authService', async () => {
  const actual = await vi.importActual<typeof import('@/services/authService')>(
    '@/services/authService'
  );
  return {
    ...actual,
    getCustomerAddressesApi: vi.fn().mockResolvedValue([]),
    getCachedCustomerAddresses: vi.fn().mockReturnValue([]),
  };
});

vi.mock('@/services/generalSettingService', () => ({
  getGeneralSettings: vi.fn().mockResolvedValue({ hotline: '024.9999.7122' }),
}));

vi.mock('@/services/orderService', async () => {
  const actual = await vi.importActual<typeof import('@/services/orderService')>(
    '@/services/orderService'
  );
  return {
    ...actual,
    getCheckoutConfig: vi.fn().mockResolvedValue({
      operating_hours: { store_open: '00:00', store_close: '23:59' },
      branches: [
        {
          id: 1,
          branchName: 'Chi nhánh Tân Bình',
          address: '64 Út Tịch, P.4, Tân Bình',
          contactNumber: '0901234567',
          isActive: true,
        },
      ],
      default_shipping_fee: '25000',
      active_promotions: [],
    } as unknown as CheckoutConfig),
    getAvailableVouchers: vi.fn().mockResolvedValue([]),
    getShippingSettings: vi.fn().mockResolvedValue(null),
    getGeneralSettings: vi.fn().mockResolvedValue({ hotline: '024.9999.7122' }),
    getAdministrativeUnits: vi.fn().mockResolvedValue(mockAdministrativeUnits),
    calculateShippingFee: (...args: any[]) => mockCalculateShippingFee(...args),
    createOrder: (...args: any[]) => mockCreateOrder(...args),
  };
});

const mockConfigData: CheckoutConfig = {
  operating_hours: { store_open: '00:00', store_close: '23:59' },
  branches: [
    {
      id: 1,
      branchName: 'Chi nhánh Tân Bình',
      address: '64 Út Tịch, P.4, Tân Bình',
      contactNumber: '0901234567',
      isActive: true,
    },
  ],
  default_shipping_fee: '25000',
  active_promotions: [],
} as unknown as CheckoutConfig;

describe('Checkout Email Validation & UI Audit Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUser = null;
    mockToken = null;
    if (typeof localStorage !== 'undefined') {
      localStorage.clear();
    }
  });

  // =========================================================================
  // 1. KIỂM THỬ BẢN DỊCH I18N (vi.json & en.json)
  // =========================================================================
  describe('1. i18n Translation Audit (checkout.email_placeholder & email_label)', () => {
    it('vi.json: email_placeholder phải là "Email", tuyệt đối không còn chữ "(Không bắt buộc)"', () => {
      const emailPlaceholder = (viMessages as any).checkout?.email_placeholder;
      expect(emailPlaceholder).toBe('Email');
      expect(emailPlaceholder).not.toContain('(Không bắt buộc)');
      expect(emailPlaceholder).not.toContain('tùy chọn');
    });

    it('en.json: email_placeholder phải là "Email", tuyệt đối không còn chữ "(Optional)"', () => {
      const emailPlaceholder = (enMessages as any).checkout?.email_placeholder;
      expect(emailPlaceholder).toBe('Email');
      expect(emailPlaceholder).not.toContain('(Optional)');
      expect(emailPlaceholder).not.toContain('optional');
      expect(emailPlaceholder).not.toContain('(Không bắt buộc)');
    });

    it('vi.json & en.json: email_label phải là "Email"', () => {
      expect((viMessages as any).checkout?.email_label).toBe('Email');
      expect((enMessages as any).checkout?.email_label).toBe('Email');
    });
  });

  // =========================================================================
  // 2. KIỂM THỬ DESKTOP FORM (CheckoutForm.tsx)
  // =========================================================================
  describe('2. Desktop Form (CheckoutForm.tsx) Email Field & Validation', () => {
    it('Nhãn Email hiển thị dấu * màu đỏ (RequiredMark)', async () => {
      const { container } = render(<CheckoutForm order={null} config={mockConfigData} />);
      const desktopForm = container.querySelector('form')!;
      expect(desktopForm).toBeInTheDocument();

      const emailInput = desktopForm.querySelector('input[type="email"]') as HTMLInputElement;
      expect(emailInput).toBeInTheDocument();

      const emailLabel = emailInput.closest('.space-y-2')?.querySelector('label');
      expect(emailLabel).toBeInTheDocument();
      expect(emailLabel?.textContent).toContain('Email');
      expect(emailLabel?.textContent).toContain('*');

      // Kiểm tra dấu * màu đỏ từ RequiredMark
      const requiredStar = emailLabel?.querySelector('.text-red-600');
      expect(requiredStar).toBeInTheDocument();
      expect(requiredStar?.textContent?.trim()).toBe('*');
    });

    it('Input Email có thuộc tính required và placeholder là "Email"', async () => {
      const { container } = render(<CheckoutForm order={null} config={mockConfigData} />);
      const desktopForm = container.querySelector('form')!;
      const emailInput = desktopForm.querySelector('input[type="email"]') as HTMLInputElement;

      expect(emailInput).toBeRequired();
      expect(emailInput).toHaveAttribute('placeholder', 'Email');
      expect(emailInput.type).toBe('email');
    });

    it('Validation on blur: để trống báo "Vui lòng nhập địa chỉ email."', async () => {
      const { container } = render(<CheckoutForm order={null} config={mockConfigData} />);
      const desktopForm = container.querySelector('form')!;
      const emailInput = desktopForm.querySelector('input[type="email"]') as HTMLInputElement;

      // Blur khi trường đang trống
      fireEvent.focus(emailInput);
      fireEvent.blur(emailInput);

      await waitFor(() => {
        expect(desktopForm).toHaveTextContent('Vui lòng nhập địa chỉ email.');
      });
    });

    it('Validation on change/blur: sai định dạng báo "Email không hợp lệ. Vui lòng kiểm tra lại."', async () => {
      const { container } = render(<CheckoutForm order={null} config={mockConfigData} />);
      const desktopForm = container.querySelector('form')!;
      const emailInput = desktopForm.querySelector('input[type="email"]') as HTMLInputElement;

      // Nhập email sai định dạng (thiếu @ và domain)
      fireEvent.change(emailInput, { target: { value: 'invalid-email-address' } });
      fireEvent.blur(emailInput);

      await waitFor(() => {
        expect(desktopForm).toHaveTextContent('Email không hợp lệ. Vui lòng kiểm tra lại.');
      });

      // Nhập email thiếu TLD (ví dụ: test@domain)
      fireEvent.change(emailInput, { target: { value: 'user@domain' } });
      fireEvent.blur(emailInput);

      await waitFor(() => {
        expect(desktopForm).toHaveTextContent('Email không hợp lệ. Vui lòng kiểm tra lại.');
      });
    });

    it('Validation: khi nhập email hợp lệ thì không còn thông báo lỗi', async () => {
      const { container } = render(<CheckoutForm order={null} config={mockConfigData} />);
      const desktopForm = container.querySelector('form')!;
      const emailInput = desktopForm.querySelector('input[type="email"]') as HTMLInputElement;

      // Tạo lỗi trước
      fireEvent.change(emailInput, { target: { value: 'invalid-email' } });
      fireEvent.blur(emailInput);
      await waitFor(() => {
        expect(desktopForm).toHaveTextContent('Email không hợp lệ. Vui lòng kiểm tra lại.');
      });

      // Sửa lại thành email hợp lệ
      fireEvent.change(emailInput, { target: { value: 'customer@cothaotomca.vn' } });
      fireEvent.blur(emailInput);

      await waitFor(() => {
        expect(desktopForm).not.toHaveTextContent('Email không hợp lệ. Vui lòng kiểm tra lại.');
        expect(desktopForm).not.toHaveTextContent('Vui lòng nhập địa chỉ email.');
      });
    });

    it('Submit form: chặn và hiển thị lỗi email nếu để trống khi gửi đơn', async () => {
      const { container } = render(<CheckoutForm order={null} config={mockConfigData} />);
      const desktopForm = container.querySelector('form')!;

      // Tích chọn xác nhận thông tin để nút Đặt hàng có thể click
      const confirmCheckbox = screen.getByTestId('desktop-confirm-checkbox');
      fireEvent.click(confirmCheckbox);

      // Click nút submit Đặt hàng
      const submitBtn = screen.getByTestId('checkout-submit-btn');
      fireEvent.click(submitBtn);

      await waitFor(() => {
        expect(desktopForm).toHaveTextContent('Vui lòng nhập địa chỉ email.');
      });
      // Đơn hàng KHÔNG được gửi đi
      expect(mockCreateOrder).not.toHaveBeenCalled();
    });

    it('Submit form: chặn và hiển thị lỗi nếu email sai định dạng khi gửi đơn', async () => {
      const { container } = render(<CheckoutForm order={null} config={mockConfigData} />);
      const desktopForm = container.querySelector('form')!;
      const emailInput = desktopForm.querySelector('input[type="email"]') as HTMLInputElement;

      // Điền email sai định dạng
      fireEvent.change(emailInput, { target: { value: 'user@bad' } });

      const confirmCheckbox = screen.getByTestId('desktop-confirm-checkbox');
      fireEvent.click(confirmCheckbox);

      const submitBtn = screen.getByTestId('checkout-submit-btn');
      fireEvent.click(submitBtn);

      await waitFor(() => {
        expect(desktopForm).toHaveTextContent('Email không hợp lệ. Vui lòng kiểm tra lại.');
      });
      expect(mockCreateOrder).not.toHaveBeenCalled();
    });
  });

  // =========================================================================
  // 3. KIỂM THỬ MOBILE FORM (MobileCartFlow.tsx)
  // =========================================================================
  describe('3. Mobile Form (MobileCartFlow.tsx) Email Field & Validation', () => {
    it('Nhãn Email hiển thị dấu * màu đỏ (RequiredMark)', async () => {
      const { container } = render(<MobileCartFlow inline={true} />);

      const emailInput = container.querySelector('input[type="email"]') as HTMLInputElement;
      expect(emailInput).toBeInTheDocument();

      const emailLabel = emailInput.closest('.space-y-3')?.querySelector('label');
      expect(emailLabel).toBeInTheDocument();
      expect(emailLabel?.textContent).toContain('Email');
      expect(emailLabel?.textContent).toContain('*');

      // Kiểm tra dấu * màu đỏ từ RequiredMark
      const requiredStar = emailLabel?.querySelector('.text-red-600');
      expect(requiredStar).toBeInTheDocument();
      expect(requiredStar?.textContent?.trim()).toBe('*');
    });

    it('Input Email có thuộc tính required và placeholder là "Email"', async () => {
      const { container } = render(<MobileCartFlow inline={true} />);
      const emailInput = container.querySelector('input[type="email"]') as HTMLInputElement;

      expect(emailInput).toBeRequired();
      expect(emailInput).toHaveAttribute('placeholder', 'Email');
      expect(emailInput.type).toBe('email');
    });

    it('Validation on submit: bắt buộc nhập email (báo "Vui lòng nhập địa chỉ email.")', async () => {
      const { container } = render(<MobileCartFlow inline={true} />);

      // Điền họ tên và số điện thoại hợp lệ để vượt qua bước validate trước email
      const nameInput = screen.getByPlaceholderText('Họ và tên');
      fireEvent.change(nameInput, { target: { value: 'Trần Thị B' } });

      const phoneInput = screen.getByPlaceholderText('Số điện thoại');
      fireEvent.change(phoneInput, { target: { value: '0987654321' } });

      // Để trống email và nhấn nút Đặt hàng
      const submitBtn = screen.getByRole('button', { name: /(Đặt hàng|Lên lịch giao hàng)/i });
      fireEvent.click(submitBtn);

      await waitFor(() => {
        expect(container).toHaveTextContent('Vui lòng nhập địa chỉ email.');
      });
      expect(mockCreateOrder).not.toHaveBeenCalled();
    });

    it('Validation on submit: kiểm tra định dạng email (báo "Email không hợp lệ. Vui lòng kiểm tra lại.")', async () => {
      const { container } = render(<MobileCartFlow inline={true} />);

      const nameInput = screen.getByPlaceholderText('Họ và tên');
      fireEvent.change(nameInput, { target: { value: 'Trần Thị B' } });

      const phoneInput = screen.getByPlaceholderText('Số điện thoại');
      fireEvent.change(phoneInput, { target: { value: '0987654321' } });

      // Nhập email không hợp lệ
      const emailInput = container.querySelector('input[type="email"]') as HTMLInputElement;
      fireEvent.change(emailInput, { target: { value: 'invalid-email-format' } });

      const submitBtn = screen.getByRole('button', { name: /(Đặt hàng|Lên lịch giao hàng)/i });
      fireEvent.click(submitBtn);

      await waitFor(() => {
        expect(container).toHaveTextContent('Email không hợp lệ. Vui lòng kiểm tra lại.');
      });
      expect(mockCreateOrder).not.toHaveBeenCalled();
    });

    it('Khi nhập lại email hợp lệ thì lỗi biến mất', async () => {
      const { container } = render(<MobileCartFlow inline={true} />);

      const nameInput = screen.getByPlaceholderText('Họ và tên');
      fireEvent.change(nameInput, { target: { value: 'Trần Thị B' } });

      const phoneInput = screen.getByPlaceholderText('Số điện thoại');
      fireEvent.change(phoneInput, { target: { value: '0987654321' } });

      const emailInput = container.querySelector('input[type="email"]') as HTMLInputElement;
      fireEvent.change(emailInput, { target: { value: 'bad-email' } });

      const submitBtn = screen.getByRole('button', { name: /(Đặt hàng|Lên lịch giao hàng)/i });
      fireEvent.click(submitBtn);

      await waitFor(() => {
        expect(container).toHaveTextContent('Email không hợp lệ. Vui lòng kiểm tra lại.');
      });

      // Nhập email hợp lệ -> onChange tự động xóa lỗi
      fireEvent.change(emailInput, { target: { value: 'valid.email@domain.com' } });

      await waitFor(() => {
        expect(container).not.toHaveTextContent('Email không hợp lệ. Vui lòng kiểm tra lại.');
        expect(container).not.toHaveTextContent('Vui lòng nhập địa chỉ email.');
      });
    });
  });

  // =========================================================================
  // 4. KIỂM THỬ ĐỘC LẬP LOGIC REGEX EMAIL (Email Regex & Validation Rule)
  // =========================================================================
  describe('4. Email Regex & Validation Logic Matrix', () => {
    const validateEmail = (val: string): string | null => {
      const clean = val.trim();
      if (!clean) return 'Vui lòng nhập địa chỉ email.';
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(clean)) {
        return 'Email không hợp lệ. Vui lòng kiểm tra lại.';
      }
      return null;
    };

    it('Chuỗi rỗng hoặc chỉ khoảng trắng -> Vui lòng nhập địa chỉ email.', () => {
      expect(validateEmail('')).toBe('Vui lòng nhập địa chỉ email.');
      expect(validateEmail('   ')).toBe('Vui lòng nhập địa chỉ email.');
      expect(validateEmail('\t\n')).toBe('Vui lòng nhập địa chỉ email.');
    });

    it('Các định dạng sai -> Email không hợp lệ. Vui lòng kiểm tra lại.', () => {
      const invalidEmails = [
        'plainaddress',
        '@example.com',
        'email.example.com',
        'email@example@example.com',
        'email@example',
        'email with spaces@example.com',
        'email@example .com',
        'email@',
      ];
      for (const email of invalidEmails) {
        expect(validateEmail(email)).toBe('Email không hợp lệ. Vui lòng kiểm tra lại.');
      }
    });

    it('Các định dạng email hợp lệ -> null (không có lỗi)', () => {
      const validEmails = [
        'email@example.com',
        'firstname.lastname@example.com',
        'email@subdomain.example.com',
        'firstname+lastname@example.com',
        '1234567890@example.com',
        'email@example-one.com',
        '_______@example.com',
        'email@example.name',
        'email@example.museum',
        'email@example.co.jp',
        'firstname-lastname@example.com',
      ];
      for (const email of validEmails) {
        expect(validateEmail(email)).toBeNull();
      }
    });
  });
});
