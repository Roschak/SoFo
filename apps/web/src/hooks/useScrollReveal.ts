import { useEffect, useRef } from 'react';
import { observeReveals } from '../lib/scroll-reveal';

export interface RevealConfig {
  /** Stagger delay between siblings in ms. */
  stagger?: number;
  /** Skip observation (e.g. while loading). */
  enabled?: boolean;
}

/**
 * Attaches an IntersectionObserver to all [data-reveal] descendants of the
 * returned ref. Re-runs whenever `deps` change (list re-renders, view swap).
 */
export function useScrollReveal<T extends HTMLElement = HTMLDivElement>(
  deps: readonly unknown[] = [],
  config?: RevealConfig,
) {
  const containerRef = useRef<T | null>(null);
  const enabled = config?.enabled ?? true;

  useEffect(() => {
    const root = containerRef.current;
    if (!root || !enabled) return;
    const disconnect = observeReveals(root, { delay: config?.stagger });
    return disconnect;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, config?.stagger, ...deps]);

  return containerRef;
}
