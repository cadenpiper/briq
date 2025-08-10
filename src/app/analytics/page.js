'use client'

import { formatUnits } from 'viem';
import { getContractAddresses } from '../utils/forkAddresses';
import { usePublicContract } from '../hooks/usePublicContract';
import BriqVaultArtifact from '../abis/BriqVault.json';
import Header from '../components/Header';
import Footer from '../components/Footer';

// Extract ABI from artifact
const BriqVaultABI = BriqVaultArtifact.abi;

export default function Analytics() {
  // Get contract addresses from fork deployment
  const CONTRACTS = getContractAddresses();

  // Get TVL using custom public hook - no wallet needed
  const { data: totalVaultValueRaw, isLoading, error } = usePublicContract({
    address: CONTRACTS.VAULT,
    abi: BriqVaultABI,
    functionName: 'getTotalVaultValueInUSD',
    refetchInterval: 30000,
    enabled: !!CONTRACTS.VAULT
  });

  // Format the TVL value with abbreviations
  const tvl = (() => {
    if (isLoading) return '$--.--';
    if (error) return 'Contract Error';
    if (totalVaultValueRaw !== null) {
      const value = parseFloat(formatUnits(totalVaultValueRaw, 18));
      
      if (value >= 1000000) {
        return `$${(value / 1000000).toFixed(2)}M`;
      } else if (value >= 1000) {
        return `$${(value / 1000).toFixed(2)}K`;
      } else {
        return value.toLocaleString('en-US', {
          style: 'currency',
          currency: 'USD',
          minimumFractionDigits: 2,
          maximumFractionDigits: 2
        });
      }
    }
    return '$0.00';
  })();

  return (
    <>
      <Header />
      <div className="min-h-screen bg-cream-100 dark:bg-zen-900 transition-colors duration-300">
        <div className="container mx-auto px-4 py-8">
          {/* Page Header */}
          <div className="mb-8">
            <h1 className="text-4xl font-bold text-zen-900 dark:text-cream-100 mb-2">
              Analytics
            </h1>
            <p className="text-zen-600 dark:text-cream-400 text-lg">
              Protocol insights and performance metrics
            </p>
          </div>

          {/* TVL Card - Top Left */}
          <div className="w-fit">
            <div className="bg-cream-50 dark:bg-zen-800 rounded-lg p-6 border border-zen-300 dark:border-zen-600 shadow-sm">
              <div className="flex flex-col">
                <h2 className="text-lg font-semibold text-zen-600 dark:text-cream-400 mb-3">
                  TVL
                </h2>
                <div className="text-4xl font-bold text-zen-900 dark:text-cream-100 font-jetbrains-mono">
                  {tvl}
                </div>
                <div className="text-xs text-zen-500 dark:text-cream-500 mt-2">
                  Total Value Locked
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </>
  );
}
