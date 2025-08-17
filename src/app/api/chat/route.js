import OpenAI from 'openai';
import { OpenAIStream, StreamingTextResponse } from 'ai';
import { getSimpleMCPClient } from '../../utils/simpleMcpClient';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Detect if user query requires real-time blockchain data
function shouldUseMCP(message) {
  const messageText = message.toLowerCase();
  
  // Specific phrases people use for crypto queries
  const specificPhrases = [
    'current price of',
    'price of eth',
    'price of weth', 
    'price of usdc',
    'and eth',
    'and weth',
    'and usdc',
    'gas price',
    'gas prices',
    'gas cost',
    'gas fees',
    'transaction cost',
    'cost to send',
    'how much does it cost',
    'ethereum mainnet',
    'arbitrum mainnet',
    'current token prices',
    'token prices',
    'eth price',
    'weth price',
    'usdc price',
    'briq tvl',
    'briq protocol',
    'briq analytics',
    'briq rewards',
    'briq allocations',
    'briq performance',
    'briq allocated',
    'briq distribution',
    'briq portfolio',
    'where is briq',
    'how is briq',
    'briq current',
    'strategy rewards',
    'market allocations',
    'total value locked',
    'current tvl',
    'aave rewards',
    'compound rewards'
  ];
  
  // Individual keywords as fallback
  const keywords = [
    'price', 'gas', 'gwei', 'eth', 'weth', 'usdc', 'ethereum', 'arbitrum',
    'mainnet', 'token', 'cost', 'fee', 'current', 'transaction', 'briq', 'tvl',
    'analytics', 'rewards', 'allocations', 'aave', 'compound', 'strategy'
  ];
  
  // Check specific phrases first (more accurate)
  const hasSpecificPhrase = specificPhrases.some(phrase => messageText.includes(phrase));
  const hasKeyword = keywords.some(keyword => messageText.includes(keyword));
  
  return hasSpecificPhrase || hasKeyword;
}

// Determine which MCP tool to use based on user query
function getMCPTool(message) {
  const messageText = message.toLowerCase();
  
  // Gas-related queries
  if (messageText.includes('gas') || messageText.includes('gwei') || messageText.includes('fee') || messageText.includes('cost')) {
    return 'get_gas_prices';
  }
  
  // Briq analytics queries (check these FIRST before general queries)
  if (messageText.includes('briq')) {
    if (messageText.includes('analytics') || messageText.includes('performance') || messageText.includes('overview')) {
      return 'get_briq_analytics';
    } else if (messageText.includes('allocations') || messageText.includes('allocation') || messageText.includes('distribution') || messageText.includes('allocated') || messageText.includes('portfolio')) {
      return 'get_market_allocations';
    } else if (messageText.includes('rewards')) {
      return 'get_strategy_rewards';
    } else if (messageText.includes('tvl') || messageText.includes('total value')) {
      return 'get_briq_tvl';
    }
  }
  
  // Briq allocation queries (catch "where is briq" type questions)
  if ((messageText.includes('where') || messageText.includes('how')) && messageText.includes('briq')) {
    if (messageText.includes('allocated') || messageText.includes('distribution') || messageText.includes('portfolio')) {
      return 'get_market_allocations';
    }
  }
  
  // Strategy-specific rewards queries
  if ((messageText.includes('aave') || messageText.includes('compound')) && messageText.includes('rewards')) {
    return 'get_strategy_rewards';
  }
  
  // Market allocation queries (only if NOT about Briq specifically)
  if (!messageText.includes('briq') && (messageText.includes('allocation') || messageText.includes('distribution') || messageText.includes('portfolio'))) {
    return 'get_market_allocations';
  }
  
  // Token price queries
  if ((messageText.includes('price') || messageText.includes('cost')) && 
      (messageText.includes('eth') || messageText.includes('usdc') || messageText.includes('token'))) {
    return 'get_token_prices';
  }
  
  // Best yield queries
  if (messageText.includes('best') && (messageText.includes('yield') || messageText.includes('apy'))) {
    return 'get_best_yield';
  }
  
  // Default to market data
  return 'get_market_data';
}

// Extract parameters from user message for MCP tools
function extractMCPParams(message) {
  const messageText = message.toLowerCase();
  const params = {};
  
  // For gas price queries, determine which networks to query
  if (messageText.includes('gas')) {
    const hasEthereum = messageText.includes('ethereum') || messageText.includes('mainnet');
    const hasArbitrum = messageText.includes('arbitrum');
    
    if (hasEthereum && hasArbitrum) {
      params.network = 'both';
    } else if (hasArbitrum) {
      params.network = 'arbitrum';
    } else if (hasEthereum) {
      params.network = 'ethereum';
    } else {
      params.network = 'both'; // Default to both networks
    }
    return params;
  }
  
  // Extract network for other queries
  if (messageText.includes('ethereum') || messageText.includes('eth')) {
    params.network = 'Ethereum';
  } else if (messageText.includes('arbitrum') || messageText.includes('arb')) {
    params.network = 'Arbitrum One';
  }
  
  // Extract token
  if (messageText.includes('usdc')) {
    params.token = 'USDC';
  } else if (messageText.includes('weth') || messageText.includes('eth')) {
    params.token = 'WETH';
  }
  
  // Extract protocol
  if (messageText.includes('aave')) {
    params.protocol = 'Aave V3';
  } else if (messageText.includes('compound')) {
    params.protocol = 'Compound V3';
  }
  
  return params;
}

export async function POST(req) {
  const { messages } = await req.json();
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
      if (tool === 'get_best_yield') {
        mcpResponse = await mcpClient.getBestYield(params.token);
      } else if (tool === 'get_token_prices') {
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
      } else {
        mcpResponse = await mcpClient.getMarketData(params);
      }
      
      // Add real-time data to context if available
      if (mcpResponse && mcpResponse.content && mcpResponse.content[0]) {
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

  // Generate response with OpenAI
  const response = await openai.chat.completions.create({
    model: 'gpt-3.5-turbo',
    stream: true,
    messages: [
      {
        role: 'system',
        content: `You are Rupert, a distinguished AI assistant for the Briq DeFi platform. You embody professionalism and precision.

Communication Style:
- Be concise and direct - speak only what is necessary
- Use refined, formal language but keep responses brief
- Provide precise information without unnecessary elaboration
- Remain composed and professional at all times
- Never use filler words or redundant explanations

Your Expertise - Briq Platform:
- DeFi yield optimization protocol
- Routes funds between Aave V3 and Compound V3
- Supports USDC and WETH on EVM blockchains
- Automated yield optimization and portfolio tracking

Service Standards:
- Answer questions about DeFi, yield strategies, and Briq features
- Explain concepts clearly and briefly
- Provide technical support for Web3 and blockchain topics
- Stay focused on essential information only
- When you have current market data, use it to provide accurate, real-time information
- NEVER use placeholder values like "X%" or "Y%" - always use real data when available

Professional Boundaries:
For off-topic inquiries, respond: "I assist with DeFi protocols and the Briq platform. How may I help with your DeFi needs?"

Keep all responses concise, accurate, and professional. When providing market data, present it clearly and highlight key insights.`
      },
      ...enhancedMessages,
    ],
  });

  // Return streaming response
  const stream = OpenAIStream(response);
  return new StreamingTextResponse(stream);
}
