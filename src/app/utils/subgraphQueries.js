import { request, gql } from "graphql-request";

// SUBGRAPH ENDPOINTS - Based on your reference file
// You'll need to add NEXT_PUBLIC_GRAPHQL_API_KEY to your .env.local file
const getSubgraphUrl = (subgraphId) => {
  const apiKey = process.env.NEXT_PUBLIC_GRAPHQL_API_KEY;
  if (!apiKey) {
    console.warn("NEXT_PUBLIC_GRAPHQL_API_KEY not found in environment variables");
    return null;
  }
  return `https://gateway.thegraph.com/api/${apiKey}/subgraphs/id/${subgraphId}`;
};

// Subgraph IDs for different networks
const SUBGRAPH_IDS = {
  // Arbitrum (confirmed working)
  AAVE_V3_ARB: "4xyasjQeREe7PxnF6wVdobZvCw5mhoHZq3T7guRpuNPf",
  COMPOUND_V3_ARB: "5MjRndNWGhqvNX7chUYLQDnvEgc8DaH8eisEkcJt71SR",
  
  // Ethereum (confirmed working)
  AAVE_V3_ETH: "JCNWRypm7FYwV8fx5HhzZPSFaMxgkPuw4TnR3Gpi81zk",
  COMPOUND_V3_ETH: "AwoxEZbiWLvv6e3QdvdMZw4WDURdGbvPfHmZRc8Dpfz9"
};

// Base query structure from your reference - queries markets for a specific token
const createMarketQuery = (tokenSymbol) => gql`
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

// Historical data query
const createHistoricalQuery = (marketId, days = 30) => gql`
  {
    marketDailySnapshots(
      first: ${days}
      orderBy: timestamp
      orderDirection: desc
      where: { market: "${marketId}" }
    ) {
      timestamp
      totalDepositBalanceUSD
      totalBorrowBalanceUSD
      rates(where: { side: LENDER }) {
        rate
      }
    }
  }
`;

/**
 * Utility function to split Compound market ID (from your reference file)
 * @param {string} marketId - The compound market ID
 * @returns {object|null} Object with cometAddress and tokenAddress, or null if invalid
 */
export function splitCompoundMarketId(marketId) {
  if (!marketId || !marketId.startsWith("0x") || marketId.length < 82) {
    return null;
  }

  const cometAddress = marketId.slice(0, 42);
  const tokenAddress = "0x" + marketId.slice(-40);

  // Basic address validation (you might want to add ethers.js for proper validation)
  if (cometAddress.length !== 42 || tokenAddress.length !== 42) {
    return null;
  }

  return { cometAddress, tokenAddress };
}

/**
 * Query historical data for a specific market
 * @param {string} protocolName - Name of the protocol
 * @param {string} subgraphId - The subgraph ID
 * @param {string} marketId - Market ID to query
 * @param {number} days - Number of days of history to fetch
 * @returns {Promise<Array|null>} Historical data array or null if error
 */
export async function queryHistoricalData(protocolName, subgraphId, marketId, days = 30) {
  try {
    const url = getSubgraphUrl(subgraphId);
    if (!url) {
      console.error(`Cannot construct subgraph URL for ${protocolName} - missing API key`);
      return null;
    }

    const query = createHistoricalQuery(marketId, days);
    const response = await request(url, query);
    const snapshots = response.marketDailySnapshots;

    if (!snapshots || snapshots.length === 0) {
      console.log(`No historical data found for ${protocolName} market ${marketId}`);
      return null;
    }

    // Transform data for charts
    return snapshots.reverse().map(snapshot => ({
      date: new Date(parseInt(snapshot.timestamp) * 1000).toISOString().split('T')[0],
      tvl: parseFloat(snapshot.totalDepositBalanceUSD),
      apy: snapshot.rates[0] ? parseFloat(snapshot.rates[0].rate) : 0,
      utilization: snapshot.totalDepositBalanceUSD > 0 
        ? (parseFloat(snapshot.totalBorrowBalanceUSD) / parseFloat(snapshot.totalDepositBalanceUSD)) * 100 
        : 0
    }));
  } catch (error) {
    console.error(`Error querying historical data for ${protocolName}:`, error);
    return null;
  }
}

/**
 * Query a specific protocol's subgraph for market data
 * @param {string} protocolName - Name of the protocol (for logging)
 * @param {string} subgraphId - The subgraph ID
 * @param {string} tokenSymbol - Token symbol to query (e.g., "USDC")
 * @param {boolean} isCompound - Whether this is a Compound protocol
 * @returns {Promise<object|null>} Market data or null if error/no data
 */
export async function queryProtocolMarkets(protocolName, subgraphId, tokenSymbol = "USDC", isCompound = false) {
  try {
    const url = getSubgraphUrl(subgraphId);
    if (!url) {
      console.error(`Cannot construct subgraph URL for ${protocolName} - missing API key`);
      return null;
    }

    const query = createMarketQuery(tokenSymbol);
    const response = await request(url, query);
    const markets = response.markets;

    if (!markets || markets.length === 0) {
      console.log(`No market data found for ${protocolName} ${tokenSymbol}.`);
      return null;
    }

    // Find the best market (highest lending rate) - logic from your reference
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
            apyValue: rate,
            tvlValue: parseFloat(market.totalDepositBalanceUSD),
            utilizationValue: (parseFloat(market.totalBorrowBalanceUSD) / parseFloat(market.totalDepositBalanceUSD)) * 100,
            status: "Active" // You might want to determine this based on other factors
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
 * Get historical data for all supported protocols
 * @param {number} days - Number of days of history to fetch
 * @returns {Promise<Object>} Object with historical data by protocol and token
 */
export async function getAllHistoricalData(days = 30) {
  const results = {};
  
  // Get current markets first to get market IDs
  const currentMarkets = await getAllMarketData();
  
  for (const market of currentMarkets) {
    const key = `${market.protocol}_${market.network}_${market.token}`;
    let subgraphId;
    
    // Map to correct subgraph ID
    if (market.protocol === "Aave V3" && market.network === "Arbitrum One") {
      subgraphId = SUBGRAPH_IDS.AAVE_V3_ARB;
    } else if (market.protocol === "Aave V3" && market.network === "Ethereum") {
      subgraphId = SUBGRAPH_IDS.AAVE_V3_ETH;
    } else if (market.protocol === "Compound V3" && market.network === "Arbitrum One") {
      subgraphId = SUBGRAPH_IDS.COMPOUND_V3_ARB;
    } else if (market.protocol === "Compound V3" && market.network === "Ethereum") {
      subgraphId = SUBGRAPH_IDS.COMPOUND_V3_ETH;
    }
    
    if (subgraphId && market.id) {
      const historicalData = await queryHistoricalData(market.protocol, subgraphId, market.id, days);
      if (historicalData) {
        results[key] = {
          protocol: market.protocol,
          network: market.network,
          token: market.token,
          data: historicalData
        };
      }
    }
  }
  
  return results;
}

/**
 * Get market data for all supported protocols and tokens
 * @returns {Promise<Array>} Array of market data objects
 */
export async function getAllMarketData() {
  const results = [];
  
  // === ARBITRUM MARKETS ===
  
  // Aave V3 on Arbitrum - USDC
  const aaveArbUSDC = await queryProtocolMarkets("Aave V3", SUBGRAPH_IDS.AAVE_V3_ARB, "USDC", false);
  if (aaveArbUSDC) {
    aaveArbUSDC.network = "Arbitrum One";
    results.push(aaveArbUSDC);
  }

  // Aave V3 on Arbitrum - WETH
  const aaveArbWETH = await queryProtocolMarkets("Aave V3", SUBGRAPH_IDS.AAVE_V3_ARB, "WETH", false);
  if (aaveArbWETH) {
    aaveArbWETH.network = "Arbitrum One";
    results.push(aaveArbWETH);
  }

  // Compound V3 on Arbitrum - USDC
  const compoundArbUSDC = await queryProtocolMarkets("Compound V3", SUBGRAPH_IDS.COMPOUND_V3_ARB, "USDC", true);
  if (compoundArbUSDC) {
    compoundArbUSDC.network = "Arbitrum One";
    results.push(compoundArbUSDC);
  }

  // Compound V3 on Arbitrum - WETH
  const compoundArbWETH = await queryProtocolMarkets("Compound V3", SUBGRAPH_IDS.COMPOUND_V3_ARB, "WETH", true);
  if (compoundArbWETH) {
    compoundArbWETH.network = "Arbitrum One";
    results.push(compoundArbWETH);
  }

  // === ETHEREUM MARKETS ===

  // Aave V3 on Ethereum - USDC
  const aaveEthUSDC = await queryProtocolMarkets("Aave V3", SUBGRAPH_IDS.AAVE_V3_ETH, "USDC", false);
  if (aaveEthUSDC) {
    aaveEthUSDC.network = "Ethereum";
    results.push(aaveEthUSDC);
  }

  // Aave V3 on Ethereum - WETH
  const aaveEthWETH = await queryProtocolMarkets("Aave V3", SUBGRAPH_IDS.AAVE_V3_ETH, "WETH", false);
  if (aaveEthWETH) {
    aaveEthWETH.network = "Ethereum";
    results.push(aaveEthWETH);
  }

  // Compound V3 on Ethereum - USDC
  const compoundEthUSDC = await queryProtocolMarkets("Compound V3", SUBGRAPH_IDS.COMPOUND_V3_ETH, "USDC", true);
  if (compoundEthUSDC) {
    compoundEthUSDC.network = "Ethereum";
    results.push(compoundEthUSDC);
  }

  // Compound V3 on Ethereum - WETH
  const compoundEthWETH = await queryProtocolMarkets("Compound V3", SUBGRAPH_IDS.COMPOUND_V3_ETH, "WETH", true);
  if (compoundEthWETH) {
    compoundEthWETH.network = "Ethereum";
    results.push(compoundEthWETH);
  }

  // console.log(`Fetched ${results.length} markets from Ethereum and Arbitrum`);
  return results;
}
