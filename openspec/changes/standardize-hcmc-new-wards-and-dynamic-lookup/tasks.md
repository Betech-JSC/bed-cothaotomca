# Tasks: Standardize HCMC New Wards, Dynamic BE Lookup & Test Cases 11/11

## 1. Backend Data Standardization & Dynamic API

- [x] 1.1 Chuẩn hóa `database/data/parsed_shipping_rates.json` và `database/seeders/ShippingRatesSeeder.php` theo đúng 91 Phường/Xã Mới TP.HCM: Xóa Bình Chiểu, Thạnh Xuân, Cát Lái (TĐ); sửa Cát Lái (40k - CN Trần Đình Xu Q.1); đổi tiền tố `Xã` cho 13 xã; sửa Xã Bình Lợi (75k - Huyện Bình Chánh - CN Tân Bình); cập nhật 5 mức phí ship thay đổi (Bình Hưng Hòa 30k, Bình Đông 60k, Phú Định 60k, Tân Sơn Hòa 20k, Tân Sơn Nhất 20k).
- [x] 1.2 Đặt file dữ liệu `du_lieu_phuong_cu_moi_HCM.json` vào `bed-cothaotomca-backend/database/data/du_lieu_phuong_cu_moi_HCM.json` và tạo endpoint `GET /api/v1/administrative-units/ward-mapping` trong `AdministrativeUnitController.php` để truyền động 245 mục mapping về Frontend.
- [x] 1.3 Cập nhật `ShippingService.php` và `ShippingApiController.php`: Loại bỏ logic tự đoán ngầm `mapOldWardToNewWards`; API `/shipping/calculate` chỉ chấp nhận `ward_id` / tên thuộc 91 phường mới hợp lệ, nếu không có thì trả về lỗi rõ ràng.
- [x] 1.4 Chạy test backend `php artisan test --filter=Shipping` để verify toàn bộ tính toán phí ship và API administrative units trả về đúng 91 phường.

## 2. Frontend Ward Select UI & Standalone Lookup Modal

- [x] 2.1 Thêm hàm `getHcmcWardMapping()` trong `src/services/orderService.ts` để fetch động dữ liệu mapping từ API Backend `/api/v1/administrative-units/ward-mapping` (kèm fallback an toàn).
- [x] 2.2 Xây dựng component `WardLookupModal.tsx` (`src/components/Checkout/WardLookupModal.tsx`): Cho phép chọn Quận/Huyện cũ ➔ Phường/Xã cũ ➔ Hiển thị Phường Mới tương ứng kèm nút `[Chọn phường này]` để cập nhật state trên form cha.
- [x] 2.3 Cập nhật `WardSelectCombobox.tsx`: Thay đổi tiêu đề thành `Phường / Xã (Khu vực giao) *`, placeholder `Gõ hoặc chọn phường mới` (EN: `Type or select your new ward`), bổ sung dòng note `Chọn theo tên Phường/Xã MỚI (sau sáp nhập 01/07/2025).` và liên kết mở `WardLookupModal`.
- [x] 2.4 Cập nhật `messages/vi.json` và `messages/en.json` đầy đủ các bản dịch cho nhãn, placeholder, note hướng dẫn và nội dung trong Modal Tra Cứu.
- [x] 2.5 Cập nhật `ProfileDashboard.tsx` (form thêm/sửa địa chỉ trong sổ địa chỉ cá nhân): Đồng bộ nhãn, placeholder, note và modal tra cứu phường mới giống trang Checkout.

## 3. Checkout Business Logic: Freezing Shipping Fee & Error Handling

- [x] 3.1 Cập nhật `CheckoutForm.tsx` (STT 4): Khi `hasUnconfirmedAddressWarning = true`, không cộng phí ship cũ vào biến tính `total` (Tổng thanh toán hiển thị đúng tổng tiền hàng trừ khuyến mãi).
- [x] 3.2 Cập nhật `CheckoutForm.tsx` (STT 11): Khi API `/shipping/calculate` trả về lỗi hoặc timeout, không gán `shippingFee = 0`; hiển thị thông báo lỗi `Chưa tính được phí ship, vui lòng thử lại` và khóa nút Đặt hàng.
- [x] 3.3 Cập nhật `CheckoutForm.tsx` (STT 10): Khi khách chọn địa chỉ đã lưu mà phường/xã không thuộc danh mục 91 phường mới, hiển thị cảnh báo yêu cầu khách cập nhật lại Phường Mới trước khi tạo đơn.
- [x] 3.4 Dọn dẹp logic đoán phường ngầm cũ trong `src/data/wardMapping.ts` (`HCMC_WARD_OLD_NAME_MAP`, `resolveNewWardName`), đảm bảo hệ thống chỉ dựa trên 91 phường mới.

## 4. Verification & Testing Against Client Test Cases (Trang tính 1)

- [x] 4.1 Chạy unit tests frontend `npm test` kiểm tra các test suite liên quan đến `WardSelectCombobox` và `CheckoutForm`.
- [x] 4.2 Kiểm thử đối soát 100% các ca thử trong `Feedback_phuong_phi_ship_11-11.xlsx - Trang tính1.csv`:
  - STT 1: Quán chỉ hiển thị và xử lý 91 phường mới.
  - STT 3: Số nhà lặp ở nhiều quận (Xuân Hòa + 200 Điện Biên Phủ) xác định đúng chi nhánh Hoàng Sa 20k.
  - STT 4: Nút "giữ phường" và tổng tiền không cộng phí ship khi đang chờ xác nhận.
  - STT 5: Ô Phường/Xã có note, placeholder và link mở bảng tra cứu; bấm chọn điền đúng phường mới.
  - STT 6: Không còn Bình Chiểu, Thạnh Xuân, Cát Lái TĐ; 13 xã mang đúng tiền tố `Xã`.
  - STT 7: Xã Bình Lợi thuộc Bình Chánh, phí 75k, chi nhánh Tân Bình.
  - STT 8: Bỏ toàn bộ logic ngầm đoán phường cũ trong code.
  - STT 9: API tính ship từ chối tên phường cũ không hợp lệ.
  - STT 10: Địa chỉ đã lưu có phường cũ bị yêu cầu cập nhật lại.
  - STT 11: Lỗi API tính ship khóa nút Đặt hàng và không để phí ship = 0.
