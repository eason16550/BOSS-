
import React, { useState, useRef, useEffect, useCallback } from 'react';
import type { Message } from './types';
import { Role } from './types';
import { getChatResponse } from './services/geminiService';
// FIX: Import from bot-constants.js to share data with server.js.
// @ts-ignore
import { BOSS_DATA } from './bot-constants.js';
import ChatInput from './components/ChatInput';
import ChatMessage from './components/ChatMessage';
import LoadingSpinner from './components/LoadingSpinner';
import SetupGuide from './components/SetupGuide';

const App: React.FC = () => {
  // FIX: Removed geminiApiKey state to comply with security guidelines.
  // The API key should be handled via environment variables, not user input in the frontend.
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [bossDeathTimes, setBossDeathTimes] = useState<Record<string, string>>({});
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    // FIX: Simplified initial message logic. The app now assumes the API key is configured.
    if (messages.length === 0) {
        setMessages([
            {
                role: Role.MODEL,
                parts: "金鑰已載入！我是您的頭目計時助理。\n\n您可以輸入 '王', '出', '重置', 或頭目死亡時間 (例如: '死騎 143000')，\n或者直接輸入 'K 死騎' 來記錄現在時間。",
            },
        ]);
    }
  }, [messages.length]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  const handleSendMessage = useCallback(async (text: string) => {
    const trimmedText = text.trim();
    if (!trimmedText) return;

    const userMessage: Message = { role: Role.USER, parts: trimmedText };
    setMessages((prevMessages) => [...prevMessages, userMessage]);

    // Handle '重置' command locally
    if (trimmedText === '重置') {
        setBossDeathTimes({});
        const modelMessage: Message = { role: Role.MODEL, parts: "所有頭目死亡紀錄已清除。" };
        setMessages((prevMessages) => [...prevMessages, modelMessage]);
        return;
    }

    const allNamesAndAliases = BOSS_DATA.flatMap((b: any) => [b.name, ...b.aliases]);
    const deathTimeRegex = new RegExp(`(${allNamesAndAliases.join('|')})\\s*(\\d{6})`);
    const killRegex = /^[Kk]\s+(.+)/;

    const isDeathTime = deathTimeRegex.test(trimmedText);
    const isKillCommand = killRegex.test(trimmedText);
    const isAllowedCommand = ['王', '出'].includes(trimmedText) || isDeathTime || isKillCommand;

    // If it's not an allowed command, do nothing further (ignore)
    if (!isAllowedCommand) {
        return;
    }

    let updatedDeathTimes = { ...bossDeathTimes };
    
    // Logic to resolve name and update state
    const updateState = (inputName: string, time: string) => {
        const aliasToNameMap = new Map<string, string>();
        BOSS_DATA.forEach((boss: any) => {
            aliasToNameMap.set(boss.name, boss.name);
            boss.aliases.forEach((alias: string) => {
                aliasToNameMap.set(alias, boss.name);
            });
        });
        const canonicalName = aliasToNameMap.get(inputName);
        if (canonicalName) {
            updatedDeathTimes[canonicalName] = time;
            setBossDeathTimes(updatedDeathTimes);
        }
    };

    if (isDeathTime) {
        const match = trimmedText.match(deathTimeRegex);
        if (match) {
            updateState(match[1], match[2]);
        }
    } else if (isKillCommand) {
        const match = trimmedText.match(killRegex);
        if (match) {
            // For Frontend simulation, we use the user's browser time.
            // Note: The actual LINE Bot on Render will use the timezone corrected logic in server.js.
            const now = new Date();
            const hours = String(now.getHours()).padStart(2, '0');
            const minutes = String(now.getMinutes()).padStart(2, '0');
            const seconds = String(now.getSeconds()).padStart(2, '0');
            const currentTimeStr = `${hours}${minutes}${seconds}`;
            updateState(match[1].trim(), currentTimeStr);
        }
    }

    setIsLoading(true);

    try {
      // We pass the *updated* death times to the logic service
      const responseText = await getChatResponse(trimmedText, updatedDeathTimes);
      const modelMessage: Message = { role: Role.MODEL, parts: responseText };
      setMessages((prevMessages) => [...prevMessages, modelMessage]);
    } catch (error) {
      console.error(error);
      const errorMessage: Message = {
        role: Role.MODEL,
        parts: "抱歉，我遇到了一個錯誤。請稍後再試。",
      };
      setMessages((prevMessages) => [...prevMessages, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  }, [bossDeathTimes]);

  return (
    <div className="bg-gray-900 text-white font-sans">
      <div className="lg:grid lg:grid-cols-12 lg:gap-8 lg:h-screen">
        
        {/* Left Column: Chat Demo */}
        <div className="lg:col-span-5 flex flex-col h-[90vh] lg:h-screen bg-gray-900">
          <header className="bg-gray-800/50 backdrop-blur-sm p-4 border-b border-gray-700 shadow-lg shrink-0">
            <h1 className="text-xl font-bold text-center text-cyan-400">Gemini AI 助理</h1>
            <p className="text-center text-sm text-gray-400 lg:hidden">向下滑動查看 LINE Bot 設定指南</p>
            <p className="text-center text-sm text-gray-400 hidden lg:block">在此測試，或參閱右方指南設定 LINE Bot</p>
          </header>
      
          <main className="flex-1 overflow-y-auto p-4">
            <div className="max-w-3xl mx-auto space-y-6">
              {messages.map((msg, index) => (
                <ChatMessage key={index} message={msg} />
              ))}
              {isLoading && (
                <div className="flex justify-start items-center space-x-4">
                  <div className="w-10 h-10 rounded-full bg-gray-700 flex items-center justify-center flex-shrink-0">
                      <svg className="w-6 h-6 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path></svg>
                  </div>
                  <div className="bg-gray-800 rounded-lg p-3">
                    <LoadingSpinner />
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          </main>

          <footer className="bg-gray-900/80 backdrop-blur-sm shrink-0">
            <div className="max-w-3xl mx-auto p-4">
                {/* FIX: Removed isConfigured prop as it's no longer needed. */}
                <ChatInput onSendMessage={handleSendMessage} isLoading={isLoading} />
            </div>
          </footer>
        </div>

        {/* Right Column: Setup Guide */}
        <div className="lg:col-span-7 lg:overflow-y-auto p-4 lg:py-8 lg:pr-8">
            {/* FIX: Removed props from SetupGuide as API key is no longer managed in the UI. */}
            <SetupGuide />
        </div>
      </div>
    </div>
  );
};

export default App;
