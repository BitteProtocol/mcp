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
    wowActionProvider
} from '@coinbase/agentkit';
import { getVercelAITools } from '@coinbase/agentkit-vercel-ai-sdk';

import { type ToolSet } from 'ai';

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
    const tools: ToolSet = await getVercelAITools(agentKit);
    
    // Transform tools into a consistent format with proper typing
    const formattedTools = Object.entries(tools).map(([name, tool]) => ({
        name,
        description: tool.description as string,
        parameters: tool.parameters,
        execute: async (params: Record<string, unknown>, options?: any) => {
            console.log(`Executing tool ${name} with params:`, JSON.stringify(params));
            
            if (!tool.execute) {
                console.log(`Tool ${name} execution not available`);
                return "Tool execution not available";
            }
            
            try {
                const result = await tool.execute(params, options);
                console.log(`Tool ${name} executed successfully`);
                return result;
            } catch (error) {
                const errorMessage = error instanceof Error ? error.message : String(error);
                console.error(`Error executing tool ${name}:`, errorMessage);
                return `Error executing tool ${name}: ${errorMessage}`;
            }
        },
    }));

    return formattedTools;
};