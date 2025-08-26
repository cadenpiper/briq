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
   * Handle token prices request with professional Rupert tone
   */
  async handleGetTokenPrices() {
    try {
      const prices = await this.getTokenPrices();
      
      const ethPrice = prices.ETH.price_usd;
      const usdcPrice = prices.USDC.price_usd;
      
      // Show more precision for USDC to verify it's actually being fetched
      const usdcDisplay = usdcPrice === 1.0 ? '$1.0000' : `$${usdcPrice.toFixed(4)}`;
      
      // Professional Rupert-like response
      let response = `Here are the current token prices I'm seeing:\n\n`;
      response += `**Ethereum (ETH)**: $${ethPrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}\n`;
      response += `**USD Coin (USDC)**: ${usdcDisplay}\n\n`;
      
      // Add context about USDC
      if (Math.abs(usdcPrice - 1.0) < 0.001) {
        response += `USDC is trading very close to its $1.00 peg, which is exactly what we'd expect from this stablecoin.`;
      } else if (usdcPrice > 1.002) {
        response += `Interesting - USDC is trading slightly above its peg at ${usdcDisplay}, indicating some market premium.`;
      } else if (usdcPrice < 0.998) {
        response += `USDC is trading slightly below its peg at ${usdcDisplay}, which sometimes happens during market stress.`;
      }
      
      response += `\n\nData sourced from CoinMarketCap in real-time.`;

      return {
        content: [
          {
            type: 'text',
            text: response
          }
        ]
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `I'm having trouble fetching the latest token prices right now. ${error.message}\n\nThis could be due to API rate limits or connectivity issues. Please try again in a moment.`
          }
        ],
        isError: true
      };
    }
  }

  /**
   * Handle individual token price request with professional Rupert tone
   */
  async handleGetTokenPrice(tokenSymbol) {
    try {
      const prices = await this.getTokenPrices();
      
      // Normalize token symbol
      const symbol = tokenSymbol.toUpperCase();
      
      if (symbol === 'ETH' || symbol === 'ETHEREUM') {
        const ethPrice = prices.ETH.price_usd;
        return {
          content: [
            {
              type: 'text',
              text: `The current price of Ethereum (ETH) is $${ethPrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}.`
            }
          ]
        };
      } else if (symbol === 'WETH' || symbol === 'WRAPPED ETHER') {
        // WETH should be the same as ETH
        const ethPrice = prices.ETH.price_usd;
        return {
          content: [
            {
              type: 'text',
              text: `The current price of Wrapped Ether (WETH) is $${ethPrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}. WETH maintains a 1:1 peg with ETH.`
            }
          ]
        };
      } else if (symbol === 'USDC' || symbol === 'USD COIN') {
        const usdcPrice = prices.USDC.price_usd;
        const usdcDisplay = usdcPrice === 1.0 ? '$1.0000' : `$${usdcPrice.toFixed(4)}`;
        
        let response = `The current price of USD Coin (USDC) is ${usdcDisplay}.`;
        
        // Add context about USDC peg
        if (Math.abs(usdcPrice - 1.0) < 0.001) {
          response += ` USDC is trading very close to its $1.00 peg, which is exactly what we'd expect from this stablecoin.`;
        } else if (usdcPrice > 1.002) {
          response += ` Interestingly, USDC is trading slightly above its peg, indicating some market premium.`;
        } else if (usdcPrice < 0.998) {
          response += ` USDC is trading slightly below its peg, which sometimes happens during market stress.`;
        }
        
        return {
          content: [
            {
              type: 'text',
              text: response
            }
          ]
        };
      } else {
        return {
          content: [
            {
              type: 'text',
              text: `I currently track prices for ETH, WETH, and USDC. The token "${tokenSymbol}" isn't in my supported list yet. Would you like to know about any of the supported tokens instead?`
            }
          ]
        };
      }
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `I'm having trouble fetching the latest price for ${tokenSymbol} right now. ${error.message}\n\nThis could be due to API rate limits or connectivity issues. Please try again in a moment.`
          }
        ],
        isError: true
      };
    }
  }
}
