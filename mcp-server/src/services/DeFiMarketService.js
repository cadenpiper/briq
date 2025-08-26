import { GraphQLClient } from '../clients/GraphQLClient.js';
import { MarketDataFormatter } from '../formatters/MarketDataFormatter.js';

/**
 * Service for DeFi market data from The Graph protocol
 */
export class DeFiMarketService {
  constructor() {
    this.graphqlClient = new GraphQLClient();
    this.formatter = new MarketDataFormatter();
  }

  /**
   * Query DeFi protocol markets from The Graph
   */
  async queryProtocolMarkets(protocolName, subgraphId, tokenSymbol = "USDC") {
    try {
      const markets = await this.graphqlClient.queryMarkets(subgraphId, tokenSymbol);

      if (!markets || markets.length === 0) {
        return null;
      }

      // Find the market with highest lending rate
      let bestMarket = null;
      let highestRate = 0;

      for (const market of markets) {
        const lenderRate = market.rates[0];
        if (lenderRate) {
          const rate = parseFloat(lenderRate.rate);
          if (rate > highestRate) {
            highestRate = rate;
            bestMarket = {
              id: market.id,
              name: market.name,
              protocol: protocolName,
              token: tokenSymbol,
              apy: rate,
              tvl: parseFloat(market.totalDepositBalanceUSD),
              utilization: (parseFloat(market.totalBorrowBalanceUSD) / parseFloat(market.totalDepositBalanceUSD)) * 100,
              status: "Active"
            };
          }
        }
      }

      return bestMarket;
    } catch (error) {
      console.error(`Error querying ${protocolName} subgraph:`, error);
      return null;
    }
  }

  /**
   * Get all market data from supported protocols
   */
  async getAllMarketData() {
    const results = [];
    
    // Arbitrum markets
    const aaveArbUSDC = await this.queryProtocolMarkets("Aave V3", this.graphqlClient.SUBGRAPH_IDS.AAVE_V3_ARB, "USDC");
    if (aaveArbUSDC) {
      aaveArbUSDC.network = "Arbitrum One";
      results.push(aaveArbUSDC);
    }

    const aaveArbWETH = await this.queryProtocolMarkets("Aave V3", this.graphqlClient.SUBGRAPH_IDS.AAVE_V3_ARB, "WETH");
    if (aaveArbWETH) {
      aaveArbWETH.network = "Arbitrum One";
      results.push(aaveArbWETH);
    }

    const compoundArbUSDC = await this.queryProtocolMarkets("Compound V3", this.graphqlClient.SUBGRAPH_IDS.COMPOUND_V3_ARB, "USDC");
    if (compoundArbUSDC) {
      compoundArbUSDC.network = "Arbitrum One";
      results.push(compoundArbUSDC);
    }

    const compoundArbWETH = await this.queryProtocolMarkets("Compound V3", this.graphqlClient.SUBGRAPH_IDS.COMPOUND_V3_ARB, "WETH");
    if (compoundArbWETH) {
      compoundArbWETH.network = "Arbitrum One";
      results.push(compoundArbWETH);
    }

    // Ethereum markets
    const aaveEthUSDC = await this.queryProtocolMarkets("Aave V3", this.graphqlClient.SUBGRAPH_IDS.AAVE_V3_ETH, "USDC");
    if (aaveEthUSDC) {
      aaveEthUSDC.network = "Ethereum";
      results.push(aaveEthUSDC);
    }

    const aaveEthWETH = await this.queryProtocolMarkets("Aave V3", this.graphqlClient.SUBGRAPH_IDS.AAVE_V3_ETH, "WETH");
    if (aaveEthWETH) {
      aaveEthWETH.network = "Ethereum";
      results.push(aaveEthWETH);
    }

    const compoundEthUSDC = await this.queryProtocolMarkets("Compound V3", this.graphqlClient.SUBGRAPH_IDS.COMPOUND_V3_ETH, "USDC");
    if (compoundEthUSDC) {
      compoundEthUSDC.network = "Ethereum";
      results.push(compoundEthUSDC);
    }

    const compoundEthWETH = await this.queryProtocolMarkets("Compound V3", this.graphqlClient.SUBGRAPH_IDS.COMPOUND_V3_ETH, "WETH");
    if (compoundEthWETH) {
      compoundEthWETH.network = "Ethereum";
      results.push(compoundEthWETH);
    }

    return results;
  }

  /**
   * Handle market data request - returns raw data for AI reasoning
   */
  async handleGetMarketData(filters = {}) {
    try {
      const allMarkets = await this.getAllMarketData();
      
      // Apply filters
      let filteredMarkets = allMarkets;
      
      if (filters.networks && filters.networks.length > 0) {
        filteredMarkets = filteredMarkets.filter(m => filters.networks.includes(m.network));
      }
      
      if (filters.tokens && filters.tokens.length > 0) {
        filteredMarkets = filteredMarkets.filter(m => filters.tokens.includes(m.token));
      }
      
      if (filters.protocols && filters.protocols.length > 0) {
        filteredMarkets = filteredMarkets.filter(m => filters.protocols.includes(m.protocol));
      }

      if (filteredMarkets.length === 0) {
        return {
          content: [
            {
              type: 'text',
              text: 'No market data found matching the specified filters.'
            }
          ]
        };
      }

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(filteredMarkets, null, 2)
          }
        ]
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `Error fetching market data: ${error.message}`
          }
        ],
        isError: true
      };
    }
  }

  /**
   * Find best yield opportunity for a token
   */
  async handleGetBestYield(token) {
    try {
      const allMarkets = await this.getAllMarketData();
      const tokenMarkets = allMarkets.filter(m => m.token === token);
      
      if (tokenMarkets.length === 0) {
        return {
          content: [
            {
              type: 'text',
              text: `No market data found for ${token}.`
            }
          ]
        };
      }

      // Sort by APY descending
      tokenMarkets.sort((a, b) => b.apy - a.apy);
      
      return this.formatter.formatBestYield(tokenMarkets, token);
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `Error finding best yield: ${error.message}`
          }
        ],
        isError: true
      };
    }
  }
}
