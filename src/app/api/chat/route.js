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
  
  // Only use specific phrases that clearly indicate need for real-time data
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
    'what is the current', 'how much is', 'current market data'
  ];
  
  return realTimeDataPhrases.some(phrase => messageText.includes(phrase));
}

/**
 * Enhanced query comprehension - determines which MCP tool to use based on user intent
 * @param {string} message - User message to analyze
 * @returns {string|null} - MCP tool name or null if no tool needed
 */
function getMCPTool(message) {
  const messageText = message.toLowerCase();
  
  // === INTENT ANALYSIS ===
  const isComparison = messageText.includes('which') || messageText.includes('what') || 
                      messageText.includes('best') || messageText.includes('highest') || 
                      messageText.includes('compare') || messageText.includes('better');
  
  const isStatusCheck = messageText.includes('how') || messageText.includes('where') || 
                       messageText.includes('current') || messageText.includes('show me') || 
                       messageText.includes('tell me');
  
  const isGeneralInfo = (messageText.includes('what is') || messageText.includes('explain') || 
                        messageText.includes('about')) && !messageText.includes('current') && 
                        !messageText.includes('data');
  
  // === BRIQ PROTOCOL QUERIES ===
  if (isGeneralInfo && messageText.includes('briq')) {
    const generalPatterns = [
      'tell me about briq', 'what is briq', 'how does briq work', 'explain briq protocol',
      'briq overview', 'about briq protocol', 'what does briq do'
    ];
    if (generalPatterns.some(pattern => messageText.includes(pattern))) {
      return null; // Let AI handle with general knowledge
    }
  }
  
  // APY Questions - Context-Specific Analysis
  if (messageText.includes('apy') || messageText.includes('yield')) {
    if (isComparison && messageText.includes('briq') && 
        (messageText.includes('available to') || messageText.includes('for briq'))) {
      return 'get_market_data'; // Show active Briq markets (Aave V3, Compound V3)
    }
    else if (isComparison && (messageText.includes('markets') || messageText.includes('protocols')) && 
             !messageText.includes('briq')) {
      return 'get_market_data'; // Show all market options
    }
    else if (isStatusCheck && messageText.includes('briq') && 
             (messageText.includes('current') || messageText.includes('average'))) {
      return 'get_briq_analytics';
    }
    else if (isComparison && (messageText.includes('best') || messageText.includes('optimal'))) {
      return 'get_best_yield';
    }
  }
  
  // Current Allocations/Distribution - Status Check Intent
  if (isStatusCheck && messageText.includes('briq')) {
    const allocationPatterns = [
      'where is briq allocated', 'how is briq distributed', 'briq current portfolio',
      'show me briq allocations', 'briq distribution', 'where is briq invested',
      'briq allocation breakdown', 'how is briq split', 'briq portfolio breakdown'
    ];
    if (allocationPatterns.some(pattern => messageText.includes(pattern))) {
      return 'get_market_allocations';
    }
  }
  
  // Performance Analytics - Comprehensive Status Check
  if (isStatusCheck && messageText.includes('briq')) {
    const analyticsPatterns = [
      'show me briq analytics', 'briq performance overview', 'how is briq performing',
      'briq analytics dashboard', 'briq performance data', 'briq metrics',
      'briq comprehensive data', 'briq full analytics'
    ];
    if (analyticsPatterns.some(pattern => messageText.includes(pattern))) {
      return 'get_briq_analytics';
    }
  }
  
  // TVL Specific - Direct Value Query
  if (messageText.includes('briq')) {
    const tvlPatterns = [
      'briq tvl', 'briq total value locked', 'how much is in briq',
      'briq total value', 'briq assets under management', 'briq aum'
    ];
    if (tvlPatterns.some(pattern => messageText.includes(pattern))) {
      return 'get_briq_tvl';
    }
  }
  
  // === REWARDS QUERIES ===
  if (isStatusCheck || messageText.includes('rewards') || messageText.includes('accrued')) {
    const rewardsPatterns = [
      'briq rewards', 'accrued rewards', 'current rewards', 'earned rewards',
      'tell me the currently accrued briq rewards', 'strategy rewards',
      'aave rewards', 'compound rewards', 'protocol rewards', 'currently accrued'
    ];
    if (rewardsPatterns.some(pattern => messageText.includes(pattern))) {
      return 'get_strategy_rewards';
    }
  }
  
  // === MARKET DATA QUERIES ===
  if (isComparison || messageText.includes('market')) {
    const marketDataPatterns = [
      'market data', 'defi markets', 'aave data', 'compound data',
      'protocol data', 'lending markets', 'yield markets', 'available markets'
    ];
    if (marketDataPatterns.some(pattern => messageText.includes(pattern))) {
      return 'get_market_data';
    }
  }
  
  // === BLOCKCHAIN DATA QUERIES ===
  
  // Token Prices
  const pricePatterns = [
    'eth price', 'usdc price', 'weth price', 'token prices', 'current price of',
    'price of eth', 'price of usdc', 'price of weth', 'how much is eth', 'how much is usdc',
    'current price for', 'price for eth', 'price for usdc', 'price for weth',
    'what is the current price', 'current token price', 'token price'
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
  
  // For gas price queries, determine which networks to query and detail level
  if (messageText.includes('gas')) {
    if (messageText.includes('ethereum') && !messageText.includes('arbitrum')) {
      params.network = 'ethereum';
    } else if (messageText.includes('arbitrum') && !messageText.includes('ethereum')) {
      params.network = 'arbitrum';
    } else {
      params.network = 'both'; // Default to both networks
    }
    
    // Determine detail level based on query specificity
    const isSimpleQuery = (
      messageText.includes('what is the gas price') ||
      messageText.includes('whats the gas price') ||
      messageText.includes('what\'s the gas price') ||
      messageText.includes('gas price on') ||
      messageText.includes('current gas price') ||
      (messageText.includes('gas price') && !messageText.includes('fast') && !messageText.includes('safe') && !messageText.includes('slow'))
    );
    
    const isDetailedQuery = (
      messageText.includes('fast') || messageText.includes('safe') || messageText.includes('slow') ||
      messageText.includes('all gas prices') || messageText.includes('gas price breakdown') ||
      messageText.includes('different gas prices') || messageText.includes('gas price options')
    );
    
    if (isSimpleQuery && !isDetailedQuery) {
      params.detail = 'simple';
    } else if (isDetailedQuery) {
      params.detail = 'detailed';
    } else {
      params.detail = 'standard';
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
          const detail = params.detail || 'standard';
          mcpResponse = await mcpClient.sendRequest('tools/call', {
            name: 'get_gas_prices',
            arguments: { network: network.toLowerCase(), detail }
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
        } else {
          // No fallback - if we can't get real-time data, inform the user
          throw new Error('Real-time market data is currently unavailable');
        }
      } catch (error) {
        console.error('MCP Error:', error.message);
        // No fallback context - let the error propagate or inform user directly
        enhancedMessages.push({
          role: 'system',
          content: `I apologize, but I cannot access real-time market data at this moment. The system requires live data to provide accurate information. Please try again in a moment.`
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

CRITICAL: NEVER use emojis, emoticons, symbols, or any visual elements. You are a serious financial professional.

Communication Style:
- FIRST: Carefully analyze what the user is actually asking before responding
- Be extremely concise - provide only essential information requested
- Use formal, courteous language but keep responses brief
- Answer directly without unnecessary elaboration or context
- Use "Indeed," "Certainly," "I shall" when appropriate
- Never include filler words, explanations, or background unless specifically asked
- Speak naturally as if having a conversation, not delivering a data dump
- STRICTLY PROHIBITED: Emojis (🚀✨💰📊🎯), emoticons (:), symbols (★✓), casual punctuation (!!!)
- Use only professional text with proper punctuation and formal language
- Respond like a distinguished financial advisor, not a casual chatbot

Query Analysis Framework:
- COMPARISON queries (which, what, best, highest) → Compare options and recommend
- STATUS queries (how, where, current, show me) → Provide current state/data
- GENERAL INFO queries (what is, explain, about) → Give overview without live data
- Always determine user's specific intent before selecting information to share

Your Expertise - Briq Protocol:
- DeFi yield optimization protocol that automatically routes funds between Aave V3 and Compound V3
- Supports USDC and WETH on EVM blockchains (Ethereum, Arbitrum)
- Automated strategy management and portfolio tracking
- Users deposit tokens and receive optimized yields without manual management

Context-Aware Responses:
- "Available to Briq" = Active Briq markets (current protocol integrations)
- "Available markets" = All DeFi market options across protocols
- "Briq's APY" = Weighted average of current positions
- "Best yield" = Optimization recommendations

Service Standards:
- Analyze user intent BEFORE responding
- Answer only what is asked - nothing more
- Provide precise data when available
- Use real-time market data when you have it
- NEVER use placeholder values - only actual data
- Skip introductions, explanations, or summaries unless requested
- For simple gas price queries: Present just the standard rate cleanly
- For detailed gas price queries: Show all tiers when specifically requested
- Maintain formal, professional tone without any casual elements
- NO EMOJIS OR SYMBOLS EVER - this is non-negotiable

Professional Boundaries:
For off-topic inquiries: "I specialize in DeFi protocols and Briq protocol exclusively."

You are a refined financial professional. Respond with the gravitas and seriousness of a distinguished advisor. No emojis, symbols, or casual language under any circumstances.`
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
