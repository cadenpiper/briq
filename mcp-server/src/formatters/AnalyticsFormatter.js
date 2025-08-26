/**
 * Formatter for Briq analytics data with natural language responses
 */
export class AnalyticsFormatter {
  /**
   * Format TVL data
   */
  formatTVL(data) {
    const tvlText = `Briq Protocol TVL:

Total Value Locked: $${data.tvl.toLocaleString('en-US', { 
  minimumFractionDigits: 2, 
  maximumFractionDigits: 2 
})}

Contract: ${data.vaultAddress}
Raw Value: ${data.totalUsdValue} wei
Last Updated: ${new Date(data.timestamp).toLocaleString()}

Data source: BriqVault contract on forked network`;

    return {
      content: [
        {
          type: 'text',
          text: tvlText
        }
      ]
    };
  }

  /**
   * Format comprehensive analytics data
   */
  formatAnalytics(data) {
    const analyticsText = `Briq Protocol Analytics:

OVERVIEW
Total Value Locked: $${data.tvl.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
Weighted Average APY: ${data.weightedAverageAPY.toFixed(2)}%
Total Rewards Earned: $${data.totalRewards.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}

MARKET ALLOCATIONS
${data.marketAllocations.map(market => {
  const totalValue = data.marketAllocations.reduce((sum, m) => sum + m.usdValue, 0);
  const allocation = totalValue > 0 ? (market.usdValue / totalValue * 100) : 0;
  return `• ${market.tokenSymbol} via ${market.strategyName}: $${market.usdValue.toFixed(2)} (${allocation.toFixed(1)}%) - ${market.apy.toFixed(2)}% APY`;
}).join('\n')}

STRATEGY REWARDS
Aave Strategy: $${data.aaveRewards.totalUSD.toFixed(2)} USD
${data.aaveRewards.tokens.map(token => 
  `  • ${token.tokenSymbol}: ${token.accruedRewards.toFixed(6)} tokens ($${token.rewardsUSD.toFixed(2)})`
).join('\n')}

Compound Strategy: $${data.compoundRewards.totalUSD.toFixed(2)} USD
${data.compoundRewards.tokens.map(token => 
  `  • ${token.tokenSymbol}: ${token.interestRewards.toFixed(6)} tokens + ${token.protocolRewards.toFixed(6)} COMP`
).join('\n')}

Last Updated: ${new Date(data.timestamp).toLocaleString()}
Data Source: Live contract data from forked network`;

    return {
      content: [
        {
          type: 'text',
          text: analyticsText
        }
      ]
    };
  }

  /**
   * Format market allocations data
   */
  formatMarketAllocations(data) {
    const totalValue = data.markets.reduce((sum, market) => sum + market.usdValue, 0);
    
    const allocationsText = `Briq Market Allocations:

Total Portfolio Value: $${totalValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}

${data.markets.map(market => {
  const allocation = totalValue > 0 ? (market.usdValue / totalValue * 100) : 0;
  return `${market.tokenSymbol} Strategy (${market.strategyName})
  Balance: ${market.balance.toFixed(4)} ${market.tokenSymbol}
  USD Value: $${market.usdValue.toFixed(2)}
  Allocation: ${allocation.toFixed(1)}%
  Current APY: ${market.apy.toFixed(2)}%`;
}).join('\n\n')}

Last Updated: ${new Date(data.timestamp).toLocaleString()}`;

    return {
      content: [
        {
          type: 'text',
          text: allocationsText
        }
      ]
    };
  }

  /**
   * Format strategy rewards data
   */
  formatStrategyRewards(data, strategy) {
    let rewardsText = `Strategy Rewards Summary:\n\n`;
    
    if (strategy === 'aave' || strategy === 'both') {
      rewardsText += `🔵 AAVE STRATEGY REWARDS
Total: $${data.aave.totalUSD.toFixed(2)} USD

${data.aave.tokens.map(token => `${token.tokenSymbol} Rewards:
  • Current Balance: ${token.currentBalance.toFixed(4)} ${token.tokenSymbol}
  • Accrued Interest: ${token.accruedRewards.toFixed(6)} ${token.tokenSymbol}
  • USD Value: $${token.rewardsUSD.toFixed(2)}
  • Current APY: ${token.currentAPY.toFixed(2)}%`).join('\n\n')}`;
    }
    
    if (strategy === 'compound' || strategy === 'both') {
      if (strategy === 'both') rewardsText += '\n\n';
      rewardsText += `🟢 COMPOUND STRATEGY REWARDS
Total: $${data.compound.totalUSD.toFixed(2)} USD

${data.compound.tokens.map(token => {
  // Format COMP rewards with appropriate precision
  const compFormatted = token.protocolRewards < 0.000001 && token.protocolRewards > 0 
    ? token.protocolRewards.toExponential(2) 
    : token.protocolRewards.toFixed(8);
    
  return `${token.tokenSymbol} Rewards:
  • Current Balance: ${token.currentBalance.toFixed(4)} ${token.tokenSymbol}
  • Interest Rewards: ${token.interestRewards.toFixed(6)} ${token.tokenSymbol}
  • Protocol Rewards: ${compFormatted} COMP
  • USD Value: $${token.interestRewardsUSD.toFixed(2)}
  • Current APY: ${token.currentAPY.toFixed(2)}%`;
}).join('\n\n')}`;
    }
    
    if (strategy === 'both') {
      rewardsText += `\n\nTOTAL REWARDS: $${data.totalRewardsUSD.toFixed(2)} USD`;
    }
    
    rewardsText += `\n\nLast Updated: ${new Date(data.timestamp).toLocaleString()}`;

    return {
      content: [
        {
          type: 'text',
          text: rewardsText
        }
      ]
    };
  }
}
