import { config } from "../config";

// Reusable API client function
export async function callBitteAPI(endpoint: string, method = 'GET', body?: any, log?: any) {
    const isRegistry = endpoint.startsWith('/api/');
    const baseUrl = isRegistry ? config.bitteRegistryUrl : config.bitteRuntimeUrl;
    const url = `${baseUrl}${endpoint}`;
    
    try {
      const options: RequestInit = {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
      };
      
      if (body) {
        options.body = JSON.stringify(body);
        if (!isRegistry) {
          options.headers = {
            ...options.headers,
            Authorization: `Bearer ${config.bitteApiKey}`,
          };
        }
      }
      
      log?.info(`Calling ${method} ${url}`);
      const response = await fetch(url, options);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      return endpoint === '/chat' ? 
        await response.text() : 
        await response.json();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      log?.error(`API error: ${errorMessage}`);
      return {
        content: [{ type: 'text', text: `Error: ${errorMessage}` }],
        isError: true
      };
    }
  }