// Test WETH query detection
function shouldUseMCP(message) {
  const messageText = message.toLowerCase();
  
  const realTimeDataPhrases = [
    'current price of', 'price of eth', 'price of weth', 'price of usdc',
    'current price for', 'price for eth', 'price for weth', 'price for usdc',
    'what is the current price', 'current token price', 'token price',
    'gas price', 'gas prices', 'gas cost', 'gas fees', 'transaction cost',
    'cost to send', 'how much does it cost', 'current token prices', 'token prices',
    'eth price', 'weth price', 'usdc price', 'briq tvl', 'briq analytics',
    'briq rewards', 'briq allocations', 'briq performance', 'briq distribution',
    'briq portfolio', 'briq apy', 'briq yield', 'accrued briq rewards',
    'currently accrued', 'current briq rewards', 'strategy rewards',
    'market allocations', 'total value locked', 'current tvl',
    'aave rewards', 'compound rewards', 'show me briq', 'current gas price',
    'what is the current', 'how much is', 'current market data',
    'how is briq', 'briq status', 'briq data', 'briq info',
    'funds in briq', 'briq protocol', 'briq funds', 'money in briq',
    'capital in briq', 'assets in briq', 'value in briq', 'briq value'
  ];
  
  return realTimeDataPhrases.some(phrase => messageText.includes(phrase));
}

const queries = [
  "what is the price of usdc",
  "what about weth?",
  "what about weth",
  "weth price",
  "price of weth"
];

console.log('Testing WETH query detection:\n');
queries.forEach(query => {
  const result = shouldUseMCP(query);
  console.log(`"${query}" -> ${result}`);
});
