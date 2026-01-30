/**
 * Simple rate limiter with retry logic and exponential backoff
 */
export class RateLimiter {
  constructor(maxRequestsPerMinute = 5) {
    this.maxRequests = maxRequestsPerMinute;
    this.requests = [];
    this.retryDelays = [1000, 2000, 4000]; // Exponential backoff: 1s, 2s, 4s
  }

  /**
   * Execute function with rate limiting and retry logic
   */
  async execute(fn, retries = 3) {
    await this.waitForSlot();
    
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const result = await fn();
        this.recordRequest();
        return result;
      } catch (error) {
        if (attempt === retries) {
          throw error;
        }
        
        const delay = this.retryDelays[attempt] || this.retryDelays[this.retryDelays.length - 1];
        console.warn(`Request failed (attempt ${attempt + 1}/${retries + 1}), retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  /**
   * Wait until a request slot is available
   */
  async waitForSlot() {
    this.cleanOldRequests();
    
    if (this.requests.length >= this.maxRequests) {
      const oldestRequest = this.requests[0];
      const waitTime = 60000 - (Date.now() - oldestRequest);
      
      if (waitTime > 0) {
        console.log(`Rate limit reached, waiting ${waitTime}ms...`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
        this.cleanOldRequests();
      }
    }
  }

  /**
   * Record a successful request
   */
  recordRequest() {
    this.requests.push(Date.now());
  }

  /**
   * Remove requests older than 1 minute
   */
  cleanOldRequests() {
    const oneMinuteAgo = Date.now() - 60000;
    this.requests = this.requests.filter(time => time > oneMinuteAgo);
  }
}
