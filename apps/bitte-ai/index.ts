import { z } from 'zod';
import { services } from './tools';
import { FastMCP } from 'fastmcp';
import { callBitteAPI } from './utils/bitte';
import { 
  searchAgents, 
  searchAgentsSchema, 
  searchTools, 
  searchToolsSchema 
} from './lib/search';
// Export configuration
export { config } from './config';

// Export interfaces for tool parameters
export interface GetAllAgentsParams {
  verifiedOnly?: boolean;
  chainIds?: string;
  category?: string;
  limit?: number;
  offset?: number;
}

export interface GetAgentByIdParams {
  agentId: string;
}

export interface ExecuteAgentParams {
  agentId: string;
  input: string;
}

// Function to convert object to URLSearchParams
function objectToParams(obj: Record<string, any>): string {
  const params = new URLSearchParams();
  Object.entries(obj).forEach(([key, value]) => {
    if (value !== undefined) {
      params.append(key, String(value));
    }
  });
  return params.toString();
}

// Create and export the server
export const server = new FastMCP({
  name: 'bitte-ai-mcp-proxy',
  version: '0.0.1',
  authenticate: async (req) => {

    const agentId = req.headers['x-agent-id'];
    const accountId = req.headers['x-account-id'];
    const bitteApiKey = req.headers['x-bitte-api-key'];

    return {
      id: `user-${Math.random().toString(36).substring(2, 15)}`,
    };
  },
});

// Tool to get all agents from Bitte AI API
server.addTool({
  name: 'get-all-agents',
  description: 'Get a list of AI agents from the Bitte AI registry',
  parameters: z.object({
    verifiedOnly: z.boolean().optional().default(true),
    chainIds: z.string().optional(),
    category: z.string().optional(),
    limit: z.number().optional().default(50),
    offset: z.number().optional().default(0),
  }),
  execute: async (args, { log }) => {
    log.info(`Getting agents with params: ${JSON.stringify(args)}`);
    const params = objectToParams(args);
    const endpoint = `/api/agents${params ? `?${params}` : ''}`;
    const data = await callBitteAPI(endpoint, 'GET', undefined, log);
    return JSON.stringify(data);
  },
});

// Tool to get a specific agent by ID
server.addTool({
  name: 'get-agent-by-id',
  description: 'Get details of a specific AI agent by ID from the Bitte AI registry',
  parameters: z.object({
    agentId: z.string().describe('ID of the agent to retrieve'),
  }),
  execute: async (args, { log }) => {
    log.info(`Getting agent with ID: ${args.agentId}`);
    const endpoint = `/api/agents/${args.agentId}`;
    const data = await callBitteAPI(endpoint, 'GET', undefined, log);
    return JSON.stringify(data);
  },
});

// Tool to get all tools from Bitte AI API
server.addTool({
  name: 'search-tools',
  description: 'Get a list of tools from the Bitte AI registry',
  parameters: z.object({
    random_string: z.string().optional().describe('Dummy parameter for no-parameter tools'),
  }),
  execute: async (args, { log }) => {
    log.info('Getting tools');
    const endpoint = `/api/tools`;
    const data = await callBitteAPI(endpoint, 'GET', undefined, log);
    return JSON.stringify(data);
  },
});

server.addTool({
  name: 'execute-agent',
  description: 'Execute an AI agent',
  parameters: z.object({
    agentId: z.string().describe('ID of the agent to execute'),
    input: z.string().describe('Input to the agent'),
  }),
  execute: async (args, { log, session }) => {
    log.info(`Executing agent with ID: ${args.agentId}`);
    
    const body = {
      id: session?.id,
      agentId: args.agentId,
      accountId: '', // TODO: find a way to get the account id
      messages: [{ role: 'user', content: args.input }],
    };
    
    const data = await callBitteAPI('/chat', 'POST', body, log);
    
    if (typeof data === 'string') {
      return {
        content: [{ type: 'text', text: data }],
      };
    }
    
    // Ensure we return a properly typed result
    return data as any;
  },
});

// Tool to get existing tools
server.addTool({
  name: 'get-existing-tools',
  description: 'Get existing tools',
  parameters: z.object({
    service: z.string().describe('The service to get tools from'),
  }),
  execute: async (args, { log }) => {
    log.info(`Executing get-existing-tools tool with params: ${JSON.stringify(args)}`);

    try {
      let tools;
      switch (args.service) {
        case services.goat.name:
          tools = await services.goat.tools();
          break;
        case services.agentkit.name:
          tools = await services.agentkit.tools();
          break;
        default:
          throw new Error(`Unknown service: ${args.service}`);
      }
      return JSON.stringify(tools);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      log.error(`Error getting tools: ${errorMessage}`);
      return {
        content: [{ type: 'text', text: `Error getting tools: ${errorMessage}` }],
        isError: true,
      };
    }
  },
});

// Tool to get available services
server.addTool({
  name: 'get-available-services',
  description: 'Get a list of all available services',
  parameters: z.object({}),
  execute: async (args, { log }) => {
    log.info('Executing get-available-services tool');
    return JSON.stringify({
      services: Object.values(services).map((service) => service.name),
      count: Object.keys(services).length,
    });
  },
});

// Tool to execute a tool
server.addTool({
  name: 'execute-tool',
  description: 'Execute a tool',
  parameters: z.object({
    tool: z.string().describe('The tool to execute'),
    service: z.string().describe('The service to execute the tool from'),
    params: z.object({}).describe('The parameters to pass to the tool'),
  }),
  execute: async (args, { log }) => {
    log.info(`Executing execute-tool tool with params: ${JSON.stringify(args)}`);
    
    try {
      let tool;
      switch (args.service) {
        case services.goat.name: {
          const goatTools = await services.goat.tools();
          tool = goatTools.find((t) => t.name === args.tool);
          break;
        }
        case services.agentkit.name: {
          const agentkitTools = await services.agentkit.tools();
          tool = agentkitTools.find((t) => t.name === args.tool);
          break;
        }
        default:
          throw new Error(`Unknown service: ${args.service}`);
      }
      
      if (!tool) {
        throw new Error(`Tool not found: ${args.tool}`);
      }
      
      log.info(`Executing ${args.service} tool: ${args.tool}`);
      return await tool.execute(args.params);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      log.error(`Error executing tool: ${errorMessage}`);
      return {
        content: [{ type: 'text', text: `Error executing tool: ${errorMessage}` }],
        isError: true,
      };
    }
  },
});

// Tool to search for agents across Bitte API and other services
server.addTool({
  name: 'search-agents',
  description: 'Search for AI agents across Bitte API and other services',
  parameters: searchAgentsSchema,
  execute: async (args, { log }) => {
    log.info(`Searching agents with params: ${JSON.stringify(args)}`);
    try {
      const result = await searchAgents(args, log);
      return JSON.stringify(result);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      log.error(`Error searching agents: ${errorMessage}`);
      return {
        content: [{ type: 'text', text: `Error searching agents: ${errorMessage}` }],
        isError: true,
      };
    }
  },
});

// Tool to search for tools across Bitte API and other services
server.addTool({
  name: 'search-tools',
  description: 'Search for tools across Bitte API and other services',
  parameters: searchToolsSchema,
  execute: async (args, { log }) => {
    log.info(`Searching tools with params: ${JSON.stringify(args)}`);
    try {
      const result = await searchTools(args, log);
      return JSON.stringify(result);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      log.error(`Error searching tools: ${errorMessage}`);
      return {
        content: [{ type: 'text', text: `Error searching tools: ${errorMessage}` }],
        isError: true,
      };
    }
  },
});

// Export a function to start the server
export async function startServer(port = 3000) {
  server.start({
    transportType: 'sse',
    sse: {
      endpoint: '/sse',
      port,
    },
  });
  console.log(`Bitte AI MCP Proxy server is running on port ${port}`);
  return server;
}

const port = process.env.PORT ? Number.parseInt(process.env.PORT, 10) : 3000;
startServer(port);
