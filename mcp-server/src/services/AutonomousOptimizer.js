export class AutonomousOptimizer {
  constructor(strategyService, defiMarketService) {
    this.strategyService = strategyService;
    this.defiMarketService = defiMarketService;
    this.isRunning = false;
    this.interval = null;
    this.lastOptimization = null;
  }

  // Strategy scoring algorithm
  calculateStrategyScore(market) {
    const apyWeight = 0.6;      // 60% weight on APY
    const tvlWeight = 0.25;     // 25% weight on TVL (higher is better)
    const utilizationWeight = 0.15; // 15% weight on utilization (optimal around 80%)

    // Normalize APY (assume max reasonable APY is 20%)
    const apyScore = Math.min(market.apy / 20, 1);
    
    // Normalize TVL (assume $100M is excellent)
    const tvlScore = Math.min(market.tvl / 100000000, 1);
    
    // Utilization score (optimal around 80%, penalize extremes)
    const optimalUtilization = 80;
    const utilizationDiff = Math.abs(market.utilization - optimalUtilization);
    const utilizationScore = Math.max(0, 1 - (utilizationDiff / 50));

    return (apyScore * apyWeight) + (tvlScore * tvlWeight) + (utilizationScore * utilizationWeight);
  }

  async evaluateOptimalStrategies() {
    try {
      console.log('🤖 Rupert: Evaluating optimal strategies...');
      
      // Get current strategies and market data
      const [currentStrategies, marketData] = await Promise.all([
        this.strategyService.getCurrentStrategies(),
        this.defiMarketService.getAllMarketData()
      ]);

      const optimizations = [];

      // Evaluate each token
      for (const [symbol, current] of Object.entries(currentStrategies)) {
        const tokenMarkets = marketData.filter(m => m.token === symbol);
        if (tokenMarkets.length === 0) continue;

        // Score each available strategy
        const scoredMarkets = tokenMarkets.map(market => ({
          ...market,
          score: this.calculateStrategyScore(market)
        }));

        // Find best strategy
        const bestMarket = scoredMarkets.reduce((best, current) => 
          current.score > best.score ? current : best
        );

        // Check if change is beneficial (require 0.1% APY improvement minimum)
        const currentAPY = parseFloat(current.currentAPY);
        const apyImprovement = bestMarket.apy - currentAPY;
        const scoreImprovement = bestMarket.score - this.calculateStrategyScore({
          apy: currentAPY,
          tvl: 50000000, // Assume current TVL
          utilization: 70 // Assume current utilization
        });

        if (apyImprovement > 0.1 && scoreImprovement > 0.05) {
          optimizations.push({
            token: symbol,
            currentStrategy: current.currentStrategy,
            currentAPY: currentAPY,
            newStrategy: bestMarket.protocol,
            newAPY: bestMarket.apy,
            improvement: apyImprovement,
            reason: `APY improvement: +${apyImprovement.toFixed(2)}%, Score: ${bestMarket.score.toFixed(3)}`
          });
        }
      }

      // Execute optimizations if any
      if (optimizations.length > 0) {
        console.log(`🔄 Rupert: Found ${optimizations.length} optimization(s), executing...`);
        
        for (const opt of optimizations) {
          try {
            const strategyType = opt.newStrategy === 'Aave V3' ? 0 : 1;
            const tokenAddress = currentStrategies[opt.token].address;
            
            const tx = await this.strategyService.contract.setStrategyForToken(tokenAddress, strategyType);
            await tx.wait();
            
            console.log(`✅ ${opt.token}: ${opt.currentStrategy} → ${opt.newStrategy} (${opt.improvement.toFixed(2)}% APY gain)`);
            opt.txHash = tx.hash;
          } catch (error) {
            console.error(`❌ Failed to optimize ${opt.token}:`, error.message);
            opt.error = error.message;
          }
        }

        this.lastOptimization = {
          timestamp: new Date().toISOString(),
          optimizations
        };
      } else {
        console.log('✅ Rupert: No beneficial strategy changes found');
        this.lastOptimization = {
          timestamp: new Date().toISOString(),
          optimizations: [],
          message: 'No improvements found'
        };
      }

      return this.lastOptimization;

    } catch (error) {
      console.error('❌ Rupert optimization error:', error);
      return { error: error.message, timestamp: new Date().toISOString() };
    }
  }

  start() {
    if (this.isRunning) return;
    
    console.log('🚀 Rupert: Starting autonomous strategy optimization (5-minute intervals)');
    this.isRunning = true;
    
    // Run immediately, then every 5 minutes
    this.evaluateOptimalStrategies();
    this.interval = setInterval(() => {
      this.evaluateOptimalStrategies();
    }, 5 * 60 * 1000); // 5 minutes
  }

  stop() {
    if (!this.isRunning) return;
    
    console.log('⏹️ Rupert: Stopping autonomous optimization');
    this.isRunning = false;
    
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
  }

  getStatus() {
    return {
      isRunning: this.isRunning,
      lastOptimization: this.lastOptimization,
      nextCheck: this.isRunning ? new Date(Date.now() + 5 * 60 * 1000).toISOString() : null
    };
  }
}
