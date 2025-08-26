import { EtherscanClient } from '../clients/EtherscanClient.js';
import { TokenPriceService } from './TokenPriceService.js';
import { GasPriceFormatter } from '../formatters/GasPriceFormatter.js';

/**
 * Service for fetching and processing gas price data from multiple networks
 */
export class GasPriceService {
  constructor() {
    this.etherscanClient = new EtherscanClient();
    this.tokenPriceService = new TokenPriceService();
    this.formatter = new GasPriceFormatter();
  }

  /**
   * Get Ethereum gas prices with USD conversion
   */
  async getEthereumGasPrices() {
    try {
      const gasData = await this.etherscanClient.getEthereumGasPrice();
      const tokenPrices = await this.tokenPriceService.getTokenPrices();
      const ethPrice = tokenPrices.ETH.price_usd;

      // Convert from wei to gwei
      const gasPriceWei = parseInt(gasData, 16);
      const gasPriceGwei = gasPriceWei / 1e9;
      
      return {
        safe_gas_price: gasPriceGwei,
        standard_gas_price: gasPriceGwei * 1.1, // 10% higher for standard
        fast_gas_price: gasPriceGwei * 1.2, // 20% higher for fast
        eth_price_usd: ethPrice,
        transfer_cost_usd: {
          safe: ((gasPriceGwei * 21000) / 1e9) * ethPrice,
          standard: ((gasPriceGwei * 1.1 * 21000) / 1e9) * ethPrice,
          fast: ((gasPriceGwei * 1.2 * 21000) / 1e9) * ethPrice
        }
      };
    } catch (error) {
      console.error('Error fetching Ethereum gas prices:', error);
      throw error;
    }
  }

  /**
   * Get Arbitrum gas prices with USD conversion
   */
  async getArbitrumGasPrices() {
    try {
      const gasData = await this.etherscanClient.getArbitrumGasPrice();
      const tokenPrices = await this.tokenPriceService.getTokenPrices();
      const ethPrice = tokenPrices.ETH.price_usd;

      // Convert from wei to gwei
      const gasPriceWei = parseInt(gasData, 16);
      const gasPriceGwei = gasPriceWei / 1e9;
      
      return {
        safe_gas_price: gasPriceGwei,
        standard_gas_price: gasPriceGwei * 1.05, // 5% higher for standard (Arbitrum has lower variance)
        fast_gas_price: gasPriceGwei * 1.1, // 10% higher for fast
        eth_price_usd: ethPrice,
        transfer_cost_usd: {
          safe: ((gasPriceGwei * 21000) / 1e9) * ethPrice,
          standard: ((gasPriceGwei * 1.05 * 21000) / 1e9) * ethPrice,
          fast: ((gasPriceGwei * 1.1 * 21000) / 1e9) * ethPrice
        }
      };
    } catch (error) {
      console.error('Error fetching Arbitrum gas prices:', error);
      throw error;
    }
  }

  /**
   * Get gas prices for specified networks
   */
  async getGasPrices(network) {
    try {
      const results = {};

      if (network === 'ethereum') {
        results.ethereum = await this.getEthereumGasPrices();
      } else if (network === 'arbitrum') {
        results.arbitrum = await this.getArbitrumGasPrices();
      } else if (network === 'both') {
        // Fetch networks sequentially with delay to avoid API conflicts
        try {
          results.ethereum = await this.getEthereumGasPrices();
        } catch (error) {
          console.error('Error fetching Ethereum gas prices:', error);
          throw new Error(`Failed to fetch Ethereum gas prices: ${error.message}`);
        }

        // Delay between API calls since they use the same endpoint/key
        await new Promise(resolve => setTimeout(resolve, 2000));

        try {
          results.arbitrum = await this.getArbitrumGasPrices();
        } catch (error) {
          console.error('Error fetching Arbitrum gas prices:', error);
          throw new Error(`Failed to fetch Arbitrum gas prices: ${error.message}`);
        }
      }

      return results;
    } catch (error) {
      console.error('Error in getGasPrices:', error);
      throw error;
    }
  }

  /**
   * Handle gas prices request with intelligent formatting
   */
  async handleGetGasPrices(network = 'both', detail = 'standard') {
    try {
      const gasData = await this.getGasPrices(network);
      const formattedResponse = this.formatter.formatGasPrices(gasData, detail);
      
      return {
        content: [
          {
            type: 'text',
            text: formattedResponse
          }
        ]
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `Error fetching gas prices: ${error.message}`
          }
        ],
        isError: true
      };
    }
  }
}
