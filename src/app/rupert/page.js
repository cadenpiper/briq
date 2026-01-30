'use client';

import { useRef, useEffect, useState } from 'react';
import { useChat } from 'ai/react';
import { useAccount } from 'wagmi';
import Layout from '../components/Layout';
import RupertActions from './components/RupertActions';
import { supabase } from '../utils/supabase';

export default function Rupert() {
  const messagesEndRef = useRef(null);
  const chatContainerRef = useRef(null);
  const [isResetting, setIsResetting] = useState(false);
  const [isClient, setIsClient] = useState(false);
  const [isInputCollapsed, setIsInputCollapsed] = useState(false);
  const { address } = useAccount();
  
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
    initialMessages: getInitialMessages(),
    onFinish: async (message) => {
      // Only save to Supabase when message is complete
      if (address && message.role === 'assistant') {
        const { error } = await supabase
          .from('chat_messages')
          .insert({
            wallet_address: address,
            role: message.role,
            content: message.content
          });
        if (error) console.error('Error saving to Supabase:', error);
      }
    }
  });

  // Save user messages to Supabase on submit
  const handleSubmitWithSave = async (e) => {
    if (!input.trim() || isLoading) return;
    
    // Save user message to Supabase
    if (address) {
      await supabase
        .from('chat_messages')
        .insert({
          wallet_address: address,
          role: 'user',
          content: input
        });
    }
    
    handleSubmit(e);
  };

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

  // Auto-resize input field
  const handleInputResize = (e) => {
    if (!isInputCollapsed) {
      e.target.style.height = 'auto';
      e.target.style.height = Math.min(e.target.scrollHeight, 200) + 'px';
    }
  };

  // Toggle input collapse
  const toggleInputCollapse = () => {
    const textarea = document.querySelector('textarea');
    if (isInputCollapsed) {
      // Expanding - from collapsed to full height
      const targetHeight = Math.min(textarea.scrollHeight, 200);
      textarea.style.height = '56px';
      requestAnimationFrame(() => {
        textarea.style.height = targetHeight + 'px';
      });
    } else {
      // Collapsing - from current height to collapsed
      const currentHeight = textarea.scrollHeight;
      textarea.style.height = currentHeight + 'px';
      requestAnimationFrame(() => {
        textarea.style.height = '56px';
      });
    }
    setIsInputCollapsed(!isInputCollapsed);
  };

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
      <div className="flex justify-center py-6">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 w-full">
          


          {/* Chat Container */}
          <div className="glass-card p-0 w-full max-w-4xl h-[calc(100vh-8rem)] overflow-hidden flex flex-col">
            
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
                  className="flex items-center justify-center space-x-2 px-4 py-2 text-sm bg-foreground/10 text-foreground rounded hover:bg-accent hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
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
                          ? 'bg-blue-500 text-white'
                          : 'bg-zen-100/60 dark:bg-zen-700/60 text-foreground'
                      }`}
                    >
                      <p className="text-base leading-relaxed whitespace-pre-wrap font-lato text-left">
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
            <div className="flex-shrink-0 bg-zen-100/10 dark:bg-zen-700/10 px-6 pt-3 pb-2 backdrop-blur-sm">
              <form onSubmit={handleSubmitWithSave} className="flex items-end space-x-4">
                <div className="flex-1 relative">
                  <textarea
                      value={input}
                      onChange={(e) => {
                        handleInputChange(e);
                        handleInputResize(e);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleSubmitWithSave(e);
                        }
                      }}
                      placeholder="Ask Rupert anything..."
                      className="w-full px-3 pr-12 border-0 rounded-xl bg-zen-100/30 dark:bg-zen-800/30 text-foreground placeholder-zen-500 dark:placeholder-cream-400 focus:outline-none focus:bg-zen-100/50 dark:focus:bg-zen-800/50 transition-all duration-300 font-lato backdrop-blur-sm resize-none overflow-y-auto hidden-scrollbar"
                      style={{ paddingTop: '14px', paddingBottom: '14px', minHeight: '56px', maxHeight: '200px', transition: 'height 0.2s ease-out', scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                      rows={1}
                      disabled={isLoading}
                    />
                    
                    {/* Collapse/Expand Button */}
                    {(input.includes('\n') || (typeof document !== 'undefined' && document.querySelector('textarea')?.scrollHeight > 56)) ? (
                      <button
                        type="button"
                        onClick={toggleInputCollapse}
                        className="absolute left-1/2 transform -translate-x-1/2 -top-6 text-zen-600 hover:text-zen-800 dark:text-zen-400 dark:hover:text-zen-200 transition-colors bg-zen-200/80 dark:bg-zen-700/80 rounded-full p-2 shadow-sm border border-zen-300/50 dark:border-zen-600/50"
                        title={isInputCollapsed ? "Expand input" : "Collapse input"}
                      >
                        <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                                d={isInputCollapsed ? "M19 9l-7 7-7-7" : "M5 15l7-7 7 7"} />
                        </svg>
                      </button>
                    ) : null}
                    
                    {/* Send Button */}
                    <button
                      type="submit"
                      disabled={isLoading || !input.trim()}
                      className="absolute bg-blue-500 hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-full flex items-center justify-center transition-colors duration-200"
                      style={{ 
                        right: '12px',
                        top: '14px',
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
