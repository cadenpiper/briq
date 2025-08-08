const fs = require('fs');
const path = require('path');

/**
 * Updates the frontend forkAddresses.js file with deployed contract addresses
 * Call this after running setupFork.js to sync addresses
 */
function updateFrontendAddresses(addresses) {
  const frontendPath = path.join(__dirname, '../../src/app/utils/forkAddresses.js');
  
  const fileContent = `/**
 * Fork Contract Addresses
 * 
 * Manually maintained contract addresses for the current fork deployment.
 * Update these addresses after deploying contracts to your local fork.
 * 
 * Last updated: ${new Date().toISOString()}
 */

export const FORK_ADDRESSES = {
  VAULT: "${addresses.VAULT}",   // BriqVault address
  SHARES: "${addresses.SHARES}",  // BriqShares address
  USDC: "${addresses.USDC}",   // Mainnet USDC (forked)
  WETH: "${addresses.WETH}"    // Mainnet WETH (forked)
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
         FORK_ADDRESSES.SHARES !== "0x0000000000000000000000000000000000000000";
}`;

  fs.writeFileSync(frontendPath, fileContent);
  console.log(`✅ Frontend addresses updated at ${frontendPath}`);
}

// If called directly, update with current addresses from deployment
if (require.main === module) {
  // You can manually call this with addresses or integrate it into setupFork.js
  console.log("Use this script by calling updateFrontendAddresses(addresses) from setupFork.js");
}

module.exports = { updateFrontendAddresses };
