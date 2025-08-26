/**
 * Service for fetching token price data
 */
export class TokenPriceService {
  constructor() {
    this.coinMarketCapApiKey = process.env.COINMARKETCAP_API_KEY;
    if (!this.coinMarketCapApiKey) {
      throw new Error('COINMARKETCAP_API_KEY not found in environment variables');
    }
  }

  /**
   * Get current token prices from CoinMarketCap API
   */
  async getTokenPrices() {
    try {
      // Get ETH and USDC prices from CoinMarketCap
      const response = await fetch('https://pro-api.coinmarketcap.com/v1/cryptocurrency/quotes/latest?symbol=ETH,USDC', {
        headers: {
          'X-CMC_PRO_API_KEY': this.coinMarketCapApiKey,
          'Accept': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`CoinMarketCap API error: ${response.status}`);
      }

      const data = await response.json();
      
      if (!data.data || !data.data.ETH || !data.data.USDC) {
        throw new Error('Invalid response from CoinMarketCap API');
      }

      const ethPriceUSD = data.data.ETH.quote.USD.price;
      const usdcPriceUSD = data.data.USDC.quote.USD.price;

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

  /**
   * Handle token prices request
   */
  async handleGetTokenPrices() {
    try {
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
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `Error fetching token prices: ${error.message}`
          }
        ],
        isError: true
      };
    }
  }
}
