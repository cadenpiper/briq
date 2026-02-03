import { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { getPublicClient } from '../utils/publicClients';
import { getContractAddresses } from '../utils/forkAddresses';
import StrategyAaveArtifact from '../abis/StrategyAave.json';
import StrategyCompoundArtifact from '../abis/StrategyCompoundComet.json';

export function useVaultAPY() {
  const { chainId } = useAccount();
  const CONTRACTS = getContractAddresses(chainId);
  const publicClient = getPublicClient(chainId);
  
  const [apyData, setApyData] = useState({
    usdcAPY: '0.00',
    wethAPY: '0.00',
    averageAPY: '0.00',
  });

  useEffect(() => {
    const fetchAPY = async () => {
      try {
        const apyByToken = { USDC: [], WETH: [] };

        // Get Aave APYs
        try {
          const [aaveTokens, aaveAnalytics] = await publicClient.readContract({
            address: CONTRACTS.STRATEGY_AAVE,
            abi: StrategyAaveArtifact.abi,
            functionName: 'getAllTokenAnalytics'
          });

          for (let i = 0; i < aaveTokens.length; i++) {
            const tokenAddress = aaveTokens[i];
            const analytics = aaveAnalytics[i];
            const currentAPY = Number(analytics[5]); // 6th element is currentAPY

            if (tokenAddress.toLowerCase() === CONTRACTS.USDC.toLowerCase()) {
              apyByToken.USDC.push(currentAPY);
            } else if (tokenAddress.toLowerCase() === CONTRACTS.WETH.toLowerCase()) {
              apyByToken.WETH.push(currentAPY);
            }
          }
        } catch (error) {
          console.log('Could not fetch Aave APY:', error.message);
        }

        // Get Compound APYs
        try {
          const [compoundTokens, compoundAnalytics] = await publicClient.readContract({
            address: CONTRACTS.STRATEGY_COMPOUND,
            abi: StrategyCompoundArtifact.abi,
            functionName: 'getAllTokenAnalytics'
          });

          for (let i = 0; i < compoundTokens.length; i++) {
            const tokenAddress = compoundTokens[i];
            const analytics = compoundAnalytics[i];
            const currentAPY = Number(analytics[6]); // 7th element is currentAPY for Compound

            if (tokenAddress.toLowerCase() === CONTRACTS.USDC.toLowerCase()) {
              apyByToken.USDC.push(currentAPY);
            } else if (tokenAddress.toLowerCase() === CONTRACTS.WETH.toLowerCase()) {
              apyByToken.WETH.push(currentAPY);
            }
          }
        } catch (error) {
          console.log('Could not fetch Compound APY:', error.message);
        }

        // Get best APY for each token (max across strategies)
        const bestUsdcAPY = apyByToken.USDC.length > 0 ? Math.max(...apyByToken.USDC) / 100 : 0;
        const bestWethAPY = apyByToken.WETH.length > 0 ? Math.max(...apyByToken.WETH) / 100 : 0;
        const avgAPY = (bestUsdcAPY + bestWethAPY) / 2;

        setApyData({
          usdcAPY: bestUsdcAPY.toFixed(2),
          wethAPY: bestWethAPY.toFixed(2),
          averageAPY: avgAPY.toFixed(2),
        });
      } catch (error) {
        console.error('Error fetching APY:', error);
      }
    };

    fetchAPY();
    const interval = setInterval(fetchAPY, 30000);
    return () => clearInterval(interval);
  }, []);

  return apyData;
}
