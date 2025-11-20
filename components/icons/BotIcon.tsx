
import React from 'react';

const BotIcon: React.FC = () => (
  <div className="w-10 h-10 rounded-full bg-gray-700 flex items-center justify-center flex-shrink-0 border-2 border-cyan-500">
    <svg 
      className="w-6 h-6 text-cyan-400" 
      fill="none" 
      stroke="currentColor" 
      viewBox="0 0 24 24" 
      xmlns="http://www.w3.org/2000/svg"
    >
      <path 
        strokeLinecap="round" 
        strokeLinejoin="round" 
        strokeWidth="2" 
        d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
      ></path>
    </svg>
  </div>
);

export default BotIcon;
