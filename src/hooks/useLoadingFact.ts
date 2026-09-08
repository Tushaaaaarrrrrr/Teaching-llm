'use client';

import { useState, useEffect } from 'react';
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
  const [fact, setFact] = useState<LoadingFact | null>(() => {
    if (typeof window !== 'undefined' && isLoading && options?.enabled !== false) {
      return getNextLoadingFact({
        allowCoupon: options?.allowCoupon ?? true,
      });
    }
    return null;
  });

  useEffect(() => {
    const isEnabled = options?.enabled !== false;

    if (isLoading && isEnabled) {
      setFact(prev => prev ?? getNextLoadingFact({
        allowCoupon: options?.allowCoupon ?? true,
      }));
    } else {
      setFact(null);
    }
  }, [isLoading, options?.allowCoupon, options?.enabled]);

  return fact;
}
