import { spawn } from 'child_process';
import path from 'path';

class SimpleMCPClient {
  constructor() {
    this.serverProcess = null;
    this.isConnected = false;
    this.requestId = 1;
  }

  async connect() {
    if (this.isConnected) {
      return;
    }

    try {
      const mcpServerPath = path.join(process.cwd(), 'mcp-server');
      const serverScript = path.join(mcpServerPath, 'index.js');
      
      // Start the MCP server process
      this.serverProcess = spawn('node', [serverScript], {
        cwd: mcpServerPath,
        stdio: ['pipe', 'pipe', 'pipe'],
        env: { 
          ...process.env,
          NEXT_PUBLIC_GRAPHQL_API_KEY: process.env.NEXT_PUBLIC_GRAPHQL_API_KEY
        }
      });

      // Wait for server to start
      await new Promise(resolve => setTimeout(resolve, 3000));

      this.isConnected = true;

      // Handle server process errors
      this.serverProcess.on('error', (error) => {
        console.error('MCP Server process error:', error);
        this.isConnected = false;
      });

      this.serverProcess.on('exit', (code) => {
        console.log(`MCP Server process exited with code ${code}`);
        this.isConnected = false;
      });

    } catch (error) {
      console.error('Failed to start MCP server:', error);
      this.isConnected = false;
      throw error;
    }
  }

  async sendRequest(method, params = {}) {
    if (!this.isConnected) {
      await this.connect();
    }

    return new Promise((resolve, reject) => {
      const request = {
        jsonrpc: '2.0',
        id: this.requestId++,
        method: method,
        params: params
      };

      const requestStr = JSON.stringify(request) + '\n';
      let responseBuffer = '';
      let timeout;
      let responseReceived = false;

      const onData = (data) => {
        if (responseReceived) return;
        
        responseBuffer += data.toString();
        
        // Try to parse each line as JSON
        const lines = responseBuffer.split('\n');
        
        for (let i = 0; i < lines.length - 1; i++) {
          const line = lines[i].trim();
          if (line) {
            try {
              const response = JSON.parse(line);
              
              if (response.id === request.id) {
                responseReceived = true;
                clearTimeout(timeout);
                this.serverProcess.stdout.removeListener('data', onData);
                
                if (response.error) {
                  reject(new Error(response.error.message || 'MCP server error'));
                } else {
                  resolve(response.result);
                }
                return;
              }
            } catch (e) {
              // Failed to parse line as JSON, continue
            }
          }
        }
        
        // Keep the last incomplete line in buffer
        responseBuffer = lines[lines.length - 1];
      };

      // Set up response listener
      this.serverProcess.stdout.on('data', onData);

      // Set timeout
      timeout = setTimeout(() => {
        if (!responseReceived) {
          this.serverProcess.stdout.removeListener('data', onData);
          reject(new Error('MCP request timeout'));
        }
      }, 15000);

      // Send request
      try {
        this.serverProcess.stdin.write(requestStr);
      } catch (error) {
        clearTimeout(timeout);
        this.serverProcess.stdout.removeListener('data', onData);
        reject(new Error(`Failed to send request: ${error.message}`));
      }
    });
  }

  async getMarketData(filters = {}) {
    try {
      const result = await this.sendRequest('tools/call', {
        name: 'get_market_data',
        arguments: filters
      });
      return result;
    } catch (error) {
      console.error('Error getting market data:', error);
      throw error;
    }
  }

  async getBestYield(token = 'USDC') {
    try {
      const result = await this.sendRequest('tools/call', {
        name: 'get_best_yield',
        arguments: { token }
      });
      return result;
    } catch (error) {
      console.error('Error getting best yield:', error);
      throw error;
    }
  }

  async getBriqData(query = '') {
    try {
      const result = await this.sendRequest('tools/call', {
        name: 'get_briq_data',
        arguments: { query }
      });
      return result;
    } catch (error) {
      console.error('Error getting Briq data:', error);
      throw error;
    }
  }

  async disconnect() {
    if (this.serverProcess) {
      this.serverProcess.kill();
    }
    this.isConnected = false;
  }
}

// Singleton instance
let simpleMcpClientInstance = null;

export function getSimpleMCPClient() {
  if (!simpleMcpClientInstance) {
    simpleMcpClientInstance = new SimpleMCPClient();
  }
  return simpleMcpClientInstance;
}

export async function cleanupSimpleMCPClient() {
  if (simpleMcpClientInstance) {
    await simpleMcpClientInstance.disconnect();
    simpleMcpClientInstance = null;
  }
}
