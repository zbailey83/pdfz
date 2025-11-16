/**
 * Performance monitoring and optimization utilities.
 */

export function measurePerformance<T>(
  fn: () => Promise<T>,
  label: string
): Promise<T> {
  const start = Date.now();
  return fn().then((result) => {
    const duration = Date.now() - start;
    if (duration > 1000) {
      console.warn(`[Performance] ${label} took ${duration}ms`);
    }
    return result;
  });
}

export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;

  return function executedFunction(...args: Parameters<T>) {
    const later = () => {
      timeout = null;
      func(...args);
    };

    if (timeout) {
      clearTimeout(timeout);
    }
    timeout = setTimeout(later, wait);
  };
}

export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean;

  return function executedFunction(...args: Parameters<T>) {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
}

