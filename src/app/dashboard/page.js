"use client";

import { useState, useEffect, useRef } from 'react';
import { useAccount } from 'wagmi';
import toast, { Toaster } from 'react-hot-toast';
import Layout from '../components/Layout';
import { TokenIcon } from '../components/icons';
import { useTokenBalances } from '../hooks/useTokenBalances';
import { useVaultOperations } from '../hooks/useVaultOperations';
import { useVaultPosition } from '../hooks/useVaultPosition';
import { useContractMarketData } from '../hooks/useContractMarketData';
import { useTokenPrices } from '../hooks/useTokenPrices';
import { getContractAddresses } from '../utils/forkAddresses';
import BriqVaultArtifact from '../abis/BriqVault.json';
import StrategyCoordinatorArtifact from '../abis/StrategyCoordinator.json';
import PriceFeedManagerArtifact from '../abis/PriceFeedManager.json';
import StrategyAaveArtifact from '../abis/StrategyAave.json';
import StrategyCompoundArtifact from '../abis/StrategyCompoundComet.json';

export default function Dashboard() {
  const { address, isConnected } = useAccount();
  const [selectedAction, setSelectedAction] = useState('deposit');
  const [selectedAsset, setSelectedAsset] = useState('USDC');
  const [amount, setAmount] = useState('');
  const [isAssetDropdownOpen, setIsAssetDropdownOpen] = useState(false);
  const assetDropdownRef = useRef(null);
  const { usdc, weth, isLoading } = useTokenBalances();
  const { deposit, withdraw, isPending } = useVaultOperations();
  const { userValueUSD, hasPosition, shareBalance, totalSupply, totalVaultValue } = useVaultPosition();
  const { wethPrice, usdcPrice } = useTokenPrices();
  
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
  const { markets } = useContractMarketData({
    contracts: CONTRACTS,
    vaultAbi: BriqVaultArtifact.abi,
    coordinatorAbi: StrategyCoordinatorArtifact.abi,
    priceFeedAbi: PriceFeedManagerArtifact.abi,
    strategyAaveAbi: StrategyAaveArtifact.abi,
    strategyCompoundAbi: StrategyCompoundArtifact.abi
  });

  // Calculate APYs from market data
  const usdcMarkets = markets?.filter(m => m.tokenSymbol === 'USDC') || [];
  const wethMarkets = markets?.filter(m => m.tokenSymbol === 'WETH') || [];
  
  const usdcAPY = usdcMarkets.length > 0 
    ? Math.max(...usdcMarkets.map(m => parseFloat(m.apyFormatted))).toFixed(2)
    : '0.00';
  const wethAPY = wethMarkets.length > 0 
    ? Math.max(...wethMarkets.map(m => parseFloat(m.apyFormatted))).toFixed(2)
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
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-foreground mb-2">Dashboard</h1>
            <p className="text-foreground/60">Manage your DeFi positions and earn optimized yields</p>
          </div>

          {/* Portfolio Overview */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="glass-card p-6">
              <div className="text-sm text-foreground/60 mb-1">Net Worth</div>
              <div className="text-2xl font-bold text-foreground">${(userValueUSD || 0).toFixed(2)}</div>
              <div className="text-xs text-green-500 mt-1">+0.00%</div>
            </div>
            <div className="glass-card p-6">
              <div className="text-sm text-foreground/60 mb-1">Total Supplied</div>
              <div className="text-2xl font-bold text-foreground">${(userValueUSD || 0).toFixed(2)}</div>
            </div>
            <div className="glass-card p-6">
              <div className="text-sm text-foreground/60 mb-1">Total Earned</div>
              <div className="text-2xl font-bold text-green-500">$0.00</div>
            </div>
            <div className="glass-card p-6">
              <div className="text-sm text-foreground/60 mb-1">Average APY</div>
              <div className="text-2xl font-bold text-accent">{averageAPY}%</div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* Current Positions */}
            <div className="lg:col-span-2">
              <div className="glass-card p-6">
                <h2 className="text-xl font-semibold text-foreground mb-6">Your Positions</h2>
                
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
                    {/* Column Headers */}
                    <div className="grid grid-cols-5 gap-4 px-4 pb-2 border-b border-foreground/10 text-xs font-medium text-foreground/60">
                      <div>Strategy</div>
                      <div className="text-center">Position</div>
                      <div className="text-center">APY</div>
                      <div className="text-center">Allocation</div>
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
                      
                      const allocationText = tokenMarkets.map(m => {
                        const pct = (m.usdValueFormatted / totalTokenValue * 100).toFixed(0);
                        return `${m.strategyName} ${pct}%`;
                      }).join(', ');
                      
                      return (
                        <div key={token} className="grid grid-cols-5 gap-4 px-4 py-3 border border-foreground/10 rounded-lg items-center">
                          <div className="flex items-center space-x-2">
                            <TokenIcon token={token} size={24} />
                            <span className="font-medium text-foreground text-sm">{token}</span>
                          </div>
                          <div className="text-center font-semibold text-foreground">${userTokenValue.toFixed(2)}</div>
                          <div className="text-center font-semibold text-green-500">{tokenAPY}%</div>
                          <div className="text-center text-sm text-foreground/60">{allocationText}</div>
                          <div className="text-center font-semibold text-green-500">$0.00</div>
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
                    className={`relative z-10 flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors duration-300 ${
                      selectedAction === 'deposit'
                        ? 'text-white'
                        : 'text-foreground/60 hover:text-foreground'
                    }`}
                  >
                    Deposit
                  </button>
                  <button
                    onClick={() => setSelectedAction('withdraw')}
                    className={`relative z-10 flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors duration-300 ${
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
                          className="w-full glass border border-foreground/10 rounded-lg px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-accent/50 flex items-center justify-between"
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
                          <div className="absolute z-10 w-full mt-1 bg-background border border-foreground/10 rounded-lg shadow-lg overflow-hidden">
                            {['USDC', 'WETH'].map(token => (
                              <button
                                key={token}
                                type="button"
                                onClick={() => {
                                  setSelectedAsset(token);
                                  setIsAssetDropdownOpen(false);
                                }}
                                className="w-full px-3 py-2 text-left hover:bg-foreground/5 flex items-center space-x-2 transition-colors"
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
                        <button 
                          type="button"
                          onClick={handleMaxClick}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-foreground/60 hover:text-foreground"
                        >
                          MAX
                        </button>
                      </div>
                      <div className="text-xs text-foreground/60 mt-1">
                        Balance: {isLoading ? '...' : selectedAsset === 'USDC' ? usdc : weth} {selectedAsset}
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
                        <span className="text-green-500">{selectedAsset === 'USDC' ? usdcAPY : wethAPY}%</span>
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
                          className="w-full glass border border-foreground/10 rounded-lg px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-accent/50 flex items-center justify-between"
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
                          <div className="absolute z-10 w-full mt-1 bg-background border border-foreground/10 rounded-lg shadow-lg overflow-hidden">
                            {['USDC', 'WETH'].map(token => (
                              <button
                                key={token}
                                type="button"
                                onClick={() => {
                                  setSelectedAsset(token);
                                  setIsAssetDropdownOpen(false);
                                }}
                                className="w-full px-3 py-2 text-left hover:bg-foreground/5 flex items-center space-x-2 transition-colors"
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
                        <button 
                          type="button"
                          onClick={() => setAmount((Number(shareBalance) / 1e18).toString())}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-foreground/60 hover:text-foreground"
                        >
                          MAX
                        </button>
                      </div>
                      <div className="text-xs text-foreground/60 mt-1">
                        Available: {(Number(shareBalance) / 1e18).toFixed(4)} BRIQ
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
                        const isAvailable = tokenValueToWithdraw <= availableLiquidity;
                        
                        return (
                          <div className={`flex items-center space-x-1 mt-2 text-xs ${isAvailable ? 'text-green-500' : 'text-red-500'}`}>
                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                            </svg>
                            <span>
                              {isAvailable 
                                ? `${selectedAsset} available ($${availableLiquidity.toFixed(2)} liquidity)`
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
        </div>
      </div>
    </Layout>
  );
}
