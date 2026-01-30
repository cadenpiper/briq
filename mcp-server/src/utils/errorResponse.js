/**
 * Standardized error response utilities for MCP tools
 */

/**
 * Error types for categorization
 */
export const ErrorType = {
  VALIDATION: 'validation_error',
  API: 'api_error',
  CONFIGURATION: 'configuration_error',
  NETWORK: 'network_error',
  RATE_LIMIT: 'rate_limit_error',
  TIMEOUT: 'timeout_error',
  UNKNOWN: 'unknown_error'
};

/**
 * Create standardized error response
 */
export function createErrorResponse(error, context = {}) {
  const errorType = categorizeError(error);
  
  return {
    content: [{
      type: 'text',
      text: JSON.stringify({
        error: {
          type: errorType,
          message: error.message,
          tool: context.tool,
          timestamp: new Date().toISOString(),
          ...(context.details && { details: context.details })
        }
      }, null, 2)
    }],
    isError: true
  };
}

/**
 * Create standardized success response
 */
export function createSuccessResponse(data, format = 'json') {
  const content = format === 'json' 
    ? JSON.stringify(data, null, 2)
    : data;

  return {
    content: [{
      type: 'text',
      text: content
    }]
  };
}

/**
 * Categorize error by type
 */
function categorizeError(error) {
  const message = error.message.toLowerCase();
  
  if (error.name === 'ValidationError') {
    return ErrorType.VALIDATION;
  }
  
  if (message.includes('api') || message.includes('status')) {
    return ErrorType.API;
  }
  
  if (message.includes('not found') || message.includes('missing') || message.includes('required')) {
    return ErrorType.CONFIGURATION;
  }
  
  if (message.includes('network') || message.includes('fetch') || message.includes('connection')) {
    return ErrorType.NETWORK;
  }
  
  if (message.includes('rate limit') || message.includes('too many')) {
    return ErrorType.RATE_LIMIT;
  }
  
  if (message.includes('timeout') || message.includes('timed out')) {
    return ErrorType.TIMEOUT;
  }
  
  return ErrorType.UNKNOWN;
}

/**
 * Wrap service method with standardized error handling
 */
export function withErrorHandling(toolName, handler) {
  return async (...args) => {
    try {
      return await handler(...args);
    } catch (error) {
      return createErrorResponse(error, { tool: toolName });
    }
  };
}
