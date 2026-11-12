# Design: Standardize HCMC New Wards, Dynamic BE Lookup & Test Cases 11/11

## Context

Hệ thống cửa hàng Bếp Cô Thảo Tôm Cá gồm 2 codebase:
- Frontend: Next.js 15, React 19, TypeScript, Tailwind CSS (`/Users/macbookpro2020/bed-cothaotomca`).
- Backend: Laravel 11, PHP 8.2+, MySQL (`/Users/macbookpro2020/bed-cothaotomca-backend`).

Xem chi tiết nguyên nhân và động lực tại `proposal.md` và `specs/checkout/hcmc-new-wards-and-lookup/spec.md`.

## Goals / Non-Goals

**Goals:**
- Chuẩn hóa 100% dữ liệu phí giao hàng và danh mục Phường/Xã Backend theo đúng 91 Phường/Xã Mới TP.HCM (Nghị quyết 1685/NQ-UBTVQH15).
- Cung cấp API `GET /api/v1/administrative-units/ward-mapping` truyền động 245 mục mapping phường cũ ➔ mới từ Backend về Storefront.
- Cập nhật giao diện `WardSelectCombobox` với tiêu đề, placeholder, note hướng dẫn và link mở Modal `WardLookupModal` độc lập.
- Sửa dứt điểm lỗi tính tổng tiền khi có cảnh báo địa chỉ (không cộng phí ship cũ) và lỗi gán phí ship = 0 khi API timeout.
- Nghiệm thu toàn diện đối chiếu 100% với file test cases ngày 11/11 (`Feedback_phuong_phi_ship_11-11.xlsx - Trang tính1.csv`).

**Non-Goals:**
- Không thay đổi bảng giá phí ship của các tỉnh ngoài TP.HCM (Biên Hòa, Bình Dương, Long An giữ nguyên).
- Không tự động thay đổi dữ liệu đơn hàng cũ trong lịch sử database nếu không có yêu cầu từ Admin.

## Decisions

### 1. Backend Dynamic Mapping vs Frontend Hardcoded
- **Quyết định**: Lưu trữ file `du_lieu_phuong_cu_moi_HCM.json` tại `bed-cothaotomca-backend/database/data/du_lieu_phuong_cu_moi_HCM.json` và expose qua endpoint `GET /api/v1/administrative-units/ward-mapping`.
- **Lý do**: Khách hàng yêu cầu rõ: *"cái file này phải là được truyền động về từ BE theo những gì đã làm từ trước"*. Frontend sẽ fetch động và cache trong runtime giống như `getAdministrativeUnits()`.
- **Phương án thay thế đã loại bỏ**: Bundling JSON trực tiếp vào build của Next.js (bị loại vì vi phạm nguyên tắc truyền động từ BE).

### 2. Loại bỏ Logic Đoán Phường Cũ Ngầm trong Code
- **Quyết định**: Xóa hàm `resolveNewWardName` tự động đoán số phường cũ và xóa `mapOldWardToNewWards` ngầm trong Backend tính ship.
- **Lý do**: Khách hàng yêu cầu rõ: *"Quán vận hành hoàn toàn theo PHƯỜNG/XÃ MỚI. Bỏ mọi logic tự quy đổi / tự đoán phường cũ → mới (code web, CMS, API)"*. Phường chỉ được xác định bằng Phường Mới khách chọn trên giao diện hoặc chọn từ Modal tra cứu.

### 3. Thiết kế Modal Tra Cứu Phường Cũ ➔ Mới (`WardLookupModal`)
- **Quyết định**: Modal tra cứu là một thành phần UI độc lập, hiển thị 2 bộ lọc:
  1. Dropdown Quận/Huyện cũ (Quận 1, Quận 3, Bình Thạnh, Gò Vấp...).
  2. Dropdown / Search Phường/Xã cũ thuộc quận đó.
  3. Kết quả: Tên Phường Mới tương ứng, ghi chú sáp nhập (nếu có một phần), và nút bấm `[Chọn phường này]` để cập nhật state `selectedWard` và `selectedWardId` trên form chính.
- **Lý do**: Đảm bảo khách hàng dễ dàng tìm kiếm mà hệ thống không lưu trữ hay xử lý bất kỳ trường dữ liệu phường cũ nào trong đơn hàng.

### 4. Đóng Băng Phí Giao Hàng trong Tổng Thanh Toán khi Chờ Xác Nhận
- **Quyết định**: Trong `CheckoutForm.tsx`, khi `hasUnconfirmedAddressWarning = true`, biến `effectiveShippingFeeForTotal` sẽ bằng 0 (hoặc không cộng vào `total`).
- **Lý do**: Khắc phục lỗi STT 4 trong file test case: khi đang chờ khách bấm giữ phường hoặc đổi phường, phí giao hàng chưa được chốt thì Tổng thanh toán không được tự ý cộng 20.000đ.

### 5. Chặn Lỗi API Tính Ship Thất Bại
- **Quyết định**: Thêm state `shippingCalculationError: boolean`. Khi API `/shipping/calculate` trả về lỗi hoặc timeout, bật `shippingCalculationError = true`, hiển thị thông báo *"Chưa tính được phí ship, vui lòng thử lại"* và disable nút Đặt hàng.

## Risks / Trade-offs

- **[Khách hàng dùng địa chỉ đã lưu cũ có chứa tên phường cũ]** → **Mitigation**: Trong `CheckoutForm.tsx`, khi khách chọn một địa chỉ đã lưu từ sổ địa chỉ, hệ thống kiểm tra `ward_id` và tên phường. Nếu không khớp với bất kỳ phường nào trong 91 phường mới, hiển thị thông báo yêu cầu khách chọn lại Phường Mới trước khi bấm Đặt hàng (đúng theo yêu cầu STT 10).
- **[Thời gian tải dữ liệu mapping từ API Backend]** → **Mitigation**: Lazy load dữ liệu `ward-mapping` chỉ khi người dùng click vào link `Tra cứu phường cũ → mới` hoặc tải ngầm trong `useEffect` với cơ chế cache `stale-while-revalidate`.
