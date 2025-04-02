// Base interface for all registry items
export interface RegistryItem {
  id: string;
  name: string;
  description: string;
  version: string;
  createdAt: Date;
  updatedAt: Date;
}

// Agent Tool definition
export interface AgentTool {
  id?: string;
  agentId?: string;
  type: string;
  function: {
    name: string;
    description: string;
    parameters?: Record<string, any>;
  };
  execution?: {
    baseUrl: string;
    path: string;
    httpMethod: string;
  };
  verified?: boolean;
  image?: string;
  chainIds?: (number | string)[];
  isPrimitive?: boolean;
  pings?: number;
}

// Agent definitions
export interface Agent {
  id: string;
  name: string;
  accountId: string;
  description: string;
  instructions: string;
  tools: AgentTool[];
  image?: string;
  verified: boolean;
  chainIds?: (number | string)[];
  repo?: string;
  generatedDescription?: string;
  category?: string;
  defaultPrompts?: string[];
  pings: number;
}

// Registry type that contains all items
export interface BitteRegistry {
  agents: Agent[];
}

export function isAgent(item: any): item is Agent {
  return item && typeof item === 'object' && 'tools' in item && Array.isArray(item.tools);
}
