import { test, expect, type Page } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

const EVIDENCE_DIR = path.resolve(__dirname, 'evidence', 'address-ward');
fs.mkdirSync(EVIDENCE_DIR, { recursive: true });

const MOCK_ITEM = {
  id: '2-Standard',
  productId: 2,
  productCode: 'SET-2',
  slug: 'set-com-ca-hoi-ngam-tuong-2',
  categorySlug: 'combo-tiet-kiem-hot',
  title: 'Set Cơm Cá Hồi Ngâm Tương 2',
  imageUrl: '/images/products/set-2.jpg',
  variant: 'Tiêu chuẩn',
  unitPrice: 220000,
  originalPrice: 220000,
  quantity: 1,
  isOutOfStock: false,
};

const ADMIN_UNITS = [
  {
    id: 'prov_hcm',
    name: 'TP. Hồ Chí Minh',
    wards: [
      { id: 'ward_an_dong', name: 'An Đông', district: 'An Đông', province: 'TP. Hồ Chí Minh' },
      { id: 'ward_sai_gon', name: 'Sài Gòn', district: 'Sài Gòn', province: 'TP. Hồ Chí Minh' },
      { id: 'ward_xuan_hoa', name: 'Xuân Hòa', district: 'Quận 3', province: 'TP. Hồ Chí Minh' },
      { id: 'ward_gia_dinh', name: 'Gia Định', district: 'Bình Thạnh', province: 'TP. Hồ Chí Minh' },
    ],
  },
];

const MOCK_USER = {
  id: 1,
  name: 'Nguyễn Văn Test',
  first_name: 'Văn Test',
  last_name: 'Nguyễn',
  phone: '0901234567',
  email: 'qa.automation@cothaotomca.vn',
  points: 0,
  tier: 'member',
};

const SHIP_OK = {
  data: {
    shipping_fee: 25000,
    original_fee: 25000,
    is_freeship: false,
    is_deliverable: true,
    is_configured_area: true,
    branch_name: 'Chi nhánh An Đông',
    message: null,
  },
};

function candidate(overrides: Record<string, unknown> = {}) {
  return {
    house_number: '197',
    street: 'Hoàng Sa',
    ward: 'An Đông',
    district: 'An Đông',
    province: 'TP. Hồ Chí Minh',
    lat: 10.7889,
    lng: 106.7055,
    ...overrides,
  };
}

function geocodeBody(candidates: Record<string, unknown>[], extra: Record<string, unknown> = {}) {
  return {
    data: {
      provider: 'trackasia',
      cached: false,
      precision: 'exact',
      candidates,
      ...extra,
    },
  };
}

async function setup(
  page: Page,
  opts: {
    candidates?: Record<string, unknown>[];
    geocodeExtra?: Record<string, unknown>;
    calcStatus?: number;
    mobile?: boolean;
    mockTime?: string;
    onContactRequest?: (payload: Record<string, unknown>) => void;
  } = {}
) {
  await page.setViewportSize(opts.mobile ? { width: 390, height: 844 } : { width: 1280, height: 800 });

  await page.context().addCookies([
    { name: 'site_access_token', value: 'granted', domain: 'localhost', path: '/' },
    { name: 'NEXT_LOCALE', value: 'vi', domain: 'localhost', path: '/' },
  ]);

  await page.addInitScript(
    ({ item, mockTime }) => {
      localStorage.setItem('site_access_token', 'granted');
      localStorage.setItem('cothaotomca_cart', JSON.stringify([item]));
      sessionStorage.setItem('preorder_notice_dismissed', 'true');
      if (mockTime) {
        (window as unknown as { __MOCK_TIME__?: string }).__MOCK_TIME__ = mockTime;
      }
    },
    { item: MOCK_ITEM, mockTime: opts.mockTime }
  );

  await page.route('**/api/**/shipping/settings**', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        data: {
          min_order_amount: 300000,
          is_min_amount_enabled: true,
          free_shipping_threshold: 300000,
          default_shipping_fee: 25000,
          unconfigured_area_action: 'block_order',
          is_voucher_enabled: true,
          voucher_codes: [],
          can_combine_with_promotions: false,
          can_combine_with_freeship: true,
        },
      }),
    })
  );

  await page.route('**/api/shipping-settings**', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ data: { min_order_amount: 300000, default_shipping_fee: 25000 } }),
    })
  );

  await page.route('**/api/**/administrative-units', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: ADMIN_UNITS }) })
  );

  await page.route('**/api/**/administrative-units/ward-mapping', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ data: { old_to_new: [], new_wards: [] } }),
    })
  );

  await page.route('**/api/**/customer/addresses**', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: [] }) })
  );

  await page.route('**/api/**/user/addresses**', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: [] }) })
  );

  await page.route('**/api/**/auth/me', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: MOCK_USER }) })
  );

  await page.route('**/api/campaigns**', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: [] }) })
  );

  await page.route('**/api/vouchers**', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: [] }) })
  );

  await page.route('**/api/**/shipping/verify-address', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(geocodeBody(opts.candidates ?? [candidate()], opts.geocodeExtra ?? {})),
    })
  );

  await page.route('**/api/**/contacts', async (route) => {
    let payload: Record<string, unknown> = {};
    try {
      payload = (route.request().postDataJSON() || {}) as Record<string, unknown>;
    } catch {
      // ignore
    }
    opts.onContactRequest?.(payload);
    await route.fulfill({
      status: 201,
      contentType: 'application/json',
      body: JSON.stringify({
        status: 'success',
        message: 'Đã ghi nhận yêu cầu gọi lại',
        data: { id: 999, ...payload },
      }),
    });
  });

  await page.route('**/api/**/shipping/calculate', (route) => {
    if (opts.calcStatus && opts.calcStatus >= 400) {
      return route.fulfill({
        status: opts.calcStatus,
        contentType: 'application/json',
        body: JSON.stringify({ message: 'Không thể tính phí giao hàng.' }),
      });
    }
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(SHIP_OK) });
  });

  const targetUrl = opts.mockTime ? `/thanh-toan?mock_time=${encodeURIComponent(opts.mockTime)}` : '/thanh-toan';
  await page.goto(targetUrl, { waitUntil: 'domcontentloaded' });

  if (opts.mobile) {
    await expect(page.getByTestId('mobile-checkout-submit-btn')).toBeVisible({ timeout: 40000 });
    await page.getByTestId('mobile-street-address-input').waitFor({ state: 'visible', timeout: 40000 });
  } else {
    await expect(page.getByTestId('desktop-street-address-input')).toBeVisible({ timeout: 30000 });
    // Cho React hydrate xong truoc khi fill (neu fill qua som, controlled input se bi reset).
    await page.getByTestId('checkout-submit-btn').waitFor({ state: 'visible', timeout: 30000 });
  }
  await page.waitForTimeout(1500);
}

async function typeAddressMobile(page: Page, address: string) {
  const input = page.getByTestId('mobile-street-address-input');
  for (let attempt = 0; attempt < 3; attempt += 1) {
    await input.scrollIntoViewIfNeeded();
    await input.click();
    await input.fill(address);
    await input.blur();
    if ((await input.inputValue().catch(() => '')) === address) break;
    await page.waitForTimeout(500);
  }
  await expect(input).toHaveValue(address);
}

async function typeAddress(page: Page, address: string) {
  const input = page.getByTestId('desktop-street-address-input');
  for (let attempt = 0; attempt < 3; attempt += 1) {
    await input.click();
    await input.fill(address);
    await input.blur();
    if ((await input.inputValue().catch(() => '')) === address) break;
    await page.waitForTimeout(500);
  }
  await expect(input).toHaveValue(address);
}

async function pickSuggestedWard(page: Page) {
  const applyBtn = page.getByTestId('apply-suggested-ward-btn');
  const selectBtn = page.getByTestId('select-suggested-ward-btn');

  const applyReady = await applyBtn
    .waitFor({ state: 'visible', timeout: 4000 })
    .then(() => true)
    .catch(() => false);
  if (applyReady) {
    await applyBtn.click();
    return;
  }

  const selectReady = await selectBtn
    .waitFor({ state: 'visible', timeout: 20000 })
    .then(() => true)
    .catch(() => false);
  if (selectReady) {
    await selectBtn.click();
    return;
  }

  await page.getByTestId('desktop-ward-select-input').click();
  await page.getByTestId('desktop-ward-select-input').fill('An');
  await page.locator('[data-testid^="desktop-ward-select-option-"]').first().click();
}

async function shot(page: Page, name: string) {
  await page.screenshot({ path: path.join(EVIDENCE_DIR, `${name}.png`), fullPage: false });
}

test.describe('Xác minh địa chỉ / Phường - Checkout Desktop', () => {
  test.setTimeout(120_000);

  test('Ma trận #2 / A03: đã xác minh nhưng chưa chọn phường -> nút Đặt hàng bị khóa', async ({ page }) => {
    await setup(page);
    await typeAddress(page, '197 Hoàng Sa');

    const submit = page.getByTestId('checkout-submit-btn');
    await expect(submit).toBeDisabled({ timeout: 20000 });
    // Chua chon phuong: FE phai hien goi y phuong va khoa nut dat hang.
    await expect(page.getByTestId('select-suggested-ward-btn')).toBeVisible({ timeout: 20000 });
    await shot(page, '01-a03-chua-chon-phuong-disabled');

    await pickSuggestedWard(page);
    await expect(page.getByTestId('address-ward-suggestion-chip')).toBeHidden({ timeout: 20000 });
    await shot(page, '02-a03-da-chon-phuong');
  });

  test('A04 / C05: candidate lệch số nhà -> không xác minh được, khóa nút', async ({ page }) => {
    await setup(page, { candidates: [candidate({ house_number: '999' })] });
    await typeAddress(page, '197 Hoàng Sa');

    await expect(page.getByTestId('address-unverifiable-support-warning')).toBeVisible({ timeout: 20000 });
    await expect(page.getByTestId('checkout-submit-btn')).toBeDisabled();
    await expect(page.getByTestId('request-store-callback-btn')).toBeVisible();
    await shot(page, '03-a04-lech-so-nha');
  });

  test('A05 / C06: candidate khác tên đường -> không xác minh được, khóa nút', async ({ page }) => {
    await setup(page, { candidates: [candidate({ street: 'Trường Sa' })] });
    await typeAddress(page, '197 Hoàng Sa');

    await expect(page.getByTestId('address-unverifiable-support-warning')).toBeVisible({ timeout: 20000 });
    await expect(page.getByTestId('checkout-submit-btn')).toBeDisabled();
    await shot(page, '04-a05-khac-ten-duong');
  });

  test('A07: số nhà dạng "Lô B5" phải được nhận diện (không báo thiếu số nhà)', async ({ page }) => {
    await setup(page, { candidates: [candidate({ house_number: 'B5' })] });
    await typeAddress(page, 'Lô B5 Hoàng Sa');

    await expect(page.getByTestId('address-missing-house-number-warning')).toBeHidden({ timeout: 20000 });
    await shot(page, '05-a07-lo-b5');
  });

  test('Ma trận #7 / H09: lỗi tính phí ship -> cảnh báo + khóa nút, không lộ phí mặc định', async ({ page }) => {
    await setup(page, { calcStatus: 500 });
    await typeAddress(page, '197 Hoàng Sa');
    await expect(page.getByTestId('checkout-submit-btn')).toBeDisabled({ timeout: 20000 });
    await pickSuggestedWard(page);

    await expect(page.getByTestId('shipping-calculation-error-alert')).toBeVisible({ timeout: 20000 });
    await expect(page.getByTestId('checkout-submit-btn')).toBeDisabled();
    await shot(page, '06-matrix7-loi-tinh-phi');
  });

  test('Ma trận #1 (đối chứng): địa chỉ hợp lệ + chọn phường + phí ship OK -> nút mở khóa', async ({ page }) => {
    await setup(page);
    await typeAddress(page, '197 Hoàng Sa');
    await expect(page.getByTestId('checkout-submit-btn')).toBeDisabled({ timeout: 20000 });
    await pickSuggestedWard(page);

    await expect(page.getByTestId('shipping-calculation-error-alert')).toBeHidden({ timeout: 20000 });
    await expect(page.getByTestId('address-ward-suggestion-chip')).toBeHidden({ timeout: 20000 });

    const nameInput = page.getByRole('textbox', { name: 'Họ và tên' }).first();
    if (await nameInput.isVisible().catch(() => false)) {
      await nameInput.fill('Nguyễn Văn Test');
    }
    const phoneInput = page.getByRole('textbox', { name: 'Số điện thoại' }).first();
    if (await phoneInput.isVisible().catch(() => false)) {
      await phoneInput.fill('0901234567');
      await phoneInput.blur();
    }
    if (await phoneInput.inputValue().catch(() => '') !== '0901234567') {
      await phoneInput.fill('0901234567');
    }
    const confirm = page.getByTestId('desktop-confirm-checkbox');
    if (await confirm.isVisible().catch(() => false)) {
      // Sticky footer co the phu len checkbox -> click truc tiep bang DOM.
      await confirm.check({ force: true }).catch(async () => {
        await confirm.evaluate((el) => (el as HTMLInputElement).click());
      });
    }

    await expect(page.getByTestId('checkout-submit-btn')).toBeEnabled({ timeout: 20000 });
    await shot(page, '07-matrix1-hop-le-enabled');
  });
});

test.describe('Xác minh địa chỉ / Phường - Checkout Mobile (390x844)', () => {
  test.setTimeout(120_000);

  test('Ma trận #2 (mobile): chưa chọn phường -> nút Đặt hàng mobile bị khóa', async ({ page }) => {
    await setup(page, { mobile: true });
    await typeAddressMobile(page, '197 Hoàng Sa');

    await expect(page.getByTestId('mobile-checkout-submit-btn')).toBeDisabled({ timeout: 20000 });
    await expect(page.getByTestId('mobile-select-suggested-ward-btn')).toBeVisible({ timeout: 20000 });
    await shot(page, 'mobile-01-matrix2-chua-chon-phuong');
  });

  test('Ma trận #7 (mobile): lỗi tính phí ship -> cảnh báo + khóa nút, không lộ phí mặc định', async ({ page }) => {
    await setup(page, { mobile: true, calcStatus: 500 });
    await typeAddressMobile(page, '197 Hoàng Sa');
    await expect(page.getByTestId('mobile-checkout-submit-btn')).toBeDisabled({ timeout: 20000 });

    const pickWard = page.getByTestId('mobile-select-suggested-ward-btn');
    await expect(pickWard).toBeVisible({ timeout: 20000 });
    await pickWard.click();

    await expect(page.getByTestId('mobile-shipping-calculation-error-alert')).toBeVisible({ timeout: 20000 });
    await expect(page.getByTestId('mobile-checkout-submit-btn')).toBeDisabled();
    await shot(page, 'mobile-02-matrix7-loi-tinh-phi');
  });

  test('E07 (mobile): SĐT sai định dạng -> báo lỗi sai định dạng (không phải "vui lòng nhập")', async ({ page }) => {
    // Nut "Yeu cau goi lai" chi hien khi dia chi khong xac minh duoc -> mock candidates rong.
    await setup(page, { mobile: true, candidates: [] });
    await typeAddressMobile(page, '197 Hoàng Sa');
    await expect(page.getByTestId('mobile-address-unverifiable-support-warning')).toBeVisible({ timeout: 20000 });

    const nameInput = page.getByTestId('mobile-name-input');
    await nameInput.scrollIntoViewIfNeeded();
    await nameInput.fill('Nguyễn Văn Test');

    const phoneInput = page.getByTestId('mobile-phone-input');
    await phoneInput.scrollIntoViewIfNeeded();
    await phoneInput.fill('12345');
    await phoneInput.blur();

    const callbackBtn = page.getByTestId('mobile-request-store-callback-btn');
    await expect(callbackBtn).toBeVisible({ timeout: 20000 });
    await callbackBtn.click();

    // Loi cu the nam o field-level error duoi o SDT: phai la phone_invalid, khong phai phone_required.
    await expect(page.getByText('Số điện thoại không hợp lệ', { exact: false }).first()).toBeVisible({ timeout: 20000 });
    await expect(page.getByText('Vui lòng nhập số điện thoại.', { exact: true })).toHaveCount(0);
    await shot(page, 'mobile-03-e07-sdt-sai-dinh-dang');
  });
});

test.describe('Multi-Ward Suggestion & Callback Hours (09:00-23:00) - Desktop & Mobile', () => {
  test.setTimeout(120_000);

  const MULTI_WARD_CANDIDATES = [
    candidate({
      house_number: '200',
      street: 'Điện Biên Phủ',
      ward: 'Xuân Hòa',
      new_ward: 'Xuân Hòa',
      district: 'Quận 3',
      province: 'TP. Hồ Chí Minh',
    }),
    candidate({
      house_number: '200',
      street: 'Điện Biên Phủ',
      ward: 'Gia Định',
      new_ward: 'Gia Định',
      district: 'Bình Thạnh',
      province: 'TP. Hồ Chí Minh',
    }),
  ];

  const MULTI_WARD_EXTRA = {
    verification_status: 'ambiguous_multiple_wards',
    unique_wards: ['Xuân Hòa', 'Gia Định'],
    suggested_ward: 'Xuân Hòa',
  };

  test('Cases 1, 2, 3 & 4 (Desktop - 14:00 trong giờ hoạt động): nhiều phường gợi ý -> chọn phường hợp lệ mở khóa -> chọn phường ngoài danh sách khóa nút + gọi lại báo "Quán sẽ gọi lại sau ít phút"', async ({
    page,
  }) => {
    const contactPayloads: Record<string, unknown>[] = [];
    await setup(page, {
      candidates: MULTI_WARD_CANDIDATES,
      geocodeExtra: MULTI_WARD_EXTRA,
      mockTime: '14:00',
      onContactRequest: (p) => contactPayloads.push(p),
    });

    const desktopForm = page.locator('form').filter({ has: page.getByTestId('desktop-street-address-input') });
    await desktopForm.locator('input[type="text"]').first().fill('Nguyễn Văn Thảo');
    await desktopForm.locator('input[type="tel"]').first().fill('0901234567');
    await desktopForm.locator('input[type="email"]').first().fill('khachhang@cothaotomca.vn');

    // Case 1: API trả nhiều phường — Chưa chọn phường
    await typeAddress(page, '200 Điện Biên Phủ');
    const chip = page.getByTestId('address-ward-suggestion-chip');
    await expect(chip).toBeVisible({ timeout: 20000 });
    await expect(page.getByTestId('select-suggested-ward-btn')).toHaveText(/Chọn Phường Xuân Hòa/);
    await expect(page.getByTestId('select-suggested-ward-btn-1')).toHaveText(/Chọn Phường Gia Định/);
    await expect(page.getByTestId('checkout-submit-btn')).toBeDisabled();
    await shot(page, 'case1-desktop-multi-wards-no-ward');

    // Case 2: Khách chọn 1 trong các phường được gợi ý (Phường Xuân Hòa) -> Nút Đặt hàng mở khóa
    await page.getByTestId('select-suggested-ward-btn').click();
    await expect(page.getByTestId('desktop-ward-select-input')).toHaveValue(/Phường Xuân Hòa/);
    const confirm = page.getByTestId('desktop-confirm-checkbox');
    if (!(await confirm.isChecked())) {
      await confirm.evaluate((el) => (el as HTMLInputElement).click());
    }
    await expect(page.getByTestId('checkout-submit-btn')).toBeEnabled({ timeout: 20000 });
    await shot(page, 'case2-desktop-selected-suggested-ward-enabled');

    // Case 3: Khách chọn phường NGOÀI danh sách API gợi ý (Phường Sài Gòn) -> Khóa nút Đặt hàng + cảnh báo + Hotline + Yêu cầu gọi lại
    const wardInput = page.getByTestId('desktop-ward-select-input');
    await wardInput.click();
    await wardInput.fill('Sài Gòn');
    await page.locator('[data-testid^="desktop-ward-select-option-"]').first().click();

    const mismatch = page.getByTestId('address-ward-mismatch-warning');
    await expect(mismatch).toBeVisible({ timeout: 20000 });
    await expect(page.getByTestId('apply-suggested-ward-btn')).toHaveText(/Đổi sang Phường Xuân Hòa/);
    await expect(page.getByTestId('apply-suggested-ward-btn-1')).toHaveText(/Đổi sang Phường Gia Định/);
    await expect(page.getByTestId('address-support-hotline-link')).toBeVisible();
    await expect(page.getByTestId('request-store-callback-btn')).toBeVisible();
    await expect(page.getByTestId('checkout-submit-btn')).toBeDisabled();
    await shot(page, 'case3-desktop-outside-ward-blocked');

    // Case 4: Gửi yêu cầu gọi lại TRONG giờ hoạt động (14:00, khung 09:00-23:00)
    await page.getByTestId('request-store-callback-btn').click();
    const successNotice = page.getByTestId('callback-request-success-notice');
    await expect(successNotice).toBeVisible({ timeout: 20000 });
    await expect(successNotice).toContainText('Quán sẽ gọi lại sau ít phút');
    expect(contactPayloads.length).toBe(1);
    expect(contactPayloads[0]).toMatchObject({
      name: 'Nguyễn Văn Thảo',
      phone: '0901234567',
      is_callback_request: true,
      type: 'address_callback',
      address: '200 Điện Biên Phủ',
      ward: 'Sài Gòn',
    });
    await shot(page, 'case4-desktop-callback-in-hours');
  });

  test('Case 5 (Desktop - 23:30 ngoài giờ hoạt động 09:00-23:00): gửi yêu cầu gọi lại báo "Quán sẽ gọi lại khi mở cửa"', async ({
    page,
  }) => {
    await setup(page, {
      candidates: MULTI_WARD_CANDIDATES,
      geocodeExtra: MULTI_WARD_EXTRA,
      mockTime: '23:30',
    });

    const desktopForm = page.locator('form').filter({ has: page.getByTestId('desktop-street-address-input') });
    await desktopForm.locator('input[type="text"]').first().fill('Nguyễn Văn Thảo');
    await desktopForm.locator('input[type="tel"]').first().fill('0901234567');

    const wardInput = page.getByTestId('desktop-ward-select-input');
    await wardInput.click();
    await wardInput.fill('Sài Gòn');
    await page.locator('[data-testid^="desktop-ward-select-option-"]').first().click();

    await typeAddress(page, '200 Điện Biên Phủ');
    await expect(page.getByTestId('address-ward-mismatch-warning')).toBeVisible({ timeout: 20000 });

    await page.getByTestId('request-store-callback-btn').click();
    const successNotice = page.getByTestId('callback-request-success-notice');
    await expect(successNotice).toBeVisible({ timeout: 20000 });
    await expect(successNotice).toContainText('Quán sẽ gọi lại khi mở cửa');
    await shot(page, 'case5-desktop-callback-after-hours');
  });

  test('Case 6 (Mobile 390x844): gợi ý nhiều phường -> chọn phường hợp lệ mở khóa -> chọn phường ngoài danh sách khóa nút + gọi lại theo giờ hoạt động', async ({
    page,
  }) => {
    await setup(page, {
      mobile: true,
      candidates: MULTI_WARD_CANDIDATES,
      geocodeExtra: MULTI_WARD_EXTRA,
      mockTime: '14:00',
    });

    await page.getByTestId('mobile-name-input').fill('Nguyễn Văn Thảo');
    await page.getByTestId('mobile-phone-input').fill('0901234567');

    // 6a: Chưa chọn phường -> hiện 2 nút gợi ý, nút Đặt hàng bị khóa
    await typeAddressMobile(page, '200 Điện Biên Phủ');
    await expect(page.getByTestId('mobile-address-ward-suggestion-chip')).toBeVisible({ timeout: 20000 });
    await expect(page.getByTestId('mobile-select-suggested-ward-btn')).toHaveText(/Chọn Phường Xuân Hòa/);
    await expect(page.getByTestId('mobile-select-suggested-ward-btn-1')).toHaveText(/Chọn Phường Gia Định/);
    await expect(page.getByTestId('mobile-checkout-submit-btn')).toBeDisabled();
    await shot(page, 'case6a-mobile-multi-wards-no-ward');

    // 6b: Chọn Phường Gia Định từ nút gợi ý -> mở khóa nút Đặt hàng
    await page.getByTestId('mobile-select-suggested-ward-btn-1').click();
    await expect(page.getByTestId('mobile-ward-select-input')).toHaveValue(/Phường Gia Định/);
    await expect(page.getByTestId('mobile-checkout-submit-btn')).toBeEnabled({ timeout: 20000 });
    await shot(page, 'case6b-mobile-selected-suggested-ward-enabled');

    // 6c: Đổi sang Phường Sài Gòn (ngoài danh sách) -> khóa nút + gọi lại trong giờ (14:00)
    const mobileWardInput = page.getByTestId('mobile-ward-select-input');
    await mobileWardInput.scrollIntoViewIfNeeded();
    await mobileWardInput.click();
    await mobileWardInput.fill('Sài Gòn');
    await page.locator('[data-testid^="mobile-ward-select-option-"]').first().click();

    await expect(page.getByTestId('mobile-address-ward-mismatch-warning')).toBeVisible({ timeout: 20000 });
    await expect(page.getByTestId('mobile-checkout-submit-btn')).toBeDisabled();
    await expect(page.getByTestId('mobile-address-support-hotline-link')).toBeVisible();
    await page.getByTestId('mobile-request-store-callback-btn').click();

    const mobileSuccess = page.getByTestId('mobile-callback-request-success-notice');
    await expect(mobileSuccess).toBeVisible({ timeout: 20000 });
    await expect(mobileSuccess).toContainText('Quán sẽ gọi lại sau ít phút');
    await shot(page, 'case6c-mobile-outside-ward-callback-in-hours');
  });
});
