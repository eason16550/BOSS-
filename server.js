
// FIX: Switched to ES Module syntax (import/export) to align with modern standards and fix frontend import errors.
import 'dotenv/config'; // Load environment variables from .env file
import express from 'express';
import line from '@line/bot-sdk';
import { BOSS_DATA } from './bot-constants.js';
import { processUserCommand, getTaipeiTimeHHMMSS, analyzeMessage } from './logic/bossLogic.js';

// --- Helper function to clean keys ---
const cleanKey = (key) => {
    if (!key) return '';
    let cleaned = key.trim();
    if ((cleaned.startsWith('"') && cleaned.endsWith('"')) || (cleaned.startsWith("'") && cleaned.endsWith("'"))) {
        cleaned = cleaned.substring(1, cleaned.length - 1);
    }
    return cleaned;
};


// --- Configuration ---
const config = {
  channelAccessToken: cleanKey(process.env.LINE_CHANNEL_ACCESS_TOKEN || ""),
  channelSecret: cleanKey(process.env.LINE_CHANNEL_SECRET || ""),
};

const PORT = process.env.PORT || 3000;

// --- Initialization ---
const app = express();
const client = new line.Client(config);


// --- Diagnostic Logging ---
console.log('--- Initializing Server with Config ---');
console.log(`Channel Secret Loaded: ${config.channelSecret ? `Yes, length: ${config.channelSecret.length}` : 'No'}`);
console.log(`Channel Access Token Loaded: ${config.channelAccessToken ? `Yes, length: ${config.channelAccessToken.length}` : 'No'}`);
console.log('------------------------------------');
if (!config.channelSecret || !config.channelAccessToken) {
    console.error("錯誤：一個或多個必要的環境變數 (LINE_CHANNEL_SECRET, LINE_CHANNEL_ACCESS_TOKEN) 遺失。請檢查您的 .env 檔案或啟動腳本。");
}


// --- In-memory State ---
let bossDeathTimes = {};

// --- LINE Webhook Handler ---
async function handleEvent(event) {
  if (event.type !== 'message' || event.message.type !== 'text') {
    return Promise.resolve(null);
  }

  const userMessage = event.message.text.trim();
  
  // Use the centralized command analyzer from bossLogic.js
  // This ensures the Server understands commands EXACTLY the same way as the Response generator.
  const command = analyzeMessage(userMessage);

  if (command) {
      console.log(`Command recognized: ${command.type}`);
      
      switch (command.type) {
          case 'RESET':
              bossDeathTimes = {};
              break;
              
          case 'BACKUP':
              // Special handling: we want to return the raw JSON string
              const backupStr = JSON.stringify(bossDeathTimes);
              return client.replyMessage(event.replyToken, { type: 'text', text: backupStr });
              
          case 'RESTORE':
              try {
                  const data = JSON.parse(command.data);
                  if (typeof data === 'object') {
                      bossDeathTimes = data;
                      console.log('Data restored successfully.');
                  }
              } catch (e) {
                  console.error('Restore failed:', e);
                  return client.replyMessage(event.replyToken, { type: 'text', text: "還原失敗：格式錯誤。" });
              }
              break;

          case 'KILL':
              // "K <Boss>" -> Record current Taiwan time
              const nowTime = getTaipeiTimeHHMMSS();
              bossDeathTimes[command.name] = nowTime;
              console.log(`Updated death time for ${command.name} to ${nowTime}`);
              break;

          case 'DEATH_TIME':
              // "<Boss> <Time>" -> Record specified time
              bossDeathTimes[command.name] = command.time;
              console.log(`Updated death time for ${command.name} to ${command.time}`);
              break;
              
          default:
              // For LIST_ALL, LIST_UPCOMING, etc., no state update is needed.
              break;
      }
  }

  // --- Get Response Logic ---
  // Now that state is definitely updated (if applicable), generate the response.
  const responseText = processUserCommand(userMessage, bossDeathTimes);

  if (responseText) {
    const reply = { type: 'text', text: responseText };
    return client.replyMessage(event.replyToken, reply);
  }

  return Promise.resolve(null);
}

// --- Root Route for Keep-Alive Pings ---
app.get('/', (req, res) => {
    res.send('Gemini LINE Bot is awake and running!');
});

// --- Express Route ---
app.post('/webhook', line.middleware(config), (req, res) => {
  Promise
    .all(req.body.events.map(handleEvent))
    .then((result) => res.json(result))
    .catch((err) => {
      console.error("處理事件時發生錯誤:", err);
      res.status(500).end();
    });
});

// --- Start Server ---
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
