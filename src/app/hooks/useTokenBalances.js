import { useAccount, useReadContracts } from 'wagmi';
import { getContractAddresses } from '../utils/forkAddresses';
import ERC20_ABI from '../abis/ERC20.json';

export function useTokenBalances() {
  const { address, isConnected, chainId } = useAccount();
  const CONTRACTS = getContractAddresses(chainId);

  const { data, isLoading } = useReadContracts({
    contracts: [
      {
        address: CONTRACTS.USDC,
        abi: ERC20_ABI,
        functionName: 'balanceOf',
        args: [address],
      },
      {
        address: CONTRACTS.WETH,
        abi: ERC20_ABI,
        functionName: 'balanceOf',
        args: [address],
      },
    ],
    query: {
      enabled: !!address && isConnected,
    },
  });

  const formatBalance = (balance, decimals = 18) => {
    if (!balance) return '0.00';
    const divisor = BigInt(10 ** decimals);
    const formatted = Number(balance) / Number(divisor);
    return formatted.toLocaleString('en-US', { 
      minimumFractionDigits: 2, 
      maximumFractionDigits: 2 
    });
  };

  return {
    usdc: formatBalance(data?.[0]?.result, 6), // USDC has 6 decimals
    weth: formatBalance(data?.[1]?.result, 18), // WETH has 18 decimals
    isLoading,
  };
}
