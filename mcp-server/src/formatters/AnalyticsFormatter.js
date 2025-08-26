/**
 * Dynamic formatter for Briq analytics data that adapts to actual state
 */
export class AnalyticsFormatter {
  /**
   * Dynamically format TVL data based on actual state
   */
  formatTVL(data) {
    const tvl = data.tvl;
    
    // Dynamic response based on actual TVL state
    let response = '';
    
    if (tvl === 0) {
      response = `The Briq protocol currently has no active deposits (TVL: $0.00). The vault is deployed and ready to accept deposits, but no users have deposited funds yet.`;
    } else if (tvl < 1000) {
      response = `The Briq protocol has $${tvl.toFixed(2)} in Total Value Locked. This represents the early stages of protocol adoption with initial deposits being managed across our yield strategies.`;
    } else if (tvl < 10000) {
      response = `The Briq protocol currently manages $${tvl.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} in Total Value Locked. We're seeing growing adoption with meaningful capital being deployed across our optimization strategies.`;
    } else if (tvl < 100000) {
      response = `The Briq protocol has reached $${tvl.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} in Total Value Locked, demonstrating solid traction and user confidence in our yield optimization approach.`;
    } else {
      response = `The Briq protocol has achieved significant scale with $${tvl.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} in Total Value Locked, representing substantial user adoption and capital deployment across our strategies.`;
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
   * Dynamically format comprehensive analytics based on actual state
   */
  formatAnalytics(data) {
    const { tvl, weightedAverageAPY, totalRewards, marketAllocations, aaveRewards, compoundRewards } = data;
    
    let response = '';
    
    // Dynamic protocol status assessment
    if (tvl === 0) {
      response += `**Briq Protocol Status: Awaiting First Deposits**\n\n`;
      response += `The Briq protocol is fully deployed and operational, but currently has no active deposits. `;
      response += `Once users begin depositing USDC and WETH, the protocol will automatically optimize yields across Aave V3 and Compound V3 strategies.\n\n`;
      
      response += `**Ready Strategies:**\n`;
      response += `- USDC Strategy: Aave V3 integration ready\n`;
      response += `- WETH Strategy: Compound V3 integration ready\n\n`;
      
      response += `The protocol is monitoring market conditions and will begin yield optimization immediately upon receiving deposits.`;
      
    } else {
      // Active protocol with deposits
      response += `**Briq Protocol Performance Overview**\n\n`;
      
      // TVL Analysis
      response += `**Total Value Locked:** $${tvl.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}\n`;
      
      // APY Analysis
      if (weightedAverageAPY > 0) {
        response += `**Weighted Average APY:** ${weightedAverageAPY.toFixed(2)}%\n`;
        
        if (weightedAverageAPY > 5) {
          response += `*Excellent yield performance in current market conditions*\n`;
        } else if (weightedAverageAPY > 3) {
          response += `*Strong yield generation across strategies*\n`;
        } else if (weightedAverageAPY > 1) {
          response += `*Steady yield generation with conservative positioning*\n`;
        } else {
          response += `*Conservative positioning in current market environment*\n`;
        }
      } else {
        response += `**Weighted Average APY:** 0.00% (positions still initializing)\n`;
      }
      
      // Rewards Analysis
      response += `**Total Rewards Earned:** $${totalRewards.toFixed(2)}\n\n`;
      
      // Asset Allocation Analysis
      response += `**Current Asset Allocation:**\n`;
      const totalValue = marketAllocations.reduce((sum, m) => sum + m.usdValue, 0);
      
      if (marketAllocations.length === 0) {
        response += `No active allocations detected.\n`;
      } else {
        marketAllocations.forEach(market => {
          const allocation = totalValue > 0 ? (market.usdValue / totalValue * 100) : 0;
          const value = market.usdValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
          
          response += `- ${market.tokenSymbol} via ${market.strategyName}: $${value} (${allocation.toFixed(1)}%) at ${market.apy.toFixed(2)}% APY\n`;
        });
      }
      
      response += `\n`;
      
      // Strategy Performance Analysis
      response += `**Strategy Performance:**\n`;
      
      const hasAaveRewards = aaveRewards.totalUSD > 0;
      const hasCompoundRewards = compoundRewards.totalUSD > 0;
      
      if (!hasAaveRewards && !hasCompoundRewards) {
        response += `Strategies are active but rewards are still accumulating. This is normal for new positions as DeFi yields compound over time.\n`;
      } else {
        if (hasAaveRewards) {
          response += `- Aave Strategy: $${aaveRewards.totalUSD.toFixed(2)} in accumulated rewards\n`;
        }
        if (hasCompoundRewards) {
          response += `- Compound Strategy: $${compoundRewards.totalUSD.toFixed(2)} in accumulated rewards\n`;
        }
      }
      
      // Market Context
      response += `\n**Market Analysis:**\n`;
      
      if (marketAllocations.length > 1) {
        const bestStrategy = marketAllocations.reduce((best, current) => 
          current.apy > best.apy ? current : best
        );
        response += `Currently, our highest-performing allocation is ${bestStrategy.tokenSymbol} via ${bestStrategy.strategyName} at ${bestStrategy.apy.toFixed(2)}% APY. `;
      }
      
      if (totalRewards > tvl * 0.01) { // If rewards > 1% of TVL
        response += `Strong reward accumulation demonstrates effective yield optimization.`;
      } else if (totalRewards > 0) {
        response += `Rewards are accumulating as expected for our current position duration.`;
      } else {
        response += `Positions are newly established and rewards will accumulate over time.`;
      }
    }
    
    response += `\n\nAll data reflects real-time on-chain contract state.`;

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
   * Dynamically format market allocations based on actual state
   */
  formatAllocations(data) {
    const { markets } = data;
    const totalValue = markets.reduce((sum, market) => sum + market.usdValue, 0);
    
    let response = '';
    
    if (totalValue === 0) {
      response = `The Briq protocol currently has no active asset allocations. The vault is ready to receive deposits and will automatically begin optimizing yields across Aave V3 and Compound V3 strategies once funds are deposited.`;
    } else {
      response += `**Briq Protocol Asset Allocation**\n\n`;
      response += `**Total Portfolio Value:** $${totalValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}\n\n`;

      // Analyze allocation diversity
      const activeStrategies = markets.filter(m => m.usdValue > 0);
      
      if (activeStrategies.length === 1) {
        response += `*Currently concentrated in a single strategy for optimal yield capture*\n\n`;
      } else if (activeStrategies.length > 1) {
        response += `*Diversified across ${activeStrategies.length} strategies for risk management*\n\n`;
      }

      markets.forEach(market => {
        if (market.usdValue > 0) {
          const allocation = (market.usdValue / totalValue * 100);
          const value = market.usdValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
          
          response += `**${market.tokenSymbol} Strategy (${market.strategyName})**\n`;
          response += `- Position Size: ${market.balance.toFixed(4)} ${market.tokenSymbol}\n`;
          response += `- USD Value: $${value}\n`;
          response += `- Portfolio Weight: ${allocation.toFixed(1)}%\n`;
          response += `- Current APY: ${market.apy.toFixed(2)}%\n\n`;
        }
      });

      // Dynamic insights based on actual allocation
      const highestAPY = Math.max(...markets.map(m => m.apy));
      const bestStrategy = markets.find(m => m.apy === highestAPY);
      
      if (bestStrategy && bestStrategy.usdValue > 0) {
        const bestAllocation = (bestStrategy.usdValue / totalValue * 100);
        response += `**Portfolio Insights:**\n`;
        response += `Our highest-yielding position is ${bestStrategy.tokenSymbol} via ${bestStrategy.strategyName} at ${bestStrategy.apy.toFixed(2)}% APY, `;
        
        if (bestAllocation > 70) {
          response += `representing ${bestAllocation.toFixed(1)}% of the portfolio, indicating strong conviction in this opportunity.`;
        } else if (bestAllocation > 40) {
          response += `representing ${bestAllocation.toFixed(1)}% of the portfolio, showing balanced optimization.`;
        } else {
          response += `representing ${bestAllocation.toFixed(1)}% of the portfolio as part of our diversified approach.`;
        }
      }
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
   * Dynamically format strategy rewards based on actual performance
   */
  formatRewards(data, strategy) {
    const { aave, compound, totalRewardsUSD } = data;
    
    let response = '';
    
    if (totalRewardsUSD === 0) {
      response += `**Strategy Rewards Status: Accumulation Phase**\n\n`;
      response += `Our yield strategies are currently active but rewards are still in the early accumulation phase. `;
      response += `This is typical for new positions as DeFi protocols compound returns over time.\n\n`;
      
      if (strategy === 'aave' || strategy === 'both') {
        response += `**Aave Strategy:** Positions deployed and earning yield\n`;
      }
      if (strategy === 'compound' || strategy === 'both') {
        response += `**Compound Strategy:** Positions deployed and earning yield\n`;
      }
      
      response += `\nRewards will become visible as positions mature and compound over the coming blocks.`;
      
    } else {
      response += `**Strategy Rewards Performance**\n\n`;
      response += `**Total Rewards Generated:** $${totalRewardsUSD.toFixed(2)}\n\n`;
      
      // Analyze reward distribution
      const aavePercentage = totalRewardsUSD > 0 ? (aave.totalUSD / totalRewardsUSD * 100) : 0;
      const compoundPercentage = totalRewardsUSD > 0 ? (compound.totalUSD / totalRewardsUSD * 100) : 0;
      
      if (strategy === 'aave' || strategy === 'both') {
        response += `**Aave Strategy Performance**\n`;
        response += `Total Rewards: $${aave.totalUSD.toFixed(2)}`;
        if (strategy === 'both' && totalRewardsUSD > 0) {
          response += ` (${aavePercentage.toFixed(1)}% of total)`;
        }
        response += `\n\n`;
        
        if (aave.tokens.length > 0) {
          aave.tokens.forEach(token => {
            response += `${token.tokenSymbol} Position:\n`;
            response += `- Balance: ${token.currentBalance.toLocaleString()} ${token.tokenSymbol}\n`;
            response += `- Interest Earned: ${token.accruedRewards.toFixed(6)} ${token.tokenSymbol}\n`;
            response += `- USD Value: $${token.rewardsUSD.toFixed(2)}\n`;
            response += `- Current APY: ${token.currentAPY.toFixed(2)}%\n\n`;
          });
        }
      }
      
      if (strategy === 'compound' || strategy === 'both') {
        response += `**Compound Strategy Performance**\n`;
        response += `Total Rewards: $${compound.totalUSD.toFixed(2)}`;
        if (strategy === 'both' && totalRewardsUSD > 0) {
          response += ` (${compoundPercentage.toFixed(1)}% of total)`;
        }
        response += `\n\n`;
        
        if (compound.tokens.length > 0) {
          compound.tokens.forEach(token => {
            const compFormatted = token.protocolRewards < 0.000001 && token.protocolRewards > 0 
              ? token.protocolRewards.toExponential(2) 
              : token.protocolRewards.toFixed(8);
              
            response += `${token.tokenSymbol} Position:\n`;
            response += `- Balance: ${token.currentBalance.toLocaleString()} ${token.tokenSymbol}\n`;
            response += `- Interest Earned: ${token.interestRewards.toFixed(6)} ${token.tokenSymbol}\n`;
            response += `- COMP Rewards: ${compFormatted} COMP\n`;
            response += `- USD Value: $${token.interestRewardsUSD.toFixed(2)}\n`;
            response += `- Current APY: ${token.currentAPY.toFixed(2)}%\n\n`;
          });
        }
      }
      
      // Dynamic performance assessment
      response += `**Performance Analysis:**\n`;
      
      if (aave.totalUSD > compound.totalUSD && strategy === 'both') {
        response += `Aave strategy is currently outperforming with ${aavePercentage.toFixed(1)}% of total rewards, `;
        response += `demonstrating effective yield capture in current market conditions.`;
      } else if (compound.totalUSD > aave.totalUSD && strategy === 'both') {
        response += `Compound strategy is leading performance with ${compoundPercentage.toFixed(1)}% of total rewards, `;
        response += `showing strong returns from our Compound V3 integration.`;
      } else if (strategy === 'both') {
        response += `Both strategies are contributing relatively equally to our yield generation, `;
        response += `indicating balanced performance across protocols.`;
      } else {
        response += `Strategy is performing as expected with consistent reward accumulation.`;
      }
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
