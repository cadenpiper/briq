"use client";

import { useState } from 'react';
import { useAccount } from 'wagmi';
import Layout from '../components/Layout';
import AnimatedBackground from '../components/AnimatedBackground';
import { useTokenBalances } from '../hooks/useTokenBalances';
import { useVaultOperations } from '../hooks/useVaultOperations';
import { useVaultPosition } from '../hooks/useVaultPosition';
import { useContractMarketData } from '../hooks/useContractMarketData';
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
  const { usdc, weth, isLoading } = useTokenBalances();
  const { deposit, withdraw, isPending } = useVaultOperations();
  const { userValueUSD, hasPosition, shareBalance } = useVaultPosition();
  
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
      setAmount('');
    } catch (error) {
      console.error('Deposit failed:', error);
    }
  };

  const handleWithdraw = async () => {
    if (!amount || !isConnected) return;
    try {
      await withdraw(selectedAsset, amount);
      setAmount('');
    } catch (error) {
      console.error('Withdraw failed:', error);
    }
  };

  const handleMaxClick = () => {
    const balance = selectedAsset === 'USDC' ? usdc : weth;
    setAmount(balance.replace(/,/g, ''));
  };

  return (
    <Layout>
      <AnimatedBackground />
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
              <div className="text-sm text-foreground/60 mb-1">APY</div>
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
                  <div className="space-y-4">
                    <div className="border border-foreground/10 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 rounded-full bg-accent/20 flex items-center justify-center">
                            <span className="text-accent font-bold">B</span>
                          </div>
                          <div>
                            <div className="font-semibold text-foreground">Briq Vault</div>
                            <div className="text-sm text-foreground/60">Optimized Yield</div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-lg font-bold text-foreground">${(userValueUSD || 0).toFixed(2)}</div>
                          <div className="text-sm text-green-500">+{averageAPY}% APY</div>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4 pt-3 border-t border-foreground/10">
                        <div>
                          <div className="text-xs text-foreground/60">Shares</div>
                          <div className="text-sm font-medium text-foreground">
                            {(Number(shareBalance) / 1e18).toFixed(4)} BRIQ
                          </div>
                        </div>
                        <div>
                          <div className="text-xs text-foreground/60">Strategy</div>
                          <div className="text-sm font-medium text-foreground">Multi-Protocol</div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Deposit/Withdraw Card */}
            <div className="lg:col-span-1">
              <div className="glass-card p-6 sticky top-8">
                <div className="flex space-x-1 mb-6 bg-foreground/5 rounded-lg p-1">
                  <button
                    onClick={() => setSelectedAction('deposit')}
                    className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all ${
                      selectedAction === 'deposit'
                        ? 'bg-accent text-white shadow-sm'
                        : 'text-foreground/60 hover:text-foreground'
                    }`}
                  >
                    Deposit
                  </button>
                  <button
                    onClick={() => setSelectedAction('withdraw')}
                    className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all ${
                      selectedAction === 'withdraw'
                        ? 'bg-accent text-white shadow-sm'
                        : 'text-foreground/60 hover:text-foreground'
                    }`}
                  >
                    Withdraw
                  </button>
                </div>

                {selectedAction === 'deposit' ? (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">Asset</label>
                      <select 
                        value={selectedAsset}
                        onChange={(e) => setSelectedAsset(e.target.value)}
                        className="w-full bg-foreground/5 border border-foreground/10 rounded-lg px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-accent/50"
                      >
                        <option value="USDC">USDC</option>
                        <option value="WETH">WETH</option>
                      </select>
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
                        <span className="text-foreground/60">Current APY</span>
                        <span className="text-green-500 font-medium">{selectedAsset === 'USDC' ? usdcAPY : wethAPY}%</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-foreground/60">You will receive</span>
                        <span className="text-foreground">0.00 BRIQ</span>
                      </div>
                    </div>

                    <button
                      onClick={handleDeposit}
                      disabled={!isConnected || !amount || isPending}
                      className="w-full bg-accent hover:bg-accent/90 disabled:bg-foreground/10 disabled:text-foreground/40 text-white font-medium py-3 rounded-lg transition-colors"
                    >
                      {!isConnected ? 'Connect Wallet' : isPending ? 'Processing...' : 'Deposit'}
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">Asset</label>
                      <select 
                        value={selectedAsset}
                        onChange={(e) => setSelectedAsset(e.target.value)}
                        className="w-full bg-foreground/5 border border-foreground/10 rounded-lg px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-accent/50"
                      >
                        <option value="USDC">USDC</option>
                        <option value="WETH">WETH</option>
                      </select>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">BRIQ Shares</label>
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
                      disabled={!isConnected || !amount || isPending}
                      className="w-full bg-red-500 hover:bg-red-600 disabled:bg-foreground/10 disabled:text-foreground/40 text-white font-medium py-3 rounded-lg transition-colors"
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
