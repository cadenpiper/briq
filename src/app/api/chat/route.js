import OpenAI from 'openai';
import { OpenAIStream, StreamingTextResponse } from 'ai';
import { getSimpleMCPClient } from '../../utils/simpleMcpClient';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * AI-driven tool selection - let the AI decide what data it needs
 * Returns an array of tools to call based on the conversation context
 */
async function getRequiredTools(message, messages, openai) {
  try {
    const recentMessages = messages.slice(-6).map(m => `${m.role}: ${m.content}`).join('\n');
    
    const prompt = `Analyze this conversation and determine what real-time data tools are needed to answer the user's question accurately.

Recent conversation:
${recentMessages}

Latest message: "${message}"

Available tools:
- get_token_prices: Current token prices (ETH, WETH, USDC)
- get_gas_prices: Gas costs for Ethereum/Arbitrum networks (standard rates)
- get_detailed_gas_prices: Detailed gas costs with all tiers (safe, standard, fast)
- get_current_strategies: Current Briq strategy assignments and APYs for all tokens
- get_briq_data: Briq protocol analytics (TVL, performance, allocations, rewards)
- get_market_data: External DeFi market data (Aave V3, Compound V3)

CRITICAL DISTINCTION:
- INFORMATIONAL questions about Briq (what is, tell me about, explain) → "NONE" (use general knowledge)
- STRATEGY questions (current strategies, recent changes, what strategies are active) → ["get_current_strategies"]
- PERFORMANCE questions about Briq (how is it doing, current status, analytics) → ["get_briq_data"]

Gas Price Rules:
- Simple gas queries ("gas prices", "current gas", "transaction cost") → ["get_gas_prices"]
- Detailed gas queries ("all gas options", "gas tiers", "safe/standard/fast gas") → ["get_detailed_gas_prices"]

Rules:
- "What is Briq?" / "Tell me about Briq" / "Explain Briq" → "NONE" 
- "Recent strategy changes" / "Current strategies" / "What strategies are active" → ["get_current_strategies"]
- "How is Briq performing?" / "Briq analytics" / "Current TVL" → ["get_briq_data"]
- "Best yields available" / "Market opportunities" → ["get_market_data"]
- "Token prices" → ["get_token_prices"]
- "Gas costs" / "Gas prices" → ["get_gas_prices"]
- "All gas options" / "Gas tiers" → ["get_detailed_gas_prices"]

Respond with a JSON array of tool names, or "NONE" if no real-time data is needed.

Examples:
- "tell me about the briq protocol" → "NONE"
- "what is briq?" → "NONE"
- "How is Briq performing?" → ["get_briq_data"]
- "What's Briq's current TVL?" → ["get_briq_data"]
- "What are gas prices?" → ["get_gas_prices"]
- "Show me all gas price options" → ["get_detailed_gas_prices"]
- "What's the best USDC yield available?" → ["get_market_data"]`;

    const response = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 50,
      temperature: 0
    });

    const result = response.choices[0]?.message?.content?.trim();
    
    if (result === "NONE") {
      return [];
    }
    
    try {
      return JSON.parse(result);
    } catch {
      // Fallback parsing for non-JSON responses
      if (result.includes('get_')) {
        return result.match(/get_[\w_]+/g) || [];
      }
      return [];
    }
    
  } catch (error) {
    console.error('Error in AI tool selection:', error);
    return [];
  }
}

/**
 * Main chat API endpoint with intelligent tool selection
 */
export async function POST(req) {
  try {
    const { messages } = await req.json();
    
    if (!messages || messages.length === 0) {
      return new Response('No messages provided', { status: 400 });
    }

    const lastMessage = messages[messages.length - 1];
    let enhancedMessages = [...messages];

    // Get required tools using AI reasoning
    const requiredTools = await getRequiredTools(lastMessage.content, messages, openai);

    if (requiredTools.length > 0) {
      try {
        // Initialize MCP client and connect to server
        const mcpClient = getSimpleMCPClient();
        await mcpClient.connect();
        
        const toolResults = [];

        // Call each required tool
        for (const toolName of requiredTools) {
          try {
            let mcpResponse;
            
            switch (toolName) {
              case 'get_token_prices':
                mcpResponse = await mcpClient.sendRequest('tools/call', {
                  name: 'get_token_prices',
                  arguments: {}
                });
                break;
              case 'get_gas_prices':
                mcpResponse = await mcpClient.sendRequest('tools/call', {
                  name: 'get_gas_prices',
                  arguments: {}
                });
                break;
              case 'get_detailed_gas_prices':
                // Call the detailed gas prices method
                mcpResponse = await mcpClient.sendRequest('tools/call', {
                  name: 'get_detailed_gas_prices',
                  arguments: {}
                });
                break;
              case 'get_market_data':
                mcpResponse = await mcpClient.sendRequest('tools/call', {
                  name: 'get_market_data',
                  arguments: {}
                });
                break;
              case 'get_briq_data':
                mcpResponse = await mcpClient.sendRequest('tools/call', {
                  name: 'get_briq_data',
                  arguments: {}
                });
                break;
              case 'get_current_strategies':
                mcpResponse = await mcpClient.sendRequest('tools/call', {
                  name: 'get_current_strategies',
                  arguments: {}
                });
                break;
            }
            
            if (mcpResponse && mcpResponse.content && mcpResponse.content.length > 0) {
              toolResults.push({
                tool: toolName,
                data: mcpResponse.content[0].text
              });
            }
          } catch (toolError) {
            console.error(`Error calling ${toolName}:`, toolError);
            toolResults.push({
              tool: toolName,
              error: toolError.message
            });
          }
        }
        
        // Add tool results as system context if we got data
        if (toolResults.length > 0) {
          const contextData = toolResults.map(result => {
            if (result.error) {
              return `${result.tool}: Error - ${result.error}`;
            }
            return `${result.tool}: ${result.data}`;
          }).join('\n\n');
          
          enhancedMessages.push({
            role: 'system',
            content: `Real-time data for your response:\n\n${contextData}`
          });
        }
      } catch (error) {
        console.error('MCP Error:', error.message);
        // Don't add fallback data - let Rupert handle the lack of data gracefully
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

CRITICAL RULES:
- NEVER use emojis, emoticons, symbols, or visual elements
- Be concise and direct - answer only what is asked
- Use formal, professional language
- ONLY use real-time data when provided in system messages
- NEVER mix external market data with Briq protocol information

CRITICAL DATA HIERARCHY:
1. ALWAYS use get_current_strategies for actual Briq protocol strategy assignments
2. Use get_briq_data for actual Briq protocol performance and balances  
3. Use get_market_data ONLY for external market opportunities, NOT current Briq state
4. NEVER assume strategy changes based on external market data
5. When discussing "recent strategy changes" or "current strategies", ONLY reference actual contract state

MANDATORY TOOL USAGE:
- Questions about "strategy changes", "current strategies", "what strategies are active" MUST call get_current_strategies tool first
- Questions about "recent changes" MUST call both get_current_strategies and get_briq_data tools
- DO NOT provide strategy information without calling these tools

Your Expertise - Briq Protocol:
Briq is a DeFi yield optimization protocol that automatically allocates user deposits across multiple lending protocols to maximize returns. The protocol routes funds between Aave V3 and Compound V3 based on current market conditions. It supports USDC and WETH deposits on EVM-compatible blockchains including Ethereum and Arbitrum. Users deposit tokens into Briq's vault and receive yield-bearing shares representing their portion of the optimized yield pool. The protocol features automated strategy management, real-time portfolio tracking, and an AI assistant for guidance.

IMPORTANT DISTINCTIONS:
- INFORMATIONAL questions ("What is Briq?", "Tell me about Briq") → Provide protocol description using your knowledge above
- CURRENT STATE questions ("What strategies are active?", "Recent changes?") → Use get_current_strategies and get_briq_data tools
- PERFORMANCE questions ("How is Briq doing?", "Current analytics") → Use real-time data from get_briq_data only
- MARKET questions ("Best yields available") → Use get_market_data for external protocol comparisons

Data Handling Rules:
- get_current_strategies: ALWAYS use for actual Briq strategy assignments and recent changes
- get_briq_data: ONLY for Briq protocol performance/analytics questions
- get_market_data: ONLY for external DeFi market comparisons  
- get_token_prices: For current token price information
- get_gas_prices: For transaction cost information
- NO DATA: For general protocol information questions

Communication Style:
- Analyze the user's intent before responding
- For informational questions, provide clear protocol overview without data
- For performance questions, use only real-time Briq data
- Present information naturally without mentioning tools or JSON
- Use "Indeed," "Certainly," when appropriate
- Maintain professional tone without casual elements

Professional Boundaries:
For off-topic inquiries: "I specialize in DeFi and Briq protocol exclusively."`
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
