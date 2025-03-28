import { getOnChainTools } from '@goat-sdk/adapter-model-context-protocol';
import { USDC, erc20 } from '@goat-sdk/plugin-erc20';
import { wallet } from './wallet';

// Define a type for the tool objects
type GoatTool = {
  name: string;
  description: string;
  parameters: any;
  execute: (params: Record<string, unknown>, options?: any) => Promise<any>;
};

export const getTools = async (): Promise<GoatTool[]> => {
  const onChainToolsAdapter = await getOnChainTools({
    plugins: [erc20({ tokens: [USDC] })],
    wallet: wallet,
  });
  
  // Transform on-chain tools to the format expected by the MCP server
  const formattedTools = onChainToolsAdapter.listOfTools().map((toolDef) => {
    return {
      name: toolDef.name,
      description: toolDef.description,
      parameters: toolDef.inputSchema,
      execute: async (params: Record<string, unknown>, options?: any) => {
        // Log tool execution if context is provided
        if (options?.log) {
          options.log.info(`Executing GOAT tool: ${toolDef.name} with params: ${JSON.stringify(params)}`);
        }
        
        try {
          const result = await onChainToolsAdapter.toolHandler(toolDef.name, params);
          return result;
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          if (options?.log) {
            options.log.error(`Error executing GOAT tool ${toolDef.name}: ${errorMessage}`);
          }
          return `Error executing tool ${toolDef.name}: ${errorMessage}`;
        }
      },
    };
  });

  return formattedTools;
};
