import { useWriteContract, useAccount, usePublicClient } from 'wagmi';
import { parseUnits } from 'viem';
import { FORK_ADDRESSES } from '../utils/forkAddresses';
import BriqVaultArtifact from '../abis/BriqVault.json';
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
    return await writeContractAsync({
      address: FORK_ADDRESSES.VAULT,
      abi: BriqVaultArtifact.abi,
      functionName: 'deposit',
      args: [tokenAddress, parsedAmount],
    });
  };

  const withdraw = async (asset, amount) => {
    const tokenAddress = asset === 'USDC' ? FORK_ADDRESSES.USDC : FORK_ADDRESSES.WETH;
    const decimals = asset === 'USDC' ? 6 : 18;
    const parsedAmount = parseUnits(amount, decimals);

    return await writeContractAsync({
      address: FORK_ADDRESSES.VAULT,
      abi: BriqVaultArtifact.abi,
      functionName: 'withdraw',
      args: [tokenAddress, parsedAmount],
    });
  };

  return {
    deposit,
    withdraw,
    isPending,
  };
}
