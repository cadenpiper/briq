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
import { 
  TVLChart, 
  TokenAPYChart, 
  ProtocolTVLChart, 
  ChainTVLChart, 
  UserAnalyticsChart, 
  VolumeChart,
  AvgDepositMetric
} from '../components/AnalyticsCharts';

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
    priceFeedAbi: PriceFeedManagerABI,
    strategyAaveAbi: StrategyAaveABI,
    strategyCompoundAbi: StrategyCompoundABI
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
    id: `${market.tokenSymbol}-${market.strategyName}`,
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
    <div className={`glass rounded animate-pulse ${className}`}></div>
  );

  const SkeletonText = ({ className = "" }) => (
    <div className={`glass rounded animate-pulse ${className}`}></div>
  );

  return (
    <>
      <Header />
      <div className="min-h-screen transition-colors duration-300">
        <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-8">
          {/* Page Header */}
          <div className="mb-16 sm:mb-20 lg:mb-24 text-center animate-fade-in">
            <h1 className="text-3xl sm:text-4xl md:text-5xl text-foreground font-light mb-4 sm:mb-6 transition-colors duration-300 leading-tight"
                style={{ fontFamily: 'var(--font-jetbrains-mono)', fontWeight: 100 }}>
              Analytics
            </h1>
            <p className="text-lg sm:text-xl text-foreground/70 max-w-2xl mx-auto font-light font-lato">
              Protocol insights and performance metrics
            </p>
          </div>

          {/* Metrics Row - Mobile First Responsive */}
          <div className="flex flex-col lg:flex-row gap-4 sm:gap-6 mb-6 sm:mb-8 animate-fade-in-up">
            {/* Metrics Cards - Stack on mobile, row on larger screens */}
            <div className="flex flex-col sm:flex-row lg:flex-col gap-3 sm:gap-4">
              {/* TVL Card */}
              <div className="glass-card p-4 sm:p-6 hover:scale-[1.02] transition-all duration-300 flex-1 sm:flex-1 lg:flex-none">
                <div className="flex flex-col">
                  <h2 className="text-sm sm:text-lg font-semibold text-foreground/60 mb-2 sm:mb-3">
                    TVL
                  </h2>
                  <div className="text-2xl sm:text-3xl lg:text-4xl font-bold text-foreground font-jetbrains-mono">
                    {marketsLoading ? (
                      <SkeletonText className="h-8 sm:h-10 w-24 sm:w-32" />
                    ) : (
                      tvl
                    )}
                  </div>
                  <div className="text-xs text-foreground/50 mt-1 sm:mt-2">
                    Total Value Locked
                  </div>
                </div>
              </div>

              {/* Average APY Card */}
              <div className="glass-card p-4 sm:p-6 hover:scale-[1.02] transition-all duration-300 flex-1 sm:flex-1 lg:flex-none">
                <div className="flex flex-col">
                  <h2 className="text-sm sm:text-lg font-semibold text-foreground/60 mb-2 sm:mb-3">
                    Average APY
                  </h2>
                  <div className="text-2xl sm:text-3xl lg:text-4xl font-bold text-green-600 font-jetbrains-mono">
                    {marketsLoading ? (
                      <SkeletonText className="h-8 sm:h-10 w-20 sm:w-24" />
                    ) : (
                      weightedAverageAPY
                    )}
                  </div>
                  <div className="text-xs text-foreground/50 mt-1 sm:mt-2">
                    Weighted by TVL
                  </div>
                </div>
              </div>

              {/* Total Rewards Card */}
              <div className="glass-card p-4 sm:p-6 hover:scale-[1.02] transition-all duration-300 flex-1 sm:flex-1 lg:flex-none">
                <div className="flex flex-col">
                  <h2 className="text-sm sm:text-lg font-semibold text-foreground/60 mb-2 sm:mb-3">
                    Total Rewards
                  </h2>
                  <div className="text-2xl sm:text-3xl lg:text-4xl font-bold text-accent font-jetbrains-mono">
                    {(aaveRewardsLoading || compoundRewardsLoading) ? (
                      <SkeletonText className="h-8 sm:h-10 w-24 sm:w-28" />
                    ) : (
                      totalRewards
                    )}
                  </div>
                  <div className="text-xs text-foreground/50 mt-1 sm:mt-2">
                    Aave + Compound
                  </div>
                </div>
              </div>

              {/* Average Deposit Size Card */}
              <AvgDepositMetric />
            </div>

            {/* Market Details with Pie Chart - Full width on mobile */}
            {markets.length > 0 && !marketsLoading && (
              <div className="glass-card p-4 sm:p-6 hover:scale-[1.02] transition-all duration-300 flex-1 lg:max-w-none">
                <h3 className="text-sm sm:text-lg font-semibold text-foreground/60 mb-4">
                  Market Allocation
                </h3>
                
                {/* Desktop Layout: Side by Side */}
                <div className="hidden lg:flex lg:items-center lg:justify-center">
                  {/* Pie Chart */}
                  <div className="flex-shrink-0 flex items-center justify-center -mr-32">
                    <div 
                      className="w-96 h-96 focus:outline-none" 
                      style={{ 
                        filter: 'drop-shadow(0 8px 16px rgba(0, 0, 0, 0.15))',
                        outline: 'none'
                      }}
                      onMouseLeave={() => setHoveredSegment(null)}
                    >
                        <PieChart width={384} height={384} style={{ outline: 'none' }}>
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
                            onMouseEnter={(data, index) => setHoveredSegment(data)}
                          >
                            {pieChartData.map((entry, index) => {
                              const isHovered = hoveredSegment?.id === entry.id;
                              return (
                                <Cell 
                                  key={`cell-${index}`} 
                                  fill={pieColors[index % pieColors.length]}
                                  stroke="transparent"
                                  strokeWidth={0}
                                  style={{
                                    filter: isHovered 
                                      ? 'drop-shadow(0 4px 8px rgba(0, 0, 0, 0.2))' 
                                      : 'drop-shadow(0 2px 4px rgba(0, 0, 0, 0.1))',
                                    transform: isHovered ? 'scale(1.02)' : 'scale(1)',
                                    transformOrigin: 'center',
                                    transition: 'all 0.2s ease-in-out',
                                    cursor: 'pointer'
                                  }}
                                />
                              );
                            })}
                          </Pie>
                          <CenterLabel hoveredData={hoveredSegment} selectedData={null} isMobile={false} />
                        </PieChart>
                    </div>
                  </div>

                  {/* Market Details List */}
                  <div className="flex-1 ml-48 mr-32">
                    <div className="space-y-2">
                      {markets.map((market, index) => {
                        const allocation = totalMarketValue > 0 ? (market.usdValueFormatted / totalMarketValue * 100) : 0;
                        const uniqueId = `${market.tokenSymbol}-${market.strategyName}`;
                        const isHovered = hoveredSegment?.id === uniqueId;
                        return (
                          <div 
                            key={index} 
                            className={`flex items-center justify-between p-3 glass rounded-lg transition-colors duration-200 cursor-pointer backdrop-blur-sm ${
                              isHovered ? 'bg-zen-200/30 dark:bg-zen-600/30' : 'hover:bg-foreground/5'
                            }`}
                            onMouseEnter={() => setHoveredSegment({ 
                              id: uniqueId, 
                              name: market.tokenSymbol, 
                              value: market.usdValueFormatted, 
                              strategy: market.strategyName, 
                              apy: market.apyFormatted,
                              color: solidColors[index % solidColors.length]
                            })}
                            onMouseLeave={() => setHoveredSegment(null)}
                          >
                            <div className="flex items-center space-x-3 flex-1">
                              <div 
                                className="w-3 h-3 rounded-full flex-shrink-0 shadow-sm"
                                style={{ backgroundColor: solidColors[index % solidColors.length] }}
                              />
                              <div className="min-w-0 flex-1">
                                <div className="font-semibold text-sm text-foreground truncate">
                                  {market.tokenSymbol}
                                </div>
                                <div className="text-xs text-foreground/50 truncate">
                                  via {market.strategyName}
                                </div>
                              </div>
                            </div>
                            <div className="text-right flex-shrink-0 ml-3">
                              <div className="font-jetbrains-mono text-sm font-bold text-foreground">
                                ${market.usdValueFormatted.toFixed(2)}
                              </div>
                              <div className="text-xs text-foreground/50 whitespace-nowrap">
                                {allocation.toFixed(1)}% • {market.apyFormatted}% APY
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Mobile Layout: Chart Above, Details Below */}
                <div className="lg:hidden flex flex-col gap-4 items-center h-full">
                  {/* Pie Chart - Responsive sizing */}
                  <div className="flex-shrink-0 w-full flex justify-center">
                    <div 
                      className="w-72 h-72 focus:outline-none flex items-center justify-center" 
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
                        <PieChart width={288} height={288} style={{ outline: 'none', background: 'transparent' }}>
                          <defs>
                            <linearGradient id="blueGradientMobile" x1="0%" y1="0%" x2="100%" y2="100%">
                              <stop offset="0%" stopColor="#60A5FA" />
                              <stop offset="100%" stopColor="#1D4ED8" />
                            </linearGradient>
                            <linearGradient id="greenGradientMobile" x1="0%" y1="0%" x2="100%" y2="100%">
                              <stop offset="0%" stopColor="#34D399" />
                              <stop offset="100%" stopColor="#047857" />
                            </linearGradient>
                            <linearGradient id="amberGradientMobile" x1="0%" y1="0%" x2="100%" y2="100%">
                              <stop offset="0%" stopColor="#FBBF24" />
                              <stop offset="100%" stopColor="#D97706" />
                            </linearGradient>
                            <linearGradient id="violetGradientMobile" x1="0%" y1="0%" x2="100%" y2="100%">
                              <stop offset="0%" stopColor="#A78BFA" />
                              <stop offset="100%" stopColor="#7C3AED" />
                            </linearGradient>
                            <linearGradient id="redGradientMobile" x1="0%" y1="0%" x2="100%" y2="100%">
                              <stop offset="0%" stopColor="#F87171" />
                              <stop offset="100%" stopColor="#DC2626" />
                            </linearGradient>
                            <linearGradient id="cyanGradientMobile" x1="0%" y1="0%" x2="100%" y2="100%">
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
                              const isHovered = !isMobile && hoveredSegment?.id === entry.id;
                              const isSelected = isMobile && selectedSegment?.name === entry.name;
                              const shouldScale = isHovered || isSelected;
                              
                              return (
                                <Cell 
                                  key={`cell-${index}`} 
                                  fill={`url(#${['blueGradientMobile', 'greenGradientMobile', 'amberGradientMobile', 'violetGradientMobile', 'redGradientMobile', 'cyanGradientMobile'][index % 6]})`}
                                  stroke="transparent"
                                  strokeWidth={0}
                                  style={{
                                    filter: shouldScale 
                                      ? 'drop-shadow(0 4px 8px rgba(0, 0, 0, 0.2))' 
                                      : 'drop-shadow(0 2px 4px rgba(0, 0, 0, 0.1))',
                                    transform: shouldScale ? 'scale(1.02)' : 'scale(1)',
                                    transformOrigin: 'center',
                                    transition: 'all 0.2s ease-in-out',
                                    cursor: 'pointer'
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
                    </div>
                  </div>

                  {/* Market Details List - Responsive */}
                  <div className="flex-1 w-full">
                    <div className="space-y-1 sm:space-y-2">
                      {marketsLoading ? (
                        // Skeleton loading for market items
                        Array.from({ length: 2 }).map((_, index) => (
                          <div key={index} className="flex items-center justify-between p-2 sm:p-3 glass rounded-lg backdrop-blur-sm">
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
                            <div key={index} className="flex items-center justify-between p-2 sm:p-3 glass rounded-lg hover:bg-foreground/5 transition-colors duration-200 backdrop-blur-sm">
                              <div className="flex items-center space-x-2 min-w-0 flex-1">
                                <div 
                                  className="w-3 h-3 rounded-full flex-shrink-0 shadow-sm"
                                  style={{ backgroundColor: solidColors[index % solidColors.length] }}
                                />
                                <div className="min-w-0 flex-1">
                                  <div className="font-semibold text-xs sm:text-sm text-foreground truncate">
                                    {market.tokenSymbol}
                                  </div>
                                  <div className="text-xs text-foreground/50 truncate">
                                    via {market.strategyName}
                                  </div>
                                </div>
                              </div>
                              <div className="text-right flex-shrink-0 ml-1">
                                <div className="font-jetbrains-mono text-xs sm:text-sm font-bold text-foreground">
                                  ${market.usdValueFormatted.toFixed(2)}
                                </div>
                                <div className="text-xs text-foreground/50 whitespace-nowrap">
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

          {/* Analytics Charts Grid */}
          <div className="space-y-8 mb-8 animate-fade-in-up">
            {/* TVL and Token APY Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <TVLChart />
              <TokenAPYChart />
            </div>
            
            {/* Protocol and Chain TVL Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <ProtocolTVLChart />
              <ChainTVLChart />
            </div>
            
            {/* User Analytics and Volume Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <UserAnalyticsChart />
              <VolumeChart />
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </>
  );
}
