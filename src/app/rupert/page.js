'use client';

import { useRef, useEffect, useState } from 'react';
import { useChat } from 'ai/react';
import Layout from '../components/Layout';
import RupertActions from '../components/RupertActions';
import AnimatedBackground from '../components/AnimatedBackground';

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
      <AnimatedBackground />
      <div className="flex justify-center py-12">
        <div className="text-center max-w-4xl mx-auto px-4 sm:px-6 w-full">
          
          {/* Hero Section */}
          <div className="mb-16 sm:mb-20 lg:mb-24">
            <h1 
              className="text-3xl sm:text-4xl md:text-5xl text-foreground font-light mb-4 sm:mb-6 transition-colors duration-300 leading-tight"
              style={{ fontFamily: 'var(--font-jetbrains-mono)', fontWeight: 100 }}
            >
              Rupert
            </h1>
            <p className="text-lg sm:text-xl text-foreground/70 max-w-2xl mx-auto font-light font-lato">
              Your AI-powered DeFi agent for yield optimization and strategy guidance
            </p>
          </div>

          {/* Chat Container */}
          <div className="glass-card p-0 w-full max-w-4xl h-[700px] sm:h-[700px] h-[80vh] overflow-hidden flex flex-col">
            
            {/* Chat Header */}
            <div className="glass px-6 py-4 backdrop-blur-sm">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <h3 className="font-semibold text-foreground font-lato">
                    Rupert
                  </h3>
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-green-600 rounded-full animate-pulse"></div>
                    <span className="text-sm text-foreground/60">Online</span>
                  </div>
                </div>
                
                {/* Reset Chat Button */}
                <button
                  onClick={clearChat}
                  disabled={isResetting}
                  className="flex items-center justify-center space-x-2 px-4 py-2 text-sm bg-briq-orange text-foreground rounded hover:bg-[#e6692a] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
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
              className="flex-1 overflow-y-auto p-6 space-y-6 bg-transparent custom-scrollbar"
            >
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div className="max-w-[80%]">
                    <div
                      className={`p-4 rounded-2xl backdrop-blur-sm ${
                        message.role === 'user'
                          ? 'bg-zen-600/80 dark:bg-zen-700/80 text-cream-100 dark:text-cream-100'
                          : 'bg-zen-100/60 dark:bg-zen-700/60 text-foreground'
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
                    <div className="bg-zen-100/60 dark:bg-zen-700/60 text-foreground p-4 rounded-2xl backdrop-blur-sm">
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
            <div className="flex-shrink-0 bg-zen-100/10 dark:bg-zen-700/10 px-6 py-4 backdrop-blur-sm">
              <form onSubmit={handleSubmit} className="flex space-x-4">
                <div className="flex-1 relative">
                  <input
                    value={input}
                    onChange={handleInputChange}
                    placeholder="Ask Rupert anything..."
                    className="w-full p-4 pr-12 border-0 rounded-xl bg-zen-100/30 dark:bg-zen-800/30 text-foreground placeholder-zen-500 dark:placeholder-cream-400 focus:outline-none focus:bg-zen-100/50 dark:focus:bg-zen-800/50 transition-all duration-300 font-lato backdrop-blur-sm"
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

          {/* Recent Actions Section */}
          <div className="mt-8">
            <RupertActions />
          </div>
        </div>
      </div>
    </Layout>
  );
}
