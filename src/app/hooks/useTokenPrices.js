import { useState, useEffect } from 'react';
import { createPublicClient, http, formatUnits } from 'viem';
import { localhost } from 'viem/chains';
import { getContractAddresses } from '../utils/forkAddresses';
import PriceFeedManagerArtifact from '../abis/PriceFeedManager.json';

const publicClient = createPublicClient({
  chain: localhost,
  transport: http('http://localhost:8545')
});

export function useTokenPrices() {
  const [prices, setPrices] = useState({
    wethPrice: 0,
    usdcPrice: 0,
    isLoading: true
  });

  useEffect(() => {
    const fetchPrices = async () => {
      const CONTRACTS = getContractAddresses();
      
      try {
        // Get both WETH and USDC prices (Chainlink returns 8 decimals)
        const [wethPriceRaw, usdcPriceRaw] = await Promise.all([
          publicClient.readContract({
            address: CONTRACTS.PRICE_FEED_MANAGER,
            abi: PriceFeedManagerArtifact.abi,
            functionName: 'getTokenPrice',
            args: [CONTRACTS.WETH]
          }),
          publicClient.readContract({
            address: CONTRACTS.PRICE_FEED_MANAGER,
            abi: PriceFeedManagerArtifact.abi,
            functionName: 'getTokenPrice',
            args: [CONTRACTS.USDC]
          })
        ]);
        
        const wethPrice = parseFloat(formatUnits(wethPriceRaw, 8));
        const usdcPrice = parseFloat(formatUnits(usdcPriceRaw, 8));

        setPrices({
          wethPrice,
          usdcPrice,
          isLoading: false
        });
      } catch (error) {
        console.error('Error fetching token prices:', error);
        setPrices(prev => ({ ...prev, isLoading: false }));
      }
    };

    fetchPrices();
    const interval = setInterval(fetchPrices, 30000);
    return () => clearInterval(interval);
  }, []);

  return prices;
}
