"use client";

import { useState, useMemo } from 'react';

export default function MarketTable() {
  const [selectedNetworks, setSelectedNetworks] = useState([]);
  const [selectedTokens, setSelectedTokens] = useState([]);
  const [sortConfig, setSortConfig] = useState({ key: 'apy', direction: 'desc' });

  const networks = ['All', 'Ethereum', 'Base', 'Arbitrum One'];
  const tokens = ['All', 'USDC', 'USDT'];

  // Network abbreviations for chips
  const getNetworkAbbreviation = (network) => {
    switch (network) {
      case 'Ethereum':
        return 'ETH';
      case 'Base':
        return 'BASE';
      case 'Arbitrum One':
        return 'ARB';
      default:
        return network;
    }
  };

  // Network and token-specific market data
  const marketData = {
    'Ethereum': {
      'USDC': [
        {
          protocol: "Aave v3",
          network: "Ethereum",
          token: "USDC",
          apy: "4.2%",
          apyValue: 4.2,
          tvl: "$2.1B",
          tvlValue: 2100000000,
          utilization: "78.5%",
          utilizationValue: 78.5,
          status: "Active"
        },
        {
          protocol: "Compound v3",
          network: "Ethereum",
          token: "USDC",
          apy: "3.8%",
          apyValue: 3.8,
          tvl: "$1.8B",
          tvlValue: 1800000000,
          utilization: "82.3%",
          utilizationValue: 82.3,
          status: "Active"
        }
      ],
      'USDT': [
        {
          protocol: "Aave v3",
          network: "Ethereum",
          token: "USDT",
          apy: "3.9%",
          apyValue: 3.9,
          tvl: "$1.9B",
          tvlValue: 1900000000,
          utilization: "75.2%",
          utilizationValue: 75.2,
          status: "Coming Soon"
        },
        {
          protocol: "Compound v3",
          network: "Ethereum",
          token: "USDT",
          apy: "3.5%",
          apyValue: 3.5,
          tvl: "$1.6B",
          tvlValue: 1600000000,
          utilization: "80.1%",
          utilizationValue: 80.1,
          status: "Coming Soon"
        }
      ]
    },
    'Base': {
      'USDC': [
        {
          protocol: "Aave v3",
          network: "Base",
          token: "USDC",
          apy: "5.1%",
          apyValue: 5.1,
          tvl: "$450M",
          tvlValue: 450000000,
          utilization: "65.2%",
          utilizationValue: 65.2,
          status: "Active"
        },
        {
          protocol: "Compound v3",
          network: "Base",
          token: "USDC",
          apy: "4.7%",
          apyValue: 4.7,
          tvl: "$320M",
          tvlValue: 320000000,
          utilization: "71.8%",
          utilizationValue: 71.8,
          status: "Active"
        }
      ],
      'USDT': [
        {
          protocol: "Aave v3",
          network: "Base",
          token: "USDT",
          apy: "4.8%",
          apyValue: 4.8,
          tvl: "$380M",
          tvlValue: 380000000,
          utilization: "62.7%",
          utilizationValue: 62.7,
          status: "Coming Soon"
        },
        {
          protocol: "Compound v3",
          network: "Base",
          token: "USDT",
          apy: "4.4%",
          apyValue: 4.4,
          tvl: "$290M",
          tvlValue: 290000000,
          utilization: "69.3%",
          utilizationValue: 69.3,
          status: "Coming Soon"
        }
      ]
    },
    'Arbitrum One': {
      'USDC': [
        {
          protocol: "Aave v3",
          network: "Arbitrum One",
          token: "USDC",
          apy: "4.8%",
          apyValue: 4.8,
          tvl: "$890M",
          tvlValue: 890000000,
          utilization: "73.4%",
          utilizationValue: 73.4,
          status: "Active"
        },
        {
          protocol: "Compound v3",
          network: "Arbitrum One",
          token: "USDC",
          apy: "4.3%",
          apyValue: 4.3,
          tvl: "$650M",
          tvlValue: 650000000,
          utilization: "79.1%",
          utilizationValue: 79.1,
          status: "Active"
        }
      ],
      'USDT': [
        {
          protocol: "Aave v3",
          network: "Arbitrum One",
          token: "USDT",
          apy: "4.5%",
          apyValue: 4.5,
          tvl: "$720M",
          tvlValue: 720000000,
          utilization: "70.8%",
          utilizationValue: 70.8,
          status: "Coming Soon"
        },
        {
          protocol: "Compound v3",
          network: "Arbitrum One",
          token: "USDT",
          apy: "4.0%",
          apyValue: 4.0,
          tvl: "$580M",
          tvlValue: 580000000,
          utilization: "76.5%",
          utilizationValue: 76.5,
          status: "Coming Soon"
        }
      ]
    }
  };

  // Handle network selection
  const handleNetworkSelect = (network) => {
    if (network === 'All') {
      setSelectedNetworks(['Ethereum', 'Base', 'Arbitrum One']);
    } else if (!selectedNetworks.includes(network)) {
      setSelectedNetworks([...selectedNetworks, network]);
    }
  };

  // Handle token selection
  const handleTokenSelect = (token) => {
    if (token === 'All') {
      setSelectedTokens(['USDC', 'USDT']);
    } else if (!selectedTokens.includes(token)) {
      setSelectedTokens([...selectedTokens, token]);
    }
  };

  // Remove network selection
  const removeNetwork = (network) => {
    setSelectedNetworks(selectedNetworks.filter(n => n !== network));
  };

  // Remove token selection
  const removeToken = (token) => {
    setSelectedTokens(selectedTokens.filter(t => t !== token));
  };

  // Function to get current markets based on selections
  const getCurrentMarkets = () => {
    let markets = [];

    const networksToShow = selectedNetworks.length === 0 
      ? ['Ethereum', 'Base', 'Arbitrum One'] 
      : selectedNetworks;
    
    const tokensToShow = selectedTokens.length === 0 
      ? ['USDC', 'USDT'] 
      : selectedTokens;

    networksToShow.forEach(network => {
      tokensToShow.forEach(token => {
        if (marketData[network] && marketData[network][token]) {
          markets = markets.concat(marketData[network][token]);
        }
      });
    });

    return markets;
  };

  // Sorting function
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
  }, [selectedNetworks, selectedTokens, sortConfig]);

  // Handle sorting
  const handleSort = (key) => {
    setSortConfig(prevConfig => ({
      key,
      direction: prevConfig.key === key && prevConfig.direction === 'desc' ? 'asc' : 'desc'
    }));
  };

  // Get sort icon
  const getSortIcon = (columnKey) => {
    if (sortConfig.key !== columnKey) {
      return (
        <svg className="w-4 h-4 text-zen-400 dark:text-cream-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
        </svg>
      );
    }
    
    if (sortConfig.direction === 'desc') {
      return (
        <svg className="w-4 h-4 text-briq-orange" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
        </svg>
      );
    } else {
      return (
        <svg className="w-4 h-4 text-briq-orange" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
        </svg>
      );
    }
  };

  const showNetworkColumn = selectedNetworks.length !== 1;
  const showTokenColumn = selectedTokens.length !== 1;

  return (
    <div className="space-y-4">
      {/* Network and Token Dropdowns */}
      <div className="flex gap-6 justify-start">
        {/* Network Dropdown */}
        <div className="space-y-2 flex-shrink-0">
          <label htmlFor="network-select" className="block text-sm font-medium text-zen-900 dark:text-cream-100">
            Network
          </label>
          <div className="relative inline-block">
            <select
              id="network-select"
              name="network-select"
              onChange={(e) => {
                if (e.target.value && e.target.value !== 'Select') {
                  handleNetworkSelect(e.target.value);
                  e.target.value = 'Select'; // Reset dropdown
                }
              }}
              className="bg-cream-100 dark:bg-zen-700 border border-cream-300 dark:border-zen-600 text-zen-900 dark:text-cream-100 px-4 py-2 pr-10 rounded-lg focus:outline-none transition-all duration-200 appearance-none cursor-pointer w-[140px] relative z-10"
              style={{ fontWeight: 'normal' }}
              defaultValue="Select"
            >
              <option value="Select" disabled>Select</option>
              {networks.filter(network => {
                if (network === 'All') return true;
                return !selectedNetworks.includes(network);
              }).map((network) => (
                <option key={network} value={network}>
                  {network}
                </option>
              ))}
            </select>
            {/* Custom dropdown arrow */}
            <div className="absolute top-1/2 right-3 transform -translate-y-1/2 pointer-events-none z-20">
              <svg className="w-4 h-4 text-zen-700 dark:text-cream-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>
          {/* Network Selection Chips */}
          {selectedNetworks.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1 justify-center max-w-[140px]">
              {selectedNetworks.map((network) => (
                <div key={network} className="flex items-center bg-briq-orange/20 text-briq-orange border border-briq-orange/40 px-1.5 py-0.5 rounded text-xs font-medium">
                  <button
                    type="button"
                    onClick={() => removeNetwork(network)}
                    className="mr-0.5 hover:bg-briq-orange/30 rounded-full p-0.5 transition-colors duration-200"
                    aria-label={`Remove ${network} network filter`}
                  >
                    <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                  <span>{getNetworkAbbreviation(network)}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Token Dropdown */}
        <div className="space-y-2 flex-shrink-0">
          <label htmlFor="asset-select" className="block text-sm font-medium text-zen-900 dark:text-cream-100">
            Asset
          </label>
          <div className="relative inline-block">
            <select
              id="asset-select"
              name="asset-select"
              onChange={(e) => {
                if (e.target.value && e.target.value !== 'Select') {
                  handleTokenSelect(e.target.value);
                  e.target.value = 'Select'; // Reset dropdown
                }
              }}
              className="bg-cream-100 dark:bg-zen-700 border border-cream-300 dark:border-zen-600 text-zen-900 dark:text-cream-100 px-4 py-2 pr-10 rounded-lg focus:outline-none transition-all duration-200 appearance-none cursor-pointer w-[140px] relative z-10"
              style={{ fontWeight: 'normal' }}
              defaultValue="Select"
            >
              <option value="Select" disabled>Select</option>
              {tokens.filter(token => {
                if (token === 'All') return true;
                return !selectedTokens.includes(token);
              }).map((token) => (
                <option key={token} value={token}>
                  {token}
                </option>
              ))}
            </select>
            {/* Custom dropdown arrow */}
            <div className="absolute top-1/2 right-3 transform -translate-y-1/2 pointer-events-none z-20">
              <svg className="w-4 h-4 text-zen-700 dark:text-cream-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>
          {/* Token Selection Chips */}
          {selectedTokens.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1 justify-center max-w-[140px]">
              {selectedTokens.map((token) => (
                <div key={token} className="flex items-center bg-briq-orange/20 text-briq-orange border border-briq-orange/40 px-1.5 py-0.5 rounded text-xs font-medium">
                  <button
                    type="button"
                    onClick={() => removeToken(token)}
                    className="mr-0.5 hover:bg-briq-orange/30 rounded-full p-0.5 transition-colors duration-200"
                    aria-label={`Remove ${token} asset filter`}
                  >
                    <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                  <span>{token}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Markets Table */}
      <div className="bg-cream-100 dark:bg-zen-700 rounded-lg border border-cream-300 dark:border-zen-600 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-cream-200 dark:bg-zen-600">
              <tr>
                <th className="px-6 py-4 text-left text-sm font-medium text-zen-900 dark:text-cream-100">
                  Protocols
                </th>
                {showNetworkColumn && (
                  <th className="px-6 py-4 text-left text-sm font-medium text-zen-900 dark:text-cream-100">
                    Network
                  </th>
                )}
                {showTokenColumn && (
                  <th className="px-6 py-4 text-left text-sm font-medium text-zen-900 dark:text-cream-100">
                    Token
                  </th>
                )}
                <th 
                  className="px-6 py-4 text-left text-sm font-medium text-zen-900 dark:text-cream-100 cursor-pointer hover:bg-cream-300 dark:hover:bg-zen-500 transition-colors duration-200"
                  onClick={() => handleSort('apy')}
                >
                  <div className="flex items-center gap-2">
                    APY
                    {getSortIcon('apy')}
                  </div>
                </th>
                <th 
                  className="px-6 py-4 text-left text-sm font-medium text-zen-900 dark:text-cream-100 cursor-pointer hover:bg-cream-300 dark:hover:bg-zen-500 transition-colors duration-200"
                  onClick={() => handleSort('tvl')}
                >
                  <div className="flex items-center gap-2">
                    TVL
                    {getSortIcon('tvl')}
                  </div>
                </th>
                <th 
                  className="px-6 py-4 text-left text-sm font-medium text-zen-900 dark:text-cream-100 cursor-pointer hover:bg-cream-300 dark:hover:bg-zen-500 transition-colors duration-200"
                  onClick={() => handleSort('utilization')}
                >
                  <div className="flex items-center gap-2">
                    Utilization
                    {getSortIcon('utilization')}
                  </div>
                </th>
                <th className="px-6 py-4 text-left text-sm font-medium text-zen-900 dark:text-cream-100">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-cream-300 dark:divide-zen-600">
              {/* Dividing line between headers and data */}
              <tr className="border-t border-cream-300 dark:border-zen-600">
                <td colSpan={5 + (showNetworkColumn ? 1 : 0) + (showTokenColumn ? 1 : 0)} className="h-0"></td>
              </tr>
              {sortedMarkets.map((market, index) => (
                <tr 
                  key={index}
                  className="hover:bg-cream-200 dark:hover:bg-zen-600 transition-colors duration-200"
                >
                  <td className="px-6 py-4 text-sm font-medium text-zen-900 dark:text-cream-100">
                    {market.protocol}
                  </td>
                  {showNetworkColumn && (
                    <td className="px-6 py-4 text-sm text-zen-700 dark:text-cream-200">
                      {market.network}
                    </td>
                  )}
                  {showTokenColumn && (
                    <td className="px-6 py-4 text-sm text-zen-700 dark:text-cream-200">
                      {market.token}
                    </td>
                  )}
                  <td className="px-6 py-4 text-sm">
                    <span className="bg-briq-orange/20 text-briq-orange px-2 py-1 rounded-full font-medium">
                      {market.apy}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-zen-700 dark:text-cream-200">
                    {market.tvl}
                  </td>
                  <td className="px-6 py-4 text-sm text-zen-700 dark:text-cream-200">
                    {market.utilization}
                  </td>
                  <td className="px-6 py-4 text-sm">
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
    </div>
  );
}
