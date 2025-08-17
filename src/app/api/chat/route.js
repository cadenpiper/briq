import OpenAI from 'openai';
import { OpenAIStream, StreamingTextResponse } from 'ai';
import { getSimpleMCPClient } from '../../utils/simpleMcpClient';

// Create an OpenAI API client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Helper function to detect if user is asking for market data
function shouldUseMCP(message) {
  const marketKeywords = [
    'market', 'yield', 'apy', 'rate', 'tvl', 'best', 'current', 'price',
    'aave', 'compound', 'ethereum', 'arbitrum', 'usdc', 'weth',
    'protocol', 'lending', 'borrowing', 'defi', 'data'
  ];
  
  const messageText = message.toLowerCase();
  return marketKeywords.some(keyword => messageText.includes(keyword));
}

// Helper function to extract MCP tool parameters from user message
function extractMCPParams(message) {
  const messageText = message.toLowerCase();
  const params = {};
  
  // Extract network
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

// Helper function to determine which MCP tool to use
function getMCPTool(message) {
  const messageText = message.toLowerCase();
  
  if (messageText.includes('best') && (messageText.includes('yield') || messageText.includes('apy'))) {
    return 'get_best_yield';
  }
  
  return 'get_market_data';
}

export async function POST(req) {
  const { messages } = await req.json();
  const lastMessage = messages[messages.length - 1];
  
  let enhancedMessages = [...messages];
  
  // Check if we should use MCP for real-time data
  if (lastMessage && shouldUseMCP(lastMessage.content)) {
    try {
      const mcpClient = getSimpleMCPClient();
      await mcpClient.connect();
      
      const tool = getMCPTool(lastMessage.content);
      const params = extractMCPParams(lastMessage.content);
      
      let mcpResponse;
      if (tool === 'get_best_yield') {
        mcpResponse = await mcpClient.getBestYield(params.token);
      } else {
        mcpResponse = await mcpClient.getMarketData(params);
      }
      
      if (mcpResponse && mcpResponse.content && mcpResponse.content[0]) {
        const marketData = mcpResponse.content[0].text;
        
        // Add the market data as context for Rupert
        enhancedMessages.push({
          role: 'system',
          content: `IMPORTANT: Use this current market data in your response: ${marketData}`
        });
      }
    } catch (error) {
      console.error('MCP Error:', error.message);
      // Add error context so Rupert knows data is unavailable
      enhancedMessages.push({
        role: 'system',
        content: 'Note: Real-time market data is currently unavailable. Provide general information and suggest checking the platform dashboard.'
      });
    }
  }

  // Ask OpenAI for a streaming chat completion given the prompt
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

  // Convert the response into a friendly text-stream
  const stream = OpenAIStream(response);
  return new StreamingTextResponse(stream);
}
