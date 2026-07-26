export interface OpenRouterModelInfo {
  id: string;
  name: string;
  promptPrice1M: number;
  completionPrice1M: number;
  contextLength: number;
}

let cachedModels: Map<string, OpenRouterModelInfo> | null = null;
let fetchPromise: Promise<Map<string, OpenRouterModelInfo>> | null = null;

/**
 * Fetches dynamic model pricing from OpenRouter public API.
 * Caches in memory & sessionStorage for fast subsequent lookups.
 */
export async function fetchOpenRouterModels(): Promise<Map<string, OpenRouterModelInfo>> {
  if (cachedModels) return cachedModels;

  // Check sessionStorage
  if (typeof window !== 'undefined' && window.sessionStorage) {
    try {
      const stored = sessionStorage.getItem('openrouter_models_cache');
      if (stored) {
        const parsedArr: OpenRouterModelInfo[] = JSON.parse(stored);
        const map = new Map<string, OpenRouterModelInfo>();
        parsedArr.forEach((item) => map.set(item.id, item));
        cachedModels = map;
        return map;
      }
    } catch {
      // Ignore cache parse errors
    }
  }

  if (fetchPromise) return fetchPromise;

  fetchPromise = (async () => {
    try {
      const res = await fetch('https://openrouter.ai/api/v1/models');
      if (!res.ok) {
        throw new Error(`OpenRouter API error: ${res.statusText}`);
      }

      const data = await res.json();
      const map = new Map<string, OpenRouterModelInfo>();
      const listToCache: OpenRouterModelInfo[] = [];

      if (Array.isArray(data.data)) {
        for (const m of data.data) {
          if (!m.id) continue;
          const promptRate = Number.parseFloat(m.pricing?.prompt || '0');
          const completionRate = Number.parseFloat(m.pricing?.completion || '0');
          const info: OpenRouterModelInfo = {
            id: m.id,
            name: m.name || m.id,
            promptPrice1M: promptRate * 1_000_000,
            completionPrice1M: completionRate * 1_000_000,
            contextLength: m.context_length || 0,
          };
          map.set(m.id, info);
          listToCache.push(info);
        }
      }

      cachedModels = map;

      if (typeof window !== 'undefined' && window.sessionStorage) {
        try {
          sessionStorage.setItem('openrouter_models_cache', JSON.stringify(listToCache));
        } catch {
          // Storage quota exceeded or unavailable
        }
      }

      return map;
    } catch (err) {
      console.warn('Failed to fetch dynamic OpenRouter model pricing:', err);
      return new Map<string, OpenRouterModelInfo>();
    } finally {
      fetchPromise = null;
    }
  })();

  return fetchPromise;
}

/**
 * Calculates baseline story generation cost for a given chapter count & model pricing rates.
 * Assumes average ~1,500 prompt input tokens & ~1,000 completion tokens per chapter.
 */
export function calculateBaselineStoryCost(
  chapters: number,
  promptPrice1M: number,
  completionPrice1M: number,
): { totalInputCost: number; totalOutputCost: number; totalEstimatedCost: number } {
  const totalInputTokens = chapters * 1500;
  const totalOutputTokens = chapters * 1000;

  const totalInputCost = (totalInputTokens / 1_000_000) * promptPrice1M;
  const totalOutputCost = (totalOutputTokens / 1_000_000) * completionPrice1M;
  const totalEstimatedCost = totalInputCost + totalOutputCost;

  return {
    totalInputCost,
    totalOutputCost,
    totalEstimatedCost,
  };
}
