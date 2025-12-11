"use client";

import { useState, useMemo, useEffect, useRef } from 'react';
import { formatAPY, formatTVL, formatUtilization } from '../utils/formatters';
import { useSubgraphMarketData } from '../hooks/useSubgraphMarketData';
import { ProtocolIcon, TokenIcon, NetworkIcon } from './icons';
import HealthMeter from './HealthMeter';

export default function MarketTable() {
  const [selectedNetworks, setSelectedNetworks] = useState([]);
  const [selectedTokens, setSelectedTokens] = useState([]);
  const [sortConfig, setSortConfig] = useState({
    'Arbitrum One': { key: 'apy', direction: 'desc' },
    'Ethereum': { key: 'apy', direction: 'desc' }
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [isNetworkDropdownOpen, setIsNetworkDropdownOpen] = useState(false);
  const [isAssetDropdownOpen, setIsAssetDropdownOpen] = useState(false);
  
  const networkDropdownRef = useRef(null);
  const assetDropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (networkDropdownRef.current && !networkDropdownRef.current.contains(event.target)) {
        setIsNetworkDropdownOpen(false);
      }
      if (assetDropdownRef.current && !assetDropdownRef.current.contains(event.target)) {
        setIsAssetDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const { data: subgraphData, loading: subgraphLoading, error: subgraphError, refetch } = useSubgraphMarketData();

  const networks = ['Ethereum', 'Arbitrum One'];
  const tokens = ['USDC', 'WETH'];

  const getNetworkAbbreviation = (network) => {
    switch (network) {
      case 'Ethereum':
        return 'ETH';
      case 'Arbitrum One':
        return 'ARB';
      default:
        return network;
    }
  };

  const calculatePoolHealth = (apy, utilization, tvl) => {
    let score = 0;
    
    if (apy >= 8) score += 40;
    else if (apy >= 5) score += 30;
    else if (apy >= 3) score += 20;
    else score += 10;
    
    if (utilization >= 70 && utilization <= 85) score += 35;
    else if (utilization >= 60 && utilization <= 90) score += 25;
    else if (utilization >= 50 && utilization <= 95) score += 15;
    else score += 5;
    
    if (tvl >= 100000000) score += 25;
    else if (tvl >= 50000000) score += 20;
    else if (tvl >= 10000000) score += 15;
    else score += 10;
    
    // Convert to 1-5 scale for HealthMeter
    if (score >= 85) return 5;
    else if (score >= 70) return 4;
    else if (score >= 55) return 3;
    else if (score >= 40) return 2;
    else return 1;
  };

  const handleNetworkSelect = (network) => {
    if (!selectedNetworks.includes(network)) {
      setSelectedNetworks([...selectedNetworks, network]);
    }
  };

  const handleTokenSelect = (token) => {
    if (!selectedTokens.includes(token)) {
      setSelectedTokens([...selectedTokens, token]);
    }
  };

  const removeNetwork = (network) => {
    setSelectedNetworks(selectedNetworks.filter(n => n !== network));
  };

  const removeToken = (token) => {
    setSelectedTokens(selectedTokens.filter(t => t !== token));
  };

  const getCurrentMarkets = () => {
    if (subgraphData && subgraphData.length > 0) {
      const networksToShow = selectedNetworks.length === 0 
        ? ['Ethereum', 'Arbitrum One'] 
        : selectedNetworks;
      
      const tokensToShow = selectedTokens.length === 0 
        ? ['USDC', 'WETH'] 
        : selectedTokens;

      let filteredMarkets = subgraphData.filter(market => 
        networksToShow.includes(market.network) && 
        tokensToShow.includes(market.token)
      );

      // Apply search filter
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        filteredMarkets = filteredMarkets.filter(market =>
          market.protocol.toLowerCase().includes(query) ||
          market.token.toLowerCase().includes(query) ||
          market.network.toLowerCase().includes(query)
        );
      }

      return filteredMarkets;
    }

    return [];
  };

  const sortedMarkets = useMemo(() => {
    const markets = getCurrentMarkets();

    // Group by network first
    const grouped = markets.reduce((acc, market) => {
      if (!acc[market.network]) acc[market.network] = [];
      acc[market.network].push(market);
      return acc;
    }, {});

    // Sort within each network group using its own sort config
    Object.keys(grouped).forEach(network => {
      const config = sortConfig[network];
      if (!config || !config.key) return;

      grouped[network].sort((a, b) => {
        let aValue, bValue;
        
        switch (config.key) {
          case 'apy':
            aValue = a.apyValue;
            bValue = b.apyValue;
            break;
          case 'tvl':
            aValue = a.tvlValue;
            bValue = b.tvlValue;
            break;
          case 'utilization':
            aValue = a.utilizationValue;
            bValue = b.utilizationValue;
            break;
          default:
            return 0;
        }

        if (config.direction === 'asc') {
          return aValue - bValue;
        } else {
          return bValue - aValue;
        }
      });
    });

    // Flatten back to array
    return Object.values(grouped).flat();
  }, [selectedNetworks, selectedTokens, sortConfig, subgraphData, searchQuery]);

  const handleSort = (network, key) => {
    setSortConfig(prevConfig => ({
      ...prevConfig,
      [network]: {
        key,
        direction: prevConfig[network]?.key === key && prevConfig[network]?.direction === 'desc' ? 'asc' : 'desc'
      }
    }));
  };

  const getSortIcon = (network, columnKey) => {
    const config = sortConfig[network];
    if (!config || config.key !== columnKey) {
      return (
        <svg className="w-4 h-4 text-foreground/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
        </svg>
      );
    }
    
    if (config.direction === 'desc') {
      return (
        <svg className="w-4 h-4 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
        </svg>
      );
    } else {
      return (
        <svg className="w-4 h-4 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
        </svg>
      );
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-4 sm:gap-6 items-start sm:items-center">
        {/* Search Bar */}
        <div className="flex-shrink-0 w-full sm:w-auto">
          <div className="relative">
            <input
              type="text"
              placeholder="Search markets..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="glass text-foreground px-4 py-3 pl-10 pr-4 rounded-lg focus:outline-none focus:border-accent/50 transition-all duration-200 w-full sm:w-[200px] text-base sm:text-sm"
            />
            <div className="absolute left-3 top-1/2 transform -translate-y-1/2">
              <svg className="w-4 h-4 text-foreground/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
          </div>
        </div>

        {/* Network Dropdown */}
        <div className="relative w-full sm:w-auto" ref={networkDropdownRef}>
          <button
            type="button"
            onClick={() => {
              setIsNetworkDropdownOpen(!isNetworkDropdownOpen);
              setIsAssetDropdownOpen(false);
            }}
            className="w-full sm:w-[140px] glass border border-foreground/10 rounded-lg px-4 py-3 text-foreground focus:outline-none focus:ring-2 focus:ring-accent/50 flex items-center justify-between cursor-pointer"
          >
            <span className="text-sm">Network</span>
            <svg className="w-4 h-4 text-foreground/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          {isNetworkDropdownOpen && (
            <div className="absolute z-10 w-full sm:w-[140px] mt-1 border border-foreground/10 rounded-lg shadow-lg overflow-hidden" style={{ backgroundColor: '#bfdbfe' }}>
              {networks.map(network => (
                <button
                  key={network}
                  type="button"
                  onClick={() => {
                    handleNetworkSelect(network);
                    setIsNetworkDropdownOpen(false);
                  }}
                  className="w-full px-3 py-2 text-left hover:bg-foreground/5 flex items-center space-x-2 transition-colors text-sm cursor-pointer"
                >
                  <NetworkIcon network={network} size={20} />
                  <span>{network}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Asset Dropdown */}
        <div className="relative w-full sm:w-auto" ref={assetDropdownRef}>
          <button
            type="button"
            onClick={() => {
              setIsAssetDropdownOpen(!isAssetDropdownOpen);
              setIsNetworkDropdownOpen(false);
            }}
            className="w-full sm:w-[140px] glass border border-foreground/10 rounded-lg px-4 py-3 text-foreground focus:outline-none focus:ring-2 focus:ring-accent/50 flex items-center justify-between cursor-pointer"
          >
            <span className="text-sm">Asset</span>
            <svg className="w-4 h-4 text-foreground/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          {isAssetDropdownOpen && (
            <div className="absolute z-10 w-full sm:w-[140px] mt-1 border border-foreground/10 rounded-lg shadow-lg overflow-hidden" style={{ backgroundColor: '#bfdbfe' }}>
              {tokens.map(token => (
                <button
                  key={token}
                  type="button"
                  onClick={() => {
                    handleTokenSelect(token);
                    setIsAssetDropdownOpen(false);
                  }}
                  className="w-full px-3 py-2 text-left hover:bg-foreground/5 flex items-center space-x-2 transition-colors text-sm cursor-pointer"
                >
                  <TokenIcon token={token} size={20} />
                  <span>{token}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Selections Display with Divider */}
        {(selectedNetworks.length > 0 || selectedTokens.length > 0) && (
          <div className="flex items-center justify-center sm:justify-start gap-2 glass border border-foreground/10 rounded-lg px-4 py-2 w-fit mx-auto sm:mx-0 sm:w-auto">
            {/* Network Icons */}
            {selectedNetworks.length > 0 && (
              <div className="flex items-center gap-2">
                {selectedNetworks.map((network) => (
                  <button
                    key={network}
                    type="button"
                    onClick={() => removeNetwork(network)}
                    className="relative group w-8 h-8 flex items-center justify-center"
                    style={{ cursor: 'pointer' }}
                    aria-label={`Remove ${network} network filter`}
                  >
                    <NetworkIcon network={network} size={24} />
                    <div className="absolute inset-0 bg-red-500/0 group-hover:bg-red-500/20 rounded-full transition-colors flex items-center justify-center">
                      <svg className="w-3 h-3 text-red-500 opacity-0 group-hover:opacity-100 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </div>
                  </button>
                ))}
              </div>
            )}
            
            {/* Vertical Divider */}
            {selectedNetworks.length > 0 && selectedTokens.length > 0 && (
              <div className="h-6 w-px bg-foreground/20"></div>
            )}
            
            {/* Token Icons */}
            {selectedTokens.length > 0 && (
              <div className="flex items-center gap-2">
                {selectedTokens.map((token) => (
                  <button
                    key={token}
                    type="button"
                    onClick={() => removeToken(token)}
                    className="relative group w-8 h-8 flex items-center justify-center"
                    style={{ cursor: 'pointer' }}
                    aria-label={`Remove ${token} asset filter`}
                  >
                    <TokenIcon token={token} size={24} />
                    <div className="absolute inset-0 bg-red-500/0 group-hover:bg-red-500/20 rounded-full transition-colors flex items-center justify-center">
                      <svg className="w-3 h-3 text-red-500 opacity-0 group-hover:opacity-100 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between glass-card px-4 py-3 gap-3 sm:gap-4">
        <div className="flex items-center justify-center sm:justify-start space-x-3">
          {subgraphLoading ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-accent"></div>
              <span className="text-sm text-foreground/60">Loading market data...</span>
            </>
          ) : subgraphError ? (
            <>
              <div className="h-4 w-4 rounded-full bg-red-500"></div>
              <span className="text-sm text-red-600 dark:text-red-400">
                Error loading subgraph data
              </span>
            </>
          ) : subgraphData && subgraphData.length > 0 ? (
            <>
              <div className="h-4 w-4 rounded-full bg-green-500"></div>
              <span className="text-sm text-foreground/60">
                Live data from The Graph
              </span>
            </>
          ) : (
            <>
              <div className="h-4 w-4 rounded-full bg-yellow-500"></div>
              <span className="text-sm text-foreground/60">No market data available</span>
            </>
          )}
        </div>
        
        <button
          onClick={refetch}
          disabled={subgraphLoading}
          className="glass-button flex items-center justify-center space-x-2 px-4 py-2 text-sm text-foreground disabled:opacity-50 disabled:cursor-not-allowed w-full sm:w-auto cursor-pointer"
        >
          <svg 
            className={`w-4 h-4 ${subgraphLoading ? 'animate-spin' : ''}`} 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          <span>Refresh</span>
        </button>
      </div>

      {/* Markets Table - Desktop */}
      <div className="hidden md:block space-y-8">
        {['Arbitrum One', 'Ethereum'].map(network => {
          const networkMarkets = sortedMarkets.filter(m => m.network === network);
          if (networkMarkets.length === 0) return null;
          
          return (
            <div key={network} className="glass-card overflow-hidden w-full">
              {/* Network Title */}
              <div className="px-6 py-4 border-b border-foreground/10 flex items-center gap-3">
                <NetworkIcon network={network} size={24} />
                <h3 className="text-lg font-semibold text-foreground">{network}</h3>
              </div>
              
              <div className="overflow-visible">
                <table className="w-full border-collapse border-spacing-0 overflow-visible" style={{ tableLayout: 'fixed', width: '100%' }}>
                  <thead className="glass">
                    <tr>
                      <th className="px-6 py-4 text-center text-sm font-medium text-foreground">
                        Token
                      </th>
                      <th 
                        className="px-6 py-4 text-center text-sm font-medium text-foreground cursor-pointer hover:bg-foreground/5 transition-colors duration-200"
                        onClick={() => handleSort(network, 'apy')}
                      >
                        <div className="flex items-center justify-center gap-2">
                          APY
                          {getSortIcon(network, 'apy')}
                        </div>
                      </th>
                      <th 
                        className="px-6 py-4 text-center text-sm font-medium text-foreground cursor-pointer hover:bg-foreground/5 transition-colors duration-200"
                        onClick={() => handleSort(network, 'tvl')}
                      >
                        <div className="flex items-center justify-center gap-2">
                          TVL
                          {getSortIcon(network, 'tvl')}
                        </div>
                      </th>
                      <th 
                        className="px-6 py-4 text-center text-sm font-medium text-foreground cursor-pointer hover:bg-foreground/5 transition-colors duration-200"
                        onClick={() => handleSort(network, 'utilization')}
                      >
                        <div className="flex items-center justify-center gap-2">
                          Utilization
                          {getSortIcon(network, 'utilization')}
                        </div>
                      </th>
                      <th className="px-6 py-4 text-center text-sm font-medium text-foreground">
                        Health
                      </th>
                      <th className="px-6 py-4 text-center text-sm font-medium text-foreground">
                        Protocol
                      </th>
                    </tr>
                  </thead>
                  <tbody className="space-y-1">
                    {networkMarkets.map((market, index) => (
                      <tr 
                        key={index}
                        className="hover:bg-accent/5 hover:shadow-lg hover:shadow-accent/10 transition-all duration-300 group"
                      >
                        <td className="px-6 py-4 text-sm text-foreground/70 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <TokenIcon token={market.token} size={20} />
                            <span>{market.token}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-foreground text-center">
                          {formatAPY(market.apyValue)}
                        </td>
                        <td className="px-6 py-4 text-sm text-foreground/70 text-center">
                          {formatTVL(market.tvlValue)}
                        </td>
                        <td className="px-6 py-4 text-sm text-foreground/70 text-center">
                          {formatUtilization(market.utilizationValue)}
                        </td>
                        <td className="px-6 py-4 text-sm text-center overflow-visible">
                          <div className="flex justify-center">
                            <HealthMeter health={calculatePoolHealth(market.apyValue, market.utilizationValue, market.tvlValue)} />
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm font-medium text-foreground text-center">
                          <div className="flex items-center justify-center gap-2">
                            <ProtocolIcon protocol={market.protocol} size={20} />
                            <span>{market.protocol}</span>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          );
        })}
      </div>

      {/* Markets Cards - Mobile */}
      <div className="md:hidden space-y-6">
        {['Arbitrum One', 'Ethereum'].map(network => {
          const networkMarkets = sortedMarkets.filter(m => m.network === network);
          if (networkMarkets.length === 0) return null;
          
          return (
            <div key={network} className="space-y-4">
              {/* Network Title */}
              <div className="flex items-center gap-3 px-2">
                <NetworkIcon network={network} size={24} />
                <h3 className="text-lg font-semibold text-foreground">{network}</h3>
              </div>
              
              {/* Market Cards */}
              {networkMarkets.map((market, index) => (
                <div key={index} className="glass-card p-4 space-y-3">
                  {/* Header Row */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <TokenIcon token={market.token} size={24} />
                      <div>
                        <div className="font-medium text-foreground">{market.token}</div>
                        <div className="text-sm text-foreground/60 flex items-center gap-2">
                          <ProtocolIcon protocol={market.protocol} size={16} />
                          <span>{market.protocol}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-col items-center gap-1">
                      <div className="text-xs text-foreground/60 mb-1">Health</div>
                      <HealthMeter health={calculatePoolHealth(market.apyValue, market.utilizationValue, market.tvlValue)} width={50} height={8} />
                    </div>
                  </div>

                  {/* Metrics Row */}
                  <div className="grid grid-cols-3 gap-4 pt-2 border-t border-foreground/20">
                    <div className="text-center">
                      <div className="text-xs text-foreground/50 mb-1">APY</div>
                      <div className="text-sm font-medium text-foreground">
                        {formatAPY(market.apyValue)}
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="text-xs text-foreground/50 mb-1">TVL</div>
                      <div className="text-sm font-medium text-foreground">
                        {formatTVL(market.tvlValue)}
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="text-xs text-foreground/50 mb-1">Utilization</div>
                      <div className="text-sm font-medium text-foreground">
                        {formatUtilization(market.utilizationValue)}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}
