import { useState, useEffect } from 'react';
import { createPublicClient, http, formatUnits } from 'viem';
import { localhost } from 'viem/chains';

// Create public client for direct contract calls
const publicClient = createPublicClient({
  chain: localhost,
  transport: http('http://localhost:8545')
});

/**
 * Custom hook for getting Aave strategy rewards analytics
 * Used by the Analytics page to show rewards accrued from Aave strategy
 * @param {Object} contracts - Contract addresses
 * @param {Array} strategyAaveAbi - StrategyAave contract ABI
 * @param {Array} priceFeedAbi - PriceFeedManager contract ABI
 */
export function useAaveRewardsAnalytics({ contracts, strategyAaveAbi, priceFeedAbi }) {
  const [rewardsData, setRewardsData] = useState({
    totalRewards: 0,
    totalRewardsUSD: 0,
    tokenRewards: [],
    isLoading: true,
    error: null
  });

  const fetchRewardsData = async () => {
    // Check if contracts object exists and has required properties
    if (!contracts || !contracts.STRATEGY_AAVE || !strategyAaveAbi) {
      console.log('Missing contracts or ABI for Aave rewards:', { contracts, hasAbi: !!strategyAaveAbi });
      setRewardsData(prev => ({ 
        ...prev, 
        isLoading: false,
        error: 'Contract addresses or ABI not available'
      }));
      return;
    }

    try {
      setRewardsData(prev => ({ ...prev, isLoading: true, error: null }));

      // Get all token analytics from Aave strategy
      const [supportedTokens, analyticsArray] = await publicClient.readContract({
        address: contracts.STRATEGY_AAVE,
        abi: strategyAaveAbi,
        functionName: 'getAllTokenAnalytics'
      });

      // Process each token's rewards data
      const tokenRewardsPromises = supportedTokens.map(async (tokenAddress, index) => {
        try {
          const analytics = analyticsArray[index];
          const [
            currentBalance,
            totalDeposits,
            totalWithdrawals,
            netDeposits,
            accruedRewards,
            currentAPY
          ] = analytics;

          // Determine token details
          const isUSDC = tokenAddress.toLowerCase() === contracts.USDC?.toLowerCase();
          const isWETH = tokenAddress.toLowerCase() === contracts.WETH?.toLowerCase();
          
          let tokenSymbol = 'UNKNOWN';
          let decimals = 18;
          
          if (isUSDC) {
            tokenSymbol = 'USDC';
            decimals = 6;
          } else if (isWETH) {
            tokenSymbol = 'WETH';
            decimals = 18;
          }

          // Format the rewards amount
          const rewardsFormatted = parseFloat(formatUnits(accruedRewards, decimals));
          
          // Get USD value of rewards if we have a price feed manager
          let rewardsUSD = 0;
          if (contracts.PRICE_FEED_MANAGER && priceFeedAbi && accruedRewards > 0n) {
            try {
              const usdValue = await publicClient.readContract({
                address: contracts.PRICE_FEED_MANAGER,
                abi: priceFeedAbi,
                functionName: 'getTokenValueInUSD',
                args: [tokenAddress, accruedRewards]
              });
              rewardsUSD = parseFloat(formatUnits(usdValue, 18));
            } catch (error) {
              // Gracefully handle stale price feeds during development
              if (error.message.includes('StalePrice')) {
                console.log(`💡 Price feeds stale for ${tokenSymbol} (development mode)`);
                rewardsUSD = 0; // Just show 0 instead of erroring
              } else {
                console.warn(`Could not get USD value for ${tokenSymbol} rewards:`, error);
                rewardsUSD = 0;
              }
            }
          }

          return {
            tokenAddress,
            tokenSymbol,
            decimals,
            currentBalance: currentBalance.toString(),
            currentBalanceFormatted: parseFloat(formatUnits(currentBalance, decimals)),
            totalDeposits: totalDeposits.toString(),
            totalDepositsFormatted: parseFloat(formatUnits(totalDeposits, decimals)),
            totalWithdrawals: totalWithdrawals.toString(),
            totalWithdrawalsFormatted: parseFloat(formatUnits(totalWithdrawals, decimals)),
            netDeposits: netDeposits.toString(),
            netDepositsFormatted: parseFloat(formatUnits(netDeposits, decimals)),
            accruedRewards: accruedRewards.toString(),
            accruedRewardsFormatted: rewardsFormatted,
            rewardsUSD,
            currentAPY: Number(currentAPY),
            currentAPYFormatted: (Number(currentAPY) / 100).toFixed(2) // Convert basis points to percentage
          };

        } catch (error) {
          console.error(`Error processing rewards for token ${tokenAddress}:`, error);
          return null;
        }
      });

      const tokenRewards = (await Promise.all(tokenRewardsPromises)).filter(Boolean);
      
      // Calculate totals
      const totalRewardsUSD = tokenRewards.reduce((sum, token) => sum + token.rewardsUSD, 0);
      
      setRewardsData({
        totalRewards: tokenRewards.length,
        totalRewardsUSD,
        tokenRewards,
        isLoading: false,
        error: null
      });

    } catch (error) {
      console.error('Error fetching Aave rewards data:', error);
      setRewardsData({
        totalRewards: 0,
        totalRewardsUSD: 0,
        tokenRewards: [],
        isLoading: false,
        error: error.message
      });
    }
  };

  useEffect(() => {
    fetchRewardsData();
    
    // Refetch every 30 seconds
    const interval = setInterval(fetchRewardsData, 30000);
    return () => clearInterval(interval);
  }, [contracts?.STRATEGY_AAVE]);

  return { ...rewardsData, refetch: fetchRewardsData };
}
