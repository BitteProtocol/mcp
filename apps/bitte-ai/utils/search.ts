import Fuse from 'fuse.js';

/**
 * Options for the search functionality
 */
export interface SearchOptions {
  /**
   * Keys to search within. If not provided, search will be performed on the root level.
   */
  keys?: string[];

  /**
   * Maximum number of results to return
   */
  limit?: number;

  /**
   * Threshold for fuzzy matching (0.0 = exact match, 1.0 = very fuzzy)
   */
  threshold?: number;
}

/**
 * Default search options
 */
const DEFAULT_SEARCH_OPTIONS: SearchOptions = {
  limit: 10,
  threshold: 0.3,
};

/**
 * Search result type
 */
export interface SearchResult<T> {
  /** The matched item */
  item: T;
  /** The match score (lower is better) */
  score: number;
  /** The reference index in the original array */
  refIndex: number;
}

/**
 * Search within a large stringified object for items matching the query
 * @param stringifiedObject - The stringified object to search within
 * @param query - The search query
 * @param options - Search configuration options
 * @returns Array of matched results with their scores
 */
export function searchStringifiedObject<T = unknown>(
  stringifiedObject: string,
  query: string,
  options: SearchOptions = DEFAULT_SEARCH_OPTIONS
): SearchResult<T>[] {
  try {
    // Parse the stringified object
    const parsed = JSON.parse(stringifiedObject);
    const data = Array.isArray(parsed) ? parsed : [parsed];

    return performSearch(data, query, options);
  } catch (error) {
    console.error('Error searching stringified object:', error);
    throw new Error(`Failed to search: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Search within a large array for items matching the query
 * Useful when you already have the parsed array
 * @param dataArray - The array to search within
 * @param query - The search query
 * @param options - Search configuration options
 * @returns Array of matched results with their scores
 */
export function searchArray<T = unknown>(
  dataArray: T[],
  query: string,
  options: SearchOptions = DEFAULT_SEARCH_OPTIONS
): SearchResult<T>[] {
  try {
    if (!Array.isArray(dataArray)) {
      throw new Error('The data must be an array');
    }

    return performSearch(dataArray, query, options);
  } catch (error) {
    console.error('Error searching array:', error);
    throw new Error(`Failed to search: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Internal helper to perform the actual search operation
 */
function performSearch<T>(data: T[], query: string, options: SearchOptions): SearchResult<T>[] {
  // Configure Fuse.js
  const fuseOptions = {
    includeScore: true,
    includeRefIndex: true,
    threshold: options.threshold ?? DEFAULT_SEARCH_OPTIONS.threshold,
    keys: options.keys ?? [],
  };

  // Create Fuse instance
  const fuse = new Fuse(data, fuseOptions);

  // Perform the search
  const limit = options.limit ?? DEFAULT_SEARCH_OPTIONS.limit ?? 10;
  const rawResults = fuse.search(query, { limit });

  // Convert to our consistent result format
  return rawResults.map((result, index) => {
    return {
      item: result.item,
      // Default to 1 (worst score) if score is undefined
      score: typeof result.score === 'number' ? result.score : 1,
      // Use the result's refIndex if available, otherwise use the result index
      refIndex: typeof result.refIndex === 'number' ? result.refIndex : index,
    };
  });
}
