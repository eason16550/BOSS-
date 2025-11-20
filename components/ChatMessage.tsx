
import React from 'react';
import type { Message } from '../types';
import { Role } from '../types';
import BotIcon from './icons/BotIcon';
import UserIcon from './icons/UserIcon';

interface ChatMessageProps {
  message: Message;
}

const ChatMessage: React.FC<ChatMessageProps> = ({ message }) => {
  const isModel = message.role === Role.MODEL;

  const formattedParts = message.parts.split('\n').map((line, index) => (
    <React.Fragment key={index}>
      {line}
      <br />
    </React.Fragment>
  ));

  return (
    <div className={`flex items-start space-x-4 ${isModel ? 'justify-start' : 'justify-end'}`}>
      {isModel && <BotIcon />}
      <div
        className={`max-w-xl px-4 py-3 rounded-2xl whitespace-pre-wrap ${
          isModel ? 'bg-gray-800 text-gray-200 rounded-tl-none' : 'bg-cyan-700 text-white rounded-br-none'
        }`}
      >
        {formattedParts}
      </div>
       {!isModel && <UserIcon />}
    </div>
  );
};

export default ChatMessage;
