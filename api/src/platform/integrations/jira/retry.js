/**
 * Retry utility for handling Jira API rate limits and transient errors
 */

export async function sleep(ms) { 
  return new Promise(resolve => setTimeout(resolve, ms)); 
}

export async function withBackoff(fn, { max = 5, baseMs = 1000 } = {}) {
  let attempt = 0;
  
  while (true) {
    try { 
      return await fn(); 
    } catch (err) {
      const status = err?.response?.status;
      const retryAfter = Number(err?.response?.headers?.['retry-after']);
      
      // Retry on rate limit (429) or server errors (5xx)
      if (status === 429 || (status >= 500 && status < 600)) {
        attempt++;
        if (attempt > max) {
          console.error(`Max retry attempts (${max}) exceeded for Jira API call`);
          throw err;
        }
        
        // Use Retry-After header if provided, otherwise exponential backoff
        const delay = retryAfter 
          ? retryAfter * 1000 
          : Math.min(30000, baseMs * Math.pow(2, attempt - 1));
        
        console.log(`Retrying Jira API call in ${delay}ms (attempt ${attempt}/${max})`);
        await sleep(delay);
        continue;
      }
      
      throw err;
    }
  }
}
