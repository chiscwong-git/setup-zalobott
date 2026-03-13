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
        sendMessage(chatId, "Tin nhắn của bạn: '" + userText + "'. Tôi chưa tìm thấy câu trả lời phù hợp trong Google Sheet, bạn có thể kiểm tra lại từ khóa nhé!");
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
