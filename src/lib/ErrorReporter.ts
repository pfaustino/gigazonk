import { GAME_VERSION } from '../game/constants.js';

const MAX_ENTRIES = 50;

export interface ErrorEntry {
  code: string;
  message: string;
  stack?: string;
  time: number;
  version: string;
  context?: Record<string, unknown>;
}

export class ErrorReporter {
  static entries: ErrorEntry[] = [];
  static listeners: Array<(entry: ErrorEntry) => void> = [];

  static capture(code: string, err: unknown, context?: Record<string, unknown>): ErrorEntry {
    const message = err instanceof Error ? err.message : String(err);
    const stack = err instanceof Error ? err.stack : undefined;
    const entry: ErrorEntry = {
      code,
      message,
      stack,
      time: Date.now(),
      version: GAME_VERSION,
      context,
    };
    ErrorReporter.entries.push(entry);
    if (ErrorReporter.entries.length > MAX_ENTRIES) {
      ErrorReporter.entries.shift();
    }
    console.error(`[${code}]`, message, context ?? '');
    for (const fn of ErrorReporter.listeners) {
      try {
        fn(entry);
      } catch {
        /* listener failure should not cascade */
      }
    }
    return entry;
  }

  static onReport(listener: (entry: ErrorEntry) => void): () => void {
    ErrorReporter.listeners.push(listener);
    return () => {
      ErrorReporter.listeners = ErrorReporter.listeners.filter((fn) => fn !== listener);
    };
  }

  static exportText(): string {
    return ErrorReporter.entries
      .map((e) => `${e.time} [${e.code}] v${e.version} ${e.message}`)
      .join('\n');
  }

  /** Structured export for Playwright, MCP agents, and dev tooling. */
  static exportJson(): ErrorEntry[] {
    return ErrorReporter.entries.map((e) => ({ ...e }));
  }

  static clear(): void {
    ErrorReporter.entries = [];
  }
}
