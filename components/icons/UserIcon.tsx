
import React from 'react';

const UserIcon: React.FC = () => (
  <div className="w-10 h-10 rounded-full bg-gray-700 flex items-center justify-center flex-shrink-0 border-2 border-gray-600">
    <svg 
        className="w-6 h-6 text-gray-400" 
        fill="none" 
        stroke="currentColor" 
        viewBox="0 0 24 24" 
        xmlns="http://www.w3.org/2000/svg"
    >
        <path 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            strokeWidth="2" 
            d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
        ></path>
    </svg>
  </div>
);

export default UserIcon;
