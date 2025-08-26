import { request, gql } from 'graphql-request';

/**
 * Client for The Graph GraphQL API interactions
 */
export class GraphQLClient {
  constructor() {
    // The Graph subgraph configuration for DeFi protocols
    this.SUBGRAPH_IDS = {
      AAVE_V3_ARB: "4xyasjQeREe7PxnF6wVdobZvCw5mhoHZq3T7guRpuNPf",
      COMPOUND_V3_ARB: "5MjRndNWGhqvNX7chUYLQDnvEgc8DaH8eisEkcJt71SR",
      AAVE_V3_ETH: "JCNWRypm7FYwV8fx5HhzZPSFaMxgkPuw4TnR3Gpi81zk",
      COMPOUND_V3_ETH: "AwoxEZbiWLvv6e3QdvdMZw4WDURdGbvPfHmZRc8Dpfz9"
    };

    this.apiKey = process.env.NEXT_PUBLIC_GRAPHQL_API_KEY;
    if (!this.apiKey) {
      throw new Error("NEXT_PUBLIC_GRAPHQL_API_KEY not found in environment variables");
    }
  }

  /**
   * Generate The Graph subgraph URL with API key
   */
  getSubgraphUrl(subgraphId) {
    return `https://gateway.thegraph.com/api/${this.apiKey}/subgraphs/id/${subgraphId}`;
  }

  /**
   * Create GraphQL query for market data
   */
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

  /**
   * Query markets from a specific subgraph
   */
  async queryMarkets(subgraphId, tokenSymbol) {
    const url = this.getSubgraphUrl(subgraphId);
    const query = this.createMarketQuery(tokenSymbol);
    const response = await request(url, query);
    return response.markets;
  }
}
