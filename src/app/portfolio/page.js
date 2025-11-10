"use client";

import { useState, useEffect, useMemo } from 'react';
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { parseUnits, formatUnits } from 'viem';
import Layout from '../components/Layout';
import AnimatedBackground from '../components/AnimatedBackground';
import { USDCIcon, WETHIcon } from '../components/icons';
import CopyButton from '../components/CopyButton';
import { useAaveRewardsAnalytics } from '../hooks/useAaveRewardsAnalytics';
import { useCompoundRewardsAnalytics } from '../hooks/useCompoundRewardsAnalytics';

// Import ABIs
import BriqVaultArtifact from '../abis/BriqVault.json';
import BriqSharesArtifact from '../abis/BriqShares.json';
import PriceFeedManagerArtifact from '../abis/PriceFeedManager.json';
import StrategyAaveArtifact from '../abis/StrategyAave.json';
import StrategyCompoundArtifact from '../abis/StrategyCompoundComet.json';
import ERC20ABI from '../abis/ERC20.json';

// Extract ABIs from artifacts
const BriqVaultABI = BriqVaultArtifact.abi;
const BriqSharesABI = BriqSharesArtifact.abi;
const PriceFeedManagerABI = PriceFeedManagerArtifact.abi;
const StrategyAaveABI = StrategyAaveArtifact.abi;
const StrategyCompoundABI = StrategyCompoundArtifact.abi;

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
  const [isPrivacyMode, setIsPrivacyMode] = useState(false);

  // Helper function to hide values with asterisks
  const hideValue = (value, length = 6) => {
    return isPrivacyMode ? '*'.repeat(length) : value;
  };

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

  // Get total vault value in USD
  const { data: totalVaultValueUSD } = useReadContract({
    address: CONTRACTS.VAULT,
    abi: BriqVaultABI,
    functionName: 'getTotalVaultValueInUSD',
    query: { enabled: !!address }
  });

  // Get total supply of BRIQ shares
  const { data: totalSharesSupply } = useReadContract({
    address: CONTRACTS.SHARES,
    abi: BriqSharesABI,
    functionName: 'totalSupply',
    query: { enabled: !!address }
  });

  // Get rewards analytics data
  const { 
    totalRewardsUSD: aaveTotalRewardsUSD, 
    tokenRewards: aaveTokenRewards, 
    isLoading: aaveRewardsLoading, 
    error: aaveRewardsError 
  } = useAaveRewardsAnalytics({
    contracts: CONTRACTS,
    strategyAaveAbi: StrategyAaveABI,
    priceFeedAbi: PriceFeedManagerABI
  });

  const { 
    totalRewardsUSD: compoundTotalRewardsUSD,
    totalInterestRewards: compoundInterestRewards,
    totalProtocolRewards: compoundProtocolRewards,
    tokenRewards: compoundTokenRewards, 
    isLoading: compoundRewardsLoading, 
    error: compoundRewardsError 
  } = useCompoundRewardsAnalytics({
    contracts: CONTRACTS,
    strategyCompoundAbi: StrategyCompoundABI,
    priceFeedAbi: PriceFeedManagerABI
  });

  // Calculate user's share value in USD
  const userShareValueUSD = (() => {
    if (!sharesBalance || !totalVaultValueUSD || !totalSharesSupply || totalSharesSupply === BigInt(0)) {
      return BigInt(0);
    }
    
    // Calculate: (userShares * totalVaultValueUSD) / totalSharesSupply
    return (sharesBalance * totalVaultValueUSD) / totalSharesSupply;
  })();

  // Calculate user's proportional share of rewards
  const userRewardsData = (() => {
    if (!sharesBalance || !totalSharesSupply || totalSharesSupply === BigInt(0) || 
        aaveRewardsLoading || compoundRewardsLoading) {
      return {
        userRewardsUSD: 0,
        userSharePercentage: 0,
        totalRewardsUSD: 0,
        isLoading: aaveRewardsLoading || compoundRewardsLoading
      };
    }

    // Calculate user's percentage of total shares
    const userSharePercentage = (parseFloat(formatUnits(sharesBalance, 18)) / 
                                parseFloat(formatUnits(totalSharesSupply, 18))) * 100;

    // Calculate total rewards USD
    const totalRewardsUSD = aaveTotalRewardsUSD + compoundTotalRewardsUSD;

    // Calculate user's proportional share of rewards
    const userRewardsUSD = totalRewardsUSD * (userSharePercentage / 100);

    return {
      userRewardsUSD,
      userSharePercentage,
      totalRewardsUSD,
      isLoading: false
    };
  })();

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
      <AnimatedBackground />
      <div className="flex justify-center py-12">
        <div className="text-center max-w-6xl mx-auto px-4 sm:px-6">
          
          {/* Hero Section */}
          <div className="mb-16 sm:mb-20 lg:mb-24">
            <h1 
              className="text-3xl sm:text-4xl md:text-5xl text-foreground font-light mb-4 sm:mb-6 transition-colors duration-300 leading-tight"
              style={{ fontFamily: 'var(--font-jetbrains-mono)', fontWeight: 100 }}
            >
              Portfolio
            </h1>
            <p className="text-lg sm:text-xl text-foreground/70 max-w-2xl mx-auto font-light font-lato">
              Manage your Briq Vault positions
            </p>
          </div>

          {/* Portfolio Overview - Sleek Horizontal Card */}
          {isConnected && (
            <div className="max-w-6xl mx-auto mb-12">
              <div className="glass-card p-6 sm:p-8 relative min-h-[400px]">
                {/* Privacy Toggle Button - Top Right */}
                <button
                  onClick={() => setIsPrivacyMode(!isPrivacyMode)}
                  className="absolute top-4 right-4 p-2 rounded-lg glass hover:bg-zen-300/30 dark:hover:bg-zen-500/30 transition-colors duration-200 z-10 backdrop-blur-sm"
                  title={isPrivacyMode ? "Show values" : "Hide values"}
                >
                  {isPrivacyMode ? (
                    // Eye slash icon (Heroicons - values hidden)
                    <svg className="w-5 h-5 text-foreground/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 11-4.243-4.243m4.242 4.242L9.88 9.88" />
                    </svg>
                  ) : (
                    // Eye icon (Heroicons - values visible)
                    <svg className="w-5 h-5 text-foreground/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>

                {/* Header */}
                <div className="text-center mb-6">
                  <h3 className="text-2xl sm:text-3xl font-bold text-foreground mb-4">
                    Your Portfolio
                  </h3>
                  
                  {/* Portfolio Value - Centered */}
                  <div className="mb-8">
                    <h4 className="text-sm font-medium text-foreground/60 uppercase tracking-wider mb-3">
                      Value
                    </h4>
                    
                    <div className="text-4xl sm:text-5xl font-bold text-green-600 font-jetbrains-mono mb-2 min-h-[3rem] flex items-center justify-center">
                      {userShareValueUSD && userShareValueUSD > BigInt(0) ? 
                        hideValue(`$${parseFloat(formatUnits(userShareValueUSD, 18)).toLocaleString('en-US', {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2
                        })}`, 8)
                        : hideValue('$0.00', 8)
                      }
                    </div>
                    <p className="text-sm text-zen-500 dark:text-cream-500">
                      Including accrued rewards
                    </p>
                  </div>
                </div>

                {/* Three Column Layout */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                  {/* Left Side - BRIQ Shares */}
                  <div className="flex flex-col items-center space-y-4">
                    <h4 className="text-sm font-medium text-foreground/60 uppercase tracking-wider text-center">
                      Your Shares
                    </h4>
                    <div className="flex items-center space-x-3 p-4 bg-cream-100 dark:bg-zen-700 rounded-xl border border-cream-200 dark:border-zen-600 hover:shadow-md transition-all duration-200 w-full max-w-sm min-h-[80px]">
                      <div className="w-12 h-12 rounded-full bg-briq-orange flex items-center justify-center flex-shrink-0 shadow-sm">
                        <span className="text-white font-bold text-lg">B</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-baseline justify-between">
                          <span className="text-xl font-semibold text-foreground font-jetbrains-mono truncate min-w-[120px] text-left">
                            {hideValue(formatBalance(sharesBalance, 18), 8)}
                          </span>
                          <span className="text-sm font-medium text-briq-orange ml-2 flex-shrink-0">
                            BRIQ
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Center - User Rewards */}
                  <div className="flex flex-col items-center space-y-4">
                    <h4 className="text-sm font-medium text-foreground/60 uppercase tracking-wider text-center">
                      Available Rewards
                    </h4>
                    
                    <div className="text-center p-4 bg-cream-100 dark:bg-zen-700 rounded-xl border border-cream-200 dark:border-zen-600 w-full max-w-sm min-h-[80px] flex items-center justify-center">
                      <div className="text-2xl font-bold text-green-600 font-jetbrains-mono min-w-[120px]">
                        {userRewardsData.isLoading ? (
                          <div className="animate-pulse bg-zen-200 dark:bg-zen-600 h-8 w-24 mx-auto rounded"></div>
                        ) : (
                          hideValue(`$${userRewardsData.userRewardsUSD.toLocaleString('en-US', {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2
                          })}`, 8)
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right Side - Available Wallet Balance */}
                  <div className="flex flex-col items-center space-y-4">
                    <h4 className="text-sm font-medium text-foreground/60 uppercase tracking-wider text-center">
                      Available Wallet Balance
                    </h4>
                    <div className="space-y-3 w-full max-w-sm">
                      {/* USDC */}
                      <div className="flex items-center space-x-3 p-3 bg-cream-100 dark:bg-zen-700 rounded-xl border border-cream-200 dark:border-zen-600 hover:shadow-md transition-all duration-200 min-h-[64px]">
                        <div className="w-10 h-10 flex items-center justify-center flex-shrink-0">
                          <USDCIcon size={40} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-baseline justify-between">
                            <span className="text-lg font-semibold text-foreground font-jetbrains-mono truncate min-w-[100px] text-left">
                              {hideValue(formatBalance(usdcBalance, 6), 6)}
                            </span>
                            <span className="text-xs font-medium text-blue-600 dark:text-blue-400 ml-2 flex-shrink-0">
                              USDC
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* WETH */}
                      <div className="flex items-center space-x-3 p-3 bg-cream-100 dark:bg-zen-700 rounded-xl border border-cream-200 dark:border-zen-600 hover:shadow-md transition-all duration-200 min-h-[64px]">
                        <div className="w-10 h-10 flex items-center justify-center flex-shrink-0">
                          <WETHIcon size={40} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-baseline justify-between">
                            <span className="text-lg font-semibold text-foreground font-jetbrains-mono truncate min-w-[100px] text-left">
                              {hideValue(formatBalance(wethBalance, 18), 6)}
                            </span>
                            <span className="text-xs font-medium text-purple-600 dark:text-purple-400 ml-2 flex-shrink-0">
                              WETH
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Vault Interface Card */}
          {!isConnected ? (
            <div className="max-w-md mx-auto glass-card p-8 transition-colors duration-300">
              <h3 className="text-xl font-medium text-foreground mb-4 font-lato">
                Connect Wallet
              </h3>
              <p className="text-foreground/60 font-lato">
                Please connect your wallet to access the vault interface
              </p>
            </div>
          ) : (
            <div className="max-w-md mx-auto glass-card p-8 transition-colors duration-300">
              <h3 className="text-xl font-medium text-foreground mb-6 font-lato">
                Vault Interface
              </h3>
              
              {/* Deposit/Withdraw Pill Toggle - Website Theme */}
              <div className="mb-6">
                <div className="relative bg-zen-100/20 dark:bg-zen-700/20 rounded-full p-1 backdrop-blur-sm">
                  {/* Sliding Background */}
                  <div 
                    className="absolute bg-zen-50/30 dark:bg-zen-800/30 rounded-full transition-all duration-300 ease-out backdrop-blur-sm"
                    style={{
                      transform: vaultMode === 'withdraw' ? 'translateX(calc(100% + 8px))' : 'translateX(0%)',
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
                      className={`flex-1 py-3 px-6 text-sm font-semibold transition-all duration-300 relative z-10 rounded-full flex items-center justify-center gap-2 ${
                        vaultMode === 'deposit'
                          ? 'text-briq-orange'
                          : 'text-zen-500 dark:text-cream-500 hover:text-zen-700 dark:hover:text-cream-300'
                      }`}
                    >
                      {/* Deposit Icon */}
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8l-8-8-8 8" />
                      </svg>
                      Deposit
                    </button>
                    <button
                      onClick={() => setVaultMode('withdraw')}
                      className={`flex-1 py-3 px-6 text-sm font-semibold transition-all duration-300 relative z-10 rounded-full flex items-center justify-center gap-2 ${
                        vaultMode === 'withdraw'
                          ? 'text-briq-orange'
                          : 'text-zen-500 dark:text-cream-500 hover:text-zen-700 dark:hover:text-cream-300'
                      }`}
                    >
                      {/* Withdraw Icon */}
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 20V4m-8 8l8 8 8-8" />
                      </svg>
                      Withdraw
                    </button>
                  </div>
                </div>
              </div>
              
              <div className="space-y-6">
                {/* Token Selection - Compact Card Style */}
                <div>
                  <label className="block text-sm font-medium text-foreground mb-3 font-lato">
                    Select Token
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    {/* USDC Card */}
                    <button
                      type="button"
                      onClick={() => setSelectedToken('USDC')}
                      className={`p-3 rounded-lg transition-all duration-300 flex items-center gap-3 backdrop-blur-sm ${
                        selectedToken === 'USDC'
                          ? 'bg-blue-50/30 dark:bg-blue-900/10 transform scale-[1.02] opacity-100'
                          : 'bg-zen-200/20 dark:bg-zen-700/20 opacity-60 hover:opacity-80 hover:bg-zen-100/30 dark:hover:bg-zen-600/30'
                      }`}
                    >
                      <div className="w-6 h-6 flex items-center justify-center flex-shrink-0">
                        <USDCIcon size={24} />
                      </div>
                      <span className={`text-sm font-semibold ${
                        selectedToken === 'USDC' 
                          ? 'text-blue-600 dark:text-blue-400' 
                          : 'text-foreground/60'
                      }`}>
                        USDC
                      </span>
                    </button>

                    {/* WETH Card */}
                    <button
                      type="button"
                      onClick={() => setSelectedToken('WETH')}
                      className={`p-3 rounded-lg transition-all duration-300 flex items-center gap-3 backdrop-blur-sm ${
                        selectedToken === 'WETH'
                          ? 'bg-purple-50/30 dark:bg-purple-900/10 transform scale-[1.02] opacity-100'
                          : 'bg-zen-200/20 dark:bg-zen-700/20 opacity-60 hover:opacity-80 hover:bg-zen-100/30 dark:hover:bg-zen-600/30'
                      }`}
                    >
                      <div className="w-6 h-6 flex items-center justify-center flex-shrink-0">
                        <WETHIcon size={24} />
                      </div>
                      <span className={`text-sm font-semibold ${
                        selectedToken === 'WETH' 
                          ? 'text-purple-600 dark:text-purple-400' 
                          : 'text-foreground/60'
                      }`}>
                        WETH
                      </span>
                    </button>
                  </div>
                  <p className="text-sm text-foreground/60 mt-2 font-lato">
                    {vaultMode === 'deposit' ? `Balance: ${getCurrentBalance()} ${selectedToken}` : `Shares: ${formatBalance(sharesBalance, 18)} BRIQ`}
                  </p>
                </div>

                {/* Conditional Input Based on Mode */}
                {vaultMode === 'deposit' ? (
                  /* Deposit Amount Input */
                  <div>
                    <label 
                      htmlFor="amount-input"
                      className="block text-sm font-medium text-foreground mb-3 font-lato"
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
                        className="w-full p-4 pr-24 rounded-lg bg-zen-50/30 dark:bg-zen-600/30 text-foreground transition-colors duration-300 font-lato focus:outline-none focus:bg-zen-100/50 dark:focus:bg-zen-600/50 backdrop-blur-sm [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
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
                      className="block text-sm font-medium text-foreground mb-3 font-lato"
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
                        className="w-full p-4 pr-20 border border-zen-300 dark:border-zen-500 rounded-lg bg-cream-50 dark:bg-zen-600 text-foreground transition-colors duration-300 font-lato focus:outline-none focus:ring-2 focus:ring-briq-orange focus:border-transparent [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      />
                      <div className="absolute inset-y-0 right-0 flex items-center pr-4">
                        <span className="text-sm font-medium text-foreground/60 font-jetbrains-mono">
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
                            <span className="text-foreground/60">Full amount available:</span>
                            <span className={`font-medium ${withdrawalAvailability[0] ? 'text-green-600 dark:text-green-400' : 'text-yellow-600 dark:text-yellow-400'}`}>
                              {withdrawalAvailability[0] ? 'Yes' : 'No'}
                            </span>
                          </div>
                          
                          {/* Amount requested */}
                          <div className="flex justify-between">
                            <span className="text-foreground/60">Amount requested:</span>
                            <span className="font-medium text-foreground font-jetbrains-mono">
                              {parseFloat(formatUnits(withdrawalAvailability[2], selectedToken === 'USDC' ? 6 : 18)).toFixed(selectedToken === 'USDC' ? 6 : 8)} {selectedToken}
                            </span>
                          </div>
                          
                          {/* Amount available (only show if can't withdraw full amount) */}
                          {!withdrawalAvailability[0] && (
                            <div className="flex justify-between">
                              <span className="text-foreground/60">Amount available:</span>
                              <span className="font-medium text-foreground font-jetbrains-mono">
                                {parseFloat(formatUnits(withdrawalAvailability[1], selectedToken === 'USDC' ? 6 : 18)).toFixed(selectedToken === 'USDC' ? 6 : 8)} {selectedToken}
                              </span>
                            </div>
                          )}
                          
                          {/* USD value */}
                          <div className="flex justify-between">
                            <span className="text-foreground/60">USD value:</span>
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
                        <p className="text-sm text-green-600 font-lato font-medium">
                          Transaction confirmed
                        </p>
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

                    {/* Transaction Hash with Copy Button and Arbiscan Link */}
                    <div>
                      <p className="text-sm text-zen-800 dark:text-cream-200 font-lato mb-2">
                        Transaction Hash:
                      </p>
                      <div className="space-y-2">
                        <CopyButton 
                          text={hash} 
                          showFullHash={true}
                          className="w-full"
                        />
                        <a
                          href={`https://arbiscan.io/tx/${hash}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center justify-center gap-2 w-full px-3 py-2 text-sm font-medium text-white bg-blue-500 hover:bg-blue-600 dark:bg-blue-500 dark:hover:bg-blue-600 border border-blue-500 dark:border-blue-500 rounded-lg transition-all duration-200 shadow-sm hover:shadow-md"
                        >
                          <span>View on Arbiscan</span>
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                          </svg>
                        </a>
                      </div>
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
