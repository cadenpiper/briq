import { useState, useEffect } from 'react';
import { useAccount, usePublicClient } from 'wagmi';
import { formatUnits } from 'viem';
import { FORK_ADDRESSES } from '../utils/forkAddresses';
import BriqSharesArtifact from '../abis/BriqShares.json';
import BriqVaultArtifact from '../abis/BriqVault.json';

export function useVaultPosition() {
  const { address } = useAccount();
  const publicClient = usePublicClient();
  const [data, setData] = useState({
    shareBalance: 0n,
    totalSupply: 0n,
    totalVaultValue: 0n,
    userValueUSD: 0,
  });

  useEffect(() => {
    if (!publicClient || !address) return;

    const fetchData = async () => {
      try {
        const [shareBalance, totalSupply, totalVaultValue] = await Promise.all([
          publicClient.readContract({
            address: FORK_ADDRESSES.SHARES,
            abi: BriqSharesArtifact.abi,
            functionName: 'balanceOf',
            args: [address],
          }),
          publicClient.readContract({
            address: FORK_ADDRESSES.SHARES,
            abi: BriqSharesArtifact.abi,
            functionName: 'totalSupply',
          }),
          publicClient.readContract({
            address: FORK_ADDRESSES.VAULT,
            abi: BriqVaultArtifact.abi,
            functionName: 'getTotalVaultValueInUSD',
          }),
        ]);

        const userValueUSD = shareBalance && totalSupply && totalVaultValue && totalSupply > 0n
          ? (shareBalance * totalVaultValue) / totalSupply
          : 0n;

        setData({
          shareBalance,
          totalSupply,
          totalVaultValue,
          userValueUSD: parseFloat(formatUnits(userValueUSD, 18)),
        });
      } catch (error) {
        console.error('Error fetching vault position:', error);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 10000);
    return () => clearInterval(interval);
  }, [publicClient, address]);

  return {
    ...data,
    hasPosition: data.shareBalance > 0n,
  };
}
