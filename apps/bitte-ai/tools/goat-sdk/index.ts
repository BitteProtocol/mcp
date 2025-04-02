import { getOnChainTools } from '@goat-sdk/adapter-model-context-protocol';
import { USDC, WETH, erc20 } from '@goat-sdk/plugin-erc20';
import { wallet } from './wallet';

// Define a type for the tool objects
type Tool = {
  name: string;
  description: string;
  inputSchema: any; // Using any for now since JsonSchema7Type is not defined
  execute: (params: any) => Promise<any>;
}

type ToolList = Tool[];

export const getTools = async (): Promise<ToolList> => {
  const onChainToolsAdapter = await getOnChainTools({
    plugins: [erc20({ tokens: [USDC, WETH] })],
    wallet: wallet,
  });
  
  const rawTools = onChainToolsAdapter.listOfTools();
  
  // Transform the raw tools to include the execute method
  const tools = rawTools.map(tool => ({
    ...tool,
    execute: async (params: any) => {
      return await onChainToolsAdapter.toolHandler(tool.name, params);
    }
  }));

  return tools;
};
