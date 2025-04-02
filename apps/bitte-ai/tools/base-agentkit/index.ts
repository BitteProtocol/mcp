import {
  AgentKit,
  compoundActionProvider,
  defillamaActionProvider,
  erc20ActionProvider,
  erc721ActionProvider,
  jupiterActionProvider,
  pythActionProvider,
  walletActionProvider,
  wethActionProvider,
  wowActionProvider,
} from '@coinbase/agentkit';
import { getMcpTools } from '@coinbase/agentkit-model-context-protocol';

import { AgentKitWalletProvider } from './wallet';

export const getTools = async () => {
  const walletProvider = new AgentKitWalletProvider();

  const agentKit = await AgentKit.from({
    walletProvider,
    actionProviders: [
      walletActionProvider(),
      wowActionProvider(),
      wethActionProvider(),
      pythActionProvider(),
      //  openseaActionProvider(), // Requires API key
      compoundActionProvider(),
      jupiterActionProvider(),
      defillamaActionProvider(),
      erc20ActionProvider(),
      erc721ActionProvider(),
    ],
  });

  // Convert AgentKit tools to MCP-compatible format
  const { tools, toolHandler } = await getMcpTools(agentKit);

  const formattedTools = tools.map((tool) => ({
    name: tool.name,
    description: tool.description,
    inputSchema: tool.inputSchema,
    execute: async (params: Record<string, unknown>, options?: any) => {
      console.log(tool.name, params);
      return await toolHandler(tool.name, params);
    },
  }));
  return formattedTools;
};
