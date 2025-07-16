/**
 * Debounce Utility
 * Delays function execution until after wait milliseconds have elapsed
 */

/**
 * Debounce function to limit rapid function calls
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => Promise<void> {
  let timeout: NodeJS.Timeout | null = null;
  
  return (...args: Parameters<T>) => {
    return new Promise<void>((resolve, reject) => {
      if (timeout) {
        clearTimeout(timeout);
      }
      
      timeout = setTimeout(async () => {
        timeout = null;
        try {
          await func(...args);
          resolve();
        } catch (error) {
          reject(error);
        }
      }, wait);
    });
  };
}