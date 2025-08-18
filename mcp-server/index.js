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
import { readFileSync } from 'fs';
import path from 'path';

// Load ABIs from JSON files
const loadABI = (filename) => {
  const filePath = path.join(process.cwd(), '..', 'src', 'app', 'abis', filename);
  return JSON.parse(readFileSync(filePath, 'utf8')).abi;
};

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

    // Load ABIs from JSON files (same as frontend)
    this.VAULT_ABI = loadABI('BriqVault.json');
    this.STRATEGY_COORDINATOR_ABI = loadABI('StrategyCoordinator.json');
    this.PRICE_FEED_MANAGER_ABI = loadABI('PriceFeedManager.json');
    this.STRATEGY_AAVE_ABI = loadABI('StrategyAave.json');
    this.STRATEGY_COMPOUND_ABI = loadABI('StrategyCompoundComet.json');

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

  // Get comprehensive Briq analytics (same as analytics page)
  async getBriqAnalytics() {
    try {
      // Get TVL
      const tvlData = await this.getBriqTVL();
      
      // Get market allocations
      const marketData = await this.getMarketAllocations();
      
      // Calculate weighted average APY from market data
      const totalMarketValue = marketData.markets.reduce((sum, market) => sum + market.usdValue, 0);
      const weightedAverageAPY = totalMarketValue > 0 
        ? marketData.markets.reduce((sum, market) => {
            const weight = market.usdValue / totalMarketValue;
            return sum + (market.apy * weight);
          }, 0)
        : 0;

      // Get strategy rewards
      let rewardsData = { totalRewardsUSD: 0, aave: { totalUSD: 0 }, compound: { totalUSD: 0 } };
      try {
        rewardsData = await this.getStrategyRewards('both');
      } catch (error) {
        console.error('Error fetching rewards for analytics:', error);
        // Continue without rewards data
      }

      return {
        tvl: tvlData.tvl,
        weightedAverageAPY,
        totalRewards: rewardsData.totalRewardsUSD,
        marketAllocations: marketData.markets,
        aaveRewards: rewardsData.aave,
        compoundRewards: rewardsData.compound,
        timestamp: Date.now()
      };
    } catch (error) {
      console.error('Error fetching Briq analytics:', error);
      throw error;
    }
  }

  // Get market allocations (token distribution across strategies)
  async getMarketAllocations() {
    try {
      // Get supported tokens
      const supportedTokens = await this.viemClient.readContract({
        address: this.BRIQ_CONTRACTS.VAULT,
        abi: this.VAULT_ABI,
        functionName: 'getSupportedTokens'
      });

      const markets = [];
      
      for (const tokenAddress of supportedTokens) {
        // Get strategy balance for this token
        const balance = await this.viemClient.readContract({
          address: this.BRIQ_CONTRACTS.STRATEGY_COORDINATOR,
          abi: this.STRATEGY_COORDINATOR_ABI,
          functionName: 'getStrategyBalance',
          args: [tokenAddress]
        });

        // Get USD value of the balance
        const usdValue = balance > 0n ? await this.viemClient.readContract({
          address: this.BRIQ_CONTRACTS.PRICE_FEED_MANAGER,
          abi: this.PRICE_FEED_MANAGER_ABI,
          functionName: 'getTokenValueInUSD',
          args: [tokenAddress, balance]
        }) : 0n;

        // Get APY for this token
        const apyBasisPoints = await this.viemClient.readContract({
          address: this.BRIQ_CONTRACTS.STRATEGY_COORDINATOR,
          abi: this.STRATEGY_COORDINATOR_ABI,
          functionName: 'getStrategyAPY',
          args: [tokenAddress]
        });

        // Determine token symbol and strategy name
        const isUSDC = tokenAddress.toLowerCase() === this.BRIQ_CONTRACTS.USDC.toLowerCase();
        const isWETH = tokenAddress.toLowerCase() === this.BRIQ_CONTRACTS.WETH.toLowerCase();
        
        let tokenSymbol = 'UNKNOWN';
        let strategyName = 'Unknown';
        
        if (isUSDC) {
          tokenSymbol = 'USDC';
          strategyName = 'Aave';
        } else if (isWETH) {
          tokenSymbol = 'WETH';
          strategyName = 'Compound';
        }

        markets.push({
          tokenAddress,
          tokenSymbol,
          strategyName,
          balance: parseFloat(formatUnits(balance, isUSDC ? 6 : 18)),
          usdValue: parseFloat(formatUnits(usdValue, 18)),
          apy: Number(apyBasisPoints) / 100 // Convert basis points to percentage
        });
      }

      return { markets, timestamp: Date.now() };
    } catch (error) {
      console.error('Error fetching market allocations:', error);
      throw error;
    }
  }

  // Get strategy rewards (Aave and Compound) using same method as frontend
  async getStrategyRewards(strategy = 'both') {
    try {
      const results = {
        aave: { tokens: [], totalUSD: 0 },
        compound: { tokens: [], totalUSD: 0 },
        totalRewardsUSD: 0
      };

      if (strategy === 'aave' || strategy === 'both') {
        try {
          // Get all token analytics from Aave strategy (same as frontend)
          const [supportedTokens, analyticsArray] = await this.viemClient.readContract({
            address: this.BRIQ_CONTRACTS.STRATEGY_AAVE,
            abi: this.STRATEGY_AAVE_ABI,
            functionName: 'getAllTokenAnalytics'
          });

          // Process each token's rewards data
          for (let i = 0; i < supportedTokens.length; i++) {
            const tokenAddress = supportedTokens[i];
            const analytics = analyticsArray[i];
            
            const [
              currentBalance,
              totalDeposits,
              totalWithdrawals,
              netDeposits,
              accruedRewards,
              currentAPY
            ] = analytics;

            // Determine token details
            const isUSDC = tokenAddress.toLowerCase() === this.BRIQ_CONTRACTS.USDC?.toLowerCase();
            const isWETH = tokenAddress.toLowerCase() === this.BRIQ_CONTRACTS.WETH?.toLowerCase();
            
            let tokenSymbol = 'UNKNOWN';
            let decimals = 18;
            
            if (isUSDC) {
              tokenSymbol = 'USDC';
              decimals = 6;
            } else if (isWETH) {
              tokenSymbol = 'WETH';
              decimals = 18;
            }

            // Format the rewards amount
            const rewardsFormatted = parseFloat(formatUnits(accruedRewards, decimals));
            const currentBalanceFormatted = parseFloat(formatUnits(currentBalance, decimals));
            
            // Get USD value of rewards
            let rewardsUSD = 0;
            if (accruedRewards > 0n) {
              try {
                const rewardsUSDRaw = await this.viemClient.readContract({
                  address: this.BRIQ_CONTRACTS.PRICE_FEED_MANAGER,
                  abi: this.PRICE_FEED_MANAGER_ABI,
                  functionName: 'getTokenValueInUSD',
                  args: [tokenAddress, accruedRewards]
                });
                rewardsUSD = parseFloat(formatUnits(rewardsUSDRaw, 18));
              } catch (error) {
                console.error('Error getting USD value for Aave rewards:', error);
              }
            }

            const tokenData = {
              tokenSymbol,
              currentBalance: currentBalanceFormatted,
              accruedRewards: rewardsFormatted,
              rewardsUSD,
              currentAPY: Number(currentAPY) / 100 // Convert basis points to percentage
            };

            results.aave.tokens.push(tokenData);
            results.aave.totalUSD += rewardsUSD;
          }
        } catch (error) {
          console.error('Error fetching Aave rewards:', error);
        }
      }

      if (strategy === 'compound' || strategy === 'both') {
        try {
          // Get all token analytics from Compound strategy (same as frontend)
          const [supportedTokens, analyticsArray] = await this.viemClient.readContract({
            address: this.BRIQ_CONTRACTS.STRATEGY_COMPOUND,
            abi: this.STRATEGY_COMPOUND_ABI,
            functionName: 'getAllTokenAnalytics'
          });

          // Process each token's rewards data
          for (let i = 0; i < supportedTokens.length; i++) {
            const tokenAddress = supportedTokens[i];
            const analytics = analyticsArray[i];
            
            const [
              currentBalance,
              totalDeposits,
              totalWithdrawals,
              netDeposits,
              interestRewards,
              protocolRewards,
              currentAPY
            ] = analytics;

            // Determine token details
            const isUSDC = tokenAddress.toLowerCase() === this.BRIQ_CONTRACTS.USDC?.toLowerCase();
            const isWETH = tokenAddress.toLowerCase() === this.BRIQ_CONTRACTS.WETH?.toLowerCase();
            
            let tokenSymbol = 'UNKNOWN';
            let decimals = 18;
            
            if (isUSDC) {
              tokenSymbol = 'USDC';
              decimals = 6;
            } else if (isWETH) {
              tokenSymbol = 'WETH';
              decimals = 18;
            }

            // Format the rewards amounts
            const interestRewardsFormatted = parseFloat(formatUnits(interestRewards, decimals));
            const protocolRewardsFormatted = parseFloat(formatUnits(protocolRewards, 18)); // COMP has 18 decimals
            const currentBalanceFormatted = parseFloat(formatUnits(currentBalance, decimals));
            
            // Get USD value of interest rewards
            let interestRewardsUSD = 0;
            if (interestRewards > 0n) {
              try {
                const rewardsUSDRaw = await this.viemClient.readContract({
                  address: this.BRIQ_CONTRACTS.PRICE_FEED_MANAGER,
                  abi: this.PRICE_FEED_MANAGER_ABI,
                  functionName: 'getTokenValueInUSD',
                  args: [tokenAddress, interestRewards]
                });
                interestRewardsUSD = parseFloat(formatUnits(rewardsUSDRaw, 18));
              } catch (error) {
                console.error('Error getting USD value for Compound rewards:', error);
              }
            }

            const tokenData = {
              tokenSymbol,
              currentBalance: currentBalanceFormatted,
              interestRewards: interestRewardsFormatted,
              protocolRewards: protocolRewardsFormatted,
              interestRewardsUSD,
              currentAPY: Number(currentAPY) / 100 // Convert basis points to percentage
            };

            results.compound.tokens.push(tokenData);
            results.compound.totalUSD += interestRewardsUSD;
          }
        } catch (error) {
          console.error('Error fetching Compound rewards:', error);
        }
      }

      results.totalRewardsUSD = results.aave.totalUSD + results.compound.totalUSD;
      
      return { ...results, timestamp: Date.now() };
    } catch (error) {
      console.error('Error fetching strategy rewards:', error);
      throw error;
    }
  }

  // Handle comprehensive Briq analytics request
  async handleGetBriqAnalytics() {
    try {
      const data = await this.getBriqAnalytics();
      
      const analyticsText = `Briq Protocol Analytics:

OVERVIEW
Total Value Locked: $${data.tvl.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
Weighted Average APY: ${data.weightedAverageAPY.toFixed(2)}%
Total Rewards Earned: $${data.totalRewards.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}

MARKET ALLOCATIONS
${data.marketAllocations.map(market => {
  const totalValue = data.marketAllocations.reduce((sum, m) => sum + m.usdValue, 0);
  const allocation = totalValue > 0 ? (market.usdValue / totalValue * 100) : 0;
  return `• ${market.tokenSymbol} via ${market.strategyName}: $${market.usdValue.toFixed(2)} (${allocation.toFixed(1)}%) - ${market.apy.toFixed(2)}% APY`;
}).join('\n')}

STRATEGY REWARDS
Aave Strategy: $${data.aaveRewards.totalUSD.toFixed(2)} USD
${data.aaveRewards.tokens.map(token => 
  `  • ${token.tokenSymbol}: ${token.accruedRewards.toFixed(6)} tokens ($${token.rewardsUSD.toFixed(2)})`
).join('\n')}

Compound Strategy: $${data.compoundRewards.totalUSD.toFixed(2)} USD
${data.compoundRewards.tokens.map(token => 
  `  • ${token.tokenSymbol}: ${token.interestRewards.toFixed(6)} tokens + ${token.protocolRewards.toFixed(6)} COMP`
).join('\n')}

Last Updated: ${new Date(data.timestamp).toLocaleString()}
Data Source: Live contract data from forked network`;

      return {
        content: [
          {
            type: 'text',
            text: analyticsText
          }
        ]
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `Error fetching Briq analytics: ${error.message}

Make sure contracts are deployed and accessible.`
          }
        ],
        isError: true
      };
    }
  }

  // Handle market allocations request
  async handleGetMarketAllocations() {
    try {
      const data = await this.getMarketAllocations();
      const totalValue = data.markets.reduce((sum, market) => sum + market.usdValue, 0);
      
      const allocationsText = `Briq Market Allocations:

Total Portfolio Value: $${totalValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}

${data.markets.map(market => {
  const allocation = totalValue > 0 ? (market.usdValue / totalValue * 100) : 0;
  return `${market.tokenSymbol} Strategy (${market.strategyName})
  Balance: ${market.balance.toFixed(4)} ${market.tokenSymbol}
  USD Value: $${market.usdValue.toFixed(2)}
  Allocation: ${allocation.toFixed(1)}%
  Current APY: ${market.apy.toFixed(2)}%`;
}).join('\n\n')}

Last Updated: ${new Date(data.timestamp).toLocaleString()}`;

      return {
        content: [
          {
            type: 'text',
            text: allocationsText
          }
        ]
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `Error fetching market allocations: ${error.message}`
          }
        ],
        isError: true
      };
    }
  }

  // Handle strategy rewards request
  async handleGetStrategyRewards(strategy) {
    try {
      const data = await this.getStrategyRewards(strategy);
      
      let rewardsText = `Strategy Rewards Summary:\n\n`;
      
      if (strategy === 'aave' || strategy === 'both') {
        rewardsText += `🔵 AAVE STRATEGY REWARDS
Total: $${data.aave.totalUSD.toFixed(2)} USD

${data.aave.tokens.map(token => `${token.tokenSymbol} Rewards:
  • Current Balance: ${token.currentBalance.toFixed(4)} ${token.tokenSymbol}
  • Accrued Interest: ${token.accruedRewards.toFixed(6)} ${token.tokenSymbol}
  • USD Value: $${token.rewardsUSD.toFixed(2)}
  • Current APY: ${token.currentAPY.toFixed(2)}%`).join('\n\n')}`;
      }
      
      if (strategy === 'compound' || strategy === 'both') {
        if (strategy === 'both') rewardsText += '\n\n';
        rewardsText += `🟢 COMPOUND STRATEGY REWARDS
Total: $${data.compound.totalUSD.toFixed(2)} USD

${data.compound.tokens.map(token => {
  // Format COMP rewards with appropriate precision
  const compFormatted = token.protocolRewards < 0.000001 && token.protocolRewards > 0 
    ? token.protocolRewards.toExponential(2) 
    : token.protocolRewards.toFixed(8);
    
  return `${token.tokenSymbol} Rewards:
  • Current Balance: ${token.currentBalance.toFixed(4)} ${token.tokenSymbol}
  • Interest Rewards: ${token.interestRewards.toFixed(6)} ${token.tokenSymbol}
  • Protocol Rewards: ${compFormatted} COMP
  • USD Value: $${token.interestRewardsUSD.toFixed(2)}
  • Current APY: ${token.currentAPY.toFixed(2)}%`;
}).join('\n\n')}`;
      }
      
      if (strategy === 'both') {
        rewardsText += `\n\nTOTAL REWARDS: $${data.totalRewardsUSD.toFixed(2)} USD`;
      }
      
      rewardsText += `\n\nLast Updated: ${new Date(data.timestamp).toLocaleString()}`;

      return {
        content: [
          {
            type: 'text',
            text: rewardsText
          }
        ]
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `Error fetching strategy rewards: ${error.message}`
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

  // Get Ethereum gas prices with USD conversion using v2 API
  async getEthereumGasPrices() {
    try {
      // Use Etherscan v2 API with chainid=1 for Ethereum mainnet
      const response = await fetch(`https://api.etherscan.io/v2/api?chainid=1&module=proxy&action=eth_gasPrice&apikey=${this.ETHERSCAN_API_KEY}`);
      const data = await response.json();
      
      if (!data.result) {
        throw new Error(`Etherscan API error: ${data.message || 'No result'}`);
      }
      
      // Convert from wei to gwei
      const gasPriceWei = parseInt(data.result, 16);
      const gasPriceGwei = gasPriceWei / 1e9;
      
      const tokenPrices = await this.getTokenPrices();
      const ethPrice = tokenPrices.ETH.price_usd;

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

  // Get Arbitrum gas prices with USD conversion using v2 API
  async getArbitrumGasPrices() {
    try {
      // Use Etherscan v2 API with chainid=42161 for Arbitrum
      const response = await fetch(`https://api.etherscan.io/v2/api?chainid=42161&module=proxy&action=eth_gasPrice&apikey=${this.ETHERSCAN_API_KEY}`);
      const data = await response.json();
      
      if (!data.result) {
        throw new Error(`Etherscan API error: ${data.message || 'No result'}`);
      }
      
      // Convert from wei to gwei
      const gasPriceWei = parseInt(data.result, 16);
      const gasPriceGwei = gasPriceWei / 1e9;
      
      const tokenPrices = await this.getTokenPrices();
      const ethPrice = tokenPrices.ETH.price_usd;

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

  // Get gas prices for specified networks
  async getGasPrices(network) {
    try {
      const results = {};

      if (network === 'ethereum') {
        results.ethereum = await this.getEthereumGasPrices();
      } else if (network === 'arbitrum') {
        results.arbitrum = await this.getArbitrumGasPrices();
      } else if (network === 'both') {
        // Fetch networks sequentially with longer delays to avoid API conflicts
        try {
          results.ethereum = await this.getEthereumGasPrices();
        } catch (error) {
          console.error('Error fetching Ethereum gas prices:', error);
          throw new Error(`Failed to fetch Ethereum gas prices: ${error.message}`);
        }

        // Longer delay between API calls since they use the same endpoint/key
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
            return await this.getMarketData(args);
          
          case 'get_best_yield':
            return await this.getBestYield(args?.token || 'USDC');
          
          case 'get_token_prices':
            return await this.handleGetTokenPrices();
          
          case 'get_gas_prices':
            return await this.handleGetGasPrices(args?.network || 'both');
          
          case 'get_briq_tvl':
            return await this.handleGetBriqTVL();
          
          case 'get_briq_analytics':
            return await this.handleGetBriqAnalytics();
          
          case 'get_market_allocations':
            return await this.handleGetMarketAllocations();
          
          case 'get_strategy_rewards':
            return await this.handleGetStrategyRewards(args?.strategy || 'both');
          
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
    // Server running on stdio
  }
}

// Initialize and start the server
const server = new RupertMCPServer();
server.run().catch(console.error);
