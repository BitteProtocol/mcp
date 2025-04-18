import { FastMCP } from 'fastmcp';
import { z } from 'zod';
import { type PluginToolSpec, createToolFromPluginSpec } from './lib/bitte-plugins';
import { searchAgents, searchAgentsSchema, searchTools, searchToolsSchema } from './lib/search';
import { callBitteAPI } from './utils/bitte';
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

// Create a log wrapper that also logs to console
function wrapLogger(log: any) {
  return new Proxy(log, {
    get(target, prop) {
      const originalMethod = target[prop];
      if (typeof originalMethod === 'function') {
        return (...args: any[]) => {
          console.log(`[${String(prop)}]`, ...args);
          return originalMethod.apply(target, args);
        };
      }
      return originalMethod;
    },
  });
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
    const wrappedLog = wrapLogger(log);
    wrappedLog.info(`Getting agent with ID: ${args.agentId}`);
    const endpoint = `/api/agents/${args.agentId}`;
    const data = await callBitteAPI(endpoint, 'GET', undefined, wrappedLog);
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
    const wrappedLog = wrapLogger(log);
    wrappedLog.info(`Executing agent with ID: ${args.agentId}`);

    try {
      // First, search for the agent to make sure it exists
      const searchResult = await searchAgents(
        {
          query: args.agentId,
          threshold: 0.1, // Lower threshold for more exact matching
        },
        wrappedLog
      );

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
      const data = await callBitteAPI('/chat', 'POST', body, wrappedLog);

      if (typeof data === 'string') {
        return {
          content: [{ type: 'text', text: data }],
        };
      }

      // Ensure we return a properly typed result
      return {
        content: [{ type: 'text', text: JSON.stringify(data) }],
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      wrappedLog.error(`Error executing agent: ${errorMessage}`);
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
    metadata: z
      .object({})
      .describe(
        'Optional metadata to pass to the tool i.e. {accountId: "123", evmAddress: "0x123"}'
      )
      .optional(),
  }),
  execute: async (args, { log }) => {
    const wrappedLog = wrapLogger(log);
    wrappedLog.info(`Executing execute-tool tool with params: ${JSON.stringify(args)}`);

    try {
      // Use searchTools to find the specified tool
      const searchResult = await searchTools(
        {
          query: args.tool,
          threshold: 0.1, // Lower threshold for more exact matching
        },
        wrappedLog
      );

      // Get the first (best) match
      const toolMatch = searchResult.combinedResults[0];

      if (!toolMatch) {
        throw new Error(`Tool '${args.tool}' not found`);
      }

      const tool = toolMatch.item as {
        execute?: (params: Record<string, unknown>) => Promise<unknown>;
        execution?: { baseUrl: string; path: string; httpMethod: string };
        function?: { name: string; description: string; parameters?: any };
      };

      let result: unknown;

      // Check if the tool has an execution field
      if (tool.execution && tool.function) {
        // Create and execute a core tool with HTTP-based execution
        const coreTool = createToolFromPluginSpec(tool as PluginToolSpec, args.metadata);
        result = await coreTool.execute(JSON.parse(args.params));
      } else if (tool.execute && typeof tool.execute === 'function') {
        // Use the tool's execute method directly
        result = await tool.execute(JSON.parse(args.params));
      } else {
        throw new Error(`Tool '${args.tool}' found but cannot be executed`);
      }

      // Ensure we return a properly typed result
      if (typeof result === 'string') {
        return {
          content: [{ type: 'text', text: result }],
        };
      }

      return {
        content: [{ type: 'text', text: JSON.stringify(result) }],
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      wrappedLog.error(`Error executing tool: ${errorMessage}`);
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
    const wrappedLog = wrapLogger(log);
    wrappedLog.info(`Searching agents with params: ${JSON.stringify(args)}`);
    try {
      const result = await searchAgents(args, wrappedLog);
      return JSON.stringify(result);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      wrappedLog.error(`Error searching agents: ${errorMessage}`);
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
    const wrappedLog = wrapLogger(log);
    try {
      const result = await searchTools(args, wrappedLog);
      return JSON.stringify(result);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      wrappedLog.error(`Error searching tools: ${errorMessage}`);
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
