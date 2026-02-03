import { createPublicClient, http } from 'viem';

// Arbitrum Fork (Chain ID 31337, Port 8545)
export const arbitrumForkClient = createPublicClient({
  chain: {
    id: 31337,
    name: 'Arbitrum Fork',
    nativeCurrency: { decimals: 18, name: 'Ether', symbol: 'ETH' },
    rpcUrls: {
      default: { http: ['http://127.0.0.1:8545'] },
    },
  },
  transport: http('http://127.0.0.1:8545'),
});

// Ethereum Fork (Chain ID 31338, Port 8546)
export const ethereumForkClient = createPublicClient({
  chain: {
    id: 31338,
    name: 'Ethereum Fork',
    nativeCurrency: { decimals: 18, name: 'Ether', symbol: 'ETH' },
    rpcUrls: {
      default: { http: ['http://127.0.0.1:8546'] },
    },
  },
  transport: http('http://127.0.0.1:8546'),
});

// Get the correct client based on chain ID
export function getPublicClient(chainId) {
  if (chainId === 31337) {
    return arbitrumForkClient;
  } else if (chainId === 31338) {
    return ethereumForkClient;
  }
  // Default to Arbitrum
  return arbitrumForkClient;
}
