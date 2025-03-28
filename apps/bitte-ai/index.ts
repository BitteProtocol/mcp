import { MCP } from '@mcp-sdk/server';
import { z } from 'zod';
import { config } from './config';
import { services } from './tools';

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

// Create and export the server
export const server = new MCP({
  name: 'bitte-ai-mcp-proxy',
  version: '0.0.1',
  authenticate: async (req) => {
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

    // Build query parameters
    const params = new URLSearchParams();
    if (args.verifiedOnly !== undefined)
      params.append('verifiedOnly', args.verifiedOnly.toString());
    if (args.chainIds) params.append('chainIds', args.chainIds);
    if (args.category) params.append('category', args.category);
    if (args.limit) params.append('limit', args.limit.toString());
    if (args.offset) params.append('offset', args.offset.toString());

    const url = `${config.bitteRegistryUrl}/api/agents`;

    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      return JSON.stringify(data);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      log.error(`Error fetching agents: ${errorMessage}`);
      return {
        content: [
          {
            type: 'text',
            text: 'Error fetching agents',
          },
        ],
        isError: true,
      };
    }
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

    const url = `${config.bitteRegistryUrl}/api/agents/${args.agentId}`;

    try {
      const response = await fetch(url);
      if (response.status === 404) {
        return {
          content: [
            {
              type: 'text',
              text: 'Agent not found',
            },
          ],
          isError: true,
        };
      }
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      return JSON.stringify(data);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      log.error(`Error fetching agent: ${errorMessage}`);

      return {
        content: [
          {
            type: 'text',
            text: 'Error fetching agent',
          },
        ],
        isError: true,
      };
    }
  },
});

// Tool to get all tools from Bitte AI API
server.addTool({
  name: 'get-all-tools',
  description: 'Get a list of tools from the Bitte AI registry',
  parameters: z.object({
    random_string: z.string().optional().describe('Dummy parameter for no-parameter tools'),
  }),
  execute: async (args, { log }) => {
    log.info('Getting tools');

    const url = `${config.bitteRegistryUrl}/api/tools`;

    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      return JSON.stringify(data);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      log.error(`Error fetching tools: ${errorMessage}`);
      return {
        content: [
          {
            type: 'text',
            text: 'Error fetching tools',
          },
        ],
        isError: true,
      };
    }
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

    const url = `${config.bitteRuntimeUrl}/chat`;

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${config.bitteApiKey}`,
        },
        body: JSON.stringify({
          id: session?.id,
          agentId: args.agentId,
          accountId: '', // TODO: find a way to get the account id
          messages: [{ role: 'user', content: args.input }],
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.text();
      return {
        content: [
          {
            type: 'text',
            text: data,
          },
        ],
      };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      log.error(`Error executing agent: ${errorMessage}`);
      return {
        content: [
          {
            type: 'text',
            text: `Error executing agent: ${errorMessage}`,
          },
        ],
        isError: true,
      };
    }
  },
});

// Add tools from extra-tools

// Tool to get existing tools
server.addTool({
  name: 'get-existing-tools',
  description: 'Get existing tools',
  parameters: z.object({
    service: z.string().describe('The service to get tools from'),
  }),
  execute: async (args, { log }) => {
    log.info(`Executing get-existing-tools tool with params: ${JSON.stringify(args)}`);

    switch (args.service) {
      case services.goat.name:
        const goatTools = await services.goat.tools();
        return JSON.stringify(goatTools);
      case services.agentkit.name:
        const baseAgentkitTools = await services.agentkit.tools();
        return JSON.stringify(baseAgentkitTools);
      default:
        throw new Error(`Unknown service: ${args.service}`);
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
    console.log(`[execute-tool] Starting execution for tool: ${args.tool} from service: ${args.service} with params: ${JSON.stringify(args.params)}`);

    switch (args.service) {
      case services.goat.name: {
        console.log(`[execute-tool] Fetching GOAT tools`);
        const goatTools = await services.goat.tools();
        console.log(`[execute-tool] Found ${goatTools.length} GOAT tools`);
        const tool = goatTools.find((t) => t.name === args.tool);
        if (!tool) {
          console.error(`[execute-tool] Tool not found: ${args.tool}`);
          throw new Error(`Tool not found: ${args.tool}`);
        }
        console.log(`[execute-tool] Executing GOAT tool: ${args.tool} with params:`, args.params);
        const result = await tool.execute(args.params);
        console.log(`[execute-tool] GOAT tool execution completed`);
        return result;
      }
      case services.agentkit.name: {
        console.log(`[execute-tool] Fetching AgentKit tools`);
        const baseAgentkitTools = await services.agentkit.tools();
        console.log(`[execute-tool] Found ${baseAgentkitTools.length} AgentKit tools`);
        const tool = baseAgentkitTools.find((t) => t.name === args.tool);
        if (!tool) {
          console.error(`[execute-tool] Tool not found: ${args.tool}`);
          throw new Error(`Tool not found: ${args.tool}`);
        }
        console.log(`[execute-tool] Executing AgentKit tool: ${args.tool} with params:`, JSON.stringify(args.params));
        const result = await tool.execute(args.params);
        console.log(`[execute-tool] AgentKit tool execution completed`);
        return result;
      }
      default:
        console.error(`[execute-tool] Unknown tool: ${args.tool}`);
        throw new Error(`Unknown tool: ${args.tool}`);
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
      host: '0.0.0.0',
    },
  });
  console.log(`Bitte AI MCP Proxy server is running on port ${port}`);
  return server;
}

const port = process.env.PORT ? Number.parseInt(process.env.PORT, 10) : 3000;
startServer(port);
