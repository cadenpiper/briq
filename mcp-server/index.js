#!/usr/bin/env node

import dotenv from 'dotenv';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import path from 'path';

// Import services
import { GasPriceService } from './src/services/GasPriceService.js';
import { TokenPriceService } from './src/services/TokenPriceService.js';
import { BriqAnalyticsService } from './src/services/BriqAnalyticsService.js';
import { DeFiMarketService } from './src/services/DeFiMarketService.js';
import { StrategyService } from './src/services/StrategyService.js';
import { AutonomousOptimizer } from './src/services/AutonomousOptimizer.js';

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
    this.strategyService = new StrategyService();
    this.autonomousOptimizer = new AutonomousOptimizer(this.strategyService, this.defiMarketService);

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
            name: 'get_token_prices',
            description: 'Get current prices for tokens. Can fetch single token or multiple tokens.',
            inputSchema: {
              type: 'object',
              properties: {
                tokens: {
                  type: 'array',
                  description: 'Array of token symbols to get prices for. If empty, returns all supported tokens.',
                  items: {
                    type: 'string',
                    enum: ['ETH', 'WETH', 'USDC']
                  }
                }
              }
            }
          },
          {
            name: 'get_gas_prices',
            description: 'Get current standard gas prices for networks',
            inputSchema: {
              type: 'object',
              properties: {
                networks: {
                  type: 'array',
                  description: 'Networks to get gas prices for. If empty, returns all networks.',
                  items: {
                    type: 'string',
                    enum: ['ethereum', 'arbitrum']
                  }
                }
              }
            }
          },
          {
            name: 'get_detailed_gas_prices',
            description: 'Get detailed gas prices with all tiers (safe, standard, fast)',
            inputSchema: {
              type: 'object',
              properties: {
                networks: {
                  type: 'array',
                  description: 'Networks to get detailed gas prices for. If empty, returns all networks.',
                  items: {
                    type: 'string',
                    enum: ['ethereum', 'arbitrum']
                  }
                }
              }
            }
          },
          {
            name: 'get_market_data',
            description: 'Get current DeFi market data from protocols. Returns raw data for AI reasoning.',
            inputSchema: {
              type: 'object',
              properties: {
                networks: {
                  type: 'array',
                  description: 'Networks to filter by (optional)',
                  items: {
                    type: 'string',
                    enum: ['Ethereum', 'Arbitrum One']
                  }
                },
                tokens: {
                  type: 'array',
                  description: 'Tokens to filter by (optional)',
                  items: {
                    type: 'string',
                    enum: ['USDC', 'WETH']
                  }
                },
                protocols: {
                  type: 'array',
                  description: 'Protocols to filter by (optional)',
                  items: {
                    type: 'string',
                    enum: ['Aave V3', 'Compound V3']
                  }
                }
              }
            }
          },
          {
            name: 'get_briq_data',
            description: 'Get Briq protocol analytics and performance data',
            inputSchema: {
              type: 'object',
              properties: {}
            }
          },
          {
            name: 'get_current_strategies',
            description: 'Get current strategy assignments and APYs for all tokens',
            inputSchema: {
              type: 'object',
              properties: {}
            }
          },
          {
            name: 'optimize_strategies',
            description: 'Analyze market data and set optimal strategies for all tokens',
            inputSchema: {
              type: 'object',
              properties: {}
            }
          },
          {
            name: 'get_rupert_wallet_status',
            description: 'Get Rupert wallet address, ETH balance, and network connection status',
            inputSchema: {
              type: 'object',
              properties: {}
            }
          },
          {
            name: 'start_autonomous_optimization',
            description: 'Start Rupert autonomous strategy optimization (every 5 minutes)',
            inputSchema: {
              type: 'object',
              properties: {}
            }
          },
          {
            name: 'stop_autonomous_optimization', 
            description: 'Stop Rupert autonomous strategy optimization',
            inputSchema: {
              type: 'object',
              properties: {}
            }
          },
          {
            name: 'get_optimization_status',
            description: 'Get status of autonomous optimization and last results',
            inputSchema: {
              type: 'object',
              properties: {}
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
          
          case 'get_token_prices':
            return await this.tokenPriceService.handleGetTokenPrices(args?.tokens);
          
          case 'get_gas_prices':
            return await this.gasPriceService.handleGetGasPrices(args?.networks);
          
          case 'get_detailed_gas_prices':
            return await this.gasPriceService.handleGetDetailedGasPrices(args?.networks);
          
          case 'get_briq_data':
            return await this.briqAnalyticsService.handleGetBriqAnalytics();
          
          case 'get_current_strategies':
            return await this.strategyService.handleGetCurrentStrategies();
          
          case 'optimize_strategies':
            const marketData = await this.defiMarketService.getAllMarketData();
            return await this.strategyService.handleSetOptimalStrategies(marketData);
          
          case 'get_rupert_wallet_status':
            return await this.strategyService.handleGetWalletStatus();
          
          case 'start_autonomous_optimization':
            this.autonomousOptimizer.start();
            return {
              content: [{
                type: 'text',
                text: 'Autonomous optimization started. Rupert will evaluate strategies every 5 minutes.'
              }]
            };
          
          case 'stop_autonomous_optimization':
            this.autonomousOptimizer.stop();
            return {
              content: [{
                type: 'text',
                text: 'Autonomous optimization stopped.'
              }]
            };
          
          case 'get_optimization_status':
            const status = this.autonomousOptimizer.getStatus();
            return {
              content: [{
                type: 'text',
                text: JSON.stringify(status, null, 2)
              }]
            };
          
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
    
    // Auto-start autonomous optimization if strategy service is configured
    if (this.strategyService.isConfigured) {
      console.log('🤖 Auto-starting Rupert autonomous optimization...');
      try {
        this.autonomousOptimizer.start();
      } catch (error) {
        console.error('❌ Failed to start autonomous optimizer:', error.message);
        console.log('🔄 Retrying in 30 seconds...');
        setTimeout(() => {
          try {
            this.autonomousOptimizer.start();
          } catch (retryError) {
            console.error('❌ Retry failed:', retryError.message);
          }
        }, 30000);
      }
    } else {
      console.log('⚠️ Strategy service not configured - autonomous optimization disabled');
    }
    
    // Server running on stdio
  }
}

// Initialize and start the server
const server = new RupertMCPServer();
server.run().catch(console.error);
