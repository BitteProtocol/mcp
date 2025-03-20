import { USDC, erc20 } from "@goat-sdk/plugin-erc20";
import { getOnChainTools } from "@goat-sdk/adapter-model-context-protocol";
import { ToolBase } from "@goat-sdk/core";
import { wallet } from "./wallet";

const onChainToolsAdapter = await getOnChainTools({
    plugins: [erc20({tokens: [USDC]})],
    wallet: wallet
});

export const tools: ToolBase[] = onChainToolsAdapter.listOfTools().map(toolDef => {
    return {
        name: toolDef.name,
        description: toolDef.description,
        parameters: toolDef.inputSchema,
        execute: async (params: any) => {
            return onChainToolsAdapter.toolHandler(toolDef.name, params);
        }
    } as unknown as ToolBase;
}); 