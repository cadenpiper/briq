'use client'

import { useState, useEffect } from 'react';
import { formatUnits } from 'viem';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { getContractAddresses } from '../utils/forkAddresses';
import { usePublicContract } from '../hooks/usePublicContract';
import { useContractMarketData } from '../hooks/useContractMarketData';
import { useAaveRewardsAnalytics } from '../hooks/useAaveRewardsAnalytics';
import { useCompoundRewardsAnalytics } from '../hooks/useCompoundRewardsAnalytics';
import BriqVaultArtifact from '../abis/BriqVault.json';
import StrategyCoordinatorArtifact from '../abis/StrategyCoordinator.json';
import PriceFeedManagerArtifact from '../abis/PriceFeedManager.json';
import StrategyAaveArtifact from '../abis/StrategyAave.json';
import StrategyCompoundArtifact from '../abis/StrategyCompoundComet.json';
import Header from '../components/Header';
import Footer from '../components/Footer';

// Extract ABIs from artifacts
const BriqVaultABI = BriqVaultArtifact.abi;
const StrategyCoordinatorABI = StrategyCoordinatorArtifact.abi;
const PriceFeedManagerABI = PriceFeedManagerArtifact.abi;
const StrategyAaveABI = StrategyAaveArtifact.abi;
const StrategyCompoundABI = StrategyCompoundArtifact.abi;

export default function Analytics() {
  const [isMobile, setIsMobile] = useState(false);
  const [hoveredSegment, setHoveredSegment] = useState(null);
  const [selectedSegment, setSelectedSegment] = useState(null);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 640);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const CONTRACTS = getContractAddresses();

  // Get TVL using custom public hook - no wallet needed
  const { data: totalVaultValueRaw, isLoading, error } = usePublicContract({
    address: CONTRACTS.VAULT,
    abi: BriqVaultABI,
    functionName: 'getTotalVaultValueInUSD',
    refetchInterval: 30000,
    enabled: !!CONTRACTS.VAULT
  });

  // Get market-specific data
  const { markets, isLoading: marketsLoading, error: marketsError } = useContractMarketData({
    contracts: CONTRACTS,
    vaultAbi: BriqVaultABI,
    coordinatorAbi: StrategyCoordinatorABI,
    priceFeedAbi: PriceFeedManagerABI
  });

  // Get Aave rewards data
  const { 
    totalRewardsUSD: aaveTotalRewardsUSD, 
    tokenRewards: aaveTokenRewards, 
    isLoading: aaveRewardsLoading, 
    error: aaveRewardsError 
  } = useAaveRewardsAnalytics({
    contracts: CONTRACTS,
    strategyAaveAbi: StrategyAaveABI,
    priceFeedAbi: PriceFeedManagerABI
  });

  // Get Compound rewards data
  const { 
    totalRewardsUSD: compoundTotalRewardsUSD,
    totalInterestRewards: compoundInterestRewards,
    totalProtocolRewards: compoundProtocolRewards,
    tokenRewards: compoundTokenRewards, 
    isLoading: compoundRewardsLoading, 
    error: compoundRewardsError 
  } = useCompoundRewardsAnalytics({
    contracts: CONTRACTS,
    strategyCompoundAbi: StrategyCompoundABI,
    priceFeedAbi: PriceFeedManagerABI
  });

  // Format the TVL value with abbreviations
  const tvl = (() => {
    if (isLoading) return '--.--';
    if (error) return 'Contract Error';
    if (totalVaultValueRaw !== null) {
      const value = parseFloat(formatUnits(totalVaultValueRaw, 18));
      
      if (value >= 1000000) {
        return `$${(value / 1000000).toFixed(2)}M`;
      } else if (value >= 1000) {
        return `$${(value / 1000).toFixed(2)}K`;
      } else {
        return value.toLocaleString('en-US', {
          style: 'currency',
          currency: 'USD',
          minimumFractionDigits: 2,
          maximumFractionDigits: 2
        });
      }
    }
    return '$0.00';
  })();

  // Format total rewards (combine Aave and Compound)
  const totalRewards = (() => {
    if (aaveRewardsLoading || compoundRewardsLoading) return '--.--';
    if (aaveRewardsError && compoundRewardsError) return 'Error';
    
    const totalRewardsUSD = aaveTotalRewardsUSD + compoundTotalRewardsUSD;
    
    if (totalRewardsUSD >= 1000000) {
      return `$${(totalRewardsUSD / 1000000).toFixed(2)}M`;
    } else if (totalRewardsUSD >= 1000) {
      return `$${(totalRewardsUSD / 1000).toFixed(2)}K`;
    } else {
      return totalRewardsUSD.toLocaleString('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      });
    }
  })();

  // Calculate total TVL from markets for allocation percentages
  const totalMarketValue = markets.reduce((sum, market) => sum + market.usdValueFormatted, 0);

  // Calculate weighted average APY
  const weightedAverageAPY = (() => {
    if (marketsLoading || markets.length === 0 || totalMarketValue === 0) return '--.--';
    
    const totalWeightedAPY = markets.reduce((sum, market) => {
      const weight = market.usdValueFormatted / totalMarketValue;
      return sum + (parseFloat(market.apyFormatted) * weight);
    }, 0);
    
    return totalWeightedAPY.toFixed(2) + '%';
  })();

  // Color scheme for pie chart
  const pieColors = [
    'url(#blueGradient)',
    'url(#greenGradient)',
    'url(#amberGradient)',
    'url(#violetGradient)',
    'url(#redGradient)',
    'url(#cyanGradient)',
  ];

  // Solid colors for pie chart data
  const solidColors = [
    '#3B82F6',
    '#059669',
    '#F59E0B',
    '#8B5CF6',
    '#EF4444',
    '#06B6D4',
  ];

  // Prepare pie chart data
  const pieChartData = markets.map((market, index) => ({
    name: market.tokenSymbol,
    value: market.usdValueFormatted,
    strategy: market.strategyName,
    percentage: totalMarketValue > 0 ? (market.usdValueFormatted / totalMarketValue * 100) : 0,
    apy: market.apyFormatted,
    balance: market.balanceFormatted,
    color: solidColors[index % solidColors.length]
  }));

  // Center label component for donut chart
  const CenterLabel = ({ hoveredData, selectedData, isMobile }) => {
    const displayData = isMobile ? selectedData : hoveredData;
    
    if (!displayData) {
      return null;
    }

    // Get protocol brand color
    const getProtocolColor = (strategyName) => {
      if (strategyName.toLowerCase().includes('aave')) {
        return '#3B82F6';
      } else if (strategyName.toLowerCase().includes('compound')) {
        return '#059669';
      }
      return '#6B7280';
    };

    return (
      <text x="50%" y="50%" textAnchor="middle" dominantBaseline="central">
        <tspan 
          x="50%" 
          dy={isMobile ? "-0.3em" : "-0.6em"}
          fontSize={isMobile ? "11" : "16"} 
          className="font-bold"
          fill={displayData.color}
        >
          {displayData.name}
        </tspan>
        <tspan 
          x="50%" 
          dy={isMobile ? "1.1em" : "1.6em"}
          fontSize={isMobile ? "9" : "13"} 
          className="font-medium"
          fill={getProtocolColor(displayData.strategy)}
        >
          {displayData.strategy}
        </tspan>
      </text>
    );
  };

  const CustomTooltip = ({ active, payload }) => {
    return null;
  };

  // Skeleton loading components
  const SkeletonBox = ({ className = "" }) => (
    <div className={`bg-zen-200 dark:bg-zen-700 rounded animate-pulse ${className}`}></div>
  );

  const SkeletonText = ({ className = "" }) => (
    <div className={`bg-zen-200 dark:bg-zen-700 rounded animate-pulse ${className}`}></div>
  );

  return (
    <>
      <Header />
      <div className="min-h-screen bg-cream-100 dark:bg-zen-900 transition-colors duration-300">
        <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-8">
          {/* Page Header */}
          <div className="mb-6 sm:mb-8 animate-fade-in">
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-zen-900 dark:text-cream-100 mb-2">
              Analytics
            </h1>
            <p className="text-zen-600 dark:text-cream-400 text-sm sm:text-base lg:text-lg">
              Protocol insights and performance metrics
            </p>
          </div>

          {/* Metrics Row - Mobile First Responsive */}
          <div className="flex flex-col lg:flex-row gap-4 sm:gap-6 mb-6 sm:mb-8 animate-fade-in-up">
            {/* Metrics Cards - Stack on mobile, row on larger screens */}
            <div className="flex flex-col sm:flex-row lg:flex-col gap-3 sm:gap-4">
              {/* TVL Card */}
              <div className="bg-cream-50 dark:bg-zen-800 rounded-xl p-4 sm:p-6 border border-zen-300 dark:border-zen-600 shadow-sm hover:shadow-md transition-all duration-300 hover:scale-[1.02] flex-1 sm:flex-1 lg:flex-none">
                <div className="flex flex-col">
                  <h2 className="text-sm sm:text-lg font-semibold text-zen-600 dark:text-cream-400 mb-2 sm:mb-3">
                    TVL
                  </h2>
                  <div className="text-2xl sm:text-3xl lg:text-4xl font-bold text-zen-900 dark:text-cream-100 font-jetbrains-mono">
                    {marketsLoading ? (
                      <SkeletonText className="h-8 sm:h-10 w-24 sm:w-32" />
                    ) : (
                      tvl
                    )}
                  </div>
                  <div className="text-xs text-zen-500 dark:text-cream-500 mt-1 sm:mt-2">
                    Total Value Locked
                  </div>
                </div>
              </div>

              {/* Average APY Card */}
              <div className="bg-cream-50 dark:bg-zen-800 rounded-xl p-4 sm:p-6 border border-zen-300 dark:border-zen-600 shadow-sm hover:shadow-md transition-all duration-300 hover:scale-[1.02] flex-1 sm:flex-1 lg:flex-none">
                <div className="flex flex-col">
                  <h2 className="text-sm sm:text-lg font-semibold text-zen-600 dark:text-cream-400 mb-2 sm:mb-3">
                    Average APY
                  </h2>
                  <div className="text-2xl sm:text-3xl lg:text-4xl font-bold text-green-600 font-jetbrains-mono">
                    {marketsLoading ? (
                      <SkeletonText className="h-8 sm:h-10 w-20 sm:w-24" />
                    ) : (
                      weightedAverageAPY
                    )}
                  </div>
                  <div className="text-xs text-zen-500 dark:text-cream-500 mt-1 sm:mt-2">
                    Weighted by TVL
                  </div>
                </div>
              </div>

              {/* Total Rewards Card */}
              <div className="bg-cream-50 dark:bg-zen-800 rounded-xl p-4 sm:p-6 border border-zen-300 dark:border-zen-600 shadow-sm hover:shadow-md transition-all duration-300 hover:scale-[1.02] flex-1 sm:flex-1 lg:flex-none">
                <div className="flex flex-col">
                  <h2 className="text-sm sm:text-lg font-semibold text-zen-600 dark:text-cream-400 mb-2 sm:mb-3">
                    Total Rewards
                  </h2>
                  <div className="text-2xl sm:text-3xl lg:text-4xl font-bold text-briq-orange dark:text-orange-400 font-jetbrains-mono">
                    {(aaveRewardsLoading || compoundRewardsLoading) ? (
                      <SkeletonText className="h-8 sm:h-10 w-24 sm:w-28" />
                    ) : (
                      totalRewards
                    )}
                  </div>
                  <div className="text-xs text-zen-500 dark:text-cream-500 mt-1 sm:mt-2">
                    Aave + Compound
                  </div>
                </div>
              </div>
            </div>

            {/* Market Details with Pie Chart - Full width on mobile */}
            {markets.length > 0 && (
              <div className="bg-cream-50 dark:bg-zen-800 rounded-xl p-4 sm:p-6 border border-zen-300 dark:border-zen-600 shadow-sm hover:shadow-md transition-all duration-300 hover:scale-[1.02] flex-1 lg:max-w-md">
                <h3 className="text-sm sm:text-lg font-semibold text-zen-600 dark:text-cream-400 mb-4">
                  Market Allocation
                </h3>
                
                <div className="flex flex-col gap-4 items-center h-full">
                  {/* Pie Chart - Responsive sizing */}
                  <div className="flex-shrink-0 w-full flex justify-center">
                    <div 
                      className="w-48 h-48 sm:w-56 sm:h-56 lg:w-64 lg:h-64 focus:outline-none" 
                      style={{ 
                        filter: 'drop-shadow(0 8px 16px rgba(0, 0, 0, 0.15))',
                        outline: 'none'
                      }}
                      onMouseLeave={() => {
                        if (!isMobile) {
                          setHoveredSegment(null);
                        }
                      }}
                    >
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart 
                          style={{ outline: 'none' }}
                        >
                          <defs>
                            <linearGradient id="blueGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                              <stop offset="0%" stopColor="#60A5FA" />
                              <stop offset="100%" stopColor="#1D4ED8" />
                            </linearGradient>
                            <linearGradient id="greenGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                              <stop offset="0%" stopColor="#34D399" />
                              <stop offset="100%" stopColor="#047857" />
                            </linearGradient>
                            <linearGradient id="amberGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                              <stop offset="0%" stopColor="#FBBF24" />
                              <stop offset="100%" stopColor="#D97706" />
                            </linearGradient>
                            <linearGradient id="violetGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                              <stop offset="0%" stopColor="#A78BFA" />
                              <stop offset="100%" stopColor="#7C3AED" />
                            </linearGradient>
                            <linearGradient id="redGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                              <stop offset="0%" stopColor="#F87171" />
                              <stop offset="100%" stopColor="#DC2626" />
                            </linearGradient>
                            <linearGradient id="cyanGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                              <stop offset="0%" stopColor="#22D3EE" />
                              <stop offset="100%" stopColor="#0891B2" />
                            </linearGradient>
                          </defs>
                          <Pie
                            data={pieChartData}
                            cx="50%"
                            cy="50%"
                            outerRadius="80%"
                            innerRadius="30%"
                            paddingAngle={0}
                            dataKey="value"
                            onMouseEnter={(data, index) => {
                              if (!isMobile) {
                                setHoveredSegment(data);
                              }
                            }}
                            onMouseLeave={() => {
                              if (!isMobile) {
                                setHoveredSegment(null);
                              }
                            }}
                            onClick={(data, index) => {
                              if (isMobile) {
                                // Toggle selection on mobile
                                setSelectedSegment(selectedSegment?.name === data.name ? null : data);
                              }
                            }}
                          >
                            {pieChartData.map((entry, index) => {
                              const isHovered = !isMobile && hoveredSegment?.name === entry.name;
                              const isSelected = isMobile && selectedSegment?.name === entry.name;
                              const shouldScale = isHovered || isSelected;
                              
                              return (
                                <Cell 
                                  key={`cell-${index}`} 
                                  fill={pieColors[index % pieColors.length]}
                                  stroke="transparent"
                                  strokeWidth={0}
                                  style={{
                                    filter: shouldScale 
                                      ? 'drop-shadow(0 4px 8px rgba(0, 0, 0, 0.2))' 
                                      : 'drop-shadow(0 2px 4px rgba(0, 0, 0, 0.1))',
                                    transform: shouldScale ? 'scale(1.02)' : 'scale(1)',
                                    transformOrigin: 'center',
                                    transition: 'all 0.2s ease-in-out',
                                    cursor: 'pointer',
                                    outline: 'none !important',
                                    border: 'none',
                                    boxShadow: 'none'
                                  }}
                                />
                              );
                            })}
                          </Pie>
                          <CenterLabel 
                            hoveredData={hoveredSegment} 
                            selectedData={selectedSegment} 
                            isMobile={isMobile} 
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* Market Details List - Responsive */}
                  <div className="flex-1 w-full">
                    <div className="space-y-1 sm:space-y-2">
                      {marketsLoading ? (
                        // Skeleton loading for market items
                        Array.from({ length: 2 }).map((_, index) => (
                          <div key={index} className="flex items-center justify-between p-2 sm:p-3 bg-zen-100 dark:bg-zen-700 rounded-lg">
                            <div className="flex items-center space-x-2 min-w-0 flex-1">
                              <SkeletonBox className="w-3 h-3 rounded-full" />
                              <div className="min-w-0 flex-1">
                                <SkeletonText className="h-3 sm:h-4 w-12 mb-1" />
                                <SkeletonText className="h-2 sm:h-3 w-16" />
                              </div>
                            </div>
                            <div className="text-right flex-shrink-0 ml-1">
                              <SkeletonText className="h-3 sm:h-4 w-16 mb-1" />
                              <SkeletonText className="h-2 sm:h-3 w-20" />
                            </div>
                          </div>
                        ))
                      ) : (
                        markets.map((market, index) => {
                          const allocation = totalMarketValue > 0 ? (market.usdValueFormatted / totalMarketValue * 100) : 0;
                          return (
                            <div key={index} className="flex items-center justify-between p-2 sm:p-3 bg-zen-100 dark:bg-zen-700 rounded-lg hover:bg-zen-200 dark:hover:bg-zen-600 transition-colors duration-200">
                              <div className="flex items-center space-x-2 min-w-0 flex-1">
                                <div 
                                  className="w-3 h-3 rounded-full flex-shrink-0 shadow-sm"
                                  style={{ backgroundColor: solidColors[index % solidColors.length] }}
                                />
                                <div className="min-w-0 flex-1">
                                  <div className="font-semibold text-xs sm:text-sm text-zen-900 dark:text-cream-100 truncate">
                                    {market.tokenSymbol}
                                  </div>
                                  <div className="text-xs text-zen-500 dark:text-cream-500 truncate">
                                    via {market.strategyName}
                                  </div>
                                </div>
                              </div>
                              <div className="text-right flex-shrink-0 ml-1">
                                <div className="font-jetbrains-mono text-xs sm:text-sm font-bold text-zen-900 dark:text-cream-100">
                                  ${market.usdValueFormatted.toFixed(2)}
                                </div>
                                <div className="text-xs text-zen-500 dark:text-cream-500 whitespace-nowrap">
                                  {allocation.toFixed(1)}% • {market.apyFormatted}% APY
                                </div>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Aave Rewards Details */}
          {aaveTokenRewards.length > 0 && (
            <div className="bg-cream-50 dark:bg-zen-800 rounded-xl p-4 sm:p-6 border border-zen-300 dark:border-zen-600 shadow-sm hover:shadow-md transition-all duration-300 hover:scale-[1.02] mb-6 sm:mb-8">
              <h3 className="text-sm sm:text-lg font-semibold text-zen-600 dark:text-cream-400 mb-4 sm:mb-6">
                Aave Strategy Rewards
              </h3>
              <div className="space-y-4 sm:space-y-6">
                {aaveTokenRewards.map((token, index) => (
                  <div key={index} className="space-y-3">
                    {/* Token Info Row - Mobile Optimized */}
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 sm:gap-0">
                      <div className="flex items-center space-x-3">
                        <div className="flex flex-col">
                          <span className="font-semibold text-base sm:text-lg text-zen-900 dark:text-cream-100">
                            {token.tokenSymbol} Rewards
                          </span>
                          <span className="text-xs sm:text-sm text-zen-500 dark:text-cream-500">
                            Current APY: {token.currentAPYFormatted}%
                          </span>
                        </div>
                      </div>
                      <div className="text-left sm:text-right space-y-1">
                        <div className="font-jetbrains-mono text-lg sm:text-xl font-bold text-blue-200 dark:text-blue-800">
                          {token.accruedRewardsFormatted.toFixed(6)} {token.tokenSymbol}
                        </div>
                        <div className="text-xs sm:text-sm text-zen-500 dark:text-cream-500">
                          ${token.rewardsUSD.toFixed(2)} USD (Interest)
                        </div>
                      </div>
                    </div>
                    
                    {/* Analytics Details - Mobile Optimized */}
                    <div className="grid grid-cols-1 gap-3 sm:gap-4 text-sm">
                      <div className="bg-zen-100 dark:bg-zen-700 p-3 rounded">
                        <div className="text-zen-500 dark:text-cream-500 text-xs sm:text-sm">Current Balance</div>
                        <div className="font-semibold text-zen-900 dark:text-cream-100 text-sm sm:text-base">
                          {token.currentBalanceFormatted.toFixed(4)} {token.tokenSymbol}
                        </div>
                      </div>
                    </div>
                    
                    {/* Reward Type - Single colored box for Aave */}
                    <div className="grid grid-cols-1 gap-3 sm:gap-4 text-sm">
                      <div className="bg-blue-50 dark:bg-blue-900/20 p-3 sm:p-4 rounded-lg border border-blue-200 dark:border-blue-800 hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors duration-200">
                        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 sm:gap-0">
                          <div>
                            <div className="text-zen-900 dark:text-cream-100 font-medium text-sm sm:text-base">aToken Interest Rewards</div>
                            <div className="text-xs text-zen-500 dark:text-cream-500 mt-1">
                              Automatic rebasing rewards from Aave lending
                            </div>
                          </div>
                          <div className="text-left sm:text-right">
                            <div className="font-semibold text-zen-900 dark:text-cream-100 text-base sm:text-lg">
                              {token.accruedRewardsFormatted.toFixed(6)} {token.tokenSymbol}
                            </div>
                            <div className="text-xs text-zen-500 dark:text-cream-500">
                              ${token.rewardsUSD.toFixed(2)} USD
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    {/* Divider */}
                    {index < aaveTokenRewards.length - 1 && (
                      <div className="border-b border-zen-200 dark:border-zen-700 pt-3" />
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Compound Rewards Details */}
          {compoundTokenRewards.length > 0 && (
            <div className="bg-cream-50 dark:bg-zen-800 rounded-xl p-4 sm:p-6 border border-zen-300 dark:border-zen-600 shadow-sm hover:shadow-md transition-all duration-300 hover:scale-[1.02]">
              <h3 className="text-sm sm:text-lg font-semibold text-zen-600 dark:text-cream-400 mb-4 sm:mb-6">
                Compound Strategy Rewards
              </h3>
              <div className="space-y-4 sm:space-y-6">
                {compoundTokenRewards.map((token, index) => (
                  <div key={index} className="space-y-3">
                    {/* Token Info Row - Mobile Optimized */}
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 sm:gap-0">
                      <div className="flex items-center space-x-3">
                        <div className="flex flex-col">
                          <span className="font-semibold text-base sm:text-lg text-zen-900 dark:text-cream-100">
                            {token.tokenSymbol} Rewards
                          </span>
                          <span className="text-xs sm:text-sm text-zen-500 dark:text-cream-500">
                            Current APY: {token.currentAPYFormatted}%
                          </span>
                        </div>
                      </div>
                      <div className="text-left sm:text-right space-y-1">
                        <div className="font-jetbrains-mono text-lg sm:text-xl font-bold text-green-200 dark:text-green-800">
                          {compoundRewardsLoading ? (
                            <SkeletonText className="h-5 sm:h-6 w-28 sm:w-32" />
                          ) : (
                            `${token.interestRewardsFormatted.toFixed(6)} ${token.tokenSymbol}`
                          )}
                        </div>
                        {token.protocolRewardsFormatted > 0 && (
                          <div className="font-jetbrains-mono text-lg sm:text-xl font-bold text-green-300 dark:text-green-700">
                            {compoundRewardsLoading ? (
                              <SkeletonText className="h-5 sm:h-6 w-24 sm:w-28" />
                            ) : (
                              `${token.protocolRewardsFormatted.toFixed(6)} COMP`
                            )}
                          </div>
                        )}
                        <div className="text-xs sm:text-sm text-zen-500 dark:text-cream-500">
                          {compoundRewardsLoading ? (
                            <SkeletonText className="h-3 sm:h-4 w-24 sm:w-28" />
                          ) : (
                            `$${token.interestRewardsUSD.toFixed(2)} USD (Interest)`
                          )}
                        </div>
                      </div>
                    </div>
                    
                    {/* Analytics Details - Mobile Optimized */}
                    <div className="grid grid-cols-1 gap-3 sm:gap-4 text-sm">
                      <div className="bg-zen-100 dark:bg-zen-700 p-3 rounded">
                        <div className="text-zen-500 dark:text-cream-500 text-xs sm:text-sm">Current Balance</div>
                        <div className="font-semibold text-zen-900 dark:text-cream-100 text-sm sm:text-base">
                          {token.currentBalanceFormatted.toFixed(4)} {token.tokenSymbol}
                        </div>
                      </div>
                    </div>
                    
                    {/* Reward Types Breakdown - Mobile Optimized */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 text-sm">
                      <div className="bg-green-50 dark:bg-green-900/20 p-3 rounded-lg border border-green-200 dark:border-green-800 hover:bg-green-100 dark:hover:bg-green-900/30 transition-colors duration-200">
                        <div className="text-zen-900 dark:text-cream-100 font-medium text-sm sm:text-base">Interest Rewards</div>
                        <div className="font-semibold text-zen-900 dark:text-cream-100 text-sm sm:text-base mt-1">
                          {token.interestRewardsFormatted.toFixed(6)} {token.tokenSymbol}
                        </div>
                      </div>
                      <div className="bg-green-100 dark:bg-green-800/20 p-3 rounded-lg border border-green-300 dark:border-green-700 hover:bg-green-200 dark:hover:bg-green-800/30 transition-colors duration-200">
                        <div className="text-zen-900 dark:text-cream-100 font-medium text-sm sm:text-base">Protocol Rewards</div>
                        <div className="font-semibold text-zen-900 dark:text-cream-100 text-sm sm:text-base mt-1">
                          {token.protocolRewardsFormatted.toFixed(6)} COMP
                        </div>
                      </div>
                    </div>
                    
                    {/* Divider */}
                    {index < compoundTokenRewards.length - 1 && (
                      <div className="border-b border-zen-200 dark:border-zen-700 pt-3" />
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
      <Footer />
    </>
  );
}
