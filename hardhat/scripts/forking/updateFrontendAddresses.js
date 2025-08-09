/**
 * Update Frontend Addresses - Briq Protocol with Chainlink Price Feeds
 * 
 * This utility updates the frontend forkAddresses.js file with deployed contract addresses.
 * Used by the configure script to sync contract addresses with the frontend for testing.
 * 
 * For production deployments, addresses should be manually updated in the frontend.
 */

const fs = require('fs');
const path = require('path');

function updateFrontendAddresses(addresses) {
  // Path from hardhat/scripts/forking/ to src/app/utils/forkAddresses.js
  const frontendPath = path.join(__dirname, '../../../src/app/utils/forkAddresses.js');
  
  // Check if frontend directory exists
  const frontendDir = path.dirname(frontendPath);
  if (!fs.existsSync(frontendDir)) {
    console.log(`⚠️  Frontend directory not found: ${frontendDir}`);
    console.log(`   Skipping frontend address update (hardhat-only repository)`);
    return;
  }
  
  const fileContent = `/**
 * Fork Contract Addresses - Briq Protocol with Chainlink Price Feeds
 * 
 * Manually maintained contract addresses for the current fork deployment.
 * Update these addresses after deploying contracts to your local fork.
 * 
 * Last updated: ${new Date().toISOString()}
 */

export const FORK_ADDRESSES = {
  VAULT: "${addresses.VAULT}",                    // BriqVault address (with USD-normalized shares)
  SHARES: "${addresses.SHARES}",                  // BriqShares address
  PRICE_FEED_MANAGER: "${addresses.PRICE_FEED_MANAGER}", // PriceFeedManager address
  USDC: "${addresses.USDC}",                     // Mainnet USDC (forked)
  WETH: "${addresses.WETH}"                      // Mainnet WETH (forked)
};

/**
 * Get contract addresses
 */
export function getContractAddresses() {
  return FORK_ADDRESSES;
}

/**
 * Utility to check if contracts are properly configured
 */
export function areContractsConfigured() {
  return FORK_ADDRESSES.VAULT !== "0x0000000000000000000000000000000000000000" &&
         FORK_ADDRESSES.SHARES !== "0x0000000000000000000000000000000000000000" &&
         FORK_ADDRESSES.PRICE_FEED_MANAGER !== "0x0000000000000000000000000000000000000000";
}

/**
 * Check if price feeds are configured
 */
export function arePriceFeedsConfigured() {
  return FORK_ADDRESSES.PRICE_FEED_MANAGER !== "0x0000000000000000000000000000000000000000";
}`;

  try {
    fs.writeFileSync(frontendPath, fileContent);
    console.log(`✅ Frontend addresses updated at ${frontendPath}`);
  } catch (error) {
    console.log(`⚠️  Could not update frontend addresses: ${error.message}`);
    console.log(`   This is normal for hardhat-only repositories`);
  }
}

// If called directly, update with current addresses from deployment
if (require.main === module) {
  // You can manually call this with addresses or integrate it into setupFork.js
  console.log("Use this script by calling updateFrontendAddresses(addresses) from setupFork.js");
}

module.exports = { updateFrontendAddresses };
