"use client";

import { useState, useMemo, useEffect } from 'react';
import { formatAPY, formatTVL, formatUtilization } from '../utils/formatters';
import { useSubgraphMarketData } from '../hooks/useSubgraphMarketData';
import { ProtocolIcon, TokenIcon, NetworkIcon } from './icons';
import CustomDropdown from './CustomDropdown';

export default function MarketTable() {
  const [selectedNetworks, setSelectedNetworks] = useState([]);
  const [selectedTokens, setSelectedTokens] = useState([]);
  const [sortConfig, setSortConfig] = useState({ key: 'apy', direction: 'desc' });
  const [searchQuery, setSearchQuery] = useState('');

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
    
    if (score >= 85) return 'Great';
    else if (score >= 70) return 'Good';
    else if (score >= 55) return 'Fair';
    else return 'Poor';
  };

  const getHealthStyle = (health) => {
    switch (health) {
      case 'Great':
        return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200 border border-emerald-200 dark:border-emerald-700 shadow-sm';
      case 'Good':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 border border-blue-200 dark:border-blue-700 shadow-sm';
      case 'Fair':
        return 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200 border border-amber-200 dark:border-amber-700 shadow-sm';
      case 'Poor':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200 border border-red-200 dark:border-red-700 shadow-sm';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200 border border-gray-200 dark:border-gray-700 shadow-sm';
    }
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
    if (!sortConfig.key) return markets;

    return [...markets].sort((a, b) => {
      let aValue, bValue;
      
      switch (sortConfig.key) {
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

      if (sortConfig.direction === 'asc') {
        return aValue - bValue;
      } else {
        return bValue - aValue;
      }
    });
  }, [selectedNetworks, selectedTokens, sortConfig, subgraphData, searchQuery]);

  const handleSort = (key) => {
    setSortConfig(prevConfig => ({
      key,
      direction: prevConfig.key === key && prevConfig.direction === 'desc' ? 'asc' : 'desc'
    }));
  };

  const getSortIcon = (columnKey) => {
    if (sortConfig.key !== columnKey) {
      return (
        <svg className="w-4 h-4 text-foreground/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
        </svg>
      );
    }
    
    if (sortConfig.direction === 'desc') {
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

  const showNetworkColumn = true;
  const showTokenColumn = true;

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-4 sm:gap-6 justify-start">
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

        <CustomDropdown
          options={networks}
          onSelect={handleNetworkSelect}
          selectedItems={selectedNetworks}
          placeholder="Network"
        />
        
        {/* Selected Networks Display */}
        {selectedNetworks.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-2 justify-start sm:justify-center sm:max-w-[140px]">
            {selectedNetworks.map((network) => (
              <div key={network} className="flex items-center bg-accent/20 text-accent border border-accent/40 px-2 py-1 rounded text-sm font-medium">
                <button
                  type="button"
                  onClick={() => removeNetwork(network)}
                  className="mr-1 hover:bg-accent/30 rounded-full p-1 transition-colors duration-200"
                  aria-label={`Remove ${network} network filter`}
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
                <span>{getNetworkAbbreviation(network)}</span>
              </div>
            ))}
          </div>
        )}

        <CustomDropdown
          options={tokens}
          onSelect={handleTokenSelect}
          selectedItems={selectedTokens}
          placeholder="Asset"
        />
        
        {/* Selected Tokens Display */}
        {selectedTokens.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-2 justify-start sm:justify-center sm:max-w-[140px]">
            {selectedTokens.map((token) => (
              <div key={token} className="flex items-center bg-accent/20 text-accent border border-accent/40 px-2 py-1 rounded text-sm font-medium">
                <button
                  type="button"
                  onClick={() => removeToken(token)}
                  className="mr-1 hover:bg-accent/30 rounded-full p-1 transition-colors duration-200"
                  aria-label={`Remove ${token} asset filter`}
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
                <span>{token}</span>
              </div>
            ))}
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
          className="glass-button flex items-center justify-center space-x-2 px-4 py-2 text-sm text-foreground disabled:opacity-50 disabled:cursor-not-allowed w-full sm:w-auto"
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
      <div className="hidden md:block glass-card overflow-hidden w-full">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse border-spacing-0" style={{ tableLayout: 'fixed', width: '100%' }}>
            <thead className="glass">
              <tr>
                <th className="px-6 py-4 text-center text-sm font-medium text-foreground">
                  Protocols
                </th>
                {showNetworkColumn && (
                  <th className="px-6 py-4 text-center text-sm font-medium text-foreground">
                    Network
                  </th>
                )}
                {showTokenColumn && (
                  <th className="px-6 py-4 text-center text-sm font-medium text-foreground">
                    Token
                  </th>
                )}
                <th 
                  className="px-6 py-4 text-center text-sm font-medium text-foreground cursor-pointer hover:bg-foreground/5 transition-colors duration-200"
                  onClick={() => handleSort('apy')}
                >
                  <div className="flex items-center justify-center gap-2">
                    APY
                    {getSortIcon('apy')}
                  </div>
                </th>
                <th 
                  className="px-6 py-4 text-center text-sm font-medium text-foreground cursor-pointer hover:bg-foreground/5 transition-colors duration-200"
                  onClick={() => handleSort('tvl')}
                >
                  <div className="flex items-center justify-center gap-2">
                    TVL
                    {getSortIcon('tvl')}
                  </div>
                </th>
                <th 
                  className="px-6 py-4 text-center text-sm font-medium text-foreground cursor-pointer hover:bg-foreground/5 transition-colors duration-200"
                  onClick={() => handleSort('utilization')}
                >
                  <div className="flex items-center justify-center gap-2">
                    Utilization
                    {getSortIcon('utilization')}
                  </div>
                </th>
                <th className="px-6 py-4 text-center text-sm font-medium text-foreground">
                  Health
                </th>
                <th className="px-6 py-4 text-center text-sm font-medium text-foreground">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="space-y-1">
              {sortedMarkets.map((market, index) => (
                <tr 
                  key={index}
                  className="hover:bg-accent/5 hover:shadow-lg hover:shadow-accent/10 transition-all duration-300 cursor-pointer group"
                >
                  <td className="px-6 py-4 text-sm font-medium text-foreground text-center">
                    <div className="flex items-center justify-center gap-2">
                      <ProtocolIcon protocol={market.protocol} size={20} />
                      <span>{market.protocol}</span>
                    </div>
                  </td>
                  {showNetworkColumn && (
                    <td className="px-6 py-4 text-sm text-foreground/70 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <NetworkIcon network={market.network} size={20} />
                        <span>{market.network}</span>
                      </div>
                    </td>
                  )}
                  {showTokenColumn && (
                    <td className="px-6 py-4 text-sm text-foreground/70 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <TokenIcon token={market.token} size={20} />
                        <span>{market.token}</span>
                      </div>
                    </td>
                  )}
                  <td className="px-6 py-4 text-sm text-center">
                    <span className="bg-accent/20 text-accent px-3 py-1.5 rounded-full font-semibold border border-accent/30 shadow-sm group-hover:bg-accent/30 group-hover:shadow-md transition-all duration-300">
                      {formatAPY(market.apyValue)}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-foreground/70 text-center">
                    {formatTVL(market.tvlValue)}
                  </td>
                  <td className="px-6 py-4 text-sm text-foreground/70 text-center">
                    {formatUtilization(market.utilizationValue)}
                  </td>
                  <td className="px-6 py-4 text-sm text-center">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getHealthStyle(calculatePoolHealth(market.apyValue, market.utilizationValue, market.tvlValue))}`}>
                      {calculatePoolHealth(market.apyValue, market.utilizationValue, market.tvlValue)}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-center">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      market.status === 'Active' 
                        ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                        : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                    }`}>
                      {market.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Markets Cards - Mobile */}
      <div className="md:hidden space-y-4">
        {/* Mobile Sort Controls */}
        <div className="flex items-center justify-between glass-card px-4 py-3">
          <span className="text-sm font-medium text-foreground">Sort by:</span>
          <div className="flex gap-2">
            <button
              onClick={() => handleSort('apy')}
              className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                sortConfig.key === 'apy' 
                  ? 'bg-accent text-foreground' 
                  : 'glass text-foreground/70 hover:bg-foreground/5'
              }`}
            >
              APY {sortConfig.key === 'apy' && (sortConfig.direction === 'desc' ? '↓' : '↑')}
            </button>
            <button
              onClick={() => handleSort('tvl')}
              className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                sortConfig.key === 'tvl' 
                  ? 'bg-accent text-foreground' 
                  : 'glass text-foreground/70 hover:bg-foreground/5'
              }`}
            >
              TVL {sortConfig.key === 'tvl' && (sortConfig.direction === 'desc' ? '↓' : '↑')}
            </button>
            <button
              onClick={() => handleSort('utilization')}
              className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                sortConfig.key === 'utilization' 
                  ? 'bg-accent text-foreground' 
                  : 'glass text-foreground/70 hover:bg-foreground/5'
              }`}
            >
              Util {sortConfig.key === 'utilization' && (sortConfig.direction === 'desc' ? '↓' : '↑')}
            </button>
          </div>
        </div>

        {/* Market Cards */}
        {sortedMarkets.map((market, index) => (
          <div key={index} className="glass-card p-4 space-y-3">
            {/* Header Row */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <ProtocolIcon protocol={market.protocol} size={24} />
                <div>
                  <div className="font-medium text-foreground">{market.protocol}</div>
                  <div className="text-sm text-foreground/60 flex items-center gap-2">
                    <NetworkIcon network={market.network} size={16} />
                    <span>{market.network}</span>
                    <span>•</span>
                    <TokenIcon token={market.token} size={16} />
                    <span>{market.token}</span>
                  </div>
                </div>
              </div>
              <div className="flex flex-col items-end gap-1">
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                  market.status === 'Active' 
                    ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                    : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                }`}>
                  {market.status}
                </span>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${getHealthStyle(calculatePoolHealth(market.apyValue, market.utilizationValue, market.tvlValue))}`}>
                  {calculatePoolHealth(market.apyValue, market.utilizationValue, market.tvlValue)}
                </span>
              </div>
            </div>

            {/* Metrics Row */}
            <div className="grid grid-cols-3 gap-4 pt-2 border-t border-foreground/20">
              <div className="text-center">
                <div className="text-xs text-foreground/50 mb-1">APY</div>
                <div className="bg-accent/20 text-accent px-3 py-1.5 rounded-full font-semibold text-sm border border-accent/30 shadow-sm">
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
    </div>
  );
}
