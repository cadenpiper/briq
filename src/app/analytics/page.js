'use client'

import { formatUnits } from 'viem';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
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
  // Get contract addresses from fork deployment
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

  // Color scheme for pie chart - with gradients
  const pieColors = [
    'url(#blueGradient)', // blue gradient for Aave
    'url(#greenGradient)', // green gradient for Compound
    'url(#amberGradient)', // amber gradient for additional markets
    'url(#violetGradient)', // violet gradient for additional markets
    'url(#redGradient)', // red gradient for additional markets
    'url(#cyanGradient)', // cyan gradient for additional markets
  ];

  // Solid fallback colors for tooltips and legends
  const solidColors = [
    '#3B82F6', // blue-500 for Aave
    '#059669', // green-600 for Compound
    '#F59E0B', // amber-500 for additional markets
    '#8B5CF6', // violet-500 for additional markets
    '#EF4444', // red-500 for additional markets
    '#06B6D4', // cyan-500 for additional markets
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

  // Custom tooltip for pie chart
  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      const segmentColor = payload[0].payload.color || payload[0].color;
      return (
        <div className="bg-zen-800 p-2 rounded-md border border-zen-600 shadow-lg">
          <div className="flex items-center space-x-1">
            <p className="font-semibold text-xs" style={{ color: segmentColor }}>
              {data.name}
            </p>
            <span className="text-xs text-cream-300">•</span>
            <p className="text-xs text-cream-300">
              {data.strategy}
            </p>
          </div>
        </div>
      );
    }
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
        <div className="container mx-auto px-4 py-8">
          {/* Page Header */}
          <div className="mb-8 animate-fade-in">
            <h1 className="text-4xl font-bold text-zen-900 dark:text-cream-100 mb-2">
              Analytics
            </h1>
            <p className="text-zen-600 dark:text-cream-400 text-lg">
              Protocol insights and performance metrics
            </p>
          </div>

          {/* Metrics Row */}
          <div className="flex gap-6 mb-8 animate-fade-in-up">
            <div className="flex flex-col gap-4">
              {/* TVL Card */}
              <div className="bg-cream-50 dark:bg-zen-800 rounded-xl p-6 border border-zen-300 dark:border-zen-600 shadow-sm hover:shadow-md transition-all duration-300 hover:scale-[1.02]">
                <div className="flex flex-col">
                  <h2 className="text-lg font-semibold text-zen-600 dark:text-cream-400 mb-3">
                    TVL
                  </h2>
                  <div className="text-4xl font-bold text-zen-900 dark:text-cream-100 font-jetbrains-mono">
                    {marketsLoading ? (
                      <SkeletonText className="h-10 w-32" />
                    ) : (
                      tvl
                    )}
                  </div>
                  <div className="text-xs text-zen-500 dark:text-cream-500 mt-2">
                    Total Value Locked
                  </div>
                </div>
              </div>

              {/* Average APY Card */}
              <div className="bg-cream-50 dark:bg-zen-800 rounded-xl p-6 border border-zen-300 dark:border-zen-600 shadow-sm hover:shadow-md transition-all duration-300 hover:scale-[1.02]">
                <div className="flex flex-col">
                  <h2 className="text-lg font-semibold text-zen-600 dark:text-cream-400 mb-3">
                    Average APY
                  </h2>
                  <div className="text-4xl font-bold text-green-600 font-jetbrains-mono">
                    {marketsLoading ? (
                      <SkeletonText className="h-10 w-24" />
                    ) : (
                      weightedAverageAPY
                    )}
                  </div>
                  <div className="text-xs text-zen-500 dark:text-cream-500 mt-2">
                    Weighted by TVL
                  </div>
                </div>
              </div>

              {/* Total Rewards Card */}
              <div className="bg-cream-50 dark:bg-zen-800 rounded-xl p-6 border border-zen-300 dark:border-zen-600 shadow-sm hover:shadow-md transition-all duration-300 hover:scale-[1.02]">
                <div className="flex flex-col">
                  <h2 className="text-lg font-semibold text-zen-600 dark:text-cream-400 mb-3">
                    Total Rewards
                  </h2>
                  <div className="text-4xl font-bold text-briq-orange dark:text-orange-400 font-jetbrains-mono">
                    {(aaveRewardsLoading || compoundRewardsLoading) ? (
                      <SkeletonText className="h-10 w-28" />
                    ) : (
                      totalRewards
                    )}
                  </div>
                  <div className="text-xs text-zen-500 dark:text-cream-500 mt-2">
                    Aave + Compound
                  </div>
                </div>
              </div>
            </div>

            {/* Market Details with Pie Chart */}
            {markets.length > 0 && (
              <div className="bg-cream-50 dark:bg-zen-800 rounded-xl p-4 border border-zen-300 dark:border-zen-600 shadow-sm hover:shadow-md transition-all duration-300 hover:scale-[1.02] flex-1 max-w-md">
                <h3 className="text-lg font-semibold text-zen-600 dark:text-cream-400 mb-4">
                  Market Allocation
                </h3>
                
                <div className="flex flex-col gap-4 items-center h-full">
                  {/* Pie Chart */}
                  <div className="flex-shrink-0">
                    <div className="w-64 h-64" style={{ filter: 'drop-shadow(0 8px 16px rgba(0, 0, 0, 0.15))' }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <defs>
                            {/* Blue gradient for Aave */}
                            <linearGradient id="blueGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                              <stop offset="0%" stopColor="#60A5FA" />
                              <stop offset="100%" stopColor="#1D4ED8" />
                            </linearGradient>
                            {/* Green gradient for Compound */}
                            <linearGradient id="greenGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                              <stop offset="0%" stopColor="#34D399" />
                              <stop offset="100%" stopColor="#047857" />
                            </linearGradient>
                            {/* Additional gradients */}
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
                            outerRadius={100}
                            innerRadius={35}
                            paddingAngle={0}
                            dataKey="value"
                            onMouseEnter={(data, index) => {
                              // Optional: could add state management here for more complex hover effects
                            }}
                          >
                            {pieChartData.map((entry, index) => (
                              <Cell 
                                key={`cell-${index}`} 
                                fill={pieColors[index % pieColors.length]}
                                stroke="transparent"
                                strokeWidth={0}
                                style={{
                                  filter: 'drop-shadow(0 2px 4px rgba(0, 0, 0, 0.1))',
                                  transition: 'all 0.2s ease-in-out',
                                  cursor: 'pointer',
                                  outline: 'none',
                                  border: 'none'
                                }}
                                onMouseEnter={(e) => {
                                  e.target.style.filter = 'drop-shadow(0 4px 8px rgba(0, 0, 0, 0.2))';
                                  e.target.style.transform = 'scale(1.02)';
                                  e.target.style.transformOrigin = 'center';
                                }}
                                onMouseLeave={(e) => {
                                  e.target.style.filter = 'drop-shadow(0 2px 4px rgba(0, 0, 0, 0.1))';
                                  e.target.style.transform = 'scale(1)';
                                }}
                                onFocus={(e) => {
                                  e.target.style.outline = 'none';
                                }}
                                onBlur={(e) => {
                                  e.target.style.outline = 'none';
                                }}
                              />
                            ))}
                          </Pie>
                          <Tooltip 
                            content={<CustomTooltip />}
                            position={{ x: 205, y: 10 }}
                            offset={0}
                            allowEscapeViewBox={{ x: true, y: true }}
                            animationDuration={0}
                            isAnimationActive={false}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* Market Details List */}
                  <div className="flex-1 w-full">
                    <div className="space-y-1">
                      {marketsLoading ? (
                        // Skeleton loading for market items
                        Array.from({ length: 2 }).map((_, index) => (
                          <div key={index} className="flex items-center justify-between p-2 bg-zen-100 dark:bg-zen-700 rounded-lg">
                            <div className="flex items-center space-x-2 min-w-0 flex-1">
                              <SkeletonBox className="w-3 h-3 rounded-full" />
                              <div className="min-w-0 flex-1">
                                <SkeletonText className="h-4 w-12 mb-1" />
                                <SkeletonText className="h-3 w-16" />
                              </div>
                            </div>
                            <div className="text-right flex-shrink-0 ml-1">
                              <SkeletonText className="h-4 w-16 mb-1" />
                              <SkeletonText className="h-3 w-20" />
                            </div>
                          </div>
                        ))
                      ) : (
                        markets.map((market, index) => {
                          const allocation = totalMarketValue > 0 ? (market.usdValueFormatted / totalMarketValue * 100) : 0;
                          return (
                            <div key={index} className="flex items-center justify-between p-2 bg-zen-100 dark:bg-zen-700 rounded-lg hover:bg-zen-200 dark:hover:bg-zen-600 transition-colors duration-200">
                              <div className="flex items-center space-x-2 min-w-0 flex-1">
                                <div 
                                  className="w-3 h-3 rounded-full flex-shrink-0 shadow-sm"
                                  style={{ backgroundColor: solidColors[index % solidColors.length] }}
                                />
                                <div className="min-w-0 flex-1">
                                  <div className="font-semibold text-sm text-zen-900 dark:text-cream-100 truncate">
                                    {market.tokenSymbol}
                                  </div>
                                  <div className="text-xs text-zen-500 dark:text-cream-500 truncate">
                                    via {market.strategyName}
                                  </div>
                                </div>
                              </div>
                              <div className="text-right flex-shrink-0 ml-1">
                                <div className="font-jetbrains-mono text-sm font-bold text-zen-900 dark:text-cream-100">
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
            <div className="bg-cream-50 dark:bg-zen-800 rounded-xl p-6 border border-zen-300 dark:border-zen-600 shadow-sm hover:shadow-md transition-all duration-300 hover:scale-[1.02] mb-8">
              <h3 className="text-lg font-semibold text-zen-600 dark:text-cream-400 mb-6">
                Aave Strategy Rewards
              </h3>
              <div className="space-y-6">
                {aaveTokenRewards.map((token, index) => (
                  <div key={index} className="space-y-3">
                    {/* Token Info Row */}
                    <div className="flex justify-between items-center">
                      <div className="flex items-center space-x-3">
                        <div className="flex flex-col">
                          <span className="font-semibold text-lg text-zen-900 dark:text-cream-100">
                            {token.tokenSymbol} Rewards
                          </span>
                          <span className="text-sm text-zen-500 dark:text-cream-500">
                            Current APY: {token.currentAPYFormatted}%
                          </span>
                        </div>
                      </div>
                      <div className="text-right space-y-1">
                        <div className="font-jetbrains-mono text-xl font-bold text-blue-200 dark:text-blue-800">
                          {token.accruedRewardsFormatted.toFixed(6)} {token.tokenSymbol}
                        </div>
                        <div className="text-sm text-zen-500 dark:text-cream-500">
                          ${token.rewardsUSD.toFixed(2)} USD (Interest)
                        </div>
                      </div>
                    </div>
                    
                    {/* Analytics Details */}
                    <div className="grid grid-cols-1 gap-4 text-sm">
                      <div className="bg-zen-100 dark:bg-zen-700 p-3 rounded">
                        <div className="text-zen-500 dark:text-cream-500">Current Balance</div>
                        <div className="font-semibold text-zen-900 dark:text-cream-100">
                          {token.currentBalanceFormatted.toFixed(4)} {token.tokenSymbol}
                        </div>
                      </div>
                    </div>
                    
                    {/* Reward Type - Single colored box for Aave */}
                    <div className="grid grid-cols-1 gap-4 text-sm">
                      <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800 hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors duration-200">
                        <div className="flex justify-between items-center">
                          <div>
                            <div className="text-zen-900 dark:text-cream-100 font-medium text-base">aToken Interest Rewards</div>
                            <div className="text-xs text-zen-500 dark:text-cream-500 mt-1">
                              Automatic rebasing rewards from Aave lending
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="font-semibold text-zen-900 dark:text-cream-100 text-lg">
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
            <div className="bg-cream-50 dark:bg-zen-800 rounded-xl p-6 border border-zen-300 dark:border-zen-600 shadow-sm hover:shadow-md transition-all duration-300 hover:scale-[1.02]">
              <h3 className="text-lg font-semibold text-zen-600 dark:text-cream-400 mb-6">
                Compound Strategy Rewards
              </h3>
              <div className="space-y-6">
                {compoundTokenRewards.map((token, index) => (
                  <div key={index} className="space-y-3">
                    {/* Token Info Row */}
                    <div className="flex justify-between items-center">
                      <div className="flex items-center space-x-3">
                        <div className="flex flex-col">
                          <span className="font-semibold text-lg text-zen-900 dark:text-cream-100">
                            {token.tokenSymbol} Rewards
                          </span>
                          <span className="text-sm text-zen-500 dark:text-cream-500">
                            Current APY: {token.currentAPYFormatted}%
                          </span>
                        </div>
                      </div>
                      <div className="text-right space-y-1">
                        <div className="font-jetbrains-mono text-xl font-bold text-green-200 dark:text-green-800">
                          {compoundRewardsLoading ? (
                            <SkeletonText className="h-6 w-32" />
                          ) : (
                            `${token.interestRewardsFormatted.toFixed(6)} ${token.tokenSymbol}`
                          )}
                        </div>
                        {token.protocolRewardsFormatted > 0 && (
                          <div className="font-jetbrains-mono text-xl font-bold text-green-300 dark:text-green-700">
                            {compoundRewardsLoading ? (
                              <SkeletonText className="h-6 w-28" />
                            ) : (
                              `${token.protocolRewardsFormatted.toFixed(6)} COMP`
                            )}
                          </div>
                        )}
                        <div className="text-sm text-zen-500 dark:text-cream-500">
                          {compoundRewardsLoading ? (
                            <SkeletonText className="h-4 w-28" />
                          ) : (
                            `$${token.interestRewardsUSD.toFixed(2)} USD (Interest)`
                          )}
                        </div>
                      </div>
                    </div>
                    
                    {/* Analytics Details */}
                    <div className="grid grid-cols-1 gap-4 text-sm">
                      <div className="bg-zen-100 dark:bg-zen-700 p-3 rounded">
                        <div className="text-zen-500 dark:text-cream-500">Current Balance</div>
                        <div className="font-semibold text-zen-900 dark:text-cream-100">
                          {token.currentBalanceFormatted.toFixed(4)} {token.tokenSymbol}
                        </div>
                      </div>
                    </div>
                    
                    {/* Reward Types Breakdown */}
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div className="bg-green-50 dark:bg-green-900/20 p-3 rounded-lg border border-green-200 dark:border-green-800 hover:bg-green-100 dark:hover:bg-green-900/30 transition-colors duration-200">
                        <div className="text-zen-900 dark:text-cream-100 font-medium">Interest Rewards</div>
                        <div className="font-semibold text-zen-900 dark:text-cream-100">
                          {token.interestRewardsFormatted.toFixed(6)} {token.tokenSymbol}
                        </div>
                      </div>
                      <div className="bg-green-100 dark:bg-green-800/20 p-3 rounded-lg border border-green-300 dark:border-green-700 hover:bg-green-200 dark:hover:bg-green-800/30 transition-colors duration-200">
                        <div className="text-zen-900 dark:text-cream-100 font-medium">Protocol Rewards</div>
                        <div className="font-semibold text-zen-900 dark:text-cream-100">
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
