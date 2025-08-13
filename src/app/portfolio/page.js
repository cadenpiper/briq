"use client";

import { useState, useEffect, useMemo } from 'react';
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { parseUnits, formatUnits } from 'viem';
import Layout from '../components/Layout';
import { USDCIcon, WETHIcon } from '../components/icons';
import CopyButton from '../components/CopyButton';

// Import ABIs
import BriqVaultArtifact from '../abis/BriqVault.json';
import BriqSharesArtifact from '../abis/BriqShares.json';
import PriceFeedManagerArtifact from '../abis/PriceFeedManager.json';
import ERC20ABI from '../abis/ERC20.json';

// Extract ABIs from artifacts
const BriqVaultABI = BriqVaultArtifact.abi;
const BriqSharesABI = BriqSharesArtifact.abi;
const PriceFeedManagerABI = PriceFeedManagerArtifact.abi;

// Import fork addresses for development
import { getContractAddresses } from '../utils/forkAddresses';

export default function Portfolio() {
  const { address, isConnected } = useAccount();
  const { writeContract, data: hash, isPending } = useWriteContract();
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({ hash });

  const [depositAmount, setDepositAmount] = useState('');
  const [withdrawShares, setWithdrawShares] = useState('');
  const [selectedToken, setSelectedToken] = useState('USDC');
  const [transactionStep, setTransactionStep] = useState('idle'); // 'idle', 'approving', 'depositing', 'withdrawing'
  const [vaultMode, setVaultMode] = useState('deposit'); // 'deposit' or 'withdraw'

  // Get contract addresses from fork deployment
  const CONTRACTS = getContractAddresses();

  // Calculate token amount for USD conversion
  const tokenAmountForUSD = useMemo(() => {
    if (!depositAmount || depositAmount === '0') return BigInt(0);
    
    try {
      const decimals = selectedToken === 'USDC' ? 6 : 18;
      return parseUnits(depositAmount, decimals);
    } catch {
      return BigInt(0);
    }
  }, [depositAmount, selectedToken]);

  // Get USD value from PriceFeedManager contract
  const { data: usdValueRaw, isLoading: priceLoading } = useReadContract({
    address: CONTRACTS.PRICE_FEED_MANAGER,
    abi: PriceFeedManagerABI,
    functionName: 'getTokenValueInUSD',
    args: [
      selectedToken === 'USDC' ? CONTRACTS.USDC : CONTRACTS.WETH,
      tokenAmountForUSD
    ],
    query: { 
      enabled: !!CONTRACTS.PRICE_FEED_MANAGER && tokenAmountForUSD > 0,
      refetchInterval: 30000 // Refetch every 30 seconds
    }
  });

  // Format USD value for display
  const usdValue = useMemo(() => {
    if (!usdValueRaw || tokenAmountForUSD === BigInt(0)) return '0.00';
    
    try {
      const formatted = formatUnits(usdValueRaw, 18);
      return parseFloat(formatted).toFixed(2);
    } catch {
      return '0.00';
    }
  }, [usdValueRaw, tokenAmountForUSD]);

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
    } else if (isConfirmed && transactionStep === 'withdrawing') {
      setTransactionStep('idle');
      setWithdrawShares(''); // Clear the form
      
      // Refresh all balances after successful withdrawal
      refetchUsdcBalance();
      refetchWethBalance();
      refetchSharesBalance();
    }
  }, [isConfirmed, transactionStep, selectedToken, depositAmount, withdrawShares, CONTRACTS, refetchUsdcBalance, refetchWethBalance, refetchSharesBalance, refetchUsdcAllowance, refetchWethAllowance, writeContract]);

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

  // Check withdrawal availability
  const { data: withdrawalAvailability } = useReadContract({
    address: CONTRACTS.VAULT,
    abi: BriqVaultABI,
    functionName: 'checkWithdrawalAvailability',
    args: [
      selectedToken === 'USDC' ? CONTRACTS.USDC : CONTRACTS.WETH,
      withdrawShares ? parseUnits(withdrawShares, 18) : BigInt(0)
    ],
    query: { 
      enabled: !!withdrawShares && withdrawShares !== '0' && vaultMode === 'withdraw',
      refetchInterval: 10000 // Refetch every 10 seconds
    }
  });

  // Get USD value for withdrawal using PriceFeedManager
  const { data: withdrawalUsdValueRaw } = useReadContract({
    address: CONTRACTS.PRICE_FEED_MANAGER,
    abi: PriceFeedManagerABI,
    functionName: 'getTokenValueInUSD',
    args: [
      selectedToken === 'USDC' ? CONTRACTS.USDC : CONTRACTS.WETH,
      withdrawalAvailability ? withdrawalAvailability[2] : BigInt(0)
    ],
    query: { 
      enabled: !!withdrawalAvailability && !!withdrawShares && vaultMode === 'withdraw',
      refetchInterval: 30000
    }
  });

  // Format USD value from 18 decimals
  const withdrawalUsdValue = withdrawalUsdValueRaw 
    ? parseFloat(formatUnits(withdrawalUsdValueRaw, 18)).toFixed(2)
    : '0.00';

  const handleWithdraw = async () => {
    if (!withdrawShares || !isConnected) return;
    
    const tokenAddress = selectedToken === 'USDC' ? CONTRACTS.USDC : CONTRACTS.WETH;
    const sharesAmount = parseUnits(withdrawShares, 18);
    
    setTransactionStep('withdrawing');
    
    writeContract({
      address: CONTRACTS.VAULT,
      abi: BriqVaultABI,
      functionName: 'withdraw',
      args: [tokenAddress, sharesAmount]
    });
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

          {/* Portfolio Overview */}
          {isConnected && (
            <div className="max-w-4xl mx-auto mb-12">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* BRIQ Balance */}
                <div className="bg-cream-100 dark:bg-zen-700 rounded-lg p-6 border border-zen-200 dark:border-zen-600 transition-colors duration-300">
                  <div className="flex items-center justify-center gap-3 mb-4">
                    <div className="w-8 h-8 rounded-full bg-briq-orange flex items-center justify-center flex-shrink-0">
                      <span className="text-white font-bold text-sm">B</span>
                    </div>
                    <h4 className="text-lg font-medium text-zen-900 dark:text-cream-100 font-lato text-center">
                      BRIQ
                    </h4>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-semibold text-briq-orange mb-1 font-jetbrains-mono">
                      {formatBalance(sharesBalance, 18)}
                    </p>
                    <p className="text-sm text-zen-600 dark:text-cream-400 font-lato">
                      BRIQ
                    </p>
                  </div>
                </div>

                {/* USDC Balance */}
                <div className="bg-cream-100 dark:bg-zen-700 rounded-lg p-6 border border-zen-200 dark:border-zen-600 transition-colors duration-300">
                  <div className="flex items-center justify-center gap-3 mb-4">
                    <USDCIcon size={32} className="flex-shrink-0" />
                    <h4 className="text-lg font-medium text-zen-900 dark:text-cream-100 font-lato text-center">
                      USDC
                    </h4>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-semibold text-zen-900 dark:text-cream-100 mb-1 font-jetbrains-mono">
                      {formatBalance(usdcBalance, 6)}
                    </p>
                    <p className="text-sm text-zen-600 dark:text-cream-400 font-lato">
                      USDC
                    </p>
                  </div>
                </div>

                {/* WETH Balance */}
                <div className="bg-cream-100 dark:bg-zen-700 rounded-lg p-6 border border-zen-200 dark:border-zen-600 transition-colors duration-300">
                  <div className="flex items-center justify-center gap-3 mb-4">
                    <WETHIcon size={32} className="flex-shrink-0" />
                    <h4 className="text-lg font-medium text-zen-900 dark:text-cream-100 font-lato text-center">
                      WETH
                    </h4>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-semibold text-zen-900 dark:text-cream-100 mb-1 font-jetbrains-mono">
                      {formatBalance(wethBalance, 18)}
                    </p>
                    <p className="text-sm text-zen-600 dark:text-cream-400 font-lato">
                      WETH
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

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
              
              {/* Deposit/Withdraw Sliding Toggle Switch */}
              <div className="mb-6">
                <div className="relative bg-cream-50 dark:bg-zen-600 rounded-lg border border-zen-300 dark:border-zen-500 overflow-hidden p-1">
                  {/* Sliding Background - Matches Button Hover Theme */}
                  <div 
                    className="absolute bg-briq-orange/10 border-briq-orange/20 rounded-md transition-all duration-300 ease-out"
                    style={{
                      transform: vaultMode === 'withdraw' ? 'translateX(calc(100% + 8px))' : 'translateX(0%)',
                      borderWidth: '1px',
                      top: '4px',
                      bottom: '4px',
                      left: '4px',
                      width: 'calc(50% - 8px)'
                    }}
                  />
                  
                  {/* Toggle Options */}
                  <div className="relative flex">
                    <button
                      onClick={() => setVaultMode('deposit')}
                      className={`flex-1 py-3 px-4 text-sm font-medium transition-all duration-300 relative z-10 rounded-md ${
                        vaultMode === 'deposit'
                          ? 'text-briq-orange font-semibold'
                          : 'text-zen-500 dark:text-cream-500 hover:text-zen-700 dark:hover:text-cream-300'
                      }`}
                    >
                      Deposit
                    </button>
                    <button
                      onClick={() => setVaultMode('withdraw')}
                      className={`flex-1 py-3 px-4 text-sm font-medium transition-all duration-300 relative z-10 rounded-md ${
                        vaultMode === 'withdraw'
                          ? 'text-briq-orange font-semibold'
                          : 'text-zen-500 dark:text-cream-500 hover:text-zen-700 dark:hover:text-cream-300'
                      }`}
                    >
                      Withdraw
                    </button>
                  </div>
                </div>
              </div>
              
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
                    {vaultMode === 'deposit' ? `Balance: ${getCurrentBalance()} ${selectedToken}` : `Shares: ${formatBalance(sharesBalance, 18)} BRIQ`}
                  </p>
                </div>

                {/* Conditional Input Based on Mode */}
                {vaultMode === 'deposit' ? (
                  /* Deposit Amount Input */
                  <div>
                    <label 
                      htmlFor="amount-input"
                      className="block text-sm font-medium text-zen-900 dark:text-cream-100 mb-3 font-lato"
                    >
                      Amount to Deposit
                    </label>
                    <div className="relative">
                      <input
                        id="amount-input"
                        type="number"
                        value={depositAmount}
                        onChange={(e) => setDepositAmount(e.target.value)}
                        placeholder="0.0"
                        className="w-full p-4 pr-24 border border-zen-300 dark:border-zen-500 rounded-lg bg-cream-50 dark:bg-zen-600 text-zen-900 dark:text-cream-100 transition-colors duration-300 font-lato focus:outline-none focus:ring-2 focus:ring-briq-orange focus:border-transparent [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      />
                      {/* USD Value Display */}
                      <div className="absolute inset-y-0 right-0 flex items-center pr-4">
                        {priceLoading ? (
                          <div className="w-4 h-4 border-2 border-briq-orange border-t-transparent rounded-full animate-spin"></div>
                        ) : (
                          <span className="text-sm font-medium text-briq-orange font-jetbrains-mono">
                            ${usdValue}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ) : (
                  /* Withdraw Shares Input */
                  <div>
                    <label 
                      htmlFor="shares-input"
                      className="block text-sm font-medium text-zen-900 dark:text-cream-100 mb-3 font-lato"
                    >
                      Shares to Withdraw
                    </label>
                    <div className="relative">
                      <input
                        id="shares-input"
                        type="number"
                        value={withdrawShares}
                        onChange={(e) => setWithdrawShares(e.target.value)}
                        placeholder="0.0"
                        className="w-full p-4 pr-20 border border-zen-300 dark:border-zen-500 rounded-lg bg-cream-50 dark:bg-zen-600 text-zen-900 dark:text-cream-100 transition-colors duration-300 font-lato focus:outline-none focus:ring-2 focus:ring-briq-orange focus:border-transparent [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      />
                      <div className="absolute inset-y-0 right-0 flex items-center pr-4">
                        <span className="text-sm font-medium text-zen-600 dark:text-cream-400 font-jetbrains-mono">
                          BRIQ
                        </span>
                      </div>
                    </div>
                    
                    {/* Withdrawal Availability Info */}
                    {withdrawalAvailability && withdrawShares && (
                      <div className="mt-3 p-3 bg-briq-orange/10 border border-briq-orange/20 rounded-lg">
                        <div className="text-sm space-y-1">
                          {/* Full amount available */}
                          <div className="flex justify-between">
                            <span className="text-zen-600 dark:text-cream-400">Full amount available:</span>
                            <span className={`font-medium ${withdrawalAvailability[0] ? 'text-green-600 dark:text-green-400' : 'text-yellow-600 dark:text-yellow-400'}`}>
                              {withdrawalAvailability[0] ? 'Yes' : 'No'}
                            </span>
                          </div>
                          
                          {/* Amount requested */}
                          <div className="flex justify-between">
                            <span className="text-zen-600 dark:text-cream-400">Amount requested:</span>
                            <span className="font-medium text-zen-900 dark:text-cream-100 font-jetbrains-mono">
                              {parseFloat(formatUnits(withdrawalAvailability[2], selectedToken === 'USDC' ? 6 : 18)).toFixed(selectedToken === 'USDC' ? 6 : 8)} {selectedToken}
                            </span>
                          </div>
                          
                          {/* Amount available (only show if can't withdraw full amount) */}
                          {!withdrawalAvailability[0] && (
                            <div className="flex justify-between">
                              <span className="text-zen-600 dark:text-cream-400">Amount available:</span>
                              <span className="font-medium text-zen-900 dark:text-cream-100 font-jetbrains-mono">
                                {parseFloat(formatUnits(withdrawalAvailability[1], selectedToken === 'USDC' ? 6 : 18)).toFixed(selectedToken === 'USDC' ? 6 : 8)} {selectedToken}
                              </span>
                            </div>
                          )}
                          
                          {/* USD value */}
                          <div className="flex justify-between">
                            <span className="text-zen-600 dark:text-cream-400">USD value:</span>
                            <span className="font-medium text-briq-orange font-jetbrains-mono">
                              ${withdrawalUsdValue}
                            </span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Action Button */}
                <button
                  onClick={vaultMode === 'deposit' ? handleDeposit : handleWithdraw}
                  disabled={
                    isPending || isConfirming || 
                    (vaultMode === 'deposit' ? !depositAmount : !withdrawShares)
                  }
                  className="w-full border border-briq-orange text-briq-orange bg-transparent hover:bg-briq-orange/10 hover:shadow-highlight disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:shadow-none px-8 py-4 rounded-lg transition-all duration-300 font-medium font-lato relative overflow-hidden hover-highlight-effect"
                >
                  {isPending || isConfirming ? (
                    transactionStep === 'approving' ? 'Approving...' :
                    transactionStep === 'depositing' ? 'Depositing...' :
                    transactionStep === 'withdrawing' ? 'Withdrawing...' :
                    'Processing...'
                  ) : (vaultMode === 'deposit' ? 'Deposit' : 'Withdraw')}
                </button>

                {/* Transaction Status */}
                {hash && (
                  <div className="mt-6 p-4 bg-briq-orange/10 border border-briq-orange/20 rounded-lg">
                    {/* Transaction Confirmed Message at Top */}
                    {isConfirmed && (
                      <div className="flex items-center justify-center gap-2 mb-6">
                        <p className="text-sm text-green-600 dark:text-green-400 font-lato font-medium">
                          Transaction confirmed
                        </p>
                        <svg className="w-4 h-4 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                    )}
                    
                    {/* Loading State */}
                    {isConfirming && (
                      <div className="flex items-center gap-2 mb-4">
                        <div className="w-4 h-4 border-2 border-briq-orange border-t-transparent rounded-full animate-spin"></div>
                        <p className="text-sm text-briq-orange font-lato">
                          Waiting for confirmation...
                        </p>
                      </div>
                    )}

                    {/* Transaction Hash with Copy Button */}
                    <div>
                      <p className="text-sm text-zen-800 dark:text-cream-200 font-lato mb-1">
                        Transaction Hash:
                      </p>
                      <CopyButton 
                        text={hash} 
                        showFullHash={true}
                        className="w-full"
                      />
                    </div>
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
