'use client';

import { useState, useRef, useEffect } from 'react';
import { useChat } from 'ai/react';
import Layout from '../components/Layout';

export default function Rupert() {
  const messagesEndRef = useRef(null);
  const messagesContainerRef = useRef(null);
  
  const { messages, input, handleInputChange, handleSubmit, isLoading, append } = useChat({
    api: '/api/chat',
    initialMessages: [
      {
        id: 'welcome',
        role: 'assistant',
        content: 'Good day. I am Rupert, your dedicated AI butler for the Briq DeFi platform. I am here to provide you with expert assistance regarding yield optimization strategies, DeFi protocols, and comprehensive guidance on utilizing the Briq platform to its fullest potential. Whether you require information about our automated routing between Aave V3 and Compound V3, portfolio management strategies, or technical support with USDC and WETH deposits, I am at your complete service. How may I assist you today?'
      }
    ]
  });

  const scrollToBottom = () => {
    // Auto-scroll when Rupert is generating text
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  };

  useEffect(() => {
    // Scroll when messages change or when loading (Rupert is typing)
    if (isLoading || messages.length > 0) {
      scrollToBottom();
    }
  }, [messages, isLoading]);

  return (
    <Layout>
      <div className="flex justify-center py-12">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          
          {/* Hero Section */}
          <div className="text-center mb-12">
            <h1 
              className="text-5xl md:text-6xl text-zen-900 dark:text-cream-100 font-light mb-6 transition-colors duration-300"
              style={{ fontFamily: 'var(--font-jetbrains-mono)', fontWeight: 100 }}
            >
              Rupert
            </h1>
            <p className="text-xl text-zen-700 dark:text-cream-300 max-w-2xl mx-auto font-light font-lato">
              Your AI-powered DeFi assistant for yield optimization and strategy guidance
            </p>
          </div>

          {/* Chat Interface */}
          <div className="bg-cream-50 dark:bg-zen-800 rounded-2xl border border-cream-200 dark:border-zen-600 shadow-lg backdrop-blur-sm overflow-hidden">
            
            {/* Chat Header */}
            <div className="bg-cream-100 dark:bg-zen-700 px-6 py-4 border-b border-cream-200 dark:border-zen-600">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-briq-orange rounded-full flex items-center justify-center">
                  <span className="text-white font-bold text-lg">R</span>
                </div>
                <div>
                  <h3 className="font-semibold text-zen-900 dark:text-cream-100 font-lato">
                    Rupert
                  </h3>
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                    <span className="text-sm text-zen-600 dark:text-cream-400">Online</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Messages Container */}
            <div 
              ref={messagesContainerRef}
              className="h-[600px] overflow-y-auto p-6 space-y-6 bg-cream-50 dark:bg-zen-800"
            >
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`max-w-[80%]`}>
                    {/* Message Bubble */}
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
            <div className="bg-cream-100 dark:bg-zen-700 px-6 py-4">
              <form onSubmit={handleSubmit} className="flex space-x-4">
                <div className="flex-1 relative">
                  <input
                    value={input}
                    onChange={handleInputChange}
                    placeholder="Ask Rupert anything..."
                    className="w-full p-4 pr-12 border border-cream-300 dark:border-zen-600 rounded-xl bg-cream-50 dark:bg-zen-800 text-zen-900 dark:text-cream-100 placeholder-zen-500 dark:placeholder-cream-400 focus:outline-none focus:ring-2 focus:ring-briq-orange focus:border-transparent transition-all duration-300 font-lato"
                    disabled={isLoading}
                  />
                  
                  {/* Send Button Inside Input */}
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
