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
- **Cột B:** Nhập câu trả lời (văn bản) tương ứng.
- **Cột C (Tuỳ chọn):** Nhập đường dẫn hình ảnh (URL của ảnh kết thúc bằng `.jpg`, `.png`, v.v.). Zalo Bot sẽ tự động gửi kèm hình ảnh này cùng câu trả lời.

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

## Tính năng Báo cáo Kinh doanh AI
Dự án tích hợp khả năng tự động đọc dữ liệu doanh thù hàng ngày, phân tích bằng AI Gemini và gửi báo cáo định kỳ cho các quản lý cơ sở.

### Cấu hình Sheet `Config`
Để chạy báo cáo chuỗi, bạn cần tạo một sheet tên là **Config** với cấu trúc:
- **Cột A:** Tên cơ sở (Khớp với sheet dữ liệu).
- **Cột B:** Zalo User ID của quản lý (Có thể điền nhiều ID cách nhau bởi dấu phẩy).
- **Cột C:** (Bỏ trống hoặc ghi chú).
- **Cột D:** Link Google Sheet con của cơ sở đó (chứa sheet `Export_AI`).

### Cách lấy Zalo User ID đơn giản
1. Triển khai code và nhắn tin bất kỳ cho Bot (mà từ khoá chưa có trong Sheet).
2. Bot sẽ tự động trả lời kèm theo dòng: **"💡 [DÀNH CHO QUẢN LÝ] Zalo User ID của bạn là: ..."**
3. Sao chép dãy ID này và dán vào cột B của sheet **Config**.

### Thiết lập gửi hàng ngày
- Điền `GOOGLE_AI_KEY` (Gemini API Key) vào đầu file `code.gs`.
- Vào mục **Trình kích hoạt (Triggers)** trong Apps Script.
- Tạo một Trigger mới cho hàm `runBaoCaoChuoi` chạy theo thời gian (ví dụ: hàng ngày lúc 22h-23h).

## Cấu trúc thư mục

- `code.gs`: Toàn bộ mã nguồn xử lý logic của Bot (Google Apps Script).
- `README.md`: Hướng dẫn này.

## Giấy phép

Dự án này được chia sẻ tự do cho mục đích học tập và phát triển.
