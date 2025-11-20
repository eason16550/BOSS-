
// FIX: Switched to ES Module syntax (import/export) to align with modern standards and fix frontend import errors.
import 'dotenv/config'; // Load environment variables from .env file
import express from 'express';
import line from '@line/bot-sdk';
import { BOSS_DATA } from './bot-constants.js';
import { processUserCommand, getTaipeiTimeHHMMSS } from './logic/bossLogic.js';

// --- Helper function to clean keys ---
const cleanKey = (key) => {
    if (!key) return '';
    // 1. Trim whitespace from both ends
    let cleaned = key.trim();
    // 2. If the string starts and ends with a quote, remove them
    if ((cleaned.startsWith('"') && cleaned.endsWith('"')) || (cleaned.startsWith("'") && cleaned.endsWith("'"))) {
        cleaned = cleaned.substring(1, cleaned.length - 1);
    }
    return cleaned;
};


// --- Configuration ---
// Use environment variables exclusively for configuration.
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
// For a production bot, you would replace this with a database (e.g., Redis, Firestore, etc.)
const bossDeathTimes = {};

// --- LINE Webhook Handler ---
async function handleEvent(event) {
  if (event.type !== 'message' || event.message.type !== 'text') {
    return Promise.resolve(null);
  }

  const userMessage = event.message.text.trim();
  
  // Handle '重置' command directly for state management
  if (userMessage === '重置') {
      for (const key in bossDeathTimes) {
          delete bossDeathTimes[key];
      }
      console.log('Boss death times have been reset by user command.');
      const reply = { type: 'text', text: '所有頭目死亡紀錄已清除。' };
      return client.replyMessage(event.replyToken, reply);
  }

  // --- Update State Logic ---
  
  // Prepare alias map for name resolution
  const aliasToNameMap = new Map();
  BOSS_DATA.forEach(boss => {
      aliasToNameMap.set(boss.name, boss.name);
      boss.aliases.forEach(alias => {
          aliasToNameMap.set(alias, boss.name);
      });
  });

  // Check for "K <Boss>" command (Current Time)
  const killRegex = /^[Kk]\s+(.+)/;
  const killMatch = userMessage.match(killRegex);

  // Check for "Boss HHMMSS" command (Custom Time)
  const allNamesAndAliases = BOSS_DATA.flatMap(b => [b.name, ...b.aliases]);
  const deathTimeRegex = new RegExp(`(^|\\s)(${allNamesAndAliases.join('|')})\\s*(\\d{6})($|\\s)`);
  const deathTimeMatch = userMessage.match(deathTimeRegex);

  // Update logic
  if (killMatch) {
      const inputName = killMatch[1].trim();
      const canonicalName = aliasToNameMap.get(inputName);
      if (canonicalName) {
          // FIX: Use the helper from bossLogic to get Taiwan Time (UTC+8)
          // Cloud servers (like Render) are usually UTC, so new Date() gives the wrong time for our users.
          const time = getTaipeiTimeHHMMSS();
          
          bossDeathTimes[canonicalName] = time;
          console.log(`Updated death time for ${canonicalName} to ${time} (Taiwan Time)`);
      }
  } else if (deathTimeMatch) {
      const inputName = deathTimeMatch[2];
      const time = deathTimeMatch[3];
      const canonicalName = aliasToNameMap.get(inputName);
      if (canonicalName) {
          bossDeathTimes[canonicalName] = time;
          console.log(`Updated death time for ${canonicalName} to ${time}`);
      }
  }

  // --- Get Local Logic Response ---
  // The processUserCommand handles all recognized commands ('王', '出', death times, K command)
  const responseText = processUserCommand(userMessage, bossDeathTimes);

  // --- Reply to LINE ---
  // Only reply if the command was recognized and generated a response.
  if (responseText) {
    const reply = { type: 'text', text: responseText };
    return client.replyMessage(event.replyToken, reply);
  }

  // If the command is not recognized (e.g., random text), do nothing.
  console.log(`Ignoring unrecognized command: "${userMessage}"`);
  return Promise.resolve(null);
}

// --- Root Route for Keep-Alive Pings ---
// This allows services like UptimeRobot to ping the server to prevent it from sleeping.
app.get('/', (req, res) => {
    res.send('Gemini LINE Bot is awake and running!');
});

// --- Express Route ---
app.post('/webhook', line.middleware(config), (req, res) => {
  console.log("Webhook 驗證成功，正在處理傳入的事件...");
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
  console.log('Please set up a webhook to this server to connect to LINE.');
});
