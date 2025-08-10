import { useState, useEffect } from 'react';
import { createPublicClient, http, formatUnits } from 'viem';
import { localhost } from 'viem/chains';

// Create public client for direct contract calls
const publicClient = createPublicClient({
  chain: localhost,
  transport: http('http://localhost:8545')
});

/**
 * Custom hook for getting market-specific data (strategy balances, allocations, etc.)
 * @param {Object} contracts - Contract addresses
 * @param {Array} abis - Contract ABIs needed
 */
export function useMarketData({ contracts, vaultAbi, coordinatorAbi, priceFeedAbi }) {
  const [marketData, setMarketData] = useState({
    markets: [],
    isLoading: true,
    error: null
  });

  const fetchMarketData = async () => {
    if (!contracts.VAULT || !contracts.STRATEGY_COORDINATOR || !contracts.PRICE_FEED_MANAGER) {
      setMarketData(prev => ({ ...prev, isLoading: false }));
      return;
    }

    try {
      setMarketData(prev => ({ ...prev, isLoading: true, error: null }));

      // 1. Get supported tokens
      const supportedTokens = await publicClient.readContract({
        address: contracts.VAULT,
        abi: vaultAbi,
        functionName: 'getSupportedTokens'
      });

      console.log('Supported tokens:', supportedTokens);

      // 2. For each token, get strategy balance and USD value
      const marketPromises = supportedTokens.map(async (tokenAddress) => {
        try {
          // Get strategy balance for this token
          const balance = await publicClient.readContract({
            address: contracts.STRATEGY_COORDINATOR,
            abi: coordinatorAbi,
            functionName: 'getStrategyBalance',
            args: [tokenAddress]
          });

          // Get USD value of the balance
          const usdValue = balance > 0n ? await publicClient.readContract({
            address: contracts.PRICE_FEED_MANAGER,
            abi: priceFeedAbi,
            functionName: 'getTokenValueInUSD',
            args: [tokenAddress, balance]
          }) : 0n;

          // Determine token symbol (USDC vs WETH)
          const isUSDC = tokenAddress.toLowerCase() === contracts.USDC.toLowerCase();
          const isWETH = tokenAddress.toLowerCase() === contracts.WETH.toLowerCase();
          
          let tokenSymbol = 'UNKNOWN';
          let strategyName = 'Unknown';
          
          if (isUSDC) {
            tokenSymbol = 'USDC';
            strategyName = 'Aave'; // USDC goes to Aave
          } else if (isWETH) {
            tokenSymbol = 'WETH';
            strategyName = 'Compound'; // WETH goes to Compound
          }

          return {
            tokenAddress,
            tokenSymbol,
            strategyName,
            balance: balance.toString(),
            balanceFormatted: parseFloat(formatUnits(balance, isUSDC ? 6 : 18)),
            usdValue: usdValue.toString(),
            usdValueFormatted: parseFloat(formatUnits(usdValue, 18))
          };

        } catch (error) {
          console.error(`Error fetching data for token ${tokenAddress}:`, error);
          return null;
        }
      });

      const markets = (await Promise.all(marketPromises)).filter(Boolean);
      
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
  }, [contracts.VAULT, contracts.STRATEGY_COORDINATOR, contracts.PRICE_FEED_MANAGER]);

  return { ...marketData, refetch: fetchMarketData };
}
