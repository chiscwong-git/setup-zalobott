# Zalo Bot & Google Sheet Integration

Dự án này cung cấp mã nguồn Google Apps Script để kết nối Zalo Bot với Google Sheets, cho phép tạo hệ thống hỏi đáp tự động (Q&A) dựa trên từ khóa một cách nhanh chóng.

## Tính năng

- **Kết nối Webhook:** Nhận tin nhắn từ Zalo Bot Platform.
- **Tìm kiếm thông minh:** 
    - Không phân biệt chữ hoa chữ thường.
    - Tự động loại bỏ dấu tiếng Việt để tìm kiếm (không dấu/có dấu đều được).
    - Bỏ qua các dấu câu và khoảng trắng thừa.
    - Cơ chế chấm điểm (scoring) để tìm câu trả lời phù hợp nhất dựa trên tỉ lệ trùng khớp từ.
- **Fallback:** Tự động phản hồi khi không tìm thấy kết quả phù hợp giúp bạn dễ dàng gỡ lỗi (debug).

## Hướng dẫn cài đặt

### 1. Chuẩn bị Google Sheet
- Tạo một Google Sheet mới.
- **Cột A:** Nhập các từ khóa tìm kiếm.
- **Cột B:** Nhập câu trả lời tương ứng.

### 2. Thiết lập Google Apps Script
- Trong Google Sheet, chọn **Extensions (Tiện ích mở rộng) > Apps Script**.
- Copy nội dung file `code.gs` và dán vào trình biên tập Apps Script.
- Thay thế `YOUR_BOT_TOKEN_HERE` bằng **Bot Token** bạn nhận được từ Zalo Bot Creator.

### 3. Triển khai (Deploy)
- Nhấn **Deploy > New deployment**.
- Chọn loại là **Web app**.
- **Execute as:** Chọn Me (Tôi).
- **Who has access:** Chọn Anyone (Bất kỳ ai).
- Nhấn **Deploy** và copy **Web app URL**.

### 4. Kết nối Webhook
- Trong file `code.gs`, tìm hàm `setWebhook`.
- Thay thế `YOUR_WEB_APP_URL_HERE` bằng URL bạn vừa copy ở bước trên.
- Chọn hàm `setWebhook` ở trình đơn thả xuống trên thanh công cụ và nhấn **Run (Chạy)**.
- Khi thấy thông báo `ok: true` là bạn đã kết nối thành công.

## Cấu trúc thư mục

- `code.gs`: Toàn bộ mã nguồn xử lý logic của Bot (Google Apps Script).
- `README.md`: Hướng dẫn này.

## Giấy phép

Dự án này được chia sẻ tự do cho mục đích học tập và phát triển.
