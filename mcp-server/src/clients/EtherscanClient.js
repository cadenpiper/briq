import { RateLimiter } from '../utils/rateLimiter.js';

/**
 * Client for interacting with Etherscan API across multiple networks
 */
export class EtherscanClient {
  constructor() {
    this.apiKey = process.env.ETHERSCAN_API_KEY;
    if (!this.apiKey) {
      throw new Error('ETHERSCAN_API_KEY not found in environment variables');
    }
    this.rateLimiter = new RateLimiter(5); // 5 requests per minute
  }

  /**
   * Get Ethereum gas price using v2 API
   */
  async getEthereumGasPrice() {
    return this.rateLimiter.execute(async () => {
      const response = await fetch(
        `https://api.etherscan.io/v2/api?chainid=1&module=proxy&action=eth_gasPrice&apikey=${this.apiKey}`
      );
      const data = await response.json();
      
      if (!data.result) {
        throw new Error(`Etherscan API error: ${data.message || 'No result'}`);
      }
      
      return data.result;
    });
  }

  /**
   * Get Arbitrum gas price using v2 API
   */
  async getArbitrumGasPrice() {
    return this.rateLimiter.execute(async () => {
      const response = await fetch(
        `https://api.etherscan.io/v2/api?chainid=42161&module=proxy&action=eth_gasPrice&apikey=${this.apiKey}`
      );
      const data = await response.json();
      
      if (!data.result) {
        throw new Error(`Etherscan API error: ${data.message || 'No result'}`);
      }
      
      return data.result;
    });
  }

  /**
   * Generic method for fetching from Etherscan API (legacy support)
   */
  async fetchFromEtherscan(network, params) {
    const url = new URL('https://api.etherscan.io/api');
    
    // Add API key
    url.searchParams.append('apikey', this.apiKey);
    
    // Add L2 parameter for Arbitrum
    if (network === 'arbitrum') {
      url.searchParams.append('L2', 'arbitrum');
    }
    
    // Add other parameters
    Object.entries(params).forEach(([key, value]) => {
      url.searchParams.append(key, value);
    });

    const response = await fetch(url.toString());
    const data = await response.json();
    
    if (data.status !== '1') {
      throw new Error(`Etherscan API error: ${data.message || 'Unknown error'}`);
    }
    
    return data.result;
  }
}
