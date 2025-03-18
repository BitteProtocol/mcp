import { MCP } from '@mcp-sdk/server';
import { z } from 'zod';

// Example configuration
export const config = {
  apiKey: process.env.EXTRA_TOOLS_API_KEY || 'your_api_key_here',
};

const server = new MCP({
  name: 'extra-tools',
  version: '0.0.1',
  authenticate: async (req) => {
    return {
      id: `user-${Math.random().toString(36).substring(2, 15)}`,
    };
  },
});

// Add your extra tools here
server.addTool({
  name: 'example-tool',
  description: 'Example tool for demonstration purposes',
  parameters: z.object({
    param1: z.string().describe('Example parameter'),
    param2: z.number().optional().describe('Optional parameter'),
  }),
  execute: async (args, { log }) => {
    log.info(`Executing example tool with params: ${JSON.stringify(args)}`);

    // Example implementation
    return JSON.stringify({
      message: `Received: ${args.param1}`,
      additionalInfo: args.param2 ? `Number provided: ${args.param2}` : 'No number provided',
    });
  },
});

server.start({
  transportType: 'sse',
  sse: {
    endpoint: '/sse',
    port: 3001, // Different port than the bitte-ai service
  },
});
