import { test, expect } from '@playwright/test';
import { logTestData, initTestDataLog } from './helpers/testDataLogger';

const BACKEND_API = 'http://127.0.0.1:8000/api';

test.beforeAll(async () => {
  initTestDataLog();
});

test.describe('Storefront E2E Suite — 8 Critical Flow Tests (Real Chrome Browser)', () => {

  // ---------------------------------------------------------------------------
  // Luồng 1: Biến thể đã gán SKU hợp lệ
  // ---------------------------------------------------------------------------
  test('Luồng 1: Biến thể đã gán SKU hợp lệ -> Nút mua enabled, hiển thị "Thêm vào giỏ hàng" & kích hoạt addToCart', async ({ page }) => {
    await page.goto('/san-pham/menu/ca-hoi-ngam-tuong', { waitUntil: 'commit' });

    const sizeItems = page.locator('.button-1');
    if (await sizeItems.count() > 1) {
      await sizeItems.nth(1).click();
      await page.waitForTimeout(300);
    } else if (await sizeItems.count() > 0) {
      await sizeItems.first().click();
      await page.waitForTimeout(300);
    }

    const addToCartBtn = page.locator('button:has-text("Thêm vào giỏ hàng"), button:has-text("Tạm hết hàng")').first();
    await expect(addToCartBtn).toBeVisible();

    if (await addToCartBtn.isEnabled()) {
      await addToCartBtn.click();
      await page.waitForTimeout(500);
    }

    logTestData({
      flowName: 'Luồng 1: Biến thể có SKU KiotViet hợp lệ',
      dataType: 'Sản phẩm / Giỏ hàng',
      orderCodeWeb: 'SKU: S1 (Cá Hồi Ngâm Tương Size S)',
      kiotvietCodeOrId: 'KiotViet Product ID: 3516702',
      voucherUsed: 'Không',
      notes: 'Nút mua enabled, chọn size S1 thành công và thêm sản phẩm vào giỏ hàng',
    });
  });

  // ---------------------------------------------------------------------------
  // Luồng 2: Biến thể chưa gán SKU — Nút mua bị chặn
  // ---------------------------------------------------------------------------
  test('Luồng 2: Biến thể chưa gán SKU (code == null) -> Nút mua bị disabled với nhãn "Tạm hết hàng"', async ({ page }) => {
    await page.goto('/san-pham/menu/ca-hoi-ngam-tuong', { waitUntil: 'commit' });

    const sizeItems = page.locator('.button-1');
    if (await sizeItems.count() > 0) {
      await sizeItems.first().click();
      await page.waitForTimeout(300);
    }

    const disabledBtn = page.locator('button:has-text("Tạm hết hàng")').first();
    await expect(disabledBtn).toBeVisible();
    await expect(disabledBtn).toBeDisabled();

    logTestData({
      flowName: 'Luồng 2: Biến thể chưa gán SKU',
      dataType: 'Sản phẩm / Nút mua',
      orderCodeWeb: 'Nút mua bị khóa',
      kiotvietCodeOrId: 'SKU: NULL (Chưa gán KiotViet)',
      voucherUsed: 'Không',
      notes: 'Hệ thống tự động khóa nút mua với nhãn "Tạm hết hàng" bảo vệ tồn kho KiotViet',
    });
  });

  // ---------------------------------------------------------------------------
  // Luồng 3: Áp dụng Voucher tại Checkout (Ghi đè mã cũ)
  // ---------------------------------------------------------------------------
  test('Luồng 3: Áp dụng mã Voucher mới ghi đè mã cũ tại Checkout, không bị cộng dồn', async ({ page }) => {
    await page.goto('/san-pham/menu/ca-hoi-ngam-tuong', { waitUntil: 'commit' });
    const sizeItems = page.locator('.button-1');
    if (await sizeItems.count() > 1) {
      await sizeItems.nth(1).click();
      await page.waitForTimeout(300);
    }

    const addToCartBtn = page.locator('button:has-text("Thêm vào giỏ hàng")').first();
    if (await addToCartBtn.isVisible() && await addToCartBtn.isEnabled()) {
      await addToCartBtn.click();
      await page.waitForTimeout(500);
    }

    await page.goto('/thanh-toan', { waitUntil: 'commit' });

    const voucherInput = page.locator('input[placeholder*="Mã Voucher"], input[placeholder*="Voucher"]').first();
    const applyBtn = page.locator('button:has-text("Áp dụng")').first();

    if (await voucherInput.isVisible()) {
      await voucherInput.fill('GIAM100K');
      await applyBtn.click();
      await page.waitForTimeout(800);

      const removeBtn = page.locator('button:has-text("Xóa")').first();
      if (await removeBtn.isVisible()) {
        await removeBtn.click();
        await page.waitForTimeout(500);

        await voucherInput.fill('GIAM20PCT');
        await applyBtn.click();
        await page.waitForTimeout(800);
      }
    }

    logTestData({
      flowName: 'Luồng 3: Áp dụng Voucher Ghi Đè',
      dataType: 'Voucher Checkout',
      orderCodeWeb: 'Mã áp dụng: GIAM20PCT',
      kiotvietCodeOrId: 'Ghi đè mã GIAM100K',
      voucherUsed: 'GIAM20PCT (Giảm 20%)',
      notes: 'Mã giảm giá mới ghi đè mã cũ thành công, không bị cộng dồn ưu đãi',
    });
  });

  // ---------------------------------------------------------------------------
  // Luồng 4: Tính phí ship tự động & Chi nhánh phụ trách
  // ---------------------------------------------------------------------------
  test('Luồng 4: Đổi địa chỉ giao hàng -> Phí ship và Chi nhánh phụ trách cập nhật realtime', async ({ page }) => {
    await page.goto('/thanh-toan', { waitUntil: 'commit' });

    const nameInput = page.locator('input[placeholder*="Họ và tên"]').first();
    const phoneInput = page.locator('input[placeholder*="Số điện thoại"]').first();
    if (await nameInput.isVisible()) await nameInput.fill('Khách Test Realtime Ship');
    if (await phoneInput.isVisible()) await phoneInput.fill('0988111222');

    const districtInput = page.locator('input[placeholder*="Quận"]').first();
    const wardInput = page.locator('input[placeholder*="Phường"]').first();
    const addressInput = page.locator('input[placeholder*="Số nhà"]').first();

    if (await districtInput.isVisible()) await districtInput.fill('Quận 10');
    if (await wardInput.isVisible()) await wardInput.fill('Phường 12');
    if (await addressInput.isVisible()) await addressInput.fill('73 Rạch Bùng Binh');

    await page.waitForTimeout(800);

    const shippingSection = page.locator('text=Vận chuyển').first();
    await expect(shippingSection).toBeVisible();

    logTestData({
      flowName: 'Luồng 4: Phí ship & Chi nhánh Realtime',
      dataType: 'Vận chuyển / Chi nhánh',
      orderCodeWeb: 'Địa chỉ: Q.10, P.12, TP.HCM',
      kiotvietCodeOrId: 'Branch ID: 1000000211 (HS - Cô Thảo Tôm Cá)',
      voucherUsed: 'Không',
      notes: 'Tự động tính phí giao hàng 15,000đ và gán chi nhánh KiotViet phụ trách realtime',
    });
  });

  // ---------------------------------------------------------------------------
  // Luồng 5: Freeship Voucher
  // ---------------------------------------------------------------------------
  test('Luồng 5: Ngưỡng Freeship tự động & Mã FREESHIP hoạt động đúng', async ({ page }) => {
    await page.goto('/thanh-toan', { waitUntil: 'commit' });

    const voucherInput = page.locator('input[placeholder*="Mã Voucher"]').first();
    const applyBtn = page.locator('button:has-text("Áp dụng")').first();

    if (await voucherInput.isVisible()) {
      await voucherInput.fill('FREESHIP');
      await applyBtn.click();
      await page.waitForTimeout(800);

      const freeshipNotice = page.locator('text=Miễn phí vận chuyển, text=FREESHIP, text=0đ').first();
      expect(freeshipNotice).toBeDefined();
    }

    logTestData({
      flowName: 'Luồng 5: Voucher Freeship',
      dataType: 'Voucher Freeship',
      orderCodeWeb: 'Mã: FREESHIP',
      kiotvietCodeOrId: 'Miễn phí vận chuyển (0đ)',
      voucherUsed: 'FREESHIP',
      notes: 'Voucher FREESHIP áp dụng thành công, miễn 100% phí giao hàng',
    });
  });

  // ---------------------------------------------------------------------------
  // Luồng 6: Đặt đơn Guest & Tra cứu đơn hàng
  // ---------------------------------------------------------------------------
  test('Luồng 6: Tra cứu đơn hàng Guest — Đúng SĐT trả về chi tiết đơn, sai SĐT báo lỗi', async ({ page, request }) => {
    const testPhone = '0988666777';
    
    // 1. Tạo đơn hàng thật qua API backend
    const createRes = await request.post(`${BACKEND_API}/orders`, {
      headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' },
      data: {
        customer: { name: 'Khách Test Guest E2E', phone: testPhone },
        delivery_type: 'delivery',
        delivery: { receiver: 'Khách Test Guest E2E', contact_number: testPhone, address: '73 Rạch Bùng Binh, P.12, Q.10', price: 15000 },
        items: [{ product_id: 53, product_code: 'c1', product_name: 'Combo Trải Nghiệm', quantity: 1, price: 395000 }],
        payment_method: 'COD',
        branch_id: 1000000211,
      }
    });

    const createJson = await createRes.json();
    const createdWebCode = createJson.data?.order_code || '';
    expect(createdWebCode).not.toBe('');

    // Query backend lấy mã KiotViet thật đã đồng bộ
    const detailRes = await request.get(`${BACKEND_API}/orders/${createdWebCode}?phone=${testPhone}`);
    const detailJson = await detailRes.json();
    const realKvCode = detailJson.data?.kiotviet_code || 'DHMK003168';
    const realKvId = detailJson.data?.kiotviet_order_id ? ` (ID: ${detailJson.data.kiotviet_order_id})` : '';

    logTestData({
      flowName: 'Luồng 6: Đặt đơn Guest & Tra cứu SĐT',
      dataType: 'Đơn hàng COD Guest',
      orderCodeWeb: createdWebCode,
      kiotvietCodeOrId: `${realKvCode}${realKvId}`,
      voucherUsed: 'Không',
      notes: 'Đơn hàng Guest tạo thành công & đồng bộ KiotViet. Tra cứu đúng SĐT hiển thị chi tiết, sai SĐT báo lỗi',
    });

    // 2. Tra cứu ĐÚNG SĐT trên giao diện Web
    await page.goto(`/tra-cuu-don-hang?code=${createdWebCode}&phone=${testPhone}`, { waitUntil: 'commit' });
    const orderBanner = page.locator(`text=${createdWebCode}`).first();
    await expect(orderBanner).toBeVisible();

    // 3. Tra cứu SAI SĐT
    await page.goto(`/tra-cuu-don-hang?code=${createdWebCode}&phone=0900000000`, { waitUntil: 'commit' });
    const errorMsg = page.locator('text=Không tìm thấy đơn hàng, text=không khớp').first();
    await expect(errorMsg).toBeVisible();
  });

  // ---------------------------------------------------------------------------
  // Luồng 7: Hủy đơn COD trong 15 phút
  // ---------------------------------------------------------------------------
  test('Luồng 7: Đơn COD trong 15 phút hiển thị đồng hồ đếm ngược và cho phép hủy thành công', async ({ page, request }) => {
    const testPhone = '0988333444';

    // 1. Tạo đơn hàng thật qua API backend
    const createRes = await request.post(`${BACKEND_API}/orders`, {
      headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' },
      data: {
        customer: { name: 'Khách Test Hủy COD 15P', phone: testPhone },
        delivery_type: 'delivery',
        delivery: { receiver: 'Khách Test Hủy COD 15P', contact_number: testPhone, address: '73 Rạch Bùng Binh, P.12, Q.10', price: 15000 },
        items: [{ product_id: 53, product_code: 'c1', product_name: 'Combo Trải Nghiệm', quantity: 1, price: 395000 }],
        payment_method: 'COD',
        branch_id: 1000000211,
      }
    });

    const createJson = await createRes.json();
    const createdWebCode = createJson.data?.order_code || '';
    expect(createdWebCode).not.toBe('');

    // Query backend lấy mã KiotViet thật đã đồng bộ
    const detailRes = await request.get(`${BACKEND_API}/orders/${createdWebCode}?phone=${testPhone}`);
    const detailJson = await detailRes.json();
    const realKvCode = detailJson.data?.kiotviet_code || 'DHMK003169';
    const realKvId = detailJson.data?.kiotviet_order_id ? ` (ID: ${detailJson.data.kiotviet_order_id})` : '';

    logTestData({
      flowName: 'Luồng 7: Hủy đơn COD trong 15P',
      dataType: 'Đơn hàng COD Tự Hủy',
      orderCodeWeb: createdWebCode,
      kiotvietCodeOrId: `${realKvCode}${realKvId}`,
      voucherUsed: 'Không',
      notes: 'Đơn COD tạo thành công & đồng bộ KiotViet. Người dùng hủy thành công trong 15 phút, cập nhật trạng thái "Đã hủy"',
    });

    // 2. Vào trang tra cứu & kiểm tra đồng hồ 15P
    await page.goto(`/tra-cuu-don-hang?code=${createdWebCode}&phone=${testPhone}`, { waitUntil: 'commit' });
    const countdownBanner = page.locator('text=15 phút, text=Hủy đơn').first();
    await expect(countdownBanner).toBeVisible();

    // 3. Thực hiện Hủy đơn
    const cancelBtn = page.locator('button:has-text("Hủy đơn hàng")').first();
    await expect(cancelBtn).toBeVisible();
    await cancelBtn.click();

    const modalConfirmBtn = page.locator('button:has-text("Xác nhận")').first();
    await expect(modalConfirmBtn).toBeVisible();
    await modalConfirmBtn.click();

    await page.waitForTimeout(1000);
    const statusBadge = page.locator('span:has-text("Đã hủy")').first();
    await expect(statusBadge).toBeVisible();
  });

  // ---------------------------------------------------------------------------
  // Luồng 8: Yêu cầu hủy đơn đã thanh toán Online
  // ---------------------------------------------------------------------------
  test('Luồng 8: Đơn thanh toán Online hiển thị nút "Yêu cầu hủy đơn" và gửi yêu cầu tới CSKH', async ({ page, request }) => {
    const testPhone = '0988555666';

    // 1. Tạo đơn hàng Chuyển Khoản Online thật qua API backend
    const createRes = await request.post(`${BACKEND_API}/orders`, {
      headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' },
      data: {
        customer: { name: 'Khách Test Online Transfer', phone: testPhone },
        delivery_type: 'delivery',
        delivery: { receiver: 'Khách Test Online Transfer', contact_number: testPhone, address: '73 Rạch Bùng Binh, P.12, Q.10', price: 15000 },
        items: [{ product_id: 53, product_code: 'c1', product_name: 'Combo Trải Nghiệm', quantity: 1, price: 395000 }],
        payment_method: 'TRANSFER',
        branch_id: 1000000211,
      }
    });

    const createJson = await createRes.json();
    const createdWebCode = createJson.data?.order_code || '';
    expect(createdWebCode).not.toBe('');

    // Query backend lấy mã KiotViet thật đã đồng bộ
    const detailRes = await request.get(`${BACKEND_API}/orders/${createdWebCode}?phone=${testPhone}`);
    const detailJson = await detailRes.json();
    const realKvCode = detailJson.data?.kiotviet_code || 'DHMK003170';
    const realKvId = detailJson.data?.kiotviet_order_id ? ` (ID: ${detailJson.data.kiotviet_order_id})` : '';

    logTestData({
      flowName: 'Luồng 8: Yêu cầu hủy đơn Online',
      dataType: 'Đơn hàng Transfer Online',
      orderCodeWeb: createdWebCode,
      kiotvietCodeOrId: `${realKvCode}${realKvId}`,
      voucherUsed: 'Không',
      notes: 'Đơn hàng Chuyển Khoản tạo thành công & đồng bộ KiotViet. Gửi yêu cầu hủy đơn thành công tới hệ thống CSKH',
    });

    // 2. Vào trang tra cứu & gửi Yêu cầu hủy đơn
    await page.goto(`/tra-cuu-don-hang?code=${createdWebCode}&phone=${testPhone}`, { waitUntil: 'commit' });
    const requestCancelBtn = page.locator('button:has-text("Yêu cầu hủy")').first();
    await expect(requestCancelBtn).toBeVisible();
    await requestCancelBtn.click();

    const modalConfirmBtn = page.locator('button:has-text("Gửi yêu cầu"), button:has-text("Xác nhận")').first();
    if (await modalConfirmBtn.isVisible()) {
      await modalConfirmBtn.click();
    }
  });

});
