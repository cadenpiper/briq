/**
 * Formatter for gas price data with natural language responses
 */
export class GasPriceFormatter {
  /**
   * Format gas prices with intelligent detail level
   */
  formatGasPrices(gasData, detail = 'standard') {
    if (detail === 'simple') {
      return this.formatSimpleGasPrices(gasData);
    } else {
      return this.formatDetailedGasPrices(gasData);
    }
  }

  /**
   * Format simple gas price response - just standard rates with USD values
   */
  formatSimpleGasPrices(gasData) {
    let gasText = '';
    
    Object.entries(gasData).forEach(([networkName, data]) => {
      const networkDisplay = networkName.charAt(0).toUpperCase() + networkName.slice(1);
      const gweiPrice = data.standard_gas_price.toFixed(2);
      const usdCost = data.transfer_cost_usd.standard.toFixed(2);
      
      if (Object.keys(gasData).length === 1) {
        // Single network - natural conversational response
        gasText += `Current gas price on ${networkDisplay}: ${gweiPrice} gwei (approximately $${usdCost} for a standard transfer).`;
      } else {
        // Multiple networks - natural flow
        if (gasText) gasText += ' ';
        gasText += `${networkDisplay}: ${gweiPrice} gwei ($${usdCost} per transfer).`;
      }
    });

    // Add ETH price context
    const ethPrice = Object.values(gasData)[0].eth_price_usd.toFixed(0);
    gasText += ` ETH is currently trading at $${ethPrice}.`;

    return gasText;
  }

  /**
   * Format detailed gas price response - all tiers with USD values
   */
  formatDetailedGasPrices(gasData) {
    const networkCount = Object.keys(gasData).length;
    let gasText = '';
    
    if (networkCount === 1) {
      // Single network detailed response
      Object.entries(gasData).forEach(([networkName, data]) => {
        const networkDisplay = networkName.charAt(0).toUpperCase() + networkName.slice(1);
        gasText += `Current gas price options for ${networkDisplay}:\n\n`;
        gasText += `• Safe: ${data.safe_gas_price.toFixed(2)} gwei ($${data.transfer_cost_usd.safe.toFixed(2)} per transfer)\n`;
        gasText += `• Standard: ${data.standard_gas_price.toFixed(2)} gwei ($${data.transfer_cost_usd.standard.toFixed(2)} per transfer)\n`;
        gasText += `• Fast: ${data.fast_gas_price.toFixed(2)} gwei ($${data.transfer_cost_usd.fast.toFixed(2)} per transfer)\n\n`;
        gasText += `ETH is currently priced at $${data.eth_price_usd.toFixed(0)}.`;
      });
    } else {
      // Multiple networks detailed response
      gasText += `Current gas price options across networks:\n\n`;
      
      Object.entries(gasData).forEach(([networkName, data]) => {
        const networkDisplay = networkName.charAt(0).toUpperCase() + networkName.slice(1);
        gasText += `**${networkDisplay}:**\n`;
        gasText += `• Safe: ${data.safe_gas_price.toFixed(2)} gwei ($${data.transfer_cost_usd.safe.toFixed(2)} per transfer)\n`;
        gasText += `• Standard: ${data.standard_gas_price.toFixed(2)} gwei ($${data.transfer_cost_usd.standard.toFixed(2)} per transfer)\n`;
        gasText += `• Fast: ${data.fast_gas_price.toFixed(2)} gwei ($${data.transfer_cost_usd.fast.toFixed(2)} per transfer)\n\n`;
      });
      
      gasText += `ETH is currently priced at $${Object.values(gasData)[0].eth_price_usd.toFixed(0)}.`;
    }

    return gasText.trim();
  }
}
