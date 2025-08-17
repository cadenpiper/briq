#!/usr/bin/env node

import dotenv from 'dotenv';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { request, gql } from 'graphql-request';
import { createPublicClient, http, formatUnits } from 'viem';
import { localhost } from 'viem/chains';
import { getContractAddresses } from '../src/app/utils/forkAddresses.js';
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

    // The Graph subgraph configuration for DeFi protocols
    this.SUBGRAPH_IDS = {
      AAVE_V3_ARB: "4xyasjQeREe7PxnF6wVdobZvCw5mhoHZq3T7guRpuNPf",
      COMPOUND_V3_ARB: "5MjRndNWGhqvNX7chUYLQDnvEgc8DaH8eisEkcJt71SR",
      AAVE_V3_ETH: "JCNWRypm7FYwV8fx5HhzZPSFaMxgkPuw4TnR3Gpi81zk",
      COMPOUND_V3_ETH: "AwoxEZbiWLvv6e3QdvdMZw4WDURdGbvPfHmZRc8Dpfz9"
    };

    // Etherscan API configuration (unified endpoint for all networks)
    this.ETHERSCAN_API_KEY = process.env.ETHERSCAN_API_KEY;
    this.ETHERSCAN_API_URL = 'https://api.etherscan.io/api';

    // Viem client for Briq contract interactions (same as frontend)
    this.viemClient = createPublicClient({
      chain: localhost,
      transport: http('http://localhost:8545')
    });

    // Import Briq contract addresses from frontend (same source of truth)
    this.BRIQ_CONTRACTS = getContractAddresses();

    // Basic BriqVault ABI for getTotalVaultValueInUSD function
    this.VAULT_ABI = [
      {
        "inputs": [],
        "name": "getTotalVaultValueInUSD",
        "outputs": [{"internalType": "uint256", "name": "totalUsdValue", "type": "uint256"}],
        "stateMutability": "view",
        "type": "function"
      }
    ];

    this.setupToolHandlers();
    this.setupErrorHandling();
  }

  // Get Briq protocol TVL from deployed contracts
  async getBriqTVL() {
    try {
      // Read getTotalVaultValueInUSD from BriqVault contract (same as frontend)
      const totalUsdValue = await this.viemClient.readContract({
        address: this.BRIQ_CONTRACTS.VAULT,
        abi: this.VAULT_ABI,
        functionName: 'getTotalVaultValueInUSD'
      });

      // Convert from wei to USD (totalUsdValue is already in USD with 18 decimals)
      const tvlUSD = parseFloat(formatUnits(totalUsdValue, 18));

      return {
        tvl: tvlUSD,
        totalUsdValue: totalUsdValue.toString(),
        vaultAddress: this.BRIQ_CONTRACTS.VAULT,
        timestamp: Date.now()
      };
    } catch (error) {
      console.error('Error fetching Briq TVL:', error);
      throw error;
    }
  }

  // Handle Briq TVL request
  async handleGetBriqTVL() {
    try {
      const data = await this.getBriqTVL();
      
      const tvlText = `Briq Protocol TVL:

Total Value Locked: $${data.tvl.toLocaleString('en-US', { 
  minimumFractionDigits: 2, 
  maximumFractionDigits: 2 
})}

Contract: ${data.vaultAddress}
Raw Value: ${data.totalUsdValue} wei
Last Updated: ${new Date(data.timestamp).toLocaleString()}

Data source: BriqVault contract on forked network`;

      return {
        content: [
          {
            type: 'text',
            text: tvlText
          }
        ]
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `Error fetching Briq TVL: ${error.message}

Make sure:
1. Hardhat node is running on localhost:8545
2. Briq contracts are deployed to the fork
3. Contract address is correct: ${this.BRIQ_CONTRACTS.VAULT}`
          }
        ],
        isError: true
      };
    }
  }

  // Generate The Graph subgraph URL with API key
  getSubgraphUrl(subgraphId) {
    const apiKey = process.env.NEXT_PUBLIC_GRAPHQL_API_KEY;
    if (!apiKey) {
      throw new Error("NEXT_PUBLIC_GRAPHQL_API_KEY not found in environment variables");
    }
    return `https://gateway.thegraph.com/api/${apiKey}/subgraphs/id/${subgraphId}`;
  }

  // Create GraphQL query for market data
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

  // Fetch data from Etherscan API (supports both Ethereum and Arbitrum via L2 parameter)
  async fetchFromEtherscan(network, params) {
    const url = new URL(this.ETHERSCAN_API_URL);
    
    // Add API key
    url.searchParams.append('apikey', this.ETHERSCAN_API_KEY);
    
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

  // Get current token prices (ETH from Etherscan, USDC as stablecoin)
  async getTokenPrices() {
    try {
      // Get ETH price from Etherscan
      const ethPriceData = await this.fetchFromEtherscan('ethereum', {
        module: 'stats',
        action: 'ethprice'
      });

      const ethPriceUSD = parseFloat(ethPriceData.ethusd);

      // USDC is a stablecoin pegged to $1
      const usdcPriceUSD = 1.00;

      return {
        ETH: {
          price_usd: ethPriceUSD,
          symbol: 'ETH',
          name: 'Ethereum'
        },
        USDC: {
          price_usd: usdcPriceUSD,
          symbol: 'USDC', 
          name: 'USD Coin'
        }
      };
    } catch (error) {
      console.error('Error fetching token prices:', error);
      throw error;
    }
  }

  // Get Ethereum gas prices with USD conversion
  async getEthereumGasPrices() {
    const ethGasData = await this.fetchFromEtherscan('ethereum', {
      module: 'gastracker',
      action: 'gasoracle'
    });

    const tokenPrices = await this.getTokenPrices();
    const ethPrice = tokenPrices.ETH.price_usd;

    return {
      safe_gas_price: parseFloat(ethGasData.SafeGasPrice),
      standard_gas_price: parseFloat(ethGasData.ProposeGasPrice),
      fast_gas_price: parseFloat(ethGasData.FastGasPrice),
      eth_price_usd: ethPrice,
      transfer_cost_usd: {
        safe: ((parseFloat(ethGasData.SafeGasPrice) * 21000) / 1e9) * ethPrice,
        standard: ((parseFloat(ethGasData.ProposeGasPrice) * 21000) / 1e9) * ethPrice,
        fast: ((parseFloat(ethGasData.FastGasPrice) * 21000) / 1e9) * ethPrice
      }
    };
  }

  // Get Arbitrum gas prices with USD conversion
  async getArbitrumGasPrices() {
    const arbGasData = await this.fetchFromEtherscan('arbitrum', {
      module: 'gastracker',
      action: 'gasoracle'
    });

    const tokenPrices = await this.getTokenPrices();
    const ethPrice = tokenPrices.ETH.price_usd;

    return {
      safe_gas_price: parseFloat(arbGasData.SafeGasPrice),
      standard_gas_price: parseFloat(arbGasData.ProposeGasPrice),
      fast_gas_price: parseFloat(arbGasData.FastGasPrice),
      eth_price_usd: ethPrice,
      transfer_cost_usd: {
        safe: ((parseFloat(arbGasData.SafeGasPrice) * 21000) / 1e9) * ethPrice,
        standard: ((parseFloat(arbGasData.ProposeGasPrice) * 21000) / 1e9) * ethPrice,
        fast: ((parseFloat(arbGasData.FastGasPrice) * 21000) / 1e9) * ethPrice
      }
    };
  }

  // Get gas prices for specified networks
  async getGasPrices(network) {
    try {
      const results = {};

      if (network === 'ethereum') {
        results.ethereum = await this.getEthereumGasPrices();
      } else if (network === 'arbitrum') {
        results.arbitrum = await this.getArbitrumGasPrices();
      } else if (network === 'both') {
        // Fetch both networks with delay to avoid rate limiting
        try {
          results.ethereum = await this.getEthereumGasPrices();
        } catch (error) {
          console.error('Error fetching Ethereum gas prices:', error);
        }

        // Add delay between API calls
        await new Promise(resolve => setTimeout(resolve, 1000));

        try {
          results.arbitrum = await this.getArbitrumGasPrices();
        } catch (error) {
          console.error('Error fetching Arbitrum gas prices:', error);
          // Provide fallback if Arbitrum fails but Ethereum succeeded
          if (results.ethereum) {
            const ethPrice = results.ethereum.eth_price_usd;
            const arbGasPrice = 0.1; // Typical Arbitrum gas price
            
            results.arbitrum = {
              safe_gas_price: arbGasPrice,
              standard_gas_price: arbGasPrice,
              fast_gas_price: arbGasPrice,
              eth_price_usd: ethPrice,
              transfer_cost_usd: {
                safe: ((arbGasPrice * 21000) / 1e9) * ethPrice,
                standard: ((arbGasPrice * 21000) / 1e9) * ethPrice,
                fast: ((arbGasPrice * 21000) / 1e9) * ethPrice
              },
              note: "Using fallback values - Arbitrum API unavailable"
            };
          }
        }

        // Ensure we have at least one result
        if (!results.ethereum && !results.arbitrum) {
          throw new Error('Failed to fetch gas prices for both networks');
        }
      }

      return results;
    } catch (error) {
      console.error('Error in getGasPrices:', error);
      throw error;
    }
  }

  // Query DeFi protocol markets from The Graph
  async queryProtocolMarkets(protocolName, subgraphId, tokenSymbol = "USDC") {
    try {
      const url = this.getSubgraphUrl(subgraphId);
      const query = this.createMarketQuery(tokenSymbol);
      const response = await request(url, query);
      const markets = response.markets;

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

  // Get all market data from supported protocols
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
          
          case 'get_token_prices':
            return await this.handleGetTokenPrices();
          
          case 'get_gas_prices':
            return await this.handleGetGasPrices(args?.network || 'both');
          
          case 'get_briq_tvl':
            return await this.handleGetBriqTVL();
          
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

  // Handle token prices request
  async handleGetTokenPrices() {
    const prices = await this.getTokenPrices();
    
    const priceText = Object.entries(prices).map(([symbol, data]) => {
      return `${data.name} (${symbol}): $${data.price_usd.toFixed(2)}`;
    }).join('\n');

    return {
      content: [
        {
          type: 'text',
          text: `Current Token Prices:\n\n${priceText}`
        }
      ]
    };
  }

  // Handle gas prices request
  async handleGetGasPrices(network) {
    const gasData = await this.getGasPrices(network);
    
    let gasText = 'Current Gas Prices:\n\n';
    
    Object.entries(gasData).forEach(([networkName, data]) => {
      const networkDisplay = networkName.charAt(0).toUpperCase() + networkName.slice(1);
      gasText += `${networkDisplay}:\n`;
      gasText += `  Safe: ${data.safe_gas_price} gwei ($${data.transfer_cost_usd.safe.toFixed(3)} for transfer)\n`;
      gasText += `  Standard: ${data.standard_gas_price} gwei ($${data.transfer_cost_usd.standard.toFixed(3)} for transfer)\n`;
      gasText += `  Fast: ${data.fast_gas_price} gwei ($${data.transfer_cost_usd.fast.toFixed(3)} for transfer)\n`;
      gasText += `  ETH Price: $${data.eth_price_usd.toFixed(2)}\n`;
      if (data.note) {
        gasText += `  Note: ${data.note}\n`;
      }
      gasText += '\n';
    });

    return {
      content: [
        {
          type: 'text',
          text: gasText.trim()
        }
      ]
    };
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
    console.error('Rupert MCP Server running on stdio');
  }
}

// Initialize and start the server
const server = new RupertMCPServer();
server.run().catch(console.error);
