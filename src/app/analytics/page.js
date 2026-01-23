'use client'

import { useState, useEffect } from 'react';
import { formatUnits } from 'viem';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip } from 'recharts';
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
  UserAnalyticsChart, 
  VolumeChart,
  AvgAPYMetric
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

  // Group markets by token for allocation bar with APY
  const tokenAllocation = markets.reduce((acc, market) => {
    const token = market.tokenSymbol;
    if (!acc[token]) {
      acc[token] = {
        token,
        total: 0,
        apys: [],
        color: solidColors[Object.keys(acc).length % solidColors.length]
      };
    }
    acc[token].total += market.usdValueFormatted;
    acc[token].apys.push(market.apyFormatted);
    return acc;
  }, {});

  const allocationBarData = Object.values(tokenAllocation).map(item => {
    const avgAPY = item.apys.reduce((sum, apy) => sum + apy, 0) / item.apys.length;
    return {
      ...item,
      avgAPY,
      percentage: totalMarketValue > 0 ? (item.total / totalMarketValue * 100) : 0
    };
  });

  const formatTVL = (value) => {
    if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `$${(value / 1000).toFixed(0)}K`;
    return `$${value.toFixed(0)}`;
  };

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

              {/* Total Rewards Card */}
              <div className="glass-card p-4 sm:p-6 hover:scale-[1.02] transition-all duration-300 flex-1 sm:flex-1 lg:flex-none">
                <div className="flex flex-col">
                  <h2 className="text-sm sm:text-lg font-semibold text-foreground/60 mb-2 sm:mb-3">
                    Total Rewards
                  </h2>
                  <div className="text-2xl sm:text-3xl lg:text-4xl font-bold text-green-600 font-jetbrains-mono">
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
              <AvgAPYMetric markets={markets} />
            </div>

            {/* Market Details with Pie Chart - Full width on mobile */}
            {markets.length > 0 && !marketsLoading && (
              <div className="glass-card p-4 sm:p-6 hover:scale-[1.02] transition-all duration-300 flex-1 lg:max-w-none">
                <h3 className="text-sm sm:text-lg font-semibold text-foreground/60 mb-4">
                  Market Allocation
                </h3>
                
                {/* Desktop & Mobile: Coming Soon */}
                <div className="flex items-center justify-center" style={{ height: '350px' }}>
                  <p className="text-foreground/40 text-center">Coming soon</p>
                </div>
              </div>
            )}
          </div>

          {/* Analytics Charts Grid */}
          <div className="space-y-8 mb-8 animate-fade-in-up">
            {/* TVL Chart */}
            <div className="grid grid-cols-1 gap-8">
              <TVLChart />
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
