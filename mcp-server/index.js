#!/usr/bin/env node

import dotenv from 'dotenv';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { request, gql } from 'graphql-request';
import path from 'path';

// Load environment variables from parent directory
dotenv.config({ path: path.join(process.cwd(), '..', '.env.local') });

class RupertMCPServer {
  constructor() {
    this.server = new Server(
      {
        name: 'rupert-mcp-server',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    // Subgraph configuration
    this.SUBGRAPH_IDS = {
      AAVE_V3_ARB: "4xyasjQeREe7PxnF6wVdobZvCw5mhoHZq3T7guRpuNPf",
      COMPOUND_V3_ARB: "5MjRndNWGhqvNX7chUYLQDnvEgc8DaH8eisEkcJt71SR",
      AAVE_V3_ETH: "JCNWRypm7FYwV8fx5HhzZPSFaMxgkPuw4TnR3Gpi81zk",
      COMPOUND_V3_ETH: "AwoxEZbiWLvv6e3QdvdMZw4WDURdGbvPfHmZRc8Dpfz9"
    };

    this.setupToolHandlers();
    this.setupErrorHandling();
  }

  getSubgraphUrl(subgraphId) {
    const apiKey = process.env.NEXT_PUBLIC_GRAPHQL_API_KEY;
    if (!apiKey) {
      throw new Error("NEXT_PUBLIC_GRAPHQL_API_KEY not found in environment variables");
    }
    return `https://gateway.thegraph.com/api/${apiKey}/subgraphs/id/${subgraphId}`;
  }

  createMarketQuery(tokenSymbol) {
    return gql`
      {
        markets(where: { inputToken_: { symbol: "${tokenSymbol}" } }) {
          id
          name
          inputToken {
            symbol
          }
          totalDepositBalanceUSD
          totalBorrowBalanceUSD
          rates(where: { side: LENDER }) {
            rate
          }
        }
      }
    `;
  }

  async queryProtocolMarkets(protocolName, subgraphId, tokenSymbol = "USDC") {
    try {
      const url = this.getSubgraphUrl(subgraphId);
      const query = this.createMarketQuery(tokenSymbol);
      const response = await request(url, query);
      const markets = response.markets;

      if (!markets || markets.length === 0) {
        return null;
      }

      // Find the best market (highest lending rate)
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

  async getAllMarketData() {
    const results = [];
    
    // Arbitrum markets
    const aaveArbUSDC = await this.queryProtocolMarkets("Aave V3", this.SUBGRAPH_IDS.AAVE_V3_ARB, "USDC");
    if (aaveArbUSDC) {
      aaveArbUSDC.network = "Arbitrum One";
      results.push(aaveArbUSDC);
    }

    const aaveArbWETH = await this.queryProtocolMarkets("Aave V3", this.SUBGRAPH_IDS.AAVE_V3_ARB, "WETH");
    if (aaveArbWETH) {
      aaveArbWETH.network = "Arbitrum One";
      results.push(aaveArbWETH);
    }

    const compoundArbUSDC = await this.queryProtocolMarkets("Compound V3", this.SUBGRAPH_IDS.COMPOUND_V3_ARB, "USDC");
    if (compoundArbUSDC) {
      compoundArbUSDC.network = "Arbitrum One";
      results.push(compoundArbUSDC);
    }

    const compoundArbWETH = await this.queryProtocolMarkets("Compound V3", this.SUBGRAPH_IDS.COMPOUND_V3_ARB, "WETH");
    if (compoundArbWETH) {
      compoundArbWETH.network = "Arbitrum One";
      results.push(compoundArbWETH);
    }

    // Ethereum markets
    const aaveEthUSDC = await this.queryProtocolMarkets("Aave V3", this.SUBGRAPH_IDS.AAVE_V3_ETH, "USDC");
    if (aaveEthUSDC) {
      aaveEthUSDC.network = "Ethereum";
      results.push(aaveEthUSDC);
    }

    const aaveEthWETH = await this.queryProtocolMarkets("Aave V3", this.SUBGRAPH_IDS.AAVE_V3_ETH, "WETH");
    if (aaveEthWETH) {
      aaveEthWETH.network = "Ethereum";
      results.push(aaveEthWETH);
    }

    const compoundEthUSDC = await this.queryProtocolMarkets("Compound V3", this.SUBGRAPH_IDS.COMPOUND_V3_ETH, "USDC");
    if (compoundEthUSDC) {
      compoundEthUSDC.network = "Ethereum";
      results.push(compoundEthUSDC);
    }

    const compoundEthWETH = await this.queryProtocolMarkets("Compound V3", this.SUBGRAPH_IDS.COMPOUND_V3_ETH, "WETH");
    if (compoundEthWETH) {
      compoundEthWETH.network = "Ethereum";
      results.push(compoundEthWETH);
    }

    return results;
  }

  setupToolHandlers() {
    // List available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: [
          {
            name: 'get_market_data',
            description: 'Get current DeFi market data from Aave V3 and Compound V3 protocols',
            inputSchema: {
              type: 'object',
              properties: {
                network: {
                  type: 'string',
                  description: 'Network to filter by (optional)',
                  enum: ['Ethereum', 'Arbitrum One']
                },
                token: {
                  type: 'string',
                  description: 'Token to filter by (optional)',
                  enum: ['USDC', 'WETH']
                },
                protocol: {
                  type: 'string',
                  description: 'Protocol to filter by (optional)',
                  enum: ['Aave V3', 'Compound V3']
                }
              }
            }
          },
          {
            name: 'get_best_yield',
            description: 'Find the best yield opportunities for a specific token',
            inputSchema: {
              type: 'object',
              properties: {
                token: {
                  type: 'string',
                  description: 'Token to find best yield for',
                  enum: ['USDC', 'WETH'],
                  default: 'USDC'
                }
              }
            }
          }
        ]
      };
    });

    // Handle tool calls
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        switch (name) {
          case 'get_market_data':
            return await this.getMarketData(args);
          
          case 'get_best_yield':
            return await this.getBestYield(args?.token || 'USDC');
          
          default:
            throw new Error(`Unknown tool: ${name}`);
        }
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error executing ${name}: ${error.message}`
            }
          ],
          isError: true
        };
      }
    });
  }

  async getMarketData(filters = {}) {
    const allMarkets = await this.getAllMarketData();
    
    // Apply filters
    let filteredMarkets = allMarkets;
    
    if (filters.network) {
      filteredMarkets = filteredMarkets.filter(m => m.network === filters.network);
    }
    
    if (filters.token) {
      filteredMarkets = filteredMarkets.filter(m => m.token === filters.token);
    }
    
    if (filters.protocol) {
      filteredMarkets = filteredMarkets.filter(m => m.protocol === filters.protocol);
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

    // Format the data for display - rates are already in percentage format
    const marketText = filteredMarkets.map(market => {
      const apy = market.apy.toFixed(2);
      const tvl = (market.tvl / 1000000).toFixed(1);
      const utilization = market.utilization.toFixed(1);
      
      return `${market.protocol} - ${market.token} (${market.network}):\n  APY: ${apy}%\n  TVL: $${tvl}M\n  Utilization: ${utilization}%`;
    }).join('\n\n');

    return {
      content: [
        {
          type: 'text',
          text: `Current Market Data:\n\n${marketText}`
        }
      ]
    };
  }

  async getBestYield(token) {
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
    
    const bestMarket = tokenMarkets[0];
    const apy = bestMarket.apy.toFixed(2);
    const tvl = (bestMarket.tvl / 1000000).toFixed(1);
    
    const comparison = tokenMarkets.slice(0, 3).map((market, index) => {
      const marketApy = market.apy.toFixed(2);
      const rank = index === 0 ? '🥇' : index === 1 ? '🥈' : '🥉';
      return `${rank} ${market.protocol} (${market.network}): ${marketApy}% APY`;
    }).join('\n');

    return {
      content: [
        {
          type: 'text',
          text: `Best ${token} Yield Opportunity:\n\n${bestMarket.protocol} on ${bestMarket.network}\nAPY: ${apy}%\nTVL: $${tvl}M\n\nTop 3 Options:\n${comparison}`
        }
      ]
    };
  }

  setupErrorHandling() {
    this.server.onerror = (error) => {
      console.error('[MCP Error]', error);
    };

    process.on('SIGINT', async () => {
      await this.server.close();
      process.exit(0);
    });
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('Rupert MCP Server running on stdio');
  }
}

// Start the server
const server = new RupertMCPServer();
server.run().catch(console.error);
