import { toast } from 'react-hot-toast';

/**
 * Patch react-hot-toast dispatchers so that identical toast messages
 * generated close together (e.g. from React 18 StrictMode double-mounting,
 * rapid clicks, or parent+child error handlers) automatically reuse the same
 * toast ID instead of stacking duplicate popups on top of each other.
 */
let initialized = false;

export const setupToastDeduplication = () => {
  if (initialized) return;
  initialized = true;

  const methods = ['error', 'success', 'loading', 'custom'];
  methods.forEach((method) => {
    const original = toast[method];
    if (typeof original === 'function') {
      toast[method] = (message, options = {}) => {
        const id =
          options?.id ||
          (typeof message === 'string'
            ? `toast:${method}:${message}`
            : undefined);
        return original(message, { ...options, id });
      };
    }
  });
};
