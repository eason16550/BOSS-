# Gemini AI LINE Bot 設定指南 (全新 simplified 版)

這份文件將引導您一步一步地設定您的 AI 助理，並將它變成一個功能完整的 LINE Bot！

---

## 步驟一：取得三組必要的「鑰匙」

在開始之前，我們需要從三個不同的地方取得金鑰與憑證。

### 1. LINE 的鑰匙 (Channel Secret & Access Token)

1.  前往 [LINE Developers Console](https://developers.line.biz/console/) 並登入。
2.  建立一個新的 "Provider" (如果您還沒有的話，可以想成是您的開發者名稱)。
3.  在 Provider 內，點擊 "Create a new channel"，並選擇 "Messaging API"。
4.  填寫頻道的基本資料，例如名稱和圖示。
5.  建立成功後，進入頻道的 "Messaging API" 標籤頁。
6.  複製 **Channel secret** 的值，這就是第一把鑰匙。
7.  往下捲動，找到 **Channel access token** 區塊，點擊 "Issue" 按鈕，然後複製產生的長字串，這是第二把鑰匙。

### 2. Google Gemini 的鑰匙 (API Key)

1.  前往 [Google AI Studio](https://aistudio.google.com/app/apikey) 並登入您的 Google 帳號。
2.  點擊 "Create API key in new project"，然後複製產生的 API 金鑰。這是我們的第三把鑰匙。

### 3. Ngrok：為您的電腦建立一個臨時的公開網址

LINE 需要一個公開的網址才能和您的電腦溝通。Ngrok 就是能幫我們做到這件事的工具。

1.  前往 [Ngrok 官方網站](https://ngrok.com/download) 下載適合您作業系統的版本並完成安裝。我們稍後會用到它。

---

## 步驟二：設定您的專案

現在我們有了所有鑰匙，是時候設定專案了。

### 1. 填寫您的鑰匙

1.  在專案的根目錄中，找到 `.env` 檔案。**如果這個檔案不存在，請直接在您的程式碼編輯器中建立一個名為 `.env` 的新檔案。**
2.  將下方內容複製貼到 `.env` 檔案中，並將您的三把鑰匙貼到對應的位置：

    ```
    # LINE Bot 設定
    LINE_CHANNEL_SECRET="[請貼上您的 Channel Secret]"
    LINE_CHANNEL_ACCESS_TOKEN="[請貼上您的 Channel Access Token]"

    # Google Gemini API 設定
    API_KEY="[請貼上您的 Gemini API Key]"

    # 伺服器通訊埠 (保持 3000 即可)
    PORT=3000
    ```

### 2. 安裝專案套件

打開您的終端機 (Terminal)，移動到專案的根目錄，然後執行這個指令。它會自動下載所有需要的程式庫。

```bash
npm install
```

---

## 步驟三：啟動 Bot 並連上 LINE！

這是最後一步了！我們需要同時執行兩個程式：您的 Bot 伺服器和 Ngrok。

**⚠️ 重要：您需要打開兩個獨立的終端機視窗來執行以下指令。**

| 終端機 1: 啟動您的 Bot | 終端機 2: 啟動 Ngrok |
| --- | --- |
| 在第一個終端機中，執行以下指令來啟動伺服器：<br><br>```bash
npm start
```<br><br>您應該會看到 "Server is running on port 3000" 的訊息。請讓這個視窗保持開啟。 | 在第二個終端機中，執行以下指令：<br><br>```bash
ngrok http 3000
```<br><br>Ngrok 會顯示一個 "Forwarding" 網址，看起來像 `https://xxxx-xx-xx-xx-xx.ngrok-free.app`。請複製這個 **https** 開頭的網址。 |

### 最後一步：設定 Webhook

1.  回到 LINE Developers Console 的 "Messaging API" 標籤頁。
2.  找到 "Webhook settings" 區塊。
3.  在 "Webhook URL" 欄位中，貼上您從 Ngrok 複製的網址，並在**網址最後面加上 `/webhook`**。
    -   範例：`https://xxxx-xx-xx-xx-xx.ngrok-free.app/webhook`
4.  點擊 "Update" 儲存，然後點擊 "Verify" 測試連線。如果出現 "Success"，就代表成功了！
5.  **啟用 "Use webhook"** 的開關。這個步驟非常重要！

---

## 🎉 恭喜！您已完成設定！

現在，將您的 Bot 加入任何 LINE 聊天室，然後試著傳送「王」或「出」來和它互動吧！

> **重要提醒**
> Ngrok 的免費版每次重新啟動時都會產生一個新的網址。如果您關閉了 Ngrok 終端機，下次就需要重複「步驟三」並用新的網址去更新 LINE Webhook URL。