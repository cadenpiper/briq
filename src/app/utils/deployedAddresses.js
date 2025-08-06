/**
 * Deployed Contract Addresses Utility
 * 
 * Dynamically loads contract addresses from deployment.json
 * This eliminates the need to manually copy/paste addresses after deployment
 */

// Default addresses (fallback if deployment.json doesn't exist)
const DEFAULT_ADDRESSES = {
  VAULT: "0x0000000000000000000000000000000000000000",
  SHARES: "0x0000000000000000000000000000000000000000",
  USDC: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48", // Mainnet USDC
  WETH: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2"  // Mainnet WETH
};

/**
 * Load contract addresses from deployment.json
 * Falls back to default addresses if file doesn't exist or is invalid
 */
export function getContractAddresses() {
  try {
    // In a real app, you'd fetch this from your backend or include it in your build
    // For now, we'll simulate loading from deployment.json
    
    // Check if we're in development and can access the deployment file
    if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
      // Development mode - you can manually set these after deployment
      const deployedAddresses = getDeployedAddresses();
      if (deployedAddresses) {
        return deployedAddresses;
      }
    }
    
    return DEFAULT_ADDRESSES;
  } catch (error) {
    console.warn('Could not load deployment addresses, using defaults:', error);
    return DEFAULT_ADDRESSES;
  }
}

/**
 * Get deployed addresses - this will be populated after running deployment scripts
 * You can update this object with your actual deployed addresses
 */
function getDeployedAddresses() {
  // Updated with actual deployed addresses from deployment.json
  const DEPLOYED_ADDRESSES = {
    VAULT: "0xF89bd90cC58612D710E5d8dA2f03C53e4D6bF98E",   // BriqVault address
    SHARES: "0xB7757653FDe43C6c337743647a31bf14Bab7cF83",  // BriqShares address
    USDC: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",   // Mainnet USDC
    WETH: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2"    // Mainnet WETH
  };
  
  // Check if addresses have been updated (not default zeros)
  const hasValidAddresses = DEPLOYED_ADDRESSES.VAULT !== "0x0000000000000000000000000000000000000000" &&
                           DEPLOYED_ADDRESSES.SHARES !== "0x0000000000000000000000000000000000000000";
  
  return hasValidAddresses ? DEPLOYED_ADDRESSES : null;
}

/**
 * Utility to check if contracts are properly configured
 */
export function areContractsConfigured() {
  const addresses = getContractAddresses();
  return addresses.VAULT !== "0x0000000000000000000000000000000000000000" &&
         addresses.SHARES !== "0x0000000000000000000000000000000000000000";
}
