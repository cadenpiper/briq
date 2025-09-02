import { useState, useEffect } from 'react';
import { createPublicClient, http, formatUnits } from 'viem';
import { localhost } from 'viem/chains';

// Create public client for direct contract calls
const publicClient = createPublicClient({
  chain: localhost,
  transport: http('http://localhost:8545')
});

/**
 * Custom hook for getting market-specific data from contracts (strategy balances, allocations, APY, etc.)
 * Used by the Analytics page to show protocol-specific metrics
 * @param {Object} contracts - Contract addresses
 * @param {Array} abis - Contract ABIs needed
 */
export function useContractMarketData({ contracts, vaultAbi, coordinatorAbi, priceFeedAbi, strategyAaveAbi, strategyCompoundAbi }) {
  const [marketData, setMarketData] = useState({
    markets: [],
    isLoading: true,
    error: null
  });

  const fetchMarketData = async () => {
    // Check if contracts object exists and has required properties
    if (!contracts || !contracts.VAULT || !contracts.STRATEGY_AAVE || !contracts.STRATEGY_COMPOUND) {
      console.log('Missing contracts:', contracts);
      setMarketData(prev => ({ 
        ...prev, 
        isLoading: false,
        error: 'Contract addresses not available'
      }));
      return;
    }

    try {
      setMarketData(prev => ({ ...prev, isLoading: true, error: null }));

      const markets = [];

      // Get actual balances from Aave strategy
      if (strategyAaveAbi) {
        try {
          const [aaveSupportedTokens, aaveAnalyticsArray] = await publicClient.readContract({
            address: contracts.STRATEGY_AAVE,
            abi: strategyAaveAbi,
            functionName: 'getAllTokenAnalytics'
          });

          for (let i = 0; i < aaveSupportedTokens.length; i++) {
            const tokenAddress = aaveSupportedTokens[i];
            const analytics = aaveAnalyticsArray[i];
            const currentBalance = analytics[0]; // First element is currentBalance

            if (currentBalance > 0n) {
              // Determine token symbol
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

              // Get USD value
              let usdValue = 0n;
              try {
                usdValue = await publicClient.readContract({
                  address: contracts.PRICE_FEED_MANAGER,
                  abi: priceFeedAbi,
                  functionName: 'getTokenValueInUSD',
                  args: [tokenAddress, currentBalance]
                });
              } catch (error) {
                console.log(`Could not get USD value for Aave ${tokenSymbol}:`, error.message);
              }

              // Get APY - same as rewards hooks
              const currentAPY = analytics[5]; // 6th element is currentAPY (0-indexed)

              markets.push({
                tokenAddress,
                tokenSymbol,
                strategyName: 'Aave',
                balance: currentBalance.toString(),
                balanceFormatted: parseFloat(formatUnits(currentBalance, decimals)),
                usdValue: usdValue.toString(),
                usdValueFormatted: parseFloat(formatUnits(usdValue, 18)),
                apyBasisPoints: Number(currentAPY),
                apyFormatted: (Number(currentAPY) / 100).toFixed(2)
              });
            }
          }
        } catch (error) {
          console.log('Could not fetch Aave balances:', error.message);
        }
      }

      // Get actual balances from Compound strategy
      if (strategyCompoundAbi) {
        try {
          const [compoundSupportedTokens, compoundAnalyticsArray] = await publicClient.readContract({
            address: contracts.STRATEGY_COMPOUND,
            abi: strategyCompoundAbi,
            functionName: 'getAllTokenAnalytics'
          });

          for (let i = 0; i < compoundSupportedTokens.length; i++) {
            const tokenAddress = compoundSupportedTokens[i];
            const analytics = compoundAnalyticsArray[i];
            const currentBalance = analytics[0]; // First element is currentBalance

            if (currentBalance > 0n) {
              // Determine token symbol
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

              // Get USD value
              let usdValue = 0n;
              try {
                usdValue = await publicClient.readContract({
                  address: contracts.PRICE_FEED_MANAGER,
                  abi: priceFeedAbi,
                  functionName: 'getTokenValueInUSD',
                  args: [tokenAddress, currentBalance]
                });
              } catch (error) {
                console.log(`Could not get USD value for Compound ${tokenSymbol}:`, error.message);
              }

              // Get APY - same as rewards hooks  
              const currentAPY = analytics[6]; // 7th element is currentAPY for Compound

              markets.push({
                tokenAddress,
                tokenSymbol,
                strategyName: 'Compound',
                balance: currentBalance.toString(),
                balanceFormatted: parseFloat(formatUnits(currentBalance, decimals)),
                usdValue: usdValue.toString(),
                usdValueFormatted: parseFloat(formatUnits(usdValue, 18)),
                apyBasisPoints: Number(currentAPY),
                apyFormatted: (Number(currentAPY) / 100).toFixed(2)
              });
            }
          }
        } catch (error) {
          console.log('Could not fetch Compound balances:', error.message);
        }
      }
      
      setMarketData({
        markets,
        isLoading: false,
        error: null
      });

    } catch (error) {
      console.error('Error fetching market data:', error);
      setMarketData({
        markets: [],
        isLoading: false,
        error: error.message
      });
    }
  };

  useEffect(() => {
    fetchMarketData();
    
    // Refetch every 30 seconds
    const interval = setInterval(fetchMarketData, 30000);
    return () => clearInterval(interval);
  }, [contracts?.STRATEGY_AAVE, contracts?.STRATEGY_COMPOUND]);

  return { ...marketData, refetch: fetchMarketData };
}
