export function prefersReducedMotion(): boolean {
  if (
    typeof window === 'undefined' ||
    typeof window.matchMedia !== 'function'
  ) {
    return false;
  }
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export function scrollToSectionId(sectionId: string): boolean {
  if (typeof document === 'undefined') {
    return false;
  }
  const element = document.getElementById(sectionId);
  if (!element || typeof element.scrollIntoView !== 'function') {
    return false;
  }
  element.scrollIntoView({
    behavior: prefersReducedMotion() ? 'auto' : 'smooth',
    block: 'start',
  });
  return true;
}
