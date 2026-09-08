'use client';

import React from 'react';
import { useLoadingFact } from '@/hooks/useLoadingFact';
import LoadingFactCard from './LoadingFactCard';

export interface LoadingWithFactProps {
  isLoading: boolean;
  children?: React.ReactNode; // The existing loading indicator / spinner / skeleton
  content?: React.ReactNode; // Optional content to show when not loading
  position?: 'above' | 'below' | 'floating';
  allowCoupon?: boolean;
  className?: string;
  cardStyle?: React.CSSProperties;
}

/**
 * High-level wrapper that pairs any existing loading indicator with an offline Gen-Z IITian fact card.
 * Works for full-screen loaders, floating overlays, section loaders, and page transitions.
 */
export default function LoadingWithFact({
  isLoading,
  children,
  content,
  position = 'below',
  allowCoupon = true,
  className = '',
  cardStyle,
}: LoadingWithFactProps) {
  const fact = useLoadingFact(isLoading, { allowCoupon });

  if (!isLoading) {
    return content ? <>{content}</> : null;
  }

  if (position === 'floating') {
    return (
      <div className={`relative ${className}`}>
        {children}
        {fact && (
          <div
            style={{
              position: 'fixed',
              bottom: '24px',
              left: '50%',
              transform: 'translateX(-50%)',
              zIndex: 9999,
              width: '90%',
              maxWidth: '440px',
              pointerEvents: 'none',
            }}
          >
            <LoadingFactCard fact={fact} style={cardStyle} />
          </div>
        )}
      </div>
    );
  }

  return (
    <div
      className={`flex flex-col items-center justify-center gap-4 w-full ${className}`}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '16px',
        width: '100%',
      }}
    >
      {position === 'above' && fact && (
        <div style={{ width: '100%', display: 'flex', justifyContent: 'center' }}>
          <LoadingFactCard fact={fact} style={cardStyle} />
        </div>
      )}

      {children}

      {position === 'below' && fact && (
        <div style={{ width: '100%', display: 'flex', justifyContent: 'center' }}>
          <LoadingFactCard fact={fact} style={cardStyle} />
        </div>
      )}
    </div>
  );
}
