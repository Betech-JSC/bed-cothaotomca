# Spec Delta: HCMC New Wards and Dynamic Lookup

## Purpose
Đặc tả nghiệp vụ chuẩn hóa 91 Phường/Xã Mới TP.HCM sau sáp nhập theo Nghị quyết 1685/NQ-UBTVQH15, cung cấp API Backend truyền động dữ liệu tra cứu phường cũ sang mới, Modal tra cứu đối chiếu độc lập, và cơ chế tính phí ship an toàn.

## ADDED Requirements

### Requirement: 91 New Wards Administrative Directory
Hệ thống cửa hàng và backend tính phí giao hàng SHALL chỉ sử dụng danh mục gồm đúng 91 Phường/Xã Mới hợp lệ của TP. Hồ Chí Minh. Các phường cũ đã sáp nhập (Bình Chiểu, Thạnh Xuân) và bản sao (Cát Lái TĐ) SHALL bị loại bỏ khỏi danh mục chọn; 13 đơn vị cấp xã ngoại thành SHALL mang tiền tố chính xác là `Xã`.

#### Scenario: Verify 91 valid new wards in dropdown
- **WHEN** Khách hàng mở dropdown chọn Phường/Xã tại TP. Hồ Chí Minh
- **THEN** Hệ thống hiển thị đúng danh mục 91 Phường/Xã Mới, không chứa `Phường Bình Chiểu`, `Phường Thạnh Xuân` và `Phường Cát Lái (TĐ)`.
- **THEN** 13 đơn vị cấp xã hiển thị rõ tiền tố `Xã` (ví dụ: `Xã Bà Điểm`, `Xã Bình Hưng`, `Xã Bình Lợi`).

#### Scenario: Verify Cát Lái and Bình Lợi configuration
- **WHEN** Khách hàng chọn `Phường Cát Lái` (TP. Thủ Đức)
- **THEN** Hệ thống xác định phí ship chuẩn 40.000đ và chi nhánh phụ trách là Trần Đình Xu (Q.1).
- **WHEN** Khách hàng chọn `Xã Bình Lợi`
- **THEN** Hệ thống hiển thị thuộc Huyện Bình Chánh, phí ship 75.000đ và chi nhánh phụ trách là Tân Bình.

### Requirement: Dynamic Ward Mapping Backend API
Backend SHALL cung cấp endpoint `GET /api/v1/administrative-units/ward-mapping` trả về cấu trúc mapping động gồm danh sách các phường/xã cũ (245 mục), quận cũ, cờ phân chia một phần, và phường mới tương ứng từ file dữ liệu chuẩn `du_lieu_phuong_cu_moi_HCM.json`.

#### Scenario: Storefront fetches dynamic mapping from backend
- **WHEN** Storefront tải trang hoặc người dùng mở Modal Tra Cứu
- **THEN** Hệ thống gọi API `GET /api/v1/administrative-units/ward-mapping` để nhận dữ liệu tra cứu động từ Backend.
- **THEN** Frontend không sử dụng dữ liệu tĩnh hardcode để đảm bảo tính đồng bộ khi Backend cập nhật.

### Requirement: Ward Select Combobox UI with Merger Note
Tại ô chọn Phường/Xã ở trang thanh toán và trang quản lý địa chỉ cá nhân, giao diện SHALL hiển thị tiêu đề, placeholder, dòng ghi chú hướng dẫn chọn phường mới và liên kết mở Modal Tra Cứu theo đúng thiết kế đã chốt.

#### Scenario: Render ward field with merger notice and lookup link
- **WHEN** Khách hàng xem ô Phường/Xã tại form thanh toán hoặc form sổ địa chỉ
- **THEN** Tiêu đề hiển thị: `Phường / Xã (Khu vực giao) *`.
- **THEN** Placeholder hiển thị: `Gõ hoặc chọn phường mới` (EN: `Type or select your new ward`).
- **THEN** Dưới ô hiển thị ghi chú: `Chọn theo tên Phường/Xã MỚI (sau sáp nhập 01/07/2025).` kèm link `Tra cứu phường cũ → mới`.

### Requirement: Standalone Ward Lookup Modal
Hệ thống SHALL cung cấp một Modal tra cứu độc lập giúp khách hàng tra cứu đối chiếu từ Quận cũ và Phường cũ để tìm ra Phường Mới tương ứng. Khi khách hàng nhấn nút `[Chọn]` tại kết quả, hệ thống SHALL tự động điền TÊN PHƯỜNG MỚI vào ô chọn Phường/Xã và không lưu trữ thông tin phường cũ vào đơn hàng.

#### Scenario: Customer looks up old ward and selects new ward
- **WHEN** Khách hàng nhấn link `Tra cứu phường cũ → mới`
- **THEN** Modal Tra Cứu hiển thị danh sách Quận cũ và Phường cũ để lọc.
- **WHEN** Khách hàng chọn Quận cũ `Quận 1` và Phường cũ `Phường Bến Nghé`
- **THEN** Modal hiển thị kết quả Phường Mới tương ứng là `Phường Sài Gòn`.
- **WHEN** Khách hàng nhấn nút `[Chọn phường này]`
- **THEN** Modal đóng lại, ô Phường/Xã tự động được điền `Phường Sài Gòn`, và hệ thống tính phí ship theo đúng Phường Sài Gòn.

### Requirement: Freeze Shipping Fee and Total Calculation on Mismatch Pending
Khi hệ thống phát hiện cảnh báo địa chỉ không khớp với Phường đã chọn và đang chờ khách hàng xác nhận (`hasUnconfirmedAddressWarning = true`), phí giao hàng SHALL hiển thị trạng thái chờ xác nhận và Tổng thanh toán SHALL KHÔNG cộng thêm phí ship vào tổng tiền.

#### Scenario: Address mismatch warning freezes shipping fee in total
- **WHEN** Khách hàng nhập địa chỉ lệch phường và hệ thống hiển thị cảnh báo kèm nút `Địa chỉ của tôi đúng, giữ Phường...`
- **THEN** Dòng Phí giao hàng hiển thị `Vui lòng xác nhận Phường/Xã giao hàng ở trên`.
- **THEN** Tổng thanh toán chỉ bằng tiền hàng trừ giảm giá, không cộng thêm bất kỳ khoản phí ship nào cho đến khi khách nhấn nút giữ hoặc đổi phường.

### Requirement: Strict Shipping Fee Calculation Failure Handling
Khi gọi API tính phí giao hàng gặp lỗi (lỗi mạng, server timeout), hệ thống SHALL KHÔNG tự động gán phí ship bằng 0. Hệ thống SHALL hiển thị thông báo lỗi tính phí và vô hiệu hóa nút Đặt hàng để tránh phát sinh đơn hàng freeship ngoài ý muốn.

#### Scenario: API shipping calculation error blocks order submission
- **WHEN** API `/shipping/calculate` trả về lỗi HTTP 500 hoặc mất kết nối mạng
- **THEN** Khu vực phí giao hàng hiển thị cảnh báo `Chưa tính được phí ship, vui lòng thử lại`.
- **THEN** Nút `Đặt hàng` bị vô hiệu hóa (disabled).
