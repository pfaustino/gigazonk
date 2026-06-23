import { ErrorReporter } from './ErrorReporter.js';

export function installGlobalErrorHandlers(
  getContext?: () => Record<string, unknown> | undefined,
): void {
  window.addEventListener('error', (event) => {
    const err = event.error ?? new Error(event.message);
    ErrorReporter.capture('RUNTIME', err, getContext?.());
  });

  window.addEventListener('unhandledrejection', (event) => {
    ErrorReporter.capture('UNHANDLED_REJECTION', event.reason, getContext?.());
  });
}
