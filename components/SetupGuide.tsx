
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

// FIX: Removed props as API key is no longer managed via UI state.
interface SetupGuideProps {}

const SetupGuide: React.FC<SetupGuideProps> = () => {
    const [os, setOs] = React.useState('windows');

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
                    這就是讓 Bot 24 小時運作的方法。我們將程式碼放到免費的雲端平台 <strong>Render.com</strong> 上。
                </p>

                <div className="bg-gray-900/50 p-6 rounded-lg border border-purple-500/30">
                    <h3 className="text-lg font-bold text-purple-300 mb-4">Render 部署與更新步驟：</h3>
                    <ol className="list-decimal list-inside text-gray-300 space-y-4">
                        <li>
                            <strong className="text-white">初次部署：</strong>
                            <div className="pl-6 mt-1 text-sm text-gray-400">
                                將程式碼上傳至 GitHub。在 Render 新增 Web Service 連結 GitHub。設定環境變數 (LINE 金鑰)。設定 LINE Webhook。
                            </div>
                        </li>
                        <li>
                            <strong className="text-yellow-300">如何更新程式碼？</strong>
                            <div className="pl-6 mt-1 text-sm text-gray-400">
                                當您在電腦上修改了 Bot 的功能後 (例如本網頁幫您產生的新程式碼)，您只需要：
                                <ul className="list-disc list-inside mt-2 text-cyan-200">
                                    <li>將新檔案覆蓋舊檔案。</li>
                                    <li>使用 Git 提交變更 (Commit)。</li>
                                    <li>推送到 GitHub (Push)。</li>
                                </ul>
                                <p className="mt-2">Render 會自動偵測到 GitHub 的變更，並在幾分鐘內自動重新部署您的新版 Bot，您不需要在 Render 上做任何操作！</p>
                            </div>
                        </li>
                    </ol>
                </div>
            </div>
        </div>
    );
};

export default SetupGuide;
