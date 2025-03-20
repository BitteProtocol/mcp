import { getOnChainTools } from '@goat-sdk/adapter-model-context-protocol';
import type { ToolBase } from '@goat-sdk/core';
import { USDC, erc20 } from '@goat-sdk/plugin-erc20';
import { wallet } from './wallet';

const onChainToolsAdapter = await getOnChainTools({
  plugins: [erc20({ tokens: [USDC] })],
  wallet: wallet,
});

export const tools: ToolBase[] = onChainToolsAdapter.listOfTools().map((toolDef) => {
  return {
    name: toolDef.name,
    description: toolDef.description,
    parameters: toolDef.inputSchema,
    execute: async (params: Record<string, unknown>) => {
      return onChainToolsAdapter.toolHandler(toolDef.name, params);
    },
  } as unknown as ToolBase;
});
