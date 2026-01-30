/**
 * Contract Addresses Configuration
 * 
 * Shared source of truth for deployed contract addresses.
 * These addresses are loaded from the hardhat deployment.json file.
 */

import { readFile } from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let cachedAddresses = null;
let loadingPromise = null;

/**
 * Load contract addresses from hardhat deployment (async)
 */
async function loadContractAddresses() {
  if (cachedAddresses) {
    return cachedAddresses;
  }

  // If already loading, return the existing promise
  if (loadingPromise) {
    return loadingPromise;
  }

  loadingPromise = (async () => {
    try {
      const deploymentPath = path.join(__dirname, '../../..', 'hardhat', 'deployment.json');
      const deployment = JSON.parse(await readFile(deploymentPath, 'utf8'));
      
      const configPath = path.join(__dirname, '../../..', 'hardhat', 'config.json');
      const config = JSON.parse(await readFile(configPath, 'utf8'));
      
      const chainId = deployment.chainId || "31337";
      const chainConfig = config.CHAIN_CONFIG[chainId];
      
      cachedAddresses = {
        VAULT: deployment.contracts.BriqVault,
        SHARES: deployment.contracts.BriqShares,
        PRICE_FEED_MANAGER: deployment.contracts.PriceFeedManager,
        STRATEGY_COORDINATOR: deployment.contracts.StrategyCoordinator,
        STRATEGY_AAVE: deployment.contracts.StrategyAave,
        STRATEGY_COMPOUND: deployment.contracts.StrategyCompoundComet,
        USDC: chainConfig.usdcAddress,
        WETH: chainConfig.wethAddress
      };
      
      return cachedAddresses;
    } catch (error) {
      loadingPromise = null; // Reset on error so it can be retried
      throw new Error(`Failed to load contract addresses: ${error.message}`);
    }
  })();

  return loadingPromise;
}

/**
 * Get contract addresses (async)
 */
export async function getContractAddresses() {
  return loadContractAddresses();
}

/**
 * Utility to check if contracts are properly configured
 */
export async function areContractsConfigured() {
  try {
    const addresses = await getContractAddresses();
    return addresses.VAULT && 
           addresses.SHARES && 
           addresses.PRICE_FEED_MANAGER && 
           addresses.STRATEGY_COORDINATOR;
  } catch {
    return false;
  }
}

/**
 * Check if strategy contracts are available
 */
export async function areStrategiesAvailable() {
  try {
    const addresses = await getContractAddresses();
    return addresses.STRATEGY_AAVE && addresses.STRATEGY_COMPOUND;
  } catch {
    return false;
  }
}
