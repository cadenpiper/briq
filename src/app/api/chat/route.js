import OpenAI from 'openai';
import { OpenAIStream, StreamingTextResponse } from 'ai';
import { getSimpleMCPClient } from '../../utils/simpleMcpClient';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * AI-driven context-aware MCP detection
 * Let the AI decide when it needs real-time data based on conversation context
 */
async function shouldUseMCPWithAI(message, messages, openai) {
  try {
    // Get recent conversation context
    const recentMessages = messages.slice(-6).map(m => `${m.role}: ${m.content}`).join('\n');
    
    const prompt = `Based on this conversation context, does the user's latest message require real-time blockchain/DeFi data?

Recent conversation:
${recentMessages}

Latest message: "${message}"

Available real-time data sources:
- Token prices (ETH, WETH, USDC)
- Gas prices (Ethereum, Arbitrum)  
- Briq protocol analytics (TVL, performance, allocations, rewards)
- DeFi market data (Aave V3, Compound V3)

Respond with only "YES" if real-time data is needed, or "NO" if the question can be answered with general knowledge.

Examples:
- "What about WETH?" (after discussing token prices) → YES
- "How is Briq performing?" → YES  
- "What is DeFi?" → NO
- "Explain how Aave works" → NO`;

    const response = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 10,
      temperature: 0
    });

    const decision = response.choices[0]?.message?.content?.trim().toUpperCase();
    return decision === 'YES';
    
  } catch (error) {
    console.error('Error in AI MCP detection:', error);
    // Fallback to simple keyword detection
    return message.toLowerCase().includes('price') || 
           message.toLowerCase().includes('briq') || 
           message.toLowerCase().includes('gas');
  }
}

/**
 * AI-driven tool selection based on conversation context
 */
async function getMCPToolWithAI(message, messages, openai) {
  try {
    const recentMessages = messages.slice(-6).map(m => `${m.role}: ${m.content}`).join('\n');
    
    const prompt = `Based on this conversation, which specific tool should be used to get real-time data?

Recent conversation:
${recentMessages}

Latest message: "${message}"

Available tools:
- get_token_prices: Get prices for both ETH and USDC
- get_token_price: Get price for a specific token (ETH, WETH, or USDC)
- get_gas_prices: Get gas prices for Ethereum and/or Arbitrum
- get_briq_data: Get Briq protocol analytics (TVL, performance, allocations, rewards)
- get_market_data: Get DeFi market data from protocols
- get_best_yield: Get yield optimization recommendations

Respond with only the tool name (e.g., "get_token_price") and if applicable, specify the token (e.g., "get_token_price:WETH").

Examples:
- "What about WETH?" (after price discussion) → get_token_price:WETH
- "How is Briq performing?" → get_briq_data
- "Gas prices?" → get_gas_prices`;

    const response = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 20,
      temperature: 0
    });

    const result = response.choices[0]?.message?.content?.trim();
    return result || 'get_briq_data'; // Default fallback
    
  } catch (error) {
    console.error('Error in AI tool selection:', error);
    // Fallback to simple logic
    if (message.toLowerCase().includes('briq')) return 'get_briq_data';
    if (message.toLowerCase().includes('gas')) return 'get_gas_prices';
    return 'get_token_prices';
  }
}

/**
 * Main chat API endpoint with AI-driven context awareness
 */
export async function POST(req) {
  try {
    const { messages } = await req.json();
    
    if (!messages || messages.length === 0) {
      return new Response('No messages provided', { status: 400 });
    }

    const lastMessage = messages[messages.length - 1];
    let enhancedMessages = [...messages];

    // Check if we should fetch real-time blockchain data using AI context awareness
    if (lastMessage && await shouldUseMCPWithAI(lastMessage.content, messages, openai)) {
      try {
        // Initialize MCP client and connect to server
        const mcpClient = getSimpleMCPClient();
        await mcpClient.connect();
        
        // Determine tool and parameters using AI context awareness
        const toolResult = await getMCPToolWithAI(lastMessage.content, messages, openai);
        const [tool, param] = toolResult.split(':');
        
        // Call appropriate MCP tool
        let mcpResponse;
        
        if (tool === 'get_token_prices') {
          mcpResponse = await mcpClient.sendRequest('tools/call', {
            name: 'get_token_prices',
            arguments: {}
          });
        } else if (tool === 'get_token_price') {
          mcpResponse = await mcpClient.sendRequest('tools/call', {
            name: 'get_token_price',
            arguments: { token: param || 'ETH' }
          });
        } else if (tool === 'get_gas_prices') {
          mcpResponse = await mcpClient.sendRequest('tools/call', {
            name: 'get_gas_prices',
            arguments: { network: 'both', detail: 'standard' }
          });
        } else if (tool === 'get_briq_data') {
          mcpResponse = await mcpClient.sendRequest('tools/call', {
            name: 'get_briq_data',
            arguments: { query: lastMessage.content }
          });
        } else if (tool === 'get_market_data') {
          mcpResponse = await mcpClient.sendRequest('tools/call', {
            name: 'get_market_data',
            arguments: {}
          });
        } else if (tool === 'get_best_yield') {
          mcpResponse = await mcpClient.sendRequest('tools/call', {
            name: 'get_best_yield',
            arguments: { token: param || 'USDC' }
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
