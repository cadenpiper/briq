import { EtherscanClient } from '../clients/EtherscanClient.js';
import { TokenPriceService } from './TokenPriceService.js';
import { GasPriceFormatter } from '../formatters/GasPriceFormatter.js';
import { createErrorResponse } from '../utils/errorResponse.js';

// Constants
const GAS_CONSTANTS = {
  STANDARD_TRANSFER_GAS: 21000,
  WEI_TO_GWEI: 1e9,
  GWEI_TO_ETH: 1e9,
  ETHEREUM_MULTIPLIERS: {
    STANDARD: 1.1,
    FAST: 1.2
  },
  ARBITRUM_MULTIPLIERS: {
    STANDARD: 1.05,
    FAST: 1.1
  }
};

/**
 * Service for fetching and processing gas price data from multiple networks
 */
export class GasPriceService {
  constructor(tokenPriceService) {
    this.etherscanClient = new EtherscanClient();
    this.tokenPriceService = tokenPriceService;
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
      const gasPriceGwei = gasPriceWei / GAS_CONSTANTS.WEI_TO_GWEI;
      
      return {
        safe_gas_price: gasPriceGwei,
        standard_gas_price: gasPriceGwei * GAS_CONSTANTS.ETHEREUM_MULTIPLIERS.STANDARD,
        fast_gas_price: gasPriceGwei * GAS_CONSTANTS.ETHEREUM_MULTIPLIERS.FAST,
        eth_price_usd: ethPrice,
        transfer_cost_usd: {
          safe: ((gasPriceGwei * GAS_CONSTANTS.STANDARD_TRANSFER_GAS) / GAS_CONSTANTS.GWEI_TO_ETH) * ethPrice,
          standard: ((gasPriceGwei * GAS_CONSTANTS.ETHEREUM_MULTIPLIERS.STANDARD * GAS_CONSTANTS.STANDARD_TRANSFER_GAS) / GAS_CONSTANTS.GWEI_TO_ETH) * ethPrice,
          fast: ((gasPriceGwei * GAS_CONSTANTS.ETHEREUM_MULTIPLIERS.FAST * GAS_CONSTANTS.STANDARD_TRANSFER_GAS) / GAS_CONSTANTS.GWEI_TO_ETH) * ethPrice
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
      const gasPriceGwei = gasPriceWei / GAS_CONSTANTS.WEI_TO_GWEI;
      
      return {
        safe_gas_price: gasPriceGwei,
        standard_gas_price: gasPriceGwei * GAS_CONSTANTS.ARBITRUM_MULTIPLIERS.STANDARD,
        fast_gas_price: gasPriceGwei * GAS_CONSTANTS.ARBITRUM_MULTIPLIERS.FAST,
        eth_price_usd: ethPrice,
        transfer_cost_usd: {
          safe: ((gasPriceGwei * GAS_CONSTANTS.STANDARD_TRANSFER_GAS) / GAS_CONSTANTS.GWEI_TO_ETH) * ethPrice,
          standard: ((gasPriceGwei * GAS_CONSTANTS.ARBITRUM_MULTIPLIERS.STANDARD * GAS_CONSTANTS.STANDARD_TRANSFER_GAS) / GAS_CONSTANTS.GWEI_TO_ETH) * ethPrice,
          fast: ((gasPriceGwei * GAS_CONSTANTS.ARBITRUM_MULTIPLIERS.FAST * GAS_CONSTANTS.STANDARD_TRANSFER_GAS) / GAS_CONSTANTS.GWEI_TO_ETH) * ethPrice
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
    const results = {};

    if (network === 'ethereum') {
      results.ethereum = await this.getEthereumGasPrices();
    } else if (network === 'arbitrum') {
      results.arbitrum = await this.getArbitrumGasPrices();
    } else if (network === 'both') {
      results.ethereum = await this.getEthereumGasPrices();
      results.arbitrum = await this.getArbitrumGasPrices();
    }

    return results;
  }

  /**
   * Handle gas prices request - returns formatted response based on request context
   */
  async handleGetGasPrices(requestedNetworks = []) {
    try {
      let networks = requestedNetworks;
      
      // If no networks specified, return both
      if (!networks || networks.length === 0) {
        networks = ['ethereum', 'arbitrum'];
      }

      const results = {};

      for (const network of networks) {
        if (network === 'ethereum') {
          results.ethereum = await this.getEthereumGasPrices();
        } else if (network === 'arbitrum') {
          results.arbitrum = await this.getArbitrumGasPrices();
        }
      }

      // Format the response naturally
      const formattedResponse = this.formatter.formatGasPrices(results, 'simple');

      return {
        content: [
          {
            type: 'text',
            text: formattedResponse
          }
        ]
      };
    } catch (error) {
      return createErrorResponse(error, { tool: 'get_gas_prices' });
    }
  }

  /**
   * Handle detailed gas prices request - shows all tiers when specifically requested
   */
  async handleGetDetailedGasPrices(requestedNetworks = []) {
    try {
      let networks = requestedNetworks;
      
      if (!networks || networks.length === 0) {
        networks = ['ethereum', 'arbitrum'];
      }

      const results = {};

      for (const network of networks) {
        if (network === 'ethereum') {
          results.ethereum = await this.getEthereumGasPrices();
        } else if (network === 'arbitrum') {
          results.arbitrum = await this.getArbitrumGasPrices();
        }
      }

      // Format the detailed response
      const formattedResponse = this.formatter.formatGasPrices(results, 'detailed');

      return {
        content: [
          {
            type: 'text',
            text: formattedResponse
          }
        ]
      };
    } catch (error) {
      return createErrorResponse(error, { tool: 'get_detailed_gas_prices' });
    }
  }
}
