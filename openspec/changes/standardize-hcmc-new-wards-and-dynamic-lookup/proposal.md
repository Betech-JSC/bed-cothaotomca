# Proposal: Standardize HCMC New Wards, Dynamic BE Lookup & Test Cases 11/11

## Why

Theo phản hồi kiểm thử thực tế ngày 11/11/2026 (`Feedback_phuong_phi_ship_11-11.xlsx - Trang tính1.csv`):
1. **Nguyên tắc vận hành của Quán**: Quán vận hành 100% theo **91 PHƯỜNG/XÃ MỚI** của TP. Hồ Chí Minh (sau sáp nhập theo Nghị quyết 1685/NQ-UBTVQH15 hiệu lực từ 01/07/2025). Hệ thống không được xử lý ngầm, không tự đoán số phường hay tự quy đổi phường cũ → mới trong code web, CMS hay API tính phí ship.
2. **Nguồn dữ liệu truyền động từ Backend**: Dữ liệu tra cứu phường cũ ➔ mới (`du_lieu_phuong_cu_moi_HCM.json`) phải được lưu trữ và truyền động từ Backend qua API (tương tự `/api/v1/administrative-units` và `/api/v1/shipping/settings`), không được hardcode tĩnh trên Frontend để đảm bảo tính đồng bộ dữ liệu.
3. **Giao diện & Công cụ Tra cứu trực quan**: Cần cập nhật tiêu đề, placeholder, note hướng dẫn chọn theo phường MỚI tại ô Phường/Xã, đồng thời bổ sung link mở Modal **Tra cứu phường cũ → mới** độc lập giúp khách tự tra cứu đối chiếu và điền tên phường mới vào form (hệ thống không lưu hay tính ship theo phường cũ).
4. **Chuẩn hóa danh mục 91 Phường/Xã & Sửa các lỗi phát hiện**: Xóa bỏ các phường cũ không còn tồn tại (`Bình Chiểu`, `Thạnh Xuân`, `Cát Lái (TĐ)`), chuẩn hóa tiền tố `Xã` cho 13 xã ngoại thành, sửa khu vực của `Xã Bình Lợi` (về Huyện Bình Chánh), cập nhật 5 mức phí ship thay đổi, sửa lỗi cộng tiền ship khi đang chờ xác nhận địa chỉ, và chặn lỗi gán ship = 0đ khi API gặp sự cố.

## What Changes

- **1. Chuẩn hóa Danh mục 91 Phường/Xã Mới TP.HCM & Phí ship Backend**:
  - Loại bỏ hoàn toàn `Phường Bình Chiểu`, `Phường Thạnh Xuân`, `Phường Cát Lái (TĐ)`.
  - Giữ duy nhất `Phường Cát Lái` (TP. Thủ Đức) với mức phí chuẩn 40.000đ (Chi nhánh Trần Đình Xu Q.1).
  - Đổi tiền tố sang `Xã` cho 13 xã: *Bà Điểm, Bình Chánh, Bình Hưng, Bình Lợi, Đông Thạnh, Hiệp Phước, Hóc Môn, Hưng Long, Nhà Bè, Tân Nhựt, Tân Vĩnh Lộc, Vĩnh Lộc, Xuân Thới Sơn*.
  - Sửa `Xã Bình Lợi` thuộc Huyện Bình Chánh (phí 75.000đ, giao từ Chi nhánh Tân Bình).
  - Cập nhật 5 mức phí ship & chi nhánh: Bình Hưng Hòa (30.000đ - CN Tân Bình), Bình Đông (60.000đ - CN TĐX), Phú Định (60.000đ - CN TĐX), Tân Sơn Hòa (20.000đ - CN Tân Bình), Tân Sơn Nhất (20.000đ - CN Tân Bình).
- **2. API Backend Truyền Động Bảng Tra Cứu Phường Cũ ➔ Mới**:
  - Tạo endpoint `GET /api/v1/administrative-units/ward-mapping` (hoặc tích hợp vào `/api/v1/administrative-units`) trả về cấu trúc 245 mục mapping từ `du_lieu_phuong_cu_moi_HCM.json` gồm danh sách quận cũ, phường cũ, cờ `p` (một phần), và tên phường mới tương ứng.
  - Backend API tính phí giao hàng (`/api/v1/shipping/calculate`) chỉ nhận `ward_id` / tên hợp lệ thuộc 91 phường mới; từ chối hoặc trả lỗi nếu truyền tên phường cũ không tồn tại.
- **3. Cập nhật UI Ô Phường/Xã & Modal Tra Cứu Nhanh trên Frontend**:
  - Tiêu đề ô: `Phường / Xã (Khu vực giao) *` (cả `CheckoutForm.tsx` và `ProfileDashboard.tsx`).
  - Placeholder: `Gõ hoặc chọn phường mới` (EN: `Type or select your new ward`).
  - Dòng ghi chú dưới ô: `Chọn theo tên Phường/Xã MỚI (sau sáp nhập 01/07/2025).` (EN: `Select your NEW ward (after the merger on 1 Jul 2025).`).
  - Link tra cứu ngay cạnh: `Tra cứu phường cũ → mới` (EN: `Look up old → new ward`).
  - Component `WardLookupModal.tsx`: Modal độc lập đọc dữ liệu động từ API BE, cho phép lọc theo Quận cũ ➔ Phường cũ ➔ Hiển thị Phường mới kèm nút **[Chọn phường này]** để điền thẳng vào form.
  - Xóa bỏ các hàm tự đoán phường cũ ngầm (`resolveNewWardName`, `HCMC_WARD_OLD_NAME_MAP`).
- **4. Sửa 2 Lỗi Nghiệp Vụ Thanh Toán (STT 4 & STT 11)**:
  - Khi đang có cảnh báo lệch địa chỉ (`hasUnconfirmedAddressWarning = true`): Biến `total` không được cộng thêm phí ship cũ vào tổng thanh toán.
  - Khi gọi API tính ship thất bại (mạng lỗi/timeout): Không gán `shippingFee = 0`, hiển thị *"Chưa tính được phí ship, vui lòng thử lại"* và disable nút Đặt hàng.
- **5. Kiểm tra Địa chỉ đã lưu (STT 10)**:
  - Khách chọn địa chỉ đã lưu trong sổ địa chỉ mà `ward_id` / tên phường không thuộc danh mục 91 phường mới ➔ Hiển thị cảnh báo yêu cầu khách chọn lại phường mới.

## Capabilities

### New Capabilities
- `checkout/hcmc-new-wards-and-lookup`: Vận hành 100% theo 91 Phường/Xã Mới TP.HCM, API Backend truyền động dữ liệu tra cứu, Modal tra cứu phường cũ ➔ mới, và kiểm soát phí ship an toàn.

### Modified Capabilities
(Không có modified capabilities do storefront-fixes chưa có requirements về địa giới hành chính).

## Impact

- **Backend**:
  - `database/data/parsed_shipping_rates.json` & `database/data/du_lieu_phuong_cu_moi_HCM.json`.
  - `app/Console/Commands/ImportShippingRates.php` & `database/seeders/ShippingRatesSeeder.php`.
  - `app/Http/Controllers/Api/AdministrativeUnitController.php` & `routes/api.php`.
  - `app/Services/ShippingService.php` (bỏ mapOldWardToNewWards ngầm, siết chặt 91 phường mới).
- **Frontend**:
  - `src/services/orderService.ts` (API fetch ward mapping).
  - `src/components/Checkout/WardSelectCombobox.tsx` (cập nhật UI, placeholder, note, link mở modal).
  - `src/components/Checkout/WardLookupModal.tsx` (Modal tra cứu phường mới).
  - `src/components/Checkout/CheckoutForm.tsx` (sửa tính total khi pending confirm, chặn lỗi API ship = 0, validate địa chỉ đã lưu).
  - `src/components/Auth/ProfileDashboard.tsx` (đồng bộ nhãn, placeholder, note, link tra cứu cho form sổ địa chỉ).
  - Messages i18n (`messages/vi.json`, `messages/en.json`).
