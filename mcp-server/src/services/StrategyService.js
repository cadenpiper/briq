import { ethers } from 'ethers';
import { getContractAddresses } from '../config/contractAddresses.js';

const STRATEGY_ABI = [
  "function balanceOf(address _token) external view returns (uint256)",
  "function getTokenAnalytics(address _token) external view returns (uint256, uint256, uint256, uint256, uint256, uint256, uint256)",
  "function getCurrentAPY(address _token) external view returns (uint256)"
];

const COORDINATOR_ABI = [
  "function setStrategyForToken(address _token, uint8 _strategyType) external"
];

const STRATEGY_TYPES = {
  AAVE: 0,
  COMPOUND: 1
};

export class StrategyService {
  constructor() {
    this.provider = new ethers.JsonRpcProvider(process.env.RPC_URL || 'http://localhost:8545');
    this.walletAddress = process.env.RUPERT_ADDRESS;
    this.isConfigured = false;
    this.initialized = false;
    this.initPromise = this.initialize();
  }

  async initialize() {
    if (this.initialized) return;

    try {
      const addresses = await getContractAddresses();
      this.strategyAaveAddress = addresses.STRATEGY_AAVE;
      this.strategyCompoundAddress = addresses.STRATEGY_COMPOUND;
      this.contractAddress = addresses.STRATEGY_COORDINATOR;
      this.tokenAddresses = {
        USDC: addresses.USDC,
        WETH: addresses.WETH
      };
      
      // Only initialize wallet and contract if private key is present
      if (process.env.RUPERT_PRIVATE_KEY) {
        this.wallet = new ethers.Wallet(process.env.RUPERT_PRIVATE_KEY, this.provider);
        this.strategyAave = new ethers.Contract(this.strategyAaveAddress, STRATEGY_ABI, this.provider);
        this.strategyCompound = new ethers.Contract(this.strategyCompoundAddress, STRATEGY_ABI, this.provider);
        this.contract = new ethers.Contract(this.contractAddress, COORDINATOR_ABI, this.wallet);
        this.isConfigured = true;
      }
      
      this.initialized = true;
    } catch (error) {
      console.error('Failed to initialize StrategyService:', error.message);
      throw error;
    }
  }

  async ensureInitialized() {
    if (!this.initialized) {
      await this.initPromise;
    }
  }

  checkConfiguration() {
    if (!this.isConfigured) {
      throw new Error('StrategyService not configured. Missing RUPERT_PRIVATE_KEY or failed to load contract addresses.');
    }
  }

  async getWalletStatus() {
    await this.ensureInitialized();
    const balance = await this.provider.getBalance(this.walletAddress);
    return {
      address: this.walletAddress,
      balance: ethers.formatEther(balance),
      network: process.env.RPC_URL || 'http://localhost:8545'
    };
  }

  async handleGetWalletStatus() {
    try {
      const status = await this.getWalletStatus();
      return {
        content: [{
          type: 'text',
          text: JSON.stringify(status, null, 2)
        }]
      };
    } catch (error) {
      return {
        content: [{
          type: 'text',
          text: `Error getting wallet status: ${error.message}`
        }],
        isError: true
      };
    }
  }

  async getCurrentStrategies() {
    await this.ensureInitialized();
    this.checkConfiguration();
    const strategies = {};
    
    for (const [symbol, address] of Object.entries(this.tokenAddresses)) {
      try {
        // Check balances in both strategies
        const aaveBalance = await this.strategyAave.balanceOf(address);
        const compoundBalance = await this.strategyCompound.balanceOf(address);
        
        // Determine current strategy based on where funds are allocated
        let currentStrategy, currentAPY;
        
        if (aaveBalance > 0n && aaveBalance >= compoundBalance) {
          currentStrategy = 'Aave V3';
          try {
            // Try to get APY from analytics
            const analytics = await this.strategyAave.getTokenAnalytics(address);
            currentAPY = parseFloat(ethers.formatUnits(analytics[6], 2));
          } catch (error) {
            // Fallback: try to get current APY directly from strategy contract
            try {
              const apy = await this.strategyAave.getCurrentAPY(address);
              currentAPY = parseFloat(ethers.formatUnits(apy, 2));
            } catch (fallbackError) {
              console.warn(`Could not get Aave APY for ${symbol}, skipping`);
              continue; // Skip this token entirely if we can't get APY
            }
          }
        } else if (compoundBalance > 0n) {
          currentStrategy = 'Compound V3';
          try {
            const analytics = await this.strategyCompound.getTokenAnalytics(address);
            currentAPY = parseFloat(ethers.formatUnits(analytics[6], 2));
          } catch (error) {
            console.warn(`Could not get Compound APY for ${symbol}, using 0`);
            currentAPY = 0;
          }
        } else {
          // No funds allocated, skip
          continue;
        }
        
        strategies[symbol] = {
          address,
          currentStrategy,
          currentAPY: currentAPY.toFixed(2)
        };
      } catch (error) {
        console.warn(`Failed to get strategy for ${symbol} (${address}):`, error.message);
        continue;
      }
    }
    return strategies;
  }

  async setOptimalStrategies(marketData) {
    await this.ensureInitialized();
    this.checkConfiguration();
    const results = [];
    
    for (const [symbol, address] of Object.entries(this.tokenAddresses)) {
      const tokenMarkets = marketData.filter(m => m.token === symbol);
      if (tokenMarkets.length === 0) continue;

      // Find best APY
      const bestMarket = tokenMarkets.reduce((best, current) => 
        current.apy > best.apy ? current : best
      );

      const strategyType = bestMarket.protocol === 'Aave V3' ? STRATEGY_TYPES.AAVE : STRATEGY_TYPES.COMPOUND;
      
      try {
        const tx = await this.contract.setStrategyForToken(address, strategyType);
        await tx.wait();
        
        results.push({
          token: symbol,
          newStrategy: bestMarket.protocol,
          apy: bestMarket.apy,
          txHash: tx.hash
        });
      } catch (error) {
        results.push({
          token: symbol,
          error: error.message
        });
      }
    }
    
    return results;
  }

  async handleGetCurrentStrategies() {
    try {
      const strategies = await this.getCurrentStrategies();
      return {
        content: [{
          type: 'text',
          text: JSON.stringify(strategies, null, 2)
        }]
      };
    } catch (error) {
      return {
        content: [{
          type: 'text',
          text: `Error getting current strategies: ${error.message}`
        }],
        isError: true
      };
    }
  }

  async handleSetOptimalStrategies(marketData) {
    try {
      const results = await this.setOptimalStrategies(marketData);
      return {
        content: [{
          type: 'text',
          text: JSON.stringify(results, null, 2)
        }]
      };
    } catch (error) {
      return {
        content: [{
          type: 'text',
          text: `Error setting strategies: ${error.message}`
        }],
        isError: true
      };
    }
  }
}
