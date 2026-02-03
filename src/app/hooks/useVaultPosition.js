import { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { formatUnits } from 'viem';
import { getContractAddresses } from '../utils/forkAddresses';
import { getPublicClient } from '../utils/publicClients';
import BriqSharesArtifact from '../abis/BriqShares.json';
import BriqVaultArtifact from '../abis/BriqVault.json';

export function useVaultPosition() {
  const { address, chainId } = useAccount();
  const [data, setData] = useState({
    shareBalance: 0n,
    totalSupply: 0n,
    totalVaultValue: 0n,
    userValueUSD: 0,
  });

  const fetchData = async () => {
    if (!address || !chainId) return;
    
    const publicClient = getPublicClient(chainId);
    const CONTRACTS = getContractAddresses(chainId);
    console.log('Fetching vault position for chain:', chainId);
    console.log('Using addresses:', CONTRACTS);
    try {
      const [shareBalance, totalSupply, totalVaultValue] = await Promise.all([
        publicClient.readContract({
          address: CONTRACTS.SHARES,
          abi: BriqSharesArtifact.abi,
          functionName: 'balanceOf',
          args: [address],
        }),
        publicClient.readContract({
          address: CONTRACTS.SHARES,
          abi: BriqSharesArtifact.abi,
          functionName: 'totalSupply',
        }),
        publicClient.readContract({
          address: CONTRACTS.VAULT,
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
    if (!address || !chainId) return;

    const publicClient = getPublicClient(chainId);
    const CONTRACTS = getContractAddresses(chainId);
    fetchData();

    // Watch for Transfer events on the shares contract
    const unwatch = publicClient.watchContractEvent({
      address: CONTRACTS.SHARES,
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
  }, [address, chainId]);

  return {
    ...data,
    hasPosition: data.shareBalance > 0n,
    refetch: fetchData,
  };
}
