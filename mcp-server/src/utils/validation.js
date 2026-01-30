/**
 * Input validation utilities for MCP tool arguments
 */

export class ValidationError extends Error {
  constructor(message) {
    super(message);
    this.name = 'ValidationError';
  }
}

/**
 * Validate tool arguments against schema
 */
export function validateToolArgs(toolName, args, schema) {
  if (!schema) return args || {};
  
  const validated = {};
  
  for (const [key, rules] of Object.entries(schema)) {
    const value = args?.[key];
    
    // Check required fields
    if (rules.required && (value === undefined || value === null)) {
      throw new ValidationError(`Missing required parameter: ${key}`);
    }
    
    // Skip validation if optional and not provided
    if (value === undefined || value === null) {
      continue;
    }
    
    // Type validation
    if (rules.type === 'array') {
      if (!Array.isArray(value)) {
        throw new ValidationError(`Parameter ${key} must be an array`);
      }
      
      // Validate array items
      if (rules.items?.enum) {
        for (const item of value) {
          if (!rules.items.enum.includes(item)) {
            throw new ValidationError(
              `Invalid value "${item}" for ${key}. Must be one of: ${rules.items.enum.join(', ')}`
            );
          }
        }
      }
      
      validated[key] = value;
    } else if (rules.type === 'string') {
      if (typeof value !== 'string') {
        throw new ValidationError(`Parameter ${key} must be a string`);
      }
      
      // Enum validation
      if (rules.enum && !rules.enum.includes(value)) {
        throw new ValidationError(
          `Invalid value "${value}" for ${key}. Must be one of: ${rules.enum.join(', ')}`
        );
      }
      
      validated[key] = value;
    } else if (rules.type === 'object') {
      if (typeof value !== 'object' || Array.isArray(value)) {
        throw new ValidationError(`Parameter ${key} must be an object`);
      }
      
      validated[key] = value;
    }
  }
  
  return validated;
}

/**
 * Tool argument schemas
 */
export const TOOL_SCHEMAS = {
  get_token_prices: {
    tokens: {
      type: 'array',
      required: false,
      items: {
        enum: ['ETH', 'WETH', 'USDC']
      }
    }
  },
  
  get_gas_prices: {
    networks: {
      type: 'array',
      required: false,
      items: {
        enum: ['ethereum', 'arbitrum']
      }
    }
  },
  
  get_detailed_gas_prices: {
    networks: {
      type: 'array',
      required: false,
      items: {
        enum: ['ethereum', 'arbitrum']
      }
    }
  },
  
  get_market_data: {
    networks: {
      type: 'array',
      required: false,
      items: {
        enum: ['Ethereum', 'Arbitrum One']
      }
    },
    tokens: {
      type: 'array',
      required: false,
      items: {
        enum: ['USDC', 'WETH']
      }
    },
    protocols: {
      type: 'array',
      required: false,
      items: {
        enum: ['Aave V3', 'Compound V3']
      }
    }
  },
  
  get_briq_data: {},
  get_current_strategies: {},
  optimize_strategies: {},
  get_rupert_wallet_status: {},
  start_autonomous_optimization: {},
  stop_autonomous_optimization: {},
  get_optimization_status: {}
};
