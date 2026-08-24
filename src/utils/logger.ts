export const logger = {
  info: (message: string): void => console.log(`[INFO] ${message}`),
  warn: (message: string): void => console.warn(`[WARN] ${message}`),
  error: (message: string, error?: unknown): void => {
    if (error !== undefined) {
      console.error(`[ERROR] ${message}`, error);
    } else {
      console.error(`[ERROR] ${message}`);
    }
  },
};
