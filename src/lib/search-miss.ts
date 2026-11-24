// Decides when a site search that found nothing is reported to the traffic log.
// Only the final wording is sent: after a pause, on Enter, or when the panel closes.

const MIN_LENGTH = 3;
const MAX_LENGTH = 100;

/** Trim, collapse runs of spaces, and cap the length. */
export function normalizeQuery(q: string): string {
  return q.trim().replace(/\s+/g, ' ').slice(0, MAX_LENGTH);
}

export class MissLogger {
  private pending: string | null = null;
  private timer: ReturnType<typeof setTimeout> | undefined;
  private readonly sent = new Set<string>();

  constructor(private readonly send: (query: string) => void, private readonly delayMs = 2000) {}

  /** Call after each search with the query and how many results it found. */
  update(query: string, resultCount: number): void {
    clearTimeout(this.timer);
    const q = normalizeQuery(query);
    this.pending = resultCount === 0 && q.length >= MIN_LENGTH && !this.sent.has(q.toLowerCase()) ? q : null;
    if (this.pending) this.timer = setTimeout(() => this.flush(), this.delayMs);
  }

  /** Report the pending query now (Enter pressed or panel closed). */
  flush(): void {
    clearTimeout(this.timer);
    const q = this.pending;
    this.pending = null;
    if (!q || this.sent.has(q.toLowerCase())) return;
    this.sent.add(q.toLowerCase());
    this.send(q);
  }
}
