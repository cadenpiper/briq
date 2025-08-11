'use client'

import { formatUnits } from 'viem';
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

  return (
    <>
      <Header />
      <div className="min-h-screen bg-cream-100 dark:bg-zen-900 transition-colors duration-300">
        <div className="container mx-auto px-4 py-8">
          {/* Page Header */}
          <div className="mb-8">
            <h1 className="text-4xl font-bold text-zen-900 dark:text-cream-100 mb-2">
              Analytics
            </h1>
            <p className="text-zen-600 dark:text-cream-400 text-lg">
              Protocol insights and performance metrics
            </p>
          </div>

          {/* Metrics Row */}
          <div className="flex gap-6 mb-8">
            {/* TVL Card */}
            <div className="bg-cream-50 dark:bg-zen-800 rounded-lg p-6 border border-zen-300 dark:border-zen-600 shadow-sm">
              <div className="flex flex-col">
                <h2 className="text-lg font-semibold text-zen-600 dark:text-cream-400 mb-3">
                  TVL
                </h2>
                <div className="text-4xl font-bold text-zen-900 dark:text-cream-100 font-jetbrains-mono">
                  {tvl}
                </div>
                <div className="text-xs text-zen-500 dark:text-cream-500 mt-2">
                  Total Value Locked
                </div>
              </div>
            </div>

            {/* Average APY Card */}
            <div className="bg-cream-50 dark:bg-zen-800 rounded-lg p-6 border border-zen-300 dark:border-zen-600 shadow-sm">
              <div className="flex flex-col">
                <h2 className="text-lg font-semibold text-zen-600 dark:text-cream-400 mb-3">
                  Average APY
                </h2>
                <div className="text-4xl font-bold text-green-600 dark:text-green-400 font-jetbrains-mono">
                  {weightedAverageAPY}
                </div>
                <div className="text-xs text-zen-500 dark:text-cream-500 mt-2">
                  Weighted by TVL
                </div>
              </div>
            </div>

            {/* Total Rewards Card */}
            <div className="bg-cream-50 dark:bg-zen-800 rounded-lg p-6 border border-zen-300 dark:border-zen-600 shadow-sm">
              <div className="flex flex-col">
                <h2 className="text-lg font-semibold text-zen-600 dark:text-cream-400 mb-3">
                  Total Rewards
                </h2>
                <div className="text-4xl font-bold text-briq-orange dark:text-orange-400 font-jetbrains-mono">
                  {totalRewards}
                </div>
                <div className="text-xs text-zen-500 dark:text-cream-500 mt-2">
                  Aave + Compound
                </div>
              </div>
            </div>
          </div>

          {/* Market Details */}
          {markets.length > 0 && (
            <div className="bg-cream-50 dark:bg-zen-800 rounded-lg p-6 border border-zen-300 dark:border-zen-600 shadow-sm mb-8">
              <h3 className="text-lg font-semibold text-zen-600 dark:text-cream-400 mb-6">
                Market Breakdown
              </h3>
              <div className="space-y-6">
                {markets.map((market, index) => {
                  const allocation = totalMarketValue > 0 ? (market.usdValueFormatted / totalMarketValue * 100) : 0;
                  return (
                    <div key={index} className="space-y-3">
                      {/* Market Info Row */}
                      <div className="flex justify-between items-center">
                        <div className="flex items-center space-x-3">
                          <div className="flex flex-col">
                            <span className="font-semibold text-lg text-zen-900 dark:text-cream-100">
                              {market.tokenSymbol}
                            </span>
                            <span className="text-sm text-zen-500 dark:text-cream-500 bg-zen-100 dark:bg-zen-700 px-2 py-1 rounded w-fit">
                              via {market.strategyName}
                            </span>
                          </div>
                        </div>
                        <div className="text-right space-y-1">
                          <div className="font-jetbrains-mono text-xl font-bold text-zen-900 dark:text-cream-100">
                            ${market.usdValueFormatted.toFixed(2)}
                          </div>
                          <div className="text-sm text-zen-500 dark:text-cream-500">
                            {market.balanceFormatted.toFixed(4)} {market.tokenSymbol}
                          </div>
                          <div className="text-sm font-bold text-green-600 dark:text-green-400">
                            {marketsLoading ? '--.--' : `${market.apyFormatted}%`} APY
                          </div>
                        </div>
                      </div>
                      
                      {/* Allocation Bar */}
                      <div className="space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-medium text-zen-600 dark:text-cream-400">
                            Allocation ({allocation.toFixed(1)}%)
                          </span>
                        </div>
                        <div className="w-full h-4 bg-zen-200 dark:bg-zen-600 rounded-lg overflow-hidden shadow-inner">
                          <div 
                            className="h-full bg-gradient-to-r from-briq-orange to-orange-400 rounded-lg transition-all duration-700 ease-out shadow-sm"
                            style={{ width: `${allocation}%` }}
                          />
                        </div>
                      </div>
                      
                      {/* Divider */}
                      {index < markets.length - 1 && (
                        <div className="border-b border-zen-200 dark:border-zen-700 pt-3" />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Aave Rewards Details */}
          {aaveTokenRewards.length > 0 && (
            <div className="bg-cream-50 dark:bg-zen-800 rounded-lg p-6 border border-zen-300 dark:border-zen-600 shadow-sm mb-8">
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
                        <div className="font-jetbrains-mono text-xl font-bold text-briq-orange dark:text-orange-400">
                          {token.accruedRewardsFormatted.toFixed(6)} {token.tokenSymbol}
                        </div>
                        <div className="text-sm text-zen-500 dark:text-cream-500">
                          ${token.rewardsUSD.toFixed(2)} USD (Interest)
                        </div>
                      </div>
                    </div>
                    
                    {/* Analytics Details */}
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div className="bg-zen-100 dark:bg-zen-700 p-3 rounded">
                        <div className="text-zen-500 dark:text-cream-500">Total Deposits</div>
                        <div className="font-semibold text-zen-900 dark:text-cream-100">
                          {token.totalDepositsFormatted.toFixed(4)} {token.tokenSymbol}
                        </div>
                      </div>
                      <div className="bg-zen-100 dark:bg-zen-700 p-3 rounded">
                        <div className="text-zen-500 dark:text-cream-500">Total Withdrawals</div>
                        <div className="font-semibold text-zen-900 dark:text-cream-100">
                          {token.totalWithdrawalsFormatted.toFixed(4)} {token.tokenSymbol}
                        </div>
                      </div>
                      <div className="bg-zen-100 dark:bg-zen-700 p-3 rounded">
                        <div className="text-zen-500 dark:text-cream-500">Current Balance</div>
                        <div className="font-semibold text-zen-900 dark:text-cream-100">
                          {token.currentBalanceFormatted.toFixed(4)} {token.tokenSymbol}
                        </div>
                      </div>
                    </div>
                    
                    {/* Reward Type - Single colored box for Aave */}
                    <div className="grid grid-cols-1 gap-4 text-sm">
                      <div className="bg-orange-50 dark:bg-orange-900/20 p-4 rounded border border-orange-200 dark:border-orange-800">
                        <div className="flex justify-between items-center">
                          <div>
                            <div className="text-orange-600 dark:text-orange-400 font-medium text-base">aToken Interest Rewards</div>
                            <div className="text-xs text-orange-500 dark:text-orange-500 mt-1">
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
            <div className="bg-cream-50 dark:bg-zen-800 rounded-lg p-6 border border-zen-300 dark:border-zen-600 shadow-sm">
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
                        <div className="font-jetbrains-mono text-xl font-bold text-blue-600 dark:text-blue-400">
                          {token.interestRewardsFormatted.toFixed(6)} {token.tokenSymbol}
                        </div>
                        <div className="text-sm text-zen-500 dark:text-cream-500">
                          ${token.interestRewardsUSD.toFixed(2)} USD (Interest)
                        </div>
                        {token.protocolRewardsFormatted > 0 && (
                          <div className="text-sm text-purple-600 dark:text-purple-400">
                            {token.protocolRewardsFormatted.toFixed(6)} COMP
                          </div>
                        )}
                      </div>
                    </div>
                    
                    {/* Analytics Details */}
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div className="bg-zen-100 dark:bg-zen-700 p-3 rounded">
                        <div className="text-zen-500 dark:text-cream-500">Total Deposits</div>
                        <div className="font-semibold text-zen-900 dark:text-cream-100">
                          {token.totalDepositsFormatted.toFixed(4)} {token.tokenSymbol}
                        </div>
                      </div>
                      <div className="bg-zen-100 dark:bg-zen-700 p-3 rounded">
                        <div className="text-zen-500 dark:text-cream-500">Total Withdrawals</div>
                        <div className="font-semibold text-zen-900 dark:text-cream-100">
                          {token.totalWithdrawalsFormatted.toFixed(4)} {token.tokenSymbol}
                        </div>
                      </div>
                      <div className="bg-zen-100 dark:bg-zen-700 p-3 rounded">
                        <div className="text-zen-500 dark:text-cream-500">Current Balance</div>
                        <div className="font-semibold text-zen-900 dark:text-cream-100">
                          {token.currentBalanceFormatted.toFixed(4)} {token.tokenSymbol}
                        </div>
                      </div>
                    </div>
                    
                    {/* Reward Types Breakdown */}
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded border border-blue-200 dark:border-blue-800">
                        <div className="text-blue-600 dark:text-blue-400 font-medium">Interest Rewards</div>
                        <div className="font-semibold text-zen-900 dark:text-cream-100">
                          {token.interestRewardsFormatted.toFixed(6)} {token.tokenSymbol}
                        </div>
                      </div>
                      <div className="bg-purple-50 dark:bg-purple-900/20 p-3 rounded border border-purple-200 dark:border-purple-800">
                        <div className="text-purple-600 dark:text-purple-400 font-medium">Protocol Rewards</div>
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
