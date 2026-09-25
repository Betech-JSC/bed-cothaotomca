# Đặc Tả Kỹ Thuật: Thanh Voucher Capsule Pill Bar & Brand UI

## ADDED Requirements

### Requirement: Tiêu đề nằm riêng biệt bên trên khung Capsule (Title Above Capsule)
Hệ thống SHALL hiển thị tiêu đề `Mã giảm giá (Voucher)` ở một dòng riêng biệt, nằm bên ngoài và ở phía trên khung Capsule bao bọc, với font chữ hiển thị TomCaSerif (`font-display`), in đậm `font-bold` và sử dụng màu chữ xanh navy chủ đạo của thương hiệu `text-primary` (`#142A68`).

#### Scenario: Hiển thị tiêu đề chuẩn nhận diện
- **WHEN** người dùng duyệt qua khu vực mã giảm giá tại trang thanh toán Checkout hoặc Drawer giỏ hàng di động
- **THEN** hệ thống hiển thị nhãn tiêu đề "Mã giảm giá (Voucher)" riêng biệt ở phía trên khung capsule với class font-display, font-bold và text-primary (#142A68)

### Requirement: Khung bao bọc dạng viên thuốc hoàn chỉnh (Capsule Container)
Hệ thống SHALL bao bọc toàn bộ các thẻ ưu đãi và các nút bấm thao tác trong một khung chứa dạng viên thuốc bo tròn toàn phần với style `rounded-full border border-gray-300 p-1.5 bg-white flex items-center justify-between gap-2 flex-wrap sm:flex-nowrap`.

#### Scenario: Khung capsule bo tròn toàn phần
- **WHEN** khối voucher được render trên giao diện
- **THEN** khung bao bọc hiển thị với kiểu dáng viên thuốc bo tròn toàn phần (rounded-full), viền xám border-gray-300, nền trắng bg-white và padding p-1.5

### Requirement: Các thẻ ưu đãi dạng viên thuốc chuẩn bảng màu thương hiệu (Pill Chips)
Hệ thống SHALL hiển thị các ưu đãi đã áp dụng dưới dạng các thẻ viên thuốc (Pill Chips) với hình dạng `rounded-full px-3 py-1 text-xs uppercase font-bold`, phân loại rõ ràng theo đúng 3 nhóm màu sắc thương hiệu Cô Thảo Tôm Cá:
1. Thẻ Giảm tiền món/đơn: Màu Cam Brand `#CD4829` (nền `#FDF0ED`, viền `#CD4829`, chữ `#CD4829`).
2. Thẻ Phí vận chuyển / Freeship: Màu Xanh Brand `#142A68` hoặc Xanh ngọc `#00BFA5` (nền `#EBF0FA`, viền `#142A68`, chữ `#142A68`).
3. Thẻ Chiến dịch khuyến mãi / Quà tặng: Màu Vàng kem Brand `#F1EEDF` / Vàng nâu `#8A5800` (nền `#FEF9E7`, viền `#F5D585`, chữ `#8A5800`).

#### Scenario: Áp dụng mã giảm tiền món ăn
- **WHEN** người dùng đã chọn áp dụng 1 mã giảm giá món ăn (ví dụ: giảm 50.000đ)
- **THEN** hệ thống hiển thị Pill Chip có nền phớt cam #FDF0ED, viền #CD4829, chữ #CD4829 in hoa font-bold với nội dung số tiền giảm (ví dụ: "-50.000đ" hoặc "GIẢM 50K")

#### Scenario: Áp dụng mã miễn phí / giảm phí vận chuyển
- **WHEN** người dùng đã chọn áp dụng 1 mã vận chuyển (ví dụ: Freeship hoặc giảm 30.000đ ship)
- **THEN** hệ thống hiển thị Pill Chip có nền phớt xanh #EBF0FA, viền #142A68, chữ #142A68 in hoa font-bold với nội dung (ví dụ: "FREESHIP" hoặc "SHIP 30K")

#### Scenario: Áp dụng đồng thời mã món, mã ship và chiến dịch giỏ hàng
- **WHEN** người dùng áp dụng cùng lúc voucher món ăn, voucher freeship và giỏ hàng có ưu đãi chiến dịch tự động
- **THEN** hệ thống hiển thị song song các Pill Chips tương ứng trong khung capsule: chip Cam cho món, chip Xanh cho ship, và chip Vàng kem cho chiến dịch

### Requirement: Tích hợp các nút thao tác viên thuốc bên trong khung (Action Buttons)
Hệ thống SHALL bố trí các nút thao tác dạng viên thuốc ngay bên trong khung capsule:
1. Nút "Chọn mã": Dạng viên thuốc `rounded-full px-3.5 py-1 text-xs font-bold bg-gray-100 hover:bg-gray-200 text-gray-700 cursor-pointer`. Khi người dùng click, hệ thống SHALL kích hoạt callback mở `CouponModal`.
2. Nút "Xóa": Dạng viên thuốc `rounded-full px-3 py-1 text-xs font-bold bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 cursor-pointer`. Nút này CHỈ hiển thị khi có ít nhất một mã ưu đãi đang áp dụng. Khi người dùng click, hệ thống SHALL gọi callback gỡ mã (`onRemove`).

#### Scenario: Click nút Chọn mã mở modal voucher
- **WHEN** người dùng nhấn vào nút "Chọn mã" bên trong khung capsule
- **THEN** hệ thống mở modal Ví ưu đãi CouponModal để người dùng duyệt và chọn mã

#### Scenario: Click nút Xóa gỡ bỏ toàn bộ mã đã áp dụng
- **WHEN** đang có mã ưu đãi được áp dụng và người dùng nhấn nút "Xóa"
- **THEN** hệ thống gọi callback gỡ mã, đưa trạng thái voucher về rỗng và ẩn nút "Xóa"

### Requirement: Trạng thái khi chưa chọn mã (Empty State)
Khi chưa có bất kỳ mã ưu đãi nào được áp dụng, hệ thống SHALL hiển thị văn bản gợi ý `Chưa áp dụng mã ưu đãi` (hoặc để trống) cùng nút `Chọn mã` nổi bật bên trong khung capsule.

#### Scenario: Hiển thị trạng thái rỗng
- **WHEN** giỏ hàng chưa áp dụng bất kỳ mã voucher nào
- **THEN** khung capsule hiển thị văn bản placeholder "Chưa áp dụng mã ưu đãi" (màu xám text-gray-400) ở bên trái và nút "Chọn mã" ở bên phải, không hiển thị nút "Xóa"

### Requirement: Dòng trạng thái phản hồi tích cực và ghi chú điều kiện bên dưới khung (Status & Notes)
Khi có ít nhất một mã ưu đãi đã được áp dụng thành công, hệ thống SHALL hiển thị dòng thông báo trạng thái `✓ Đã áp dụng thành công X ưu đãi!` (với icon dấu tích xanh lá và chữ màu xanh lá đậm) ngay bên dưới khung capsule. Đồng thời, hệ thống SHALL hiển thị các ghi chú điều kiện khuyến mãi (nếu có) như thông tin đơn hàng tối thiểu hoặc thông báo điều kiện loại trừ lẫn nhau.

#### Scenario: Hiển thị dòng trạng thái thành công khi áp dụng ưu đãi
- **WHEN** người dùng áp dụng thành công 1 hoặc nhiều ưu đãi
- **THEN** hệ thống hiển thị dòng chữ thông báo dạng "✓ Đã áp dụng thành công X ưu đãi!" với icon checkmark màu xanh lá bên dưới khung capsule

#### Scenario: Hiển thị ghi chú điều kiện áp dụng khi có ràng buộc
- **WHEN** mã ưu đãi đang áp dụng có điều kiện đi kèm (ví dụ: giá trị đơn hàng tối thiểu hoặc thông báo ma trận khuyến mãi)
- **THEN** hệ thống hiển thị dòng ghi chú bổ sung bên dưới dòng trạng thái với kích thước chữ nhỏ gọn dễ đọc

### Requirement: Hỗ trợ đa ngôn ngữ và Accessibility (i18n & a11y)
Hệ thống SHALL sử dụng các khóa dịch trong tệp `src/i18n/locales/vi.json` và `en.json` cho toàn bộ văn bản hiển thị trên giao diện thanh voucher. Đồng thời, hệ thống SHALL cung cấp các thuộc tính trợ năng `aria-label`, `role="button"`, và hỗ trợ điều hướng bàn phím đầy đủ cho các nút thao tác.

#### Scenario: Hiển thị chính xác theo ngôn ngữ đã chọn
- **WHEN** người dùng chuyển đổi ngôn ngữ giữa Tiếng Việt và Tiếng Anh
- **THEN** tất cả các nhãn tiêu đề, văn bản placeholder, nút "Chọn mã", nút "Xóa" và thông báo trạng thái thành công đều được chuyển đổi tương ứng theo cấu hình i18n
