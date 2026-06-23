/** Dev-only hooks exposed on window in Vite dev. */
declare global {
  interface Window {
    __gigazonkErrors?: {
      exportText: () => string;
      exportJson: () => unknown[];
    };
    PLAYWRIGHT_THREE?: {
      scene: unknown;
      state: string | null;
    };
  }
}

export {};
