import { MCP } from '@mcp-sdk/server';
import { z } from 'zod';
import { tools as goatTools } from './tools/goat-sdk';
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
  name: 'get-existing-tools',
  description: 'Get existing tools',
  parameters: z.object({
    service: z.string().describe('The service to get tools from'),
  }),
  execute: async (args, { log }) => {
    log.info(`Executing get-existing-tools tool with params: ${JSON.stringify(args)}`);

    switch (args.service) {
      case 'goat':
        return JSON.stringify(goatTools);
      default:
        throw new Error(`Unknown service: ${args.service}`);
    }
  },
});

server.addTool({
  name: 'get-available-services',
  description: 'Get a list of all available services',
  parameters: z.object({}),
  execute: async (args, { log }) => {
    log.info('Executing get-available-services tool');
    
    // Return the list of available services
    const services = ['goat'];
    
    return JSON.stringify({
      services,
      count: services.length
    });
  },
});

server.addTool({
  name: 'execute-tool',
  description: 'Execute a tool',
  parameters: z.object({
    tool: z.string().describe('The tool to execute'),
    params: z.object({}).describe('The parameters to pass to the tool'),
  }),
  execute: async (args, { log }) => {
    log.info(`Executing execute-tool tool with params: ${JSON.stringify(args)}`);

    switch (args.tool) {
      case 'goat':
        const tool = goatTools.find(t => t.name === args.tool);
        if (!tool) {
          throw new Error(`Tool not found: ${args.tool}`);
        }
        return await tool.execute(args.params);
      default:
        throw new Error(`Unknown tool: ${args.tool}`);
    }
  },
});

server.start({
  transportType: 'sse',
  sse: {
    endpoint: '/sse',
    port: 3001, // Different port than the bitte-ai service
  },
});
