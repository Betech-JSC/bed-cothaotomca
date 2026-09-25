import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import '@testing-library/jest-dom';
import CheckoutForm from '@/components/Checkout/CheckoutForm';
import { getCustomerAddressesApi, type CustomerAddress } from '@/services/authService';
import type { CheckoutConfig } from '@/services/orderService';
import viMessages from '@/i18n/locales/vi.json';

// --- Mock routing ---
vi.mock('@/i18n/routing', () => ({
  usePathname: () => '/checkout',
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
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
let mockUser: any = {
  id: 101,
  name: 'Quỳnh Giang Nguyễn',
  phone: '0967442341',
  email: 'giang@example.com',
};
let mockToken: string | null = 'mock-token';

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

// Mock orderService & authService
const mockSavedAddresses: CustomerAddress[] = [
  {
    id: 1,
    recipient_name: 'Quỳnh Giang Nguyễn',
    phone: '0967442341',
    province: 'TP. Hồ Chí Minh',
    district: 'Tân Bình',
    ward: 'Tân Sơn Nhất',
    ward_id: 'W001',
    street_address: '64 út tịch',
    full_address: '64 út tịch, Tân Sơn Nhất, Tân Bình, TP. Hồ Chí Minh',
    is_default: true,
  },
  {
    id: 2,
    recipient_name: 'Nguyễn Văn A',
    phone: '0988776655',
    province: 'TP. Hồ Chí Minh',
    district: 'Quận 3',
    ward: 'Võ Thị Sáu',
    ward_id: 'W002',
    street_address: '123 Cách Mạng Tháng 8',
    full_address: '123 Cách Mạng Tháng 8, Võ Thị Sáu, Quận 3, TP. Hồ Chí Minh',
    is_default: false,
  },
];

const mockCalculateShippingFee = vi.fn().mockResolvedValue({
  shipping_fee: 25000,
  original_fee: 25000,
  is_freeship: false,
  is_deliverable: true,
  message: null,
  branch_name: 'Chi nhánh Tân Bình',
});

const mockCreateOrder = vi.fn().mockResolvedValue({
  data: {
    order_code: 'ORD-TEST-001',
    status: 'pending',
    payment_status: 'pending',
    subtotal: '150000',
    total: '175000',
    delivery_price: '25000',
    expire_at: '2026-09-25T15:00:00Z',
    qr_url: 'https://example.com/qr.png',
    qr_info: {
      bank_code: 'MB',
      bank_account: '0123456789',
      amount: 175000,
      content: 'TCTM ORD-TEST-001',
    },
  },
});

vi.mock('@/services/campaignService', () => ({
  getActiveCampaigns: vi.fn().mockResolvedValue([]),
}));

vi.mock('@/services/authService', async () => {
  const actual = await vi.importActual<typeof import('@/services/authService')>(
    '@/services/authService'
  );
  return {
    ...actual,
    getCustomerAddressesApi: vi.fn().mockImplementation(() => Promise.resolve(mockSavedAddresses)),
  };
});

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
    } as unknown as CheckoutConfig),
    getAvailableVouchers: vi.fn().mockResolvedValue([]),
    getShippingSettings: vi.fn().mockResolvedValue(null),
    getGeneralSettings: vi.fn().mockResolvedValue({ hotline: '024.9999.7122' }),
    getAdministrativeUnits: vi.fn().mockResolvedValue([
      {
        id: 'P01',
        name: 'TP. Hồ Chí Minh',
        wards: [
          { id: 'W001', name: 'Tân Sơn Nhất', district: 'Tân Bình' },
          { id: 'W002', name: 'Võ Thị Sáu', district: 'Quận 3' },
          { id: 'W003', name: 'An Hội Tây', district: 'Gò Vấp' },
        ],
      },
    ]),
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

describe('Checkout Saved Address Selection & Conditional Rendering Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    if (typeof localStorage !== 'undefined') {
      localStorage.clear();
    }
    mockUser = {
      id: 101,
      name: 'Quỳnh Giang Nguyễn',
      phone: '0967442341',
      email: 'giang@example.com',
    };
    mockToken = 'mock-token';
  });

  it('1. Tự động chọn địa chỉ mặc định, ẩn các ô input địa chỉ và hiển thị tóm tắt địa chỉ', async () => {
    render(<CheckoutForm order={null} config={mockConfigData} />);

    // Chờ load thông tin địa chỉ đã lưu
    await waitFor(() => {
      expect(screen.getByText('Chọn từ danh sách địa chỉ')).toBeInTheDocument();
    });

    // Dropdown địa chỉ hiển thị đúng địa chỉ mặc định
    const select = screen.getByTestId('customer-address-select') as HTMLSelectElement;
    expect(select.value).toBe('1');

    // Tóm tắt địa chỉ được hiển thị gọn gàng
    expect(screen.getByText('Quỳnh Giang Nguyễn')).toBeInTheDocument();
    expect(screen.getByText('0967442341')).toBeInTheDocument();
    expect(screen.getByText('Mặc định')).toBeInTheDocument();
    expect(
      screen.getByText('64 út tịch, Tân Sơn Nhất, Tân Bình, TP. Hồ Chí Minh')
    ).toBeInTheDocument();

    // Các ô input nhập địa chỉ mới (Tỉnh/Thành, Phường/Xã, Số nhà) PHẢI BỊ ẨN
    expect(screen.queryByTestId('desktop-street-address-input')).not.toBeInTheDocument();
    expect(
      screen.queryByText('Lưu địa chỉ này vào danh sách địa chỉ')
    ).not.toBeInTheDocument();
  });

  it('2. Khi chọn "+ Nhập địa chỉ nhận hàng khác", form nhập địa chỉ mới xổ ra và các trường được reset trống', async () => {
    render(<CheckoutForm order={null} config={mockConfigData} />);

    await waitFor(() => {
      expect(screen.getByText('Chọn từ danh sách địa chỉ')).toBeInTheDocument();
    });

    const select = screen.getByTestId('customer-address-select') as HTMLSelectElement;

    // Chọn "+ Nhập địa chỉ nhận hàng khác"
    fireEvent.change(select, { target: { value: 'new' } });

    // Lúc này các ô input nhập địa chỉ mới phải XUẤT HIỆN
    await waitFor(() => {
      expect(screen.getByTestId('desktop-street-address-input')).toBeInTheDocument();
    });

    const streetInput = screen.getByTestId('desktop-street-address-input') as HTMLInputElement;
    // Kiểm tra form nhập mới phải trống (clear các trường của địa chỉ mặc định cũ)
    expect(streetInput.value).toBe('');

    // Checkbox lưu địa chỉ nhận hàng xuất hiện
    expect(screen.getByText('Lưu địa chỉ này vào danh sách địa chỉ')).toBeInTheDocument();

    // Header "Điền thông tin địa chỉ nhận hàng mới" xuất hiện
    expect(screen.getByText('Điền thông tin địa chỉ nhận hàng mới')).toBeInTheDocument();
  });

  it('3. Hỗ trợ nút "X" / xóa nhanh khi nhập số nhà tên đường', async () => {
    render(<CheckoutForm order={null} config={mockConfigData} />);

    await waitFor(() => {
      expect(screen.getByText('Chọn từ danh sách địa chỉ')).toBeInTheDocument();
    });

    const select = screen.getByTestId('customer-address-select') as HTMLSelectElement;
    fireEvent.change(select, { target: { value: 'new' } });

    await waitFor(() => {
      expect(screen.getByTestId('desktop-street-address-input')).toBeInTheDocument();
    });

    const streetInput = screen.getByTestId('desktop-street-address-input') as HTMLInputElement;

    // Gõ địa chỉ vào ô input
    fireEvent.change(streetInput, { target: { value: 'Số 102 Lê Lai' } });
    expect(streetInput.value).toBe('Số 102 Lê Lai');

    // Nút xóa nhanh "✕" xuất hiện
    const clearBtn = screen.getByRole('button', { name: 'Xóa nội dung số nhà, tên đường' });
    expect(clearBtn).toBeInTheDocument();

    // Bấm nút xóa nhanh
    fireEvent.click(clearBtn);

    // Ô input được xóa sạch
    expect(streetInput.value).toBe('');
  });

  it('4. Chuyển lại địa chỉ đã lưu thì các ô input ẩn đi và thông tin địa chỉ cập nhật lại', async () => {
    render(<CheckoutForm order={null} config={mockConfigData} />);

    await waitFor(() => {
      expect(screen.getByText('Chọn từ danh sách địa chỉ')).toBeInTheDocument();
    });

    const select = screen.getByTestId('customer-address-select') as HTMLSelectElement;

    // Chuyển sang "new"
    fireEvent.change(select, { target: { value: 'new' } });
    expect(screen.getByTestId('desktop-street-address-input')).toBeInTheDocument();

    // Chuyển sang địa chỉ thứ 2 trong sổ
    fireEvent.change(select, { target: { value: '2' } });

    // Các ô input lập tức ẩn đi
    expect(screen.queryByTestId('desktop-street-address-input')).not.toBeInTheDocument();

    // Tóm tắt địa chỉ hiển thị thông tin địa chỉ 2
    expect(screen.getByText('Nguyễn Văn A')).toBeInTheDocument();
    expect(screen.getByText('0988776655')).toBeInTheDocument();
    expect(
      screen.getByText('123 Cách Mạng Tháng 8, Võ Thị Sáu, Quận 3, TP. Hồ Chí Minh')
    ).toBeInTheDocument();
  });

  it('5. Submit đơn khi chọn địa chỉ đã lưu gửi đúng dữ liệu địa chỉ đã lưu', async () => {
    render(<CheckoutForm order={null} config={mockConfigData} />);

    await waitFor(() => {
      expect(screen.getByText('Chọn từ danh sách địa chỉ')).toBeInTheDocument();
    });

    // Checkbox xác nhận thông tin
    const confirmCheckbox = screen.getByTestId('desktop-confirm-checkbox');
    fireEvent.click(confirmCheckbox);

    // Bấm đặt món
    const submitBtn = screen.getByTestId('checkout-submit-btn');
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(mockCreateOrder).toHaveBeenCalledTimes(1);
    });

    const payload = mockCreateOrder.mock.calls[0][0];
    expect(payload.delivery_type).toBe('delivery');
    expect(payload.customer.name).toBe('Quỳnh Giang Nguyễn');
    expect(payload.customer.phone).toBe('0967442341');
    expect(payload.delivery.receiver).toBe('Quỳnh Giang Nguyễn');
    expect(payload.delivery.contact_number).toBe('0967442341');
    expect(payload.delivery.address).toBe('64 út tịch, Tân Sơn Nhất, Tân Bình, TP. Hồ Chí Minh');
    expect(payload.delivery.province).toBe('TP. Hồ Chí Minh');
    expect(payload.delivery.district).toBe('Tân Bình');
    expect(payload.delivery.ward).toBe('Tân Sơn Nhất');
    expect(payload.delivery.ward_id).toBe('W001');
  });

  it('6. Khi chọn nhập địa chỉ khác, validate bắt buộc nhập và submit gửi đúng dữ liệu mới nhập', async () => {
    render(<CheckoutForm order={null} config={mockConfigData} />);

    await waitFor(() => {
      expect(screen.getByText('Chọn từ danh sách địa chỉ')).toBeInTheDocument();
    });

    const select = screen.getByTestId('customer-address-select') as HTMLSelectElement;
    fireEvent.change(select, { target: { value: 'new' } });

    await waitFor(() => {
      expect(screen.getByTestId('desktop-street-address-input')).toBeInTheDocument();
    });

    const confirmCheckbox = screen.getByTestId('desktop-confirm-checkbox');
    fireEvent.click(confirmCheckbox);

    // Bấm đặt món khi chưa nhập địa chỉ mới -> báo lỗi validation
    const submitBtn = screen.getByTestId('checkout-submit-btn');
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByText(/Vui lòng nhập số nhà và tên đường/i)).toBeInTheDocument();
    });
    expect(mockCreateOrder).not.toHaveBeenCalled();

    // Nhập số nhà tên đường mới
    const streetInput = screen.getByTestId('desktop-street-address-input');
    fireEvent.change(streetInput, { target: { value: '99 Quang Trung' } });

    // Chọn phường xã mới (trên desktop form)
    const wardInputs = screen.getAllByPlaceholderText(/-- Gõ hoặc chọn Phường \/ Xã/i);
    const wardInput = wardInputs[wardInputs.length - 1];
    fireEvent.focus(wardInput);
    fireEvent.change(wardInput, { target: { value: 'An Hội Tây' } });

    await waitFor(() => {
      expect(screen.getByText(/An Hội Tây/i)).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText(/An Hội Tây/i));

    // Submit lại
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(mockCreateOrder).toHaveBeenCalledTimes(1);
    });

    const payload = mockCreateOrder.mock.calls[0][0];
    expect(payload.delivery.address).toContain('99 Quang Trung');
    expect(payload.delivery.address).toContain('An Hội Tây');
    expect(payload.delivery.ward).toBe('An Hội Tây');
    expect(payload.delivery.ward_id).toBe('W003');
  });

  it('7. Khi đang load địa chỉ của khách hàng đã đăng nhập: hiển thị Skeleton loading và TUYỆT ĐỐI KHÔNG chớp tắt các ô input nhập tay (chống giật layout)', async () => {
    let resolveAddresses: (value: CustomerAddress[]) => void = () => { };
    const pendingPromise = new Promise<CustomerAddress[]>((resolve) => {
      resolveAddresses = resolve;
    });

    vi.mocked(getCustomerAddressesApi).mockImplementationOnce(() => pendingPromise);

    render(<CheckoutForm order={null} config={mockConfigData} />);

    // 1. Phải hiển thị Skeleton Loader ngay lập tức
    expect(screen.getByTestId('address-book-skeleton')).toBeInTheDocument();
    expect(screen.getByText(/Đang tải danh sách địa chỉ/i)).toBeInTheDocument();
    expect(screen.getByText(/Vui lòng chờ/i)).toBeInTheDocument();

    // 2. TUYỆT ĐỐI KHÔNG được hiển thị các ô input nhập tay trong lúc đang tải
    expect(screen.queryByTestId('desktop-street-address-input')).not.toBeInTheDocument();
    expect(screen.queryByTestId('customer-address-select')).not.toBeInTheDocument();

    // 3. Giải quyết promise hoàn thành tải địa chỉ
    resolveAddresses(mockSavedAddresses);

    // 4. Skeleton biến mất, dropdown và tóm tắt địa chỉ xuất hiện
    await waitFor(() => {
      expect(screen.queryByTestId('address-book-skeleton')).not.toBeInTheDocument();
    });
    expect(screen.getByTestId('customer-address-select')).toBeInTheDocument();
    expect(screen.getByText('Quỳnh Giang Nguyễn')).toBeInTheDocument();
    expect(screen.getByText('Mặc định')).toBeInTheDocument();
  });

  it('8. Khi khách hàng vãng lai (chưa đăng nhập): hiển thị ngay form nhập tay lập tức, không hiển thị Skeleton', async () => {
    mockUser = null;
    mockToken = null;

    render(<CheckoutForm order={null} config={mockConfigData} />);

    // Khách vãng lai: không có skeleton
    expect(screen.queryByTestId('address-book-skeleton')).not.toBeInTheDocument();
    expect(screen.queryByTestId('customer-address-select')).not.toBeInTheDocument();

    // Các ô input nhập tay hiển thị ngay lập tức
    expect(screen.getByTestId('desktop-street-address-input')).toBeInTheDocument();
  });

  it('9. Khi có địa chỉ trong localStorage cache: hiển thị ngay lập tức không cần chờ API (Optimistic UX / Stale-While-Revalidate)', async () => {
    // Đặt cache sẵn trong localStorage
    localStorage.setItem('cothaotomca_cached_customer_addresses', JSON.stringify(mockSavedAddresses));

    // Làm cho API mất thời gian trả về
    let resolveApi: (value: CustomerAddress[]) => void = () => { };
    const slowApiPromise = new Promise<CustomerAddress[]>((resolve) => {
      resolveApi = resolve;
    });
    vi.mocked(getCustomerAddressesApi).mockImplementationOnce(() => slowApiPromise);

    render(<CheckoutForm order={null} config={mockConfigData} />);

    // Nhờ có cache, dropdown và tóm tắt địa chỉ hiển thị TỨC THÌ (zero wait time, không bị skeleton)
    expect(screen.queryByTestId('address-book-skeleton')).not.toBeInTheDocument();
    expect(screen.getByTestId('customer-address-select')).toBeInTheDocument();
    const select = screen.getByTestId('customer-address-select') as HTMLSelectElement;
    expect(select.value).toBe('1');
    expect(screen.getByText('Quỳnh Giang Nguyễn')).toBeInTheDocument();
    expect(screen.getByText('64 út tịch, Tân Sơn Nhất, Tân Bình, TP. Hồ Chí Minh')).toBeInTheDocument();

    // Input nhập tay không hiển thị
    expect(screen.queryByTestId('desktop-street-address-input')).not.toBeInTheDocument();

    // Giải quyết API sau đó
    resolveApi(mockSavedAddresses);
  });

  it('10. Khi khách hàng đăng nhập nhưng chưa có địa chỉ nào trong sổ (mảng rỗng): kết thúc loading và hiển thị form nhập tay', async () => {
    vi.mocked(getCustomerAddressesApi).mockResolvedValueOnce([]);

    render(<CheckoutForm order={null} config={mockConfigData} />);

    // Ban đầu hiển thị Skeleton
    expect(screen.getByTestId('address-book-skeleton')).toBeInTheDocument();

    // Sau khi API trả về rỗng -> Skeleton biến mất
    await waitFor(() => {
      expect(screen.queryByTestId('address-book-skeleton')).not.toBeInTheDocument();
    });

    // Không có dropdown sổ địa chỉ vì không có địa chỉ nào
    expect(screen.queryByTestId('customer-address-select')).not.toBeInTheDocument();

    // Form nhập tay xuất hiện kèm checkbox lưu vào sổ địa chỉ
    expect(screen.getByTestId('desktop-street-address-input')).toBeInTheDocument();
    expect(screen.getByText('Lưu địa chỉ này vào danh sách địa chỉ')).toBeInTheDocument();
  });
});
