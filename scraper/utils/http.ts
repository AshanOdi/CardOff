/**
 * HTTP helpers for scrapers — browser-like headers, timeout and retries.
 */

const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36";

const TIMEOUT_MS = 20_000;

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** GET a URL, retrying on network errors and 5xx responses (4xx fails immediately). */
async function fetchWithRetry(url: string, accept: string, attempts: number, retryDelayMs: number): Promise<Response> {
  let lastError: unknown;

  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      const res = await fetch(url, {
        headers: { "User-Agent": USER_AGENT, Accept: accept, "Accept-Language": "en-US,en;q=0.9" },
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
      if (res.ok) return res;
      // 4xx won't fix itself on retry
      if (res.status < 500) throw new Error(`HTTP ${res.status} fetching ${url}`);
      lastError = new Error(`HTTP ${res.status} fetching ${url}`);
    } catch (err) {
      if (err instanceof Error && err.message.startsWith("HTTP 4")) throw err;
      lastError = err;
    }
    if (attempt < attempts) {
      console.warn(`[http] attempt ${attempt}/${attempts} failed for ${url}, retrying…`);
      await sleep(retryDelayMs);
    }
  }

  throw lastError;
}

export async function fetchJson<T>(url: string, attempts = 3, retryDelayMs = 2000): Promise<T> {
  const res = await fetchWithRetry(url, "application/json", attempts, retryDelayMs);
  return (await res.json()) as T;
}

export async function fetchHtml(url: string, attempts = 3, retryDelayMs = 2000): Promise<string> {
  const res = await fetchWithRetry(url, "text/html,application/xhtml+xml;q=0.9,*/*;q=0.8", attempts, retryDelayMs);
  return res.text();
}

/**
 * Map over items with at most `concurrency` requests in flight —
 * fast enough for hundreds of detail pages, gentle enough on the bank's server.
 */
export async function mapLimit<T, R>(
  items: T[],
  concurrency: number,
  fn: (item: T) => Promise<R>
): Promise<R[]> {
  const results = new Array<R>(items.length);
  let next = 0;
  const worker = async () => {
    while (next < items.length) {
      const i = next++;
      results[i] = await fn(items[i]);
    }
  };
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, worker));
  return results;
}
