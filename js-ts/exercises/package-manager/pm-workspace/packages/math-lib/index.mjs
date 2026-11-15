import { clamp } from '@mini/shared-utils';

export function addClamped(a, b, hi) {
  return clamp(a + b, 0, hi);
}
