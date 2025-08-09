"use client";

import { useState } from 'react';

const CopyButton = ({ 
  text, 
  displayText, 
  className = "",
  showFullHash = false
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async (e) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  };

  const truncateHash = (hash) => {
    if (!hash) return '';
    return `${hash.slice(0, 6)}...${hash.slice(-4)}`;
  };

  return (
    <div className={`relative inline-flex items-center ${className}`}>
      <button
        onClick={handleCopy}
        className="relative inline-flex items-center gap-2 px-3 py-2 bg-transparent focus:outline-none rounded-lg"
      >
        {/* Hash Text */}
        <span className="text-sm font-mono text-zen-700 dark:text-cream-300 break-all">
          {displayText || (showFullHash ? text : truncateHash(text))}
        </span>
        
        {/* Copy Icon */}
        <div className="relative w-4 h-4 flex-shrink-0">
          {/* Copy Icon */}
          <svg 
            className={`absolute inset-0 w-4 h-4 text-zen-500 dark:text-cream-400 transition-all duration-200 ${copied ? 'opacity-0 scale-75' : 'opacity-100 scale-100'}`}
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
          
          {/* Check Icon */}
          <svg 
            className={`absolute inset-0 w-4 h-4 text-green-500 transition-all duration-200 ${copied ? 'opacity-100 scale-100' : 'opacity-0 scale-75'}`}
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
      </button>

      {/* Success Tooltip */}
      {copied && (
        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-green-600 text-white text-xs rounded shadow-lg whitespace-nowrap z-10 animate-fade-in">
          Copied!
          <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-green-600" />
        </div>
      )}
    </div>
  );
};

export default CopyButton;
