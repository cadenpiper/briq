/**
 * Update Frontend Addresses - Briq Protocol with Chainlink Price Feeds
 * 
 * This utility updates the frontend forkAddresses.js file with deployed contract addresses.
 * Used by the configure script to sync contract addresses with the frontend for testing.
 * 
 * For production deployments, addresses should be manually updated in the frontend.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function updateFrontendAddresses(addresses, chainId) {
  const frontendPath = path.join(__dirname, '../../../src/app/utils/forkAddresses.js');
  
  const frontendDir = path.dirname(frontendPath);
  if (!fs.existsSync(frontendDir)) {
    console.log(`⚠️  Frontend directory not found: ${frontendDir}`);
    return;
  }

  let arbitrumAddresses = {
    VAULT: "0x0000000000000000000000000000000000000000",
    SHARES: "0x0000000000000000000000000000000000000000",
    PRICE_FEED_MANAGER: "0x0000000000000000000000000000000000000000",
    STRATEGY_COORDINATOR: "0x0000000000000000000000000000000000000000",
    STRATEGY_AAVE: "0x0000000000000000000000000000000000000000",
    STRATEGY_COMPOUND: "0x0000000000000000000000000000000000000000",
    USDC: "0xaf88d065e77c8cC2239327C5EDb3A432268e5831",
    WETH: "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1"
  };
  
  let ethereumAddresses = {
    VAULT: "0x0000000000000000000000000000000000000000",
    SHARES: "0x0000000000000000000000000000000000000000",
    PRICE_FEED_MANAGER: "0x0000000000000000000000000000000000000000",
    STRATEGY_COORDINATOR: "0x0000000000000000000000000000000000000000",
    STRATEGY_AAVE: "0x0000000000000000000000000000000000000000",
    STRATEGY_COMPOUND: "0x0000000000000000000000000000000000000000",
    USDC: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
    WETH: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2"
  };

  // Read existing addresses
  if (fs.existsSync(frontendPath)) {
    try {
      const content = fs.readFileSync(frontendPath, 'utf8');
      const arbMatch = content.match(/ARBITRUM_FORK_ADDRESSES\s*=\s*{([^}]+)}/s);
      const ethMatch = content.match(/ETHEREUM_FORK_ADDRESSES\s*=\s*{([^}]+)}/s);
      
      if (arbMatch) arbitrumAddresses = { ...arbitrumAddresses, ...extractAddresses(arbMatch[1]) };
      if (ethMatch) ethereumAddresses = { ...ethereumAddresses, ...extractAddresses(ethMatch[1]) };
    } catch (e) {}
  }

  // Update the appropriate chain (using fork chain IDs)
  if (chainId === 31337) {
    arbitrumAddresses = { ...arbitrumAddresses, ...addresses };
  } else if (chainId === 31338) {
    ethereumAddresses = { ...ethereumAddresses, ...addresses };
  }
  
  const fileContent = `/**
 * Fork Contract Addresses - Briq Protocol
 * Last updated: ${new Date().toISOString()}
 */

export const ARBITRUM_FORK_ADDRESSES = {
  VAULT: "${arbitrumAddresses.VAULT}",
  SHARES: "${arbitrumAddresses.SHARES}",
  PRICE_FEED_MANAGER: "${arbitrumAddresses.PRICE_FEED_MANAGER}",
  STRATEGY_COORDINATOR: "${arbitrumAddresses.STRATEGY_COORDINATOR}",
  STRATEGY_AAVE: "${arbitrumAddresses.STRATEGY_AAVE}",
  STRATEGY_COMPOUND: "${arbitrumAddresses.STRATEGY_COMPOUND}",
  USDC: "${arbitrumAddresses.USDC}",
  WETH: "${arbitrumAddresses.WETH}"
};

export const ETHEREUM_FORK_ADDRESSES = {
  VAULT: "${ethereumAddresses.VAULT}",
  SHARES: "${ethereumAddresses.SHARES}",
  PRICE_FEED_MANAGER: "${ethereumAddresses.PRICE_FEED_MANAGER}",
  STRATEGY_COORDINATOR: "${ethereumAddresses.STRATEGY_COORDINATOR}",
  STRATEGY_AAVE: "${ethereumAddresses.STRATEGY_AAVE}",
  STRATEGY_COMPOUND: "${ethereumAddresses.STRATEGY_COMPOUND}",
  USDC: "${ethereumAddresses.USDC}",
  WETH: "${ethereumAddresses.WETH}"
};

export function getContractAddresses(chainId) {
  if (chainId === 31337) {
    return ARBITRUM_FORK_ADDRESSES;
  } else if (chainId === 31338) {
    return ETHEREUM_FORK_ADDRESSES;
  }
  return ARBITRUM_FORK_ADDRESSES;
}

export const FORK_ADDRESSES = ARBITRUM_FORK_ADDRESSES;

export function areContractsConfigured(chainId) {
  const addr = getContractAddresses(chainId);
  return addr.VAULT !== "0x0000000000000000000000000000000000000000";
}

export function arePriceFeedsConfigured(chainId) {
  return getContractAddresses(chainId).PRICE_FEED_MANAGER !== "0x0000000000000000000000000000000000000000";
}

export function isAPYAvailable(chainId) {
  return getContractAddresses(chainId).STRATEGY_COORDINATOR !== "0x0000000000000000000000000000000000000000";
}

export function areStrategiesAvailable(chainId) {
  const addr = getContractAddresses(chainId);
  return addr.STRATEGY_AAVE !== "0x0000000000000000000000000000000000000000";
}`;

  fs.writeFileSync(frontendPath, fileContent);
  console.log(`✅ Frontend addresses updated at ${frontendPath}`);
}

function extractAddresses(str) {
  const addr = {};
  ['VAULT', 'SHARES', 'PRICE_FEED_MANAGER', 'STRATEGY_COORDINATOR', 'STRATEGY_AAVE', 'STRATEGY_COMPOUND', 'USDC', 'WETH'].forEach(f => {
    const m = str.match(new RegExp(`${f}:\\s*"([^"]+)"`));
    if (m) addr[f] = m[1];
  });
  return addr;
}

// If called directly, update with current addresses from deployment
if (import.meta.url === `file://${process.argv[1]}`) {
  // You can manually call this with addresses or integrate it into setupFork.js
  console.log("Use this script by calling updateFrontendAddresses(addresses) from setupFork.js");
}

export { updateFrontendAddresses };
