import { useState, useEffect } from 'react';
import { createPublicClient, http, formatUnits } from 'viem';
import { localhost } from 'viem/chains';

// Create public client for direct contract calls
const publicClient = createPublicClient({
  chain: localhost,
  transport: http('http://localhost:8545')
});

/**
 * Custom hook for getting Compound strategy rewards analytics
 * Used by the Analytics page to show rewards accrued from Compound strategy
 * @param {Object} contracts - Contract addresses
 * @param {Array} strategyCompoundAbi - StrategyCompoundComet contract ABI
 * @param {Array} priceFeedAbi - PriceFeedManager contract ABI
 */
export function useCompoundRewardsAnalytics({ contracts, strategyCompoundAbi, priceFeedAbi }) {
  const [rewardsData, setRewardsData] = useState({
    totalInterestRewards: 0,
    totalProtocolRewards: 0,
    totalRewardsUSD: 0,
    tokenRewards: [],
    isLoading: true,
    error: null
  });

  const fetchRewardsData = async () => {
    // Check if contracts object exists and has required properties
    if (!contracts || !contracts.STRATEGY_COMPOUND || !strategyCompoundAbi) {
      console.log('Missing contracts or ABI for Compound rewards:', { contracts, hasAbi: !!strategyCompoundAbi });
      setRewardsData(prev => ({ 
        ...prev, 
        isLoading: false,
        error: 'Contract addresses or ABI not available'
      }));
      return;
    }

    try {
      setRewardsData(prev => ({ ...prev, isLoading: true, error: null }));

      // Get all token analytics from Compound strategy
      const [supportedTokens, analyticsArray] = await publicClient.readContract({
        address: contracts.STRATEGY_COMPOUND,
        abi: strategyCompoundAbi,
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
            interestRewards,
            protocolRewards,
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

          // Format the rewards amounts
          const interestRewardsFormatted = parseFloat(formatUnits(interestRewards, decimals));
          const protocolRewardsFormatted = parseFloat(formatUnits(protocolRewards, 6)); // Protocol rewards are scaled by 10^6
          
          // Get USD value of interest rewards if we have a price feed manager
          let interestRewardsUSD = 0;
          let protocolRewardsUSD = 0;
          
          if (contracts.PRICE_FEED_MANAGER && priceFeedAbi && interestRewards > 0n) {
            try {
              const usdValue = await publicClient.readContract({
                address: contracts.PRICE_FEED_MANAGER,
                abi: priceFeedAbi,
                functionName: 'getTokenValueInUSD',
                args: [tokenAddress, interestRewards]
              });
              interestRewardsUSD = parseFloat(formatUnits(usdValue, 18));
            } catch (error) {
              // Gracefully handle stale price feeds during development
              if (error.message.includes('StalePrice')) {
                console.log(`💡 Price feeds stale for ${tokenSymbol} interest rewards (development mode)`);
                interestRewardsUSD = 0;
              } else {
                console.warn(`Could not get USD value for ${tokenSymbol} interest rewards:`, error);
                interestRewardsUSD = 0;
              }
            }
          }

          // Note: Protocol rewards (COMP tokens) would need COMP token price feed for USD conversion
          // For now, we'll just track the token amount

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
            interestRewards: interestRewards.toString(),
            interestRewardsFormatted,
            interestRewardsUSD,
            protocolRewards: protocolRewards.toString(),
            protocolRewardsFormatted,
            protocolRewardsUSD, // Will be 0 for now without COMP price feed
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
      const totalInterestRewards = tokenRewards.reduce((sum, token) => sum + token.interestRewardsFormatted, 0);
      const totalProtocolRewards = tokenRewards.reduce((sum, token) => sum + token.protocolRewardsFormatted, 0);
      const totalRewardsUSD = tokenRewards.reduce((sum, token) => sum + token.interestRewardsUSD + token.protocolRewardsUSD, 0);
      
      setRewardsData({
        totalInterestRewards,
        totalProtocolRewards,
        totalRewardsUSD,
        tokenRewards,
        isLoading: false,
        error: null
      });

    } catch (error) {
      console.error('Error fetching Compound rewards data:', error);
      setRewardsData({
        totalInterestRewards: 0,
        totalProtocolRewards: 0,
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
  }, [contracts?.STRATEGY_COMPOUND]);

  return { ...rewardsData, refetch: fetchRewardsData };
}
