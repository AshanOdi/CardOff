/**
 * HTTP helpers for scrapers — browser-like headers, timeout and retries.
 */

const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36";

const TIMEOUT_MS = 20_000;

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** GET a JSON endpoint, retrying on network errors and 5xx responses. */
export async function fetchJson<T>(url: string, attempts = 3, retryDelayMs = 2000): Promise<T> {
  let lastError: unknown;

  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      const res = await fetch(url, {
        headers: { "User-Agent": USER_AGENT, Accept: "application/json" },
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
      if (res.ok) return (await res.json()) as T;
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
