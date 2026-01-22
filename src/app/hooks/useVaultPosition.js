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

  const fetchData = async () => {
    if (!publicClient || !address) return;
    
    console.log('Fetching vault position...');
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

      console.log('Updated position:', { shareBalance: shareBalance.toString(), userValueUSD: parseFloat(formatUnits(userValueUSD, 18)) });

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

  useEffect(() => {
    if (!publicClient || !address) return;

    fetchData();

    // Watch for Transfer events on the shares contract
    const unwatch = publicClient.watchContractEvent({
      address: FORK_ADDRESSES.SHARES,
      abi: BriqSharesArtifact.abi,
      eventName: 'Transfer',
      onLogs: (logs) => {
        // Refetch if any transfer involves this user's address
        const relevantTransfer = logs.some(
          log => log.args.to === address || log.args.from === address
        );
        if (relevantTransfer) {
          console.log('Share balance changed, refetching...');
          fetchData();
        }
      }
    });

    return () => unwatch();
  }, [publicClient, address]);

  return {
    ...data,
    hasPosition: data.shareBalance > 0n,
    refetch: fetchData,
  };
}
