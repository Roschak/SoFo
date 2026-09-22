/**
 * Scroll-reveal animation primitives (PRD §128 motion polish).
 * Elements with [data-reveal] fade/slide in when they enter the viewport.
 * Pure helpers kept separate from React for unit-testability.
 */

export type RevealDirection = 'up' | 'down' | 'left' | 'right' | 'scale' | 'tilt-left' | 'tilt-right';

export interface RevealOptions {
  /** Extra transition delay in ms (stagger siblings). */
  delay?: number;
}

export const REVEAL_ATTRIBUTE = 'data-reveal';
export const REVEAL_VISIBLE_ATTRIBUTE = 'data-reveal-visible';

/**
 * Calculates scroll percentage ratio from 0 to 1.
 */
export function calculateScrollRatio(scrollTop: number, scrollHeight: number, clientHeight: number): number {
  const maxScroll = scrollHeight - clientHeight;
  if (maxScroll <= 0) return 0;
  const ratio = scrollTop / maxScroll;
  return Math.min(1, Math.max(0, ratio));
}

/**
 * Binds a throttled scroll listener that reports progress ratio (0..1).
 * Returns an unbind cleanup function.
 */
export function bindScrollProgress(
  target: HTMLElement | Window,
  onProgress: (ratio: number) => void,
): () => void {
  if (typeof window === 'undefined') return () => undefined;

  let ticking = false;

  const handleScroll = () => {
    if (!ticking) {
      window.requestAnimationFrame(() => {
        let ratio = 0;
        if (target === window) {
          const doc = document.documentElement;
          ratio = calculateScrollRatio(window.scrollY, doc.scrollHeight, window.innerHeight);
        } else {
          const el = target as HTMLElement;
          ratio = calculateScrollRatio(el.scrollTop, el.scrollHeight, el.clientHeight);
        }
        onProgress(ratio);
        ticking = false;
      });
      ticking = true;
    }
  };

  target.addEventListener('scroll', handleScroll, { passive: true });
  // Initial call
  handleScroll();

  return () => {
    target.removeEventListener('scroll', handleScroll);
  };
}

/**
 * Observe every [data-reveal] element inside `root` and mark them visible
 * once they intersect. Returns a cleanup function that disconnects.
 */
export function observeReveals(root: ParentNode, options?: RevealOptions): () => void {
  const elements = Array.from(root.querySelectorAll<HTMLElement>(`[${REVEAL_ATTRIBUTE}]`));
  if (elements.length === 0) {
    return () => undefined;
  }

  // Reduced motion (or missing IO support): reveal everything instantly.
  if (prefersReducedMotion() || typeof IntersectionObserver === 'undefined') {
    for (const element of elements) {
      element.setAttribute(REVEAL_VISIBLE_ATTRIBUTE, 'true');
    }
    return () => undefined;
  }

  const stagger = options?.delay ?? 0;
  let staggerIndex = 0;

  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        const element = entry.target as HTMLElement;
        const delay = stagger > 0 ? staggerIndex * stagger : 0;
        staggerIndex += 1;
        if (delay > 0) {
          element.style.transitionDelay = `${delay}ms`;
        }
        element.setAttribute(REVEAL_VISIBLE_ATTRIBUTE, 'true');
        observer.unobserve(element);
      }
    },
    { threshold: 0.12, rootMargin: '0px 0px -40px 0px' },
  );

  for (const element of elements) {
    if (element.hasAttribute(REVEAL_VISIBLE_ATTRIBUTE)) continue;
    observer.observe(element);
  }

  return () => observer.disconnect();
}

/** True when the user asked the OS to reduce motion — animations become instant. */
export function prefersReducedMotion(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}

