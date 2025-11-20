
import React, { useState } from 'react';
import SendIcon from './icons/SendIcon';

interface ChatInputProps {
  onSendMessage: (text: string) => void;
  isLoading: boolean;
  // FIX: Removed isConfigured prop as it is no longer needed.
}

const ChatInput: React.FC<ChatInputProps> = ({ onSendMessage, isLoading }) => {
  const [text, setText] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // FIX: Removed isConfigured check.
    if (text.trim() && !isLoading) {
      onSendMessage(text);
      setText('');
    }
  };

  const placeholderText = () => {
    if (isLoading) return "正在思考中...";
    // FIX: Removed placeholder text for unconfigured state.
    return "請輸入您的訊息...";
  }

  return (
    <form onSubmit={handleSubmit} className="flex items-center space-x-2">
      <input
        type="text"
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={placeholderText()}
        className="flex-1 w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-full focus:outline-none focus:ring-2 focus:ring-cyan-500 text-white placeholder-gray-500"
        // FIX: Removed isConfigured from disabled condition.
        disabled={isLoading}
      />
      <button
        type="submit"
        // FIX: Removed isConfigured from disabled condition.
        disabled={isLoading || !text.trim()}
        className="p-3 bg-cyan-600 rounded-full text-white disabled:bg-gray-600 disabled:cursor-not-allowed hover:bg-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2 focus:ring-offset-gray-900 transition-colors"
        aria-label="傳送訊息"
      >
        <SendIcon />
      </button>
    </form>
  );
};

export default ChatInput;
