import { useWriteContract, useAccount } from 'wagmi';
import { parseUnits } from 'viem';
import { getPublicClient } from '../utils/publicClients';
import { getContractAddresses } from '../utils/forkAddresses';
import { supabase } from '../utils/supabase';
import BriqVaultArtifact from '../abis/BriqVault.json';
import BriqSharesArtifact from '../abis/BriqShares.json';
import PriceFeedManagerArtifact from '../abis/PriceFeedManager.json';
import ERC20_ABI from '../abis/ERC20.json';

export function useVaultOperations() {
  const { writeContractAsync, isPending } = useWriteContract();
  const { address, chainId } = useAccount();
  const publicClient = getPublicClient(chainId);
  const CONTRACTS = getContractAddresses(chainId);
  
  const deposit = async (asset, amount) => {
    const tokenAddress = asset === 'USDC' ? CONTRACTS.USDC : CONTRACTS.WETH;
    const decimals = asset === 'USDC' ? 6 : 18;
    const parsedAmount = parseUnits(amount, decimals);

    // First approve the vault to spend tokens
    const approvalHash = await writeContractAsync({
      address: tokenAddress,
      abi: ERC20_ABI,
      functionName: 'approve',
      args: [CONTRACTS.VAULT, parsedAmount],
    });

    // Wait for approval transaction to be mined
    await publicClient.waitForTransactionReceipt({ hash: approvalHash });

    // Then deposit
    const hash = await writeContractAsync({
      address: CONTRACTS.VAULT,
      abi: BriqVaultArtifact.abi,
      functionName: 'deposit',
      args: [tokenAddress, parsedAmount],
    });

    // Wait for transaction to be mined
    await publicClient.waitForTransactionReceipt({ hash });

    // Get updated TVL and save to Supabase
    if (address) {
      const updatedTVL = await publicClient.readContract({
        address: CONTRACTS.VAULT,
        abi: BriqVaultArtifact.abi,
        functionName: 'getTotalVaultValueInUSD',
      });
      
      const tvlUsd = parseFloat((Number(updatedTVL) / 1e18).toFixed(2));

      await Promise.all([
        supabase.from('transactions').insert({
          wallet_address: address,
          type: 'deposit',
          token: asset,
          amount: amount,
          tx_hash: hash,
          status: 'success'
        }),
        supabase.from('tvl_snapshots').insert({
          tvl_usd: tvlUsd
        }),
        supabase.from('user_activity').upsert({
          address: address
        }, { onConflict: 'address', ignoreDuplicates: true })
      ]);
    }

    return hash;
  };

  const withdraw = async (asset, amount, slippageTolerance = 0.5) => {
    const tokenAddress = asset === 'USDC' ? CONTRACTS.USDC : CONTRACTS.WETH;
    const decimals = asset === 'USDC' ? 6 : 18;
    const parsedShares = parseUnits(amount, 18); // Shares are always 18 decimals
    
    // Calculate expected token amount from vault
    const totalVaultValue = await publicClient.readContract({
      address: CONTRACTS.VAULT,
      abi: BriqVaultArtifact.abi,
      functionName: 'getTotalVaultValueInUSD',
    });
    
    const totalSupply = await publicClient.readContract({
      address: CONTRACTS.SHARES,
      abi: BriqSharesArtifact.abi,
      functionName: 'totalSupply',
    });
    
    const userUsdValue = (parsedShares * totalVaultValue) / totalSupply;
    
    const expectedAmount = await publicClient.readContract({
      address: CONTRACTS.PRICE_FEED_MANAGER,
      abi: PriceFeedManagerArtifact.abi,
      functionName: 'convertUsdToToken',
      args: [tokenAddress, userUsdValue],
    });
    
    // Apply slippage tolerance (default 0.5%)
    const minAmountOut = (expectedAmount * BigInt(Math.floor((100 - slippageTolerance) * 100))) / 10000n;

    const hash = await writeContractAsync({
      address: CONTRACTS.VAULT,
      abi: BriqVaultArtifact.abi,
      functionName: 'withdraw',
      args: [tokenAddress, parsedShares, minAmountOut],
    });

    // Wait for transaction to be mined
    await publicClient.waitForTransactionReceipt({ hash });

    // Get updated TVL and save to Supabase
    if (address) {
      const updatedTVL = await publicClient.readContract({
        address: CONTRACTS.VAULT,
        abi: BriqVaultArtifact.abi,
        functionName: 'getTotalVaultValueInUSD',
      });
      
      const tvlUsd = parseFloat((Number(updatedTVL) / 1e18).toFixed(2));

      await Promise.all([
        supabase.from('transactions').insert({
          wallet_address: address,
          type: 'withdraw',
          token: asset,
          amount: amount,
          tx_hash: hash,
          status: 'success'
        }),
        supabase.from('tvl_snapshots').insert({
          tvl_usd: tvlUsd
        })
      ]);
    }

    return hash;
  };

  return {
    deposit,
    withdraw,
    isPending,
  };
}
