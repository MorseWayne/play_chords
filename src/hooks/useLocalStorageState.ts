import { useCallback, useMemo, useRef, useSyncExternalStore } from 'react';

type Options<T> = {
  parse?: (raw: string) => T;
  serialize?: (value: T) => string;
};

const DEFAULT_EVENT = 'local-storage-state';

function safeParseJson<T>(raw: string): T | null {
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

/**
 * A localStorage-backed state that is safe for Next.js SSR/hydration:
 * - Uses `useSyncExternalStore` with `getServerSnapshot` returning `defaultValue`
 * - No `setState` inside effects (compatible with strict hook lint rules)
 * - Caches the snapshot to avoid infinite loops
 */
export function useLocalStorageState<T>(
  key: string,
  defaultValue: T,
  options: Options<T> = {},
): readonly [T, (next: T | ((prev: T) => T)) => void] {
  const parse = useMemo(() => {
    return options.parse ?? ((raw: string) => safeParseJson<T>(raw) ?? defaultValue);
  }, [defaultValue, options.parse]);
  const serialize = useMemo(() => {
    return options.serialize ?? ((v: T) => JSON.stringify(v));
  }, [options.serialize]);

  // Cache the last raw string and parsed value to ensure referential stability
  const cacheRef = useRef<{ raw: string | null; value: T }>({ raw: null, value: defaultValue });

  const subscribe = useCallback((onStoreChange: () => void) => {
    if (typeof window === 'undefined') return () => {};

    const onStorage = (e: StorageEvent) => {
      if (e.storageArea !== window.localStorage) return;
      if (e.key !== key) return;
      onStoreChange();
    };
    const onCustom = (e: Event) => {
      const detailKey = (e as CustomEvent<{ key: string }>).detail?.key;
      if (detailKey !== key) return;
      onStoreChange();
    };

    window.addEventListener('storage', onStorage);
    window.addEventListener(DEFAULT_EVENT, onCustom);
    return () => {
      window.removeEventListener('storage', onStorage);
      window.removeEventListener(DEFAULT_EVENT, onCustom);
    };
  }, [key]);

  const getSnapshot = useCallback((): T => {
    if (typeof window === 'undefined') return defaultValue;
    const raw = window.localStorage.getItem(key);

    // Return cached value if the raw string hasn't changed
    if (raw === cacheRef.current.raw) {
      return cacheRef.current.value;
    }

    // Parse and cache the new value
    let parsed: T;
    if (raw === null) {
      parsed = defaultValue;
    } else {
      try {
        parsed = parse(raw);
      } catch {
        parsed = defaultValue;
      }
    }

    cacheRef.current = { raw, value: parsed };
    return parsed;
  }, [defaultValue, key, parse]);

  const getServerSnapshot = useCallback((): T => defaultValue, [defaultValue]);

  const value = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const setValue = useCallback(
    (next: T | ((prev: T) => T)) => {
      if (typeof window === 'undefined') return;
      const prev = getSnapshot();
      const resolved = typeof next === 'function' ? (next as (p: T) => T)(prev) : next;
      try {
        window.localStorage.setItem(key, serialize(resolved));
      } catch {
        // ignore write failures (quota/private mode)
      }
      window.dispatchEvent(new CustomEvent(DEFAULT_EVENT, { detail: { key } }));
    },
    [getSnapshot, key, serialize],
  );

  return [value, setValue] as const;
}
