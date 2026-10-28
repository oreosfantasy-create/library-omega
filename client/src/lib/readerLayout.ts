export const READER_MOBILE_BREAKPOINT = 640;

export function isMobileReaderMode(viewportWidth: number): boolean {
  return viewportWidth < READER_MOBILE_BREAKPOINT;
}

export function normalizeReaderPage(page: number, step: 1 | 2, pageCount: number): number {
  if (pageCount <= 0) return 0;
  const normalized = step === 2 ? page - (page % 2) : page;
  return Math.min(Math.max(0, normalized), pageCount - 1);
}
