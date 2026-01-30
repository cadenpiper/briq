// Constants
const OPTIMIZER_CONSTANTS = {
  INTERVAL_MS: 5 * 60 * 1000, // 5 minutes
  TX_DELAY_MS: 2000, // 2 seconds between transactions
  STATE_SETTLE_DELAY_MS: 10000, // 10 seconds for contract state to settle
  RETRY_DELAY_MS: 30000, // 30 seconds retry delay
  SCORING_WEIGHTS: {
    APY: 0.6,
    TVL: 0.25,
    UTILIZATION: 0.15
  },
  MAX_APY_PERCENT: 20,
  EXCELLENT_TVL_USD: 100000000, // $100M
  OPTIMAL_UTILIZATION: 80,
  UTILIZATION_TOLERANCE: 50
};

import { getContractAddresses } from '../config/contractAddresses.js';
import { readFile } from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { logger } from '../utils/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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
      const addresses = await getContractAddresses();
      const { ethers } = await import('ethers');
      const provider = new ethers.JsonRpcProvider('http://localhost:8545');
      
      // Load ABIs from local directory
      const [aaveAbi, compoundAbi] = await Promise.all([
        readFile(path.join(__dirname, '..', 'abis', 'StrategyAave.json'), 'utf8').then(JSON.parse),
        readFile(path.join(__dirname, '..', 'abis', 'StrategyCompoundComet.json'), 'utf8').then(JSON.parse)
      ]);
      
      this.aaveContract = new ethers.Contract(addresses.STRATEGY_AAVE, aaveAbi.abi, provider);
      this.compoundContract = new ethers.Contract(addresses.STRATEGY_COMPOUND, compoundAbi.abi, provider);
      
      this.contractsInitialized = true;
      logger.info('Strategy contracts initialized for pool address lookup');
      
    } catch (error) {
      logger.warn('Failed to initialize strategy contracts', { error: error.message });
    }
  }

  // Strategy scoring algorithm
  getTokenAddress(symbol) {
    const tokenAddresses = {
      'USDC': '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
      'WETH': '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1'
    };
    return tokenAddresses[symbol];
  }

  calculateStrategyScore(market) {
    // Normalize APY (assume max reasonable APY is 20%)
    const apyScore = Math.min(market.apy / OPTIMIZER_CONSTANTS.MAX_APY_PERCENT, 1);
    
    // Normalize TVL (assume $100M is excellent)
    const tvlScore = Math.min(market.tvl / OPTIMIZER_CONSTANTS.EXCELLENT_TVL_USD, 1);
    
    // Utilization score (optimal around 80%, penalize extremes)
    const utilizationDiff = Math.abs(market.utilization - OPTIMIZER_CONSTANTS.OPTIMAL_UTILIZATION);
    const utilizationScore = Math.max(0, 1 - (utilizationDiff / OPTIMIZER_CONSTANTS.UTILIZATION_TOLERANCE));

    return (apyScore * OPTIMIZER_CONSTANTS.SCORING_WEIGHTS.APY) + 
           (tvlScore * OPTIMIZER_CONSTANTS.SCORING_WEIGHTS.TVL) + 
           (utilizationScore * OPTIMIZER_CONSTANTS.SCORING_WEIGHTS.UTILIZATION);
  }

  async evaluateOptimalStrategies() {
    try {
      logger.info('Evaluating optimal strategies');
      
      // Get current strategies and market data
      const [currentStrategies, marketData] = await Promise.all([
        this.strategyService.getCurrentStrategies(),
        this.defiMarketService.getAllMarketData()
      ]);

      const optimizations = [];

      // Analyze all supported tokens and set optimal strategies
      const supportedTokens = ['USDC', 'WETH'];
      
      for (const symbol of supportedTokens) {
        const tokenMarkets = marketData.filter(m => 
          m.token === symbol && m.network === 'Arbitrum One'
        );
        
        if (tokenMarkets.length === 0) continue;

        // Find best strategy
        const bestMarket = tokenMarkets.reduce((best, current) => 
          current.apy > best.apy ? current : best
        );

        // Check current strategy (if any)
        const current = currentStrategies[symbol];
        
        if (!current || bestMarket.protocol !== current.currentStrategy) {
          const currentStrategy = current ? current.currentStrategy : 'None';
          logger.info('Setting optimal strategy', { 
            token: symbol, 
            strategy: bestMarket.protocol, 
            apy: bestMarket.apy.toFixed(2) 
          });
          
          optimizations.push({
            token: symbol,
            address: this.getTokenAddress(symbol),
            currentStrategy: currentStrategy,
            currentAPY: current ? parseFloat(current.currentAPY) : 0,
            newStrategy: bestMarket.protocol,
            newAPY: bestMarket.apy,
            improvement: current ? bestMarket.apy - parseFloat(current.currentAPY) : bestMarket.apy,
            reason: `Optimal strategy selection`
          });
        } else {
          logger.info('Already using optimal strategy', { 
            token: symbol, 
            strategy: bestMarket.protocol, 
            apy: bestMarket.apy.toFixed(2) 
          });
        }
      }

      // Execute optimizations if any
      if (optimizations.length > 0) {
        logger.info('Found optimizations, executing', { count: optimizations.length });
        
        for (let i = 0; i < optimizations.length; i++) {
          const opt = optimizations[i];
          try {
            const strategyType = opt.newStrategy === 'Aave V3' ? 0 : 1;
            const tokenAddress = this.getTokenAddress(opt.token);
            
            const tx = await this.strategyService.contract.setStrategyForToken(tokenAddress, strategyType);
            await tx.wait();
            
            logger.info('Strategy change executed', {
              token: opt.token,
              from: opt.currentStrategy,
              to: opt.newStrategy,
              improvement: opt.improvement.toFixed(2),
              txHash: tx.hash
            });
            opt.txHash = tx.hash;
            
            // Get pool addresses
            const fromPool = opt.currentStrategy !== 'None' ? await this.getPoolAddress(opt.token, opt.currentStrategy) : 'N/A';
            const toPool = await this.getPoolAddress(opt.token, opt.newStrategy);
            
            logger.debug('Pool addresses', { fromPool, toPool });
            
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
              await new Promise(resolve => setTimeout(resolve, OPTIMIZER_CONSTANTS.TX_DELAY_MS));
            }
            
          } catch (error) {
            logger.error('Failed to optimize token', { token: opt.token, error: error.message });
            opt.error = error.message;
          }
        }

        this.lastOptimization = {
          timestamp: new Date().toISOString(),
          optimizations
        };
        
        // Wait 10 seconds after optimizations to let contract state settle
        logger.info('Waiting for contract state to update');
        await new Promise(resolve => setTimeout(resolve, OPTIMIZER_CONSTANTS.STATE_SETTLE_DELAY_MS));
        
      } else {
        logger.info('No beneficial strategy changes found');
        this.lastOptimization = {
          timestamp: new Date().toISOString(),
          optimizations: [],
          message: 'No improvements found'
        };
      }

      return this.lastOptimization;

    } catch (error) {
      logger.error('Optimization error', { error: error.message, stack: error.stack });
      return { error: error.message, timestamp: new Date().toISOString() };
    }
  }

  start() {
    if (this.isRunning) return;
    
    logger.info('Starting autonomous strategy optimization', { interval: '5 minutes' });
    this.isRunning = true;
    
    // Run immediately, then every 5 minutes
    this.evaluateOptimalStrategies();
    this.interval = setInterval(() => {
      this.evaluateOptimalStrategies();
    }, OPTIMIZER_CONSTANTS.INTERVAL_MS);
  }

  stop() {
    if (!this.isRunning) return;
    
    logger.info('Stopping autonomous optimization');
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
        logger.warn('Failed to log action to frontend', { status: response.statusText });
      } else {
        logger.debug('Action logged to frontend successfully');
      }
    } catch (error) {
      logger.warn('Error logging action to frontend', { error: error.message });
      logger.debug('Action (console fallback)', action);
    }
  }

  async getPoolAddress(token, strategy) {
    try {
      logger.debug('Getting pool address', { token, strategy });
      
      if (!this.contractsInitialized) {
        logger.warn('Contracts not initialized yet');
        return null;
      }
      
      if (strategy === 'Aave V3' && this.aaveContract) {
        const poolAddress = await this.aaveContract.aavePool();
        logger.debug('Aave pool address', { pool: poolAddress });
        return poolAddress;
      } else if (strategy === 'Compound V3' && this.compoundContract) {
        const tokenAddress = this.strategyService.tokenAddresses[token];
        logger.debug('Token address', { token, address: tokenAddress });
        const marketAddress = await this.compoundContract.getCometMarket(tokenAddress);
        logger.debug('Compound market address', { market: marketAddress });
        return marketAddress;
      }
      
      logger.warn('No contract available for strategy', { strategy });
      return null;
    } catch (error) {
      logger.warn('Failed to get pool address', { token, strategy, error: error.message });
      return null;
    }
  }
}
