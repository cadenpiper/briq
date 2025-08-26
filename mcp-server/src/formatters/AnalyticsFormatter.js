/**
 * Formatter for Briq analytics data with professional, conversational responses
 */
export class AnalyticsFormatter {
  /**
   * Format TVL data with professional tone
   */
  formatTVL(data) {
    const tvl = data.tvl.toLocaleString('en-US', { 
      minimumFractionDigits: 2, 
      maximumFractionDigits: 2 
    });

    let response = `The Briq protocol currently has $${tvl} in Total Value Locked. `;
    
    if (data.tvl > 50000) {
      response += `This represents a healthy amount of capital being actively deployed across our yield optimization strategies.`;
    } else if (data.tvl > 10000) {
      response += `We're building solid momentum with meaningful capital deployment across our strategies.`;
    } else {
      response += `While we're in the early stages, the protocol is actively managing funds across multiple DeFi strategies.`;
    }

    response += `\n\nThis data comes directly from our deployed vault contract and reflects real-time on-chain activity.`;

    return {
      content: [
        {
          type: 'text',
          text: response
        }
      ]
    };
  }

  /**
   * Format comprehensive analytics with professional tone
   */
  formatAnalytics(data) {
    const tvl = data.tvl.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    const apy = data.weightedAverageAPY.toFixed(2);
    const rewards = data.totalRewards.toFixed(2);

    let response = `Here's a comprehensive overview of the Briq protocol's current performance:\n\n`;
    
    // Protocol Overview
    response += `**Protocol Overview**\n`;
    response += `Total Value Locked: $${tvl}\n`;
    response += `Weighted Average APY: ${apy}%\n`;
    response += `Total Rewards Earned: $${rewards}\n\n`;

    // Asset Allocation
    response += `**Asset Allocation Strategy**\n`;
    const totalValue = data.marketAllocations.reduce((sum, m) => sum + m.usdValue, 0);
    
    data.marketAllocations.forEach(market => {
      const allocation = totalValue > 0 ? (market.usdValue / totalValue * 100) : 0;
      const value = market.usdValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      response += `${market.tokenSymbol} via ${market.strategyName}: $${value} (${allocation.toFixed(1)}%) earning ${market.apy.toFixed(2)}% APY\n`;
    });

    // Strategy Performance
    response += `\n**Strategy Performance**\n`;
    if (data.aaveRewards.totalUSD > 0 || data.compoundRewards.totalUSD > 0) {
      response += `Aave Strategy: $${data.aaveRewards.totalUSD.toFixed(2)} in accumulated rewards\n`;
      response += `Compound Strategy: $${data.compoundRewards.totalUSD.toFixed(2)} in accumulated rewards\n`;
    } else {
      response += `Both strategies are actively deployed and generating yield.\n`;
      response += `Rewards will accumulate over time as positions mature and compound.\n`;
    }

    // Market Analysis
    response += `\n**Market Analysis**\n`;
    if (data.weightedAverageAPY > 3) {
      response += `Our current APY of ${apy}% demonstrates strong performance in the current market environment. `;
    } else if (data.weightedAverageAPY > 1) {
      response += `We're maintaining solid yield generation with a ${apy}% APY despite current market conditions. `;
    } else {
      response += `Our conservative positioning reflects prudent risk management in the current market environment. `;
    }

    const largestAllocation = data.marketAllocations.reduce((max, market) => 
      market.usdValue > max.usdValue ? market : max, data.marketAllocations[0]);
    
    if (largestAllocation) {
      const allocation = totalValue > 0 ? (largestAllocation.usdValue / totalValue * 100) : 0;
      response += `Our largest position represents ${allocation.toFixed(1)}% of the portfolio in ${largestAllocation.tokenSymbol} through ${largestAllocation.strategyName}.`;
    }

    response += `\n\nAll data is sourced from live contract interactions and updates in real-time.`;

    return {
      content: [
        {
          type: 'text',
          text: response
        }
      ]
    };
  }

  /**
   * Format market allocations with professional tone
   */
  formatAllocations(data) {
    const totalValue = data.markets.reduce((sum, market) => sum + market.usdValue, 0);
    const totalFormatted = totalValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    
    let response = `Here's how the Briq protocol is currently allocating capital across our strategies:\n\n`;
    response += `**Total Portfolio Value: $${totalFormatted}**\n\n`;

    data.markets.forEach(market => {
      const allocation = totalValue > 0 ? (market.usdValue / totalValue * 100) : 0;
      const value = market.usdValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      
      response += `**${market.tokenSymbol} Strategy via ${market.strategyName}**\n`;
      response += `Position Size: ${market.balance.toFixed(4)} ${market.tokenSymbol}\n`;
      response += `USD Value: $${value}\n`;
      response += `Portfolio Weight: ${allocation.toFixed(1)}%\n`;
      response += `Current APY: ${market.apy.toFixed(2)}%\n\n`;
    });

    // Add professional insights
    const highestAPY = Math.max(...data.markets.map(m => m.apy));
    const bestStrategy = data.markets.find(m => m.apy === highestAPY);
    
    if (bestStrategy) {
      response += `Currently, our highest-performing strategy is ${bestStrategy.tokenSymbol} via ${bestStrategy.strategyName}, generating ${bestStrategy.apy.toFixed(2)}% APY. `;
      response += `This demonstrates our protocol's ability to identify and capitalize on the most attractive yield opportunities in the market.`;
    }

    return {
      content: [
        {
          type: 'text',
          text: response
        }
      ]
    };
  }

  /**
   * Format strategy rewards with professional tone
   */
  formatRewards(data, strategy) {
    let response = `Here's a detailed breakdown of rewards generated by our yield optimization strategies:\n\n`;
    
    if (strategy === 'aave' || strategy === 'both') {
      response += `**Aave Strategy Performance**\n`;
      response += `Total Rewards Generated: $${data.aave.totalUSD.toFixed(2)}\n\n`;
      
      data.aave.tokens.forEach(token => {
        response += `${token.tokenSymbol} Position Analysis:\n`;
        response += `Current Balance: ${token.currentBalance.toLocaleString()} ${token.tokenSymbol}\n`;
        response += `Interest Earned: ${token.accruedRewards.toFixed(6)} ${token.tokenSymbol}\n`;
        response += `USD Value of Rewards: $${token.rewardsUSD.toFixed(2)}\n`;
        response += `Current APY: ${token.currentAPY.toFixed(2)}%\n\n`;
      });
    }
    
    if (strategy === 'compound' || strategy === 'both') {
      response += `**Compound Strategy Performance**\n`;
      response += `Total Rewards Generated: $${data.compound.totalUSD.toFixed(2)}\n\n`;
      
      data.compound.tokens.forEach(token => {
        const compFormatted = token.protocolRewards < 0.000001 && token.protocolRewards > 0 
          ? token.protocolRewards.toExponential(2) 
          : token.protocolRewards.toFixed(8);
          
        response += `${token.tokenSymbol} Position Analysis:\n`;
        response += `Current Balance: ${token.currentBalance.toLocaleString()} ${token.tokenSymbol}\n`;
        response += `Interest Earned: ${token.interestRewards.toFixed(6)} ${token.tokenSymbol}\n`;
        response += `COMP Token Rewards: ${compFormatted} COMP\n`;
        response += `USD Value of Rewards: $${token.interestRewardsUSD.toFixed(2)}\n`;
        response += `Current APY: ${token.currentAPY.toFixed(2)}%\n\n`;
      });
    }
    
    if (strategy === 'both') {
      response += `**Combined Strategy Performance**\n`;
      response += `Total Rewards Across All Strategies: $${data.totalRewardsUSD.toFixed(2)}\n\n`;
    }

    // Add professional context
    if (data.totalRewardsUSD < 1) {
      response += `Please note that rewards are still in the early accumulation phase as our positions are relatively new. `;
      response += `DeFi yields compound over time, and we expect to see increasing returns as our strategies mature.`;
    } else {
      response += `Our yield optimization strategies are performing well and generating meaningful returns. `;
      response += `This demonstrates the effectiveness of our automated approach to DeFi yield farming.`;
    }

    return {
      content: [
        {
          type: 'text',
          text: response
        }
      ]
    };
  }
}
