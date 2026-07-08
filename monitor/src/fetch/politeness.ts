export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Crawl delay with ±25% jitter so requests don't land on a metronome. */
export async function politeDelay(baseMs: number): Promise<void> {
  const jitter = baseMs * 0.25 * (Math.random() * 2 - 1);
  await sleep(Math.max(0, Math.round(baseMs + jitter)));
}
