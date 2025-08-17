'use client';

import { useRef, useEffect, useState } from 'react';
import { useChat } from 'ai/react';
import Layout from '../components/Layout';

export default function Rupert() {
  const messagesEndRef = useRef(null);
  const chatContainerRef = useRef(null);
  const [isResetting, setIsResetting] = useState(false);
  const [isClient, setIsClient] = useState(false);
  
  // Ensure client-side rendering to prevent hydration issues
  useEffect(() => {
    setIsClient(true);
  }, []);
  
  // Load chat history from session storage or return default welcome message
  const getInitialMessages = () => {
    if (!isClient) {
      return [
        {
          id: 'welcome',
          role: 'assistant',
          content: "Greetings, I'm Rupert, the dedicated DeFi agent for Briq protocol. How may I be of service?"
        }
      ];
    }
    
    const savedMessages = sessionStorage.getItem('rupert-chat-messages');
    if (savedMessages) {
      try {
        return JSON.parse(savedMessages);
      } catch (error) {
        console.error('Error parsing saved messages:', error);
      }
    }
    
    return [
      {
        id: 'welcome',
        role: 'assistant',
        content: "Greetings, I'm Rupert, the dedicated DeFi agent for Briq protocol. How may I be of service?"
      }
    ];
  };

  const { messages, input, handleInputChange, handleSubmit, isLoading } = useChat({
    api: '/api/chat',
    initialMessages: getInitialMessages()
  });

  // Save messages to session storage whenever they change
  useEffect(() => {
    if (isClient && messages.length > 0) {
      sessionStorage.setItem('rupert-chat-messages', JSON.stringify(messages));
    }
  }, [messages, isClient]);

  // Auto-scroll chat messages area to bottom when new messages arrive or loading
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  // Prevent page scroll when chat container is at scroll limits
  useEffect(() => {
    const chatContainer = chatContainerRef.current;
    if (!chatContainer) return;

    const handleWheel = (e) => {
      const { scrollTop, scrollHeight, clientHeight } = chatContainer;
      const isAtTop = scrollTop === 0;
      const isAtBottom = scrollTop + clientHeight >= scrollHeight - 1;

      // Prevent page scroll if trying to scroll beyond chat limits
      if ((isAtTop && e.deltaY < 0) || (isAtBottom && e.deltaY > 0)) {
        e.preventDefault();
      }
    };

    chatContainer.addEventListener('wheel', handleWheel, { passive: false });

    return () => {
      chatContainer.removeEventListener('wheel', handleWheel);
    };
  }, []);

  // Clear chat history and reset conversation
  const clearChat = () => {
    if (isClient) {
      setIsResetting(true);
      sessionStorage.removeItem('rupert-chat-messages');
      
      // Show reset animation briefly before reload
      setTimeout(() => {
        window.location.reload();
      }, 500);
    }
  };

  return (
    <Layout>
      <div className="flex justify-center py-12">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 w-full">
          
          {/* Page Header */}
          <div className="text-center mb-12">
            <h1 
              className="text-5xl md:text-6xl text-zen-900 dark:text-cream-100 font-light mb-6 transition-colors duration-300"
              style={{ fontFamily: 'var(--font-jetbrains-mono)', fontWeight: 100 }}
            >
              Rupert
            </h1>
            <p className="text-xl text-zen-700 dark:text-cream-300 max-w-2xl mx-auto font-light font-lato">
              Your AI-powered DeFi agent for yield optimization and strategy guidance
            </p>
          </div>

          {/* Chat Container */}
          <div className="w-full max-w-4xl h-[700px] sm:h-[700px] h-[80vh] bg-cream-50 dark:bg-zen-800 rounded-2xl border border-cream-200 dark:border-zen-600 shadow-lg backdrop-blur-sm overflow-hidden flex flex-col">
            
            {/* Chat Header */}
            <div className="bg-cream-100 dark:bg-zen-700 px-6 py-4 border-b border-cream-200 dark:border-zen-600">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <h3 className="font-semibold text-zen-900 dark:text-cream-100 font-lato">
                    Rupert
                  </h3>
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-green-600 rounded-full animate-pulse"></div>
                    <span className="text-sm text-zen-600 dark:text-cream-400">Online</span>
                  </div>
                </div>
                
                {/* Reset Chat Button */}
                <button
                  onClick={clearChat}
                  disabled={isResetting}
                  className="flex items-center justify-center space-x-2 px-4 py-2 text-sm bg-briq-orange text-zen-900 dark:text-cream-100 rounded hover:bg-[#e6692a] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  title="Reset chat conversation"
                >
                  <svg 
                    className={`w-4 h-4 ${isResetting ? 'animate-spin' : ''}`}
                    fill="none" 
                    stroke="currentColor" 
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  <span>Reset</span>
                </button>
              </div>
            </div>

            {/* Messages Area */}
            <div 
              ref={chatContainerRef}
              className="flex-1 overflow-y-auto p-6 space-y-6 bg-cream-50 dark:bg-zen-800 custom-scrollbar"
            >
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div className="max-w-[80%]">
                    <div
                      className={`p-4 rounded-2xl shadow-sm border ${
                        message.role === 'user'
                          ? 'bg-zen-600 dark:bg-zen-700 text-cream-100 dark:text-cream-100 border-zen-500 dark:border-zen-600'
                          : 'bg-cream-100 dark:bg-zen-700 text-zen-900 dark:text-cream-100 border-cream-200 dark:border-zen-600'
                      }`}
                    >
                      <p className="text-base leading-relaxed whitespace-pre-wrap font-lato">
                        {message.content}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
              
              {/* Loading Indicator */}
              {isLoading && (
                <div className="flex justify-start">
                  <div className="max-w-[80%]">
                    <div className="bg-cream-100 dark:bg-zen-700 text-zen-900 dark:text-cream-100 p-4 rounded-2xl">
                      <div className="flex items-center space-x-1">
                        <span className="text-base font-lato animate-pulse">.</span>
                        <span className="text-base font-lato animate-pulse" style={{ animationDelay: '0.2s' }}>.</span>
                        <span className="text-base font-lato animate-pulse" style={{ animationDelay: '0.4s' }}>.</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              
              <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="flex-shrink-0 bg-cream-100 dark:bg-zen-700 px-6 py-4">
              <form onSubmit={handleSubmit} className="flex space-x-4">
                <div className="flex-1 relative">
                  <input
                    value={input}
                    onChange={handleInputChange}
                    placeholder="Ask Rupert anything..."
                    className="w-full p-4 pr-12 border border-cream-300 dark:border-zen-600 rounded-xl bg-cream-50 dark:bg-zen-800 text-zen-900 dark:text-cream-100 placeholder-zen-500 dark:placeholder-cream-400 focus:outline-none focus:ring-2 focus:ring-briq-orange focus:border-transparent transition-all duration-300 font-lato"
                    disabled={isLoading}
                  />
                  
                  {/* Send Button */}
                  <button
                    type="submit"
                    disabled={isLoading || !input.trim()}
                    className="absolute bg-blue-500 hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-full flex items-center justify-center transition-colors duration-200"
                    style={{ 
                      right: '12px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      width: '28px',
                      height: '28px',
                      minWidth: '28px',
                      minHeight: '28px',
                      maxWidth: '28px',
                      maxHeight: '28px'
                    }}
                  >
                    <svg
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      style={{ 
                        width: '14px', 
                        height: '14px',
                        minWidth: '14px',
                        minHeight: '14px',
                        maxWidth: '14px',
                        maxHeight: '14px'
                      }}
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
                    </svg>
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
