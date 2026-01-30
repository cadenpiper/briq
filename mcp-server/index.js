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
import { validateToolArgs, ValidationError, TOOL_SCHEMAS } from './src/utils/validation.js';
import { logger } from './src/utils/logger.js';

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

    this.startTime = Date.now();
    
    // Initialize services with error handling
    this.initializeServices();
    this.setupToolHandlers();
    this.setupErrorHandling();
    this.setupGracefulShutdown();
  }

  initializeServices() {
    // Core services (required)
    try {
      this.tokenPriceService = new TokenPriceService();
    } catch (error) {
      logger.error('Failed to initialize TokenPriceService', { error: error.message });
      throw new Error('TokenPriceService is required. Please set COINMARKETCAP_API_KEY in .env.local');
    }

    try {
      this.gasPriceService = new GasPriceService(this.tokenPriceService);
    } catch (error) {
      logger.error('Failed to initialize GasPriceService', { error: error.message });
      throw new Error('GasPriceService is required. Please set ETHERSCAN_API_KEY in .env.local');
    }

    try {
      this.defiMarketService = new DeFiMarketService();
    } catch (error) {
      logger.error('Failed to initialize DeFiMarketService', { error: error.message });
      throw new Error('DeFiMarketService is required. Please set NEXT_PUBLIC_GRAPHQL_API_KEY in .env.local');
    }

    // Optional services (graceful degradation)
    try {
      this.briqAnalyticsService = new BriqAnalyticsService();
    } catch (error) {
      logger.warn('BriqAnalyticsService unavailable', { error: error.message });
      this.briqAnalyticsService = null;
    }

    try {
      this.strategyService = new StrategyService();
      this.autonomousOptimizer = new AutonomousOptimizer(this.strategyService, this.defiMarketService);
    } catch (error) {
      logger.warn('StrategyService/AutonomousOptimizer unavailable', { error: error.message, note: 'Set RUPERT_PRIVATE_KEY in hardhat/.env to enable' });
      this.strategyService = null;
      this.autonomousOptimizer = null;
    }
  }

  setupGracefulShutdown() {
    const shutdown = async (signal) => {
      logger.info('Shutting down gracefully', { signal });
      
      if (this.autonomousOptimizer) {
        this.autonomousOptimizer.stop();
      }
      
      process.exit(0);
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
  }

  handleHealthCheck() {
    const uptime = Math.floor((Date.now() - this.startTime) / 1000);
    
    const health = {
      status: 'healthy',
      uptime,
      timestamp: new Date().toISOString(),
      services: {
        tokenPriceService: this.tokenPriceService ? 'ok' : 'unavailable',
        gasPriceService: this.gasPriceService ? 'ok' : 'unavailable',
        defiMarketService: this.defiMarketService ? 'ok' : 'unavailable',
        briqAnalyticsService: this.briqAnalyticsService ? 'ok' : 'degraded',
        strategyService: this.strategyService?.isConfigured ? 'ok' : 'degraded',
        autonomousOptimizer: this.autonomousOptimizer?.isRunning ? 'running' : 'stopped'
      }
    };

    return {
      content: [{
        type: 'text',
        text: JSON.stringify(health, null, 2)
      }]
    };
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
          },
          {
            name: 'health_check',
            description: 'Check server health and service status',
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
        // Validate input arguments
        const validatedArgs = validateToolArgs(name, args, TOOL_SCHEMAS[name]);

        switch (name) {
          case 'get_market_data':
            return await this.defiMarketService.handleGetMarketData(validatedArgs);
          
          case 'get_token_prices':
            return await this.tokenPriceService.handleGetTokenPrices(validatedArgs?.tokens);
          
          case 'get_gas_prices':
            return await this.gasPriceService.handleGetGasPrices(validatedArgs?.networks);
          
          case 'get_detailed_gas_prices':
            return await this.gasPriceService.handleGetDetailedGasPrices(validatedArgs?.networks);
          
          case 'get_briq_data':
            if (!this.briqAnalyticsService) {
              return {
                content: [{
                  type: 'text',
                  text: 'Briq analytics unavailable. Requires local Hardhat node with deployed contracts.'
                }],
                isError: true
              };
            }
            return await this.briqAnalyticsService.handleGetBriqAnalytics();
          
          case 'get_current_strategies':
            if (!this.strategyService) {
              return {
                content: [{
                  type: 'text',
                  text: 'Strategy service unavailable. Requires RUPERT_PRIVATE_KEY in hardhat/.env'
                }],
                isError: true
              };
            }
            return await this.strategyService.handleGetCurrentStrategies();
          
          case 'optimize_strategies':
            if (!this.strategyService) {
              return {
                content: [{
                  type: 'text',
                  text: 'Strategy service unavailable. Requires RUPERT_PRIVATE_KEY in hardhat/.env'
                }],
                isError: true
              };
            }
            const marketData = await this.defiMarketService.getAllMarketData();
            return await this.strategyService.handleSetOptimalStrategies(marketData);
          
          case 'get_rupert_wallet_status':
            if (!this.strategyService) {
              return {
                content: [{
                  type: 'text',
                  text: 'Strategy service unavailable. Requires RUPERT_PRIVATE_KEY in hardhat/.env'
                }],
                isError: true
              };
            }
            return await this.strategyService.handleGetWalletStatus();
          
          case 'start_autonomous_optimization':
            if (!this.autonomousOptimizer) {
              return {
                content: [{
                  type: 'text',
                  text: 'Autonomous optimizer unavailable. Requires RUPERT_PRIVATE_KEY in hardhat/.env'
                }],
                isError: true
              };
            }
            this.autonomousOptimizer.start();
            return {
              content: [{
                type: 'text',
                text: 'Autonomous optimization started. Rupert will evaluate strategies every 5 minutes.'
              }]
            };
          
          case 'stop_autonomous_optimization':
            if (!this.autonomousOptimizer) {
              return {
                content: [{
                  type: 'text',
                  text: 'Autonomous optimizer unavailable.'
                }],
                isError: true
              };
            }
            this.autonomousOptimizer.stop();
            return {
              content: [{
                type: 'text',
                text: 'Autonomous optimization stopped.'
              }]
            };
          
          case 'get_optimization_status':
            if (!this.autonomousOptimizer) {
              return {
                content: [{
                  type: 'text',
                  text: 'Autonomous optimizer unavailable.'
                }],
                isError: true
              };
            }
            const status = this.autonomousOptimizer.getStatus();
            return {
              content: [{
                type: 'text',
                text: JSON.stringify(status, null, 2)
              }]
            };
          
          case 'health_check':
            return this.handleHealthCheck();
          
          default:
            throw new Error(`Unknown tool: ${name}`);
        }
      } catch (error) {
        // Handle validation errors with clear messages
        if (error instanceof ValidationError) {
          return {
            content: [{
              type: 'text',
              text: `Invalid input: ${error.message}`
            }],
            isError: true
          };
        }
        
        // Handle other errors
        return {
          content: [{
            type: 'text',
            text: `Error executing ${name}: ${error.message}`
          }],
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
    
    // Wait for strategy service to initialize before checking configuration
    if (this.strategyService) {
      await this.strategyService.ensureInitialized();
    }
    
    // Auto-start autonomous optimization if available
    if (this.autonomousOptimizer && this.strategyService?.isConfigured) {
      logger.info('Auto-starting Rupert autonomous optimization');
      try {
        this.autonomousOptimizer.start();
      } catch (error) {
        logger.error('Failed to start autonomous optimizer', { error: error.message });
        logger.info('Retrying in 30 seconds');
        setTimeout(() => {
          try {
            this.autonomousOptimizer.start();
          } catch (retryError) {
            logger.error('Retry failed', { error: retryError.message });
          }
        }, 30000);
      }
    } else {
      logger.warn('Autonomous optimization disabled', { reason: 'requires RUPERT_PRIVATE_KEY' });
    }
    
    // Server running on stdio
  }
}

// Initialize and start the server
const server = new RupertMCPServer();
server.run().catch(console.error);
