"use client";

import { useState, useEffect, useCallback, useRef } from "react";

type SetValue<T> = T | ((prevValue: T) => T);

interface UseLocalStorageOptions<T> {
  /** Serialize function for storing value */
  serialize?: (value: T) => string;
  /** Deserialize function for reading value */
  deserialize?: (value: string) => T;
}

/**
 * Hook for persisting state in localStorage with SSR support
 */
export function useLocalStorage<T>(
  key: string,
  initialValue: T,
  options?: UseLocalStorageOptions<T>
): [T, (value: SetValue<T>) => void, () => void] {
  const {
    serialize = JSON.stringify,
    deserialize = JSON.parse,
  } = options || {};

  // Use ref to avoid re-creating readValue when initialValue is an array/object
  const initialValueRef = useRef(initialValue);

  // Get stored value or initial value
  const readValue = useCallback((): T => {
    if (typeof window === "undefined") {
      return initialValueRef.current;
    }

    try {
      const item = window.localStorage.getItem(key);
      return item ? deserialize(item) : initialValueRef.current;
    } catch (error) {
      console.warn(`Error reading localStorage key "${key}":`, error);
      return initialValueRef.current;
    }
  }, [key, deserialize]);

  const [storedValue, setStoredValue] = useState<T>(initialValue);

  // Track if we've read from localStorage
  const isInitialized = useRef(false);

  // Read from localStorage on mount (only once)
  useEffect(() => {
    if (!isInitialized.current) {
      isInitialized.current = true;
      setStoredValue(readValue());
    }
  }, [readValue]);

  // Listen for changes from other tabs/windows
  useEffect(() => {
    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === key && event.newValue) {
        try {
          setStoredValue(deserialize(event.newValue));
        } catch (error) {
          console.warn(`Error parsing storage event for "${key}":`, error);
        }
      }
    };

    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, [key, deserialize]);

  // Set value in localStorage
  const setValue = useCallback(
    (value: SetValue<T>) => {
      try {
        const valueToStore =
          value instanceof Function ? value(storedValue) : value;

        setStoredValue(valueToStore);

        if (typeof window !== "undefined") {
          window.localStorage.setItem(key, serialize(valueToStore));
          // Dispatch event for same-tab listeners
          window.dispatchEvent(
            new StorageEvent("storage", {
              key,
              newValue: serialize(valueToStore),
            })
          );
        }
      } catch (error) {
        console.warn(`Error setting localStorage key "${key}":`, error);
      }
    },
    [key, storedValue, serialize]
  );

  // Remove value from localStorage
  const removeValue = useCallback(() => {
    try {
      setStoredValue(initialValue);
      if (typeof window !== "undefined") {
        window.localStorage.removeItem(key);
      }
    } catch (error) {
      console.warn(`Error removing localStorage key "${key}":`, error);
    }
  }, [key, initialValue]);

  return [storedValue, setValue, removeValue];
}

// Predefined keys for type safety
export const STORAGE_KEYS = {
  SIDEBAR_COLLAPSED: "posty_sidebar_collapsed",
  THEME: "posty_theme",
  REDUCED_MOTION: "posty_reduced_motion",
  CHAT_HISTORY_VISIBLE: "posty_chat_history_visible",
  LAST_VISITED_PAGE: "posty_last_visited_page",
  ONBOARDING_COMPLETED: "posty_onboarding_completed",
  COOKIE_CONSENT: "posty_cookie_consent",
} as const;

export default useLocalStorage;

