import { useState, useEffect } from 'react';
import { formatUnits } from 'viem';
import { useAccount } from 'wagmi';
import { getContractAddresses } from '../utils/forkAddresses';
import { getPublicClient } from '../utils/publicClients';
import PriceFeedManagerArtifact from '../abis/PriceFeedManager.json';

export function useTokenPrices() {
  const { chainId } = useAccount();
  
  const [prices, setPrices] = useState({
    wethPrice: 0,
    usdcPrice: 0,
    isLoading: true
  });

  useEffect(() => {
    const fetchPrices = async () => {
      if (!chainId) return;
      
      const publicClient = getPublicClient(chainId);
      const CONTRACTS = getContractAddresses(chainId);
      
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
  }, [chainId]);

  return prices;
}
