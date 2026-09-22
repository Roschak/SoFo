import { describe, expect, it } from 'vitest';
import { calculateScrollRatio } from './scroll-reveal';

describe('scroll-reveal helpers', () => {
  it('calculates scroll ratio correctly at top, middle, bottom', () => {
    // 0 scroll
    expect(calculateScrollRatio(0, 1000, 500)).toBe(0);

    // halfway
    expect(calculateScrollRatio(250, 1000, 500)).toBe(0.5);

    // fully at bottom
    expect(calculateScrollRatio(500, 1000, 500)).toBe(1);
  });

  it('clamps values between 0 and 1', () => {
    expect(calculateScrollRatio(-50, 1000, 500)).toBe(0);
    expect(calculateScrollRatio(9999, 1000, 500)).toBe(1);
  });

  it('handles non-scrollable container gracefully', () => {
    expect(calculateScrollRatio(0, 400, 400)).toBe(0);
    expect(calculateScrollRatio(0, 300, 400)).toBe(0);
  });
});
