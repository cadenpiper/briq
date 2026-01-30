"use client";

import { useState, useEffect, useRef } from 'react';
import { useAccount } from 'wagmi';
import toast, { Toaster } from 'react-hot-toast';
import Layout from '../components/Layout';
import TransactionHistory from './components/TransactionHistory';
import { TokenIcon } from '../components/icons';
import AllocationChart from './components/AllocationChart';
import AllocationDisplay from './components/AllocationDisplay';
import HealthMeter from '../components/HealthMeter';
import { useTokenBalances } from '../hooks/useTokenBalances';
import { useVaultOperations } from '../hooks/useVaultOperations';
import { useVaultPosition } from '../hooks/useVaultPosition';
import { useContractMarketData } from '../hooks/useContractMarketData';
import { useSubgraphMarketData } from '../hooks/useSubgraphMarketData';
import { useTokenPrices } from '../hooks/useTokenPrices';
import { getContractAddresses } from '../utils/forkAddresses';
import BriqVaultArtifact from '../abis/BriqVault.json';
import StrategyCoordinatorArtifact from '../abis/StrategyCoordinator.json';
import PriceFeedManagerArtifact from '../abis/PriceFeedManager.json';
import StrategyAaveArtifact from '../abis/StrategyAave.json';
import StrategyCompoundArtifact from '../abis/StrategyCompoundComet.json';

export default function Dashboard() {
  const { address, isConnected } = useAccount();
  const transactionHistoryRef = useRef();
  const [selectedAction, setSelectedAction] = useState('deposit');
  const [selectedAsset, setSelectedAsset] = useState('USDC');
  const [amount, setAmount] = useState('');
  const [isAssetDropdownOpen, setIsAssetDropdownOpen] = useState(false);
  const [isPrivacyMode, setIsPrivacyMode] = useState(false);
  const assetDropdownRef = useRef(null);
  const { usdc, weth, isLoading } = useTokenBalances();
  const { deposit, withdraw, isPending } = useVaultOperations();
  const { userValueUSD, hasPosition, shareBalance, totalSupply, totalVaultValue, refetch: refetchPosition } = useVaultPosition();
  const { wethPrice, usdcPrice } = useTokenPrices();
  
  // Helper function to hide sensitive data
  const formatPrivateValue = (value, prefix = '$', suffix = '') => {
    return isPrivacyMode ? '••••••' : `${prefix}${value}${suffix}`;
  };
  
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (assetDropdownRef.current && !assetDropdownRef.current.contains(event.target)) {
        setIsAssetDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);
  
  const CONTRACTS = getContractAddresses();
  const { markets, refetch: refetchMarkets } = useContractMarketData({
    contracts: CONTRACTS,
    vaultAbi: BriqVaultArtifact.abi,
    coordinatorAbi: StrategyCoordinatorArtifact.abi,
    priceFeedAbi: PriceFeedManagerArtifact.abi,
    strategyAaveAbi: StrategyAaveArtifact.abi,
    strategyCompoundAbi: StrategyCompoundArtifact.abi
  });

  // Get subgraph data for best APY across all networks
  const { data: subgraphMarkets } = useSubgraphMarketData();

  // Calculate best APYs from subgraph data (Arbitrum only for forked network)
  const usdcSubgraphMarkets = subgraphMarkets?.filter(m => m.token === 'USDC' && m.network === 'Arbitrum One') || [];
  const wethSubgraphMarkets = subgraphMarkets?.filter(m => m.token === 'WETH' && m.network === 'Arbitrum One') || [];
  
  const usdcAPY = usdcSubgraphMarkets.length > 0 
    ? Math.max(...usdcSubgraphMarkets.map(m => parseFloat(m.apyValue))).toFixed(2)
    : '0.00';
  const wethAPY = wethSubgraphMarkets.length > 0 
    ? Math.max(...wethSubgraphMarkets.map(m => parseFloat(m.apyValue))).toFixed(2)
    : '0.00';
  
  // Calculate weighted average APY based on actual vault allocation
  const totalMarketValue = markets?.reduce((sum, m) => sum + m.usdValueFormatted, 0) || 0;
  const averageAPY = totalMarketValue > 0 && markets
    ? markets.reduce((sum, m) => {
        const weight = m.usdValueFormatted / totalMarketValue;
        return sum + (parseFloat(m.apyFormatted) * weight);
      }, 0).toFixed(2)
    : '0.00';

  const handleDeposit = async () => {
    if (!amount || !isConnected) return;
    try {
      await deposit(selectedAsset, amount);
      toast.success('Deposit successful');
      setAmount('');
      // Refetch all data
      transactionHistoryRef.current?.refetch();
      setTimeout(() => {
        refetchPosition();
        refetchMarkets();
      }, 2000);
    } catch (error) {
      if (error.message.includes('User rejected')) {
        toast.error('Transaction rejected');
      } else {
        toast.error('Deposit failed');
      }
    }
  };

  const handleWithdraw = async () => {
    if (!amount || !isConnected) return;
    
    // Check available liquidity for selected token
    const tokenMarkets = markets?.filter(m => m.tokenSymbol === selectedAsset) || [];
    const availableLiquidity = tokenMarkets.reduce((sum, m) => sum + m.usdValueFormatted, 0);
    const sharesToWithdraw = parseFloat(amount);
    const shareBalanceEther = Number(shareBalance) / 1e18;
    const tokenValueToWithdraw = shareBalanceEther > 0 
      ? (sharesToWithdraw / shareBalanceEther) * userValueUSD 
      : 0;
    
    if (tokenValueToWithdraw > availableLiquidity) {
      toast.error(`Insufficient ${selectedAsset} liquidity. Available: $${availableLiquidity.toFixed(2)}`);
      return;
    }
    
    try {
      await withdraw(selectedAsset, amount);
      toast.success('Withdrawal successful');
      setAmount('');
      // Refetch all data
      transactionHistoryRef.current?.refetch();
      setTimeout(() => {
        refetchPosition();
        refetchMarkets();
      }, 2000);
    } catch (error) {
      if (error.message.includes('User rejected')) {
        toast.error('Transaction rejected');
      } else {
        toast.error('Withdrawal failed');
      }
    }
  };

  const handleMaxClick = () => {
    const balance = selectedAsset === 'USDC' ? usdc : weth;
    setAmount(balance.replace(/,/g, ''));
  };

  return (
    <Layout>
      <Toaster 
        position="bottom-center"
        toastOptions={{
          style: {
            background: '#1f2937',
            color: '#f9fafb',
            border: '1px solid #374151',
          },
          success: {
            iconTheme: {
              primary: '#10b981',
              secondary: '#f9fafb',
            },
          },
          error: {
            iconTheme: {
              primary: '#ef4444',
              secondary: '#f9fafb',
            },
          },
        }}
      />
      <div className="min-h-screen py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          {/* Header */}
          <div className="mb-8 flex items-start justify-between">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
                
                {/* Privacy Toggle - Simple Eye Icon */}
                <button
                  onClick={() => setIsPrivacyMode(!isPrivacyMode)}
                  className="p-3 sm:p-1.5 text-foreground/60 hover:text-foreground transition-colors duration-200 flex items-center justify-center cursor-pointer"
                  title={isPrivacyMode ? "Show values" : "Hide values"}
                >
                  <svg 
                    className="w-6 h-6 sm:w-5 sm:h-5" 
                    fill="none" 
                    stroke="currentColor" 
                    viewBox="0 0 24 24"
                  >
                    {isPrivacyMode ? (
                      // Eye closed (eyelid)
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 11-4.243-4.243m4.242 4.242L9.88 9.88" />
                    ) : (
                      // Eye open
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    )}
                  </svg>
                </button>
              </div>
              <p className="text-foreground/60">Manage your DeFi positions and earn optimized yields</p>
            </div>
          </div>

          {/* Portfolio Overview */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="glass-card p-6 hover:scale-[1.02] transition-all duration-300">
              <div className="text-sm text-foreground/60 mb-1">Net Worth</div>
              <div className="text-2xl font-bold text-foreground">{formatPrivateValue((userValueUSD || 0).toFixed(2))}</div>
              <div className="text-xs text-green-500 mt-1">+0.00%</div>
            </div>
            <div className="glass-card p-6 hover:scale-[1.02] transition-all duration-300">
              <div className="text-sm text-foreground/60 mb-1">Total Supplied</div>
              <div className="text-2xl font-bold text-foreground">{formatPrivateValue((userValueUSD || 0).toFixed(2))}</div>
            </div>
            <div className="glass-card p-6 hover:scale-[1.02] transition-all duration-300">
              <div className="text-sm text-foreground/60 mb-1">Total Earned</div>
              <div className="text-2xl font-bold text-green-500">{formatPrivateValue('0.00')}</div>
            </div>
            <div className="glass-card p-6 hover:scale-[1.02] transition-all duration-300">
              <div className="text-sm text-foreground/60 mb-1">Average APY</div>
              <div className="text-2xl font-bold text-accent">{formatPrivateValue(averageAPY, '', '%')}</div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* Current Positions */}
            <div className="lg:col-span-2">
              <div className="glass-card p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-semibold text-foreground">
                    Your Positions
                    {isConnected && address && (
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(address);
                          toast.success('Address copied!');
                        }}
                        className="hidden sm:inline ml-3 text-sm text-foreground/60 hover:text-foreground font-mono cursor-pointer transition-colors"
                        title="Click to copy address"
                      >
                        {`${address.slice(0, 6)}...${address.slice(-4)}`}
                      </button>
                    )}
                  </h2>
                  {isConnected && address && (
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(address);
                        toast.success('Address copied!');
                      }}
                      className="sm:hidden text-sm text-foreground/60 hover:text-foreground font-mono cursor-pointer transition-colors"
                      title="Click to copy address"
                    >
                      {`${address.slice(0, 6)}...${address.slice(-4)}`}
                    </button>
                  )}
                </div>
                
                {!isConnected ? (
                  <div className="text-center py-12">
                    <div className="text-foreground/40 mb-4">
                      <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                      </svg>
                    </div>
                    <p className="text-foreground/60 mb-4">Connect your wallet to view positions</p>
                  </div>
                ) : !hasPosition ? (
                  <div className="text-center py-12 border-2 border-dashed border-foreground/10 rounded-lg">
                    <p className="text-foreground/60">No active positions</p>
                    <p className="text-sm text-foreground/40 mt-1">Start by making your first deposit</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {/* Desktop Layout - Column Headers */}
                    <div className="hidden md:grid grid-cols-6 gap-4 px-4 pb-2 border-b border-foreground/10 text-xs font-medium text-foreground/60">
                      <div>Strategy</div>
                      <div className="text-center">Position</div>
                      <div className="text-center">APY</div>
                      <div className="text-center">Allocation</div>
                      <div className="text-center">Health</div>
                      <div className="text-center">Earned</div>
                    </div>
                    
                    {/* Position Rows */}
                    {['USDC', 'WETH'].map(token => {
                      const tokenMarkets = markets?.filter(m => m.tokenSymbol === token) || [];
                      if (tokenMarkets.length === 0) return null;
                      
                      const totalTokenValue = tokenMarkets.reduce((sum, m) => sum + m.usdValueFormatted, 0);
                      if (totalTokenValue === 0) return null;
                      
                      const userTokenValue = (userValueUSD * totalTokenValue) / totalMarketValue;
                      const tokenAPY = tokenMarkets.length > 0 
                        ? (tokenMarkets.reduce((sum, m) => {
                            const weight = m.usdValueFormatted / totalTokenValue;
                            return sum + (parseFloat(m.apyFormatted) * weight);
                          }, 0)).toFixed(2)
                        : '0.00';
                      
                      const allocationData = tokenMarkets.map(m => ({
                        protocol: m.strategyName,
                        percentage: (m.usdValueFormatted / totalTokenValue) * 100,
                        poolAddress: m.poolAddress
                      }));
                      
                      return (
                        <div key={token}>
                          {/* Desktop Layout */}
                          <div className="hidden md:grid grid-cols-6 gap-4 px-4 py-3 border border-foreground/10 rounded-lg items-center hover:bg-accent/5 hover:shadow-lg hover:shadow-accent/10 transition-all duration-300 group">
                            <div className="flex items-center space-x-2">
                              <TokenIcon token={token} size={24} />
                              <span className="font-medium text-foreground text-sm">{token}</span>
                            </div>
                            <div className="text-center font-semibold text-foreground">{formatPrivateValue(userTokenValue.toFixed(2))}</div>
                            <div className="text-center font-semibold text-foreground">{formatPrivateValue(tokenAPY, '', '%')}</div>
                            <div className="text-center flex justify-center">
                              <AllocationDisplay allocations={allocationData} />
                            </div>
                            <div className="text-center flex justify-center">
                              <HealthMeter health={4} />
                            </div>
                            <div className="text-center font-semibold text-green-500">{formatPrivateValue('0.00')}</div>
                          </div>

                          {/* Mobile Layout */}
                          <div className="md:hidden border border-foreground/10 rounded-lg p-5 hover:bg-accent/5 hover:shadow-lg hover:shadow-accent/10 transition-all duration-300 space-y-4">
                            {/* Header - Stacked */}
                            <div className="text-center space-y-3">
                              <div>
                                <div className="text-sm text-foreground/60 mb-1">Strategy</div>
                                <div className="flex items-center justify-center space-x-3">
                                  <TokenIcon token={token} size={32} />
                                  <span className="font-bold text-foreground text-xl">{token}</span>
                                </div>
                              </div>
                              <div>
                                <div className="text-sm text-foreground/60 mb-1">Value</div>
                                <div className="font-bold text-foreground text-2xl">{formatPrivateValue(userTokenValue.toFixed(2))}</div>
                              </div>
                            </div>
                            
                            {/* Metrics Grid */}
                            <div className="grid grid-cols-2 gap-4">
                              <div className="text-center p-4 bg-foreground/5 rounded-lg">
                                <div className="text-sm text-foreground/60 mb-2">APY</div>
                                <div className="font-bold text-foreground text-xl">{formatPrivateValue(tokenAPY, '', '%')}</div>
                              </div>
                              <div className="text-center p-4 bg-foreground/5 rounded-lg">
                                <div className="text-sm text-foreground/60 mb-2">Health</div>
                                <div className="flex justify-center mt-3">
                                  <HealthMeter health={4} width={50} height={8} />
                                </div>
                              </div>
                            </div>
                            
                            {/* Bottom Grid */}
                            <div className="grid grid-cols-2 gap-4">
                              <div className="text-center p-4 bg-foreground/5 rounded-lg">
                                <div className="text-sm text-foreground/60 mb-2">Earned</div>
                                <div className="font-bold text-green-500 text-xl">{formatPrivateValue('0.00')}</div>
                              </div>
                            
                            {/* Allocation */}
                            <div className="text-center p-4 bg-foreground/5 rounded-lg relative">
                              <div className="text-sm text-foreground/60 mb-2">Allocation</div>
                              <AllocationDisplay allocations={allocationData} isMobile={true} />
                            </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Deposit/Withdraw Card */}
            <div className="lg:col-span-1">
              <div className="glass-card p-6 sticky top-8">
                <div className="relative flex space-x-1 mb-6 bg-foreground/5 rounded-lg p-1">
                  {/* Sliding background indicator */}
                  <div 
                    className={`absolute top-1 bottom-1 w-[calc(50%-0.125rem)] bg-accent rounded-md shadow-sm transition-transform duration-300 ease-in-out ${
                      selectedAction === 'withdraw' ? 'translate-x-[calc(100%+0.25rem)]' : 'translate-x-0'
                    }`}
                  />
                  
                  <button
                    onClick={() => setSelectedAction('deposit')}
                    className={`relative z-10 flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors duration-300 cursor-pointer ${
                      selectedAction === 'deposit'
                        ? 'text-white'
                        : 'text-foreground/60 hover:text-foreground'
                    }`}
                  >
                    Deposit
                  </button>
                  <button
                    onClick={() => setSelectedAction('withdraw')}
                    className={`relative z-10 flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors duration-300 cursor-pointer ${
                      selectedAction === 'withdraw'
                        ? 'text-white'
                        : 'text-foreground/60 hover:text-foreground'
                    }`}
                  >
                    Withdraw
                  </button>
                </div>

                {selectedAction === 'deposit' ? (
                  <div className="space-y-4 animate-fade-in">
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">Asset</label>
                      <div className="relative" ref={assetDropdownRef}>
                        <button
                          type="button"
                          onClick={() => setIsAssetDropdownOpen(!isAssetDropdownOpen)}
                          className="w-full glass border border-foreground/10 rounded-lg px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-accent/50 flex items-center justify-between cursor-pointer"
                        >
                          <div className="flex items-center space-x-2">
                            <TokenIcon token={selectedAsset} size={20} />
                            <span>{selectedAsset}</span>
                          </div>
                          <svg className="w-4 h-4 text-foreground/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </button>
                        {isAssetDropdownOpen && (
                          <div 
                            className="absolute z-10 w-full mt-1 border border-foreground/10 rounded-lg shadow-lg overflow-hidden" 
                            style={{ 
                              backgroundColor: document.documentElement.classList.contains('dark') ? '#1f2937' : '#bfdbfe'
                            }}
                          >
                            {['USDC', 'WETH'].map(token => (
                              <button
                                key={token}
                                type="button"
                                onClick={() => {
                                  setSelectedAsset(token);
                                  setIsAssetDropdownOpen(false);
                                }}
                                className="w-full px-3 py-2 text-left hover:bg-foreground/5 flex items-center space-x-2 transition-colors cursor-pointer"
                              >
                                <TokenIcon token={token} size={20} />
                                <span>{token}</span>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">Amount</label>
                      <div className="relative">
                        <input
                          type="text"
                          placeholder="0.00"
                          value={amount}
                          onChange={(e) => setAmount(e.target.value)}
                          className="w-full bg-foreground/5 border border-foreground/10 rounded-lg px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-accent/50"
                        />
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
                          {amount && (
                            <span className="text-xs text-foreground/40">
                              ${selectedAsset === 'USDC' 
                                ? (parseFloat(amount) * usdcPrice).toFixed(2)
                                : (parseFloat(amount) * wethPrice).toFixed(2)
                              }
                            </span>
                          )}
                          <button 
                            type="button"
                            onClick={handleMaxClick}
                            className="text-xs text-foreground/60 hover:text-foreground"
                          >
                            MAX
                          </button>
                        </div>
                      </div>
                      <div className="text-xs text-foreground/60 mt-1">
                        Balance: {isLoading ? '...' : isPrivacyMode ? '••••••' : `${selectedAsset === 'USDC' ? usdc : weth} ${selectedAsset}`}
                      </div>
                    </div>

                    <div className="bg-foreground/5 rounded-lg p-3 space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-foreground/60">You will receive</span>
                        <span className="text-foreground">
                          {amount && wethPrice > 0
                            ? (() => {
                                const depositAmount = parseFloat(amount);
                                const depositUSD = selectedAsset === 'USDC' 
                                  ? depositAmount * usdcPrice 
                                  : depositAmount * wethPrice;
                                
                                // If vault is empty, 1 USD = 1 BRIQ
                                if (totalSupply === 0n || totalVaultValue === 0n) {
                                  return depositUSD.toFixed(6);
                                }
                                
                                // Otherwise calculate based on current price per share
                                const totalSupplyEther = Number(totalSupply) / 1e18;
                                const totalVaultValueUSD = Number(totalVaultValue) / 1e18;
                                const pricePerShare = totalVaultValueUSD / totalSupplyEther;
                                const sharesToReceive = depositUSD / pricePerShare;
                                
                                return sharesToReceive.toFixed(6);
                              })()
                            : '0.000000'
                          } BRIQ
                        </span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-foreground/60">Current APY</span>
                        <span className="text-green-600 dark:text-green-500 font-semibold">{selectedAsset === 'USDC' ? usdcAPY : wethAPY}%</span>
                      </div>
                    </div>

                    <button
                      onClick={handleDeposit}
                      disabled={!isConnected || !amount || isPending}
                      className="w-full bg-accent hover:bg-accent/90 hover:scale-105 disabled:bg-foreground/10 disabled:text-foreground/40 disabled:hover:scale-100 text-white font-medium py-3 rounded-lg transition-all duration-200 cursor-pointer disabled:cursor-not-allowed active:scale-95"
                    >
                      {!isConnected ? 'Connect Wallet' : isPending ? 'Processing...' : 'Deposit'}
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4 animate-fade-in">
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">Asset</label>
                      <div className="relative" ref={assetDropdownRef}>
                        <button
                          type="button"
                          onClick={() => setIsAssetDropdownOpen(!isAssetDropdownOpen)}
                          className="w-full glass border border-foreground/10 rounded-lg px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-accent/50 flex items-center justify-between cursor-pointer"
                        >
                          <div className="flex items-center space-x-2">
                            <TokenIcon token={selectedAsset} size={20} />
                            <span>{selectedAsset}</span>
                          </div>
                          <svg className="w-4 h-4 text-foreground/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </button>
                        {isAssetDropdownOpen && (
                          <div 
                            className="absolute z-10 w-full mt-1 border border-foreground/10 rounded-lg shadow-lg overflow-hidden" 
                            style={{ 
                              backgroundColor: document.documentElement.classList.contains('dark') ? '#1f2937' : '#bfdbfe'
                            }}
                          >
                            {['USDC', 'WETH'].map(token => (
                              <button
                                key={token}
                                type="button"
                                onClick={() => {
                                  setSelectedAsset(token);
                                  setIsAssetDropdownOpen(false);
                                }}
                                className="w-full px-3 py-2 text-left hover:bg-foreground/5 flex items-center space-x-2 transition-colors cursor-pointer"
                              >
                                <TokenIcon token={token} size={20} />
                                <span>{token}</span>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">Amount</label>
                      <div className="relative">
                        <input
                          type="text"
                          placeholder="0.00"
                          value={amount}
                          onChange={(e) => setAmount(e.target.value)}
                          className="w-full bg-foreground/5 border border-foreground/10 rounded-lg px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-accent/50"
                        />
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
                          {amount && shareBalance > 0n && (
                            <span className="text-xs text-foreground/40">
                              ${((parseFloat(amount) / (Number(shareBalance) / 1e18)) * userValueUSD).toFixed(2)}
                            </span>
                          )}
                          <button 
                            type="button"
                            onClick={() => setAmount((Number(shareBalance) / 1e18).toString())}
                            className="text-xs text-foreground/60 hover:text-foreground"
                          >
                            MAX
                          </button>
                        </div>
                      </div>
                      <div className="text-xs text-foreground/60 mt-1">
                        Available: {formatPrivateValue((Number(shareBalance) / 1e18).toFixed(4), '', ' BRIQ')}
                      </div>
                      
                      {/* Liquidity Status Indicator */}
                      {amount && (() => {
                        const tokenMarkets = markets?.filter(m => m.tokenSymbol === selectedAsset) || [];
                        const availableLiquidity = tokenMarkets.reduce((sum, m) => sum + m.usdValueFormatted, 0);
                        const sharesToWithdraw = parseFloat(amount);
                        const shareBalanceEther = Number(shareBalance) / 1e18;
                        const tokenValueToWithdraw = shareBalanceEther > 0 
                          ? (sharesToWithdraw / shareBalanceEther) * userValueUSD 
                          : 0;
                        const isAvailable = availableLiquidity > 0 && tokenValueToWithdraw <= availableLiquidity;
                        
                        return (
                          <div className={`flex items-center space-x-1 mt-2 text-xs font-semibold ${isAvailable ? 'text-green-600 dark:text-green-500' : 'text-red-500'}`}>
                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                            </svg>
                            <span>
                              {isAvailable 
                                ? `${selectedAsset} available ($${availableLiquidity.toFixed(2)} liquidity)`
                                : availableLiquidity === 0
                                  ? `${selectedAsset} unavailable ($0.00 liquidity)`
                                  : `Insufficient ${selectedAsset} liquidity ($${availableLiquidity.toFixed(2)} available)`
                              }
                            </span>
                          </div>
                        );
                      })()}
                    </div>

                    <div className="bg-foreground/5 rounded-lg p-3 space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-foreground/60">You receive</span>
                        <span className="text-foreground">
                          ~{amount && shareBalance > 0n && totalMarketValue > 0
                            ? ((parseFloat(amount) / (Number(shareBalance) / 1e18)) * userValueUSD).toFixed(6)
                            : '0.00'
                          } {selectedAsset}
                        </span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-foreground/60">0.5% slippage tolerance</span>
                        <span className="text-foreground/60">
                          ({amount && shareBalance > 0n && totalMarketValue > 0
                            ? (((parseFloat(amount) / (Number(shareBalance) / 1e18)) * userValueUSD) * 0.005).toFixed(6)
                            : '0.00'
                          } {selectedAsset})
                        </span>
                      </div>
                    </div>

                    <button
                      onClick={handleWithdraw}
                      disabled={
                        !isConnected || 
                        !amount || 
                        isPending ||
                        (() => {
                          if (!amount) return false;
                          const tokenMarkets = markets?.filter(m => m.tokenSymbol === selectedAsset) || [];
                          const availableLiquidity = tokenMarkets.reduce((sum, m) => sum + m.usdValueFormatted, 0);
                          const sharesToWithdraw = parseFloat(amount);
                          const shareBalanceEther = Number(shareBalance) / 1e18;
                          const tokenValueToWithdraw = shareBalanceEther > 0 
                            ? (sharesToWithdraw / shareBalanceEther) * userValueUSD 
                            : 0;
                          return tokenValueToWithdraw > availableLiquidity;
                        })()
                      }
                      className="w-full bg-accent hover:bg-accent/90 hover:scale-105 disabled:bg-foreground/10 disabled:text-foreground/40 disabled:hover:scale-100 text-white font-medium py-3 rounded-lg transition-all duration-200 cursor-pointer disabled:cursor-not-allowed active:scale-95"
                    >
                      {!isConnected ? 'Connect Wallet' : isPending ? 'Processing...' : 'Withdraw'}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Transaction History */}
          <div className="mt-8">
            <TransactionHistory ref={transactionHistoryRef} />
          </div>
        </div>
      </div>
    </Layout>
  );
}
