import { useWriteContract, useAccount, usePublicClient } from 'wagmi';
import { parseUnits } from 'viem';
import { FORK_ADDRESSES } from '../utils/forkAddresses';
import { supabase } from '../utils/supabase';
import BriqVaultArtifact from '../abis/BriqVault.json';
import BriqSharesArtifact from '../abis/BriqShares.json';
import PriceFeedManagerArtifact from '../abis/PriceFeedManager.json';
import ERC20_ABI from '../abis/ERC20.json';

export function useVaultOperations() {
  const { writeContractAsync, isPending } = useWriteContract();
  const { address } = useAccount();
  const publicClient = usePublicClient();
  
  const deposit = async (asset, amount) => {
    const tokenAddress = asset === 'USDC' ? FORK_ADDRESSES.USDC : FORK_ADDRESSES.WETH;
    const decimals = asset === 'USDC' ? 6 : 18;
    const parsedAmount = parseUnits(amount, decimals);

    // First approve the vault to spend tokens
    const approvalHash = await writeContractAsync({
      address: tokenAddress,
      abi: ERC20_ABI,
      functionName: 'approve',
      args: [FORK_ADDRESSES.VAULT, parsedAmount],
    });

    // Wait for approval transaction to be mined
    await publicClient.waitForTransactionReceipt({ hash: approvalHash });

    // Then deposit
    const hash = await writeContractAsync({
      address: FORK_ADDRESSES.VAULT,
      abi: BriqVaultArtifact.abi,
      functionName: 'deposit',
      args: [tokenAddress, parsedAmount],
    });

    // Save to Supabase
    if (address) {
      await supabase.from('transactions').insert({
        wallet_address: address,
        type: 'deposit',
        token: asset,
        amount: amount,
        tx_hash: hash,
        status: 'success'
      });
    }

    return hash;
  };

  const withdraw = async (asset, amount, slippageTolerance = 0.5) => {
    const tokenAddress = asset === 'USDC' ? FORK_ADDRESSES.USDC : FORK_ADDRESSES.WETH;
    const decimals = asset === 'USDC' ? 6 : 18;
    const parsedShares = parseUnits(amount, 18); // Shares are always 18 decimals
    
    // Calculate expected token amount from vault
    const totalVaultValue = await publicClient.readContract({
      address: FORK_ADDRESSES.VAULT,
      abi: BriqVaultArtifact.abi,
      functionName: 'getTotalVaultValueInUSD',
    });
    
    const totalSupply = await publicClient.readContract({
      address: FORK_ADDRESSES.SHARES,
      abi: BriqSharesArtifact.abi,
      functionName: 'totalSupply',
    });
    
    const userUsdValue = (parsedShares * totalVaultValue) / totalSupply;
    
    const expectedAmount = await publicClient.readContract({
      address: FORK_ADDRESSES.PRICE_FEED_MANAGER,
      abi: PriceFeedManagerArtifact.abi,
      functionName: 'convertUsdToToken',
      args: [tokenAddress, userUsdValue],
    });
    
    // Apply slippage tolerance (default 0.5%)
    const minAmountOut = (expectedAmount * BigInt(Math.floor((100 - slippageTolerance) * 100))) / 10000n;

    const hash = await writeContractAsync({
      address: FORK_ADDRESSES.VAULT,
      abi: BriqVaultArtifact.abi,
      functionName: 'withdraw',
      args: [tokenAddress, parsedShares, minAmountOut],
    });

    // Save to Supabase
    if (address) {
      await supabase.from('transactions').insert({
        wallet_address: address,
        type: 'withdraw',
        token: asset,
        amount: amount,
        tx_hash: hash,
        status: 'success'
      });
    }

    return hash;
  };

  return {
    deposit,
    withdraw,
    isPending,
  };
}
