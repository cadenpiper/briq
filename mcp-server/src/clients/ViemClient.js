import { createPublicClient, http, formatUnits } from 'viem';
import { localhost } from 'viem/chains';
import { getContractAddresses } from '../../../src/app/utils/forkAddresses.js';
import { readFileSync } from 'fs';
import path from 'path';

// Load ABI from JSON files
const loadABI = (filename) => {
  const filePath = path.join(process.cwd(), '..', 'src', 'app', 'abis', filename);
  return JSON.parse(readFileSync(filePath, 'utf8')).abi;
};

/**
 * Client for blockchain contract interactions using Viem
 */
export class ViemClient {
  constructor() {
    // Viem client for Briq contract interactions (same as frontend)
    this.client = createPublicClient({
      chain: localhost,
      transport: http('http://localhost:8545')
    });

    // Import Briq contract addresses from frontend (same source of truth)
    this.contracts = getContractAddresses();

    // Load ABIs from JSON files (same as frontend)
    this.abis = {
      vault: loadABI('BriqVault.json'),
      strategyCoordinator: loadABI('StrategyCoordinator.json'),
      priceFeedManager: loadABI('PriceFeedManager.json'),
      strategyAave: loadABI('StrategyAave.json'),
      strategyCompound: loadABI('StrategyCompoundComet.json')
    };
  }

  /**
   * Format units helper
   */
  formatUnits(value, decimals) {
    return formatUnits(value, decimals);
  }

  /**
   * Get vault address
   */
  getVaultAddress() {
    return this.contracts.VAULT;
  }

  /**
   * Get total vault value in USD
   */
  async getTotalVaultValueInUSD() {
    return await this.client.readContract({
      address: this.contracts.VAULT,
      abi: this.abis.vault,
      functionName: 'getTotalVaultValueInUSD'
    });
  }

  /**
   * Get supported tokens
   */
  async getSupportedTokens() {
    return await this.client.readContract({
      address: this.contracts.VAULT,
      abi: this.abis.vault,
      functionName: 'getSupportedTokens'
    });
  }

  /**
   * Get strategy balance for a token
   */
  async getStrategyBalance(tokenAddress) {
    return await this.client.readContract({
      address: this.contracts.STRATEGY_COORDINATOR,
      abi: this.abis.strategyCoordinator,
      functionName: 'getStrategyBalance',
      args: [tokenAddress]
    });
  }

  /**
   * Get token value in USD
   */
  async getTokenValueInUSD(tokenAddress, balance) {
    return await this.client.readContract({
      address: this.contracts.PRICE_FEED_MANAGER,
      abi: this.abis.priceFeedManager,
      functionName: 'getTokenValueInUSD',
      args: [tokenAddress, balance]
    });
  }

  /**
   * Get strategy APY
   */
  async getStrategyAPY(tokenAddress) {
    return await this.client.readContract({
      address: this.contracts.STRATEGY_COORDINATOR,
      abi: this.abis.strategyCoordinator,
      functionName: 'getStrategyAPY',
      args: [tokenAddress]
    });
  }

  /**
   * Get token info (symbol, decimals, strategy name)
   */
  getTokenInfo(tokenAddress) {
    const isUSDC = tokenAddress.toLowerCase() === this.contracts.USDC?.toLowerCase();
    const isWETH = tokenAddress.toLowerCase() === this.contracts.WETH?.toLowerCase();
    
    if (isUSDC) {
      return { symbol: 'USDC', decimals: 6, strategyName: 'Aave' };
    } else if (isWETH) {
      return { symbol: 'WETH', decimals: 18, strategyName: 'Compound' };
    }
    
    return { symbol: 'UNKNOWN', decimals: 18, strategyName: 'Unknown' };
  }

  /**
   * Get Aave strategy rewards
   */
  async getAaveRewards() {
    try {
      const [supportedTokens, analyticsArray] = await this.client.readContract({
        address: this.contracts.STRATEGY_AAVE,
        abi: this.abis.strategyAave,
        functionName: 'getAllTokenAnalytics'
      });

      const tokens = [];
      let totalUSD = 0;

      for (let i = 0; i < supportedTokens.length; i++) {
        const tokenAddress = supportedTokens[i];
        const analytics = analyticsArray[i];
        
        const [
          currentBalance,
          totalDeposits,
          totalWithdrawals,
          netDeposits,
          accruedRewards,
          currentAPY
        ] = analytics;

        const tokenInfo = this.getTokenInfo(tokenAddress);
        const rewardsFormatted = parseFloat(formatUnits(accruedRewards, tokenInfo.decimals));
        const currentBalanceFormatted = parseFloat(formatUnits(currentBalance, tokenInfo.decimals));
        
        let rewardsUSD = 0;
        if (accruedRewards > 0n) {
          try {
            const rewardsUSDRaw = await this.getTokenValueInUSD(tokenAddress, accruedRewards);
            rewardsUSD = parseFloat(formatUnits(rewardsUSDRaw, 18));
          } catch (error) {
            console.error('Error getting USD value for Aave rewards:', error);
          }
        }

        const tokenData = {
          tokenSymbol: tokenInfo.symbol,
          currentBalance: currentBalanceFormatted,
          accruedRewards: rewardsFormatted,
          rewardsUSD,
          currentAPY: Number(currentAPY) / 100
        };

        tokens.push(tokenData);
        totalUSD += rewardsUSD;
      }

      return { tokens, totalUSD };
    } catch (error) {
      console.error('Error fetching Aave rewards:', error);
      throw error;
    }
  }

  /**
   * Get Compound strategy rewards
   */
  async getCompoundRewards() {
    try {
      const [supportedTokens, analyticsArray] = await this.client.readContract({
        address: this.contracts.STRATEGY_COMPOUND,
        abi: this.abis.strategyCompound,
        functionName: 'getAllTokenAnalytics'
      });

      const tokens = [];
      let totalUSD = 0;

      for (let i = 0; i < supportedTokens.length; i++) {
        const tokenAddress = supportedTokens[i];
        const analytics = analyticsArray[i];
        
        const [
          currentBalance,
          totalDeposits,
          totalWithdrawals,
          netDeposits,
          interestRewards,
          protocolRewards,
          currentAPY
        ] = analytics;

        const tokenInfo = this.getTokenInfo(tokenAddress);
        const interestRewardsFormatted = parseFloat(formatUnits(interestRewards, tokenInfo.decimals));
        const protocolRewardsFormatted = parseFloat(formatUnits(protocolRewards, 18)); // COMP has 18 decimals
        const currentBalanceFormatted = parseFloat(formatUnits(currentBalance, tokenInfo.decimals));
        
        let interestRewardsUSD = 0;
        if (interestRewards > 0n) {
          try {
            const rewardsUSDRaw = await this.getTokenValueInUSD(tokenAddress, interestRewards);
            interestRewardsUSD = parseFloat(formatUnits(rewardsUSDRaw, 18));
          } catch (error) {
            console.error('Error getting USD value for Compound rewards:', error);
          }
        }

        const tokenData = {
          tokenSymbol: tokenInfo.symbol,
          currentBalance: currentBalanceFormatted,
          interestRewards: interestRewardsFormatted,
          protocolRewards: protocolRewardsFormatted,
          interestRewardsUSD,
          currentAPY: Number(currentAPY) / 100
        };

        tokens.push(tokenData);
        totalUSD += interestRewardsUSD;
      }

      return { tokens, totalUSD };
    } catch (error) {
      console.error('Error fetching Compound rewards:', error);
      throw error;
    }
  }
}
