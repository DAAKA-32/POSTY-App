import { useState, useEffect } from "react";

/**
 * Hook that debounces a value.
 * Useful for search inputs to avoid excessive re-renders/API calls.
 *
 * @param value - The value to debounce
 * @param delay - Delay in milliseconds (default: 300ms)
 * @returns The debounced value
 *
 * @example
 * const [searchQuery, setSearchQuery] = useState("");
 * const debouncedSearch = useDebouncedValue(searchQuery, 300);
 *
 * // Use debouncedSearch for filtering/API calls
 * const filteredItems = items.filter(item => item.includes(debouncedSearch));
 */
export function useDebouncedValue<T>(value: T, delay: number = 300): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(timer);
    };
  }, [value, delay]);

  return debouncedValue;
}

/**
 * Hook that provides both the debounced value and a flag indicating if debouncing is in progress.
 * Useful for showing loading indicators during debounce.
 *
 * @param value - The value to debounce
 * @param delay - Delay in milliseconds (default: 300ms)
 * @returns Object with debouncedValue and isPending flag
 */
export function useDebouncedValueWithPending<T>(
  value: T,
  delay: number = 300
): { debouncedValue: T; isPending: boolean } {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);
  const [isPending, setIsPending] = useState(false);

  useEffect(() => {
    // If value changed, we're now pending
    if (value !== debouncedValue) {
      setIsPending(true);
    }

    const timer = setTimeout(() => {
      setDebouncedValue(value);
      setIsPending(false);
    }, delay);

    return () => {
      clearTimeout(timer);
    };
  }, [value, delay, debouncedValue]);

  return { debouncedValue, isPending };
}
