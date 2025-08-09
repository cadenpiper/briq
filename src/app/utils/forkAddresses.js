/**
 * Fork Contract Addresses
 * 
 * Manually maintained contract addresses for the current fork deployment.
 * Update these addresses after deploying contracts to your local fork.
 * 
 * Last updated: 2025-08-09T03:23:43.930Z
 */

export const FORK_ADDRESSES = {
  VAULT: "0xc2504cD8ca96723c248df5d696B921a3332f1d38",   // BriqVault address
  SHARES: "0x78155E681c54Da4c25B6228753EcbfF5d8C2Def8",  // BriqShares address
  USDC: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",   // Mainnet USDC (forked)
  WETH: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2"    // Mainnet WETH (forked)
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
}