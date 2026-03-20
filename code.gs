/**
 * Zalo Bot & Google Sheet Integration
 * 
 * Instructions:
 * 1. Open your Google Sheet.
 * 2. Go to Extensions > Apps Script.
 * 3. Copy and paste this code into the editor.
 * 4. Replace 'YOUR_BOT_TOKEN_HERE' with your actual Zalo Bot Token.
 * 5. Deploy as Web App: Deploy > New deployment > Select type: Web app.
 *    - Execute as: Me
 *    - Who has access: Anyone
 * 6. Copy the Web App URL.
 * 7. Run the 'setWebhook' function in the Apps Script editor once to link Zalo to this script.
 */

const BOT_TOKEN = 'YOUR_BOT_TOKEN_HERE';
const API_BASE_URL = `https://bot-api.zaloplatforms.com/bot${BOT_TOKEN}`;
const GOOGLE_AI_KEY = "[AI_API_KEY]";

/**
 * Handles incoming POST requests from Zalo Webhook
 */
function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    
    // Check if it's a text message event
    if (data.event_name === 'message.text.received') {
      const message = data.message;
      const chatId = message.chat.id;
      const userText = message.text;
      
      // Dòng này giúp bạn lấy ID người nhắn:
      console.log('Zalo User ID mới nhắn tin: ' + chatId);
      
      // Hiển thị trạng thái "đang soạn tin nhắn"
      sendChatAction(chatId, 'typing');
      
      // Find answer from Google Sheet
      const answer = findAnswer(userText);
      
      if (answer) {
        if (answer.photo) {
          sendPhoto(chatId, answer.photo, answer.text);
        } else {
          sendMessage(chatId, answer.text);
        }
      } else {
        // Reply if no keyword found
        const fallbackMsg = `Tin nhắn của bạn: '${userText}'.\nTôi chưa tìm thấy câu trả lời phù hợp trong Google Sheet, bạn có thể kiểm tra lại từ khóa nhé!\n\n💡 [DÀNH CHO QUẢN LÝ] Zalo User ID của bạn là:\n${chatId}\n\n(Bạn có thể sao chép ID trên để điền vào sheet Config nhé)`;
        sendMessage(chatId, fallbackMsg);
      }
    }
    
    return ContentService.createTextOutput(JSON.stringify({ status: 'ok' }))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (error) {
    console.error('Error in doPost:', error);
    return ContentService.createTextOutput(JSON.stringify({ status: 'error', message: error.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * Normalizes text: removes accents, converts to lowercase, removes punctuation and extra spaces.
 */
function normalizeString(str) {
  if (!str) return '';
  return str.toString()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "") // Remove accents
            .replace(/đ/g, "d").replace(/Đ/g, "D") // Handle 'đ'
            .toLowerCase()
            .replace(/[^\w\s]/gi, ' ') // Replace punctuation with space
            .replace(/\s+/g, ' ') // Replace multiple spaces with single space
            .trim();
}

/**
 * Searches for a keyword in the current Google Sheet
 * Handles Vietnamese accents, punctuation, and selects the most relevant answer
 */
function findAnswer(query) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  const data = sheet.getDataRange().getValues();
  
  const normQuery = normalizeString(query);
  const queryWords = normQuery.split(' ');
  
  let bestMatch = null;
  let highestScore = 0;
  
  // Start from second row (skip header)
  for (let i = 1; i < data.length; i++) {
    const rawKeyword = data[i][0];
    const answerText = data[i][1];
    const answerPhoto = data[i][2] ? data[i][2].toString().trim() : '';
    
    if (!rawKeyword || !answerText) continue;

    const normKeyword = normalizeString(rawKeyword);
    const currentAnswer = { text: answerText.toString(), photo: answerPhoto };
    
    // Exact match after normalization wins immediately
    if (normKeyword === normQuery) {
      return currentAnswer;
    }
    
    // Check if the whole normalized keyword is in the query (substring match)
    if (normQuery.includes(normKeyword) && normKeyword.length > 3) {
      // Very strong match
      const score = normKeyword.split(' ').length * 10;
      if (score > highestScore) {
        highestScore = score;
        bestMatch = currentAnswer;
      }
      continue;
    }

    // Otherwise, do a word-by-word intersection score
    const keywordWords = normKeyword.split(' ');
    let score = 0;
    
    for (const kw of keywordWords) {
      if (kw.length < 2) continue; // Ignore very short words like "a", "i"
      if (queryWords.includes(kw)) {
        score++;
      }
    }
    
    // We require at least 50% of the words in the keyword to be present in the query
    // Or if the score is high enough.
    const matchRatio = score / keywordWords.length;
    
    if (matchRatio >= 0.5 && score > highestScore) {
      highestScore = score;
      bestMatch = currentAnswer;
    }
  }
  
  return bestMatch;
}

/**
 * Sends a chat action (like 'typing') to Zalo
 */
function sendChatAction(chatId, action) {
  const url = `${API_BASE_URL}/sendChatAction`;
  const payload = {
    chat_id: chatId,
    action: action
  };
  
  const options = {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  };
  
  UrlFetchApp.fetch(url, options);
}

/**
 * Sends a text message back to Zalo
 */
function sendMessage(chatId, text) {
  const url = `${API_BASE_URL}/sendMessage`;
  const payload = {
    chat_id: chatId,
    text: text
  };
  
  const options = {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  };
  
  const response = UrlFetchApp.fetch(url, options);
  console.log('Zalo API Response (Text):', response.getContentText());
  return response;
}

/**
 * Sends a photo message back to Zalo
 */
function sendPhoto(chatId, photoUrl, caption) {
  const url = `${API_BASE_URL}/sendPhoto`;
  const payload = {
    chat_id: chatId,
    photo: photoUrl
  };
  
  if (caption) {
    // Zalo limits caption up to 2000 characters
    payload.caption = caption.length > 2000 ? caption.substring(0, 1997) + "..." : caption;
  }
  
  const options = {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  };
  
  const response = UrlFetchApp.fetch(url, options);
  console.log('Zalo API Response (Photo):', response.getContentText());
  return response;
}

/**
 * Helper function to set the Webhook URL
 * Run this MANUALLY after deploying as Web App
 */
function setWebhook() {
  // Replace with your Web App URL after deployment
  const WEBHOOK_URL = 'YOUR_WEB_APP_URL_HERE';
  
  const url = `${API_BASE_URL}/setWebhook`;
  const payload = {
    url: WEBHOOK_URL,
    secret_token: 'SECRET_TOKEN_HERE'
  };
  
  const options = {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  };
  
  const response = UrlFetchApp.fetch(url, options);
  Logger.log('Set Webhook Response: ' + response.getContentText());
  SpreadsheetApp.getUi().alert('Zalo Webhook Setup', 'Response: ' + response.getContentText(), SpreadsheetApp.getUi().ButtonSet.OK);
}

// ==========================================
// TÍNH NĂNG: BÁO CÁO KINH DOANH CHUỖI TỰ ĐỘNG
// ==========================================

/**
 * Hàm chạy báo cáo hàng ngày.
 * Bạn cần vào Triggers (Kích hoạt) trong Apps Script để cài đặt hàm này chạy tự động mỗi ngày.
 */
function runBaoCaoChuoi() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const rawSheet = ss.getSheetByName("Mặt Hàng Bán Chạy Data.2025"); 
  const configSheet = ss.getSheetByName("Config");
  
  if (!rawSheet || !configSheet) {
    console.error("Không tìm thấy sheet 'Mặt Hàng Bán Chạy Data.2025' hoặc 'Config'");
    return;
  }
  
  const rawData = rawSheet.getDataRange().getValues();
  const configData = configSheet.getDataRange().getValues();

  // --- BƯỚC 1: TỰ ĐỘNG TÌM 2 NGÀY MỚI NHẤT TRONG DATA (Chung cho cả chuỗi) ---
  let allDates = [];
  for (let i = 1; i < rawData.length; i++) {
    if (rawData[i][5]) { 
      let d = new Date(rawData[i][5]).getTime();
      if (!isNaN(d)) allDates.push(d);
    }
  }
  
  let uniqueSortedDates = [...new Set(allDates)].sort((a, b) => b - a);
  
  if (uniqueSortedDates.length < 2) {
    Logger.log("Data mỏng quá, không đủ 2 ngày để so sánh!");
    return;
  }

  let todayTime = uniqueSortedDates[0];
  let yesterdayTime = uniqueSortedDates[1];

  let mangThu = ["Chủ Nhật", "Thứ Hai", "Thứ Ba", "Thứ Tư", "Thứ Năm", "Thứ Sáu", "Thứ Bảy"];

  let todayDate = new Date(todayTime);
  let todayStr = mangThu[todayDate.getDay()] + " " + Utilities.formatDate(todayDate, "GMT+7", "dd/MM/yyyy");
  let yesterdayStr = Utilities.formatDate(new Date(yesterdayTime), "GMT+7", "dd/MM/yyyy");
  
  let shortYest = yesterdayStr.substring(0, 5); 

  // --- BƯỚC VÒNG LẶP: QUÉT TỪNG DÒNG TRONG SHEET CONFIG ---
  for (let j = 1; j < configData.length; j++) {
    let targetStore = configData[j][0]; // Cột A: Tên cơ sở
    let chatId = configData[j][1];      // Cột B: Chat ID (Zalo User ID)
    let childLink = configData[j][3];   // Cột D: Link file con
    
    // Nếu dòng trống thì bỏ qua
    if (!targetStore || !chatId || !childLink) continue;

    // Tự cắt lấy ID từ link
    let matchId = childLink.match(/[-\w]{25,}/);
    if (!matchId) {
      Logger.log("Link/ID file của quán " + targetStore + " bị sai!");
      continue;
    }
    let childFileId = matchId[0];

    // --- BƯỚC 2: QUÉT RAW DATA CHO CƠ SỞ HIỆN TẠI ---
    let revToday = 0;
    let revYesterday = 0;

    for (let i = 1; i < rawData.length; i++) {
      let storeName = rawData[i][0];
      let rowTime = new Date(rawData[i][5]).getTime();
      let netRev = rawData[i][3];

      if (storeName === targetStore) {
        if (rowTime === todayTime) {
          revToday += netRev;
        } else if (rowTime === yesterdayTime) {
          revYesterday += netRev;
        }
      }
    }

    // --- BƯỚC 3: MỞ FILE CON (Export_AI) CỦA CƠ SỞ HIỆN TẠI ---
    let childApp;
    try {
      childApp = SpreadsheetApp.openById(childFileId);
    } catch (e) {
      Logger.log("Không mở được file của quán " + targetStore + ". Hãy check lại quyền Share View.");
      continue; // Bỏ qua quán này nếu lỗi, chạy tiếp quán sau
    }
    
    let exportSheet = childApp.getSheetByName("Export_AI");
    if (!exportSheet) continue;
    let exportData = exportSheet.getDataRange().getValues();

    let kpiNgay = 0, kpiThang = 0, luyKe = 0;
    let slKhachT = 0, slKhachY = 0;
    let nhomBunT = 0, nhomBunY = 0;
    let nhomTopT = 0, nhomTopY = 0;
    let nhomNuocT = 0, nhomNuocY = 0;
    let nhomVatT = 0, nhomVatY = 0;

    for (let i = 1; i < exportData.length; i++) {
      if (!exportData[i][0]) continue;
      let rowTime = new Date(exportData[i][0]).getTime();

      if (rowTime === todayTime) {
        slKhachT = exportData[i][1] || 0;
        kpiNgay = exportData[i][2] || 0;
        kpiThang = exportData[i][3] || 0;
        luyKe = exportData[i][4] || 0;
        nhomBunT = exportData[i][5] || 0;
        nhomTopT = exportData[i][6] || 0;
        nhomNuocT = exportData[i][7] || 0;
        nhomVatT = exportData[i][8] || 0;
      } else if (rowTime === yesterdayTime) {
        slKhachY = exportData[i][1] || 0;
        nhomBunY = exportData[i][5] || 0;
        nhomTopY = exportData[i][6] || 0;
        nhomNuocY = exportData[i][7] || 0;
        nhomVatY = exportData[i][8] || 0;
      }
    }

    // --- BƯỚC 4: TÍNH TOÁN % KPI & TẠO HÀM GHÉP CHUỖI ---
    let ptKpiNgay = kpiNgay > 0 ? ((revToday / kpiNgay) * 100).toFixed(1) : 0;
    let ptKpiThang = kpiThang > 0 ? ((luyKe / kpiThang) * 100).toFixed(1) : 0;

    // --- LOGIC MỚI: TÍNH SỐ TIỀN CẦN CÀY MỖI NGÀY ---
    let textMucTieu = "";
    if (kpiThang > 0) { 
      let targetConLai = kpiThang - luyKe;
      if (targetConLai > 0) {
        let reportDateObj = new Date(todayTime);
        let currentDay = reportDateObj.getDate();
        // Lấy tổng số ngày của tháng đó (VD tháng 3 có 31 ngày)
        let totalDays = new Date(reportDateObj.getFullYear(), reportDateObj.getMonth() + 1, 0).getDate();
        let remainingDays = totalDays - currentDay;
        
        if (remainingDays > 0) {
          let tbNgay = Math.round(targetConLai / remainingDays);
          textMucTieu = `\n🔥 Còn thiếu: ${targetConLai.toLocaleString()}đ ➡️ Phải đạt TB: ${tbNgay.toLocaleString()}đ/ngày (còn ${remainingDays} ngày)`;
        } else {
          textMucTieu = `\n🔥 Còn thiếu: ${targetConLai.toLocaleString()}đ (Nay ngày cuối tháng rồi, chạy ngay đi!)`;
        }
      } else {
        textMucTieu = `\n🔥 Đã VƯỢT KPI tháng! Quá đỉnh!`;
      }
    }

    let formatTrend = (t, y, isMoney) => {
      let percent = "0%";
      if (y !== 0) {
        let g = ((t - y) / y) * 100;
        percent = (g >= 0 ? "+" : "") + g.toFixed(1) + "%";
      } else if (t > 0) percent = "+100%";
      
      let yStr = isMoney ? y.toLocaleString() + "đ" : y;
      return `(${percent} | ${shortYest}: ${yStr})`;
    };

    let revTrend = formatTrend(revToday, revYesterday, true);

    // --- BƯỚC 5: GỬI AI & LÊN TIN NHẮN ---
    let prompt = `Bạn là quản lý chuỗi bún riêu, đang nhắn tin dặn dò cửa hàng trưởng quán: ${targetStore}.
    Dữ liệu ngày ${todayStr} so với ${shortYest}:
    - Doanh thu: ${revToday.toLocaleString()}đ ${revTrend}. Đạt KPI ngày: ${ptKpiNgay}%
    - Lũy kế tháng: ${luyKe.toLocaleString()}đ (Đạt KPI tháng: ${ptKpiThang}%)
    - Lượng khách: ${slKhachT} khách ${formatTrend(slKhachT, slKhachY, false)}
    
    Doanh thu theo nhóm:
    - Bún: ${nhomBunT.toLocaleString()}đ ${formatTrend(nhomBunT, nhomBunY, true)}
    - Topping: ${nhomTopT.toLocaleString()}đ ${formatTrend(nhomTopT, nhomTopY, true)}
    - Đồ uống: ${nhomNuocT.toLocaleString()}đ ${formatTrend(nhomNuocT, nhomNuocY, true)}
    - Ăn vặt: ${nhomVatT.toLocaleString()}đ ${formatTrend(nhomVatT, nhomVatY, true)}
    
    Nhiệm vụ:
    - Viết ĐÚNG 3 gạch đầu dòng ngắn gọn (không chào hỏi).
    - Văn phong: Chuyên nghiệp, khách quan, mang tính thông báo hệ thống vận hành. 
    - TUYỆT ĐỐI KHÔNG xưng hô cá nhân (Cấm dùng: em, anh, nhé, nha, ạ). KHÔNG dùng thuật ngữ tiếng Anh.
    - Dòng 1: Nhận xét thực tế về tình hình doanh thu và lượng khách (tốt hay kém).
    - Dòng 2 & 3 (Hành động thực tế dựa theo data món): 
      + Nếu thấy nhóm món nào TĂNG: Dặn dò check lại tồn kho, chuẩn bị thêm nguyên liệu tránh hết hàng lúc khách đông.
      + Nếu thấy nhóm món nào GIẢM mạnh: Nhắc check lại chất lượng đồ ăn, kiểm tra hạn sử dụng các món dễ hỏng, và nhắc nhân viên chịu khó mời khách gọi thêm.
    - Dòng Bonus, nếu thực sự cần thiết bạn có thể xem có số liệu nào quá bất thường để đưa ra điểm bất thường đó và đề xuất giải pháp dựa theo tri thức của bạn trong kinh doanh quán bún riêu.
    - Vào thẳng vấn đề, không mào đầu. Thêm icon cho sinh động.`;

    let aiText = callGemini(prompt);
    
    let message = `📊 BÁO CÁO CƠ SỞ: ${targetStore}
📅 Ngày báo cáo: ${todayStr}
💰 Doanh thu (net): ${revToday.toLocaleString()}đ ${revTrend}
🎯 KPI Ngày đạt ${ptKpiNgay}% (Target: ${kpiNgay.toLocaleString()}đ)
🎯 KPI Tháng đạt ${ptKpiThang}% tương đương lũy kế ${luyKe.toLocaleString()}đ (Target: ${kpiThang.toLocaleString()}đ)${textMucTieu}
👥 Lượng khách: ${slKhachT} ${formatTrend(slKhachT, slKhachY, false)}

📦 CHI TIẾT NHÓM MÓN:
- Nhóm Bún: ${nhomBunT.toLocaleString()}đ ${formatTrend(nhomBunT, nhomBunY, true)}
- Nhóm Topping: ${nhomTopT.toLocaleString()}đ ${formatTrend(nhomTopT, nhomTopY, true)}
- Nhóm Đồ uống: ${nhomNuocT.toLocaleString()}đ ${formatTrend(nhomNuocT, nhomNuocY, true)}
- Nhóm Ăn vặt: ${nhomVatT.toLocaleString()}đ ${formatTrend(nhomVatT, nhomVatY, true)}

💡 Phân tích nhanh tình hình hoạt động:
${aiText}`;

    // Lấy dữ liệu từ cột B, chuyển thành chuỗi và cắt theo dấu phẩy
    let chatIds = chatId.toString().split(",");
    // Duyệt qua từng ID một
    chatIds.forEach(id => {
      let trimmedId = id.trim();
      if (trimmedId) {
        sendMessage(trimmedId, message);// Gửi tin nhắn Zalo cho từng người
      }
    }); 

    // Nghỉ 6 giây để chống hit rate limit của các API
    Utilities.sleep(6000); 
  }
}

/**
 * Gọi API Gemini để phân tích báo cáo
 */
function callGemini(prompt) {
  var url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=" + GOOGLE_AI_KEY;
  var payload = {
    contents: [ { parts: [ { text: prompt } ] } ]
  };
  var options = {
    method: "post",
    contentType: "application/json",
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  };

  try {
    var res = UrlFetchApp.fetch(url, options);
    var body = res.getContentText();
    var data = JSON.parse(body);

    if (data.candidates) return data.candidates[0].content.parts[0].text;
    if (data.error) {
      if (data.error.code == 429) return "⚠️ AI đang hết quota tạm thời. Thử lại sau.";
      return "⚠️ AI lỗi: " + data.error.message;
    }
    return "AI không trả dữ liệu.";
  } catch (err) {
    Logger.log(err);
    return "⚠️ Lỗi kết nối AI.";
  }
}
