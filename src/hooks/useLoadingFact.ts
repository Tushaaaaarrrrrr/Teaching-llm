'use client';

import { useState, useEffect, useRef } from 'react';
import { LoadingFact } from '@/lib/facts/loading-facts-data';
import { getNextLoadingFact } from '@/lib/facts/loading-fact-manager';

interface UseLoadingFactOptions {
  allowCoupon?: boolean;
  enabled?: boolean;
}

/**
 * Hook to automatically acquire and clear a loading fact alongside an async operation.
 * 
 * When `isLoading` is true, immediately fetches a fact if permitted by the cooldown engine.
 * When `isLoading` turns false, immediately clears the fact.
 */
export function useLoadingFact(isLoading: boolean, options?: UseLoadingFactOptions) {
  const [fact, setFact] = useState<LoadingFact | null>(null);
  const wasLoadingRef = useRef(false);

  useEffect(() => {
    const isEnabled = options?.enabled !== false;

    if (isLoading && !wasLoadingRef.current && isEnabled) {
      // Transitioned from not loading -> loading: select one fact
      const selected = getNextLoadingFact({
        allowCoupon: options?.allowCoupon ?? true,
      });
      setFact(selected);
    } else if (!isLoading && wasLoadingRef.current) {
      // Content finished loading: dismiss the fact immediately
      setFact(null);
    }

    wasLoadingRef.current = isLoading;
  }, [isLoading, options?.allowCoupon, options?.enabled]);

  return fact;
}
