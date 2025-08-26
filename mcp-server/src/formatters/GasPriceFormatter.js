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
   * Format simple gas price response - just standard rates
   */
  formatSimpleGasPrices(gasData) {
    let gasText = '';
    
    Object.entries(gasData).forEach(([networkName, data]) => {
      const networkDisplay = networkName.charAt(0).toUpperCase() + networkName.slice(1);
      if (Object.keys(gasData).length === 1) {
        // Single network - natural conversational response
        gasText += `The current gas price on ${networkDisplay} is ${data.standard_gas_price.toFixed(3)} gwei, equivalent to $${data.transfer_cost_usd.standard.toFixed(3)} for a standard transfer.`;
      } else {
        // Multiple networks - natural flow
        if (gasText) gasText += ' ';
        gasText += `On ${networkDisplay}, gas costs ${data.standard_gas_price.toFixed(3)} gwei ($${data.transfer_cost_usd.standard.toFixed(3)} for transfer).`;
      }
    });

    return gasText;
  }

  /**
   * Format detailed gas price response - all tiers
   */
  formatDetailedGasPrices(gasData) {
    const networkCount = Object.keys(gasData).length;
    let gasText = '';
    
    if (networkCount === 1) {
      // Single network detailed response
      Object.entries(gasData).forEach(([networkName, data]) => {
        const networkDisplay = networkName.charAt(0).toUpperCase() + networkName.slice(1);
        gasText += `Here are the current gas price options for ${networkDisplay}:\n\n`;
        gasText += `Safe: ${data.safe_gas_price.toFixed(3)} gwei ($${data.transfer_cost_usd.safe.toFixed(3)} for transfer)\n`;
        gasText += `Standard: ${data.standard_gas_price.toFixed(3)} gwei ($${data.transfer_cost_usd.standard.toFixed(3)} for transfer)\n`;
        gasText += `Fast: ${data.fast_gas_price.toFixed(3)} gwei ($${data.transfer_cost_usd.fast.toFixed(3)} for transfer)\n\n`;
        gasText += `ETH is currently priced at $${data.eth_price_usd.toFixed(2)}.`;
      });
    } else {
      // Multiple networks detailed response
      gasText += `Here are the current gas price options across networks:\n\n`;
      
      Object.entries(gasData).forEach(([networkName, data]) => {
        const networkDisplay = networkName.charAt(0).toUpperCase() + networkName.slice(1);
        gasText += `${networkDisplay}:\n`;
        gasText += `  Safe: ${data.safe_gas_price.toFixed(3)} gwei ($${data.transfer_cost_usd.safe.toFixed(3)} for transfer)\n`;
        gasText += `  Standard: ${data.standard_gas_price.toFixed(3)} gwei ($${data.transfer_cost_usd.standard.toFixed(3)} for transfer)\n`;
        gasText += `  Fast: ${data.fast_gas_price.toFixed(3)} gwei ($${data.transfer_cost_usd.fast.toFixed(3)} for transfer)\n\n`;
      });
      
      gasText += `ETH is currently priced at $${Object.values(gasData)[0].eth_price_usd.toFixed(2)}.`;
    }

    return gasText.trim();
  }
}
