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

// Import services
import { GasPriceService } from './src/services/GasPriceService.js';
import { TokenPriceService } from './src/services/TokenPriceService.js';
import { BriqAnalyticsService } from './src/services/BriqAnalyticsService.js';
import { DeFiMarketService } from './src/services/DeFiMarketService.js';

// Load environment variables from both parent directory and hardhat directory
dotenv.config({ path: path.join(process.cwd(), '..', '.env.local') });
dotenv.config({ path: path.join(process.cwd(), '..', 'hardhat', '.env') });

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

    // Initialize services
    this.gasPriceService = new GasPriceService();
    this.tokenPriceService = new TokenPriceService();
    this.briqAnalyticsService = new BriqAnalyticsService();
    this.defiMarketService = new DeFiMarketService();

    this.setupToolHandlers();
    this.setupErrorHandling();
  }

  // Setup MCP tool handlers
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
          },
          {
            name: 'get_token_prices',
            description: 'Get current prices for supported tokens (ETH, USDC)',
            inputSchema: {
              type: 'object',
              properties: {}
            }
          },
          {
            name: 'get_gas_prices',
            description: 'Get current gas prices for Ethereum and/or Arbitrum with USD conversion',
            inputSchema: {
              type: 'object',
              properties: {
                network: {
                  type: 'string',
                  description: 'Network to get gas prices for',
                  enum: ['ethereum', 'arbitrum', 'both'],
                  default: 'both'
                },
                detail: {
                  type: 'string',
                  description: 'Level of detail in response',
                  enum: ['simple', 'standard', 'detailed'],
                  default: 'standard'
                }
              }
            }
          },
          {
            name: 'get_briq_tvl',
            description: 'Get current Briq protocol Total Value Locked (TVL) from deployed contracts',
            inputSchema: {
              type: 'object',
              properties: {}
            }
          },
          {
            name: 'get_briq_analytics',
            description: 'Get comprehensive Briq protocol analytics including TVL, APY, allocations, and rewards',
            inputSchema: {
              type: 'object',
              properties: {}
            }
          },
          {
            name: 'get_market_allocations',
            description: 'Get current token allocations across strategies (USDC/WETH distribution)',
            inputSchema: {
              type: 'object',
              properties: {}
            }
          },
          {
            name: 'get_strategy_rewards',
            description: 'Get detailed rewards breakdown from Aave and Compound strategies',
            inputSchema: {
              type: 'object',
              properties: {
                strategy: {
                  type: 'string',
                  description: 'Specific strategy to query (optional)',
                  enum: ['aave', 'compound', 'both'],
                  default: 'both'
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
            return await this.defiMarketService.handleGetMarketData(args);
          
          case 'get_best_yield':
            return await this.defiMarketService.handleGetBestYield(args?.token || 'USDC');
          
          case 'get_token_prices':
            return await this.tokenPriceService.handleGetTokenPrices();
          
          case 'get_gas_prices':
            return await this.gasPriceService.handleGetGasPrices(
              args?.network || 'both', 
              args?.detail || 'standard'
            );
          
          case 'get_briq_tvl':
            return await this.briqAnalyticsService.handleGetBriqTVL();
          
          case 'get_briq_analytics':
            return await this.briqAnalyticsService.handleGetBriqAnalytics();
          
          case 'get_market_allocations':
            return await this.briqAnalyticsService.handleGetMarketAllocations();
          
          case 'get_strategy_rewards':
            return await this.briqAnalyticsService.handleGetStrategyRewards(args?.strategy || 'both');
          
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

  // Handle market data request with filtering
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

    // Format market data for display
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

  // Find best yield opportunity for a token
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

  // Setup error handling
  setupErrorHandling() {
    this.server.onerror = (error) => {
      console.error('[MCP Error]', error);
    };

    process.on('SIGINT', async () => {
      await this.server.close();
      process.exit(0);
    });
  }

  // Start the MCP server
  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    // Server running on stdio
  }
}

// Initialize and start the server
const server = new RupertMCPServer();
server.run().catch(console.error);
