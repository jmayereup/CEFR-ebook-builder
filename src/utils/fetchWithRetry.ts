/**
 * Abortable sleep and exponential-backoff fetch with retry.
 * Extracted from App.tsx to be reusable across the app.
 */

/** Returns a Promise that resolves after `ms` milliseconds, respecting an AbortSignal. */
export const sleep = (ms: number, signal?: AbortSignal): Promise<void> => {
  return new Promise<void>((resolve, reject) => {
    if (signal?.aborted) {
      return reject(new DOMException('Aborted', 'AbortError'));
    }
    const timer = setTimeout(() => {
      if (signal) {
        signal.removeEventListener('abort', onAbort);
      }
      resolve();
    }, ms);

    function onAbort() {
      clearTimeout(timer);
      reject(new DOMException('Aborted', 'AbortError'));
    }

    if (signal) {
      signal.addEventListener('abort', onAbort);
    }
  });
};

export interface RetryOptions {
  /** Maximum number of retry attempts after the initial failure. Default: 3. */
  maxRetries?: number;
  /** Delay in milliseconds before the first retry. Default: 2000. */
  initialDelay?: number;
  /** Exponential back-off multiplier applied after each retry. Default: 2. */
  factor?: number;
  signal?: AbortSignal;
  /** Called just before each attempt starts. */
  onAttemptStart?: (attempt: number) => void;
  /** Called every second while waiting to retry; receives remaining wait time in ms. */
  onRetry?: (attempt: number, remainingMs: number, error: unknown) => void;
}

/**
 * Fetches a URL with exponential back-off retries on failure.
 * Respects the AbortSignal to cancel mid-flight or mid-wait.
 */
export const fetchWithRetry = async (
  url: string,
  options: RequestInit,
  retryOpts: RetryOptions = {},
): Promise<Response> => {
  const {
    maxRetries = 3,
    initialDelay = 2000,
    factor = 2,
    signal,
    onRetry,
    onAttemptStart,
  } = retryOpts;

  let attempt = 0;
  let delay = initialDelay;

  while (true) {
    attempt++;
    if (onAttemptStart) {
      onAttemptStart(attempt);
    }

    try {
      if (signal?.aborted) {
        throw new DOMException('Aborted', 'AbortError');
      }

      const response = await fetch(url, { ...options, signal });
      if (response.ok) {
        return response;
      }

      // Read server error details if available
      let errorMessage = `Server returned status ${response.status}`;
      const isRateLimit = response.status === 429;
      try {
        const errorData = await response.json();
        errorMessage = errorData.error || errorMessage;
      } catch (_e) {
        // use fallback status code message
      }

      const error = new Error(errorMessage);
      if (isRateLimit) {
        (error as any).status = 429;
      }
      throw error;
    } catch (error: unknown) {
      const err = error as { name?: string; message?: string; status?: number };
      if (err.name === 'AbortError' || signal?.aborted || err.status === 429) {
        throw error;
      }

      if (attempt > maxRetries) {
        throw error;
      }

      // Count down the wait period, firing onRetry each second
      const secondsToWait = Math.ceil(delay / 1000);
      for (let s = secondsToWait; s > 0; s--) {
        if (signal?.aborted) {
          throw new DOMException('Aborted', 'AbortError');
        }
        if (onRetry) {
          onRetry(attempt, s * 1000, error);
        }
        await sleep(1000, signal);
      }

      delay = delay * factor;
    }
  }
};
