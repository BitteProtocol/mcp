import { z } from 'zod';
import { services } from '../tools';
import { callBitteAPI } from '../utils/bitte';
import type { Agent } from '../utils/bitte-registry';
import { searchArray } from '../utils/search';
import type { SearchOptions, SearchResult } from '../utils/search';

// Define a type for service keys
type ServiceKey = keyof typeof services;

// Define a generic interface for tools
interface GenericTool {
  name: string;
  description?: string;
  parameters?: Record<string, unknown>;
  execute: (params: Record<string, unknown>, options?: unknown) => Promise<unknown>;
}

/**
 * Parameters for searching agents
 */
export interface SearchAgentsParams {
  query: string;
  verifiedOnly?: boolean;
  chainIds?: string;
  category?: string;
  limit?: number;
  offset?: number;
  threshold?: number;
  includeServices?: string[];
}

/**
 * Default search options
 */
const DEFAULT_SEARCH_PARAMS: Omit<SearchAgentsParams, 'query'> = {
  verifiedOnly: true,
  limit: 10,
  offset: 0,
  threshold: 0.3,
  includeServices: [],
};

/**
 * Search results combining agents from Bitte API and other services
 */
export interface CombinedAgentsSearchResult {
  bitteResults: SearchResult<Agent>[];
  serviceResults: Record<string, SearchResult<Agent>[]>;
  totalResults: number;
}

/**
 * Search for agents across Bitte API and optionally other services
 * @param params Search parameters
 * @param log Optional logger
 * @returns Combined search results
 */
export async function searchAgents(
  params: SearchAgentsParams,
  log?: { info?: (message: string) => void; error?: (message: string) => void }
): Promise<CombinedAgentsSearchResult> {
  // Merge with default parameters
  const mergedParams = { ...DEFAULT_SEARCH_PARAMS, ...params };
  const { query, verifiedOnly, chainIds, category, limit, offset, threshold, includeServices } =
    mergedParams;

  // Search options for Fuse.js
  const searchOptions: SearchOptions = {
    keys: ['id', 'name', 'description', 'instructions', 'generatedDescription', 'category'],
    limit,
    threshold,
  };

  // Initialize results
  const result: CombinedAgentsSearchResult = {
    bitteResults: [],
    serviceResults: {},
    totalResults: 0,
  };

  // First, search Bitte API
  try {
    // Build API query parameters
    const apiParams: Record<string, unknown> = {
      verifiedOnly,
      limit,
      offset,
    };

    if (chainIds) apiParams.chainIds = chainIds;
    if (category) apiParams.category = category;

    // Convert object to URL search parameters
    const urlParams = new URLSearchParams();
    for (const [key, value] of Object.entries(apiParams)) {
      if (value !== undefined) {
        urlParams.append(key, String(value));
      }
    }

    // Call Bitte API to get agents
    const endpoint = `/api/agents?${urlParams.toString()}`;
    const response = await callBitteAPI(endpoint, 'GET', undefined, log);

    // If response is an array, search within it
    if (Array.isArray(response)) {
      // If query is "*", return all results without searching
      if (query === '*') {
        result.bitteResults = response.map((agent) => ({ item: agent, score: 1, refIndex: 0 }));
        result.totalResults += result.bitteResults.length;
      } else {
        // Search within the results using Fuse.js
        result.bitteResults = searchArray<Agent>(response, query, searchOptions);
        result.totalResults += result.bitteResults.length;
      }
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    log?.error?.(`Error searching Bitte API agents: ${errorMessage}`);
  }

  // We skip searching services as requested

  return result;
}

// Export zodSchema for use with FastMCP
export const searchAgentsSchema = z.object({
  query: z.string().describe('Search query text'),
  verifiedOnly: z.boolean().optional().default(true),
  chainIds: z.string().optional(),
  category: z.string().optional(),
  limit: z.number().optional().default(10),
  offset: z.number().optional().default(0),
  threshold: z.number().optional().default(0.3),
  includeServices: z.array(z.string()).optional().default([]),
});

/**
 * Parameters for searching tools
 */
export interface SearchToolsParams {
  query: string;
  includeServices?: string[];
  limit?: number;
  threshold?: number;
}

/**
 * Default search options for tools
 */
const DEFAULT_TOOLS_SEARCH_PARAMS: Omit<SearchToolsParams, 'query'> = {
  limit: 5,
  threshold: 1,
  includeServices: [
    'goat',
    'agentkit',
    ...Object.keys(services).filter((s) => s !== 'goat' && s !== 'agentkit'),
  ],
};

/**
 * Search results for tools
 */
export interface ToolsSearchResult {
  bitteResults: SearchResult<unknown>[];
  serviceResults: Record<string, SearchResult<GenericTool>[]>;
  combinedResults: SearchResult<unknown>[];
  totalResults: number;
}

/**
 * Search for tools across Bitte API and other services
 * @param params Search parameters
 * @param log Optional logger
 * @returns Combined search results
 */
export async function searchTools(
  params: SearchToolsParams,
  log?: { info?: (message: string) => void; error?: (message: string) => void }
): Promise<ToolsSearchResult> {
  log?.info?.(`Searching tools with params: ${JSON.stringify(params)}`);
  // Merge with default parameters
  const mergedParams = { ...DEFAULT_TOOLS_SEARCH_PARAMS, ...params };
  const { query, limit, threshold, includeServices } = mergedParams;

  // Search options for Fuse.js
  const searchOptions: SearchOptions = {
    keys: ['id', 'name', 'description', 'function.name', 'function.description'],
    limit,
    threshold,
  };

  // Initialize results
  const result: ToolsSearchResult = {
    bitteResults: [],
    serviceResults: {},
    combinedResults: [],
    totalResults: 0,
  };

  // First, search Bitte API tools
  try {
    // Call Bitte API to get tools
    const endpoint = '/api/tools';
    const response = await callBitteAPI(endpoint, 'GET', undefined, log);

    // If response is an array, search within it
    if (Array.isArray(response)) {
      log?.info?.('Response is an array, searching within it');
      // If query is "*", return all results without searching
      if (query === '*') {
        log?.info?.('Query is "*", returning all results');
        result.bitteResults = response.map((tool) => ({ item: tool, score: 1, refIndex: 0 }));
        result.totalResults += result.bitteResults.length;

        // Add Bitte results to combined results
        result.combinedResults.push(...result.bitteResults);
      } else {
        log?.info?.('Query is not "*", searching within the results');
        // Search within the results using Fuse.js
        result.bitteResults = searchArray(response, query, searchOptions);
        result.totalResults += result.bitteResults.length;

        // Add Bitte results to combined results
        result.combinedResults.push(...result.bitteResults);
      }
    } else {
      log?.info?.('Response is not an array, UNIMPLEMENTED');
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    log?.error?.(`Error searching Bitte API tools: ${errorMessage}`);
  }

  // Then, search each included service
  if (includeServices && includeServices.length > 0) {
    // Make sure we're including 'goat' and 'agentkit' services
    const allServices = Array.from(new Set([...includeServices, 'goat', 'agentkit']));

    await Promise.all(
      allServices.map(async (serviceName) => {
        try {
          // Check if service name is a valid key
          if (!(serviceName in services)) {
            return;
          }

          const service = services[serviceName as ServiceKey];

          // Get tools from the service
          const tools = (await service.tools()) as GenericTool[];

          if (tools.length > 0) {
            // If query is "*", return all tools without searching
            if (query === '*') {
              result.serviceResults[serviceName] = tools.map((tool) => ({
                item: tool,
                score: 1,
                refIndex: 0,
              }));
              result.totalResults += result.serviceResults[serviceName].length;

              // Add service results to combined results
              result.combinedResults.push(...result.serviceResults[serviceName]);
            } else {
              // Search within the tools from this service
              result.serviceResults[serviceName] = searchArray<GenericTool>(
                tools,
                query,
                searchOptions
              );
              result.totalResults += result.serviceResults[serviceName].length;

              // Add service results to combined results
              result.combinedResults.push(...result.serviceResults[serviceName]);
            }
          }
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          result.serviceResults[serviceName] = [];
          log?.error?.(`Error searching service ${serviceName}: ${errorMessage}`);
        }
      })
    );
  }

  return result;
}

// Export zodSchema for searching tools
export const searchToolsSchema = z.object({
  query: z.string().describe('Search query text'),
});
