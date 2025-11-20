
import React from 'react';

// FIX: Refactored to use a standard interface and React.FC for better type safety and consistency.
// This resolves a potential toolchain issue causing a "children is missing" error.
interface CodeBlockProps {
    children: React.ReactNode;
}
const CodeBlock: React.FC<CodeBlockProps> = ({ children }) => (
    <pre className="bg-gray-900 p-4 my-4 rounded-md text-sm text-cyan-200 overflow-x-auto ring-1 ring-white/10">
        <code>{children}</code>
    </pre>
);

// FIX: Removed hardcoded userLineKeys to prevent usage of invalid credentials and improve security.
// The user will now be instructed to fill in their own keys in the script.

// FIX: Removed props as API key is no longer managed via UI state.
interface SetupGuideProps {}

const SetupGuide: React.FC<SetupGuideProps> = () => {
    const [os, setOs] = React.useState('windows');

    // FIX: Updated scripts to use API_KEY and placeholders for all required user-specific keys.
    const windowsScript = `@echo off
echo "正在設定您的專屬金鑰..."
set LINE_CHANNEL_SECRET="在此貼上您的_LINE_CHANNEL_SECRET"
set LINE_CHANNEL_ACCESS_TOKEN="在此貼上您的_LINE_CHANNEL_ACCESS_TOKEN"
set API_KEY="在此貼上您的_GOOGLE_GEMINI_API_金鑰"
set PORT=3000

echo "正在檢查並安裝必要的套件 (npm install)..."
call npm install

echo "正在背景啟動 Cloudflare 安全通道..."
start "Cloudflare Tunnel" cloudflared.exe tunnel --url http://localhost:3000

echo " "
echo "--- 正在此視窗啟動您的 Bot 伺服器 ---"
echo "請保持此視窗開啟，並觀察是否有錯誤訊息。"
echo "請複製 Cloudflare 視窗中的 .trycloudflare.com 網址並設定到 LINE Webhook。"
echo " "
node server.js
`;

    // FIX: Updated scripts to use API_KEY and placeholders for all required user-specific keys.
    const macScript = `#!/bin/bash
echo "正在設定您的專屬金鑰..."
export LINE_CHANNEL_SECRET="在此貼上您的_LINE_CHANNEL_SECRET"
export LINE_CHANNEL_ACCESS_TOKEN="在此貼上您的_LINE_CHANNEL_ACCESS_TOKEN"
export API_KEY="在此貼上您的_GOOGLE_GEMINI_API_金鑰"
export PORT=3000

echo "正在檢查並安裝必要的套件 (npm install)..."
npm install

echo "正在背景啟動您的 Bot 伺服器..."
node server.js &
SERVER_PID=$!
echo "伺服器已啟動 (PID: $SERVER_PID)。"
sleep 2

echo " "
echo "正在啟動 Cloudflare 安全通道..."
echo "請複製下方的 .trycloudflare.com 網址並設定到 LINE Webhook。"
echo " "
./cloudflared tunnel --url http://localhost:3000

trap "echo '正在關閉背景伺服器...'; kill $SERVER_PID" EXIT
`;


    return (
        <div className="bg-gray-800 p-4 sm:p-6 rounded-lg ring-1 ring-white/10 h-full">
            <h1 className="text-2xl font-bold text-cyan-400 mb-4 border-b border-gray-700 pb-2">LINE Bot 架設指南</h1>
            <p className="text-gray-300 mb-6">
                本指南提供兩種架設方式：<br/>
                1. <span className="text-cyan-400 font-bold">本機測試</span>：適合快速測試，但電腦關機 Bot 就會停止。<br/>
                2. <span className="text-purple-400 font-bold">雲端部署</span>：適合長期使用，不用開電腦也能 24 小時運作。
            </p>
            
            <h2 className="text-xl font-semibold text-yellow-300 mt-6 mb-3">步驟零：取得三組必要的鑰匙</h2>
             <ol className="list-decimal list-inside text-gray-400 space-y-2 mb-6 pl-4">
                    <li>前往 <a href="https://developers.line.biz/console/" target="_blank" rel="noopener noreferrer" className="text-cyan-400 hover:underline">LINE Developers Console</a> 取得 `Channel Secret` 和 `Channel Access Token`。</li>
                    <li>前往 <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="text-cyan-400 hover:underline">Google AI Studio</a> 取得您的 `API Key`。</li>
                    <li>請將這三組金鑰妥善保存，無論哪種部署方式都會用到。</li>
                </ol>
            
            <div className="border-t border-gray-700 pt-6">
                <h2 className="text-2xl font-bold text-white mb-4">方式一：本機快速測試 (需保持電腦開啟)</h2>
                
                <h3 className="text-lg font-semibold text-cyan-300 mt-4 mb-2">1. 準備 Cloudflare Tunnel</h3>
                <p className="text-gray-300 mb-2">前往 <a href="https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/downloads/" target="_blank" rel="noopener noreferrer" className="text-cyan-400 hover:underline">Cloudflare 下載頁面</a> 下載 `cloudflared`，並將執行檔直接放入專案根目錄。</p>

                <h3 className="text-lg font-semibold text-cyan-300 mt-4 mb-2">2. 執行啟動腳本</h3>
                <p className="text-gray-300 mb-2">建立 `start` 腳本檔案，貼上以下內容並<strong className="text-yellow-300">填入您的金鑰</strong>，然後執行它。</p>
                
                <div className="flex space-x-2 border-b border-gray-700 mb-4 mt-4">
                    <button onClick={() => setOs('windows')} className={`px-4 py-2 text-sm font-medium rounded-t-lg ${os === 'windows' ? 'bg-gray-900 text-cyan-300' : 'text-gray-400 hover:bg-gray-700'}`}>
                        Windows (start.bat)
                    </button>
                    <button onClick={() => setOs('mac')} className={`px-4 py-2 text-sm font-medium rounded-t-lg ${os === 'mac' ? 'bg-gray-900 text-cyan-300' : 'text-gray-400 hover:bg-gray-700'}`}>
                        macOS / Linux (start.sh)
                    </button>
                </div>

                {os === 'windows' && <CodeBlock>{windowsScript}</CodeBlock>}
                {os === 'mac' && <CodeBlock>{macScript}</CodeBlock>}

                <h3 className="text-lg font-semibold text-cyan-300 mt-4 mb-2">3. 設定 Webhook</h3>
                <p className="text-gray-300 mb-4">複製終端機顯示的 Cloudflare 網址 (https://...trycloudflare.com)，加上 `/webhook` 後，貼到 LINE Console 的 Webhook URL 欄位並啟用。</p>
            </div>

            <div className="mt-12 pt-8 border-t-2 border-gray-600">
                <h2 className="text-2xl font-bold text-purple-400 mb-4 flex items-center">
                    <span className="mr-2">☁️</span> 方式二：雲端部署 (推薦，不用開電腦)
                </h2>
                <p className="text-gray-300 mb-6">
                    如果您希望 Bot 能夠 24 小時運作，且不佔用您的個人電腦資源，您可以將程式碼部署到雲端平台。
                    推薦使用 <strong>Render.com</strong> (有免費方案) 或 <strong>Railway</strong>。
                </p>

                <div className="bg-gray-900/50 p-6 rounded-lg border border-purple-500/30">
                    <h3 className="text-lg font-bold text-purple-300 mb-4">部署步驟 (以 Render 為例)：</h3>
                    <ol className="list-decimal list-inside text-gray-300 space-y-4">
                        <li>
                            <strong className="text-white">上傳程式碼到 GitHub：</strong>
                            <div className="pl-6 mt-1 text-sm text-gray-400">
                                將您的專案檔案 (包含 server.js, package.json 等) 上傳到一個 GitHub Repository。
                            </div>
                        </li>
                        <li>
                            <strong className="text-white">註冊 Render 並建立 Web Service：</strong>
                            <div className="pl-6 mt-1 text-sm text-gray-400">
                                前往 Render.com，選擇 "New Web Service"，並連結您的 GitHub Repository。
                            </div>
                        </li>
                        <li>
                            <strong className="text-white">設定環境變數 (Environment Variables)：</strong>
                            <div className="pl-6 mt-1 text-sm text-gray-400">
                                在 Render 的設定頁面中，找到 Environment 區塊，新增以下三個變數：
                                <ul className="list-disc list-inside mt-2 text-purple-200 font-mono">
                                    <li>API_KEY: 您的 Google Gemini Key</li>
                                    <li>LINE_CHANNEL_SECRET: 您的 LINE Channel Secret</li>
                                    <li>LINE_CHANNEL_ACCESS_TOKEN: 您的 LINE Token</li>
                                </ul>
                            </div>
                        </li>
                        <li>
                            <strong className="text-white">取得網址並設定 LINE Webhook：</strong>
                            <div className="pl-6 mt-1 text-sm text-gray-400">
                                部署完成後，Render 會給您一個網址 (例如 `https://xxx.onrender.com`)。
                                將此網址加上 `/webhook` (即 `https://xxx.onrender.com/webhook`)，填入 LINE Developers Console 即可。
                            </div>
                        </li>
                    </ol>
                    <div className="mt-6 bg-purple-900/20 p-3 rounded text-sm text-purple-200 border border-purple-500/20">
                        💡 提示：雲端部署後，您就不需要再執行本機的 `start.bat` 或 Cloudflare 了！
                    </div>
                </div>
            </div>

            <div className="mt-8 pt-6 border-t border-gray-700">
                <h2 className="text-xl font-semibold text-teal-300 mb-3">最後檢查：LINE 官方帳號設定</h2>
                <p className="text-gray-300 mb-4">無論是用本機還是雲端，請務必記得調整 LINE 後台設定，以免出現自動回覆干擾。</p>
                <ul className="list-disc list-inside text-gray-400 space-y-2 pl-4">
                    <li>Response mode 改為 <strong>"Bot"</strong></li>
                    <li>Webhook 設為 <strong>"Enabled"</strong></li>
                    <li>Auto-response messages 設為 <strong>"Disabled"</strong></li>
                </ul>
            </div>
        </div>
    );
};

export default SetupGuide;
