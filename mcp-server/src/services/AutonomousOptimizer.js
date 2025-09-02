export class AutonomousOptimizer {
  constructor(strategyService, defiMarketService) {
    this.strategyService = strategyService;
    this.defiMarketService = defiMarketService;
    this.isRunning = false;
    this.interval = null;
    this.lastOptimization = null;
    
    // Get strategy contract references
    this.aaveContract = null;
    this.compoundContract = null;
    this.contractsInitialized = false;
    this.initializeContracts();
  }

  async initializeContracts() {
    try {
      const fs = await import('fs');
      const path = await import('path');
      
      const deploymentPath = path.default.join(process.cwd(), '../hardhat/deployment.json');
      const deployment = JSON.parse(fs.default.readFileSync(deploymentPath, 'utf8'));
      
      const { ethers } = await import('ethers');
      const provider = new ethers.JsonRpcProvider('http://localhost:8545');
      
      // Initialize Aave contract
      const aaveArtifactPath = path.default.join(process.cwd(), '../hardhat/artifacts/contracts/strategies/StrategyAave.sol/StrategyAave.json');
      const aaveAbi = JSON.parse(fs.default.readFileSync(aaveArtifactPath, 'utf8')).abi;
      this.aaveContract = new ethers.Contract(deployment.contracts.StrategyAave, aaveAbi, provider);
      
      // Initialize Compound contract  
      const compoundArtifactPath = path.default.join(process.cwd(), '../hardhat/artifacts/contracts/strategies/StrategyCompoundComet.sol/StrategyCompoundComet.json');
      const compoundAbi = JSON.parse(fs.default.readFileSync(compoundArtifactPath, 'utf8')).abi;
      this.compoundContract = new ethers.Contract(deployment.contracts.StrategyCompoundComet, compoundAbi, provider);
      
      this.contractsInitialized = true;
      console.log('✅ Strategy contracts initialized for pool address lookup');
      
    } catch (error) {
      console.warn('Failed to initialize strategy contracts:', error.message);
    }
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

        // Find best strategy (consider ALL protocols, not just current)
        const bestMarket = scoredMarkets.reduce((best, current) => 
          current.apy > best.apy ? current : best  // Use APY as primary factor
        );

        // Check if change is beneficial (require 0.1% APY improvement minimum)
        const currentAPY = parseFloat(current.currentAPY);
        const apyImprovement = bestMarket.apy - currentAPY;
        const scoreImprovement = bestMarket.score - this.calculateStrategyScore({
          apy: currentAPY,
          tvl: 50000000, // Assume current TVL
          utilization: 70 // Assume current utilization
        });

        // Skip if trying to optimize to the same strategy
        if (bestMarket.protocol === current.currentStrategy) {
          continue;
        }

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
        
        for (let i = 0; i < optimizations.length; i++) {
          const opt = optimizations[i];
          try {
            const strategyType = opt.newStrategy === 'Aave V3' ? 0 : 1;
            const tokenAddress = currentStrategies[opt.token].address;
            
            const tx = await this.strategyService.contract.setStrategyForToken(tokenAddress, strategyType);
            await tx.wait();
            
            console.log(`✅ ${opt.token}: ${opt.currentStrategy} → ${opt.newStrategy} (${opt.improvement.toFixed(2)}% APY gain)`);
            opt.txHash = tx.hash;
            
            // Get pool addresses
            const fromPool = await this.getPoolAddress(opt.token, opt.currentStrategy);
            const toPool = await this.getPoolAddress(opt.token, opt.newStrategy);
            
            console.log(`📍 Pool addresses - From: ${fromPool}, To: ${toPool}`);
            
            // Log action to frontend API
            await this.logActionToFrontend({
              type: 'strategy_change',
              token: opt.token,
              currentStrategy: opt.currentStrategy,
              newStrategy: opt.newStrategy,
              improvement: opt.improvement.toFixed(2),
              txHash: tx.hash,
              fromPool: fromPool,
              toPool: toPool
            });
            
            // Wait 2 seconds between transactions to avoid nonce conflicts
            if (i < optimizations.length - 1) {
              await new Promise(resolve => setTimeout(resolve, 2000));
            }
            
          } catch (error) {
            console.error(`❌ Failed to optimize ${opt.token}:`, error.message);
            opt.error = error.message;
          }
        }

        this.lastOptimization = {
          timestamp: new Date().toISOString(),
          optimizations
        };
        
        // Wait 10 seconds after optimizations to let contract state settle
        console.log('⏳ Waiting for contract state to update...');
        await new Promise(resolve => setTimeout(resolve, 10000));
        
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

  async logActionToFrontend(action) {
    try {
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
      const response = await fetch(`${frontendUrl}/api/rupert/actions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(action)
      });
      
      if (!response.ok) {
        console.warn('Failed to log action to frontend:', response.statusText);
      } else {
        console.log('📝 Action logged to frontend successfully');
      }
    } catch (error) {
      console.warn('Error logging action to frontend:', error.message);
      // Fallback: log to console for now
      console.log('📝 Action (console fallback):', JSON.stringify(action, null, 2));
    }
  }

  async getPoolAddress(token, strategy) {
    try {
      console.log(`🔍 Getting pool address for ${token} ${strategy}`);
      
      if (!this.contractsInitialized) {
        console.log('⚠️ Contracts not initialized yet');
        return null;
      }
      
      if (strategy === 'Aave V3' && this.aaveContract) {
        const poolAddress = await this.aaveContract.aavePool();
        console.log(`📍 Aave pool: ${poolAddress}`);
        return poolAddress;
      } else if (strategy === 'Compound V3' && this.compoundContract) {
        const tokenAddress = this.strategyService.tokenAddresses[token];
        console.log(`🔍 Token address for ${token}: ${tokenAddress}`);
        const marketAddress = await this.compoundContract.getCometMarket(tokenAddress);
        console.log(`📍 Compound market: ${marketAddress}`);
        return marketAddress;
      }
      
      console.log(`⚠️ No contract available for ${strategy}`);
      return null;
    } catch (error) {
      console.warn(`❌ Failed to get pool address for ${token} ${strategy}:`, error.message);
      return null;
    }
  }
}
