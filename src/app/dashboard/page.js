"use client";

import { useState } from 'react';
import { useAccount } from 'wagmi';
import Layout from '../components/Layout';
import AnimatedBackground from '../components/AnimatedBackground';

export default function Dashboard() {
  const { address, isConnected } = useAccount();
  const [selectedAction, setSelectedAction] = useState('deposit');

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
              <div className="text-2xl font-bold text-foreground">$0.00</div>
              <div className="text-xs text-green-500 mt-1">+0.00%</div>
            </div>
            <div className="glass-card p-6">
              <div className="text-sm text-foreground/60 mb-1">Total Supplied</div>
              <div className="text-2xl font-bold text-foreground">$0.00</div>
            </div>
            <div className="glass-card p-6">
              <div className="text-sm text-foreground/60 mb-1">Total Earned</div>
              <div className="text-2xl font-bold text-green-500">$0.00</div>
            </div>
            <div className="glass-card p-6">
              <div className="text-sm text-foreground/60 mb-1">APY</div>
              <div className="text-2xl font-bold text-accent">0.00%</div>
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
                ) : (
                  <div className="text-center py-12 border-2 border-dashed border-foreground/10 rounded-lg">
                    <p className="text-foreground/60">No active positions</p>
                    <p className="text-sm text-foreground/40 mt-1">Start by making your first deposit</p>
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
                      <select className="w-full bg-foreground/5 border border-foreground/10 rounded-lg px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-accent/50">
                        <option>USDC</option>
                        <option>WETH</option>
                      </select>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">Amount</label>
                      <div className="relative">
                        <input
                          type="text"
                          placeholder="0.00"
                          className="w-full bg-foreground/5 border border-foreground/10 rounded-lg px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-accent/50"
                        />
                        <button className="absolute right-2 top-2 text-xs text-accent hover:text-accent/80">
                          MAX
                        </button>
                      </div>
                      <div className="text-xs text-foreground/60 mt-1">Balance: 0.00 USDC</div>
                    </div>

                    <div className="bg-foreground/5 rounded-lg p-3 space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-foreground/60">Current APY</span>
                        <span className="text-green-500 font-medium">5.24%</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-foreground/60">You will receive</span>
                        <span className="text-foreground">0.00 BRIQ</span>
                      </div>
                    </div>

                    <button
                      disabled={!isConnected}
                      className="w-full bg-accent hover:bg-accent/90 disabled:bg-foreground/10 disabled:text-foreground/40 text-white font-medium py-3 rounded-lg transition-colors"
                    >
                      {!isConnected ? 'Connect Wallet' : 'Deposit'}
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">Asset</label>
                      <select className="w-full bg-foreground/5 border border-foreground/10 rounded-lg px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-accent/50">
                        <option>USDC</option>
                        <option>WETH</option>
                      </select>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">Amount</label>
                      <div className="relative">
                        <input
                          type="text"
                          placeholder="0.00"
                          className="w-full bg-foreground/5 border border-foreground/10 rounded-lg px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-accent/50"
                        />
                        <button className="absolute right-2 top-2 text-xs text-accent hover:text-accent/80">
                          MAX
                        </button>
                      </div>
                      <div className="text-xs text-foreground/60 mt-1">Available: 0.00 BRIQ</div>
                    </div>

                    <div className="bg-foreground/5 rounded-lg p-3 space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-foreground/60">You will receive</span>
                        <span className="text-foreground">0.00 USDC</span>
                      </div>
                    </div>

                    <button
                      disabled={!isConnected}
                      className="w-full bg-red-500 hover:bg-red-600 disabled:bg-foreground/10 disabled:text-foreground/40 text-white font-medium py-3 rounded-lg transition-colors"
                    >
                      {!isConnected ? 'Connect Wallet' : 'Withdraw'}
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
