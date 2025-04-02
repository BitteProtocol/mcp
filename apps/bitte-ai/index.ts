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
    // TODO: Implement authentication
    // These are currently not sent by the client (Cursor for example)
    const agentId = req.headers['x-agent-id'];
    const accountId = req.headers['x-account-id'];
    const bitteApiKey = req.headers['x-bitte-api-key'];

    return {
      id: `user-${Math.random().toString(36).substring(2, 15)}`,
    };
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

server.addTool({
  name: 'execute-agent',
  description: 'Execute an AI agent',
  parameters: z.object({
    agentId: z.string().describe('ID of the agent to execute'),
    input: z.string().describe('Input to the agent'),
  }),
  execute: async (args, { log, session }) => {
    log.info(`Executing agent with ID: ${args.agentId}`);
    
    try {
      // First, search for the agent to make sure it exists
      const searchResult = await searchAgents({
        query: args.agentId,
        threshold: 0.1 // Lower threshold for more exact matching
      }, log);
      
      // Check if we found a matching agent
      if (searchResult.bitteResults.length === 0) {
        throw new Error(`Agent with ID '${args.agentId}' not found`);
      }
      
      // Prepare the body for the API call
      const body = {
        id: session?.id,
        agentId: args.agentId,
        accountId: '', // TODO: find a way to get the account id
        messages: [{ role: 'user', content: args.input }],
      };
      
      // Call the Bitte API to execute the agent
      const data = await callBitteAPI('/chat', 'POST', body, log);
      
      if (typeof data === 'string') {
        return {
          content: [{ type: 'text', text: data }],
        };
      }
      
      // Ensure we return a properly typed result
      return data as any;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      log.error(`Error executing agent: ${errorMessage}`);
      return {
        content: [{ type: 'text', text: `Error executing agent: ${errorMessage}` }],
        isError: true,
      };
    }
  },
});

// Tool to execute a tool
server.addTool({
  name: 'execute-tool',
  description: 'Execute a tool',
  parameters: z.object({
    tool: z.string().describe('The tool to execute'),
    params: z.string().describe('The parameters to pass to the tool as a JSON string'),
  }),
  execute: async (args, { log }) => {
    log.info(`Executing execute-tool tool with params: ${JSON.stringify(args)}`);
    console.log("execute-tool with args", JSON.stringify(args))
    console.log("args", args)
    
    try {
      // Use searchTools to find the specified tool
      const searchResult = await searchTools({
        query: args.tool,
        threshold: 0.1 // Lower threshold for more exact matching
      }, log);
      
      // Get the first (best) match
      const toolMatch = searchResult.combinedResults[0];
      const tool = toolMatch.item;

      console.log(tool)
      
      if (!tool || !tool.execute) {
        throw new Error(`Tool '${args.tool}' found but cannot be executed`);
      }
      
      return await tool.execute(JSON.parse(args.params));
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
