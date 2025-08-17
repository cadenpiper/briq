import OpenAI from 'openai';
import { OpenAIStream, StreamingTextResponse } from 'ai';
import { getSimpleMCPClient } from '../../utils/simpleMcpClient';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * Determines if a user query requires real-time blockchain data via MCP
 * @param {string} message - User message to analyze
 * @returns {boolean} - Whether MCP should be used
 */
function shouldUseMCP(message) {
  const messageText = message.toLowerCase();
  
  // Specific phrases that indicate need for real-time data
  const specificPhrases = [
    'current price of', 'price of eth', 'price of weth', 'price of usdc',
    'gas price', 'gas prices', 'gas cost', 'gas fees', 'transaction cost',
    'cost to send', 'how much does it cost', 'current token prices', 'token prices',
    'eth price', 'weth price', 'usdc price', 'briq tvl', 'briq analytics',
    'briq rewards', 'briq allocations', 'briq performance', 'briq distribution',
    'briq portfolio', 'briq apy', 'briq yield', 'accrued briq rewards',
    'currently accrued', 'current briq rewards', 'strategy rewards',
    'market allocations', 'total value locked', 'current tvl',
    'aave rewards', 'compound rewards'
  ];
  
  // Fallback keywords
  const keywords = [
    'price', 'gas', 'gwei', 'eth', 'weth', 'usdc', 'ethereum', 'arbitrum',
    'mainnet', 'token', 'cost', 'fee', 'current', 'transaction', 'briq', 'tvl',
    'analytics', 'rewards', 'allocations', 'aave', 'compound', 'strategy', 'apy', 'yield', 'accrued'
  ];
  
  return specificPhrases.some(phrase => messageText.includes(phrase)) || 
         keywords.some(keyword => messageText.includes(keyword));
}

/**
 * Enhanced query comprehension - determines which MCP tool to use based on user intent
 * @param {string} message - User message to analyze
 * @returns {string|null} - MCP tool name or null if no tool needed
 */
function getMCPTool(message) {
  const messageText = message.toLowerCase();
  
  // === BRIQ PROTOCOL QUERIES ===
  
  // General Protocol Overview (NO MCP - use AI knowledge)
  const generalBriqPatterns = [
    'tell me about briq', 'what is briq', 'how does briq work', 'explain briq protocol',
    'briq overview', 'about briq protocol', 'what does briq do'
  ];
  if (generalBriqPatterns.some(pattern => messageText.includes(pattern)) && 
      !messageText.includes('data') && !messageText.includes('current') && !messageText.includes('analytics')) {
    return null; // Let AI handle with general knowledge
  }
  
  // Current Allocations/Distribution
  const allocationPatterns = [
    'where is briq allocated', 'how is briq distributed', 'briq current portfolio',
    'show me briq allocations', 'briq distribution', 'where is briq invested',
    'briq allocation breakdown', 'how is briq split', 'briq portfolio breakdown'
  ];
  if (allocationPatterns.some(pattern => messageText.includes(pattern))) {
    return 'get_market_allocations';
  }
  
  // Performance Analytics (Comprehensive)
  const analyticsPatterns = [
    'show me briq analytics', 'briq performance overview', 'how is briq performing',
    'briq analytics dashboard', 'briq performance data', 'briq metrics',
    'briq comprehensive data', 'briq full analytics'
  ];
  if (analyticsPatterns.some(pattern => messageText.includes(pattern))) {
    return 'get_briq_analytics';
  }
  
  // TVL Specific
  const tvlPatterns = [
    'briq tvl', 'briq total value locked', 'how much is in briq',
    'briq total value', 'briq assets under management', 'briq aum'
  ];
  if (tvlPatterns.some(pattern => messageText.includes(pattern))) {
    return 'get_briq_tvl';
  }
  
  // APY Questions - Context Matters!
  if (messageText.includes('apy') || messageText.includes('yield')) {
    // Briq-specific APY (current weighted average)
    if (messageText.includes('briq') && (messageText.includes('current') || messageText.includes('average') || messageText.includes('what'))) {
      return 'get_briq_analytics';
    }
    // Available to Briq (current allocations)
    else if (messageText.includes('available to briq') || messageText.includes('highest apy available to briq')) {
      return 'get_market_allocations';
    }
    // Available markets (all DeFi markets)
    else if (messageText.includes('available markets') || messageText.includes('highest apy available') || messageText.includes('which markets')) {
      return 'get_market_data';
    }
    // Best yield opportunities
    else if (messageText.includes('best yield') || messageText.includes('optimal yield') || messageText.includes('highest yield')) {
      return 'get_best_yield';
    }
  }
  
  // === REWARDS QUERIES ===
  const rewardsPatterns = [
    'briq rewards', 'accrued rewards', 'current rewards', 'earned rewards',
    'tell me the currently accrued briq rewards', 'strategy rewards',
    'aave rewards', 'compound rewards', 'protocol rewards'
  ];
  if (rewardsPatterns.some(pattern => messageText.includes(pattern))) {
    return 'get_strategy_rewards';
  }
  
  // === MARKET DATA QUERIES ===
  const marketDataPatterns = [
    'market data', 'defi markets', 'aave data', 'compound data',
    'protocol data', 'lending markets', 'yield markets'
  ];
  if (marketDataPatterns.some(pattern => messageText.includes(pattern))) {
    return 'get_market_data';
  }
  
  // === BLOCKCHAIN DATA QUERIES ===
  
  // Token Prices
  const pricePatterns = [
    'eth price', 'usdc price', 'token prices', 'current price of',
    'price of eth', 'price of usdc', 'how much is eth', 'how much is usdc'
  ];
  if (pricePatterns.some(pattern => messageText.includes(pattern))) {
    return 'get_token_prices';
  }
  
  // Gas Prices
  const gasPatterns = [
    'gas price', 'gas cost', 'gas fees', 'transaction cost',
    'cost to send', 'ethereum gas', 'arbitrum gas', 'how much gas'
  ];
  if (gasPatterns.some(pattern => messageText.includes(pattern))) {
    return 'get_gas_prices';
  }
  
  return null; // No MCP tool needed
}

/**
 * Extracts parameters for MCP tools based on user query context
 * @param {string} message - User message to analyze
 * @returns {Object} - Parameters object for MCP tool
 */
function extractMCPParams(message) {
  const messageText = message.toLowerCase();
  const params = {};
  
  // For gas price queries, determine which networks to query
  if (messageText.includes('gas')) {
    if (messageText.includes('ethereum') && !messageText.includes('arbitrum')) {
      params.network = 'ethereum';
    } else if (messageText.includes('arbitrum') && !messageText.includes('ethereum')) {
      params.network = 'arbitrum';
    } else {
      params.network = 'both'; // Default to both networks
    }
  }
  
  // For best yield queries, determine token preference
  if (messageText.includes('best') && messageText.includes('yield')) {
    if (messageText.includes('usdc')) {
      params.token = 'USDC';
    } else if (messageText.includes('weth') || messageText.includes('eth')) {
      params.token = 'WETH';
    }
  }
  
  return params;
}

/**
 * Main chat API endpoint with enhanced MCP integration
 */
export async function POST(req) {
  try {
    const { messages } = await req.json();
    
    if (!messages || messages.length === 0) {
      return new Response('No messages provided', { status: 400 });
    }

    const lastMessage = messages[messages.length - 1];
    let enhancedMessages = [...messages];

    // Check if we should fetch real-time blockchain data
    if (lastMessage && shouldUseMCP(lastMessage.content)) {
      try {
        // Initialize MCP client and connect to server
        const mcpClient = getSimpleMCPClient();
        await mcpClient.connect();
        
        // Determine tool and parameters based on user query
        const tool = getMCPTool(lastMessage.content);
        const params = extractMCPParams(lastMessage.content);
        
        // Call appropriate MCP tool
        let mcpResponse;
        
        if (tool === 'get_token_prices') {
          mcpResponse = await mcpClient.sendRequest('tools/call', {
            name: 'get_token_prices',
            arguments: {}
          });
        } else if (tool === 'get_gas_prices') {
          const network = params.network || 'both';
          mcpResponse = await mcpClient.sendRequest('tools/call', {
            name: 'get_gas_prices',
            arguments: { network: network.toLowerCase() }
          });
        } else if (tool === 'get_briq_tvl') {
          mcpResponse = await mcpClient.sendRequest('tools/call', {
            name: 'get_briq_tvl',
            arguments: {}
          });
        } else if (tool === 'get_briq_analytics') {
          mcpResponse = await mcpClient.sendRequest('tools/call', {
            name: 'get_briq_analytics',
            arguments: {}
          });
        } else if (tool === 'get_market_allocations') {
          mcpResponse = await mcpClient.sendRequest('tools/call', {
            name: 'get_market_allocations',
            arguments: {}
          });
        } else if (tool === 'get_strategy_rewards') {
          // Determine which strategy based on message content
          const messageText = lastMessage.content.toLowerCase();
          let strategy = 'both';
          if (messageText.includes('aave') && !messageText.includes('compound')) {
            strategy = 'aave';
          } else if (messageText.includes('compound') && !messageText.includes('aave')) {
            strategy = 'compound';
          }
          
          mcpResponse = await mcpClient.sendRequest('tools/call', {
            name: 'get_strategy_rewards',
            arguments: { strategy }
          });
        } else if (tool === 'get_market_data') {
          mcpResponse = await mcpClient.sendRequest('tools/call', {
            name: 'get_market_data',
            arguments: {}
          });
        } else if (tool === 'get_best_yield') {
          const token = params.token || 'USDC';
          mcpResponse = await mcpClient.sendRequest('tools/call', {
            name: 'get_best_yield',
            arguments: { token }
          });
        }
        
        // Add MCP response as system context if we got data
        if (mcpResponse && mcpResponse.content && mcpResponse.content.length > 0) {
          const marketData = mcpResponse.content[0].text;
          enhancedMessages.push({
            role: 'system',
            content: `IMPORTANT: Use this current market data in your response: ${marketData}`
          });
        }
      } catch (error) {
        console.error('MCP Error:', error.message);
        // Add fallback context if real-time data unavailable
        enhancedMessages.push({
          role: 'system',
          content: 'Note: Real-time market data is currently unavailable. Provide general information and suggest checking the platform dashboard.'
        });
      }
    }

    // Create chat completion with enhanced messages
    const response = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      stream: true,
      messages: [
        {
          role: 'system',
          content: `You are Rupert, a distinguished AI agent for the Briq DeFi protocol. You embody professionalism, precision, and refined expertise.

Communication Style:
- Be extremely concise - provide only essential information requested
- Use formal, courteous language but keep responses brief
- Answer directly without unnecessary elaboration or context
- Use "Indeed," "Certainly," "I shall" when appropriate
- Never include filler words, explanations, or background unless specifically asked

Your Expertise - Briq Protocol:
- DeFi yield optimization protocol that automatically routes funds between Aave V3 and Compound V3
- Supports USDC and WETH on EVM blockchains (Ethereum, Arbitrum)
- Automated strategy management and portfolio tracking
- Users deposit tokens and receive optimized yields without manual management

For general "about Briq" queries: Provide a brief, elegant overview of the protocol's purpose and key benefits without specific data.

Service Standards:
- Answer only what is asked - nothing more
- Provide precise data when available
- Use real-time market data when you have it
- NEVER use placeholder values - only actual data
- Skip introductions, explanations, or summaries unless requested

Professional Boundaries:
For off-topic inquiries: "I specialize in DeFi protocols and Briq protocol exclusively."

Be distinguished but brief. Provide exactly what is requested with professional authority.`
        },
        ...enhancedMessages,
      ],
      max_tokens: 500,
      temperature: 0.1,
    });

    const stream = OpenAIStream(response);
    return new StreamingTextResponse(stream);
  } catch (error) {
    console.error('Error in chat API:', error);
    return new Response('Internal Server Error', { status: 500 });
  }
}
