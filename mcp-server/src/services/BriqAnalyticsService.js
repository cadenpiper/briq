import { ViemClient } from '../clients/ViemClient.js';
import { AnalyticsFormatter } from '../formatters/AnalyticsFormatter.js';

/**
 * Service for Briq protocol analytics and contract interactions
 */
export class BriqAnalyticsService {
  constructor() {
    this.viemClient = new ViemClient();
    this.formatter = new AnalyticsFormatter();
  }

  /**
   * Get Briq protocol TVL from deployed contracts
   */
  async getBriqTVL() {
    try {
      const totalUsdValue = await this.viemClient.getTotalVaultValueInUSD();
      const tvlUSD = parseFloat(this.viemClient.formatUnits(totalUsdValue, 18));

      return {
        tvl: tvlUSD,
        totalUsdValue: totalUsdValue.toString(),
        vaultAddress: this.viemClient.getVaultAddress(),
        timestamp: Date.now()
      };
    } catch (error) {
      console.error('Error fetching Briq TVL:', error);
      throw error;
    }
  }

  /**
   * Get market allocations (token distribution across strategies)
   */
  async getMarketAllocations() {
    try {
      const supportedTokens = await this.viemClient.getSupportedTokens();
      const markets = [];
      
      for (const tokenAddress of supportedTokens) {
        const balance = await this.viemClient.getStrategyBalance(tokenAddress);
        const usdValue = balance > 0n ? await this.viemClient.getTokenValueInUSD(tokenAddress, balance) : 0n;
        const apyBasisPoints = await this.viemClient.getStrategyAPY(tokenAddress);

        const tokenInfo = this.viemClient.getTokenInfo(tokenAddress);
        
        markets.push({
          tokenAddress,
          tokenSymbol: tokenInfo.symbol,
          strategyName: tokenInfo.strategyName,
          balance: parseFloat(this.viemClient.formatUnits(balance, tokenInfo.decimals)),
          usdValue: parseFloat(this.viemClient.formatUnits(usdValue, 18)),
          apy: Number(apyBasisPoints) / 100
        });
      }

      return { markets, timestamp: Date.now() };
    } catch (error) {
      console.error('Error fetching market allocations:', error);
      throw error;
    }
  }

  /**
   * Get strategy rewards (Aave and Compound)
   */
  async getStrategyRewards(strategy = 'both') {
    try {
      const results = {
        aave: { tokens: [], totalUSD: 0 },
        compound: { tokens: [], totalUSD: 0 },
        totalRewardsUSD: 0
      };

      if (strategy === 'aave' || strategy === 'both') {
        try {
          const aaveRewards = await this.viemClient.getAaveRewards();
          results.aave = aaveRewards;
        } catch (error) {
          console.error('Error fetching Aave rewards:', error);
        }
      }

      if (strategy === 'compound' || strategy === 'both') {
        try {
          const compoundRewards = await this.viemClient.getCompoundRewards();
          results.compound = compoundRewards;
        } catch (error) {
          console.error('Error fetching Compound rewards:', error);
        }
      }

      results.totalRewardsUSD = results.aave.totalUSD + results.compound.totalUSD;
      
      return { ...results, timestamp: Date.now() };
    } catch (error) {
      console.error('Error fetching strategy rewards:', error);
      throw error;
    }
  }

  /**
   * Get comprehensive Briq analytics
   */
  async getBriqAnalytics() {
    try {
      const tvlData = await this.getBriqTVL();
      const marketData = await this.getMarketAllocations();
      
      // Calculate weighted average APY from market data
      const totalMarketValue = marketData.markets.reduce((sum, market) => sum + market.usdValue, 0);
      const weightedAverageAPY = totalMarketValue > 0 
        ? marketData.markets.reduce((sum, market) => {
            const weight = market.usdValue / totalMarketValue;
            return sum + (market.apy * weight);
          }, 0)
        : 0;

      // Get strategy rewards
      let rewardsData = { totalRewardsUSD: 0, aave: { totalUSD: 0 }, compound: { totalUSD: 0 } };
      try {
        rewardsData = await this.getStrategyRewards('both');
      } catch (error) {
        console.error('Error fetching rewards for analytics:', error);
      }

      return {
        tvl: tvlData.tvl,
        weightedAverageAPY,
        totalRewards: rewardsData.totalRewardsUSD,
        marketAllocations: marketData.markets,
        aaveRewards: rewardsData.aave,
        compoundRewards: rewardsData.compound,
        timestamp: Date.now()
      };
    } catch (error) {
      console.error('Error fetching Briq analytics:', error);
      throw error;
    }
  }

  /**
   * Handle Briq analytics request - returns formatted response for natural conversation
   */
  async handleGetBriqAnalytics() {
    try {
      const data = await this.getBriqAnalytics();
      return this.formatter.formatAnalytics(data);
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `Error fetching Briq analytics: ${error.message}`
          }
        ],
        isError: true
      };
    }
  }
}
