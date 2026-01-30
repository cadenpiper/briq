'use client';

import { useState, useEffect, useRef } from 'react';
import CopyButton from '../../components/CopyButton';
import { TokenIcon } from '../../components/icons';

export default function RupertActions() {
  const [actions, setActions] = useState([]);
  const [loading, setLoading] = useState(true);
  const actionsContainerRef = useRef(null);

  useEffect(() => {
    fetchRecentActions();
    // Poll for new actions every 30 seconds
    const interval = setInterval(fetchRecentActions, 30000);
    return () => clearInterval(interval);
  }, []);

  // Prevent page scroll when actions container is at scroll limits
  useEffect(() => {
    const actionsContainer = actionsContainerRef.current;
    if (!actionsContainer) return;

    const handleWheel = (e) => {
      const { scrollTop, scrollHeight, clientHeight } = actionsContainer;
      const isAtTop = scrollTop === 0;
      const isAtBottom = scrollTop + clientHeight >= scrollHeight - 1;

      // Prevent page scroll if trying to scroll beyond actions limits
      if ((isAtTop && e.deltaY < 0) || (isAtBottom && e.deltaY > 0)) {
        e.preventDefault();
      }
    };

    actionsContainer.addEventListener('wheel', handleWheel, { passive: false });

    return () => {
      actionsContainer.removeEventListener('wheel', handleWheel);
    };
  }, [actions]);

  const fetchRecentActions = async () => {
    try {
      const response = await fetch('/api/rupert/actions');
      if (response.ok) {
        const data = await response.json();
        setActions(data.actions || []);
      }
    } catch (error) {
      console.error('Failed to fetch Rupert actions:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (timestamp) => {
    return new Date(timestamp).toLocaleString();
  };

  const getActionIcon = (action) => {
    if (action.type === 'strategy_change') {
      // Use token icons for USDC and WETH
      if (action.token === 'USDC' || action.token === 'WETH') {
        return (
          <div className="w-8 h-8 flex items-center justify-center">
            <TokenIcon token={action.token} size={32} />
          </div>
        );
      }
      // Fallback for other tokens
      return (
        <div className="w-8 h-8 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center">
          <svg className="w-4 h-4 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
          </svg>
        </div>
      );
    }
    return (
      <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
        <svg className="w-4 h-4 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="glass-card p-6">
        <h3 className="text-lg font-semibold text-foreground mb-4 font-lato">
          Recent Actions
        </h3>
        <div className="animate-pulse space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center space-x-3">
              <div className="w-8 h-8 glass rounded-full"></div>
              <div className="flex-1 space-y-2">
                <div className="h-4 glass rounded w-3/4"></div>
                <div className="h-3 glass rounded w-1/2"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="glass-card">
      <div className="flex items-center justify-between mb-4 p-6 pb-0">
        <h3 className="text-lg font-semibold text-foreground font-lato">
          Rupert's Recent Actions
        </h3>
        <div className="flex items-center space-x-2">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
          <span className="text-sm text-foreground/60">Live</span>
        </div>
      </div>

      {actions.length === 0 ? (
        <div className="text-center py-8 px-6">
          <div className="w-12 h-12 glass rounded-full flex items-center justify-center mx-auto mb-3">
            <svg className="w-6 h-6 text-foreground/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          </div>
          <p className="text-foreground/60 text-sm">
            No recent actions. Rupert is monitoring markets...
          </p>
        </div>
      ) : (
        <div ref={actionsContainerRef} className="space-y-4 max-h-72 overflow-y-auto custom-scrollbar p-6 pt-0 pb-8 mb-2">
          {actions.map((action, index) => (
            <div key={index} className="p-3 sm:p-4 glass rounded-lg relative">
              <div className="flex items-start justify-between">
                <div className="flex items-start sm:items-center space-x-2 sm:space-x-3 flex-1">
                  {getActionIcon(action)}
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-2">
                        <p className="text-sm font-semibold text-foreground">
                          {action.token} Strategy Change
                        </p>
                        <span className="text-xs font-medium text-green-600 mt-1 sm:mt-0">
                          +{action.improvement}% APY
                        </span>
                      </div>
                      <span className="text-xs text-foreground/50 mt-1 sm:mt-0">
                        {formatTime(action.timestamp)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between mt-1">
                      <div className="text-xs text-foreground/60 flex items-center space-x-1">
                        <span>{action.currentStrategy}</span>
                        <span>→</span>
                        <span>{action.newStrategy}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex items-end justify-start mt-3 ml-8 sm:ml-11">
                {action.fromPool && action.toPool && (
                  <div className="flex-1">
                    {action.fromPool !== action.toPool ? (
                      <div className="flex flex-col sm:grid sm:grid-cols-2 gap-1 sm:gap-2 text-xs">
                        <div className="flex items-center space-x-1">
                          <span className="text-foreground/50 font-semibold">From:</span>
                          {action.fromPool === 'N/A' ? (
                            <span className="text-xs text-foreground/60">N/A</span>
                          ) : (
                            <CopyButton text={action.fromPool} className="text-xs" />
                          )}
                        </div>
                        <div className="flex items-center space-x-1">
                          <span className="text-foreground/50 font-semibold">To:</span>
                          <CopyButton text={action.toPool} className="text-xs" />
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center space-x-1">
                        <span className="text-xs text-foreground/50 font-semibold">Pool:</span>
                        <CopyButton text={action.fromPool} className="text-xs" />
                      </div>
                    )}
                  </div>
                )}
              </div>
              
              {action.txHash && (
                <a 
                  href={`https://arbiscan.io/tx/${action.txHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="absolute bottom-3 right-3 flex items-center px-2 sm:px-3 py-1 text-xs font-medium text-white bg-blue-500 hover:bg-blue-600 rounded transition-colors"
                >
                  <span className="sm:hidden">View Tx</span>
                  <span className="hidden sm:inline">View Transaction</span>
                </a>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
