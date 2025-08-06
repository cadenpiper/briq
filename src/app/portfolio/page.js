"use client";

import { useState, useEffect } from 'react';
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { parseUnits, formatUnits } from 'viem';
import Layout from '../components/Layout';

// Import ABIs
import BriqVaultABI from '../abis/BriqVault.json';
import BriqSharesABI from '../abis/BriqShares.json';
import ERC20ABI from '../abis/ERC20.json';

// Import deployed addresses utility
import { getContractAddresses } from '../utils/deployedAddresses';

export default function Portfolio() {
  const { address, isConnected } = useAccount();
  const { writeContract, data: hash, isPending } = useWriteContract();
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({ hash });

  const [depositAmount, setDepositAmount] = useState('');
  const [selectedToken, setSelectedToken] = useState('USDC');
  const [transactionStep, setTransactionStep] = useState('idle'); // 'idle', 'approving', 'depositing'

  // Get contract addresses dynamically
  const CONTRACTS = getContractAddresses();

  // Read user token balances
  const { data: usdcBalance, refetch: refetchUsdcBalance } = useReadContract({
    address: CONTRACTS.USDC,
    abi: ERC20ABI,
    functionName: 'balanceOf',
    args: [address],
    query: { enabled: !!address }
  });

  const { data: wethBalance, refetch: refetchWethBalance } = useReadContract({
    address: CONTRACTS.WETH,
    abi: ERC20ABI,
    functionName: 'balanceOf',
    args: [address],
    query: { enabled: !!address }
  });

  const { data: sharesBalance, refetch: refetchSharesBalance } = useReadContract({
    address: CONTRACTS.SHARES,
    abi: BriqSharesABI,
    functionName: 'balanceOf',
    args: [address],
    query: { enabled: !!address }
  });

  // Read allowances
  const { data: usdcAllowance, refetch: refetchUsdcAllowance } = useReadContract({
    address: CONTRACTS.USDC,
    abi: ERC20ABI,
    functionName: 'allowance',
    args: [address, CONTRACTS.VAULT],
    query: { enabled: !!address }
  });

  const { data: wethAllowance, refetch: refetchWethAllowance } = useReadContract({
    address: CONTRACTS.WETH,
    abi: ERC20ABI,
    functionName: 'allowance',
    args: [address, CONTRACTS.VAULT],
    query: { enabled: !!address }
  });

  // Auto-proceed to deposit after approval is confirmed
  useEffect(() => {
    if (isConfirmed && transactionStep === 'approving') {
      setTransactionStep('depositing');
      
      // Refresh allowances after approval
      refetchUsdcAllowance();
      refetchWethAllowance();
      
      // Proceed with deposit
      const tokenAddress = selectedToken === 'USDC' ? CONTRACTS.USDC : CONTRACTS.WETH;
      const decimals = selectedToken === 'USDC' ? 6 : 18;
      const amount = parseUnits(depositAmount, decimals);
      
      writeContract({
        address: CONTRACTS.VAULT,
        abi: BriqVaultABI,
        functionName: 'deposit',
        args: [tokenAddress, amount]
      });
    } else if (isConfirmed && transactionStep === 'depositing') {
      setTransactionStep('idle');
      setDepositAmount(''); // Clear the form
      
      // Refresh all balances after successful deposit
      refetchUsdcBalance();
      refetchWethBalance();
      refetchSharesBalance();
      refetchUsdcAllowance();
      refetchWethAllowance();
    }
  }, [isConfirmed, transactionStep, selectedToken, depositAmount, CONTRACTS, refetchUsdcBalance, refetchWethBalance, refetchSharesBalance, refetchUsdcAllowance, refetchWethAllowance]);

  const handleDeposit = async () => {
    if (!depositAmount || !isConnected) return;
    
    const tokenAddress = selectedToken === 'USDC' ? CONTRACTS.USDC : CONTRACTS.WETH;
    const decimals = selectedToken === 'USDC' ? 6 : 18;
    const amount = parseUnits(depositAmount, decimals);
    
    // Check if approval is needed
    const allowance = selectedToken === 'USDC' ? usdcAllowance : wethAllowance;
    
    if (!allowance || allowance < amount) {
      setTransactionStep('approving');
      
      // First approve
      writeContract({
        address: tokenAddress,
        abi: ERC20ABI,
        functionName: 'approve',
        args: [CONTRACTS.VAULT, amount]
      });
      
    } else {
      setTransactionStep('depositing');
      
      // Direct deposit
      writeContract({
        address: CONTRACTS.VAULT,
        abi: BriqVaultABI,
        functionName: 'deposit',
        args: [tokenAddress, amount]
      });
    }
  };

  const formatBalance = (balance, decimals) => {
    if (!balance) return '0';
    return parseFloat(formatUnits(balance, decimals)).toFixed(4);
  };

  const getCurrentBalance = () => {
    if (selectedToken === 'USDC') {
      return formatBalance(usdcBalance, 6);
    } else {
      return formatBalance(wethBalance, 18);
    }
  };

  return (
    <Layout>
      <div className="flex justify-center py-12">
        <div className="text-center max-w-6xl mx-auto px-4 sm:px-6">
          
          {/* Hero Section */}
          <div className="mb-20">
            <h1 
              className="text-5xl md:text-6xl text-zen-900 dark:text-cream-100 font-light mb-6 transition-colors duration-300"
              style={{ fontFamily: 'var(--font-jetbrains-mono)', fontWeight: 100 }}
            >
              Portfolio
            </h1>
            <p className="text-xl text-zen-700 dark:text-cream-300 max-w-3xl mx-auto font-light font-lato">
              Manage your Briq Vault positions
            </p>
          </div>

          {/* Vault Interface Card */}
          {!isConnected ? (
            <div className="max-w-md mx-auto bg-cream-100 dark:bg-zen-700 rounded-lg p-8 border border-zen-200 dark:border-zen-600 transition-colors duration-300">
              <h3 className="text-xl font-medium text-zen-900 dark:text-cream-100 mb-4 font-lato">
                Connect Wallet
              </h3>
              <p className="text-zen-600 dark:text-cream-400 font-lato">
                Please connect your wallet to access the vault interface
              </p>
            </div>
          ) : (
            <div className="max-w-md mx-auto bg-cream-100 dark:bg-zen-700 rounded-lg p-8 border border-zen-200 dark:border-zen-600 transition-colors duration-300">
              <h3 className="text-xl font-medium text-zen-900 dark:text-cream-100 mb-6 font-lato">
                Vault Interface
              </h3>
              
              <div className="space-y-6">
                {/* Token Selection */}
                <div>
                  <label 
                    htmlFor="token-select"
                    className="block text-sm font-medium text-zen-900 dark:text-cream-100 mb-3 font-lato"
                  >
                    Select Token
                  </label>
                  <div className="relative">
                    <select
                      id="token-select"
                      value={selectedToken}
                      onChange={(e) => setSelectedToken(e.target.value)}
                      className="w-full p-4 border border-zen-300 dark:border-zen-500 rounded-lg bg-cream-50 dark:bg-zen-600 text-zen-900 dark:text-cream-100 transition-colors duration-300 font-lato focus:outline-none focus:ring-2 focus:ring-briq-orange focus:border-transparent appearance-none cursor-pointer"
                    >
                      <option value="USDC">USDC</option>
                      <option value="WETH">WETH</option>
                    </select>
                    <div className="absolute inset-y-0 right-0 flex items-center pr-4 pointer-events-none">
                      <svg className="w-5 h-5 text-zen-500 dark:text-cream-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </div>
                  <p className="text-sm text-zen-600 dark:text-cream-400 mt-2 font-lato">
                    Balance: {getCurrentBalance()} {selectedToken}
                  </p>
                </div>

                {/* Amount Input */}
                <div>
                  <label 
                    htmlFor="amount-input"
                    className="block text-sm font-medium text-zen-900 dark:text-cream-100 mb-3 font-lato"
                  >
                    Amount to Deposit
                  </label>
                  <input
                    id="amount-input"
                    type="number"
                    value={depositAmount}
                    onChange={(e) => setDepositAmount(e.target.value)}
                    placeholder="0.0"
                    className="w-full p-4 border border-zen-300 dark:border-zen-500 rounded-lg bg-cream-50 dark:bg-zen-600 text-zen-900 dark:text-cream-100 transition-colors duration-300 font-lato focus:outline-none focus:ring-2 focus:ring-briq-orange focus:border-transparent [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  />
                </div>

                {/* Deposit Button */}
                <button
                  onClick={handleDeposit}
                  disabled={isPending || isConfirming || !depositAmount}
                  className="w-full border border-briq-orange text-briq-orange hover:bg-briq-orange hover:text-white disabled:opacity-50 disabled:cursor-not-allowed px-8 py-4 rounded-lg transition-all duration-200 font-medium font-lato"
                >
                  {isPending || isConfirming ? (
                    transactionStep === 'approving' ? 'Approving...' :
                    transactionStep === 'depositing' ? 'Depositing...' :
                    'Processing...'
                  ) : 'Deposit'}
                </button>

                {/* Transaction Status */}
                {hash && (
                  <div className="mt-6 p-4 bg-briq-orange/10 border border-briq-orange/20 rounded-lg">
                    <p className="text-sm text-zen-800 dark:text-cream-200 font-lato mb-2">
                      Transaction Hash:
                    </p>
                    <p className="text-sm font-mono text-zen-900 dark:text-cream-100 break-all">
                      {hash}
                    </p>
                    {isConfirming && (
                      <p className="text-sm text-briq-orange mt-2 font-lato">
                        Waiting for confirmation...
                      </p>
                    )}
                    {isConfirmed && (
                      <p className="text-sm text-green-600 dark:text-green-400 mt-2 font-lato">
                        Transaction confirmed!
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

        </div>
      </div>
    </Layout>
  );
}
