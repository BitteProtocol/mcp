import type { z } from 'zod';

export interface ExecutionSpec {
  baseUrl: string;
  path: string;
  httpMethod: string;
}

export interface FunctionSpec {
  name: string;
  description: string;
  parameters?: z.ZodObject<any>;
}

export interface PluginToolSpec {
  function: FunctionSpec;
  execution: ExecutionSpec;
}

export interface BitteMetadata {
  [key: string]: any;
}

// Type for tool execution function
export type BitteToolExecutor = (
  args: Record<string, unknown>
) => Promise<{ data?: unknown; error?: string }>;

// Helper function to extract error messages
export function getErrorMsg(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
}

export const createExecutor = (
  tool: PluginToolSpec,
  metadata?: BitteMetadata
): BitteToolExecutor => {
  return async (args) => {
    try {
      const { baseUrl, path, httpMethod } = tool.execution;
      const fullBaseUrl = baseUrl.startsWith('http') ? baseUrl : `https://${baseUrl}`;

      // Build URL with path parameters
      let url = `${fullBaseUrl}${path}`;
      const remainingArgs = { ...args };

      url = url.replace(/\{(\w+)\}/g, (_, key) => {
        if (remainingArgs[key] === undefined) {
          throw new Error(`Missing required path parameter: ${key}`);
        }
        const value = remainingArgs[key];
        delete remainingArgs[key];
        return encodeURIComponent(String(value));
      });

      // Setup request
      const headers: Record<string, string> = {};
      if (metadata) {
        headers['mb-metadata'] = JSON.stringify(metadata);
      }

      const method = httpMethod.toUpperCase();
      const fetchOptions: RequestInit = { method, headers };

      // Handle query parameters
      const queryParams = new URLSearchParams();
      for (const [key, value] of Object.entries(remainingArgs)) {
        if (value != null) {
          queryParams.append(key, String(value));
        }
      }

      const queryString = queryParams.toString();
      if (queryString) {
        url += (url.includes('?') ? '&' : '?') + queryString;
      }

      // Handle request body
      if (['POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'].includes(method)) {
        headers['Content-Type'] = 'application/json';
        fetchOptions.body = JSON.stringify(remainingArgs);
      }

      // Execute request
      const response = await fetch(url, fetchOptions);

      if (!response.ok) {
        throw new Error(
          `HTTP error during plugin tool execution: ${response.status} ${response.statusText}`
        );
      }
      // Parse response based on content type
      const contentType = response.headers.get('Content-Type') || '';
      const data = await (contentType.includes('application/json')
        ? response.json()
        : contentType.includes('text')
          ? response.text()
          : response.blob());

      return { data };
    } catch (error) {
      return {
        error: `Error executing pluginTool ${tool.function.name}. ${getErrorMsg(error)}`,
      };
    }
  };
};

export const createToolFromPluginSpec = (func: PluginToolSpec, metadata?: BitteMetadata) => {
  return {
    ...func.function,
    execute: async (args: Record<string, unknown>) => createExecutor(func, metadata)(args),
  };
};
