import { ethers } from 'ethers';
import dotenv from 'dotenv';
import { readFileSync } from 'fs';
import path from 'path';

dotenv.config({ path: '../.env.local' });
dotenv.config({ path: '../hardhat/.env' });

const STRATEGY_COORDINATOR_ABI = [
  "function getStrategyAPY(address _token) external view returns (uint256)",
  "function getSupportedTokens() external view returns (address[])",
  "function setStrategyForToken(address _token, uint8 _strategyType) external",
  "function tokenToStrategy(address) external view returns (uint8)"
];

const STRATEGY_TYPES = {
  AAVE: 0,
  COMPOUND: 1
};

// Load deployment and config data
function loadContractAddresses() {
  const deploymentPath = path.join(process.cwd(), '../hardhat/deployment.json');
  const configPath = path.join(process.cwd(), '../hardhat/config.json');
  
  const deployment = JSON.parse(readFileSync(deploymentPath, 'utf8'));
  const config = JSON.parse(readFileSync(configPath, 'utf8'));
  
  const chainId = deployment.chainId || "31337";
  const chainConfig = config.CHAIN_CONFIG[chainId];
  
  return {
    strategyCoordinator: deployment.contracts.StrategyCoordinator,
    tokens: {
      USDC: chainConfig.usdcAddress,
      WETH: chainConfig.wethAddress
    }
  };
}

export class StrategyService {
  constructor() {
    this.provider = new ethers.JsonRpcProvider(process.env.RPC_URL || 'http://localhost:8545');
    this.walletAddress = process.env.RUPERT_ADDRESS;
    
    try {
      const addresses = loadContractAddresses();
      this.contractAddress = addresses.strategyCoordinator;
      this.tokenAddresses = addresses.tokens;
      
      // Only initialize wallet and contract if private key is present
      if (process.env.RUPERT_PRIVATE_KEY) {
        this.wallet = new ethers.Wallet(process.env.RUPERT_PRIVATE_KEY, this.provider);
        this.contract = new ethers.Contract(
          this.contractAddress,
          STRATEGY_COORDINATOR_ABI,
          this.wallet
        );
        this.isConfigured = true;
      } else {
        this.isConfigured = false;
      }
    } catch (error) {
      console.error('Failed to load contract addresses:', error.message);
      this.isConfigured = false;
    }
  }

  checkConfiguration() {
    if (!this.isConfigured) {
      throw new Error('StrategyService not configured. Missing RUPERT_PRIVATE_KEY or failed to load contract addresses.');
    }
  }

  async getWalletStatus() {
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
    this.checkConfiguration();
    const strategies = {};
    for (const [symbol, address] of Object.entries(this.tokenAddresses)) {
      try {
        const strategyType = await this.contract.tokenToStrategy(address);
        const apy = await this.contract.getStrategyAPY(address);
        strategies[symbol] = {
          address,
          currentStrategy: strategyType === 0n ? 'Aave V3' : 'Compound V3',
          currentAPY: ethers.formatUnits(apy, 2) // Convert from basis points
        };
      } catch (error) {
        console.warn(`Failed to get strategy for ${symbol} (${address}):`, error.message);
        // Skip tokens that don't have strategies set
        continue;
      }
    }
    return strategies;
  }

  async setOptimalStrategies(marketData) {
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
